import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { useRef } from "react";
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
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Grid parameters
  const gridWidth: number = 300;
  const gridDepth: number = 250;
  const spacing: number = 2;
  const baseRadius: number = 0.04;

  // Create the grid tubes
  const createGrid = (): GridGroup => {
    const grid = new THREE.Group() as GridGroup;

    // Create base material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#ffffff"),
      metalness: 0.5,
      roughness: 0.5,
    });

    materialRef.current = material;

    // Function to create tube
    const createTube = (
      start: THREE.Vector3,
      end: THREE.Vector3,
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
      const tube = new THREE.Mesh(geometry, material.clone()) as GridMesh;
      tube.userData = { index } as TubeData;
      return tube;
    };

    // Create z-axis lines
    for (let x = -gridWidth / 2; x <= gridWidth / 2; x += spacing) {
      const tube = createTube(
        new THREE.Vector3(x, 0, -gridDepth / 2),
        new THREE.Vector3(x, 0, gridDepth / 2),
        x
      );
      grid.add(tube);
    }

    // Create x-axis lines
    for (let z = -gridDepth / 2; z <= gridDepth / 2; z += spacing) {
      const tube = createTube(
        new THREE.Vector3(-gridWidth / 2, 0, z),
        new THREE.Vector3(gridWidth / 2, 0, z),
        z
      );
      grid.add(tube);
    }

    return grid;
  };

  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />

      {/* Grid */}
      <primitive object={createGrid()} ref={gridRef} />
    </>
  );
};

export function CyberpunkScene(): JSX.Element {
  return (
    <Canvas
      camera={{ position: [50, 5, 50], fov: 75 }}
      style={{ background: "#000000", width: "100vw", height: "100vh" }}
    >
      <CyberpunkGrid />
      <FirstPersonControls />
    </Canvas>
  );
}
