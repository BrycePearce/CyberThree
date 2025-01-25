import * as THREE from "three";
import FirstPersonControls from "~/controls/FirstPersonControls";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Grid } from "./components/Grid";
import { GridEffects } from "./components/Grid/components/gridEffects";
import { IndependentGridEffects } from "./components/Grid/effects/independentGridEffects";
import { PerimeterFrame } from "./components/Grid/components/perimeterFrame";
import { useRef, useState } from "react";
import type { GridLine } from "~/types/gridTypes";
import { CyberpunkParticles } from "./components/particleEffects";
import WaveSineGrid from "./components/WaveSineGrid";
const gridWidth = 400;
const gridDepth = 350;

// todo combine this with grid.tsx
function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);

  // Grid parameters
  const baseRadius = 0.06;
  const spacing = 2;

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
      {gridLines.length > 0 && (
        <>
          <IndependentGridEffects gridLines={gridLines} />
          <GridEffects gridLines={gridLines} />
        </>
      )}
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
      <CyberpunkParticles count={2000} gridWidth={gridWidth} gridDepth={350} />
      <WaveSineGrid />
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
