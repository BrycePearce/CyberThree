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
  primaryColor = "#00ff88", // Cyberpunk green
  secondaryColor = "#ff1064", // Neon pink
}: NeonPulseProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const pulseCenter = useRef(new Vector3(0, 0, 0));
  const originalEmissiveIntensities = useRef<number[]>([]);
  const originalEmissiveColors = useRef<Color[]>([]);
  const noiseOffsets = useRef<number[]>([]);

  // Store original material states and set up effect
  useMemo(() => {
    // Store original states
    originalEmissiveIntensities.current = gridLines.map(
      (line) =>
        (line.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity ||
        0
    );
    originalEmissiveColors.current = gridLines.map((line) =>
      (line.mesh.material as THREE.MeshStandardMaterial).emissive.clone()
    );

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

  // Noise function for glitch effect
  const noise = (x: number, y: number, offset: number) => {
    const t = startTime.current / 1000;
    return (
      (Math.sin(x * 0.5 + t + offset) + Math.sin(y * 0.5 - t + offset)) * 0.5
    );
  };

  // Animation loop
  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    // Pulse parameters
    const pulseRadius = progress * 1000;
    const pulseWidth = 100 * intensity;
    const falloff = 0.3;

    gridLines.forEach((line, index) => {
      if (!line?.mesh?.material) return;

      const material = line.mesh.material as THREE.MeshStandardMaterial;

      // Calculate center point of the line
      let centerX: number, centerZ: number;
      if (line.isVertical) {
        centerX = line.coordinate;
        centerZ = (line.start + line.end) / 2;
      } else {
        centerX = (line.start + line.end) / 2;
        centerZ = line.coordinate;
      }

      // Calculate base pulse effect
      const distance = Math.sqrt(
        Math.pow(centerX - pulseCenter.current.x, 2) +
          Math.pow(centerZ - pulseCenter.current.z, 2)
      );

      const distanceFromPulse = Math.abs(distance - pulseRadius);
      const pulseIntensity = Math.max(0, 1 - distanceFromPulse / pulseWidth);

      // Add noise-based variation
      const noiseValue = noise(
        centerX * 0.1,
        centerZ * 0.1,
        noiseOffsets.current[index]
      );
      const glitchIntensity = Math.max(0, noiseValue * 0.2); // Subtle glitch effect

      // Combine base pulse with glitch
      const finalIntensity =
        (Math.pow(pulseIntensity, falloff) + glitchIntensity) * intensity;

      // Color transition based on distance and noise
      const colorMix = (Math.sin(distance * 0.01 + elapsed * 0.001) + 1) * 0.5;
      const pulseColor = new Color(primaryColor).lerp(
        new Color(secondaryColor),
        colorMix
      );

      // Enhance the existing material
      const originalIntensity = originalEmissiveIntensities.current[index];
      const originalColor = originalEmissiveColors.current[index];

      // Apply color and intensity with data-like pattern
      const dataPattern =
        Math.sin(
          (line.isVertical ? centerZ : centerX) * 0.1 + elapsed * 0.002
        ) *
          0.5 +
        0.5;
      const finalColor = originalColor
        .clone()
        .lerp(pulseColor, finalIntensity * 0.6 * dataPattern);

      material.emissive.copy(finalColor);
      material.emissiveIntensity =
        originalIntensity +
        finalIntensity * bloomStrength * (1 + dataPattern * 0.3);
    });

    // Restore original states when complete
    if (progress === 1) {
      gridLines.forEach((line, index) => {
        if (!line.mesh?.material) return;
        const material = line.mesh.material as THREE.MeshStandardMaterial;

        material.emissive.copy(originalEmissiveColors.current[index]);
        material.emissiveIntensity = originalEmissiveIntensities.current[index];
      });
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      gridLines.forEach((line, index) => {
        if (!line.mesh?.material) return;
        const material = line.mesh.material as THREE.MeshStandardMaterial;

        material.emissive.copy(originalEmissiveColors.current[index]);
        material.emissiveIntensity = originalEmissiveIntensities.current[index];
      });
    };
  }, [gridLines]);

  return <group ref={groupRef} />;
}
