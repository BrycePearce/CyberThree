import { useRef, useEffect } from "react";
import * as THREE from "three";
import horizonFragmentShader from "./shaders/horizonFragmentShader.glsl";
import gridShader from "./shaders/gridShader.glsl";

// Constants
const HORIZON_LIGHT_WIDTH = 100;
const HORIZON_LIGHT_HEIGHT = 2;
const GRID_SIZE = 50;
const STEP = 1;
const PULSE_SPEED = 50;
const PULSE_CHANGE_DIRECTION_PROBABILITY = 0.03;

// Pulse Direction Enum
const Direction = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

// Pulse State Interface
interface PulseState {
  position: THREE.Vector2;
  direction: (typeof Direction)[keyof typeof Direction];
  isActive: boolean;
}

// Grid Intersection Interface
interface GridIntersection {
  position: THREE.Vector2;
  neighbors: THREE.Vector2[];
}

// Utility Functions

const createGridIntersections = () => {
  const intersections = new Map<string, GridIntersection>();

  for (let x = -GRID_SIZE; x <= GRID_SIZE; x += STEP) {
    for (let z = -GRID_SIZE; z <= GRID_SIZE; z += STEP) {
      const position = new THREE.Vector2(x, z);
      const key = `${x},${z}`;

      const neighbors: THREE.Vector2[] = [];
      if (x > -GRID_SIZE) neighbors.push(new THREE.Vector2(x - STEP, z));
      if (x < GRID_SIZE) neighbors.push(new THREE.Vector2(x + STEP, z));
      if (z > -GRID_SIZE) neighbors.push(new THREE.Vector2(x, z - STEP));
      if (z < GRID_SIZE) neighbors.push(new THREE.Vector2(x, z + STEP));

      intersections.set(key, { position, neighbors });
    }
  }
  return intersections;
};

const initializePulseState = (): PulseState => {
  const isHorizontal = Math.random() < 0.5;
  const pos = Math.floor(Math.random() * (GRID_SIZE * 2)) - GRID_SIZE;

  let position: THREE.Vector2;
  let direction: keyof typeof Direction;

  if (isHorizontal) {
    position = new THREE.Vector2(-GRID_SIZE, pos);
    direction = "RIGHT";
  } else {
    position = new THREE.Vector2(pos, GRID_SIZE); // CHANGED: Start from top
    direction = "DOWN"; // CHANGED: Move down instead of up
  }

  console.log("Initialized new pulse:", position, direction);

  return {
    position,
    direction,
    isActive: true,
  };
};

const createGridGeometry = () => {
  const positions = [];
  const lineIndices = [];
  let currentIndex = 0;

  for (let x = -GRID_SIZE; x <= GRID_SIZE; x += STEP) {
    positions.push(x, 0, -GRID_SIZE, x, 0, GRID_SIZE);
    lineIndices.push(currentIndex, currentIndex + 1);
    currentIndex += 2;
  }
  for (let z = -GRID_SIZE; z <= GRID_SIZE; z += STEP) {
    positions.push(-GRID_SIZE, 0, z, GRID_SIZE, 0, z);
    lineIndices.push(currentIndex, currentIndex + 1);
    currentIndex += 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3)
  );

  return { geometry, lineIndices, positions };
};

const createHorizonLight = (
  camera: THREE.PerspectiveCamera,
  gridRotation: number
) => {
  const geometry = new THREE.PlaneGeometry(
    HORIZON_LIGHT_WIDTH,
    HORIZON_LIGHT_HEIGHT
  );
  const material = new THREE.ShaderMaterial({
    uniforms: { u_time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: horizonFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const calculateHorizonPosition = () => {
    const t = Math.abs(-GRID_SIZE / (camera.position.z - -GRID_SIZE));
    const y = -camera.position.y * t * Math.sin(gridRotation);
    return { y, z: -GRID_SIZE + 5 };
  };

  const { y, z } = calculateHorizonPosition();
  const light = new THREE.Mesh(geometry, material);
  light.position.set(0, y - 8, z);
  light.rotation.x = gridRotation;

  return { light, material };
};

export function Welcome() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 1000);
    camera.position.set(0, 10, 30);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const pointLight = new THREE.PointLight(0xffffff, 1, 200);
    pointLight.position.set(20, 50, 20);
    scene.add(ambientLight, pointLight);

    const { geometry: gridGeometry } = createGridGeometry();
    const gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_gridSize: { value: GRID_SIZE },
        u_gridSpeed: { value: 0.05 },
        u_pulsePosition: { value: new THREE.Vector2() },
        u_pulseActive: { value: 1.0 },
        u_pulseIntensity: { value: 1.0 },
      },
      vertexShader: `
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  // Store the original position
  vPosition = position;
  
  // Create UV coordinates that account for the grid rotation
  // This will help us track position in the fragment shader
  vUv = vec2(position.x, position.z);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
      `,
      fragmentShader: gridShader,
      transparent: true,
    });

    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.rotation.x = (-Math.PI / 2) * 0.1;
    scene.add(grid);

    const { light: horizonLight, material: horizonMaterial } =
      createHorizonLight(camera, grid.rotation.x);
    scene.add(horizonLight);

    // Initialize pulse system
    let pulseState = initializePulseState();
    const gridIntersections = createGridIntersections();
    let lastUpdateTime = performance.now();

    const getValidNextDirections = (
      currentPos: THREE.Vector2,
      currentDir: keyof typeof Direction
    ): (keyof typeof Direction)[] => {
      // Fix key construction to match our coordinate system
      const key = `${Math.round(currentPos.x)},${Math.round(currentPos.y)}`;

      const intersection = gridIntersections.get(key);
      if (!intersection) {
        return [];
      }

      const oppositeDir = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      } as const;

      const validDirs = (
        Object.keys(Direction) as (keyof typeof Direction)[]
      ).filter(
        (dir) =>
          dir !== oppositeDir[currentDir] &&
          intersection.neighbors.some((neighbor) => {
            const valid = (() => {
              switch (dir) {
                case "UP":
                  return neighbor.y > currentPos.y;
                case "DOWN":
                  return neighbor.y < currentPos.y;
                case "LEFT":
                  return neighbor.x < currentPos.x;
                case "RIGHT":
                  return neighbor.x > currentPos.x;
                default:
                  return false;
              }
            })();
            return valid;
          })
      );

      return validDirs;
    };

    const updatePulsePosition = (deltaTime: number) => {
      if (!pulseState.isActive) return;

      const movement = deltaTime * PULSE_SPEED;
      const newPosition = pulseState.position.clone();

      // Store original position for logging
      const origX = newPosition.x;
      const origY = newPosition.y;

      switch (pulseState.direction) {
        case "UP":
          newPosition.y -= movement; // CHANGED: Inverted Y direction
          break;
        case "DOWN":
          newPosition.y += movement; // CHANGED: Inverted Y direction
          break;
        case "LEFT":
          newPosition.x -= movement;
          break;
        case "RIGHT":
          newPosition.x += movement;
          break;
      }

      // Check if we've reached an intersection
      const roundedX = Math.round(newPosition.x);
      const roundedY = Math.round(newPosition.y);

      // Using a smaller threshold for intersection detection
      if (
        Math.abs(roundedX - newPosition.x) < 0.05 &&
        Math.abs(roundedY - newPosition.y) < 0.05
      ) {
        // We're at an intersection, snap to grid first
        newPosition.set(roundedX, roundedY);

        const validDirections = getValidNextDirections(
          new THREE.Vector2(roundedX, roundedY),
          pulseState.direction as keyof typeof Direction
        );

        if (
          validDirections.length > 0 &&
          Math.random() < PULSE_CHANGE_DIRECTION_PROBABILITY
        ) {
          const randomIndex = Math.floor(
            Math.random() * validDirections.length
          );
          pulseState.direction = validDirections[randomIndex];
        }
      }

      // Check if we've reached the edge of the grid
      if (
        Math.abs(newPosition.x) > GRID_SIZE ||
        Math.abs(newPosition.y) > GRID_SIZE
      ) {
        pulseState = initializePulseState();
        return;
      }

      // Log movement
      console.log(
        `Movement: ${origX},${origY} -> ${newPosition.x},${newPosition.y} (${pulseState.direction})`
      );

      pulseState.position = newPosition;
    };

    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastUpdateTime) / 1000;
      lastUpdateTime = currentTime;

      requestAnimationFrame(animate);

      gridMaterial.uniforms.u_time.value += 0.01;
      horizonMaterial.uniforms.u_time.value += 0.01;

      updatePulsePosition(deltaTime);

      // Transform coordinates for shader
      const rotationX = (-Math.PI / 2) * 0.1;
      const pos = pulseState.position;

      // Invert Y coordinate for proper grid alignment
      gridMaterial.uniforms.u_pulsePosition.value.set(
        pos.x,
        -pos.y // CHANGED: Invert Y coordinate
      );
      gridMaterial.uniforms.u_pulseActive.value = pulseState.isActive
        ? 1.0
        : 0.0;

      renderer.render(scene, camera);
    };

    const handleResize = () => {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    handleResize();

    animate();

    return () => {
      resizeObserver.disconnect();
      gridGeometry.dispose();
      gridMaterial.dispose();
      horizonLight.geometry.dispose();
      horizonMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
