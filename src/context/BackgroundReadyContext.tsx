"use client";

import { createContext, useContext, useState } from "react";

type BackgroundReadyContextType = {
  ready: boolean;
  setReady: (v: boolean) => void;
};

const BackgroundReadyContext = createContext<BackgroundReadyContextType | null>(null);

export function BackgroundReadyProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  return (
    <BackgroundReadyContext.Provider value={{ ready, setReady }}>
      {children}
    </BackgroundReadyContext.Provider>
  );
}

export function useBackgroundReady() {
  const ctx = useContext(BackgroundReadyContext);
  if (!ctx) throw new Error("useBackgroundReady must be used within BackgroundReadyProvider");
  return ctx;
}
