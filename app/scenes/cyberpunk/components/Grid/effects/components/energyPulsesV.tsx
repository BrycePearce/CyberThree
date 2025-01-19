import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import type { GridLine } from "~/types/gridTypes";

interface Pulse {
  id: string;
  parentId?: string;
  position: THREE.Vector3;
  lineFraction: number;
  direction: THREE.Vector3;
  color: THREE.Color;
  progress: 0;
  speed: number;
  line: GridLine;
  mesh: THREE.Mesh<
    THREE.CylinderGeometry,
    THREE.MeshStandardMaterial,
    THREE.Object3DEventMap
  >;
  lifetime: number;
  baseEmissive: THREE.Color;
  isVertical: boolean;
  processedZ: Set<number>;
  isChild: boolean;
}

interface EnergyPulsesVProps {
  gridLines: GridLine[];
  trigger: number;
  pulseSpeed?: number;
  pulseWidth?: number;
  pulseLength?: number;
  maxPulses?: number;
  emissiveIntensity?: number;
  verticalPulses?: number;
}

export function EnergyPulsesV({
  gridLines,
  trigger,
  pulseSpeed = 400,
  pulseWidth = 0.15,
  pulseLength = 6.0,
  maxPulses = 75,
  emissiveIntensity = 5.0,
  verticalPulses = 1,
}: EnergyPulsesVProps) {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const pulseIdCounter = useRef(0);
  const lastTriggerRef = useRef(trigger);

  const isWithinBounds = (position: THREE.Vector3, line: GridLine): boolean => {
    const BOUNDARY_TOLERANCE = 0.1;
    if (line.isVertical) {
      return (
        position.z >= Math.min(line.start, line.end) - BOUNDARY_TOLERANCE &&
        position.z <= Math.max(line.start, line.end) + BOUNDARY_TOLERANCE
      );
    }
    return (
      position.x >= Math.min(line.start, line.end) - BOUNDARY_TOLERANCE &&
      position.x <= Math.max(line.start, line.end) + BOUNDARY_TOLERANCE
    );
  };

  const findIntersection = (pulse: Pulse): GridLine | null => {
    if (!pulse.isVertical) return null;

    const currentZ = pulse.position.z;
    const INTERSECTION_TOLERANCE = 1;

    return (
      gridLines.find((line) => {
        if (line.isVertical || pulse.processedZ.has(line.coordinate))
          return false;

        const isAtZ =
          Math.abs(currentZ - line.coordinate) < INTERSECTION_TOLERANCE;
        if (!isAtZ) return false;

        return (
          pulse.line.coordinate >= Math.min(line.start, line.end) &&
          pulse.line.coordinate <= Math.max(line.start, line.end)
        );
      }) || null
    );
  };

  const createPulse = (
    startLine: GridLine,
    startFraction: number,
    direction: THREE.Vector3,
    parentId?: string,
    isChild: boolean = false
  ): Pulse | undefined => {
    if (isChild && pulses.length >= maxPulses * 1.5) return;

    const startPosition = new THREE.Vector3();
    if (startLine.isVertical) {
      const z =
        startLine.start + startFraction * (startLine.end - startLine.start);
      startPosition.set(startLine.coordinate, 0, z);
    } else {
      const x =
        startLine.start + startFraction * (startLine.end - startLine.start);
      startPosition.set(x, 0, startLine.coordinate);
    }

    if (!isWithinBounds(startPosition, startLine)) return;

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
    mesh.position.copy(startPosition);
    mesh.rotation.y = startLine.isVertical ? Math.PI / 2 : 0;
    groupRef.current?.add(mesh);

    return {
      id: `pulse-${pulseIdCounter.current++}`,
      parentId,
      position: startPosition.clone(),
      lineFraction: startFraction,
      direction,
      progress: 0,
      speed: pulseSpeed * (isChild ? 1.2 : 1),
      line: startLine,
      mesh,
      color: pulseColor,
      lifetime: 0,
      baseEmissive,
      isVertical: startLine.isVertical,
      processedZ: new Set(),
      isChild,
    };
  };

  const spawnInitialPulses = () => {
    const verticalLines = gridLines.filter((line) => line.isVertical);
    if (verticalLines.length === 0) return;

    for (let i = 0; i < verticalPulses; i++) {
      const startLine =
        verticalLines[Math.floor(Math.random() * verticalLines.length)];
      const direction = new THREE.Vector3(0, 0, 1);
      const newPulse = createPulse(startLine, 0, direction, undefined, false);

      if (newPulse) {
        setPulses((current) => [...current, newPulse]);
      }
    }
  };

  const spawnChildPulses = (parentPulse: Pulse, intersectingLine: GridLine) => {
    parentPulse.processedZ.add(intersectingLine.coordinate);

    const spawnFraction =
      (parentPulse.line.coordinate - intersectingLine.start) /
      (intersectingLine.end - intersectingLine.start);

    [-1, 1].forEach((dir) => {
      const childPulse = createPulse(
        intersectingLine,
        spawnFraction,
        new THREE.Vector3(dir, 0, 0),
        parentPulse.id,
        true
      );

      if (childPulse) {
        setPulses((current) => [...current, childPulse]);
      }
    });
  };

  // Handle trigger changes
  useEffect(() => {
    if (trigger !== lastTriggerRef.current) {
      lastTriggerRef.current = trigger;
      setPulses([]); // Clear existing pulses
      spawnInitialPulses();
    }
  }, [trigger, verticalPulses]);

  // Animation loop
  useFrame((state, delta) => {
    setPulses((current) => {
      return current.filter((pulse) => {
        const lineLength = Math.abs(pulse.line.end - pulse.line.start);
        const deltaFraction = (pulse.speed * delta) / lineLength;
        const newFraction =
          pulse.lineFraction +
          (pulse.direction.z !== 0
            ? deltaFraction * pulse.direction.z
            : deltaFraction * pulse.direction.x);

        const newPosition = pulse.position.clone();
        if (pulse.line.isVertical) {
          newPosition.z =
            pulse.line.start +
            newFraction * (pulse.line.end - pulse.line.start);
        } else {
          newPosition.x =
            pulse.line.start +
            newFraction * (pulse.line.end - pulse.line.start);
        }

        if (!isWithinBounds(newPosition, pulse.line)) {
          groupRef.current?.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          return false;
        }

        if (pulse.isVertical) {
          const intersectingLine = findIntersection(pulse);
          if (intersectingLine) {
            spawnChildPulses(pulse, intersectingLine);
          }
        }

        pulse.position.copy(newPosition);
        pulse.lineFraction = newFraction;
        pulse.mesh.position.copy(newPosition);

        const pulseMaterial = pulse.mesh.material as THREE.MeshStandardMaterial;
        const colorPhase = (Math.sin(state.clock.elapsedTime * 10) + 1) / 2;
        pulseMaterial.emissive
          .copy(pulse.baseEmissive)
          .lerp(new THREE.Color(1, 1, 1), colorPhase);

        return true;
      });
    });
  });

  // Cleanup
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
