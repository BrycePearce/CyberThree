import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { getCyberpunkColor } from "../utils/colors";
import type { GridLine, GridMesh, TubeData } from "~/types/gridTypes";

interface GridProps {
  gridWidth: number;
  gridDepth: number;
  spacing: number;
  baseRadius: number;
  onGridLinesCreated: (lines: GridLine[]) => void;
}

export function Grid({
  gridWidth,
  gridDepth,
  spacing,
  baseRadius,
  onGridLinesCreated,
}: GridProps) {
  const gridGroup = useMemo(() => {
    function createTube(
      start: THREE.Vector3,
      end: THREE.Vector3,
      fraction: number
    ): GridMesh {
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
      } as TubeData;

      return tube;
    }

    const newGridGroup = new THREE.Group();
    const lines: GridLine[] = [];

    // 1) Create vertical lines
    for (let x = -gridWidth / 2; x <= gridWidth / 2; x += spacing) {
      const fraction = (x + gridWidth / 2) / gridWidth;
      const startPoint = new THREE.Vector3(x, 0, -gridDepth / 2);
      const endPoint = new THREE.Vector3(x, 0, gridDepth / 2);

      const tube = createTube(startPoint, endPoint, fraction);
      newGridGroup.add(tube);

      lines.push({
        isVertical: true,
        mesh: tube,
        coordinate: x,
        start: -gridDepth / 2,
        end: gridDepth / 2,
        length: gridDepth,
        intersections: [],
      });
    }

    // 2) Create horizontal lines
    for (let z = -gridDepth / 2; z <= gridDepth / 2; z += spacing) {
      const fraction = (z + gridDepth / 2) / gridDepth;
      const startPoint = new THREE.Vector3(-gridWidth / 2, 0, z);
      const endPoint = new THREE.Vector3(gridWidth / 2, 0, z);

      const tube = createTube(startPoint, endPoint, fraction);
      newGridGroup.add(tube);

      lines.push({
        isVertical: false,
        mesh: tube,
        coordinate: z,
        start: -gridWidth / 2,
        end: gridWidth / 2,
        length: gridWidth,
        intersections: [],
      });
    }

    // 3) Calculate intersections
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const a = lines[i];
        const b = lines[j];
        if (a.isVertical !== b.isVertical) {
          if (
            a.isVertical &&
            a.coordinate >= b.start &&
            a.coordinate <= b.end &&
            b.coordinate >= a.start &&
            b.coordinate <= a.end
          ) {
            a.intersections.push(j);
            b.intersections.push(i);
          } else if (
            b.isVertical &&
            b.coordinate >= a.start &&
            b.coordinate <= a.end &&
            a.coordinate >= b.start &&
            a.coordinate <= b.end
          ) {
            a.intersections.push(j);
            b.intersections.push(i);
          }
        }
      }
    }

    return { group: newGridGroup, lines };
  }, [gridWidth, gridDepth, spacing, baseRadius]);

  useEffect(() => {
    onGridLinesCreated(gridGroup.lines);
  }, [gridGroup.lines, onGridLinesCreated]);

  return <primitive object={gridGroup.group} />;
}
