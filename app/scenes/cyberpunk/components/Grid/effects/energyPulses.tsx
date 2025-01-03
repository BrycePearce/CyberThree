import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import type { GridLine } from "~/types/gridTypes";

interface Pulse {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  progress: number;
  speed: number;
  line: GridLine;
  mesh: THREE.Mesh;
  color: THREE.Color;
  lifetime: number;
  startAtBeginning: boolean;
  baseEmissive: THREE.Color;
  originalGridEmissive: Map<THREE.Mesh, THREE.Color>;
}

interface EnergyPulsesProps {
  gridLines: GridLine[];
}

export function EnergyPulses({ gridLines }: EnergyPulsesProps) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  // Create a new pulse
  const createPulse = () => {
    if (gridLines.length === 0) return;

    // Randomly select a starting line
    const startLine = gridLines[Math.floor(Math.random() * gridLines.length)];

    // Determine start position (either at the beginning or end of the line)
    const startAtBeginning = Math.random() > 0.5;
    const startCoord = startAtBeginning ? startLine.start : startLine.end;

    const position = new THREE.Vector3(
      startLine.isVertical ? startLine.coordinate : startCoord,
      0,
      startLine.isVertical ? startCoord : startLine.coordinate
    );

    // Create direction vector along the line
    const direction = new THREE.Vector3(
      startLine.isVertical ? 0 : startAtBeginning ? 1 : -1,
      0,
      startLine.isVertical ? (startAtBeginning ? 1 : -1) : 0
    );

    // Create pulse mesh
    const geometry = new THREE.CylinderGeometry(0.15, 0.15, 6.0, 8);

    // Rotate geometry based on line direction
    if (startLine.isVertical) {
      geometry.rotateX(Math.PI / 2);
    } else {
      geometry.rotateZ(Math.PI / 2);
    }

    const baseColor = startLine.mesh.userData.baseColor.clone();
    const pulseColor = new THREE.Color(1, 1, 1).lerp(baseColor, 0.3);
    const baseEmissive = new THREE.Color(0x00ffff).lerp(baseColor, 0.5); // Cyan tint

    const material = new THREE.MeshStandardMaterial({
      emissive: pulseColor,
      emissiveIntensity: 5.0,
      color: pulseColor.clone().multiplyScalar(0.9),
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    groupRef.current?.add(mesh);

    // Store original emissive colors of grid lines
    const originalGridEmissive = new Map<THREE.Mesh, THREE.Color>();
    gridLines.forEach((line) => {
      const material = line.mesh.material as THREE.MeshStandardMaterial;
      originalGridEmissive.set(line.mesh, material.emissive.clone());
    });

    return {
      position,
      direction,
      progress: 0,
      speed: 800,
      line: startLine,
      mesh,
      color: pulseColor,
      lifetime: 0,
      startAtBeginning,
      baseEmissive,
      originalGridEmissive,
    };
  };

  // Spawn new pulses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPulses((current) => {
        const newPulse = createPulse();
        return newPulse ? [...current, newPulse] : current;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [gridLines]);

  // Animate pulses
  useFrame((state, delta) => {
    setPulses((current) => {
      return current.filter((pulse) => {
        // Update pulse position
        pulse.progress += pulse.speed * delta;
        pulse.lifetime += delta;

        // Calculate new position
        const newPosition = pulse.position
          .clone()
          .add(pulse.direction.clone().multiplyScalar(pulse.speed * delta));

        // Check if new position would be beyond the end of the line
        const endPosition = new THREE.Vector3(
          pulse.line.isVertical
            ? pulse.line.coordinate
            : pulse.startAtBeginning
            ? pulse.line.end
            : pulse.line.start,
          0,
          pulse.line.isVertical
            ? pulse.startAtBeginning
              ? pulse.line.end
              : pulse.line.start
            : pulse.line.coordinate
        );

        // Check if we've gone past the end position in the direction we're traveling
        const isPastEnd = pulse.startAtBeginning
          ? pulse.line.isVertical
            ? newPosition.z > endPosition.z
            : newPosition.x > endPosition.x
          : pulse.line.isVertical
          ? newPosition.z < endPosition.z
          : newPosition.x < endPosition.x;

        if (isPastEnd) {
          // Reset grid line emissive colors
          pulse.originalGridEmissive.forEach((color, mesh) => {
            (mesh.material as THREE.MeshStandardMaterial).emissive.copy(color);
            (
              mesh.material as THREE.MeshStandardMaterial
            ).emissiveIntensity = 1.0;
          });

          groupRef.current?.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          return false;
        }

        // Update mesh position
        pulse.mesh.position.copy(newPosition);
        pulse.position.copy(newPosition);

        // Color variation effect
        const pulseMaterial = pulse.mesh.material as THREE.MeshStandardMaterial;
        const colorPhase = (Math.sin(state.clock.elapsedTime * 10) + 1) / 2;
        pulseMaterial.emissive
          .copy(pulse.baseEmissive)
          .lerp(new THREE.Color(1, 1, 1), colorPhase);

        // Intersection glow effect
        const GLOW_RADIUS = 0.1; // How far the glow spreads
        const MAX_INTENSITY = 0.1; // Maximum emissive intensity

        gridLines.forEach((gridLine) => {
          const lineMaterial = gridLine.mesh
            .material as THREE.MeshStandardMaterial;
          const originalColor = pulse.originalGridEmissive.get(gridLine.mesh);

          if (originalColor) {
            // Calculate distance to pulse
            const distance = gridLine.isVertical
              ? Math.abs(gridLine.coordinate - pulse.position.x)
              : Math.abs(gridLine.coordinate - pulse.position.z);

            if (distance < GLOW_RADIUS) {
              // Calculate intensity based on distance
              const intensity = MAX_INTENSITY * (1 - distance / GLOW_RADIUS);
              lineMaterial.emissiveIntensity = 1 + intensity;

              // Blend with pulse color
              const blendFactor = 0.3 * (1 - distance / GLOW_RADIUS);
              lineMaterial.emissive
                .copy(originalColor)
                .lerp(pulse.baseEmissive, blendFactor);
            } else {
              // Reset to original state
              lineMaterial.emissive.copy(originalColor);
              lineMaterial.emissiveIntensity = 1.0;
            }
          }
        });

        return true;
      });
    });
  });

  // Cleanup
  useEffect(() => {
    return () => {
      pulses.forEach((pulse) => {
        // Reset grid line emissive colors
        pulse.originalGridEmissive.forEach((color, mesh) => {
          (mesh.material as THREE.MeshStandardMaterial).emissive.copy(color);
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
        });

        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
      });
    };
  }, []);

  return <group ref={groupRef} />;
}
