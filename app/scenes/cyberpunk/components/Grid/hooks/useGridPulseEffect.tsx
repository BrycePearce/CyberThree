import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";

export const useGridPulseEffect = (groupRef: RefObject<THREE.Group>) => {
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    groupRef.current?.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.baseColor) {
        const { baseColor, offset, emissiveBase } = obj.userData;
        const pulse = (Math.sin((time + offset) * 1) + 1) * 0.5;
        const brightnessFactor = 0.3 + pulse * 1;
        const emissiveFactor = 0.5 + pulse * 1.5;

        const newBaseColor = baseColor.clone().multiplyScalar(brightnessFactor);
        const newEmissive = emissiveBase.clone().multiplyScalar(emissiveFactor);

        (obj.material as THREE.MeshStandardMaterial).color = newBaseColor;
        (obj.material as THREE.MeshStandardMaterial).emissive = newEmissive;
      }
    });
  });

  return groupRef;
};
