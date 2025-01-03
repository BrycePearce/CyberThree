import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";
import { EnergyPulses } from "./components/Grid/effects/energyPulses";
import { Grid } from "./components/Grid";
import { PerimeterFrame } from "./components/Grid/components/perimeterFrame";
import type { GridLine } from "~/types/gridTypes";

function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);

  // Grid parameters
  const baseRadius = 0.06;
  const gridWidth = 400;
  const gridDepth = 350;
  const spacing = 2;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    groupRef.current?.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.baseColor) {
        const { baseColor, offset, emissiveBase } = obj.userData;
        const pulse = (Math.sin((time + offset) * 1) + 1) * 0.5;
        const brightnessFactor = 0.3 + pulse * 1;
        const emissiveFactor = 0.5 + pulse * 1.5;

        const newBaseColor = baseColor.clone().multiplyScalar(brightnessFactor);
        const newEmissive = emissiveBase.clone().multiplyScalar(emissiveFactor);

        (obj.material as THREE.MeshStandardMaterial).color = newBaseColor;
        (obj.material as THREE.MeshStandardMaterial).emissive = newEmissive;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <Grid
        gridWidth={gridWidth}
        gridDepth={gridDepth}
        spacing={spacing}
        baseRadius={baseRadius}
        onGridLinesCreated={setGridLines}
      />
      <PerimeterFrame gridWidth={gridWidth} gridDepth={gridDepth} />
      {/* {gridLines.length > 0 && <EnergyPulses gridLines={gridLines} />} */}
    </group>
  );
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
