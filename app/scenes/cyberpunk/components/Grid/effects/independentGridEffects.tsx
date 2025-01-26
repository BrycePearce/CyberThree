import { useState, useEffect, useRef } from "react";
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
  const [regularPulseTrigger, setRegularPulseTrigger] = useState(0);
  const [verticalPulseTrigger, setVerticalPulseTrigger] = useState(0);
  const [verticalPulses, setVerticalPulses] = useState(1);

  const isRegularActiveRef = useRef(false);
  const isVerticalActiveRef = useRef(false);

  const getRandomDelay = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  };

  const getRandomVerticalPulses = () => {
    return Math.floor(Math.random() * 8) + 1;
  };

  // Handle regular pulses (3-7 seconds)
  useEffect(() => {
    const triggerRegularPulse = () => {
      if (!isRegularActiveRef.current) {
        isRegularActiveRef.current = true;
        setRegularPulseTrigger((prev) => prev + 1);

        // Schedule next trigger
        setTimeout(() => {
          isRegularActiveRef.current = false;
          scheduleNext();
        }, 2000);
      }
    };

    const scheduleNext = () => {
      setTimeout(triggerRegularPulse, getRandomDelay(3, 7));
    };

    scheduleNext();
    return () => {
      isRegularActiveRef.current = false;
    };
  }, []);

  // Handle vertical pulses (10-20 seconds)
  useEffect(() => {
    const triggerVerticalPulse = () => {
      if (!isVerticalActiveRef.current) {
        isVerticalActiveRef.current = true;
        setVerticalPulses(getRandomVerticalPulses());
        setVerticalPulseTrigger((prev) => prev + 1);

        // Schedule next trigger
        setTimeout(() => {
          isVerticalActiveRef.current = false;
          scheduleNext();
        }, 3000);
      }
    };

    const scheduleNext = () => {
      setTimeout(triggerVerticalPulse, getRandomDelay(10, 20));
    };

    scheduleNext();
    return () => {
      isVerticalActiveRef.current = false;
    };
  }, []);

  return (
    <>
      <EnergyPulses
        gridLines={gridLines}
        maxPulses={1}
        pulseSpeed={800}
        trigger={regularPulseTrigger}
      />
      <EnergyPulsesV
        gridLines={gridLines}
        verticalPulses={verticalPulses}
        trigger={verticalPulseTrigger}
      />
    </>
  );
}
