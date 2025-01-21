import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { GridLine } from "~/types/gridTypes";

interface GridPulseProps {
  gridLines: GridLine[];
  intensity: number;
  bloomStrength?: number;
}

export function GridPulse({
  gridLines,
  intensity,
  bloomStrength = 1.5,
}: GridPulseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const originalMaterials = useRef<
    {
      color: THREE.Color;
      emissive: THREE.Color;
    }[]
  >([]);
  useEffect(() => {
    originalMaterials.current = gridLines
      .filter((line) => {
        const material = line?.mesh?.material as THREE.MeshStandardMaterial;
        return material?.color && material?.emissive;
      })
      .map((line) => {
        const material = line.mesh.material as THREE.MeshStandardMaterial;
        return {
          color: material.color.clone(),
          emissive: material.emissive.clone(),
        };
      });

    return () => {
      gridLines.forEach((line, index) => {
        const material = line?.mesh?.material as THREE.MeshStandardMaterial;
        if (!material?.color || !material?.emissive) return;

        const original = originalMaterials.current[index];
        if (original) {
          material.color.copy(original.color);
          material.emissive.copy(original.emissive);
        }
      });
    };
  }, [gridLines]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    gridLines.forEach((line) => {
      const material = line?.mesh?.material as THREE.MeshStandardMaterial;
      const userData = line?.mesh?.userData;

      if (
        !material?.color ||
        !material?.emissive ||
        !userData?.baseColor ||
        !userData?.emissiveBase
      )
        return;

      const { baseColor, emissiveBase, offset = 0 } = userData;

      const pulse = (Math.sin((time + offset) * 1) + 1) * 0.5;
      const brightnessFactor = 0.3 + pulse * intensity;
      const emissiveFactor = 0.5 + pulse * 1.5 * intensity * bloomStrength;

      material.color.copy(baseColor.clone().multiplyScalar(brightnessFactor));
      material.emissive.copy(
        emissiveBase.clone().multiplyScalar(emissiveFactor)
      );
    });
  });

  return <group ref={groupRef} />;
}
