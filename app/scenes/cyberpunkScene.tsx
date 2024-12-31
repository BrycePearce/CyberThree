import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
  emissiveBase: THREE.Color;
}

type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> & {
  userData: TubeData;
};

function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const tubesRef = useRef<GridMesh[]>([]);
  const updateWavesRef = useRef<((time: number) => void) | null>(null);

  // Grid parameters
  const baseRadius = 0.06;
  const gridWidth = 400;
  const gridDepth = 350;
  const spacing = 2;

  // Colors
  const pink = new THREE.Color("#A23EBF");
  const purple = new THREE.Color("#653EBF");
  const cyan = new THREE.Color("#3EA6BF");

  function createWaveEffects(parentWidth: number, parentDepth: number) {
    const waveGroup = new THREE.Group();

    function createWavePlane(scale: number, yOffset: number) {
      // Create a plane slightly larger than the frame
      const geometry = new THREE.PlaneGeometry(
        parentWidth * scale,
        parentDepth * scale,
        1,
        1
      );

      // Custom shader material for the wave effect
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color("#4a9eff") },
          opacity: { value: 0.1 },
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform float time;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
          // Create wave pattern
          // More dynamic wave pattern
          float wave = sin(vUv.x * 12.0 + time * 1.5) * 0.5 + 0.5;
          wave *= sin(vUv.y * 10.0 + time * 0.8) * 0.5 + 0.5;
          // Add secondary wave for more complexity
          wave += sin(vUv.x * 6.0 - time + vUv.y * 4.0) * 0.3;
          
          // Fade out towards edges
          float edgeFade = 1.0 - pow(distance(vUv, vec2(0.5)) * 2.0, 2.0);
          
          gl_FragColor = vec4(color, wave * opacity * edgeFade);
        }
      `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const plane = new THREE.Mesh(geometry, material);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = yOffset;

      return plane;
    }

    // Create multiple wave planes at different heights
    for (let i = 0; i < 8; i++) {
      const scale = 1.1 + i * 0.1;
      const yOffset = 0.35 + i * 0.1;
      const wave = createWavePlane(scale, yOffset);
      waveGroup.add(wave);
    }

    // Animation update function
    type WaveMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

    const updateWaves = (time: number) => {
      waveGroup.children.forEach((child, index) => {
        const wave = child as WaveMesh;
        if (wave.material instanceof THREE.ShaderMaterial) {
          wave.material.uniforms.time.value = time + index * 0.5;
        }
      });
    };

    return { waveGroup, updateWaves };
  }

  // Add to your CyberpunkGrid component:
  useEffect(() => {
    if (!groupRef.current) return;

    const { waveGroup, updateWaves } = createWaveEffects(gridWidth, gridDepth);
    groupRef.current.add(waveGroup);

    // Add to your existing animation frame
    const animateWaves = (state: any) => {
      updateWaves(state.clock.getElapsedTime());
    };

    return () => {
      if (groupRef.current) {
        groupRef.current.remove(waveGroup);
      }
    };
  }, []);

  // Add to your CyberpunkGrid component:
  useEffect(() => {
    if (!groupRef.current) return;

    const { waveGroup, updateWaves } = createWaveEffects(gridWidth, gridDepth);
    groupRef.current.add(waveGroup);

    updateWavesRef.current = updateWaves;

    return () => {
      if (groupRef.current) {
        groupRef.current.remove(waveGroup);
      }
      updateWavesRef.current = null;
    };
  }, []);

  function getCyberpunkColor(fraction: number) {
    const PURPLE_BAND_START = 0.47;
    const PURPLE_BAND_END = 0.53;

    if (fraction < PURPLE_BAND_START) {
      const localFrac = fraction / PURPLE_BAND_START;
      return pink.clone().lerp(purple, localFrac);
    } else if (fraction < PURPLE_BAND_END) {
      return purple.clone();
    } else {
      const localFrac = (fraction - PURPLE_BAND_END) / (1 - PURPLE_BAND_END);
      return purple.clone().lerp(cyan, localFrac);
    }
  }

  // -----------------------------------------------------------------
  // Create a perimeter frame with color fractions & raise them higher
  // -----------------------------------------------------------------
  function createPerimeterFrame() {
    const perimeterGroup = new THREE.Group();

    type EdgeData = [THREE.Vector3, THREE.Vector3, number];

    function createSingleTubeEdge(
      start: THREE.Vector3,
      end: THREE.Vector3,
      fraction: number,
      scale: number,
      layerIndex: number
    ) {
      const curve = new THREE.LineCurve3(start, end);

      // Base color from fraction with more white blend for outer frames
      const baseEdgeColor = getCyberpunkColor(fraction);
      const whiteBlend = 0.2; // Maintain consistent color with subtle white blend
      const finalColor = baseEdgeColor
        .clone()
        .lerp(new THREE.Color("#ffffff"), whiteBlend);

      const geometry = new THREE.TubeGeometry(
        curve,
        12,
        0.25 * scale * (1 + layerIndex * 0.15), // Scale the tube radius, making outer tubes thicker
        24,
        false
      );

      const material = new THREE.MeshStandardMaterial({
        color: finalColor,
        emissive: finalColor,
        emissiveIntensity: 4.0 - layerIndex * 0.5, // Inner frames glow more intensely
        metalness: 0.3,
        roughness: 0.2,
        toneMapped: true,
      });

      return new THREE.Mesh(geometry, material);
    }

    // Create a single frame at a given scale and height
    function createFrame(scale: number, yOffset: number, layerIndex: number) {
      const frameGroup = new THREE.Group();

      // Base dimensions for scaling
      const width = gridWidth * scale;
      const depth = gridDepth * scale;
      const y = yOffset;

      const edges: EdgeData[] = [
        // Front edge
        [
          new THREE.Vector3(-width / 2, y, depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          1.0,
        ],
        // Back edge
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, -depth / 2),
          0.0,
        ],
        // Left edge
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(-width / 2, y, depth / 2),
          0.35,
        ],
        // Right edge
        [
          new THREE.Vector3(width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          0.65,
        ],
      ];

      edges.forEach(([start, end, fraction]) => {
        const tube = createSingleTubeEdge(
          start,
          end,
          fraction,
          scale,
          layerIndex
        );
        frameGroup.add(tube);
      });

      return frameGroup;
    }

    // Create multiple frames at different scales and heights
    const frameConfigs = [
      { scale: 1.0, yOffset: 0.3, layerIndex: 0 }, // Inner frame
      { scale: 1.1, yOffset: 0.4, layerIndex: 1 },
      { scale: 1.2, yOffset: 0.5, layerIndex: 2 },
      { scale: 1.3, yOffset: 0.6, layerIndex: 3 },
      { scale: 1.4, yOffset: 0.7, layerIndex: 4 },
      { scale: 1.5, yOffset: 0.8, layerIndex: 5 },
      { scale: 1.6, yOffset: 0.9, layerIndex: 6 },
      { scale: 1.7, yOffset: 1.0, layerIndex: 7 },
      { scale: 1.8, yOffset: 1.1, layerIndex: 8 }, // Outer frame
    ];

    frameConfigs.forEach(({ scale, yOffset, layerIndex }) => {
      const frame = createFrame(scale, yOffset, layerIndex);
      perimeterGroup.add(frame);
    });

    return perimeterGroup;
  }
  // -----------------------------------------------------------
  // Create a single grid tube (non-perimeter)
  // -----------------------------------------------------------
  function createTube(
    start: THREE.Vector3,
    end: THREE.Vector3,
    fraction: number
  ) {
    const curve = new THREE.LineCurve3(start, end);
    const segments = Math.ceil(start.distanceTo(end) / 2);
    const color = getCyberpunkColor(fraction);

    const material = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.5),
      emissive: color.clone(),
      emissiveIntensity: 1.0,
      metalness: 0.2,
      roughness: 0.6,
      toneMapped: true,
    });

    const geometry = new THREE.TubeGeometry(
      curve,
      segments,
      baseRadius,
      8,
      false
    );

    const tube = new THREE.Mesh(geometry, material) as GridMesh;

    tube.userData = {
      baseColor: color,
      offset: Math.random() * 10,
      emissiveBase: color.clone(),
    };

    return tube;
  }

  // -----------------------------------------------------------
  // One-time grid creation
  // -----------------------------------------------------------
  useEffect(() => {
    if (!groupRef.current || tubesRef.current.length > 0) return;

    const gridGroup = new THREE.Group();

    // Vertical lines
    for (let x = -gridWidth / 2; x <= gridWidth / 2; x += spacing) {
      const fraction = (x + gridWidth / 2) / gridWidth;
      const tube = createTube(
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, 0, gridDepth / 2),
        fraction
      );
      gridGroup.add(tube);
      tubesRef.current.push(tube);
    }

    // Horizontal lines
    for (let z = -gridDepth / 2; z <= gridDepth / 2; z += spacing) {
      const fraction = (z + gridDepth / 2) / gridDepth;
      const tube = createTube(
        new THREE.Vector3(-gridWidth / 2, 0, z),
        new THREE.Vector3(gridWidth / 2, 0, z),
        fraction
      );
      gridGroup.add(tube);
      tubesRef.current.push(tube);
    }

    // Add the main grid
    groupRef.current.add(gridGroup);

    // Add the perimeter frame
    const perimeterFrame = createPerimeterFrame();
    groupRef.current.add(perimeterFrame);
  }, []);

  // -----------------------------------------------------------
  // Animate the main grid lines (pulse), not the perimeter
  // -----------------------------------------------------------
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Animate tubes (existing animation)
    tubesRef.current.forEach((tube) => {
      const { baseColor, offset, emissiveBase } = tube.userData || {};
      if (!baseColor || offset === undefined || !emissiveBase) return;

      const pulse = (Math.sin((time + offset) * 2) + 1) * 0.5;
      const brightnessFactor = 0.2 + pulse * 1.0;
      const emissiveFactor = 0.1 + pulse * 2.5;

      const newBaseColor = baseColor.clone().multiplyScalar(brightnessFactor);
      const newEmissive = emissiveBase.clone().multiplyScalar(emissiveFactor);

      const standardMat = tube.material as THREE.MeshStandardMaterial;
      standardMat.color = newBaseColor;
      standardMat.emissive = newEmissive;
    });

    // Animate waves
    if (updateWavesRef.current) {
      updateWavesRef.current(time);
    }
  });

  return <group ref={groupRef} />;
}

export function CyberpunkScene() {
  return (
    <Canvas
      camera={{ position: [100, 15, 100], fov: 75 }}
      style={{ width: "100vw", height: "100vh" }}
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
      }}
    >
      <ambientLight intensity={0.3} />
      <hemisphereLight intensity={0.4} />

      <CyberpunkGrid />
      <FirstPersonControls />

      <EffectComposer>
        <Bloom
          intensity={2.5}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.75}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
