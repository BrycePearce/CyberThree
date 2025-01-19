import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import type { GridLine } from "~/types/gridTypes";

interface WaveState {
  center: THREE.Vector2;
  startTime: number;
  color: THREE.Color;
}

interface LineWaveOptions {
  interval: number;
  maxRadius: number;
  speed: number;
  color: THREE.Color;
  maxWaves: number;
}

export function useLineWaveEffect(
  gridLines: GridLine[],
  options: LineWaveOptions
) {
  const [waves, setWaves] = useState<WaveState[]>([]);

  useEffect(() => {
    const interval = setInterval(spawnLineWave, options.interval);
    return () => clearInterval(interval);
  }, [options.interval]);

  useFrame((state) => {
    updateLineWaves(state.clock.getElapsedTime());
  });

  const spawnLineWave = () => {
    if (waves.length >= options.maxWaves) return;

    // Find random intersection point
    const verticalLines = gridLines.filter((line) => line.isVertical);
    const horizontalLines = gridLines.filter((line) => !line.isVertical);

    const randomVertical =
      verticalLines[Math.floor(Math.random() * verticalLines.length)];
    const randomHorizontal =
      horizontalLines[Math.floor(Math.random() * horizontalLines.length)];

    const newWave: WaveState = {
      center: new THREE.Vector2(
        randomVertical.coordinate,
        randomHorizontal.coordinate
      ),
      startTime: Date.now(),
      color: options.color.clone(),
    };

    setWaves((prev) => [...prev, newWave]);
  };

  const updateLineWaves = (time: number) => {
    const currentTime = Date.now();

    // Reset all lines to base state
    gridLines.forEach((line) => {
      const userData = line.mesh.userData;
      line.mesh.material.emissive.copy(userData.emissiveBase);
      line.mesh.material.color.copy(userData.baseColor).multiplyScalar(0.5);
    });

    // Update and apply active waves
    waves.forEach((wave) => {
      const age = (currentTime - wave.startTime) / 1000;
      const currentRadius = age * options.speed;

      if (currentRadius > options.maxRadius) return;

      gridLines.forEach((line) => {
        const linePos = new THREE.Vector2(
          line.isVertical ? line.coordinate : 0,
          line.isVertical ? 0 : line.coordinate
        );

        const distanceToWave = linePos.distanceTo(wave.center);
        const waveWidth = 4;

        if (Math.abs(distanceToWave - currentRadius) < waveWidth) {
          const intensity = Math.max(0, 1 - currentRadius / options.maxRadius);
          const waveIntensity = Math.max(
            0,
            1 - Math.abs(distanceToWave - currentRadius) / waveWidth
          );
          const finalIntensity = intensity * waveIntensity;

          line.mesh.material.emissive.lerp(wave.color, finalIntensity);
          line.mesh.material.color.lerp(wave.color, finalIntensity * 0.5);
        }
      });
    });

    // Clean up finished waves
    setWaves((prev) =>
      prev.filter(
        (wave) =>
          ((currentTime - wave.startTime) / 1000) * options.speed <=
          options.maxRadius
      )
    );
  };

  // Return the functions that the manager needs
  return {
    updateLineWaves,
    spawnLineWave,
  };
}
