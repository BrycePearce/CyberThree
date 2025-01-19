import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import type { GridLine } from "~/types/gridTypes";

// Interface defining the properties of each energy pulse
interface Pulse {
  baseEmissive: THREE.Color; // Base color for the emissive effect
  color: THREE.Color; // Base color of the pulse
  direction: THREE.Vector3; // Direction of movement
  hasTurned: boolean; // Track if pulse has made its one allowed turn
  isVertical: boolean; // Current orientation (vertical or horizontal)
  lifetime: number; // How long the pulse has existed
  line: GridLine; // Current grid line the pulse is following
  mesh: THREE.Mesh; // Three.js mesh object for rendering
  position: THREE.Vector3; // Current position in 3D space
  progress: number; // Track total distance moved
  speed: number; // Movement speed
  startAtBeginning: boolean; // Whether pulse started at start or end of line
}

// Props interface for the EnergyPulses component
interface EnergyPulsesProps {
  emissiveIntensity?: number; // Brightness of the pulse glow
  gridLines: GridLine[]; // Array of grid lines to spawn pulses on
  maxPulses?: number; // Maximum number of concurrent pulses
  pulseLength?: number; // Length of the pulse cylinder
  pulseSpeed?: number; // Units per second movement speed
  pulseWidth?: number; // Width of the pulse cylinder
  spawnInterval?: number; // Milliseconds between pulse spawns
  spawnJitter?: number; // Random variation in spawn timing (0-1, default 0.5 means ±50%)
  spawnRate?: number; // Average number of pulses to spawn per second
  turnChance?: number; // Probability (0-1) of turning at intersections
}

export function EnergyPulses({
  gridLines,
  turnChance = 0.07,
  pulseSpeed = 800,
  pulseWidth = 0.15,
  pulseLength = 6.0,
  maxPulses = 4,
  emissiveIntensity = 5.0,
  spawnRate = 0.3,
  spawnJitter = 0.5, // Default to ±50% random variation
}: EnergyPulsesProps) {
  // Track all active pulses
  const [pulses, setPulses] = useState<Pulse[]>([]);
  // Reference to the parent group for all pulse meshes
  const groupRef = useRef<THREE.Group>(null);

  // Track time until next spawn
  const nextSpawnRef = useRef<number>(0);

  // Helper to calculate next spawn time with jitter
  const calculateNextSpawnTime = () => {
    const baseTime = 1 / spawnRate;
    const jitterRange = baseTime * spawnJitter;
    const jitterAmount = (Math.random() * 2 - 1) * jitterRange;
    return Math.max(0.016, baseTime + jitterAmount); // Minimum 16ms (roughly one frame)
  };

  /**
   * Finds all grid lines that intersect with the current line at the given position
   * Used for determining potential turn options at intersections
   */
  const findIntersectingLines = (
    position: THREE.Vector3,
    currentLine: GridLine
  ) => {
    return gridLines.filter((line) => {
      // Skip the line we're currently on
      if (line === currentLine) return false;

      // For vertical lines, look for horizontal intersections
      if (currentLine.isVertical) {
        return (
          !line.isVertical &&
          Math.abs(line.coordinate - position.z) < 0.1 && // Small tolerance for intersection
          position.x >= Math.min(line.start, line.end) &&
          position.x <= Math.max(line.start, line.end)
        );
      }
      // For horizontal lines, look for vertical intersections
      else {
        return (
          line.isVertical &&
          Math.abs(line.coordinate - position.x) < 0.1 && // Small tolerance for intersection
          position.z >= Math.min(line.start, line.end) &&
          position.z <= Math.max(line.start, line.end)
        );
      }
    });
  };

  /**
   * Creates a new pulse on a random grid line
   * Returns undefined if at maximum pulse capacity or no grid lines exist
   */
  const createPulse = () => {
    if (gridLines.length === 0) return;
    if (pulses.length >= maxPulses) return;

    // Select random start line and position
    const startLine = gridLines[Math.floor(Math.random() * gridLines.length)];
    const startAtBeginning = Math.random() > 0.5;
    const startCoord = startAtBeginning ? startLine.start : startLine.end;

    // Calculate starting position based on line orientation
    const position = new THREE.Vector3(
      startLine.isVertical ? startLine.coordinate : startCoord,
      0,
      startLine.isVertical ? startCoord : startLine.coordinate
    );

    // Set initial movement direction
    const direction = new THREE.Vector3(
      startLine.isVertical ? 0 : startAtBeginning ? 1 : -1,
      0,
      startLine.isVertical ? (startAtBeginning ? 1 : -1) : 0
    );

    // Create the visual representation of the pulse
    const geometry = new THREE.CylinderGeometry(
      pulseWidth,
      pulseWidth,
      pulseLength,
      8
    );
    geometry.rotateZ(Math.PI / 2); // Make cylinder parallel to grid

    // Set up colors for the pulse material
    const baseColor = startLine.mesh.userData.baseColor.clone();
    const pulseColor = new THREE.Color(1, 1, 1).lerp(baseColor, 0.3);
    const baseEmissive = new THREE.Color(0x00ffff).lerp(baseColor, 0.5);

    // Create material with glow effect
    const material = new THREE.MeshStandardMaterial({
      emissive: pulseColor,
      emissiveIntensity: emissiveIntensity,
      color: pulseColor.clone().multiplyScalar(0.9),
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 1.0,
    });

    // Create and position the mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.y = startLine.isVertical ? Math.PI / 2 : 0; // Orient along line
    groupRef.current?.add(mesh);

    // Return the complete pulse object
    return {
      position,
      direction,
      progress: 0,
      speed: pulseSpeed,
      line: startLine,
      mesh,
      color: pulseColor,
      lifetime: 0,
      startAtBeginning,
      baseEmissive,
      hasTurned: false,
      isVertical: startLine.isVertical,
    };
  };

  // Main animation loop
  useFrame((state, delta) => {
    // Update spawn timer
    nextSpawnRef.current -= delta;

    // Check if it's time to spawn and we're under the pulse limit
    if (nextSpawnRef.current <= 0 && pulses.length < maxPulses) {
      setPulses((current) => {
        const newPulse = createPulse();
        return newPulse ? [...current, newPulse] : current;
      });

      // Calculate time until next spawn
      nextSpawnRef.current = calculateNextSpawnTime();
    }

    setPulses((current) => {
      return current.filter((pulse) => {
        // Check for possible turns at intersections
        if (!pulse.hasTurned) {
          const intersectingLines = findIntersectingLines(
            pulse.position,
            pulse.line
          );

          // Random chance to turn at intersection
          if (intersectingLines.length > 0 && Math.random() < turnChance) {
            const newLine =
              intersectingLines[
                Math.floor(Math.random() * intersectingLines.length)
              ];

            // Calculate new direction after turn
            const newDirection = new THREE.Vector3(
              newLine.isVertical ? 0 : Math.random() > 0.5 ? 1 : -1,
              0,
              newLine.isVertical ? (Math.random() > 0.5 ? 1 : -1) : 0
            );

            // Update pulse properties for the turn
            pulse.line = newLine;
            pulse.direction.copy(newDirection);
            pulse.hasTurned = true;
            pulse.isVertical = newLine.isVertical;
            pulse.mesh.rotation.y = newLine.isVertical ? Math.PI / 2 : 0;
          }
        }

        // Update position and lifetime
        pulse.progress += pulse.speed * delta;
        pulse.lifetime += delta;

        // Calculate next position
        const newPosition = pulse.position
          .clone()
          .add(pulse.direction.clone().multiplyScalar(pulse.speed * delta));

        // Check if pulse has reached the end of its line
        const isAtEnd = pulse.isVertical
          ? newPosition.z < Math.min(pulse.line.start, pulse.line.end) ||
            newPosition.z > Math.max(pulse.line.start, pulse.line.end)
          : newPosition.x < Math.min(pulse.line.start, pulse.line.end) ||
            newPosition.x > Math.max(pulse.line.start, pulse.line.end);

        // Remove pulse if it's reached the end
        if (isAtEnd) {
          groupRef.current?.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          return false;
        }

        // Update pulse position
        pulse.mesh.position.copy(newPosition);
        pulse.position.copy(newPosition);

        // Animate pulse color/glow
        const pulseMaterial = pulse.mesh.material as THREE.MeshStandardMaterial;
        const colorPhase = (Math.sin(state.clock.elapsedTime * 10) + 1) / 2;
        pulseMaterial.emissive
          .copy(pulse.baseEmissive)
          .lerp(new THREE.Color(1, 1, 1), colorPhase);

        return true;
      });
    });
  });

  // Cleanup when component unmounts
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
