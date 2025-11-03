"use client";

import { Environment, Lightformer } from "@react-three/drei";

export function VisualEnvironment() {
  return (
    <Environment resolution={256} background={false} frames={1}>
      <Lightformer
        intensity={1.3}
        color="#6aa8ff"
        form="ring"
        scale={[70, 70, 1]}
        position={[0, 0, -70]}
      />

     
      <Lightformer
        intensity={1.0}
        color="#a26bff"
        form="circle"
        scale={18}
        position={[26, 8, 28]}
      />

      <Lightformer
        intensity={0.9}
        color="#6bd4ff"
        form="circle"
        scale={12}
        position={[-24, -4, 20]}
      />

      <Lightformer
        intensity={0.3}
        color="#f2b86b"
        form="ring"
        scale={[40, 40, 1]}
        position={[0, 0, 40]}
      />
    </Environment>
  );
}

