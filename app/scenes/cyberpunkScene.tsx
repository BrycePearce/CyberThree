import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import FirstPersonControls from "~/controls/FirstPersonControls";

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
  emissiveBase: THREE.Color;
}

type GridMesh = THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> & {
  userData: TubeData;
};

function CyberpunkGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const tubesRef = useRef<GridMesh[]>([]);

  // Grid parameters
  const baseRadius = 0.06;
  const gridWidth = 400;
  const gridDepth = 350;
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

  function createPerimeterFrame() {
    const perimeterGroup = new THREE.Group();

    type EdgeData = [THREE.Vector3, THREE.Vector3, number];

    function createSingleTubeEdge(
      start: THREE.Vector3,
      end: THREE.Vector3,
      fraction: number,
      scale: number,
      layerIndex: number
    ) {
      const curve = new THREE.LineCurve3(start, end);

      const baseEdgeColor = getCyberpunkColor(fraction);
      const whiteBlend = 0.2;
      const finalColor = baseEdgeColor
        .clone()
        .lerp(new THREE.Color("#ffffff"), whiteBlend);

      const geometry = new THREE.TubeGeometry(
        curve,
        12,
        0.25 * scale * (1 + layerIndex * 0.15),
        24,
        false
      );

      const material = new THREE.MeshStandardMaterial({
        color: finalColor,
        emissive: finalColor,
        emissiveIntensity: 4.0 - layerIndex * 0.5,
        metalness: 0.3,
        roughness: 0.2,
        toneMapped: true,
      });

      return new THREE.Mesh(geometry, material);
    }

    function createFrame(scale: number, yOffset: number, layerIndex: number) {
      const frameGroup = new THREE.Group();

      const width = gridWidth * scale;
      const depth = gridDepth * scale;
      const y = yOffset;

      const edges: EdgeData[] = [
        [
          new THREE.Vector3(-width / 2, y, depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          1.0,
        ],
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, -depth / 2),
          0.0,
        ],
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(-width / 2, y, depth / 2),
          0.35,
        ],
        [
          new THREE.Vector3(width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          0.65,
        ],
      ];

      edges.forEach(([start, end, fraction]) => {
        const tube = createSingleTubeEdge(
          start,
          end,
          fraction,
          scale,
          layerIndex
        );
        frameGroup.add(tube);
      });

      return frameGroup;
    }

    const frameConfigs = [
      { scale: 1.0, yOffset: 0.3, layerIndex: 0 },
      { scale: 1.1, yOffset: 0.4, layerIndex: 1 },
      { scale: 1.2, yOffset: 0.5, layerIndex: 2 },
      { scale: 1.3, yOffset: 0.6, layerIndex: 3 },
      { scale: 1.4, yOffset: 0.7, layerIndex: 4 },
      { scale: 1.5, yOffset: 0.8, layerIndex: 5 },
      { scale: 1.6, yOffset: 0.9, layerIndex: 6 },
      { scale: 1.7, yOffset: 1.0, layerIndex: 7 },
      { scale: 1.8, yOffset: 1.1, layerIndex: 8 },
    ];

    frameConfigs.forEach(({ scale, yOffset, layerIndex }) => {
      const frame = createFrame(scale, yOffset, layerIndex);
      perimeterGroup.add(frame);
    });

    return perimeterGroup;
  }

  function createTube(
    start: THREE.Vector3,
    end: THREE.Vector3,
    fraction: number
  ) {
    const curve = new THREE.LineCurve3(start, end);
    const segments = Math.ceil(start.distanceTo(end) / 2);
    const color = getCyberpunkColor(fraction);

    const material = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.5),
      emissive: color.clone(),
      emissiveIntensity: 1.0,
      metalness: 0.2,
      roughness: 0.6,
      toneMapped: true,
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
      offset: Math.random() * 10,
      emissiveBase: color.clone(),
    };

    return tube;
  }

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

    // Add the main grid
    groupRef.current.add(gridGroup);

    // Add the perimeter frame
    const perimeterFrame = createPerimeterFrame();
    groupRef.current.add(perimeterFrame);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    tubesRef.current.forEach((tube) => {
      const { baseColor, offset, emissiveBase } = tube.userData || {};
      if (!baseColor || offset === undefined || !emissiveBase) return;

      const pulse = (Math.sin((time + offset) * 1) + 1) * 0.5;
      const brightnessFactor = 0.3 + pulse * 1;
      const emissiveFactor = 0.5 + pulse * 1.5;

      const newBaseColor = baseColor.clone().multiplyScalar(brightnessFactor);
      const newEmissive = emissiveBase.clone().multiplyScalar(emissiveFactor);

      const standardMat = tube.material as THREE.MeshStandardMaterial;
      standardMat.color = newBaseColor;
      standardMat.emissive = newEmissive;
    });
  });

  return <group ref={groupRef} />;
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
