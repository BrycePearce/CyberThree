import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
}

type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> & {
  userData: TubeData;
};

function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const tubesRef = useRef<GridMesh[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);

  // Grid parameters
  const baseRadius = 0.06;
  const gridWidth = 300;
  const gridDepth = 250;
  const spacing = 2;

  // Colors
  const pink = new THREE.Color("#A23EBF");
  const purple = new THREE.Color("#653EBF");
  const cyan = new THREE.Color("#3EA6BF");

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

  function createTube(
    start: THREE.Vector3,
    end: THREE.Vector3,
    fraction: number
  ) {
    const curve = new THREE.LineCurve3(start, end);
    const segments = Math.ceil(start.distanceTo(end) / 2);
    const color = getCyberpunkColor(fraction);

    // Base material with physical properties
    const material = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.15), // Very dim base color
      roughness: 0.7,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9,
      emissive: color,
      emissiveIntensity: 0, // Will be animated
    });

    // Create tube
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
    };

    return tube;
  }

  useEffect(() => {
    if (!groupRef.current || tubesRef.current.length > 0) return;

    const gridGroup = new THREE.Group();

    // Create both vertical and horizontal lines
    const createLines = (isVertical: boolean) => {
      const range = isVertical ? gridWidth : gridDepth;
      for (let pos = -range / 2; pos <= range / 2; pos += spacing) {
        const fraction = (pos + range / 2) / range;
        const start = new THREE.Vector3(
          isVertical ? pos : -gridWidth / 2,
          0,
          isVertical ? -gridDepth / 2 : pos
        );
        const end = new THREE.Vector3(
          isVertical ? pos : gridWidth / 2,
          0,
          isVertical ? gridDepth / 2 : pos
        );

        const tube = createTube(start, end, fraction);
        gridGroup.add(tube);
        tubesRef.current.push(tube);
      }
    };

    createLines(true);
    createLines(false);

    groupRef.current.add(gridGroup);
  }, []);

  // Animate tubes
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    tubesRef.current.forEach((tube) => {
      if (!tube.userData?.baseColor) return;

      // Sine wave from 0..1
      const pulse = (Math.sin((time + tube.userData.offset) * 2) + 1) * 0.5;

      // Update material properties
      const baseBrightness = 0.15 + pulse * 0.2; // Subtle base color variation
      const material = tube.material as THREE.MeshStandardMaterial;

      // Update base color
      material.color = tube.userData.baseColor
        .clone()
        .multiplyScalar(baseBrightness);

      // Update emissive intensity - this is what will create the bloom effect
      material.emissiveIntensity = pulse * pulse * 2;
    });

    // Animate light position
    if (lightRef.current) {
      const radius = 50;
      lightRef.current.position.x = Math.cos(time * 0.5) * radius;
      lightRef.current.position.z = Math.sin(time * 0.5) * radius;
      lightRef.current.position.y = 30 + Math.sin(time) * 10;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight
        ref={lightRef}
        position={[0, 30, 0]}
        intensity={100}
        color="#ffffff"
        distance={200}
        decay={2}
      />
      <group ref={groupRef} />
    </>
  );
}

export function CyberpunkScene() {
  return (
    <Canvas
      camera={{ position: [100, 15, 100], fov: 75 }}
      style={{ width: "100vw", height: "100vh" }}
    >
      <CyberpunkGrid />
      <FirstPersonControls />
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
