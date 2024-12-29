import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";

interface TubeData {
  index: number;
}

type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
type GridGroup = THREE.Group & {
  children: GridMesh[];
};

const CyberpunkGrid: React.FC = () => {
  const gridRef = useRef<GridGroup>(null);

  // Grid parameters
  const gridWidth = 300;
  const gridDepth = 250;
  const spacing = 2;
  const baseRadius = 0.04;

  // Precompute the lines in a memo so we don't recreate them on every render
  const grid = useMemo(() => {
    const group = new THREE.Group() as GridGroup;

    // We'll define two “end” colors for our gradient:
    // For example, from a bright teal (#00ffff) to a hot pink (#ff00ff).
    const colorA = new THREE.Color("#00ffff"); // neon teal
    const colorB = new THREE.Color("#ff00ff"); // neon pink

    // Function to create each tube
    const createTube = (
      start: THREE.Vector3,
      end: THREE.Vector3,
      t: number, // a parameter [0..1] to help pick a color from colorA->colorB
      index: number
    ): GridMesh => {
      const curve = new THREE.LineCurve3(start, end);
      const segments = Math.ceil(start.distanceTo(end) / 2);
      const geometry = new THREE.TubeGeometry(
        curve,
        segments,
        baseRadius,
        8,
        false
      );

      // Interpolate color between colorA and colorB
      // We’ll also use that color for emissive so it glows.
      const lineColor = colorA.clone().lerp(colorB, t);

      const material = new THREE.MeshPhysicalMaterial({
        color: lineColor,
        emissive: lineColor.clone().multiplyScalar(0.2),
        emissiveIntensity: 0.3,
        roughness: 0.0,
        metalness: 0.8,
        transmission: 0.9, // or use 'opacity' if you don't need real refraction
        thickness: 1.0,
        ior: 1.5,
        reflectivity: 0.8,
        toneMapped: false,
      });
      const tube = new THREE.Mesh(geometry, material);
      tube.userData = { index } as TubeData;
      return tube;
    };

    // Create z-axis lines
    let index = 0;
    for (let x = -gridWidth / 2; x <= gridWidth / 2; x += spacing) {
      // Map x to a t in [0..1]
      const t = (x + gridWidth / 2) / gridWidth;
      const tube = createTube(
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, 0, gridDepth / 2),
        t,
        index++
      );
      group.add(tube);
    }

    // Create x-axis lines
    for (let z = -gridDepth / 2; z <= gridDepth / 2; z += spacing) {
      // Map z to a t in [0..1]
      const t = (z + gridDepth / 2) / gridDepth;
      const tube = createTube(
        new THREE.Vector3(-gridWidth / 2, 0, z),
        new THREE.Vector3(gridWidth / 2, 0, z),
        t,
        index++
      );
      group.add(tube);
    }

    return group;
  }, [gridWidth, gridDepth, spacing]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (!gridRef.current) return;

    gridRef.current.children.forEach((child, i) => {
      const mesh = child as GridMesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      // Simple pulse between #00ffff and #ff00ff
      const offset = 0.5 * Math.sin(time + i * 0.1) + 0.5;
      const colorA = new THREE.Color("#00ffff");
      const colorB = new THREE.Color("#ff00ff");
      const newColor = colorA.clone().lerp(colorB, offset);

      // Normal color
      mat.color.copy(newColor);

      // Make the emissive glow a bit more
      mat.emissive.copy(newColor).multiplyScalar(4); // modest multiplier
    });
  });

  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      {/* Grid */}
      <primitive object={grid} ref={gridRef} />
    </>
  );
};

export function CyberpunkScene(): JSX.Element {
  return (
    <Canvas
      camera={{ position: [50, 5, 50], fov: 75 }}
      style={{ width: "100vw", height: "100vh" }}
      gl={{
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.LinearSRGBColorSpace,
      }}
    >
      <color attach="background" args={["#000000"]} />
      <CyberpunkGrid />
      <FirstPersonControls />
      <EffectComposer>
        <Bloom
          intensity={5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
