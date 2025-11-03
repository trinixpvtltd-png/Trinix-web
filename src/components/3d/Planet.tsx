"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Mesh, Group, Vector3 } from "three";

type PlanetProps = {
  id: string;
  name: string;
  index: number;
  orbitRadius: number;
  orbitHeight?: number;
  color: string;
  cloudTint?: string;
  atmTint?: string;
  multiTint?: string[];
  size?: number;
  speed?: number;
  onClick?: (id: string, position: Vector3) => void;
  onHoverChange?: (id: string, hovered: boolean) => void;
  active?: boolean;
  focused?: boolean;
  hideLabel?: boolean;
};

export function Planet({
  id,
  name,
  index,
  orbitRadius,
  orbitHeight = 0,
  color,
  cloudTint,
  atmTint,
  multiTint,
  size = 0.7,
  speed = 1,
  onClick,
  onHoverChange,
  active = false,
  focused = false,
  hideLabel = false,
}: PlanetProps) {
  const groupRef = useRef<Group>(null!);
  const meshRef = useRef<Mesh>(null!);
  const labelRef = useRef<Group>(null!);
  const atmosRef = useRef<THREE.ShaderMaterial>(null!);
  const cloudsRef = useRef<THREE.ShaderMaterial>(null!);
  const [hovered, setHovered] = useState(false);

  const baseGeometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);
  useEffect(() => () => baseGeometry.dispose(), [baseGeometry]);

  const planetMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.3,
      roughness: 0.55,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.1,
    });

    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <dithering_fragment>`,
        `
          vec3 lightDir = normalize(vec3(0.4, 0.8, 0.6));
          float diff = max(dot(normalize(vNormal), lightDir), 0.0);
          diff = smoothstep(0.0, 1.0, diff);
          gl_FragColor.rgb *= clamp(0.55 + diff * 0.65, 0.55, 1.0);
          #include <dithering_fragment>
        `
      );
    };
    return mat;
  }, [color]);

  useEffect(() => () => planetMaterial.dispose(), [planetMaterial]);

  const initialPhase = useMemo(() => (index / 8) * Math.PI * 2, [index]);
  const angleRef = useRef<number>(initialPhase);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const speedMul = hovered ? 0 : 1;
    angleRef.current += delta * 0.2 * speed * speedMul;

    const angle = angleRef.current;
    const x = orbitRadius * Math.cos(angle);
    const z = orbitRadius * 0.7 * Math.sin(angle);
    groupRef.current.position.set(x, orbitHeight, z);
    groupRef.current.rotation.y = angle;

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.6;
      meshRef.current.rotation.x = 0.08 * Math.sin(t * 0.45);
      const breathe = 1 + 0.015 * Math.sin(t * 0.8 + index);
      let scaleMul = breathe;
      if (hovered) scaleMul *= 1.08;
      else if (active || focused) scaleMul *= 1.06;
      meshRef.current.scale.setScalar(scaleMul * size);
    }

    if (planetMaterial) {
      const baseEmissive = 0.12;
      const pulse = 0.08 * (0.5 + 0.5 * Math.sin(t * 1.2 + index));
      const extra = hovered ? 0.2 : active || focused ? 0.12 : 0;
      planetMaterial.emissiveIntensity = baseEmissive + pulse + extra;
    }

    if (cloudsRef.current) {
      (cloudsRef.current.uniforms as any).uTime.value = t;
    }

    if (labelRef.current) {
      const scale = THREE.MathUtils.clamp(0.6 + size * 0.6, 0.9, 3.2);
      labelRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core planet */}
      <mesh
        ref={meshRef}
        geometry={baseGeometry}
        material={planetMaterial}
        scale={size}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHoverChange?.(id, true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHoverChange?.(id, false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick && groupRef.current)
            onClick(id, groupRef.current.position.clone());
        }}
      />

      {/* Atmosphere */}
      <mesh scale={1.06 * size} raycast={() => null}>
        <primitive object={baseGeometry} attach="geometry" />
        <shaderMaterial
          ref={atmosRef}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.NormalBlending}
          uniforms={{
            uColor: { value: new THREE.Color(atmTint ?? color) },
          }}
          vertexShader={`
            varying vec3 vNormal;
            void main(){
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            uniform vec3 uColor;
            void main(){
              float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
              intensity = clamp(intensity, 0.0, 1.0);
              gl_FragColor = vec4(uColor * intensity * 1.6, intensity * 0.45);
            }
          `}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh scale={1.02 * size} raycast={() => null}>
        <primitive object={baseGeometry} attach="geometry" />
        <shaderMaterial
          ref={cloudsRef}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.NormalBlending}
          uniforms={{
            uTime: { value: 0 },
            uTint: { value: new THREE.Color(cloudTint ?? color) },
          }}
          vertexShader={`
            varying vec3 vPos;
            void main(){
              vPos = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vPos;
            uniform float uTime;
            uniform vec3 uTint;
            float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
            float noise(vec3 p){
              vec3 i = floor(p); vec3 f = fract(p);
              float n = mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                                mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                              mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                                  mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
              return n;
            }
            void main(){
              vec3 p = normalize(vPos) * 2.0;
              float n = noise(p * 2.5 + vec3(uTime*0.03, 0.0, -uTime*0.02));
              float clouds = smoothstep(0.52, 0.78, n);
              vec3 col = mix(vec3(0.0), uTint * 1.2, clouds);
              gl_FragColor = vec4(col, clouds * 0.35);
            }
          `}
        />
      </mesh>

      {/* Label */}
      {!hideLabel && (
        <group ref={labelRef} position={[0, 0, 0]} raycast={() => null}>
          <Html center transform style={{ pointerEvents: "none" }}>
            <div className="pointer-events-none select-none px-3.5 py-2 text-lg md:text-2xl font-bold text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.8)]">
              {name}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

