import { useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const FirstPersonControls = () => {
  const { camera } = useThree();
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    baseSpeed: 0.15,
    speedBoostActive: false,
    speedBoostMultiplier: 2.5,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.right = true;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.left = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.speedBoostActive = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.right = false;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.left = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          moveState.current.speedBoostActive = false;
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const {
      forward,
      backward,
      left,
      right,
      baseSpeed,
      speedBoostActive,
      speedBoostMultiplier,
    } = moveState.current;
    const currentSpeed = speedBoostActive
      ? baseSpeed * speedBoostMultiplier
      : baseSpeed;

    // Get the camera's forward direction (now including y component)
    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);
    forwardVector.normalize();

    // Calculate right vector
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(camera.up, forwardVector).normalize();

    // Apply movement
    if (forward) {
      camera.position.addScaledVector(forwardVector, currentSpeed);
    }
    if (backward) {
      camera.position.addScaledVector(forwardVector, -currentSpeed);
    }
    if (left) {
      camera.position.addScaledVector(rightVector, -currentSpeed);
    }
    if (right) {
      camera.position.addScaledVector(rightVector, currentSpeed);
    }
  });

  return <PointerLockControls />;
};

export default FirstPersonControls;
