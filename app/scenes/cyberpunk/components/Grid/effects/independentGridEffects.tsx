import { EnergyPulses } from "./components/energyPulses";
import { EnergyPulsesV } from "./components/energyPulsesV";
import type { GridLine } from "~/types/gridTypes";

interface IndependentGridEffectsProps {
  gridLines: GridLine[];
}

// grid effects that happen on the grid at anytime. Right now it's mostly just light pulses
export function IndependentGridEffects({
  gridLines,
}: IndependentGridEffectsProps) {
  return (
    <>
      {/* <EnergyPulses
        gridLines={gridLines}
        maxPulses={4}
        pulseSpeed={800}
        spawnRate={0.3} // Average spawns per second
        spawnJitter={0.5} // ±50% random variation in timing
      /> */}
      <EnergyPulsesV
        gridLines={gridLines}
        // spawnInterval={2000} // Spawn every 2 seconds
      />
    </>
  );
}
