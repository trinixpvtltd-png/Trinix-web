"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Dynamically import the real canvas — no SSR!
const CanvasStageInner = dynamic(() => import("./CanvasStageInner").then(m => m.CanvasStageInner), {
  ssr: false,
});

export function CanvasStage({ children }: { children: ReactNode }) {
  return <CanvasStageInner>{children}</CanvasStageInner>;
}

