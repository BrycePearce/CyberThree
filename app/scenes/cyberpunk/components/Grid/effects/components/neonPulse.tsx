import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Vector3 } from "three";
import type { GridLine } from "~/types/gridTypes";

type NeonPulseProps = {
  gridLines: GridLine[];
  intensity?: number;
  bloomStrength?: number;
  duration?: number;
  primaryColor?: string;
  secondaryColor?: string;
};

export function NeonPulse({
  gridLines,
  intensity = 1.0,
  bloomStrength = 1.5,
  duration = 3000,
  primaryColor = "#00ff88",
  secondaryColor = "#ff1064",
}: NeonPulseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const pulseCenter = useRef(new Vector3(0, 0, 0));
  const originalEmissiveIntensities = useRef<number[]>([]);
  const originalEmissiveColors = useRef<Color[]>([]);
  const noiseOffsets = useRef<number[]>([]);

  // Safely get material from mesh
  const getMaterial = (line: GridLine): THREE.MeshStandardMaterial | null => {
    if (!line?.mesh?.material) return null;
    return line.mesh.material as THREE.MeshStandardMaterial;
  };

  // Safely clone color
  const safeCloneColor = (color: THREE.Color | undefined): THREE.Color => {
    if (!color) return new THREE.Color();
    return color.clone();
  };

  // Store original material states and set up effect
  useMemo(() => {
    // Store original states with safety checks
    originalEmissiveIntensities.current = gridLines.map((line) => {
      const material = getMaterial(line);
      return material?.emissiveIntensity ?? 0;
    });

    originalEmissiveColors.current = gridLines.map((line) => {
      const material = getMaterial(line);
      return material ? safeCloneColor(material.emissive) : new Color();
    });

    // Create random noise offsets for each line
    noiseOffsets.current = gridLines.map(() => Math.random() * Math.PI * 2);

    // Set random pulse center within grid bounds
    const bounds = gridLines.reduce(
      (acc, line) => {
        if (line.isVertical) {
          acc.minX = Math.min(acc.minX, line.coordinate);
          acc.maxX = Math.max(acc.maxX, line.coordinate);
          acc.minZ = Math.min(acc.minZ, line.start);
          acc.maxZ = Math.max(acc.maxZ, line.end);
        } else {
          acc.minX = Math.min(acc.minX, line.start);
          acc.maxX = Math.max(acc.maxX, line.end);
          acc.minZ = Math.min(acc.minZ, line.coordinate);
          acc.maxZ = Math.max(acc.maxZ, line.coordinate);
        }
        return acc;
      },
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
    );

    pulseCenter.current.set(
      bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      0,
      bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
    );
  }, [gridLines]);

  const noise = (x: number, y: number, offset: number) => {
    const t = startTime.current / 1000;
    return (
      (Math.sin(x * 0.5 + t + offset) + Math.sin(y * 0.5 - t + offset)) * 0.5
    );
  };

  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    const pulseRadius = progress * 1000;
    const pulseWidth = 100 * intensity;
    const falloff = 0.3;

    gridLines.forEach((line, index) => {
      const material = getMaterial(line);
      if (!material) return;

      // Calculate center point of the line
      let centerX: number, centerZ: number;
      if (line.isVertical) {
        centerX = line.coordinate;
        centerZ = (line.start + line.end) / 2;
      } else {
        centerX = (line.start + line.end) / 2;
        centerZ = line.coordinate;
      }

      const distance = Math.sqrt(
        Math.pow(centerX - pulseCenter.current.x, 2) +
          Math.pow(centerZ - pulseCenter.current.z, 2)
      );

      const distanceFromPulse = Math.abs(distance - pulseRadius);
      const pulseIntensity = Math.max(0, 1 - distanceFromPulse / pulseWidth);

      const noiseValue = noise(
        centerX * 0.1,
        centerZ * 0.1,
        noiseOffsets.current[index]
      );
      const glitchIntensity = Math.max(0, noiseValue * 0.2);

      const finalIntensity =
        (Math.pow(pulseIntensity, falloff) + glitchIntensity) * intensity;

      const colorMix = (Math.sin(distance * 0.01 + elapsed * 0.001) + 1) * 0.5;
      const pulseColor = new Color(primaryColor).lerp(
        new Color(secondaryColor),
        colorMix
      );

      const originalIntensity = originalEmissiveIntensities.current[index] ?? 0;
      const originalColor =
        originalEmissiveColors.current[index] ?? new Color();

      const dataPattern =
        Math.sin(
          (line.isVertical ? centerZ : centerX) * 0.1 + elapsed * 0.002
        ) *
          0.5 +
        0.5;

      try {
        const finalColor = safeCloneColor(originalColor).lerp(
          pulseColor,
          finalIntensity * 0.6 * dataPattern
        );

        material.emissive.copy(finalColor);
        material.emissiveIntensity =
          originalIntensity +
          finalIntensity * bloomStrength * (1 + dataPattern * 0.3);
      } catch (error) {
        console.warn("Error updating material:", error);
      }
    });

    // Restore original states when complete
    if (progress === 1) {
      gridLines.forEach((line, index) => {
        const material = getMaterial(line);
        if (!material) return;

        const originalColor = originalEmissiveColors.current[index];
        const originalIntensity = originalEmissiveIntensities.current[index];

        if (originalColor) {
          material.emissive.copy(originalColor);
        }
        if (typeof originalIntensity === "number") {
          material.emissiveIntensity = originalIntensity;
        }
      });
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      gridLines.forEach((line, index) => {
        const material = getMaterial(line);
        if (!material) return;

        const originalColor = originalEmissiveColors.current[index];
        const originalIntensity = originalEmissiveIntensities.current[index];

        if (originalColor) {
          material.emissive.copy(originalColor);
        }
        if (typeof originalIntensity === "number") {
          material.emissiveIntensity = originalIntensity;
        }
      });
    };
  }, [gridLines]);

  return <group ref={groupRef} />;
}
