import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const vertexShader = `
  uniform float time;
  attribute float size;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    float strength = 1.0 - smoothstep(0.0, 0.3, dist);
    strength = pow(strength, 3.0);
    
    float noise = fract(sin(dot(gl_PointCoord, vec2(12.9898, 78.233))) * 43758.5453);
    strength *= 0.95 + noise * 0.05;
    
    gl_FragColor = vec4(vColor, strength * 0.8);
  }
`;

interface CyberpunkParticlesProps {
  count?: number;
  gridWidth?: number;
  gridDepth?: number;
}

export const CyberpunkParticles = ({
  count = 5000,
  gridWidth = 400,
  gridDepth = 350,
}: CyberpunkParticlesProps) => {
  const points = useRef<THREE.Points>(null);

  // Define the exclusion zone dimensions outside of useMemo
  const exclusionWidth = gridWidth * 1.2;
  const exclusionDepth = gridDepth * 1.2;
  const exclusionBottom = 0;
  const exclusionTop = 200;

  // Define the check function at component scope
  const isInExclusionZone = (x: number, y: number, z: number) => {
    return (
      Math.abs(x) < exclusionWidth / 2 &&
      Math.abs(z) < exclusionDepth / 2 &&
      y > exclusionBottom &&
      y < exclusionTop
    );
  };

  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotationRadii = new Float32Array(count);
    const angles = new Float32Array(count);
    const heightOffsets = new Float32Array(count);
    const speeds = new Float32Array(count);

    const palette = [
      new THREE.Color("#ff00ff"), // Magenta
      new THREE.Color("#00ffff"), // Cyan
      new THREE.Color("#ff3366"), // Neon pink
      new THREE.Color("#4deeea"), // Electric blue
      new THREE.Color("#74ee15"), // Neon green
    ];

    const volumeWidth = gridWidth * 3;
    const volumeDepth = gridDepth * 3;
    const volumeHeight = 1000;

    let particleIndex = 0;
    while (particleIndex < count) {
      // Generate random position in the volume
      const radius = Math.sqrt(Math.random()) * (volumeWidth / 1.5);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Random height across entire volume
      const y = (Math.random() - 0.5) * volumeHeight;

      // Skip if in exclusion zone
      if (isInExclusionZone(x, y, z)) {
        continue;
      }

      const i = particleIndex;
      rotationRadii[i] = radius;
      angles[i] = angle;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Varied sizes with some larger particles
      sizes[i] =
        Math.random() < 0.1 ? Math.random() * 4 + 3 : Math.random() * 2 + 1;

      // Slower rotation speed, varying with distance
      speeds[i] = (Math.random() * 0.01 + 0.015) * (1 - radius / volumeWidth);
      heightOffsets[i] = Math.random() * Math.PI * 2;

      particleIndex++;
    }

    return {
      positions,
      colors,
      sizes,
      rotationRadii,
      angles,
      speeds,
      heightOffsets,
      volumeWidth,
      volumeDepth,
      volumeHeight,
    };
  }, [count, gridWidth, gridDepth]);

  useFrame((state, delta) => {
    if (!points.current) return;

    const positions = points.current.geometry.attributes.position
      .array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;

      // Update angle for consistent circular motion
      particleData.angles[i] += particleData.speeds[i] * delta;
      const angle = particleData.angles[i];
      const radius = particleData.rotationRadii[i];

      // Calculate new position
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Only update x and z if new position wouldn't put particle in exclusion zone
      const currentY = positions[idx + 1];
      if (!isInExclusionZone(x, currentY, z)) {
        positions[idx] = x;
        positions[idx + 2] = z;
      }

      // Add very subtle vertical wave motion
      const heightOffset =
        Math.sin(time * 0.2 + particleData.heightOffsets[i]) * 2;
      const newY = positions[idx + 1] + heightOffset * delta;

      // Only update y if it wouldn't put particle in exclusion zone
      if (!isInExclusionZone(positions[idx], newY, positions[idx + 2])) {
        positions[idx + 1] = newY;
      }

      // Wrap particles if they go too far up or down
      if (positions[idx + 1] > particleData.volumeHeight / 2) {
        positions[idx + 1] = -particleData.volumeHeight / 2;
      }
      if (positions[idx + 1] < -particleData.volumeHeight / 2) {
        positions[idx + 1] = particleData.volumeHeight / 2;
      }
    }

    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particleData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particleData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={{ time: { value: 0 } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        vertexColors
      />
    </points>
  );
};
