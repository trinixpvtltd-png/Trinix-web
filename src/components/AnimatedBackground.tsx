"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef} from "react";
import { motion } from "framer-motion";
import type { Points as PointsType } from "three";
import { useBackgroundReady } from "@/context/BackgroundReadyContext";

function StellarParticles() {
  const ref = useRef<PointsType>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(3000 * 3);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = (Math.random() - 0.5) * 20;
      arr[i + 1] = (Math.random() - 0.5) * 12;
      arr[i + 2] = (Math.random() - 0.5) * 15;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.015;
      ref.current.rotation.x = Math.sin(t * 0.1) * 0.08;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#3df5f2"
        size={0.04}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

export function AnimatedBackground() {
  const { ready, setReady } = useBackgroundReady();
  

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-[#0a0a0a]">
      {!ready && <div className="absolute inset-0 bg-[#0a0a0a]" />}

      <Canvas
        camera={{ position: [0, 0, 6], fov: 65 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#0a0a0a");
          setReady(true);
        }}
      >
        <ambientLight intensity={0.06} />
        <StellarParticles />
      </Canvas>

      {ready && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 bg-cosmic-gradient mix-blend-screen"
        />
      )}
    </div>
  );
}