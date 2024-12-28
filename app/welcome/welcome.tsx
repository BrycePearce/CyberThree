import { useRef, useEffect } from "react";
import * as THREE from "three";
import horizonFragmentShader from "./shaders/horizonFragmentShader.glsl";
import gridShader from "./shaders/gridShader.glsl";

// Constants
const HORIZON_LIGHT_WIDTH = 100;
const HORIZON_LIGHT_HEIGHT = 2;
const GRID_SIZE = 50;
const STEP = 1;

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

    const { geometry: gridGeometry } = createGridGeometry();
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_gridSize: { value: GRID_SIZE },
        u_gridSpeed: { value: 0.05 },
      },
      vertexShader: `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,
      fragmentShader: gridShader,
      transparent: true,
    });

    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.rotation.x = (-Math.PI / 2) * 0.1;
    scene.add(grid);

    const { light: horizonLight, material: horizonMaterial } =
      createHorizonLight(camera, grid.rotation.x);
    scene.add(horizonLight);

    const animate = () => {
      requestAnimationFrame(animate);
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
