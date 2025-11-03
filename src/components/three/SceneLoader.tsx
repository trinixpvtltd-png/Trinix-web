"use client";
import { Html, useProgress } from "@react-three/drei";

export function SceneLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center text-white font-semibold tracking-wide">
        <div className="text-2xl mb-2">Loading Universe…</div>
        <div className="text-lg opacity-80">{progress.toFixed(0)}%</div>
      </div>
    </Html>
  );
}
