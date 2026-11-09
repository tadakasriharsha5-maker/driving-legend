# Drive Legends 3D

An original, browser-based city driving game built with React, Vite, Three.js,
React Three Fiber, and Rapier. The city, vehicles, traffic, and interface are
generated in the project; no external game assets are required.

## Run locally

```bash
npm install
npm run dev
```

For a production build, run `npm run build` and serve the generated `dist/`
directory with a static web server.

## Play

- **W / Up:** accelerate
- **S / Down:** brake, then reverse
- **A / Left** and **D / Right:** steer
- **Space:** handbrake
- **H:** horn
- **C:** cycle chase, cockpit, hood, and top-down cameras
- **R:** reset the car
- **Escape:** pause

Touch controls are shown in-game and include steering, handbrake, horn, brake,
and accelerator. Enable the optional steering wheel in Settings.

Free Drive is unlimited. Parking, Traffic, Time Trial, and Career runs have
timers and route/parking objectives. Credits, XP, unlocked cars, tuning, paint,
wheels, and settings are stored in browser `localStorage`.
