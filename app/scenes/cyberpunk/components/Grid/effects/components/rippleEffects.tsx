import { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { GridLine } from "~/types/gridTypes";

interface RippleWave {
  position: THREE.Vector2;
  startTime: number;
  active: boolean;
}

interface RippleEffectProps {
  gridLines: GridLine[];
  color?: THREE.Color;
  speed?: number;
  maxRadius?: number;
  intensity?: number;
}

export interface RippleEffectRef {
  spawnRandomRipple: () => void;
}

export const RippleEffect = forwardRef<RippleEffectRef, RippleEffectProps>(
  (
    {
      gridLines,
      color = new THREE.Color(0x00ffff).multiplyScalar(3), // Bright cyan
      speed = 20,
      maxRadius = 40,
      intensity = 1,
    },
    ref
  ) => {
    const rippleRef = useRef<THREE.Group>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const activeRipplesRef = useRef<RippleWave[]>([]);

    // Create geometry for all grid lines
    const geometry = useMemo(() => {
      const positions: number[] = [];
      gridLines.forEach((line) => {
        if (line.isVertical) {
          positions.push(
            line.coordinate,
            0,
            line.start,
            line.coordinate,
            0,
            line.end
          );
        } else {
          positions.push(
            line.start,
            0,
            line.coordinate,
            line.end,
            0,
            line.coordinate
          );
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      return geo;
    }, [gridLines]);

    // Create material with custom shader
    const material = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          color: { value: color },
          rippleCenters: { value: [] },
          rippleTimes: { value: [] },
          numRipples: { value: 0 },
          time: { value: 0 },
          speed: { value: speed },
          maxRadius: { value: maxRadius },
          intensity: { value: intensity },
        },
        vertexShader: `
        varying vec3 vPosition;
        
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform vec3 color;
        uniform vec2 rippleCenters[10];
        uniform float rippleTimes[10];
        uniform int numRipples;
        uniform float time;
        uniform float speed;
        uniform float maxRadius;
        uniform float intensity;
        
        varying vec3 vPosition;
        
        void main() {
          float finalIntensity = 0.0;
          
          for(int i = 0; i < 10; i++) {
            if(i >= numRipples) break;
            
            vec2 rippleCenter = rippleCenters[i];
            float rippleTime = rippleTimes[i];
            float timeSinceStart = time - rippleTime;
            
            float dist = distance(vec2(vPosition.x, vPosition.z), rippleCenter);
            float radius = timeSinceStart * speed;
            
            if(radius > maxRadius) continue;
            
            float thickness = 2.0;
            float rippleIntensity = smoothstep(radius - thickness, radius, dist) * 
                                  smoothstep(radius + thickness, radius, dist);
            
            rippleIntensity *= 1.0 - (radius / maxRadius);
            float centerGlow = exp(-dist * 0.5) * exp(-timeSinceStart * 2.0) * 2.0;
            
            finalIntensity = max(finalIntensity, rippleIntensity + centerGlow);
          }
          
          finalIntensity *= intensity;
          gl_FragColor = vec4(color * finalIntensity, finalIntensity);
        }
      `,
        transparent: true,
        blending: THREE.AdditiveBlending,
      });
    }, [color, speed, maxRadius, intensity]);

    useFrame((state) => {
      if (!material || !rippleRef.current) return;

      const time = state.clock.getElapsedTime();
      material.uniforms.time.value = time;

      const rippleCenters: THREE.Vector2[] = [];
      const rippleTimes: number[] = [];
      let numActive = 0;

      activeRipplesRef.current = activeRipplesRef.current.filter((ripple) => {
        const age = time - ripple.startTime;
        const isActive = age * speed < maxRadius;

        if (isActive && numActive < 10) {
          rippleCenters.push(ripple.position);
          rippleTimes.push(ripple.startTime);
          numActive++;
          return true;
        }
        return false;
      });

      material.uniforms.rippleCenters.value = rippleCenters;
      material.uniforms.rippleTimes.value = rippleTimes;
      material.uniforms.numRipples.value = numActive;
    });

    // Function to spawn a new ripple
    const spawnRipple = (x: number, z: number) => {
      activeRipplesRef.current.push({
        position: new THREE.Vector2(x, z),
        startTime: performance.now() / 1000,
        active: true,
      });
    };

    // Create a random ripple position
    const spawnRandomRipple = () => {
      if (gridLines.length === 0) return;

      const line = gridLines[Math.floor(Math.random() * gridLines.length)];

      let x: number, z: number;
      if (line.isVertical) {
        x = line.coordinate;
        z = line.start + Math.random() * (line.end - line.start);
      } else {
        x = line.start + Math.random() * (line.end - line.start);
        z = line.coordinate;
      }

      spawnRipple(x, z);
    };

    // Expose the spawnRandomRipple function to the parent component
    useImperativeHandle(ref, () => ({
      spawnRandomRipple,
    }));

    return (
      <group ref={rippleRef}>
        <lineSegments geometry={geometry} material={material} ref={linesRef} />
      </group>
    );
  }
);
