import * as THREE from "three";
import { useMemo } from "react";
import { getCyberpunkColor } from "../../utils/colors";

interface PerimeterFrameProps {
  gridWidth: number;
  gridDepth: number;
}

export function PerimeterFrame({ gridWidth, gridDepth }: PerimeterFrameProps) {
  const perimeterFrame = useMemo(() => {
    const perimeterGroup = new THREE.Group();

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

      type EdgeData = [THREE.Vector3, THREE.Vector3, number];
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
  }, [gridWidth, gridDepth]);

  return <primitive object={perimeterFrame} />;
}
