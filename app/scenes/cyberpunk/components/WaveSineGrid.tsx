import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Mesh } from "three";

const WaveSineGrid = () => {
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 100, 60, 30); // Adjusted for clearer grid lines
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const color = new THREE.Color();

    // Define grittier gradient pairs
    const gradients = [
      {
        start: new THREE.Color("#00726d").multiplyScalar(1.2), // Darker cyan
        end: new THREE.Color("#8b0080").multiplyScalar(1.2), // Deep magenta
      },
      {
        start: new THREE.Color("#004455").multiplyScalar(1.2), // Dark teal
        end: new THREE.Color("#660066").multiplyScalar(1.2), // Deep purple
      },
      {
        start: new THREE.Color("#2b0d30").multiplyScalar(1.2), // Dark purple
        end: new THREE.Color("#600030").multiplyScalar(1.2), // Dark red
      },
    ];

    // Select one gradient pair (can be changed for different looks)
    const selectedGradient = gradients[0];

    for (let i = 0; i < geo.attributes.position.count; i++) {
      const x = geo.attributes.position.getX(i);
      const y = geo.attributes.position.getY(i);

      // Create diagonal gradient effect
      const nx = (x + 150) / 300;
      const ny = (y + 150) / 300;

      // Diagonal gradient factor
      const gradientFactor = (nx + ny) / 2;

      // Smooth interpolation between colors
      color
        .copy(selectedGradient.start)
        .lerp(selectedGradient.end, gradientFactor);

      // Add subtle variation for more visual interest
      // Add more dramatic variation for grittier look
      const variation = 0.15 * Math.sin(nx * 12) * Math.sin(ny * 12);
      const grit = 0.8 + Math.random() * 0.4; // Random darkness variation
      color.multiplyScalar((1 + variation) * grit);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      wireframeLinewidth: 1.5,
      transparent: true,
      opacity: 0.9,
    });
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;
    const time = state.clock.getElapsedTime();

    // Smoother wave animation
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      const z =
        Math.sin(x * 0.03 + time * 0.7) * 15 +
        Math.cos(y * 0.03 + time * 0.6) * 15 +
        Math.sin((x + y) * 0.03 + time * 0.4) * 10;

      positions.setZ(i, z);
    }
    positions.needsUpdate = true;

    // Subtle movement
    meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;

    // Gentle opacity pulse
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.8 + Math.sin(time * 1.5) * 0.1;
      meshRef.current.material.opacity = pulse;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[-150, 650, -700]}
      rotation={[-Math.PI / 50, 0, 0]}
    />
  );
};

export default WaveSineGrid;
