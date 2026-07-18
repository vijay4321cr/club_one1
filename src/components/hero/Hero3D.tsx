"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

const PARTICLE_COUNT = 1400;
const PARTICLE_POSITIONS = (() => {
  const arr = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 12;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 8;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  return arr;
})();

function Particles() {
  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.03 + pointer.x * 0.12;
    ref.current.rotation.x = pointer.y * 0.06;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[PARTICLE_POSITIONS, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#ff3b30"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Orb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ pointer }) => {
    if (!ref.current) return;
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, pointer.x * 0.6, 0.05);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, pointer.y * 0.4, 0.05);
  });
  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.9}>
      <mesh ref={ref} scale={1.7}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshDistortMaterial
          color="#160404"
          emissive="#e10600"
          emissiveIntensity={0.28}
          roughness={0.18}
          metalness={0.9}
          distort={0.45}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

/** Lazy-loaded hero scene: chrome-red distorted orb in a particle field. */
export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 4]} intensity={30} color="#ff2a20" />
      <pointLight position={[-4, -2, 2]} intensity={10} color="#f5f5f0" />
      <Orb />
      <Particles />
      <fog attach="fog" args={["#0d0d0d", 6, 12]} />
    </Canvas>
  );
}
