import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html, Stars } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowUp, Award, BatteryCharging, Check, ChevronDown, ChevronLeft, ChevronRight,
  CircleHelp, Clock3, Coins, Gauge, Headphones, Map, Pause, Play, RotateCcw,
  Settings as SettingsIcon, Shield, ShoppingBag, Volume2,
  Wind, Wrench, Zap,
} from 'lucide-react';
import * as THREE from 'three';

const CARS = [
  { id: 'pulse', name: 'Pulse GT', type: 'SPORTS', price: 0, color: '#f05b35', top: 218, accel: 8.2, brake: 9.2, handling: 7.8, weight: 1240 },
  { id: 'metro', name: 'Metro S', type: 'HATCHBACK', price: 700, color: '#50a8ff', top: 174, accel: 6.1, brake: 7.4, handling: 8.6, weight: 1180 },
  { id: 'solace', name: 'Solace LX', type: 'SEDAN', price: 1200, color: '#d3d8df', top: 192, accel: 6.8, brake: 8, handling: 7.3, weight: 1510 },
  { id: 'summit', name: 'Summit X', type: 'SUV', price: 1750, color: '#8e9b64', top: 182, accel: 6.4, brake: 7.2, handling: 6.7, weight: 1930 },
  { id: 'volt', name: 'Volt E', type: 'ELECTRIC', price: 2300, color: '#50dfb3', top: 205, accel: 9.1, brake: 8.8, handling: 8.1, weight: 1640 },
  { id: 'monarch', name: 'Monarch V', type: 'LUXURY', price: 3200, color: '#a18cff', top: 211, accel: 7.7, brake: 8.5, handling: 7.6, weight: 1760 },
  { id: 'rally', name: 'Rally R', type: 'SPORTS', price: 4100, color: '#f4c84b', top: 232, accel: 9.4, brake: 9.1, handling: 9.2, weight: 1120 },
  { id: 'terra', name: 'Terra 4', type: 'SUV', price: 4900, color: '#ec785f', top: 190, accel: 7.1, brake: 7.7, handling: 7.2, weight: 1860 },
];
const PhysicsGame = lazy(() => import('./PhysicsGame.jsx'));
const MODES = [
  { id: 'free', title: 'Free drive', subtitle: 'Your city. Your pace.', icon: Wind, tag: 'EXPLORE' },
  { id: 'parking', title: 'Parking challenge', subtitle: 'Precision is everything.', icon: Map, tag: '90 SEC' },
  { id: 'traffic', title: 'Traffic run', subtitle: 'Read the road ahead.', icon: Shield, tag: 'RULES APPLY' },
  { id: 'trial', title: 'Time trial', subtitle: 'Beat the clock. Own the line.', icon: Clock3, tag: '2 MIN' },
  { id: 'career', title: 'Career', subtitle: 'Build your driving legacy.', icon: Award, tag: '3 MISSIONS' },
];
const COLORS = ['#f05b35', '#50a8ff', '#50dfb3', '#f4c84b', '#a18cff', '#edf0f4', '#292e34', '#e77d92'];
const DEFAULT_SAVE = { coins: 1600, xp: 0, level: 1, unlocked: ['pulse'], selected: 'pulse', paint: {}, wheels: {}, upgrades: {}, completed: [], best: 0, settings: { quality: 'High', weather: 'Clear', time: 'Day', sound: true, wheel: false } };

function readSave() {
  try {
    const stored = JSON.parse(localStorage.getItem('drive-legends-save') || 'null');
    if (!stored) return DEFAULT_SAVE;
    const save = { ...DEFAULT_SAVE, ...stored, settings: { ...DEFAULT_SAVE.settings, ...stored.settings } };
    save.unlocked = Array.isArray(save.unlocked) ? [...new Set(['pulse', ...save.unlocked.filter((id) => CARS.some((car) => car.id === id))])] : ['pulse'];
    if (!save.unlocked.includes(save.selected)) save.selected = save.unlocked[0];
    return save;
  } catch (error) {
    console.warn('Could not load local driver progress:', error);
    return DEFAULT_SAVE;
  }
}

function useSave() {
  const [save, setSave] = useState(readSave);
  useEffect(() => localStorage.setItem('drive-legends-save', JSON.stringify(save)), [save]);
  return [save, setSave];
}

export const input = { forward: false, reverse: false, left: false, right: false, handbrake: false, horn: false };
export function CarModel({ color = '#f05b35', scale = 1, wheels = true, type = 'SPORTS', wheelStyle = 'Alloy' }) {
  const wheelRefs = useRef([]);
  const isSuv = type === 'SUV';
  const isHatch = type === 'HATCHBACK' || type === 'ELECTRIC';
  const bodyLength = isHatch ? 3.2 : 3.55;
  const bodyHeight = isSuv ? 0.7 : 0.56;
  const cabinHeight = isSuv ? 0.72 : isHatch ? 0.63 : 0.56;
  const rimColor = wheelStyle === 'Blackout' ? '#29343a' : wheelStyle === 'Copper' ? '#bf8060' : '#b6c1ca';
  useFrame((_, delta) => {
    wheelRefs.current.forEach((wheel) => {
      if (wheel) wheel.rotation.x -= delta * 7;
    });
  });
  return (
    <group scale={scale}>
      <mesh castShadow position={[0, bodyHeight / 2 + 0.15, 0]}><boxGeometry args={[isSuv ? 1.94 : 1.84, bodyHeight, bodyLength]} /><meshStandardMaterial color={color} metalness={0.62} roughness={0.28} /></mesh>
      <mesh castShadow position={[0, bodyHeight + cabinHeight * 0.48, -0.12]}><boxGeometry args={[isSuv ? 1.62 : 1.55, cabinHeight, isHatch ? 1.7 : 1.75]} /><meshStandardMaterial color="#18232c" metalness={0.52} roughness={0.24} /></mesh>
      <mesh position={[0, bodyHeight + cabinHeight * 0.48, -0.11]}><boxGeometry args={[1.42, cabinHeight * 0.7, isHatch ? 1.52 : 1.58]} /><meshStandardMaterial color="#172834" metalness={0.3} roughness={0.18} /></mesh>
      <mesh position={[0, 0.46, bodyLength / 2]}><boxGeometry args={[1.58, 0.13, 0.06]} /><meshStandardMaterial color="#ff433d" emissive="#c11e18" emissiveIntensity={1.7} /></mesh>
      <mesh position={[0, 0.51, -bodyLength / 2]}><boxGeometry args={[1.42, 0.11, 0.06]} /><meshStandardMaterial color="#edf5ff" emissive="#a9d8ff" emissiveIntensity={1.15} /></mesh>
      <mesh position={[0, 0.19, 0.5]}><boxGeometry args={[1.72, 0.1, 0.9]} /><meshStandardMaterial color="#20252b" metalness={0.45} /></mesh>
      {wheels && [-1, 1].flatMap((side) => [-1, 1].map((axle, i) => (
        <group key={`${side}-${axle}`} ref={(el) => { wheelRefs.current[i * 2 + (side === 1 ? 1 : 0)] = el; }} position={[side * 0.94, 0.28, axle * (isHatch ? 0.99 : 1.12)]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.22, 16]} /><meshStandardMaterial color="#101317" roughness={0.86} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[side * 0.12, 0, 0]}><cylinderGeometry args={[0.19, 0.19, 0.025, wheelStyle === 'Aero' ? 8 : 12]} /><meshStandardMaterial color={rimColor} metalness={0.85} roughness={0.25} /></mesh>
        </group>
      )))}
    </group>
  );
}

function PreviewCar({ car }) {
  const ref = useRef();
  const drag = useRef({ active: false, x: 0 });
  const [zoom, setZoom] = useState(1);
  useFrame((state, delta) => {
    if (ref.current && !drag.current.active) ref.current.rotation.y += delta * 0.2;
  });
  return <group ref={ref} position={[4.6, -0.4, 0]} scale={zoom} onPointerDown={(event) => { drag.current = { active: true, x: event.nativeEvent.clientX }; }} onPointerMove={(event) => { if (!drag.current.active || !ref.current) return; ref.current.rotation.y += (event.nativeEvent.clientX - drag.current.x) * 0.012; drag.current.x = event.nativeEvent.clientX; }} onPointerUp={() => { drag.current.active = false; }} onPointerLeave={() => { drag.current.active = false; }} onWheel={(event) => { event.stopPropagation(); setZoom((value) => THREE.MathUtils.clamp(value - event.deltaY * 0.001, 0.72, 1.42)); }}><Float speed={1.1} floatIntensity={0.2} rotationIntensity={0}><CarModel color={car.color} type={car.type} wheelStyle={car.wheelStyle} scale={1.1} /></Float></group>;
}

function PreviewCity() {
  const instances = useMemo(() => {
    let seed = 41;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    return Array.from({ length: 60 }, (_, i) => ({
      position: [(i % 10 - 4.5) * 5.2, 1.5 + rand() * 3.5, -14 - Math.floor(i / 10) * 6],
      size: [2.4 + rand() * 1.4, 3 + rand() * 7, 2.5 + rand() * 1.5],
      color: ['#17232d', '#1b2932', '#202c35', '#192630'][i % 4],
    }));
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial color="#10171c" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, -6]}><planeGeometry args={[220, 12]} /><meshStandardMaterial color="#20272b" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, -6]}><planeGeometry args={[220, 0.12]} /><meshBasicMaterial color="#b79a65" /></mesh>
      {instances.map((building, i) => (
        <group key={i} position={building.position}>
          <mesh position={[0, building.size[1] / 2, 0]} castShadow><boxGeometry args={building.size} /><meshStandardMaterial color={building.color} metalness={0.24} roughness={0.76} /></mesh>
          <mesh position={[0, building.size[1] / 2 + 0.03, building.size[2] / 2 + 0.006]}><planeGeometry args={[building.size[0] * 0.7, building.size[1] * 0.68]} /><meshBasicMaterial color="#f4a45f" transparent opacity={0.12} /></mesh>
        </group>
      ))}
      <Stars radius={100} depth={30} count={900} factor={3} saturation={0.15} fade speed={0.3} />
      <pointLight position={[7, 11, 1]} color="#ff7049" intensity={30} distance={40} />
    </group>
  );
}

export function createCityBuildings() {
  let seed = 12;
  const rand = () => { seed = (seed * 48271) % 2147483647; return (seed - 1) / 2147483646; };
  const blocks = [];
  for (let x = -4; x <= 3; x++) for (let z = -4; z <= 3; z++) {
    if (Math.abs(x) < 1 && Math.abs(z) < 1) continue;
    const height = 4 + rand() * 13;
    blocks.push({ position: [x * 28 + 14 + (rand() - 0.5) * 2, height / 2, z * 28 + 14 + (rand() - 0.5) * 2], scale: [5.4 + rand() * 3, height, 5.4 + rand() * 3], color: ['#1a2730', '#202b32', '#26343a', '#17232c', '#29343a'][Math.floor(rand() * 5)] });
  }
  return blocks;
}

export function RoadWorld({ weather, time, buildings }) {
  const night = time === 'Night';
  return (
    <>
      <color attach="background" args={[night ? '#111923' : '#9aafb1']} />
      <fog attach="fog" args={[night ? '#111923' : '#9aafb1', 65, 185]} />
      <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.26, 0]} receiveShadow><planeGeometry args={[240, 240]} /><meshStandardMaterial color={weather === 'Rain' ? '#182126' : '#20282b'} roughness={weather === 'Rain' ? 0.34 : 0.92} /></mesh>
      {Array.from({ length: 9 }, (_, i) => i - 4).map((n) => (
        <group key={`road-${n}`}>
          {[-1, 1].map((side) => <group key={`sidewalk-${n}-${side}`}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[n * 28 + side * 5.85, -0.135, 0]}><planeGeometry args={[2.2, 240]} /><meshStandardMaterial color="#59605d" roughness={0.92} /></mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.135, n * 28 + side * 5.85]}><planeGeometry args={[240, 2.2]} /><meshStandardMaterial color="#59605d" roughness={0.92} /></mesh>
          </group>)}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[n * 28, -0.2, 0]} receiveShadow><planeGeometry args={[9.5, 240]} /><meshStandardMaterial color="#30363a" roughness={weather === 'Rain' ? 0.3 : 0.8} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, n * 28]} receiveShadow><planeGeometry args={[240, 9.5]} /><meshStandardMaterial color="#30363a" roughness={weather === 'Rain' ? 0.3 : 0.8} /></mesh>
          {Array.from({ length: 12 }, (_, j) => (
            <group key={`marks-${n}-${j}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[n * 28, -0.185, (j - 5.5) * 18]}><planeGeometry args={[0.12, 5]} /><meshBasicMaterial color="#c8c0a3" transparent opacity={0.56} /></mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(j - 5.5) * 18, -0.185, n * 28]}><planeGeometry args={[5, 0.12]} /><meshBasicMaterial color="#c8c0a3" transparent opacity={0.56} /></mesh>
            </group>
          ))}
        </group>
      ))}
      <Instances buildings={buildings} />
      <StreetDetails night={night} />
      <TrafficSignals />
      {weather === 'Rain' && <Rain />}
      {night && <Stars radius={180} depth={50} count={700} factor={3} fade speed={0.1} />}
      <hemisphereLight args={[night ? '#748ba8' : '#d7e8f0', '#34392f', night ? 0.48 : 0.9]} />
      <ambientLight intensity={night ? 0.42 : 0.95} />
      <directionalLight position={[25, 45, 10]} intensity={night ? 0.55 : 1.4} color={night ? '#91b5ff' : '#fff1d2'} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-80} shadow-camera-right={80} shadow-camera-top={80} shadow-camera-bottom={-80} />
      {night && <pointLight position={[2, 9, 0]} color="#ff984b" intensity={24} distance={48} />}
      </group>
    </>
  );
}

function Instances({ buildings }) {
  const mesh = useRef();
  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((item, index) => {
      dummy.position.set(...item.position);
      dummy.scale.set(...item.scale);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
      mesh.current.setColorAt(index, new THREE.Color(item.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [buildings]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, buildings.length]} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.82} metalness={0.08} /></instancedMesh>;
}

function TrafficSignals() {
  const signals = useMemo(() => [-84, 0, 84].flatMap((z) => [-1, 1].map((side) => ({ z, side }))), []);
  return <>{signals.map(({ z, side }) => <Signal key={`${z}-${side}`} position={[side * 5.2, 0, z]} phase={Math.floor(z / 84)} />)}</>;
}

function Signal({ position, phase }) {
  const red = useRef();
  const green = useRef();
  useFrame((state) => {
    const redLight = Math.sin(state.clock.elapsedTime * 0.32 + phase) > 0.36;
    if (red.current) red.current.material.emissiveIntensity = redLight ? 2 : 0.04;
    if (green.current) green.current.material.emissiveIntensity = redLight ? 0.04 : 2;
  });
  return <group position={position}>
    <mesh position={[0, 2.2, 0]}><cylinderGeometry args={[0.06, 0.09, 4.4, 6]} /><meshStandardMaterial color="#68747a" metalness={0.65} /></mesh>
    <mesh position={[0, 4.4, 0]}><boxGeometry args={[0.38, 0.95, 0.3]} /><meshStandardMaterial color="#151b1e" /></mesh>
    <mesh ref={red} position={[0, 4.63, 0.17]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ff463e" emissive="#ff302a" emissiveIntensity={2} /></mesh>
    <mesh ref={green} position={[0, 4.18, 0.17]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#4cffb4" emissive="#36eaa0" emissiveIntensity={0.04} /></mesh>
  </group>;
}

function StreetDetails({ night }) {
  const lampPositions = useMemo(() => {
    const list = [];
    for (let n = -4; n <= 4; n++) for (let z = -4; z <= 4; z++) {
      if (n % 2 === 0 && z % 2 === 0) list.push([n * 28 + 6.8, 0, z * 28 + 6.8]);
    }
    return list;
  }, []);
  return (
    <group>
      {lampPositions.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 3, 0]}><cylinderGeometry args={[0.07, 0.12, 6, 6]} /><meshStandardMaterial color="#68747a" metalness={0.7} /></mesh>
          <mesh position={[0.42, 5.9, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.16, 0.1, 0.75]} /><meshStandardMaterial color={night ? '#ffcc80' : '#89969b'} emissive={night ? '#ffa64d' : '#000000'} emissiveIntensity={night ? 1.6 : 0} /></mesh>
          {night && i < 8 && <pointLight position={[0.45, 5.7, 0]} color="#ffb562" intensity={5} distance={9} />}
        </group>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <group key={`tree-${i}`} position={[(i % 4 - 1.5) * 24 + 7, 0, (Math.floor(i / 4) - 1) * 24 + 9]}>
          <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.14, 0.2, 2, 7]} /><meshStandardMaterial color="#554b3d" /></mesh>
          <mesh position={[0, 2.4, 0]}><icosahedronGeometry args={[1.1, 1]} /><meshStandardMaterial color="#42614c" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Rain() {
  const rain = useRef();
  const positions = useMemo(() => {
    const p = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      p[i * 3] = (Math.random() - 0.5) * 80;
      p[i * 3 + 1] = Math.random() * 35;
      p[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return p;
  }, []);
  useFrame((_, delta) => {
    if (!rain.current) return;
    const p = rain.current.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      p[i + 1] -= delta * 19;
      p[i] += delta * 2;
      if (p[i + 1] < 0) p[i + 1] = 32;
    }
    rain.current.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={rain}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#a8d7eb" size={0.075} transparent opacity={0.48} /></points>;
}

export function EngineSound({ enabled, speed }) {
  const audio = useRef(null);
  useEffect(() => {
    let active = true;
    const start = () => {
      if (!active || audio.current) return;
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const low = context.createOscillator();
      const high = context.createOscillator();
      const horn = context.createOscillator();
      const hornGain = context.createGain();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.value = 0.0001;
      low.type = 'sawtooth';
      high.type = 'triangle';
      horn.type = 'square';
      horn.frequency.value = 330;
      hornGain.gain.value = 0.0001;
      low.frequency.value = 48;
      high.frequency.value = 96;
      low.connect(filter);
      high.connect(filter);
      horn.connect(hornGain);
      hornGain.connect(context.destination);
      filter.connect(gain);
      gain.connect(context.destination);
      low.start();
      high.start();
      horn.start();
      audio.current = { context, gain, low, high, horn, hornGain };
      context.resume().catch((error) => console.warn('Engine audio could not start:', error));
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => {
      active = false;
      window.removeEventListener('pointerdown', start);
      if (audio.current) {
        audio.current.low.stop();
        audio.current.high.stop();
        audio.current.horn.stop();
        audio.current.context.close().catch((error) => console.warn('Engine audio could not close:', error));
        audio.current = null;
      }
    };
  }, []);
  useFrame(() => {
    if (!audio.current) return;
    const { context, gain, low, high, hornGain } = audio.current;
    const now = context.currentTime;
    const engine = Math.min(1, speed / 150);
    low.frequency.setTargetAtTime(42 + engine * 105, now, 0.08);
    high.frequency.setTargetAtTime(84 + engine * 210, now, 0.08);
    gain.gain.setTargetAtTime(enabled ? 0.009 + engine * 0.025 : 0.0001, now, 0.12);
    hornGain.gain.setTargetAtTime(enabled && input.horn ? 0.035 : 0.0001, now, 0.025);
  });
  return null;
}

export function ParkingBay() {
  return (
    <group position={[2.2, 0, -12]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]}><planeGeometry args={[4.2, 8]} /><meshBasicMaterial color="#46d9ad" transparent opacity={0.18} /></mesh>
      {[[-2.2, 0, 0], [2.2, 0, 0], [0, 0, -4.5], [0, 0, 4.5]].map((p, i) => <mesh key={i} position={p}><boxGeometry args={i < 2 ? [0.12, 0.06, 9] : [4.5, 0.06, 0.12]} /><meshBasicMaterial color="#53e1b5" /></mesh>)}
      <Html position={[0, 1, 0]} center distanceFactor={12}><div className="world-label">PARK HERE</div></Html>
    </group>
  );
}

export function Checkpoint({ position = -65, label = 'FINISH' }) {
  const ref = useRef();
  useFrame((state) => { if (ref.current) ref.current.material.opacity = 0.28 + Math.sin(state.clock.elapsedTime * 2.5) * 0.12; });
  return <group position={[0, 0, position]}><mesh ref={ref} position={[0, 2.2, 0]}><torusGeometry args={[4, 0.16, 8, 36]} /><meshBasicMaterial color="#50dfb3" transparent opacity={0.35} /></mesh><Html position={[0, 4.5, 0]} center><div className="world-label">{label}</div></Html></group>;
}

function App() {
  const [save, setSave] = useSave();
  const [screen, setScreen] = useState('menu');
  const [mode, setMode] = useState('free');
  const [cameraMode, setCameraMode] = useState(0);
  const [telemetry, setTelemetry] = useState({ speed: 0, rpm: 900, x: 0, z: 0 });
  const [timeLeft, setTimeLeft] = useState(90);
  const [score, setScore] = useState(0);
  const [warning, setWarning] = useState('');
  const [toast, setToast] = useState('');
  const [garageIndex, setGarageIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0);
  const [careerStage, setCareerStage] = useState(0);
  const selectedCar = CARS.find((car) => car.id === save.selected) || CARS[0];
  const menuCar = CARS[garageIndex] || selectedCar;
  const [quality, setQuality] = useState(save.settings.quality);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify.timeout);
    notify.timeout = window.setTimeout(() => setToast(''), 2300);
  }, []);
  const startGame = useCallback((nextMode) => {
    setMode(nextMode);
    setTimeLeft(nextMode === 'free' ? 0 : nextMode === 'parking' ? 90 : nextMode === 'trial' ? 120 : 150);
    setScore(0);
    setCareerStage(0);
    setTelemetry({ speed: 0, rpm: 900, x: 0, z: 0 });
    setPaused(false);
    setRunId((value) => value + 1);
    setScreen('game');
  }, []);
  const navigate = useCallback((nextScreen) => {
    if (nextScreen === 'garage') setGarageIndex(CARS.findIndex((car) => car.id === save.selected));
    setScreen(nextScreen);
  }, [save.selected]);
  const setPaint = (color) => setSave((current) => ({ ...current, paint: { ...current.paint, [menuCar.id]: color } }));
  const setWheels = (wheelStyle) => setSave((current) => ({ ...current, wheels: { ...current.wheels, [menuCar.id]: wheelStyle } }));
  const saveSetting = useCallback((key, value) => {
    setSave((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }, [setSave]);

  useEffect(() => {
    if (screen !== 'game' || paused || mode === 'free' || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [screen, paused, mode, timeLeft]);
  useEffect(() => {
    if (timeLeft === 0 && screen === 'game' && mode !== 'free') {
      setPaused(true);
      notify('Time is up — take another run!');
    }
  }, [timeLeft, screen, mode, notify]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key.toLowerCase() === 'c' && screen === 'game') setCameraMode((value) => (value + 1) % 4);
      if (event.key === 'Escape' && screen === 'game') setPaused((value) => (timeLeft === 0 && mode !== 'free' ? true : !value));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, timeLeft, mode]);

  const handleCollision = useCallback((kind) => {
    setScore((value) => Math.max(0, value - 100));
    setWarning(kind === 'traffic' ? 'TRAFFIC CONTACT  −100' : 'COLLISION  −100');
    window.setTimeout(() => setWarning(''), 1700);
  }, []);
  const handleRuleViolation = useCallback((kind) => {
    setScore((value) => Math.max(0, value - 50));
    setWarning(kind === 'red-light' ? 'RED LIGHT VIOLATION  −50' : 'SPEED LIMIT EXCEEDED  −50');
    window.setTimeout(() => setWarning(''), 1700);
  }, []);
  const handleFinish = useCallback((stage) => {
    if (mode === 'career' && stage < 2) {
      setCareerStage((value) => value + 1);
      setScore((value) => value + 250);
      setSave((current) => ({ ...current, coins: current.coins + 100, xp: current.xp + 75, level: Math.floor((current.xp + 75) / 1000) + 1 }));
      notify(`Career checkpoint ${stage + 1} cleared! +100 credits · +75 XP`);
      return;
    }
    setScore((value) => value + 500);
    setSave((current) => {
      const wasComplete = current.completed.includes(mode);
      return { ...current, coins: current.coins + 350, xp: current.xp + 250, level: Math.floor((current.xp + 250) / 1000) + 1, completed: wasComplete ? current.completed : [...current.completed, mode], best: Math.max(current.best, score + 500) };
    });
    setPaused(true);
    notify('Checkpoint reached! +350 credits · +250 XP');
  }, [careerStage, mode, score, setSave, notify]);

  const buyCar = (car) => {
    if (save.unlocked.includes(car.id)) {
      setSave((current) => ({ ...current, selected: car.id }));
      notify(`${car.name} selected`);
      return;
    }
    if (save.coins < car.price) { notify('Not enough credits yet — complete a mission to earn more.'); return; }
    setSave((current) => ({ ...current, coins: current.coins - car.price, unlocked: [...current.unlocked, car.id], selected: car.id }));
    notify(`${car.name} added to your garage`);
  };
  const upgrade = (type) => {
    const current = save.upgrades[menuCar.id] || {};
    const level = current[type] || 0;
    const cost = (level + 1) * 400;
    if (level >= 3) { notify('This upgrade is already at maximum level.'); return; }
    if (save.coins < cost) { notify('Earn more credits to install this upgrade.'); return; }
    setSave((value) => ({ ...value, coins: value.coins - cost, upgrades: { ...value.upgrades, [menuCar.id]: { ...current, [type]: level + 1 } } }));
    notify(`${type} upgrade installed`);
  };

  return (
    <main className="app-shell">
      <Canvas className="scene-canvas" shadows dpr={quality === 'High' ? [1, 1.6] : [0.7, 1]} camera={{ position: [0, 4, 12], fov: 58 }} gl={{ antialias: quality !== 'Low', powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          {screen === 'game' ? (
            <Suspense fallback={<Html center><div className="physics-loading">PREPARING THE CITY ENGINE<span /></div></Html>}>
              <PhysicsGame key={runId} car={selectedCar} save={save} mode={mode} speed={telemetry.speed} careerStage={careerStage} paused={paused} cameraMode={cameraMode} onTelemetry={(data) => { setTelemetry(data); if (mode === 'free' && data.distance > 0) setScore((value) => value + Math.round(data.distance * 2)); }} onCollision={handleCollision} onRuleViolation={handleRuleViolation} onFinish={handleFinish} />
            </Suspense>
          ) : (
            <>
              <color attach="background" args={['#101923']} />
              <fog attach="fog" args={['#101923', 28, 95]} />
              <ambientLight intensity={0.65} />
              <directionalLight position={[8, 12, 6]} intensity={2.1} color="#fbe8cd" />
              <PreviewCity />
              <PreviewCar car={screen === 'garage' ? { ...menuCar, color: save.paint[menuCar.id] || menuCar.color, wheelStyle: save.wheels[menuCar.id] || 'Alloy' } : selectedCar} />
            </>
          )}
        </Suspense>
      </Canvas>

      <AnimatePresence mode="wait">
        {screen === 'menu' && <MenuScreen key="menu" save={save} onStart={startGame} onScreen={navigate} />}
        {screen === 'garage' && <GarageScreen key="garage" save={save} car={{ ...menuCar, color: save.paint[menuCar.id] || menuCar.color }} index={garageIndex} setIndex={setGarageIndex} onPaint={setPaint} onWheels={setWheels} onBuy={buyCar} onUpgrade={upgrade} onBack={() => navigate('menu')} />}
        {screen === 'settings' && <SettingsScreen key="settings" save={save} quality={quality} setQuality={setQuality} onSetting={saveSetting} onBack={() => setScreen('menu')} />}
        {screen === 'profile' && <InfoScreen key="profile" type="profile" save={save} onBack={() => navigate('menu')} />}
        {screen === 'leaderboard' && <InfoScreen key="leaderboard" type="leaderboard" save={save} onBack={() => navigate('menu')} />}
        {screen === 'game' && <GameUI key="game" save={save} car={selectedCar} mode={mode} careerStage={careerStage} telemetry={telemetry} timeLeft={timeLeft} score={score} warning={warning} paused={paused} setPaused={setPaused} cameraMode={cameraMode} setCameraMode={setCameraMode} onExit={() => navigate('menu')} onStart={startGame} />}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{toast}</motion.div>}</AnimatePresence>
    </main>
  );
}

function MenuScreen({ save, onStart, onScreen }) {
  return (
    <motion.div className="menu-screen overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <header className="topbar">
        <button className="brand-lockup" onClick={() => onScreen('menu')}><span className="brand-mark">D<span>·</span>L</span><span className="brand-name">DRIVE<span> LEGENDS</span><small>3D MOTOR CLUB</small></span></button>
        <nav className="desktop-nav"><button onClick={() => onScreen('garage')}>GARAGE</button><button onClick={() => onScreen('leaderboard')}>LEADERBOARD</button><button onClick={() => onScreen('settings')}>SETTINGS</button></nav>
        <button className="profile-chip" onClick={() => onScreen('profile')}><span className="avatar">R</span><span>Rookie driver<small>LEVEL {String(save.level).padStart(2, '0')}</small></span><ChevronDown size={15} /></button>
      </header>
      <section className="hero-copy">
        <motion.div initial={{ x: -22, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="eyebrow"><span className="live-dot" /> SEASON 01 <i /> CITY LIGHTS</motion.div>
        <motion.h1 initial={{ x: -25, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.23 }}>MASTER THE ROAD.<br /><em>OWN THE DRIVE.</em></motion.h1>
        <p>Every street has a story. Make yours legendary.</p>
        <div className="hero-actions"><button className="button-primary" onClick={() => onStart('free')}><Play size={16} fill="currentColor" /> START DRIVING <span>↗</span></button><button className="button-secondary" onClick={() => onScreen('garage')}><Wrench size={15} /> VISIT GARAGE</button></div>
        <div className="hero-meta"><span><span className="meta-number">08</span> ORIGINAL RIDES</span><i /><span><span className="meta-number">05</span> WAYS TO DRIVE</span><i /><span><span className="meta-number">{save.completed.length}</span> MISSIONS CLEARED</span></div>
      </section>
      <div className="hero-car-label"><div className="label-line" /><small>YOUR CURRENT RIDE</small><strong>{(CARS.find((c) => c.id === save.selected) || CARS[0]).name}</strong><span>01 / 08 <ArrowUp size={12} /></span></div>
      <section className="mode-dock">
        <div className="dock-heading"><span>CHOOSE YOUR DRIVE</span><small>01 — 05</small></div>
        <div className="mode-cards">{MODES.map((item, i) => { const Icon = item.icon; return <button key={item.id} className="mode-card" onClick={() => onStart(item.id)}><div className="mode-card-top"><Icon size={16} /><small>{item.tag}</small></div><strong>{item.title}</strong><span>{item.subtitle}</span><div className="mode-card-bottom"><span>0{i + 1}</span><ChevronRight size={14} /></div></button>; })}</div>
      </section>
      <div className="menu-footer"><span>© DRIVE LEGENDS MOTOR CLUB</span><span className="footer-mid"><span className="status-dot" /> CITY SERVICES ONLINE</span><span>BUILD 1.0.4 <b>·</b> <button onClick={() => onScreen('settings')}>SUPPORT</button></span></div>
    </motion.div>
  );
}

function GarageScreen({ save, car, index, setIndex, onPaint, onWheels, onBuy, onUpgrade, onBack }) {
  const unlocked = save.unlocked.includes(car.id);
  const upgradeLevels = save.upgrades[car.id] || {};
  const move = (delta) => setIndex((value) => (value + delta + CARS.length) % CARS.length);
  return (
    <motion.div className="overlay garage-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <header className="topbar subpage-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> BACK TO CLUB</button><div className="page-title"><span>YOUR COLLECTION</span><small>GARAGE & CUSTOMISATION</small></div><div className="credits"><Coins size={16} /><strong>{save.coins.toLocaleString()}</strong><small>CR</small></div></header>
      <div className="garage-layout">
        <div className="garage-side"><div className="eyebrow">01 / 08 <i /> VEHICLE SELECT</div><h1>{car.name.split(' ')[0]}<br /><em>{car.name.split(' ').slice(1).join(' ')}</em></h1><span className="type-pill">{car.type}</span><p className="garage-description">Designed for the city. Tuned for the road. Find the drive that feels like yours.</p><div className="specs">{[['TOP SPEED', car.top, 'km/h'], ['ACCELERATION', car.accel.toFixed(1), 'G'], ['BRAKING', car.brake.toFixed(1), 'G'], ['HANDLING', car.handling.toFixed(1), '/10'], ['WEIGHT', car.weight.toLocaleString(), 'kg']].map(([label, value, unit]) => <div key={label} className="spec-row"><span>{label}</span><div className="spec-bar"><i style={{ width: `${Math.min(96, Number(value) / (label === 'TOP SPEED' ? 2.5 : label === 'WEIGHT' ? 22 : 0.1))}%` }} /></div><strong>{value}<small> {unit}</small></strong></div>)}</div>
          <div className="garage-controls"><button className="circle-arrow" onClick={() => move(-1)}><ChevronLeft /></button><div className="car-pagination">{CARS.map((_, i) => <button key={i} className={index === i ? 'selected' : ''} onClick={() => setIndex(i)} aria-label={`Select vehicle ${i + 1}`} />)}</div><button className="circle-arrow" onClick={() => move(1)}><ChevronRight /></button></div>
          <button className={`button-primary garage-purchase ${unlocked ? 'selected-car' : ''}`} onClick={() => onBuy(car)}>{unlocked ? <><Check size={16} /> {save.selected === car.id ? 'CURRENTLY SELECTED' : 'SELECT VEHICLE'}</> : <><ShoppingBag size={16} /> UNLOCK FOR {car.price.toLocaleString()} CR</>}</button>
        </div>
        <div className="garage-right"><div className="customization-row"><div className="color-custom"><span>PAINT FINISH</span><div className="swatches">{COLORS.map((color) => <button key={color} style={{ backgroundColor: color }} className={car.color === color ? 'active' : ''} onClick={() => onPaint(color)} aria-label={`Paint ${color}`} />)}</div></div><div className="wheel-options"><span>WHEELS</span>{['Alloy', 'Aero', 'Blackout', 'Copper'].map((wheel) => <button key={wheel} className={(save.wheels[car.id] || 'Alloy') === wheel ? 'active' : ''} onClick={() => onWheels(wheel)}>{wheel}</button>)}</div></div>
          <div className="upgrade-panel"><div className="panel-title"><span>PERFORMANCE TUNING</span><small>3 TIERS EACH</small></div>{[['engine', 'Engine', Zap, 'Sharper acceleration'], ['brakes', 'Brakes', Gauge, 'Shorter stopping distance'], ['handling', 'Handling', Wind, 'Improved cornering grip']].map(([key, label, Icon, desc]) => <div key={key} className="upgrade-row"><Icon size={16} /><div className="upgrade-copy"><strong>{label}</strong><small>{desc}</small></div><div className="upgrade-dots">{[0, 1, 2].map((n) => <i className={n < (upgradeLevels[key] || 0) ? 'filled' : ''} key={n} />)}</div><button disabled={!unlocked || (upgradeLevels[key] || 0) >= 3} onClick={() => onUpgrade(key)}>{(upgradeLevels[key] || 0) >= 3 ? 'MAX' : `${((upgradeLevels[key] || 0) + 1) * 400} CR`} <ChevronRight size={13} /></button></div>)}</div>
          <div className="garage-hint"><CircleHelp size={15} /><span>Choose a vehicle and colour, then tune it to your driving style. Upgrades are saved to your garage.</span></div>
        </div>
      </div>
      <div className="garage-rotate"><RotateCcw size={12} /> DRAG TO ROTATE · SCROLL TO INSPECT</div>
    </motion.div>
  );
}

function SettingsScreen({ save, quality, setQuality, onSetting, onBack }) {
  const options = (label, key, values) => <div className="setting-row"><div><strong>{label}</strong><small>{key === 'quality' ? 'Visual fidelity and performance' : key === 'weather' ? 'Road and atmospheric conditions' : 'Ambient lighting in the city'}</small></div><div className="option-group">{values.map((value) => <button key={value} className={(key === 'quality' ? quality : save.settings[key]) === value ? 'active' : ''} onClick={() => { if (key === 'quality') setQuality(value); onSetting(key, value); }}>{value}</button>)}</div></div>;
  return <motion.div className="overlay settings-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><header className="topbar subpage-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> BACK TO CLUB</button><div className="page-title"><span>SETTINGS</span><small>MAKE IT YOURS</small></div><span className="settings-badge"><SettingsIcon size={17} /> DRIVER PREFERENCES</span></header><section className="settings-panel"><h2>DRIVING EXPERIENCE</h2>{options('Graphics quality', 'quality', ['Low', 'Medium', 'High'])}{options('City lighting', 'time', ['Day', 'Night'])}{options('Weather', 'weather', ['Clear', 'Rain'])}<div className="setting-row"><div><strong>Sound effects</strong><small>Engine, ambience and driving feedback</small></div><button className={`toggle ${save.settings.sound ? 'on' : ''}`} onClick={() => onSetting('sound', !save.settings.sound)}><i /></button></div><div className="setting-row"><div><strong>Steering wheel input</strong><small>Show an on-screen steering control in-game</small></div><button className={`toggle ${save.settings.wheel ? 'on' : ''}`} onClick={() => onSetting('wheel', !save.settings.wheel)}><i /></button></div></section><div className="settings-note"><Headphones size={15} /> Settings and progress are stored locally on this device.</div></motion.div>;
}

function InfoScreen({ type, save, onBack }) {
  const profile = type === 'profile';
  return <motion.div className="overlay settings-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><header className="topbar subpage-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> BACK TO CLUB</button><div className="page-title"><span>{profile ? 'DRIVER PROFILE' : 'LEADERBOARD'}</span><small>{profile ? 'YOUR JOURNEY SO FAR' : 'LOCAL CLUB STANDINGS'}</small></div><div className="credits"><Coins size={16} /><strong>{save.coins.toLocaleString()}</strong><small>CR</small></div></header>{profile ? <section className="profile-panel"><div className="profile-avatar">R</div><div><div className="eyebrow">DRIVER · ROOKIE CLASS</div><h2>ROAD ROOKIE</h2><p>Every legend starts somewhere. Keep driving to earn XP and level up.</p></div><div className="level-card"><span>LEVEL</span><strong>{String(save.level).padStart(2, '0')}</strong><div><i style={{ width: `${(save.xp % 1000) / 10}%` }} /></div><small>{save.xp % 1000} / 1000 XP</small></div><div className="profile-stats"><div><strong>{save.completed.length}</strong><span>MISSIONS CLEARED</span></div><div><strong>{save.best}</strong><span>BEST SCORE</span></div><div><strong>{save.unlocked.length}<small> / 08</small></strong><span>CARS UNLOCKED</span></div><div><strong>{save.coins.toLocaleString()}</strong><span>CREDITS EARNED</span></div></div></section> : <section className="leaderboard-panel"><div className="leaderboard-head"><span>RANK</span><span>DRIVER</span><span>CLASS</span><span>BEST SCORE</span></div>{[['01', 'NOVA', 'LEGEND', '12,840'], ['02', 'APEX', 'PRO', '9,650'], ['03', 'VANTA', 'PRO', '8,220'], ['—', 'ROAD ROOKIE (YOU)', 'ROOKIE', save.best.toLocaleString()]].map((r, i) => <div key={r[0]} className={`leaderboard-row ${i === 3 ? 'you' : ''}`}><strong>{r[0]}</strong><span>{r[1]}</span><span>{r[2]}</span><b>{r[3]}</b></div>)}<p className="local-note">Online leaderboards arrive with a future club update. Your best local score is shown above.</p></section>}</motion.div>;
}

const CAMERAS = ['CHASE', 'COCKPIT', 'HOOD', 'TOP DOWN'];
function GameUI({ save, car, mode, careerStage, telemetry, timeLeft, score, warning, paused, setPaused, cameraMode, setCameraMode, onExit, onStart }) {
  const modeName = MODES.find((item) => item.id === mode)?.title || 'Free drive';
  const timer = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`;
  const press = (key, value) => (event) => {
    event.preventDefault();
    if (event.pointerId !== undefined && event.currentTarget?.setPointerCapture) {
      if (value) event.currentTarget.setPointerCapture(event.pointerId);
      else if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
    input[key] = value;
  };
  const bindHold = (key) => ({
    onPointerDown: press(key, true),
    onPointerUp: press(key, false),
    onPointerCancel: press(key, false),
    onLostPointerCapture: () => { input[key] = false; },
    onKeyDown: (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) input[key] = true;
    },
    onKeyUp: (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      input[key] = false;
    },
    onBlur: () => { input[key] = false; },
  });
  const steerWheel = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ('touches' in event && event.touches?.[0]) ? event.touches[0].clientX : event.clientX;
    input.left = x < bounds.left + bounds.width / 2;
    input.right = !input.left;
  };
  const bindSteerWheel = {
    onPointerDown: (event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); steerWheel(event); },
    onPointerMove: (event) => { if (event.buttons || event.pressure > 0) steerWheel(event); },
    onPointerUp: (event) => { input.left = false; input.right = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
    onPointerCancel: () => { input.left = false; input.right = false; },
    onLostPointerCapture: () => { input.left = false; input.right = false; },
  };
  useEffect(() => {
    if (paused) Object.keys(input).forEach((key) => { input[key] = false; });
  }, [paused]);
  return <motion.div className="overlay game-ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="game-top"><button className="game-exit" onClick={onExit}><ArrowLeft size={16} /> EXIT DRIVE</button><div className="game-mission"><span className="live-dot" /><div><small>NOW DRIVING · {modeName.toUpperCase()}</small><strong>{mode === 'parking' ? 'Find the marked bay' : mode === 'trial' ? 'Reach the finish checkpoint' : mode === 'traffic' ? 'Obey signals · 50 km/h limit' : mode === 'career' ? `Career checkpoint ${careerStage + 1} of 3` : 'Explore at your own pace'}</strong></div></div><button className="pause-button" onClick={() => setPaused(true)}><Pause size={15} /> PAUSE</button></div>
    <div className="game-left-hud"><div className="minimap"><div className="map-grid">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ left: `${i * 15}%` }} />)}{Array.from({ length: 7 }, (_, i) => <i key={`h${i}`} className="horizontal" style={{ top: `${i * 15}%` }} />)}<span className="map-player" style={{ left: `${50 + (telemetry.x % 18) * 1.3}%`, top: `${50 + (telemetry.z % 18) * 1.3}%` }} /><span className="map-target" /></div><span><Map size={12} /> DOWNTOWN · DISTRICT 01</span></div><div className="score-box"><small>DRIVE SCORE</small><strong>{String(score).padStart(5, '0')}</strong><span><Coins size={12} /> {save.coins.toLocaleString()} CR</span></div></div>
    <div className="game-right-hud"><button className="camera-switch" onClick={() => setCameraMode((value) => (value + 1) % 4)}><span>CAMERA VIEW</span><strong>{CAMERAS[cameraMode]}</strong><ChevronRight size={14} /></button><div className="speed-card"><div className="speed-ring"><span className="speed-value">{telemetry.speed}</span><span className="speed-unit">KM/H</span><div className="speed-scale">{Array.from({ length: 11 }, (_, i) => <i key={i} className={i < telemetry.speed / 20 ? 'lit' : ''} />)}</div></div><div className="speed-extra"><span>RPM <b>{telemetry.rpm.toLocaleString()}</b></span><span>GEAR <b>{telemetry.speed > 2 ? Math.min(6, Math.floor(telemetry.speed / 36) + 1) : 'N'}</b></span><span>FUEL <b><BatteryCharging size={14} /> 86%</b></span></div></div>{mode !== 'free' && <div className="timer-card"><small>{mode === 'parking' ? 'PARKING WINDOW' : 'TIME REMAINING'}</small><strong className={timeLeft < 20 ? 'urgent' : ''}>{timer}</strong><span>{mode === 'trial' ? 'FINISH · 0.8 KM' : mode === 'parking' ? 'PARK IN THE GREEN BAY' : 'KEEP IT CLEAN'}</span></div>}</div>
    <div className="game-bottom"><div className="control-hint"><span>WASD</span> DRIVE <i /> <span>SPACE</span> HANDBRAKE <i /> <span>H</span> HORN <i /> <span>C</span> CAMERA <i /> <span>R</span> RESET</div><div className="desktop-controls"><div className="steer-pair"><button aria-label="Steer left" {...bindHold('left')}><ChevronLeft /></button><button aria-label="Steer right" {...bindHold('right')}><ChevronRight /></button></div><button className="pedal handbrake-pedal" {...bindHold('handbrake')}>HANDBRAKE</button><button className="pedal horn-pedal" {...bindHold('horn')}><Volume2 size={13} /> HORN</button><button className="pedal brake-pedal" {...bindHold('reverse')}>BRAKE<span>REVERSE</span></button><button className="pedal accel-pedal" {...bindHold('forward')}>ACCELERATE<ArrowUp size={14} /></button></div></div>
    {save.settings.wheel && <div className="steering-wheel" {...bindSteerWheel}><div>◉</div><small>STEER</small></div>}
    {warning && <motion.div className="collision-warning" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}><Shield size={15} /> {warning}</motion.div>}
    <AnimatePresence>{paused && <motion.div className="pause-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="pause-panel" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }}><div className="eyebrow"><span className="live-dot" /> {timeLeft === 0 && mode !== 'free' ? 'RUN COMPLETE' : 'DRIVE PAUSED'}</div><h2>{timeLeft === 0 && mode !== 'free' ? 'TIME’S UP' : 'TAKE A BREATHER.'}</h2><p>{timeLeft === 0 && mode !== 'free' ? 'The clock ran out. Give it another try or head back to the club.' : 'Your drive is paused. The city will be right here when you’re ready.'}</p>{!(timeLeft === 0 && mode !== 'free') && <button className="button-primary" onClick={() => setPaused(false)}><Play size={15} fill="currentColor" /> RESUME DRIVE</button>}<button className="button-secondary" onClick={onExit}><ArrowLeft size={15} /> EXIT TO CLUB</button>{timeLeft === 0 && mode !== 'free' && <button className="retry-button" onClick={() => onStart(mode)}><RotateCcw size={14} /> TRY AGAIN</button>}</motion.div></motion.div>}</AnimatePresence>
  </motion.div>;
}

export default App;
