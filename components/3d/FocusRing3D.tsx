"use client";

import React, { useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ThreeErrorBoundary,
  isWebGLAvailable,
  usePrefersReducedMotion,
  useIsTabVisible,
} from "./CanvasWrapper";

interface FocusRing3DProps {
  progress: number; // 1 -> 0 as time elapses
  isRunning: boolean;
  isComplete: boolean;
  children?: React.ReactNode;
}

// ── 2D SVG Fallback Ring ────────────────────────────────────

function SVGRingFallback({ progress }: { progress: number }) {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * progress;

  return (
    <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 280 280">
      <circle
        cx="140"
        cy="140"
        r={radius}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth="8"
      />
      <circle
        cx="140"
        cy="140"
        r={radius}
        fill="none"
        stroke="url(#fallbackTimerGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className="transition-[stroke-dashoffset] duration-300 ease-linear"
      />
      <defs>
        <linearGradient id="fallbackTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── 3D Ring Mesh ────────────────────────────────────────────

function RingMesh({
  progress,
  isRunning,
  isComplete,
  reducedMotion,
}: {
  progress: number;
  isRunning: boolean;
  isComplete: boolean;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const activeTorusRef = useRef<THREE.Mesh>(null);

  // Fraction completed: 0 at start, 1 when timer finishes
  const fractionCompleted = Math.max(0.001, Math.min(1, 1 - progress));
  const arcLength = fractionCompleted * Math.PI * 2;

  // Color transitions from vibrant purple (#8b5cf6) to emerald green (#22c55e)
  const ringColor = useMemo(() => {
    const c1 = new THREE.Color("#8b5cf6");
    const c2 = new THREE.Color("#22c55e");
    return c1.lerp(c2, fractionCompleted);
  }, [fractionCompleted]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isComplete && !reducedMotion) {
      // Pulse animation on completion
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 6) * 0.05;
      groupRef.current.scale.set(pulse, pulse, pulse);
    } else if (isRunning && !reducedMotion) {
      // Slow breathing oscillation while focusing
      const subtleBreath = 1 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.015;
      groupRef.current.scale.set(subtleBreath, subtleBreath, subtleBreath);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Background Track Torus */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.45, 0.06, 20, 64]} />
        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Dynamic Active Progress Torus (starts at 12 o'clock, rotates clockwise) */}
      <mesh
        ref={activeTorusRef}
        rotation={[0, 0, Math.PI / 2]}
        scale={[-1, 1, 1]} // flip to make arc advance clockwise
      >
        <torusGeometry
          key={arcLength.toFixed(3)}
          args={[1.45, 0.09, 24, 80, arcLength]}
        />
        <meshStandardMaterial
          color={ringColor}
          roughness={0.2}
          metalness={0.4}
          emissive={ringColor}
          emissiveIntensity={isComplete ? 0.6 : 0.25}
        />
      </mesh>

      {/* Decorative Accent Node at the Head of the Arc */}
      {fractionCompleted > 0.02 && (
        <mesh
          position={[
            Math.sin(fractionCompleted * Math.PI * 2) * 1.45,
            Math.cos(fractionCompleted * Math.PI * 2) * 1.45,
            0,
          ]}
        >
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={0.8}
            roughness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

function RingScene({
  progress,
  isRunning,
  isComplete,
  reducedMotion,
}: {
  progress: number;
  isRunning: boolean;
  isComplete: boolean;
  reducedMotion: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 3]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-2, -2, 2]} intensity={0.8} color="#8b5cf6" />
      <pointLight position={[2, 2, 2]} intensity={0.8} color="#22c55e" />
      <RingMesh
        progress={progress}
        isRunning={isRunning}
        isComplete={isComplete}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export default function FocusRing3D({
  progress,
  isRunning,
  isComplete,
  children,
}: FocusRing3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const isVisible = useIsTabVisible();
  const canRender = isWebGLAvailable();

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center select-none">
      {canRender ? (
        <ThreeErrorBoundary fallback={<SVGRingFallback progress={progress} />}>
          <Suspense fallback={<SVGRingFallback progress={progress} />}>
            <div className="w-full h-full absolute inset-0">
              <Canvas
                dpr={[1, 1.5]}
                gl={{
                  antialias: true,
                  powerPreference: "low-power",
                  alpha: true,
                }}
                camera={{ position: [0, 0, 3.8], fov: 46 }}
                frameloop={isVisible ? "always" : "never"}
              >
                <RingScene
                  progress={progress}
                  isRunning={isRunning}
                  isComplete={isComplete}
                  reducedMotion={reducedMotion}
                />
              </Canvas>
            </div>
          </Suspense>
        </ThreeErrorBoundary>
      ) : (
        <SVGRingFallback progress={progress} />
      )}

      {/* Centered HTML content (time, labels) */}
      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
        {children}
      </div>
    </div>
  );
}
