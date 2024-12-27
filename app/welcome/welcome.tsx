import { useRef, useEffect } from "react";
import * as THREE from "three";

export function Welcome() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const HORIZON_LIGHT_WIDTH = 100;
  const HORIZON_LIGHT_HEIGHT = 2; // Reduced height for thinner line

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 1000);
    camera.position.set(0, 10, 30);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 200);
    pointLight.position.set(20, 50, 20);
    scene.add(pointLight);

    const GRID_SIZE = 50;
    const STEP = 1;
    const positions: number[] = [];
    const lineIndices: number[] = [];
    let currentIndex = 0;

    for (let x = -GRID_SIZE; x <= GRID_SIZE; x += STEP) {
      positions.push(x, 0, -GRID_SIZE);
      positions.push(x, 0, GRID_SIZE);
      lineIndices.push(currentIndex, currentIndex + 1);
      currentIndex += 2;
    }
    for (let z = -GRID_SIZE; z <= GRID_SIZE; z += STEP) {
      positions.push(-GRID_SIZE, 0, z);
      positions.push(GRID_SIZE, 0, z);
      lineIndices.push(currentIndex, currentIndex + 1);
      currentIndex += 2;
    }

    const gridGeometry = new THREE.BufferGeometry();
    gridGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(positions), 3)
    );

    const lineIDArray = new Float32Array(positions.length / 3);
    for (let i = 0; i < lineIDArray.length; i++) {
      lineIDArray[i] = Math.floor(i / 2);
    }
    gridGeometry.setAttribute(
      "lineID",
      new THREE.Float32BufferAttribute(lineIDArray, 1)
    );

    const MAX_PULSES = 3;
    const uniforms = {
      u_time: { value: 0 },
      u_gridSize: { value: GRID_SIZE },
      u_activeLineStarts: {
        value: Array(MAX_PULSES).fill(new THREE.Vector3()),
      },
      u_activeLineEnds: { value: Array(MAX_PULSES).fill(new THREE.Vector3()) },
      u_pulsePositions: { value: new Float32Array(MAX_PULSES).fill(-1) },
      u_activeLineIDs: { value: new Float32Array(MAX_PULSES).fill(-1) },
      u_activePulseCount: { value: 0 },
    };

    const vertexShader = /* glsl */ `
      varying vec3 vPosition;
      attribute float lineID;
      varying float vLineID;
      
      void main() {
        vPosition = position;
        vLineID = lineID;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      varying vec3 vPosition;
      varying float vLineID;
      uniform float u_gridSize;
      uniform float u_time;
      uniform vec3 u_activeLineStarts[${MAX_PULSES}];
      uniform vec3 u_activeLineEnds[${MAX_PULSES}];
      uniform float u_pulsePositions[${MAX_PULSES}];
      uniform float u_activeLineIDs[${MAX_PULSES}];
      uniform int u_activePulseCount;

      vec3 colorA = vec3(1.0, 0.0, 1.0);    // magenta
      vec3 colorB = vec3(0.0, 0.7, 1.0);    // lighter blue
      vec3 pulseColor = vec3(1.0, 1.0, 1.0); // white pulse

      void main() {
        // Base grid color
        float dist = length(vPosition.xz) / u_gridSize;
        float t = pow(dist, 0.75);
        t = clamp(t, 0.0, 1.0);
        vec3 baseColor = mix(colorA, colorB, t);
        
        // Calculate combined pulse effect from all active pulses
        float totalPulse = 0.0;
        
        for(int i = 0; i < ${MAX_PULSES}; i++) {
          if (i >= u_activePulseCount) break;
          
          if (vLineID == u_activeLineIDs[i] && u_pulsePositions[i] >= 0.0) {
            vec3 lineDir = normalize(u_activeLineEnds[i] - u_activeLineStarts[i]);
            vec3 posOnLine = vPosition - u_activeLineStarts[i];
            float distAlongLine = dot(posOnLine, lineDir);
            float totalLineLength = length(u_activeLineEnds[i] - u_activeLineStarts[i]);
            
            float pulseWidth = 5.0;
            float pulseDist = abs(distAlongLine - (u_pulsePositions[i] * totalLineLength));
            totalPulse = max(totalPulse, smoothstep(pulseWidth, 0.0, pulseDist));
          }
        }
        
        // Combine colors
        vec3 finalColor = mix(baseColor, pulseColor, totalPulse * 0.8);
        
        // Add slight fade out at the horizon
        float alpha = 1.0 - (dist * 0.5);
        alpha = clamp(alpha, 0.3, 1.0);
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    });

    // First create and add the grid
    const lineSegments = new THREE.LineSegments(gridGeometry, material);
    lineSegments.rotation.x = (-Math.PI / 2) * 0.1;
    scene.add(lineSegments);

    const horizonGeometry = new THREE.PlaneGeometry(
      HORIZON_LIGHT_WIDTH,
      HORIZON_LIGHT_HEIGHT
    );

    const horizonVertexShader = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

    const horizonFragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float u_time;
  
  void main() {
    // Enhanced colors with higher intensity
    vec3 neonBlue = vec3(0.2, 0.8, 1.0) * 1.8;    // bright cyan/blue
    // Define magenta with higher intensity and purer values
    vec3 neonMagenta = vec3(1.0, 0.0, 1.0) * 2.0; // pure magenta with higher intensity
    
    // Use only x position for color selection
    float x = vUv.x;
    vec3 baseColor;
    
    // Test with pure colors and sharp transitions
    if (x > 0.4 && x < 0.6) {
        baseColor = neonMagenta;
    } 
    // Left transition
    else if (x >= 0.3 && x <= 0.4) {
        float t = (x - 0.3) / 0.1;
        baseColor = mix(neonBlue, neonMagenta, t);
    }
    // Right transition
    else if (x >= 0.6 && x <= 0.7) {
        float t = (x - 0.6) / 0.1;
        baseColor = mix(neonMagenta, neonBlue, t);
    }
    // Edges (blue)
    else {
        baseColor = neonBlue;
    }
    
    // Create a sharper, more intense core line
    float coreWidth = 0.02;
    float coreLine = smoothstep(0.5 - coreWidth, 0.5, vUv.y) - 
                    smoothstep(0.5, 0.5 + coreWidth, vUv.y);
    
    // Create a wider glow effect
    float glowWidth = 0.3;
    float glow = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 3.0) * 0.8;
    
    // Animated pulse effect
    float mainPulse = sin(u_time * 1.5) * 0.15 + 0.85;
    float ripplePulse = sin(u_time * 3.0 + vUv.x * 6.28) * 0.1 + 0.9;
    
    // Combine core line and glow
    float brightness = coreLine * 2.0 + glow;
    brightness *= mainPulse * ripplePulse;
    
    // Add subtle horizontal energy lines
    float energyLines = pow(sin(vUv.x * 20.0 + u_time), 8.0) * 0.1 * glow;
    brightness += energyLines;
    
    // Final color combination
    vec3 finalColor = baseColor * brightness * 2.0;
    
    // Add white hot core
    float whiteness = coreLine * mainPulse;
    finalColor = mix(finalColor, vec3(1.5), whiteness * 0.7);
    
    // Smooth alpha falloff
    float alpha = brightness;
    alpha = smoothstep(0.0, 0.2, alpha) * 0.9;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

    const horizonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
      },
      vertexShader: horizonVertexShader,
      fragmentShader: horizonFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false, // Ensures glow is always visible
    });

    const calculateHorizonPosition = () => {
      // Convert grid rotation to radians for calculation
      const gridRotation = lineSegments.rotation.x;

      // Calculate the intersection point of the camera's view with the grid
      const cameraHeight = camera.position.y;
      const cameraZ = camera.position.z;
      const gridZ = -GRID_SIZE;

      // Calculate the apparent horizon based on camera perspective and grid rotation
      const t = Math.abs(gridZ / (cameraZ - gridZ));
      const horizonY = -cameraHeight * t * Math.sin(gridRotation);

      return {
        y: horizonY,
        z: gridZ + 5, // Small offset to ensure the light is just in front of the grid's edge
      };
    };
    // Create and position the horizon light
    const horizonLight = new THREE.Mesh(horizonGeometry, horizonMaterial);
    const horizonPos = calculateHorizonPosition();

    horizonLight.position.set(0, horizonPos.y - 8, horizonPos.z);
    horizonLight.rotation.x = lineSegments.rotation.x; // Match grid rotation
    scene.add(horizonLight);

    // Debug logging
    console.log("Grid rotation:", lineSegments.rotation.x);
    console.log("Grid position:", lineSegments.position);
    console.log("Horizon light position:", horizonLight.position);
    console.log("Horizon light rotation:", horizonLight.rotation);

    // Pulse management
    class Pulse {
      lineIdx: number;
      progress: number;
      active: boolean;

      constructor(lineIdx: number) {
        this.lineIdx = lineIdx;
        this.progress = 0;
        this.active = true;
      }
    }

    const pulses: Pulse[] = [];
    const PULSE_SPEED = 0.008;

    const startNewPulse = () => {
      const activePulses = pulses.filter((p) => p.active && p.progress < 1.0);

      if (activePulses.length < MAX_PULSES) {
        let newLine: number;
        do {
          newLine = Math.floor(Math.random() * (lineIndices.length / 2));
        } while (activePulses.some((p) => p.lineIdx === newLine));

        activePulses.push(new Pulse(newLine));
      }

      uniforms.u_activePulseCount.value = activePulses.length;

      for (let i = 0; i < MAX_PULSES; i++) {
        if (i < activePulses.length) {
          const pulse = activePulses[i];
          const idx1 = lineIndices[pulse.lineIdx * 2] * 3;
          const idx2 = lineIndices[pulse.lineIdx * 2 + 1] * 3;

          uniforms.u_activeLineStarts.value[i] = new THREE.Vector3(
            positions[idx1],
            positions[idx1 + 1],
            positions[idx1 + 2]
          );
          uniforms.u_activeLineEnds.value[i] = new THREE.Vector3(
            positions[idx2],
            positions[idx2 + 1],
            positions[idx2 + 2]
          );
          uniforms.u_activeLineIDs.value[i] = pulse.lineIdx;
          uniforms.u_pulsePositions.value[i] = pulse.progress;
        } else {
          uniforms.u_pulsePositions.value[i] = -1;
          uniforms.u_activeLineIDs.value[i] = -1;
        }
      }

      pulses.splice(0, pulses.length, ...activePulses);
    };

    const scheduleNextPulse = () => {
      const delay = 200 + Math.random() * 800;
      setTimeout(() => {
        startNewPulse();
        scheduleNextPulse();
      }, delay);
    };

    const animate = () => {
      requestAnimationFrame(animate);

      // Update existing pulse positions
      if (pulses.length > 0) {
        pulses.forEach((pulse, i) => {
          if (pulse.active && pulse.progress < 1.0) {
            pulse.progress += PULSE_SPEED;
            uniforms.u_pulsePositions.value[i] = pulse.progress;
          }
        });

        startNewPulse(); // This will clean up completed pulses
      }

      // Update both time uniforms
      uniforms.u_time.value += 0.01;
      horizonMaterial.uniforms.u_time.value += 0.01;

      renderer.render(scene, camera);
    };

    scheduleNextPulse();
    animate();

    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);
    handleResize();

    return () => {
      ro.disconnect();
      gridGeometry.dispose();
      material.dispose();
      horizonGeometry.dispose();
      horizonMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
