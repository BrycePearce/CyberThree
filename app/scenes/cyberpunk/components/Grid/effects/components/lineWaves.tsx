import * as THREE from "three";
import { useLineWaveEffect } from "../../hooks/useLineWaveEffect";
import type { GridLine } from "~/types/gridTypes";

interface LineWavesProps {
  gridLines: GridLine[];
  interval?: number;
  maxRadius?: number;
  speed?: number;
  color?: THREE.Color;
  maxWaves?: number;
}

export function LineWaves({
  gridLines,
  interval = 4000,
  maxRadius = 50,
  speed = 30,
  color = new THREE.Color(0x00ffff).multiplyScalar(2),
  maxWaves = 3,
}: LineWavesProps) {
  useLineWaveEffect(gridLines, {
    interval,
    maxRadius,
    speed,
    color,
    maxWaves,
  });

  return null;
}
