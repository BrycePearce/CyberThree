import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GridLine, GridEffectsManagerOptions } from "~/types/gridTypes";

type EffectType = "lineWave" | "energyPulse" | "energyPulseV" | "ripple";

interface Effect {
  type: EffectType;
  active: boolean;
  intensity: number; // For fade in/out
  startTime: number;
  duration: number;
}

export function useGridEffectsManager(
  gridLines: GridLine[],
  options: GridEffectsManagerOptions = {}
) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);

  // Effect configurations
  // Store the last clicked position for ripple effect
  // Reference to ripple effect component
  const rippleRef = useRef<{ spawnRandomRipple: () => void } | null>(null);

  const effectConfigs = {
    lineWave: {
      duration: 4000,
      fadeInDuration: 500,
      fadeOutDuration: 500,
    },
    energyPulse: {
      duration: 3000,
      fadeInDuration: 300,
      fadeOutDuration: 300,
    },
    energyPulseV: {
      duration: 3500,
      fadeInDuration: 400,
      fadeOutDuration: 400,
    },
    ripple: {
      duration: 2000,
      fadeInDuration: 200,
      fadeOutDuration: 800,
    },
  };

  const triggerEffect = useCallback((type: EffectType) => {
    const config = effectConfigs[type];
    const currentTime = Date.now();

    setActiveEffects((prev) => [
      ...prev,
      {
        type,
        active: true,
        intensity: 0,
        startTime: currentTime,
        duration: config.duration,
      },
    ]);
  }, []);

  // Central update loop
  useFrame((state) => {
    const currentTime = Date.now();

    setActiveEffects((prev) =>
      prev
        .map((effect) => {
          const config = effectConfigs[effect.type];
          const elapsed = currentTime - effect.startTime;

          // Calculate intensity based on fade in/out
          let intensity = 1;
          if (elapsed < config.fadeInDuration) {
            intensity = elapsed / config.fadeInDuration;
          } else if (elapsed > effect.duration - config.fadeOutDuration) {
            intensity = (effect.duration - elapsed) / config.fadeOutDuration;
          }

          return {
            ...effect,
            intensity: Math.max(0, Math.min(1, intensity)),
            active: elapsed < effect.duration,
          };
        })
        .filter((effect) => effect.active)
    );
  });

  return {
    groupRef,
    activeEffects,
    triggerEffect,
  };
}
