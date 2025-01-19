import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import type { GridLine } from "~/types/gridTypes";

interface Pulse {
  baseEmissive: THREE.Color;
  color: THREE.Color;
  direction: THREE.Vector3;
  hasTurned: boolean;
  isVertical: boolean;
  lifetime: number;
  line: GridLine;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  progress: number;
  speed: number;
}

interface EnergyPulsesProps {
  gridLines: GridLine[];
  trigger: number;
  turnChance?: number;
  pulseSpeed?: number;
  pulseWidth?: number;
  pulseLength?: number;
  maxPulses?: number;
  emissiveIntensity?: number;
}

export function EnergyPulses({
  gridLines,
  trigger,
  turnChance = 0.07,
  pulseSpeed = 800,
  pulseWidth = 0.15,
  pulseLength = 6.0,
  maxPulses = 1,
  emissiveIntensity = 5.0,
}: EnergyPulsesProps) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const lastTriggerRef = useRef(trigger);

  const findIntersectingLines = (
    position: THREE.Vector3,
    currentLine: GridLine
  ) => {
    return gridLines.filter((line) => {
      if (line === currentLine) return false;

      if (currentLine.isVertical) {
        return (
          !line.isVertical &&
          Math.abs(line.coordinate - position.z) < 0.1 &&
          position.x >= Math.min(line.start, line.end) &&
          position.x <= Math.max(line.start, line.end)
        );
      } else {
        return (
          line.isVertical &&
          Math.abs(line.coordinate - position.x) < 0.1 &&
          position.z >= Math.min(line.start, line.end) &&
          position.z <= Math.max(line.start, line.end)
        );
      }
    });
  };

  const createPulse = () => {
    if (gridLines.length === 0) return;

    const startLine = gridLines[Math.floor(Math.random() * gridLines.length)];
    const startAtBeginning = Math.random() > 0.5;
    const startCoord = startAtBeginning ? startLine.start : startLine.end;

    const position = new THREE.Vector3(
      startLine.isVertical ? startLine.coordinate : startCoord,
      0,
      startLine.isVertical ? startCoord : startLine.coordinate
    );

    const direction = new THREE.Vector3(
      startLine.isVertical ? 0 : startAtBeginning ? 1 : -1,
      0,
      startLine.isVertical ? (startAtBeginning ? 1 : -1) : 0
    );

    const geometry = new THREE.CylinderGeometry(
      pulseWidth,
      pulseWidth,
      pulseLength,
      8
    );
    geometry.rotateZ(Math.PI / 2);

    const baseColor = startLine.mesh.userData.baseColor.clone();
    const pulseColor = new THREE.Color(1, 1, 1).lerp(baseColor, 0.3);
    const baseEmissive = new THREE.Color(0x00ffff).lerp(baseColor, 0.5);

    const material = new THREE.MeshStandardMaterial({
      emissive: pulseColor,
      emissiveIntensity: emissiveIntensity,
      color: pulseColor.clone().multiplyScalar(0.9),
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.y = startLine.isVertical ? Math.PI / 2 : 0;
    groupRef.current?.add(mesh);

    return {
      position,
      direction,
      progress: 0,
      speed: pulseSpeed,
      line: startLine,
      mesh,
      color: pulseColor,
      lifetime: 0,
      baseEmissive,
      hasTurned: false,
      isVertical: startLine.isVertical,
    };
  };

  useEffect(() => {
    if (trigger !== lastTriggerRef.current) {
      lastTriggerRef.current = trigger;

      for (let i = 0; i < maxPulses; i++) {
        setPulses((current) => {
          const newPulse = createPulse();
          return newPulse ? [...current, newPulse] : current;
        });
      }
    }
  }, [trigger, maxPulses]);

  useFrame((state, delta) => {
    setPulses((current) => {
      return current.filter((pulse) => {
        if (!pulse.hasTurned) {
          const intersectingLines = findIntersectingLines(
            pulse.position,
            pulse.line
          );

          if (intersectingLines.length > 0 && Math.random() < turnChance) {
            const newLine =
              intersectingLines[
                Math.floor(Math.random() * intersectingLines.length)
              ];
            const newDirection = new THREE.Vector3(
              newLine.isVertical ? 0 : Math.random() > 0.5 ? 1 : -1,
              0,
              newLine.isVertical ? (Math.random() > 0.5 ? 1 : -1) : 0
            );

            pulse.line = newLine;
            pulse.direction.copy(newDirection);
            pulse.hasTurned = true;
            pulse.isVertical = newLine.isVertical;
            pulse.mesh.rotation.y = newLine.isVertical ? Math.PI / 2 : 0;
          }
        }

        pulse.progress += pulse.speed * delta;
        pulse.lifetime += delta;

        const newPosition = pulse.position
          .clone()
          .add(pulse.direction.clone().multiplyScalar(pulse.speed * delta));

        const isAtEnd = pulse.isVertical
          ? newPosition.z < Math.min(pulse.line.start, pulse.line.end) ||
            newPosition.z > Math.max(pulse.line.start, pulse.line.end)
          : newPosition.x < Math.min(pulse.line.start, pulse.line.end) ||
            newPosition.x > Math.max(pulse.line.start, pulse.line.end);

        if (isAtEnd) {
          groupRef.current?.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          return false;
        }

        pulse.mesh.position.copy(newPosition);
        pulse.position.copy(newPosition);

        const pulseMaterial = pulse.mesh.material as THREE.MeshStandardMaterial;
        const colorPhase = (Math.sin(state.clock.elapsedTime * 10) + 1) / 2;
        pulseMaterial.emissive
          .copy(pulse.baseEmissive)
          .lerp(new THREE.Color(1, 1, 1), colorPhase);

        return true;
      });
    });
  });

  useEffect(() => {
    return () => {
      pulses.forEach((pulse) => {
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
      });
    };
  }, []);

  return <group ref={groupRef} />;
}
