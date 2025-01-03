import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { useRef, useState } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";
import { Grid } from "./components/Grid";
import { PerimeterFrame } from "./components/Grid/components/perimeterFrame";
import { useGridPulseEffect } from "./components/Grid/hooks/useGridPulseEffect";
import type { GridLine } from "~/types/gridTypes";
import { EnergyPulses } from "./components/Grid/effects/energyPulses";

// todo combine this with grid.tsx
function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);

  // Grid parameters
  const baseRadius = 0.06;
  const gridWidth = 400;
  const gridDepth = 350;
  const spacing = 2;

  // sinewave effect to create some noise on the base grid
  // useGridPulseEffect(groupRef);

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
      {gridLines.length > 0 && <EnergyPulses gridLines={gridLines} />}
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
