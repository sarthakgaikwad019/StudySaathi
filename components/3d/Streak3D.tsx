"use client";

import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Flame } from "lucide-react";
import {
  ThreeErrorBoundary,
  isWebGLAvailable,
  usePrefersReducedMotion,
  useIsTabVisible,
} from "./CanvasWrapper";

interface FlameMeshProps {
  streak: number;
  reducedMotion: boolean;
}

function FlameMesh({ streak, reducedMotion }: FlameMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flameOuterRef = useRef<THREE.Mesh>(null);

  // Dynamic scale: base 0.9, increases up to 1.35 max
  const computedScale = Math.min(0.85 + Math.min(Math.max(streak, 0), 15) * 0.035, 1.35);

  useFrame((state, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 1.2;

      // Subtle dynamic flame flicker scale
      if (flameOuterRef.current) {
        const time = state.clock.getElapsedTime();
        const flicker = 1 + Math.sin(time * 6) * 0.04;
        flameOuterRef.current.scale.set(1, flicker, 1);
      }
    }
  });

  return (
    <group ref={groupRef} scale={computedScale} position={[0, -0.15, 0]}>
      {/* Outer Flame (Orange) */}
      <mesh ref={flameOuterRef} position={[0, 0.45, 0]}>
        <coneGeometry args={[0.55, 1.15, 24]} />
        <meshStandardMaterial
          color="#f97316"
          roughness={0.2}
          emissive="#ea580c"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Mid Flame (Amber Gold) */}
      <mesh position={[0, 0.38, 0.04]}>
        <coneGeometry args={[0.38, 0.85, 20]} />
        <meshStandardMaterial
          color="#fbbf24"
          roughness={0.2}
          emissive="#d97706"
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* Core Flame (Bright Yellow) */}
      <mesh position={[0, 0.28, 0.08]}>
        <coneGeometry args={[0.22, 0.55, 16]} />
        <meshStandardMaterial
          color="#fef08a"
          roughness={0.1}
          emissive="#fde047"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Glowing Ember Base */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.1, 20]} />
        <meshStandardMaterial
          color="#c2410c"
          roughness={0.3}
          metalness={0.6}
          emissive="#ea580c"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

function FlameScene({ streak, reducedMotion }: FlameMeshProps) {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[2, 3, 2]} intensity={1.5} color="#fffbeb" />
      <pointLight position={[0, 0.5, 1.5]} intensity={1.2} color="#f97316" />
      <FlameMesh streak={streak} reducedMotion={reducedMotion} />
    </>
  );
}

function FallbackFlame() {
  return (
    <div className="w-full h-full flex items-center justify-center text-amber-500">
      <Flame className="w-6 h-6 animate-pulse" />
    </div>
  );
}

export default function Streak3D({ streak }: { streak: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const isVisible = useIsTabVisible();
  const canRender = isWebGLAvailable();

  if (!canRender) {
    return <FallbackFlame />;
  }

  return (
    <div className="w-12 h-12 relative flex items-center justify-center">
      <ThreeErrorBoundary fallback={<FallbackFlame />}>
        <Suspense fallback={<FallbackFlame />}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: "low-power", alpha: true }}
            camera={{ position: [0, 0.2, 2.8], fov: 40 }}
            frameloop={isVisible ? "always" : "never"}
          >
            <FlameScene streak={streak} reducedMotion={reducedMotion} />
          </Canvas>
        </Suspense>
      </ThreeErrorBoundary>
    </div>
  );
}
