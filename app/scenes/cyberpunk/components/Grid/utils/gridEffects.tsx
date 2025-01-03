import * as THREE from "three";

type EffectParams = {
  time: number;
  baseColor: THREE.Color;
  emissiveBase: THREE.Color;
  position: THREE.Vector3;
  offset: number;
};

type Effect = {
  id: string;
  duration: number;
  cooldown: number;
  compute: (params: EffectParams) => {
    brightnessFactor: number;
    emissiveFactor: number;
  };
};

// Effect definitions with adjusted timings and intensities
const effects: Effect[] = [
  {
    id: "sinewave",
    duration: 6,
    cooldown: 3,
    compute: ({ time, position, offset }) => {
      const wave = Math.sin(position.z * 0.1 + time * 2) * 0.5 + 0.5;
      const intensity = wave * 0.8;
      return {
        brightnessFactor: 0.2 + intensity,
        emissiveFactor: 0.1 + intensity * 2.5,
      };
    },
  },
  {
    id: "ripple",
    duration: 4,
    cooldown: 3,
    compute: ({ time, position }) => {
      const distanceFromCenter = Math.sqrt(
        position.x * position.x + position.z * position.z
      );
      const speed = 2; // Adjust speed of ripple
      const wave = Math.sin(distanceFromCenter * 0.1 - time * speed);
      const normalizedWave = (wave + 1) * 0.5; // Normalize to 0-1
      const falloff = Math.max(0, 1 - distanceFromCenter * 0.002);
      const intensity = normalizedWave * falloff;

      return {
        brightnessFactor: 0.2 + intensity * 1.2,
        emissiveFactor: 0.1 + intensity * 3.0,
      };
    },
  },
  {
    id: "pulse",
    duration: 3,
    cooldown: 3,
    compute: ({ time, position, offset }) => {
      const localTime = time % 3; // Reset every 3 seconds
      const pulseWave = Math.exp(-localTime * 2); // Sharper falloff
      const intensity = pulseWave;

      return {
        brightnessFactor: 0.2 + intensity * 1.0,
        emissiveFactor: 0.1 + intensity * 3.0,
      };
    },
  },
];

class EffectManager {
  private currentEffect: Effect | null = null;
  private effectStartTime: number = 0;
  private lastEffectId: string | null = null;
  private nextEffectTime: number = 0;

  constructor() {
    this.pickNewEffect(0);
  }

  private pickNewEffect(time: number) {
    // Only pick effects different from the last one
    const availableEffects = effects.filter(
      (effect) => effect.id !== this.lastEffectId
    );

    if (availableEffects.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableEffects.length);
      this.currentEffect = availableEffects[randomIndex];
      this.effectStartTime = time;
      this.lastEffectId = this.currentEffect.id;
      this.nextEffectTime =
        time + this.currentEffect.duration + this.currentEffect.cooldown;

      console.log("Switching to effect:", this.currentEffect.id); // Debug log
    }
  }

  computeEffect(params: EffectParams) {
    const { time } = params;

    // Time to switch effects?
    if (!this.currentEffect || time >= this.nextEffectTime) {
      this.pickNewEffect(time);
    }

    // During cooldown period
    if (
      this.currentEffect &&
      time >= this.effectStartTime + this.currentEffect.duration
    ) {
      return {
        brightnessFactor: 0.2,
        emissiveFactor: 0.1,
      };
    }

    // During active effect
    if (this.currentEffect) {
      return this.currentEffect.compute(params);
    }

    // Default state
    return {
      brightnessFactor: 0.2,
      emissiveFactor: 0.1,
    };
  }

  getCurrentEffectId() {
    return this.currentEffect?.id || null;
  }
}

export { EffectManager, type Effect, type EffectParams };
