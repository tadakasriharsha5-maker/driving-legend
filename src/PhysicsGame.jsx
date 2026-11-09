import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { CarModel, Checkpoint, EngineSound, ParkingBay, RoadWorld, createCityBuildings, input } from './App.jsx';

function TrafficCar({ start, color, index, positions }) {
  const ref = useRef();
  const speed = 5.8 + (index % 4) * 1.2;
  useFrame((state, delta) => {
    if (!ref.current) return;
    const position = ref.current.position;
    let targetSpeed = speed;
    const nextSignal = (Math.floor(position.z / 84) + 1) * 84;
    const signalDistance = nextSignal - position.z;
    const lightIsRed = Math.sin(state.clock.elapsedTime * 0.32 + Math.floor(nextSignal / 84)) > 0.36;
    if (lightIsRed && signalDistance < 12 && signalDistance > 1.8) targetSpeed *= 0.05;
    position.z += targetSpeed * delta;
    if (position.z > 130) position.z = -130;
    ref.current.rotation.y = Math.PI;
    positions.current[index] = [position.x, position.z];
  });
  return <group ref={ref} position={start}><CarModel color={color} scale={0.76} type={index % 2 ? 'SEDAN' : 'HATCHBACK'} /></group>;
}

function Traffic({ playerPosition, collision, paused }) {
  const startPositions = [-118, -94, -70, -46, 42, 66, 90, 114, -130, -106, -82];
  const cars = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    start: [i % 2 ? 2.1 : -2.1, 0.08, startPositions[i]],
    color: ['#7e99aa', '#d2b368', '#5b7f69', '#a67d79', '#bec4c8'][i % 5],
  })), []);
  const positions = useRef([]);
  const cooldown = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    cooldown.current -= delta;
    if (cooldown.current > 0) return;
    if (positions.current.some((position) => position && Math.abs(position[0] - playerPosition.current[0]) < 1.6 && Math.abs(position[1] - playerPosition.current[2]) < 3.1)) {
      cooldown.current = 1.3;
      collision('traffic');
    }
  });
  return <>{cars.map((car, i) => <TrafficCar key={i} {...car} index={i} positions={positions} />)}</>;
}

function DrivingCar({ car, paint, wheelStyle, upgrade, cameraMode, mode, careerStage, paused, positionRef, onTelemetry, onCollision, onRuleViolation, onFinish }) {
  const body = useRef();
  const { camera } = useThree();
  const forward = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  const lastPos = useRef(new THREE.Vector3());
  const telemetryClock = useRef(0);
  const finished = useRef(false);
  const previousZ = useRef(0);
  const speedingTime = useRef(0);
  useEffect(() => { finished.current = false; }, [careerStage]);
  const stats = { top: car.top * 0.2778, accel: car.accel * 0.9 * (1 + (upgrade?.engine || 0) * 0.1), brake: car.brake * 1.8 + (upgrade?.brakes || 0) * 3, steering: 0.4 + car.handling * 0.035 + (upgrade?.handling || 0) * 0.08 };

  useFrame((state, delta) => {
    if (!body.current || paused) return;
    const rb = body.current;
    const vel = rb.linvel();
    const rotation = rb.rotation();
    const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    forward.current.set(0, 0, -1).applyQuaternion(quat);
    side.current.set(1, 0, 0).applyQuaternion(quat);
    const forwardSpeed = vel.x * forward.current.x + vel.z * forward.current.z;
    const speed = Math.hypot(vel.x, vel.z);
    const acceleration = stats.accel;
    if (input.forward && forwardSpeed < stats.top) rb.applyImpulse({ x: forward.current.x * acceleration * delta * rb.mass(), y: 0, z: forward.current.z * acceleration * delta * rb.mass() }, true);
    if (input.reverse) {
      if (forwardSpeed > 1.2) rb.applyImpulse({ x: -forward.current.x * stats.brake * delta * rb.mass(), y: 0, z: -forward.current.z * stats.brake * delta * rb.mass() }, true);
      else rb.applyImpulse({ x: -forward.current.x * acceleration * 0.62 * delta * rb.mass(), y: 0, z: -forward.current.z * acceleration * 0.62 * delta * rb.mass() }, true);
    }
    const turn = Number(input.left) - Number(input.right);
    if (turn && speed > 0.35) {
      const direction = forwardSpeed < -0.2 ? -1 : 1;
      rb.applyTorqueImpulse({ x: 0, y: turn * stats.steering * direction * Math.min(speed / 5, 2.1) * delta, z: 0 }, true);
    }
    const lateral = vel.x * side.current.x + vel.z * side.current.z;
    const grip = input.handbrake ? 1.15 : 8.2 + (upgrade?.handling || 0) * 0.6;
    rb.applyImpulse({ x: -side.current.x * lateral * grip * delta * rb.mass(), y: 0, z: -side.current.z * lateral * grip * delta * rb.mass() }, true);
    const drag = input.forward || input.reverse ? 0.014 : input.handbrake ? 0.86 : 0.26;
    rb.applyImpulse({ x: -vel.x * drag * delta * rb.mass(), y: 0, z: -vel.z * drag * delta * rb.mass() }, true);
    if (input.handbrake && speed > 0.1) rb.applyImpulse({ x: -forward.current.x * stats.brake * 0.6 * delta * rb.mass(), y: 0, z: -forward.current.z * stats.brake * 0.6 * delta * rb.mass() }, true);
    const pos = rb.translation();
    if (mode === 'traffic') {
      const previous = previousZ.current;
      const nextSignal = pos.z < previous ? Math.floor(previous / 84) * 84 : Math.ceil(previous / 84) * 84;
      const crossedSignal = (pos.z < previous && previous > nextSignal && pos.z <= nextSignal)
        || (pos.z > previous && previous < nextSignal && pos.z >= nextSignal);
      if (crossedSignal && Math.sin(state.clock.elapsedTime * 0.32 + Math.floor(nextSignal / 84)) > 0.36) onRuleViolation('red-light');
      speedingTime.current = speed > 13.9 ? speedingTime.current + delta : 0;
      if (speedingTime.current > 1.5) {
        speedingTime.current = 0;
        onRuleViolation('speeding');
      }
    }
    previousZ.current = pos.z;
    positionRef.current[0] = pos.x;
    positionRef.current[1] = pos.y;
    positionRef.current[2] = pos.z;
    const carPosition = new THREE.Vector3(pos.x, pos.y, pos.z);
    const target = new THREE.Vector3(pos.x, pos.y + 0.9, pos.z);
    let cameraOffset;
    if (cameraMode === 1) cameraOffset = new THREE.Vector3(0, 1.24, 0.23).applyQuaternion(quat);
    else if (cameraMode === 2) cameraOffset = new THREE.Vector3(0, 1.5, -0.8).applyQuaternion(quat);
    else if (cameraMode === 3) cameraOffset = new THREE.Vector3(0, 20, 0.1);
    else cameraOffset = new THREE.Vector3(0, 4.3, 8.4).applyQuaternion(quat);
    const desired = carPosition.clone().add(cameraOffset);
    camera.position.lerp(desired, 1 - Math.exp(-delta * (cameraMode === 3 ? 2 : 4.7)));
    camera.lookAt(target);
    telemetryClock.current += delta;
    if (telemetryClock.current > 0.12) {
      telemetryClock.current = 0;
      onTelemetry({ speed: Math.round(speed * 3.6), rpm: Math.min(8500, Math.round(900 + speed * 230 + (input.forward ? 700 : 0))), x: pos.x, z: pos.z, distance: lastPos.current.distanceTo(carPosition) });
      lastPos.current.copy(carPosition);
      const finish = mode === 'trial' ? new THREE.Vector3(0, 0, -65)
        : mode === 'career' ? new THREE.Vector3(0, 0, -36 - careerStage * 36)
          : mode === 'traffic' ? new THREE.Vector3(0, 0, -100)
            : null;
      const rotationError = Math.abs(rotation.y);
      const reachedParking = mode === 'parking' && Math.abs(pos.x - 2.2) < 1.45 && Math.abs(pos.z + 12) < 2.6 && speed < 0.65 && rotationError < 0.12;
      if (!finished.current && ((finish && carPosition.distanceTo(finish) < 5) || reachedParking)) {
        finished.current = true;
        onFinish(careerStage);
      }
    }
  });

  useEffect(() => {
    const keyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (event.repeat && event.key.toLowerCase() === 'r') return;
      if (event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') input.forward = true;
      if (event.key.toLowerCase() === 's' || event.key === 'ArrowDown') input.reverse = true;
      if (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft') input.left = true;
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') input.right = true;
      if (event.key === ' ') input.handbrake = true;
      if (event.key.toLowerCase() === 'h') input.horn = true;
      if (event.key.toLowerCase() === 'r') {
        body.current?.setTranslation({ x: 0, y: 1.2, z: 0 }, true);
        body.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.current?.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      }
    };
    const keyUp = (event) => {
      if (event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') input.forward = false;
      if (event.key.toLowerCase() === 's' || event.key === 'ArrowDown') input.reverse = false;
      if (event.key.toLowerCase() === 'a' || event.key === 'ArrowLeft') input.left = false;
      if (event.key.toLowerCase() === 'd' || event.key === 'ArrowRight') input.right = false;
      if (event.key === ' ') input.handbrake = false;
      if (event.key.toLowerCase() === 'h') input.horn = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      Object.keys(input).forEach((key) => { input[key] = false; });
    };
  }, []);

  return <RigidBody ref={body} colliders={false} position={[0, 1.2, 0]} mass={car.weight / 1000} linearDamping={0.12} angularDamping={2.2} enabledRotations={[false, true, false]} ccd onCollisionEnter={({ other }) => { if (other.rigidBodyObject?.userData?.kind === 'building') onCollision('obstacle'); }}>
    <CuboidCollider args={[0.95, 0.46, 1.8]} />
    <group position={[0, -0.1, 0]}><CarModel color={paint || car.color} type={car.type} wheelStyle={wheelStyle} /></group>
  </RigidBody>;
}

function CameraSetup({ cameraMode }) {
  const { camera } = useThree();
  useEffect(() => { camera.fov = cameraMode === 3 ? 68 : 60; camera.updateProjectionMatrix(); }, [camera, cameraMode]);
  return null;
}

function BuildingColliders({ buildings }) {
  return <>{buildings.map((building, index) => <RigidBody key={index} type="fixed" position={building.position} colliders={false} userData={{ kind: 'building' }}><CuboidCollider args={[building.scale[0] / 2, building.scale[1] / 2, building.scale[2] / 2]} /></RigidBody>)}</>;
}

export default function PhysicsGame({ car, save, mode, speed, careerStage, onTelemetry, onCollision, onRuleViolation, onFinish, cameraMode, paused }) {
  const playerPosition = useRef([0, 1, 0]);
  const upgrades = save.upgrades[car.id] || {};
  const buildings = useMemo(createCityBuildings, []);
  return <>
    <CameraSetup cameraMode={cameraMode} />
    <RoadWorld weather={save.settings.weather} time={save.settings.time} buildings={buildings} />
    <EngineSound enabled={save.settings.sound} speed={speed} />
    <Physics gravity={[0, -9.81, 0]} timeStep="vary" paused={paused}>
      <RigidBody type="fixed" position={[0, -0.52, 0]} userData={{ kind: 'ground' }}><CuboidCollider args={[120, 0.25, 120]} /></RigidBody>
      <BuildingColliders buildings={buildings} />
      <DrivingCar car={car} paint={save.paint[car.id] || car.color} wheelStyle={save.wheels[car.id] || 'Alloy'} upgrade={upgrades} cameraMode={cameraMode} mode={mode} careerStage={careerStage} paused={paused} positionRef={playerPosition} onTelemetry={onTelemetry} onCollision={onCollision} onRuleViolation={onRuleViolation} onFinish={onFinish} />
      <Traffic playerPosition={playerPosition} collision={onCollision} paused={paused} />
    </Physics>
    {mode === 'parking' && <ParkingBay />}
    {(mode === 'trial' || mode === 'career') && <Checkpoint position={mode === 'career' ? -36 - careerStage * 36 : -65} label={mode === 'career' ? `STAGE ${careerStage + 1} / 3` : 'FINISH'} />}
  </>;
}
