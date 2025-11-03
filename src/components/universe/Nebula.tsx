"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Nebula() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh position={[0, 0, -100]}>
      <planeGeometry args={[420, 300]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uBase: { value: new THREE.Color("#060616") },
          uGlowA: { value: new THREE.Color("#6a62ff") },
          uGlowB: { value: new THREE.Color("#26a4ff") },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uBase;
          uniform vec3 uGlowA;
          uniform vec3 uGlowB;

          // lightweight animated noise
          float lno(vec2 p) {
            return 0.5 + 0.5 * sin(p.x) * cos(p.y);
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            uv.x *= 1.5;
            float t = uTime * 0.05;
            vec2 w = uv;
            w += 0.3 * vec2(sin(uv.y * 2.0 + t * 0.6), cos(uv.x * 2.0 - t * 0.8));

            float n1 = lno(w * 2.5 + t);
            float n2 = lno(w * 3.0 - t * 1.4);
            float neb = smoothstep(0.15, 0.9, n1 * 0.7 + n2 * 0.6);

            // soft vignette
            float vign = smoothstep(1.2, 0.25, length(uv));

            // richer tone & color blend
            vec3 glow = mix(uGlowA, uGlowB, neb);
            vec3 col = mix(uBase, glow, neb * 0.9);
            col *= vign;

            gl_FragColor = vec4(col, 0.55 * neb * vign);
          }
        `}
      />
    </mesh>
  );
}


