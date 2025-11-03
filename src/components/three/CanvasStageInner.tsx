"use client";

import { ReactNode, Suspense, useMemo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { PostFX } from "@/components/three/PostFX";
import { SceneLoader } from "./SceneLoader";
import { Preload } from "@react-three/drei";

export function CanvasStageInner({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    THREE.Cache.enabled = true;
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const dpr = useMemo<[number, number]>(() => {
    if (typeof window === "undefined") return [1, 1];
    const ratio = window.devicePixelRatio || 1;
    return ratio <= 2 ? [1, 1] : [1, 1.5];
  }, []);

  return (
    <div
      className={`fixed inset-0 -z-10 transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        dpr={dpr}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [0, 0, 8], fov: 50 }}
        shadows
        onCreated={({ gl, camera }) => {
          const dummyGeo = new THREE.SphereGeometry(1, 16, 16);
          const dummyMat = new THREE.MeshStandardMaterial({ color: "#ffffff" });
          const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
          const tempScene = new THREE.Scene();
          tempScene.add(dummyMesh);
          gl.compile(tempScene, camera);
          dummyGeo.dispose();
          dummyMat.dispose();
        }}
      >
        <color attach="background" args={["#040409"]} />
        <fog attach="fog" args={["#040409", 12, 30]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <Suspense fallback={<SceneLoader />}>
          {children}
          <Preload all />
        </Suspense>
        <PostFX />
      </Canvas>
    </div>
  );
}
