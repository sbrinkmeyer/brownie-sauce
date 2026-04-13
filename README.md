# Brownie 2.0

Brownie 2.0 is a compact Electron brown-noise generator with a thin single-row interface.

## Features

- Stereo/Mono mode button
  - Lit: stereo (independent L/R channels)
  - Dim: mono (dual-mono output)
- Center volume slider (1-99)
  - Drag thumb to adjust level
  - Mouse wheel over slider to step volume up/down
- Playback button
  - Lit ON: noise playing
  - Dim OFF: stopped

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Run (Dev)

```bash
npm start
```

## Build Installers

### Local build commands

```bash
npm run dist:mac:x64
npm run dist:mac:arm64
npm run dist:win:x64
npm run dist:linux:appimage
```

Output files are written to the dist/ directory.

### CI workflow (recommended)

A GitHub Actions workflow exists at .github/workflows/build-installers.yml to build:

- macOS DMG (x64, arm64)
- Windows NSIS installer (x64)
- Linux AppImage (x64)

Trigger it from GitHub Actions using "Build Installers" and download artifacts from the run.

## Project Structure

- main.js: Electron main process/window config
- index.html: UI layout + styles
- renderer.js: audio logic, UI behavior, audio worklet source
- tutorial.md: conceptual noise-generation tutorial notes

## Notes

- Unsigned macOS/Windows artifacts may show OS warnings until code signing/notarization is configured.
- Linux AppImage is distro-agnostic for most modern distributions.
