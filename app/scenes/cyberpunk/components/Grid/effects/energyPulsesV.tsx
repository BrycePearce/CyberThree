import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Pulse {
  lineIndex: number;
  position: number;
  direction: number;
  turned: boolean;
  color: THREE.Color;
}

interface EnergyPulsesProps {
  gridLines: GridLine[];
  spawnInterval?: number;
}

// Constants
const PULSE_SPEED = 0.1;
const CHANGE_DIRECTION_PROBABILITY = 0.3;

interface TubeData {
  baseColor: THREE.Color;
  offset: number;
  emissiveBase: THREE.Color;
}

interface GridMesh
  extends THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial> {
  userData: TubeData;
}

interface GridLine {
  isVertical: boolean;
  mesh: GridMesh;
  coordinate: number;
  start: number;
  end: number;
  length: number;
  intersections: number[];
}

interface Pulse {
  lineIndex: number;
  position: number;
  direction: number;
  turned: boolean;
  color: THREE.Color;
  startTime: number;
}

interface EnergyPulsesVProps {
  gridLines: GridLine[];
  spawnInterval?: number;
}

export function EnergyPulsesV({
  gridLines,
  spawnInterval = 2000,
}: EnergyPulsesVProps) {
  const pulsesRef = useRef<Pulse[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const [pulseCount, setPulseCount] = useState<number>(0);

  useEffect(() => {
    if (gridLines.length === 0) return;

    const handleSpawn = () => {
      const lineIndex = Math.floor(Math.random() * gridLines.length);
      const line = gridLines[lineIndex];

      const startPos = Math.random() < 0.5 ? 0 : 1;
      const direction = startPos === 0 ? 1 : -1;

      const baseColor = line.mesh.userData.baseColor.clone();
      const pulseColor = baseColor.lerp(new THREE.Color("#ffffff"), 0.8);

      const newPulse: Pulse = {
        lineIndex,
        position: startPos,
        direction,
        turned: false,
        color: pulseColor,
        startTime: performance.now(),
      };

      pulsesRef.current.push(newPulse);
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

      // Calculate position based on elapsed time since pulse creation
      const timeElapsed = (currentTime - pulse.startTime) / 1000;
      const totalDistance = PULSE_SPEED * timeElapsed;
      const newPosition =
        pulse.direction > 0
          ? pulse.position + (totalDistance % 1)
          : pulse.position - (totalDistance % 1);

      // Handle intersections
      if (!pulse.turned) {
        for (const otherIndex of line.intersections) {
          const otherLine = gridLines[otherIndex];

          const intersectionFrac = line.isVertical
            ? (otherLine.coordinate - line.start) / line.length
            : (otherLine.coordinate - line.start) / line.length;

          const distanceToIntersection = Math.abs(
            intersectionFrac - newPosition
          );
          if (distanceToIntersection < 0.02) {
            if (Math.random() < CHANGE_DIRECTION_PROBABILITY) {
              const newFrac =
                (line.coordinate - otherLine.start) / otherLine.length;
              const updatedPulse = {
                ...pulse,
                lineIndex: otherIndex,
                position: newFrac,
                direction: Math.random() < 0.5 ? 1 : -1,
                turned: true,
                startTime: currentTime,
              };
              nextPulses.push(updatedPulse);
              continue;
            }
          }
        }
      }

      // Keep pulse if it's still within bounds
      if (newPosition >= -0.05 && newPosition <= 1.05) {
        const updatedPulse = {
          ...pulse,
          position: newPosition,
        };
        nextPulses.push(updatedPulse);
      }
    }

    pulsesRef.current = nextPulses;
    if (nextPulses.length !== pulseCount) {
      setPulseCount(nextPulses.length);
    }
  });

  return (
    <group ref={groupRef}>
      {pulsesRef.current.map((pulse, index) => {
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

        return <mesh key={index} geometry={geometry} material={material} />;
      })}
    </group>
  );
}
