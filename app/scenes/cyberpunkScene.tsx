import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
}

type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial> & {
  userData: TubeData;
};

function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const tubesRef = useRef<GridMesh[]>([]);

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

    const material = new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
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
      offset: Math.random() * 10, // Adjust to taste
    };

    return tube;
  }

  // Create the grid one time
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

    groupRef.current.add(gridGroup);
  }, []);

  // Animate tubes
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    tubesRef.current.forEach((tube) => {
      if (!tube.userData?.baseColor) return;
      const { baseColor, offset } = tube.userData;

      // Sine wave from 0..1
      const pulse = (Math.sin((time + offset) * 2) + 1) * 0.5;
      const brightnessFactor = 1 + pulse;
      const newColor = baseColor.clone().multiplyScalar(brightnessFactor);

      (tube.material as THREE.MeshBasicMaterial).color = newColor;
    });
  });

  return <group ref={groupRef} />;
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
          intensity={3.0}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
