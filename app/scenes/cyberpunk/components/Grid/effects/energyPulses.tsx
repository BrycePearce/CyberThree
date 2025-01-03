import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GridLine } from "~/types/gridTypes";

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
  emissiveBase: THREE.Color;
}

interface GridMesh
  extends THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> {
  userData: TubeData;
}

interface Pulse {
  id: string; // Add unique identifier
  lineIndex: number;
  position: number;
  direction: number;
  turned: boolean;
  color: THREE.Color;
  startTime: number;
}

interface EnergyPulsesProps {
  gridLines: GridLine[];
  spawnInterval?: number;
}

// Constants
const PULSE_SPEED = 0.1;
const CHANGE_DIRECTION_PROBABILITY = 0.3;

export function EnergyPulses({
  gridLines,
  spawnInterval = 2000,
}: EnergyPulsesProps) {
  const pulsesRef = useRef<Pulse[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const [pulseCount, setPulseCount] = useState<number>(0);

  // Counter for generating unique IDs
  const idCounterRef = useRef(0);

  // Create new pulse
  const createPulse = () => {
    // Only pick lines that reach the grid edges
    const edgeLines = gridLines.filter((line) => {
      const span = Math.abs(line.end - line.start);
      return span > line.length * 0.8;
    });

    const lineIndex = gridLines.indexOf(
      edgeLines[Math.floor(Math.random() * edgeLines.length)]
    );
    const line = gridLines[lineIndex];

    // Always start from an edge
    const startPos = Math.random() < 0.5 ? 0 : 1;
    const direction = startPos === 0 ? 1 : -1;

    const baseColor = line.mesh.userData.baseColor.clone();
    const pulseColor = baseColor.lerp(new THREE.Color("#ffffff"), 0.8);

    // Increment counter and use it for unique ID
    idCounterRef.current += 1;

    return {
      id: `pulse-${idCounterRef.current}`,
      lineIndex,
      position: startPos,
      direction,
      turned: false,
      color: pulseColor,
      startTime: performance.now(),
    };
  };

  useEffect(() => {
    if (gridLines.length === 0) return;

    const handleSpawn = () => {
      const newPulse = createPulse();
      pulsesRef.current = [...pulsesRef.current, newPulse];
      setPulseCount((prev) => prev + 1);
    };

    handleSpawn();
    const intervalId = setInterval(handleSpawn, spawnInterval);
    return () => clearInterval(intervalId);
  }, [gridLines, spawnInterval]);

  useFrame(() => {
    if (!pulsesRef.current.length) return;

    const currentTime = performance.now();
    const nextPulses: Pulse[] = [];

    for (const pulse of pulsesRef.current) {
      const line = gridLines[pulse.lineIndex];

      // Calculate new position
      const timeElapsed = (currentTime - pulse.startTime) / 1000;
      const totalDistance = PULSE_SPEED * timeElapsed;
      const newPosition =
        pulse.direction > 0
          ? pulse.position + totalDistance
          : pulse.position - totalDistance;

      // Check if pulse should turn at intersection
      if (!pulse.turned) {
        for (const otherIndex of line.intersections) {
          const otherLine = gridLines[otherIndex];

          // Calculate intersection point
          const intersectionFrac = line.isVertical
            ? (otherLine.coordinate - line.start) / line.length
            : (otherLine.coordinate - line.start) / line.length;

          const distanceToIntersection = Math.abs(
            intersectionFrac - newPosition
          );

          // If near intersection and random check passes, turn the pulse
          if (
            distanceToIntersection < 0.02 &&
            Math.random() < CHANGE_DIRECTION_PROBABILITY
          ) {
            const newFrac =
              (line.coordinate - otherLine.start) / otherLine.length;

            // Create turned pulse with new ID
            idCounterRef.current += 1;
            nextPulses.push({
              ...pulse,
              id: `pulse-${idCounterRef.current}`,
              lineIndex: otherIndex,
              position: newFrac,
              direction: Math.random() < 0.5 ? 1 : -1,
              turned: true,
              startTime: currentTime,
            });

            // Skip adding original pulse
            continue;
          }
        }
      }

      // Keep pulse if it's still within bounds
      if (newPosition >= -0.05 && newPosition <= 1.05) {
        nextPulses.push({
          ...pulse,
          position: newPosition,
        });
      }
    }

    pulsesRef.current = nextPulses;
    if (nextPulses.length !== pulseCount) {
      setPulseCount(nextPulses.length);
    }
  });

  return (
    <group ref={groupRef}>
      {pulsesRef.current.map((pulse) => {
        const line = gridLines[pulse.lineIndex];

        const pulseLength = 4;
        const halfLength = pulseLength / 2;

        let centerPoint: THREE.Vector3;
        let startPoint: THREE.Vector3;
        let endPoint: THREE.Vector3;

        if (line.isVertical) {
          const z = line.start + pulse.position * line.length;
          centerPoint = new THREE.Vector3(line.coordinate, 0, z);
          startPoint = centerPoint
            .clone()
            .add(new THREE.Vector3(0, 0, -halfLength));
          endPoint = centerPoint
            .clone()
            .add(new THREE.Vector3(0, 0, halfLength));
        } else {
          const x = line.start + pulse.position * line.length;
          centerPoint = new THREE.Vector3(x, 0, line.coordinate);
          startPoint = centerPoint
            .clone()
            .add(new THREE.Vector3(-halfLength, 0, 0));
          endPoint = centerPoint
            .clone()
            .add(new THREE.Vector3(halfLength, 0, 0));
        }

        const curve = new THREE.LineCurve3(startPoint, endPoint);
        const geometry = new THREE.TubeGeometry(curve, 8, 0.4, 8, false);

        const material = new THREE.MeshStandardMaterial({
          emissive: pulse.color,
          emissiveIntensity: 5.0,
          color: pulse.color.clone().multiplyScalar(0.9),
          metalness: 0.7,
          roughness: 0.2,
          transparent: true,
          opacity: 1.0,
        });

        return <mesh key={pulse.id} geometry={geometry} material={material} />;
      })}
    </group>
  );
}
