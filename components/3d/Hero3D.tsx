"use client";

import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import {
  ThreeErrorBoundary,
  isWebGLAvailable,
  usePrefersReducedMotion,
  useIsTabVisible,
} from "./CanvasWrapper";

// ── 3D Hourglass Mesh ───────────────────────────────────────

function HourglassMesh({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // Pillar positions in triangle layout around perimeter
  const pillarPositions = useMemo(() => {
    const radius = 1.0;
    return [0, 1, 2].map((i) => {
      const angle = (i * 2 * Math.PI) / 3;
      return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [
        number,
        number,
        number,
      ];
    });
  }, []);

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.95}>
      {/* Top Cap */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.12, 32]} />
        <meshStandardMaterial
          color="#8b5cf6"
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      {/* Bottom Cap */}
      <mesh position={[0, -1.35, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.12, 32]} />
        <meshStandardMaterial
          color="#22c55e"
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      {/* Support Pillars */}
      {pillarPositions.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <cylinderGeometry args={[0.04, 0.04, 2.6, 16]} />
          <meshStandardMaterial
            color="#a78bfa"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Waist Connector Ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.22, 0.06, 16, 32]} />
        <meshStandardMaterial
          color="#8b5cf6"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Top Glass Bulb (Cone pointing down) */}
      <mesh position={[0, 0.65, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1.0, 1.25, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          ior={1.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottom Glass Bulb (Cone pointing up) */}
      <mesh position={[0, -0.65, 0]}>
        <coneGeometry args={[1.0, 1.25, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.1}
          transmission={0.6}
          ior={1.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Upper Sand (Purple) */}
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.82, 0.8, 24]} />
        <meshStandardMaterial
          color="#8b5cf6"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Sand Stream (Emerald Green trickle) */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.9, 12]} />
        <meshStandardMaterial
          color="#22c55e"
          roughness={0.5}
          emissive="#22c55e"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Lower Sand Heap (Emerald Green mound) */}
      <mesh position={[0, -0.92, 0]}>
        <coneGeometry args={[0.78, 0.65, 24]} />
        <meshStandardMaterial
          color="#22c55e"
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// ── Floating Decorative Spheres ─────────────────────────────

function FloatingParticles({ reducedMotion }: { reducedMotion: boolean }) {
  const particles = useMemo(
    () => [
      { pos: [-2.2, 0.8, -0.5] as [number, number, number], size: 0.16, color: "#22c55e", speed: 1.6 },
      { pos: [2.0, -0.6, -0.3] as [number, number, number], size: 0.14, color: "#8b5cf6", speed: 1.4 },
      { pos: [-1.8, -1.0, 0.6] as [number, number, number], size: 0.1, color: "#a855f7", speed: 1.8 },
      { pos: [1.9, 1.1, 0.4] as [number, number, number], size: 0.18, color: "#10b981", speed: 1.3 },
      { pos: [0.3, 1.8, -1.0] as [number, number, number], size: 0.12, color: "#6366f1", speed: 2.0 },
      { pos: [-0.6, -1.7, -0.8] as [number, number, number], size: 0.13, color: "#4ade80", speed: 1.5 },
    ],
    []
  );

  return (
    <>
      {particles.map((p, i) => (
        <Float
          key={i}
          speed={reducedMotion ? 0 : p.speed}
          rotationIntensity={reducedMotion ? 0 : 0.4}
          floatIntensity={reducedMotion ? 0 : 0.8}
        >
          <mesh position={p.pos}>
            <sphereGeometry args={[p.size, 16, 16]} />
            <meshStandardMaterial
              color={p.color}
              roughness={0.3}
              metalness={0.4}
              emissive={p.color}
              emissiveIntensity={0.25}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// ── Scene Composition ───────────────────────────────────────

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 4]} intensity={1.3} color="#ffffff" />
      <pointLight position={[-3, 2, 2]} intensity={0.8} color="#c084fc" />
      <pointLight position={[3, -2, -2]} intensity={0.8} color="#4ade80" />

      <Float
        speed={reducedMotion ? 0 : 1.8}
        rotationIntensity={reducedMotion ? 0 : 0.3}
        floatIntensity={reducedMotion ? 0 : 0.9}
      >
        <HourglassMesh reducedMotion={reducedMotion} />
      </Float>

      <FloatingParticles reducedMotion={reducedMotion} />
    </>
  );
}

// ── Fallback 2D Banner ──────────────────────────────────────

function StaticHeroFallback() {
  return (
    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary-500/10 via-accent-500/10 to-primary-500/5 border border-primary-200/40 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-accent-400/15 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-primary-400/15 blur-2xl pointer-events-none" />
      <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-primary-100 flex items-center justify-center text-4xl select-none">
        ⏳
      </div>
    </div>
  );
}

// ── Exported Hero3D Component ───────────────────────────────

interface Hero3DProps {
  greeting: string;
  dateStr: string;
  onReset?: () => void;
}

export default function Hero3D({ greeting, dateStr, onReset }: Hero3DProps) {
  const [canRender3D, setCanRender3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const isVisible = useIsTabVisible();

  useEffect(() => {
    const checkWebGLAndScreen = () => {
      const webgl = isWebGLAvailable();
      const mobile = window.innerWidth < 480;
      setIsMobile(mobile);
      setCanRender3D(webgl && !mobile);
    };

    checkWebGLAndScreen();
    window.addEventListener("resize", checkWebGLAndScreen);
    return () => window.removeEventListener("resize", checkWebGLAndScreen);
  }, []);

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-br from-white via-primary-50/30 to-accent-50/40 border border-border/80 shadow-sm overflow-hidden h-[230px] sm:h-[260px]">
      {/* Soft background ambient glows */}
      <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full bg-accent-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />

      {/* HTML Content Overlay (Greeting + Subtitle + Action) */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-5 sm:p-7 pointer-events-none">
        <div className="max-w-md sm:max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-border/60 text-[11px] font-semibold text-accent-700 shadow-2xs mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            StudySaathi 3D Flow
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {greeting}! 👋
          </h1>
          <p className="text-muted text-xs sm:text-sm mt-1 font-medium leading-relaxed">
            {dateStr} • Keep momentum going with dedicated focus.
          </p>
        </div>

        {onReset && (
          <div className="pointer-events-auto">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-white/80 backdrop-blur-xs text-xs font-medium text-muted hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition-colors shadow-2xs"
              title="Reset all stats and tasks to 0"
            >
              Reset Data to 0
            </button>
          </div>
        )}
      </div>

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0 flex items-center justify-end pr-0 sm:pr-8 md:pr-14">
        {canRender3D ? (
          <ThreeErrorBoundary fallback={<StaticHeroFallback />}>
            <Suspense fallback={<StaticHeroFallback />}>
              <div className="w-[260px] sm:w-[320px] md:w-[360px] h-full pointer-events-auto">
                <Canvas
                  dpr={[1, 1.5]}
                  gl={{ antialias: true, powerPreference: "low-power" }}
                  camera={{ position: [0, 0, 4.2], fov: 42 }}
                  frameloop={isVisible ? "always" : "never"}
                >
                  <Scene reducedMotion={reducedMotion} />
                </Canvas>
              </div>
            </Suspense>
          </ThreeErrorBoundary>
        ) : (
          <div className="w-full h-full sm:w-[300px] flex items-center justify-end pr-6 opacity-60 pointer-events-none">
            <StaticHeroFallback />
          </div>
        )}
      </div>
    </div>
  );
}
