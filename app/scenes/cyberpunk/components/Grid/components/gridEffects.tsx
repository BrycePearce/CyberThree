import { useEffect } from "react";
import { LineWaves } from "../effects/components/lineWaves";
import { useGridEffectsManager } from "../hooks/useGridEffectsManager";
import type { EffectType, GridLine } from "~/types/gridTypes";

export function GridEffects({ gridLines }: { gridLines: GridLine[] }) {
  const { groupRef, activeEffects, triggerEffect } = useGridEffectsManager(
    gridLines,
    {
      lineWaveInterval: 4000,
      maxRadius: 50,
      speed: 30,
      maxWaves: 3,
    }
  );

  // Automatic effect triggering
  useEffect(() => {
    const interval = setInterval(() => {
      const effects: EffectType[] = [
        "lineWave",
        "energyPulse",
        "energyPulseV",
        "ripple",
      ];
      const randomEffect = effects[Math.floor(Math.random() * effects.length)];

      // Always trigger the effect through the manager
      triggerEffect(randomEffect);
    }, 5000);

    return () => clearInterval(interval);
  }, [triggerEffect]); // Add triggerEffect to dependencies

  return (
    <group ref={groupRef}>
      {activeEffects.map((effect) => {
        switch (effect.type) {
          case "lineWave":
            return (
              <LineWaves
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
