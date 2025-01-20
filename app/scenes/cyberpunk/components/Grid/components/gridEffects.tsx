import * as THREE from "three";
import { useEffect, useState, useCallback, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { NeonPulse } from "../effects/components/neonPulse";
import { NeonRipple } from "../effects/components/neonRipple";
import type { EffectType, GridLine } from "~/types/gridTypes";
import { GridPulse } from "../effects/components/gridPulseEffect";

const EFFECTS_CONFIG = {
  gridPulse: {
    duration: 8000,
    cooldown: 4000,
    intensity: 1.5,
  },
  neonPulse: {
    duration: 3000,
    cooldown: 2000,
    intensity: 1,
  },
  neonRipple: {
    duration: 3000,
    cooldown: 2000,
    intensity: 1.7,
  },
} as const;

interface ActiveEffect {
  type: EffectType;
  startTime: number;
  intensity: number;
}

export function GridEffects({
  gridLines,
  effectInterval = 8000,
  bloomIntensity = 1.5,
}: {
  gridLines: GridLine[];
  effectInterval?: number;
  bloomIntensity?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  const lastEffectRef = useRef<EffectType | null>(null);
  const isPlayingRef = useRef(false);

  const triggerEffect = useCallback((type: EffectType) => {
    if (isPlayingRef.current) return;

    const now = Date.now();
    isPlayingRef.current = true;
    lastEffectRef.current = type;

    setActiveEffects((prev) => [
      ...prev,
      {
        type,
        startTime: now,
        intensity: 0,
      },
    ]);

    // Reset playing state after effect duration
    setTimeout(() => {
      isPlayingRef.current = false;
    }, EFFECTS_CONFIG[type].duration);
  }, []);

  // Handle effect lifecycle and intensity
  useFrame(() => {
    const currentTime = Date.now();

    setActiveEffects((prev) =>
      prev
        .map((effect) => {
          const config = EFFECTS_CONFIG[effect.type];
          const elapsed = currentTime - effect.startTime;

          // Calculate intensity with fade in/out
          let intensity = 1;
          const fadeTime = config.duration * 0.2;

          if (elapsed < fadeTime) {
            intensity = elapsed / fadeTime;
          } else if (elapsed > config.duration - fadeTime) {
            intensity = (config.duration - elapsed) / fadeTime;
          }

          return {
            ...effect,
            intensity: Math.max(0, Math.min(1, intensity)),
          };
        })
        .filter((effect) => {
          const config = EFFECTS_CONFIG[effect.type];
          return currentTime - effect.startTime < config.duration;
        })
    );
  });

  // Automatic effect triggering
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlayingRef.current) return;

      // Available effects with weights
      const weightedEffects: [EffectType, number][] = [
        ["gridPulse", 1],
        ["neonPulse", 2],
        ["neonRipple", 2],
      ];

      const totalWeight = weightedEffects.reduce(
        (sum, [_, weight]) => sum + weight,
        0
      );

      let random = Math.random() * totalWeight;
      let selectedEffect: EffectType = "gridPulse";

      for (const [effect, weight] of weightedEffects) {
        if (random <= weight) {
          selectedEffect = effect;
          break;
        }
        random -= weight;
      }

      // Don't play the same effect twice in a row
      if (selectedEffect === lastEffectRef.current) {
        selectedEffect =
          weightedEffects.find(([effect]) => effect !== selectedEffect)?.[0] ||
          "gridPulse";
      }

      console.log("selectedEffect", selectedEffect);

      triggerEffect(selectedEffect);
    }, effectInterval);

    return () => clearInterval(interval);
  }, [effectInterval, triggerEffect]);

  return (
    <group ref={groupRef}>
      {activeEffects.map((effect) => {
        const config = EFFECTS_CONFIG[effect.type];

        switch (effect.type) {
          case "gridPulse":
            return (
              <GridPulse
                key={`${effect.type}-${effect.startTime}`}
                gridLines={gridLines}
                intensity={effect.intensity * config.intensity}
                bloomStrength={bloomIntensity}
              />
            );
          case "neonPulse":
            return (
              <NeonPulse
                key={`${effect.type}-${effect.startTime}`}
                gridLines={gridLines}
                intensity={effect.intensity * config.intensity}
                bloomStrength={bloomIntensity * config.intensity}
              />
            );
          case "neonRipple":
            return (
              <NeonRipple
                key={`${effect.type}-${effect.startTime}`}
                gridLines={gridLines}
              />
            );
          default:
            return null;
        }
      })}
    </group>
  );
}
