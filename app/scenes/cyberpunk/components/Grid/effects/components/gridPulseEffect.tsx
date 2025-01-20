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

  // Store original materials
  useEffect(() => {
    originalMaterials.current = gridLines
      .filter((line) => line?.mesh?.material) // Add safety filter
      .map((line) => ({
        color: (line.mesh.material as THREE.MeshStandardMaterial).color.clone(),
        emissive: (
          line.mesh.material as THREE.MeshStandardMaterial
        ).emissive.clone(),
      }));

    return () => {
      // Restore original materials on cleanup
      gridLines.forEach((line, index) => {
        if (!line?.mesh?.material) return;

        const original = originalMaterials.current[index];
        if (original) {
          (line.mesh.material as THREE.MeshStandardMaterial).color.copy(
            original.color
          );
          (line.mesh.material as THREE.MeshStandardMaterial).emissive.copy(
            original.emissive
          );
        }
      });
    };
  }, [gridLines]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    gridLines.forEach((line, index) => {
      if (!line?.mesh?.userData) return;

      const { baseColor, offset = 0, emissiveBase } = line.mesh.userData;
      if (!baseColor || !emissiveBase) return;

      const pulse = (Math.sin((time + offset) * 1) + 1) * 0.5;
      const brightnessFactor = 0.3 + pulse * intensity;
      const emissiveFactor = 0.5 + pulse * 1.5 * intensity * bloomStrength;

      const newBaseColor = baseColor.clone().multiplyScalar(brightnessFactor);
      const newEmissive = emissiveBase.clone().multiplyScalar(emissiveFactor);

      (line.mesh.material as THREE.MeshStandardMaterial)?.color?.copy(
        newBaseColor
      );
      (line.mesh.material as THREE.MeshStandardMaterial)?.emissive?.copy(
        newEmissive
      );
    });
  });

  return <group ref={groupRef} />;
}
