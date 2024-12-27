import { useRef, useEffect } from "react";
import * as THREE from "three";
import horizonFragmentShader from "./shaders/horizonFragmentShader.glsl";
import rawFragmentShader from "./shaders/fragmentShader.glsl";

// Constants
const HORIZON_LIGHT_WIDTH = 100;
const HORIZON_LIGHT_HEIGHT = 2;
const GRID_SIZE = 50;
const STEP = 1;
const MAX_PULSES = 3;
const PULSE_SPEED = 0.008;

// Define Pulse type
type Pulse = {
  lineIdx: number;
  progress: number;
  active: boolean;
};

// Utility Functions
const createGridGeometry = () => {
  const positions = [];
  const lineIndices = [];
  let currentIndex = 0;

  for (let x = -GRID_SIZE; x <= GRID_SIZE; x += STEP) {
    positions.push(x, 0, -GRID_SIZE, x, 0, GRID_SIZE);
    lineIndices.push(currentIndex, currentIndex + 1);
    currentIndex += 2;
  }
  for (let z = -GRID_SIZE; z <= GRID_SIZE; z += STEP) {
    positions.push(-GRID_SIZE, 0, z, GRID_SIZE, 0, z);
    lineIndices.push(currentIndex, currentIndex + 1);
    currentIndex += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3)
  );

  const lineIDArray = new Float32Array(positions.length / 3);
  for (let i = 0; i < lineIDArray.length; i++) {
    lineIDArray[i] = Math.floor(i / 2);
  }
  geometry.setAttribute(
    "lineID",
    new THREE.Float32BufferAttribute(lineIDArray, 1)
  );

  return { geometry, lineIndices, positions };
};

const createHorizonLight = (
  camera: THREE.PerspectiveCamera,
  gridRotation: number
) => {
  const geometry = new THREE.PlaneGeometry(
    HORIZON_LIGHT_WIDTH,
    HORIZON_LIGHT_HEIGHT
  );
  const material = new THREE.ShaderMaterial({
    uniforms: { u_time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: horizonFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const calculateHorizonPosition = () => {
    const t = Math.abs(-GRID_SIZE / (camera.position.z - -GRID_SIZE));
    const y = -camera.position.y * t * Math.sin(gridRotation);
    return { y, z: -GRID_SIZE + 5 };
  };

  const { y, z } = calculateHorizonPosition();
  const light = new THREE.Mesh(geometry, material);
  light.position.set(0, y - 8, z);
  light.rotation.x = gridRotation;

  return { light, material };
};

export function Welcome() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const pointLight = new THREE.PointLight(0xffffff, 1, 200);
    pointLight.position.set(20, 50, 20);
    scene.add(ambientLight, pointLight);

    const {
      geometry: gridGeometry,
      lineIndices,
      positions,
    } = createGridGeometry();
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_gridSize: { value: GRID_SIZE },
        u_activeLineStarts: {
          value: Array(MAX_PULSES).fill(new THREE.Vector3()),
        },
        u_activeLineEnds: {
          value: Array(MAX_PULSES).fill(new THREE.Vector3()),
        },
        u_pulsePositions: { value: new Float32Array(MAX_PULSES).fill(-1) },
        u_activeLineIDs: { value: new Float32Array(MAX_PULSES).fill(-1) },
        u_activePulseCount: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        attribute float lineID;
        varying float vLineID;
        void main() {
          vPosition = position;
          vLineID = lineID;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `#define MAX_PULSES ${MAX_PULSES}\n${rawFragmentShader}`,
      transparent: true,
    });

    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.rotation.x = (-Math.PI / 2) * 0.1;
    scene.add(grid);

    const { light: horizonLight, material: horizonMaterial } =
      createHorizonLight(camera, grid.rotation.x);
    scene.add(horizonLight);

    const pulses: Pulse[] = [];

    const updatePulses = () => {
      const activePulses = pulses.filter((p) => p.active && p.progress < 1.0);

      if (activePulses.length < MAX_PULSES) {
        let newLine: number;
        do {
          newLine = Math.floor(Math.random() * (lineIndices.length / 2));
        } while (activePulses.some((p) => p.lineIdx === newLine));
        activePulses.push({ lineIdx: newLine, progress: 0, active: true });
      }

      gridMaterial.uniforms.u_activePulseCount.value = activePulses.length;
      activePulses.forEach((pulse, i) => {
        const idx1 = lineIndices[pulse.lineIdx * 2] * 3;
        const idx2 = lineIndices[pulse.lineIdx * 2 + 1] * 3;

        gridMaterial.uniforms.u_activeLineStarts.value[i].set(
          positions[idx1],
          positions[idx1 + 1],
          positions[idx1 + 2]
        );
        gridMaterial.uniforms.u_activeLineEnds.value[i].set(
          positions[idx2],
          positions[idx2 + 1],
          positions[idx2 + 2]
        );
        gridMaterial.uniforms.u_activeLineIDs.value[i] = pulse.lineIdx;
        gridMaterial.uniforms.u_pulsePositions.value[i] = pulse.progress;

        pulse.progress += PULSE_SPEED;
        if (pulse.progress >= 1) pulse.active = false;
      });

      pulses.splice(0, pulses.length, ...activePulses);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      updatePulses();
      gridMaterial.uniforms.u_time.value += 0.01;
      horizonMaterial.uniforms.u_time.value += 0.01;
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    handleResize();

    animate();

    return () => {
      resizeObserver.disconnect();
      gridGeometry.dispose();
      gridMaterial.dispose();
      horizonLight.geometry.dispose();
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
