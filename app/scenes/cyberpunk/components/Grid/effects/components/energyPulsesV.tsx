import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import type { GridLine } from "~/types/gridTypes";

interface Pulse {
  lineIndex?: number;
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

interface PulseV extends Pulse {
  id: string;
  parentId?: string;
}

interface EnergyPulsesVProps {
  gridLines: GridLine[];
  pulseSpeed?: number;
  pulseWidth?: number;
  pulseLength?: number;
  maxPulses?: number;
  emissiveIntensity?: number;
}

export function EnergyPulsesV({
  gridLines,
  pulseSpeed = 400,
  pulseWidth = 0.15,
  pulseLength = 6.0,
  maxPulses = 75, // doing max pulses here makes cool different effects between TARGET_VERTICAL_PULSES 1 and 7
  emissiveIntensity = 5.0,
}: EnergyPulsesVProps) {
  const [pulses, setPulses] = useState<PulseV[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const pulseIdCounter = useRef(0);
  const activeVerticalPulses = useRef(0);
  const TARGET_VERTICAL_PULSES = 3; // Constant number of vertical pulses to maintain

  const findIntersection = (pulse: PulseV): GridLine | null => {
    if (!pulse.isVertical) return null;

    const currentZ = pulse.position.z;

    return (
      gridLines.find((line) => {
        if (line.isVertical) return false;
        if (pulse.processedZ.has(line.coordinate)) return false;

        const isAtZ = Math.abs(currentZ - line.coordinate) < 1;
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
  ): PulseV | undefined => {
    if (!isChild && activeVerticalPulses.current >= TARGET_VERTICAL_PULSES)
      return;
    if (isChild && pulses.length >= maxPulses) return;

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

    if (startLine.isVertical && !isChild) {
      activeVerticalPulses.current++;
    }

    return {
      id: `pulse-${pulseIdCounter.current++}`,
      parentId,
      position: startPosition.clone(),
      lineFraction: startFraction,
      direction,
      progress: 0,
      speed: pulseSpeed,
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

  const createInitialPulse = () => {
    if (gridLines.length === 0) return;

    const verticalLines = gridLines.filter((line) => line.isVertical);
    if (verticalLines.length === 0) return;

    const startLine =
      verticalLines[Math.floor(Math.random() * verticalLines.length)];
    const direction = new THREE.Vector3(0, 0, 1);

    return createPulse(startLine, 0, direction, undefined, false);
  };

  const spawnChildPulses = (
    parentPulse: PulseV,
    intersectingLine: GridLine
  ) => {
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

  useFrame((state, delta) => {
    // Maintain constant number of vertical pulses
    if (activeVerticalPulses.current < TARGET_VERTICAL_PULSES) {
      setPulses((current) => {
        const newPulse = createInitialPulse();
        return newPulse ? [...current, newPulse] : current;
      });
    }

    setPulses((current) => {
      return current.filter((pulse) => {
        const lineLength = Math.abs(pulse.line.end - pulse.line.start);
        const deltaFraction = (pulse.speed * delta) / lineLength;
        const newFraction =
          pulse.lineFraction +
          (pulse.direction.z !== 0
            ? deltaFraction * pulse.direction.z
            : deltaFraction * pulse.direction.x);

        if (pulse.isVertical) {
          const intersectingLine = findIntersection(pulse);
          if (intersectingLine) {
            spawnChildPulses(pulse, intersectingLine);
          }
        }

        if (newFraction < -0.05 || newFraction > 1.05) {
          groupRef.current?.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();

          if (pulse.isVertical && !pulse.isChild) {
            activeVerticalPulses.current--;
          }

          return false;
        }

        if (pulse.line.isVertical) {
          pulse.position.z =
            pulse.line.start +
            newFraction * (pulse.line.end - pulse.line.start);
        } else {
          pulse.position.x =
            pulse.line.start +
            newFraction * (pulse.line.end - pulse.line.start);
        }
        pulse.lineFraction = newFraction;
        pulse.mesh.position.copy(pulse.position);

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
      activeVerticalPulses.current = 0;
    };
  }, []);

  return <group ref={groupRef} />;
}
