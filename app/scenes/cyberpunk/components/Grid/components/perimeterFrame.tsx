import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { getCyberpunkColor } from "../../utils/colors";

interface PerimeterFrameProps {
  gridWidth: number;
  gridDepth: number;
}

interface GlitchState {
  frameIndex: number;
  startTime: number;
  duration: number;
  originalMaterials: THREE.MeshStandardMaterial[];
  meshes: THREE.Mesh[];
  glitchLines: number;
}

export function PerimeterFrame({ gridWidth, gridDepth }: PerimeterFrameProps) {
  const lastGlitchTime = useRef(Date.now());
  const glitchStateRef = useRef<GlitchState | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const frameGroupRef = useRef<THREE.Group | null>(null);

  const frameGroup = useMemo(() => {
    const perimeterGroup = new THREE.Group();

    function createSingleTubeEdge(
      start: THREE.Vector3,
      end: THREE.Vector3,
      fraction: number,
      scale: number,
      layerIndex: number
    ) {
      const curve = new THREE.LineCurve3(start, end);

      const baseEdgeColor = getCyberpunkColor(fraction);
      const whiteBlend = 0.2;
      const finalColor = baseEdgeColor
        .clone()
        .lerp(new THREE.Color("#ffffff"), whiteBlend);

      const geometry = new THREE.TubeGeometry(
        curve,
        12,
        0.25 * scale * (1 + layerIndex * 0.15),
        24,
        false
      );

      const material = new THREE.MeshStandardMaterial({
        color: finalColor,
        emissive: finalColor,
        emissiveIntensity: 4.0 - layerIndex * 0.5,
        metalness: 0.3,
        roughness: 0.2,
        toneMapped: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.originalColor = finalColor.clone();
      mesh.userData.originalEmissive = finalColor.clone();
      mesh.userData.originalEmissiveIntensity = 4.0 - layerIndex * 0.5;

      return mesh;
    }

    function createFrame(scale: number, yOffset: number, layerIndex: number) {
      const frameGroup = new THREE.Group();
      frameGroup.userData.layerIndex = layerIndex;

      const width = gridWidth * scale;
      const depth = gridDepth * scale;
      const y = yOffset;

      type EdgeData = [THREE.Vector3, THREE.Vector3, number];
      const edges: EdgeData[] = [
        [
          new THREE.Vector3(-width / 2, y, depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          1.0,
        ],
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, -depth / 2),
          0.0,
        ],
        [
          new THREE.Vector3(-width / 2, y, -depth / 2),
          new THREE.Vector3(-width / 2, y, depth / 2),
          0.35,
        ],
        [
          new THREE.Vector3(width / 2, y, -depth / 2),
          new THREE.Vector3(width / 2, y, depth / 2),
          0.65,
        ],
      ];

      edges.forEach(([start, end, fraction]) => {
        const tube = createSingleTubeEdge(
          start,
          end,
          fraction,
          scale,
          layerIndex
        );
        frameGroup.add(tube);
      });

      return frameGroup;
    }

    const frameConfigs = [
      { scale: 1.0, yOffset: 0.3, layerIndex: 0 },
      { scale: 1.1, yOffset: 0.4, layerIndex: 1 },
      { scale: 1.2, yOffset: 0.5, layerIndex: 2 },
      { scale: 1.3, yOffset: 0.6, layerIndex: 3 },
      { scale: 1.4, yOffset: 0.7, layerIndex: 4 },
      { scale: 1.5, yOffset: 0.8, layerIndex: 5 },
      { scale: 1.6, yOffset: 0.9, layerIndex: 6 },
      { scale: 1.7, yOffset: 1.0, layerIndex: 7 },
      { scale: 1.8, yOffset: 1.1, layerIndex: 8 },
    ];

    frameConfigs.forEach(({ scale, yOffset, layerIndex }) => {
      const frame = createFrame(scale, yOffset, layerIndex);
      perimeterGroup.add(frame);
    });

    return perimeterGroup;
  }, [gridWidth, gridDepth]);

  // Store the frame group reference after creation
  useEffect(() => {
    frameGroupRef.current = frameGroup;
  }, [frameGroup]);

  const startGlitchEffect = () => {
    if (!frameGroupRef.current) return;

    // Pick a random frame
    const frameIndex = Math.floor(
      Math.random() * frameGroupRef.current.children.length
    );
    const frame = frameGroupRef.current.children[frameIndex];

    const meshes: THREE.Mesh[] = [];
    frame.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    // Store original materials
    const originalMaterials = meshes.map((mesh) =>
      (mesh.material as THREE.MeshStandardMaterial).clone()
    );

    glitchStateRef.current = {
      frameIndex,
      startTime: Date.now(),
      duration: 600 + Math.random() * 800, // 0.6-1.4 seconds
      originalMaterials,
      meshes,
      glitchLines: 2 + Math.floor(Math.random() * 3), // 2-4 scan lines
    };
  };

  useFrame(() => {
    const currentTime = Date.now();

    // Check to start new glitch
    if (
      !glitchStateRef.current &&
      currentTime - lastGlitchTime.current > 8000
    ) {
      startGlitchEffect();
      lastGlitchTime.current = currentTime;
    }

    // Update active glitch
    if (glitchStateRef.current) {
      const { startTime, duration, meshes, originalMaterials, glitchLines } =
        glitchStateRef.current;
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        // Reset to original state
        meshes.forEach((mesh, index) => {
          const material = mesh.material as THREE.MeshStandardMaterial;
          const originalMaterial = originalMaterials[index];

          material.opacity = 1;
          material.transparent = false;
          material.emissiveIntensity = originalMaterial.emissiveIntensity;
        });
        glitchStateRef.current = null;
      } else {
        // Apply digital glitch effects
        meshes.forEach((mesh) => {
          const material = mesh.material as THREE.MeshStandardMaterial;
          const originalIntensity =
            mesh.userData.originalEmissiveIntensity || 4.0;

          // Create scan line effect
          const scanLineHeight = 0.2;
          const totalScanHeight = glitchLines * scanLineHeight;
          const scanSpeed = duration * 0.001;

          // Calculate scan line positions
          const scanY =
            ((progress * scanSpeed) % (1 + totalScanHeight)) - totalScanHeight;

          // Check if this mesh is in the scan line zone
          const meshY = mesh.position.y;
          const distanceToScanLine = Math.min(
            ...Array.from({ length: glitchLines }, (_, i) =>
              Math.abs(meshY - (scanY + i * scanLineHeight))
            )
          );

          if (distanceToScanLine < scanLineHeight) {
            // In scan line - apply effects
            const scanIntensity = 1 - distanceToScanLine / scanLineHeight;

            // Emission intensity pulse
            const pulseFreq = currentTime * 0.01;
            const pulseMagnitude = Math.sin(pulseFreq) * 0.3 + 0.7;
            material.emissiveIntensity =
              originalIntensity * (1 + scanIntensity * pulseMagnitude);

            // Subtle transparency effect
            material.transparent = true;
            material.opacity = 0.85 + Math.sin(pulseFreq * 2) * 0.15;

            // Very subtle chromatic aberration effect
            const aberrationAmount = 0.05 * scanIntensity;
            const originalColor = mesh.userData.originalEmissive;
            if (originalColor) {
              material.emissive.copy(originalColor);
              material.emissive.r += aberrationAmount;
              material.emissive.b -= aberrationAmount;
            }
          } else {
            // Outside scan line - normal state
            material.emissiveIntensity = originalIntensity;
            material.opacity = 1;
            material.transparent = false;
            if (mesh.userData.originalEmissive) {
              material.emissive.copy(mesh.userData.originalEmissive);
            }
          }
        });
      }
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (glitchStateRef.current) {
        const { meshes, originalMaterials } = glitchStateRef.current;
        meshes.forEach((mesh, index) => {
          mesh.material = originalMaterials[index];
        });
      }
    };
  }, []);

  return <primitive ref={groupRef} object={frameGroup} />;
}
