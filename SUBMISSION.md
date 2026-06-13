- *This is a submission for the [June Solstice Game Jam](https://dev.to/challenges/june-game-jam-2026-06-03)*

# Solstice Quest: Keeper of the Flame

## What I Built
**Solstice Quest: Keeper of the Flame** is an atmospheric, multi-level 2D puzzle-platformer built on the theme of cosmic and cyclical balance. Players step into the shoes of the *Keeper*, tasked with carrying the volatile **Solstice Flame** through ancient, shifting ruins and delivering it to solar beacons before it gutters out.

### Temporal Dual-World Mechanics
The core mechanic is the **Time Flip**—the ability to dynamically swap the environment between **Day** and **Night**:
- **☀️ The Day World:** Activates golden light barriers, opens solar-powered gates, and reveals sun switches that must be pressed to advance.
- **🌙 The Night World:** Coaxes luminous amethyst crystals from the ground, unlocks dark passages, and sprouts magical bouncy mushrooms that launch the Keeper to celestial heights.

Every movement, jump, dash, and cosmic shift drains the flame's **Daylight Energy**. Players must gather dispersed Solar Fragments to feed the flame, or interact with ancient spirits to prove their celestial wisdom.

---

## Video Demo
<!-- Share a video demo of your game in action. Embed here or add as a cover video. We strongly encourage you to include a voiceover describing your game and showing off additional context you'd like the judge to know about. -->
*(Insert your video walk-through, gameplay GIF, or screen recording here! Show off the fluid transitions between Day and Night, the responsive double-jump particles, and answering spirit trivia.)*

---

## Code
The complete, production-ready codebase is built with modularity and type-safety:
- **Playable Game URL:** [AISTUDIO_PREVIEW_URL] (See Development / Shared links)
- **Primary Source Files:**
  - `src/App.tsx`: Handles complex game loops, canvas rendering, state machine controls, and dialogue overlays.
  - `src/levels.ts`: Features fully hand-crafted, multi-stage levels with dynamic obstacles, doors, switches, and spawn points.
  - `src/puzzles.ts`: Declarative system for solar and astronomical physics trivia parsed recursively by the game state.
  - `src/types.ts`: Strictly-typed interfaces representing Physics, Player Coordinates, NPCs, and Render Particles.

---

## How I Built It
Solstice Quest was engineered from scratch without heavy engine overlays to ensure lightning-fast loading, smooth frames, and absolute precision:

### 1. Hybrid 2D Physics Vector Loop
- Configured a dedicated `requestAnimationFrame` render/physics handler over an HTML5 canvas. 
- Implemented real-time sub-pixel collision resolution, momentum retention, double-jumping, visual target tracking cameras, and gravity decay.
- Built a particle-spawning engine utilizing wind currents and vertical velocity to leave a tail of trailing stardust or glowing solar embers depending on the current time state.

### 2. Temporal State Machine
- Created a synchronized time-management array linking player interaction states to the active tile map. Barriers, crystal hazards, and switches instantaneously toggle collision layers on/off when the player triggers a **Time Flip**.
- Integrated keyboard listeners permitting advanced players to tap `Shift`, `C`, or `F` for rapid, high-speed movement flow.

### 3. Solstice Spirits Trivia Engine
- Built a comprehensive educational trivia module focusing on Earth axis tilts, lightspeed travel physics, pigments, and solar mechanics. 
- Designed a non-blocking UI overlay with key-trap shortcuts (`1`/`2`/`3` selections, `R` to retry, and movement keys (`WASD` / arrows) to seamlessly dismiss solved questions), preventing game loop freeze and allowing players to immediately resume physical movement.

### 4. Difficulty Calibration Engine
- Integrated an offline-persistent **Difficulty Selector** into the main menu allowing players to choose their level of challenge (**Easy**, **Normal**, **Solstice/Hard**).
- Modulates starting resource pools (e.g., 80% on Solstice Mode) and adjusts decay thresholds dynamically (up to 1.4x decay rate penalty), saved straight to `localStorage`.

---

## Prize Category
### 1. Best Google AI Usage
The game utilizes **Google Gemini API** integration through interactive, real-time-generated dialogues with local spirits and dynamic, context-appropriate ancient stone tablets (lore markers) hidden throughout the stages. This goes beyond static text, injecting personalized narrative and mystical lore into the game mechanics itself depending on the Keeper's progress and current level layout!

### 2. June Solstice Theme (Overall Game Jam)
Built from the ground up prioritizing the solstice seasonal transition. Gameplay directly hinges on the physical parameters of our solar cycle: seasonal tilts, solar hours, and the delicate equilibrium between light and dark.
