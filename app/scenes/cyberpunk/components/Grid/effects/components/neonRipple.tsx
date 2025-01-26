import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Vector3, ShaderMaterial } from "three";
import type { GridLine, TubeData } from "~/types/gridTypes";

type NeonRippleProps = {
  gridLines: GridLine[];
  intensity?: number;
  bloomStrength?: number;
  duration?: number;
  color?: string;
  rippleSpeed?: number;
  ringWidth?: number;
};

// Shader that creates a circular ripple effect
// todo: use color util function for these
const rippleShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: new Color("#00ffff").multiplyScalar(3.0) }, // Much brighter cyan
    baseColor: { value: new Color() },
    ringRadius: { value: 0.0 },
    ringWidth: { value: 4.0 },
    center: { value: new Vector3() },
    intensity: { value: 2.0 }, // Increased base intensity
    bloomStrength: { value: 3.0 }, // Increased bloom
    emissiveBase: { value: new Color() },
    emissiveIntensity: { value: 1.0 },
  },
  // todo move shaders to their own directory
  vertexShader: `
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform vec3 baseColor;
    uniform vec3 emissiveBase;
    uniform float ringRadius;
    uniform float ringWidth;
    uniform vec3 center;
    uniform float intensity;
    uniform float bloomStrength;
    uniform float emissiveIntensity;
    uniform float time;
    
    varying vec3 vPosition;
    
    void main() {
      // Calculate distance from this fragment to the center
      float dist = length(vec2(vPosition.x - center.x, vPosition.z - center.z));
      
      // Calculate how close we are to the ring
      float ringDist = abs(dist - ringRadius);
      float ringIntensity = 1.0 - smoothstep(0.0, ringWidth, ringDist);
      
      // Add a slight pulse to the intensity
      float pulseIntensity = 1.0 + 0.2 * sin(time * 2.0);
      
      // Combine with the effect intensity
      float finalIntensity = ringIntensity * intensity * pulseIntensity;
      
      // Set the base color without any emissive
      gl_FragColor = vec4(baseColor, 1.0);
      
      // Only add the neon effect where the ring is
      if (finalIntensity > 0.01) {
        // Create an extra bright core for the neon effect
        vec3 neonColor = color * (bloomStrength + 2.0 * finalIntensity);
        
        // Add a slight color variation to make it more interesting
        neonColor += vec3(0.1, 0.2, 0.3) * sin(time * 3.0) * finalIntensity;
        
        // Mix between the base state and the neon color based on ring intensity
        vec3 finalColor = mix(baseColor, neonColor, finalIntensity);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    }
  `,
};

export function NeonRipple({
  gridLines,
  intensity = 1.0,
  bloomStrength = 8,
  duration = 4000,
  color = "#00e5ff",
  rippleSpeed = 80,
  ringWidth = 4,
}: NeonRippleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const rippleCenter = useRef(new Vector3(0, 0, 0));
  const originalMaterials = useRef<THREE.MeshStandardMaterial[]>([]);
  const shaderMaterials = useRef<ShaderMaterial[]>([]);

  // Setup effect
  useMemo(() => {
    // Store original materials and create shader materials
    gridLines.forEach((line, index) => {
      if (!line?.mesh?.material) {
        console.warn(`Grid line ${index} missing mesh or material`);
        return;
      }

      originalMaterials.current[index] = line.mesh.material;
      const userData = line.mesh.userData as TubeData;

      if (!userData?.baseColor || !userData?.emissiveBase) {
        console.warn(
          `Grid line ${index} missing required userData properties baseColor or emissiveBase`
        );
        return;
      }

      const shaderMaterial = new ShaderMaterial({
        uniforms: {
          ...rippleShader.uniforms,
          baseColor: { value: userData.baseColor.clone() },
          emissiveBase: { value: userData.emissiveBase.clone() },
          color: { value: new Color(color) },
          center: { value: new Vector3() },
          ringRadius: { value: 0.0 },
          ringWidth: { value: ringWidth },
          intensity: { value: intensity },
          bloomStrength: { value: bloomStrength },
          emissiveIntensity: { value: 1.0 },
          time: { value: 0.0 },
        },
        vertexShader: rippleShader.vertexShader,
        fragmentShader: rippleShader.fragmentShader,
      });

      shaderMaterials.current[index] = shaderMaterial;
    });

    // Find grid center
    const bounds = gridLines.reduce(
      (acc, line) => {
        if (line.isVertical) {
          acc.minX = Math.min(acc.minX, line.coordinate);
          acc.maxX = Math.max(acc.maxX, line.coordinate);
          acc.minZ = Math.min(acc.minZ, line.start);
          acc.maxZ = Math.max(acc.maxZ, line.end);
        } else {
          acc.minX = Math.min(acc.minX, line.start);
          acc.maxX = Math.max(acc.maxX, line.end);
          acc.minZ = Math.min(acc.minZ, line.coordinate);
          acc.maxZ = Math.max(acc.maxZ, line.coordinate);
        }
        return acc;
      },
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
    );

    rippleCenter.current.set(
      (bounds.minX + bounds.maxX) * 0.5,
      0,
      (bounds.minZ + bounds.maxZ) * 0.5
    );

    // Apply shader materials
    gridLines.forEach((line, index) => {
      const shader = shaderMaterials.current[index];
      shader.uniforms.center.value.copy(rippleCenter.current);
      line.mesh.material = shader as any; // bleh
    });
  }, [gridLines, color, intensity, bloomStrength, ringWidth]);

  // Animation loop
  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = Math.min(elapsed / duration, 1);

    // Calculate current ripple radius
    const currentRadius = (elapsed * rippleSpeed) / 1000;
    const timeBasedFade = Math.max(0, 1 - progress * 1.2);

    // Update all shader uniforms
    shaderMaterials.current.forEach((material) => {
      material.uniforms.ringRadius.value = currentRadius;
      material.uniforms.intensity.value = intensity * timeBasedFade;
      material.uniforms.time.value = elapsed / 1000;
    });

    // Restore original materials when complete
    if (progress === 1) {
      gridLines.forEach((line, index) => {
        line.mesh.material = originalMaterials.current[index];
      });
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      gridLines.forEach((line, index) => {
        line.mesh.material = originalMaterials.current[index];
      });
      shaderMaterials.current.forEach((material) => material.dispose());
    };
  }, [gridLines]);

  return <group ref={groupRef} />;
}
