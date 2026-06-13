import React, { useEffect, useRef, useState } from 'react';
import { LEVELS } from './levels';
import { sound } from './sound';
import { LevelData, TimeState, GameState, Particle, Player, NPC, Tablet } from './types';
import { Sun, Moon, Volume2, VolumeX, RotateCcw, Play, Key, Compass, Award, BookOpen, MessageSquare, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { NPC_PUZZLES, PuzzleQuestion } from './puzzles';

const TILE_SIZE = 40;
const GRAVITY = 0.4;
const FRICTION = 0.85;
const ACCEL = 0.55;
const MAX_SPEED = 4.5;
const JUMP_FORCE = -9.5;
const DASH_FORCE = 11;
const FLAME_CONSUMPTION_RATE_BASE = 0.04; // daylight drain percentage per frame

export default function App() {
  // Game state controllers
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [levels, setLevels] = useState<LevelData[]>(LEVELS);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [timeState, setTimeState] = useState<TimeState>('DAY');
  const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
  
  // Scoring & Stats
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [highScores, setHighScores] = useState<{ [key: number]: number }>({});
  const [daylight, setDaylight] = useState<number>(100); // 0 to 100
  const [score, setScore] = useState<number>(0);
  const [collectedTotal, setCollectedTotal] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Active level instanced values (to trace pickups and switch status)
  const [collectedInLevel, setCollectedInLevel] = useState<string[]>([]);
  const [activatedSwitches, setActivatedSwitches] = useState<string[]>([]);
  const [playerFlamePulse, setPlayerFlamePulse] = useState<number>(1.0);

  // Solstice Puzzle & Help States
  const [activePuzzle, setActivePuzzle] = useState<{
    npcId: string;
    npcName: string;
    avatar: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    daylightReward: number;
    selectedIndex: number | null;
    answered: boolean;
    isCorrect: boolean | null;
  } | null>(null);

  const [solvedPuzzles, setSolvedPuzzles] = useState<string[]>([]);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  // AI Dialogues and Lore State
  const [npcDialogue, setNpcDialogue] = useState<{ npcName: string; text: string; mood: string; loading: boolean } | null>(null);
  const [tabletLore, setTabletLore] = useState<{ tabletId: string; text: string; mood: string; loading: boolean } | null>(null);

  // Canvas details & Player references
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UseRefs to bypass state delays in fast game loop
  const gameStateRef = useRef<GameState>('MENU');
  const currentLevelIndexRef = useRef<number>(0);
  const timeStateRef = useRef<TimeState>('DAY');
  const daylightRef = useRef<number>(100);
  const scoreRef = useRef<number>(0);
  const activePuzzleRef = useRef<boolean>(false);
  const infoOpenRef = useRef<boolean>(false);
  const difficultyRef = useRef<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
  
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 24,
    height: 32,
    isGrounded: false,
    jumpCount: 0,
    flameIntensity: 1.0,
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const particles = useRef<Particle[]>([]);
  const lastTime = useRef<number>(0);
  const dashCooldown = useRef<number>(0);
  const switchInteractionCooldown = useRef<number>(0);

  // Camera scroll offsets
  const camera = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize music, load high scores and unlocked levels
  useEffect(() => {
    // Load local storage
    try {
      const storedUnlocked = localStorage.getItem('solstice_unlocked_levels');
      if (storedUnlocked) {
        setUnlockedLevels(JSON.parse(storedUnlocked));
      }
      const storedHighScores = localStorage.getItem('solstice_highscores');
      if (storedHighScores) {
        setHighScores(JSON.parse(storedHighScores));
      }
      const storedMute = localStorage.getItem('solstice_muted');
      if (storedMute) {
        const parsedMute = JSON.parse(storedMute);
        setIsMuted(parsedMute);
        sound.setMute(parsedMute);
      }
      const storedDifficulty = localStorage.getItem('solstice_difficulty');
      if (storedDifficulty) {
        setDifficulty(storedDifficulty as 'EASY' | 'NORMAL' | 'HARD');
      }
    } catch (e) {
      console.warn("Failed reading from localStorage", e);
    }
  }, []);

  // Update mute state globally
  const handleToggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
    localStorage.setItem('solstice_muted', JSON.stringify(nextMute));
  };

  const handleDifficultyChange = (newDiff: 'EASY' | 'NORMAL' | 'HARD') => {
    setDifficulty(newDiff);
    difficultyRef.current = newDiff;
    try {
      localStorage.setItem('solstice_difficulty', newDiff);
    } catch (e) {
      console.warn("Failed saving difficulty to localStorage", e);
    }
  };

  // Sync refs to make sure key inputs and loop reads always have fresh values
  useEffect(() => {
    gameStateRef.current = gameState;
    currentLevelIndexRef.current = currentLevelIndex;
    timeStateRef.current = timeState;
    daylightRef.current = daylight;
    scoreRef.current = score;
    activePuzzleRef.current = activePuzzle !== null;
    infoOpenRef.current = showHowToPlay;
    difficultyRef.current = difficulty;
  }, [gameState, currentLevelIndex, timeState, daylight, score, activePuzzle, showHowToPlay, difficulty]);

  // Setup level variables & spawn points when starting a new level
  const initLevel = (index: number) => {
    const level = LEVELS[index];
    if (!level) return;

    // Reset player position according to spawn point
    playerRef.current = {
      x: level.startX * TILE_SIZE,
      y: level.startY * TILE_SIZE - TILE_SIZE,
      vx: 0,
      vy: 0,
      width: 24,
      height: 32,
      isGrounded: false,
      jumpCount: 0,
      flameIntensity: 1.0,
    };

    const startDaylight = difficultyRef.current === 'HARD' ? 80 : 100;
    setDaylight(startDaylight);
    daylightRef.current = startDaylight;
    setTimeState('DAY');
    timeStateRef.current = 'DAY';
    setCollectedInLevel([]);
    setActivatedSwitches([]);
    setNpcDialogue(null);
    setTabletLore(null);
    setActivePuzzle(null);
    setShowHowToPlay(false);
    particles.current = [];
    dashCooldown.current = 0;
    
    // Position camera initially
    camera.current = {
      x: playerRef.current.x - (canvasRef.current?.width || 800) / 2,
      y: playerRef.current.y - (canvasRef.current?.height || 450) / 2
    };

    // Trigger Ambient music state on synth manager
    sound.setMusicState('DAY', 1.0);
  };

  // Handle Level Transition
  const selectLevel = (index: number) => {
    setCurrentLevelIndex(index);
    initLevel(index);
    setGameState('PLAYING');
  };

  const handleRestartLevel = () => {
    initLevel(currentLevelIndex);
    setGameState('PLAYING');
    sound.playFlip(false);
  };

  const handlePuzzleAnswer = (optionIndex: number) => {
    setActivePuzzle(prev => {
      if (!prev || prev.answered) return prev;
      const isCorrectChoice = optionIndex === prev.correctIndex;
      if (isCorrectChoice) {
        sound.playCollect();
        setDaylight(d => {
          const next = Math.min(100, d + prev.daylightReward);
          daylightRef.current = next;
          return next;
        });
        setSolvedPuzzles(solved => {
          if (!solved.includes(prev.npcId)) {
            return [...solved, prev.npcId];
          }
          return solved;
        });
        return {
          ...prev,
          selectedIndex: optionIndex,
          answered: true,
          isCorrect: true
        };
      } else {
        sound.playLoss();
        return {
          ...prev,
          selectedIndex: optionIndex,
          answered: true,
          isCorrect: false
        };
      }
    });
  };

  const closePuzzle = () => {
    setActivePuzzle(null);
    keysPressed.current = {};
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const closeHowToPlay = () => {
    setShowHowToPlay(false);
    keysPressed.current = {};
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const toggleHowToPlay = () => {
    if (showHowToPlay) {
      closeHowToPlay();
    } else {
      setShowHowToPlay(true);
    }
  };

  const handleRetryPuzzle = () => {
    setActivePuzzle(prev => {
      if (!prev) return null;
      return {
        ...prev,
        selectedIndex: null,
        answered: false,
        isCorrect: null
      };
    });
  };

  // Keyboard events listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = true;
      keysPressed.current[e.key] = true; // keep both casing

      // If trivia active, trap controls for selections
      if (activePuzzleRef.current) {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          e.preventDefault();
          const optionIndex = parseInt(e.key) - 1;
          handlePuzzleAnswer(optionIndex);
          return;
        }

        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRetryPuzzle();
          return;
        }

        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Close if answered correctly or decided to escape
          closePuzzle();
          return;
        }

        // Support movement keys to dismiss answered puzzles and immediately walk away
        if (activePuzzle && activePuzzle.answered) {
          const lowerK = e.key.toLowerCase();
          if (
            lowerK === 'a' || lowerK === 'd' || lowerK === 'w' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown'
          ) {
            e.preventDefault();
            closePuzzle();
            // Retain the movement key as pressed so they immediately move!
            keysPressed.current[lowerK] = true;
            keysPressed.current[e.key] = true;
            return;
          }
        }
        return;
      }

      // If How to play helper is active
      if (infoOpenRef.current) {
        if (e.key === 'Escape' || k === 'h' || k === 'i') {
          e.preventDefault();
          closeHowToPlay();
        }
        return;
      }

      // Toggle how to play
      if (k === 'h' || k === 'i') {
        if (gameStateRef.current === 'PLAYING') {
          e.preventDefault();
          toggleHowToPlay();
          return;
        }
      }

      // Shorthand actions
      if (gameStateRef.current === 'PLAYING') {
        // Shift, c or 'f' triggers instant sunset/sunrise time-flip
        if (e.key === 'Shift' || k === 'f' || k === 'q') {
          e.preventDefault();
          triggerTimeFlip();
        }

        // Space/W jump
        if (e.key === ' ' || k === 'w' || e.key === 'ArrowUp') {
          e.preventDefault();
          triggerJump();
        }

        // 'e' or Enter to interact with nearby NPCs or Tablets
        if (k === 'e' || e.key === 'Enter') {
          e.preventDefault();
          handleInteractionCommand();
        }

        // Escape keys pauses
        if (e.key === 'Escape') {
          e.preventDefault();
          setGameState('PAUSED');
        }
      } else if (gameStateRef.current === 'PAUSED' && e.key === 'Escape') {
        e.preventDefault();
        setGameState('PLAYING');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentLevelIndex, activePuzzle, showHowToPlay]);

  // Jump Controller
  const triggerJump = () => {
    if (gameStateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    
    // Normal single OR double jump criteria
    if (p.isGrounded) {
      p.vy = JUMP_FORCE;
      p.isGrounded = false;
      p.jumpCount = 1;
      
      // Cost of leaping: slightly reduces daylight relative to effort
      consumeDaylight(2.0, 'jump');
      sound.playJump();
      
      // Spawn burst jump particles
      createBurstParticles(p.x + p.width/2, p.y + p.height, 12, timeStateRef.current === 'DAY' ? '#f59e0b' : '#a78bfa', 'flame');
    } else if (p.jumpCount < 2) {
      // Celestial Double Jump (costs more)
      p.vy = JUMP_FORCE * 0.9;
      p.jumpCount += 1;
      consumeDaylight(3.5, 'double-jump');
      sound.playJump();
      createBurstParticles(p.x + p.width/2, p.y + p.height/2, 16, '#38bdf8', 'star');
    }
  };

  // Daylight reduction helper
  const consumeDaylight = (amount: number, reason?: string) => {
    const diff = difficultyRef.current;
    const diffMultiplier = diff === 'EASY' ? 0.6 : diff === 'HARD' ? 1.4 : 1.0;
    const adjustedAmount = amount * diffMultiplier;

    setDaylight((prev) => {
      const next = Math.max(0, prev - adjustedAmount);
      if (next <= 0) {
        // Trigger timeout defeat!
        setTimeout(() => triggerGameOver(false), 20);
      }
      return next;
    });
  };

  // Add daylight restore
  const restoreDaylight = (amount: number) => {
    setDaylight((prev) => Math.min(100, prev + amount));
  };

  // Flip time states (Sunset / Sunrise)
  const triggerTimeFlip = () => {
    const nextState = timeStateRef.current === 'DAY' ? 'NIGHT' : 'DAY';
    setTimeState(nextState);
    timeStateRef.current = nextState;
    sound.playFlip(nextState === 'NIGHT');

    // Time flip consumes 2.5% fuel to toggle worlds
    consumeDaylight(2.5, 'time-flip');

    // Update synth atmosphere state
    sound.setMusicState(nextState, daylightRef.current / 100);

    // Particle flash on the player location
    const p = playerRef.current;
    createBurstParticles(
      p.x + p.width / 2, 
      p.y + p.height / 2, 
      25, 
      nextState === 'NIGHT' ? '#818cf8' : '#fbbf24', 
      nextState === 'NIGHT' ? 'star' : 'flame'
    );
  };

  // Action / E Key interaction detector
  const handleInteractionCommand = () => {
    const level = LEVELS[currentLevelIndexRef.current];
    const p = playerRef.current;
    
    // Check if player is near any NPC
    const playerGridX = Math.round((p.x + p.width / 2) / TILE_SIZE);
    const playerGridY = Math.round((p.y + p.height / 2) / TILE_SIZE);

    // NPC Check
    const nearNPC = level.npcs.find(npc => 
      Math.abs(npc.gridX - playerGridX) <= 1.8 && Math.abs(npc.gridY - playerGridY) <= 1.8
    );

    if (nearNPC) {
      const puzzle = NPC_PUZZLES[nearNPC.id];
      if (puzzle) {
        const isSolved = solvedPuzzles.includes(nearNPC.id);
        setActivePuzzle({
          npcId: nearNPC.id,
          npcName: nearNPC.name,
          avatar: nearNPC.avatar,
          question: puzzle.question,
          options: puzzle.options,
          correctIndex: puzzle.correctIndex,
          explanation: puzzle.explanation,
          daylightReward: puzzle.daylightReward,
          selectedIndex: isSolved ? puzzle.correctIndex : null,
          answered: isSolved,
          isCorrect: isSolved ? true : null
        });
      }
      triggerNpcDialogue(nearNPC);
      return;
    }

    // Tablet Check
    const nearTablet = level.tablets.find(tab => 
      Math.abs(tab.gridX - playerGridX) <= 1.8 && Math.abs(tab.gridY - playerGridY) <= 1.8
    );

    if (nearTablet) {
      triggerTabletLore(nearTablet);
      return;
    }

    // Switch Interaction manually if we press near it
    const nearSwitchIndex = level.switches.findIndex(sw => 
      !sw.active && Math.abs(sw.gridX - playerGridX) <= 1.5 && Math.abs(sw.gridY - playerGridY) <= 1.5
    );

    if (nearSwitchIndex !== -1) {
      triggerSwitchToggle(nearSwitchIndex);
    }
  };

  const triggerSwitchToggle = (idx: number) => {
    const level = LEVELS[currentLevelIndexRef.current];
    const sw = level.switches[idx];
    if (sw.active) return;

    // Check time condition
    if (sw.timeMode !== 'BOTH' && sw.timeMode !== timeStateRef.current) {
      // Inactive in this dimension
      return;
    }

    sw.active = true;
    sound.playSwitch();
    setActivatedSwitches(prev => [...prev, sw.id]);

    // Create puzzle burst
    createBurstParticles(sw.gridX * TILE_SIZE + TILE_SIZE/2, sw.gridY * TILE_SIZE + TILE_SIZE/2, 15, '#fb7185', 'flame');
  };

  // API Call: Fetch poetic lore inscription for tablets
  const triggerTabletLore = async (tablet: Tablet) => {
    const level = LEVELS[currentLevelIndexRef.current];
    
    // Set a loading initial state with immediate fallback text
    setTabletLore({
      tabletId: tablet.id,
      text: level.loreFallback[tablet.loreId] || "Golden beams intertwine with deep midnight reflections.",
      mood: "ancient",
      loading: true
    });

    try {
      const res = await fetch('/api/gemini/lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelName: level.name,
          tabletId: tablet.id,
          timeState: timeStateRef.current
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTabletLore(prev => prev ? {
          ...prev,
          text: data.text || prev.text,
          mood: data.mood || prev.mood,
          loading: false
        } : null);
      } else {
        setTabletLore(prev => prev ? { ...prev, loading: false } : null);
      }
    } catch (e) {
      console.warn("Tablet lore API request failed, utilizing localized fallback lore.", e);
      setTabletLore(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  // API Call: Fetch spoken dialogue from Geminis characters
  const triggerNpcDialogue = async (npc: NPC) => {
    const level = LEVELS[currentLevelIndexRef.current];

    setNpcDialogue({
      npcName: npc.name,
      text: level.dialogueFallback[npc.dialogueId] || "Keep following the golden stardust, wanderer.",
      mood: "mystical",
      loading: true
    });

    try {
      const res = await fetch('/api/gemini/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcName: npc.name,
          levelName: level.name,
          timeState: timeStateRef.current,
          daylightRemaining: Math.round(daylightRef.current)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNpcDialogue(prev => prev ? {
          ...prev,
          text: data.text || prev.text,
          mood: data.mood || prev.mood,
          loading: false
        } : null);
      } else {
        setNpcDialogue(prev => prev ? { ...prev, loading: false } : null);
      }
    } catch (e) {
      console.warn("NPC dialogue API request failed, relying on fallback.", e);
      setNpcDialogue(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  // Game Defeat
  const triggerGameOver = (conquered: boolean) => {
    setGameState(conquered ? 'VICTORY' : 'GAME_OVER');
    sound.stopAmbientMusic();

    if (conquered) {
      sound.playWin();

      // Save levels progression & top score logic
      const nextLevelIndex = currentLevelIndexRef.current + 1;
      const levelIdToUnlock = nextLevelIndex + 1; // 1-indexed

      let updatedLevels = [...unlockedLevels];
      if (levelIdToUnlock <= LEVELS.length && !unlockedLevels.includes(levelIdToUnlock)) {
        updatedLevels.push(levelIdToUnlock);
        setUnlockedLevels(updatedLevels);
        localStorage.setItem('solstice_unlocked_levels', JSON.stringify(updatedLevels));
      }

      // Calculate final level score
      // Score = (Remaining Daylight * 100) + Items collected bonus
      const calculatedScore = Math.round(daylightRef.current * 100 + collectedInLevel.length * 250);
      setScore(calculatedScore);

      setHighScores(prev => {
        const currentHigh = prev[LEVELS[currentLevelIndexRef.current].id] || 0;
        const nextHigh = Math.max(currentHigh, calculatedScore);
        const nwScores = { ...prev, [LEVELS[currentLevelIndexRef.current].id]: nextHigh };
        localStorage.setItem('solstice_highscores', JSON.stringify(nwScores));
        return nwScores;
      });

      setCollectedTotal(prev => prev + collectedInLevel.length);
    } else {
      sound.playLoss();
    }
  };

  // Spawn visual elements on event triggers
  const createBurstParticles = (
    centerX: number,
    centerY: number,
    count: number,
    color: string,
    type: 'flame' | 'star' | 'wind' | 'collect'
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      particles.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 4,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 35),
        type
      });
    }
  };

  // Main Canvas updates & physical ticking
  useEffect(() => {
    let animationId: any;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle initial resizing constraints as instructed
    const handleResize = () => {
      const container = containerRef.current;
      if (container && canvas) {
        // Keeps aspect ratio close to 16:9
        const width = container.clientWidth;
        const height = Math.min(window.innerHeight * 0.6, width * (9/16));
        canvas.width = Math.max(720, width);
        canvas.height = Math.max(420, height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Ensure first dimensions are drawn
    handleResize();

    const checkTileCollision = (x: number, y: number, w: number, h: number, level: LevelData): boolean => {
      const startX = Math.floor(x / TILE_SIZE);
      const endX = Math.floor((x + w) / TILE_SIZE);
      const startY = Math.floor(y / TILE_SIZE);
      const endY = Math.floor((y + h) / TILE_SIZE);

      for (let tx = startX; tx <= endX; tx++) {
        for (let ty = startY; ty <= endY; ty++) {
          if (tx < 0 || tx >= level.gridWidth || ty >= level.gridHeight) return true; // solid border bounds
          if (ty < 0) continue; // infinite upper sky bounds

          const tile = level.tiles[`${tx},${ty}`];
          if (!tile) continue;

          if (tile === 'SOLID_ALWAYS') return true;
          if (tile === 'SOLID_DAY_ONLY' && timeStateRef.current === 'DAY') return true;
          if (tile === 'SOLID_NIGHT_ONLY' && timeStateRef.current === 'NIGHT') return true;
          if (tile === 'GATE_CLOSED' && !activatedSwitches.includes(`${level.id}-gate`)) {
            // Check if matching level switch is triggerable
            // Quick matching rule: if there are closing structures, check level switches
            const gateIsOpen = level.switches.some(s => s.targetGateId === 'sunset-gate' || s.targetGateId === 'lake-gate' || s.targetGateId === 'forest-gate' || s.targetGateId === 'tower-gate' ? s.active : false);
            if (!gateIsOpen) return true;
          }
        }
      }
      return false;
    };

    const mainGameLoop = (timestamp: number) => {
      if (!lastTime.current) lastTime.current = timestamp;
      const dt = timestamp - lastTime.current;
      lastTime.current = timestamp;

      const level = LEVELS[currentLevelIndexRef.current];
      const p = playerRef.current;

      if (gameStateRef.current === 'PLAYING') {
        if (!activePuzzleRef.current && !infoOpenRef.current) {
          // 1. Drains Daylight slowly over time
          // High levels drain normally, final Sunset level drains extremely fast!
          const multiplier = level.id === 5 ? 1.4 : 1.0;
          const currentRate = FLAME_CONSUMPTION_RATE_BASE * multiplier;
          consumeDaylight(currentRate);

        // 2. Continuous Ambient stardust and sunset weather drifting in backgrounds
        if (Math.random() < 0.2) {
          particles.current.push({
            x: Math.random() * (level.gridWidth * TILE_SIZE),
            y: Math.random() * (level.gridHeight * TILE_SIZE - 200),
            vx: -0.4 + Math.random() * 0.8,
            vy: 0.1 + Math.random() * 0.5,
            color: timeStateRef.current === 'DAY' ? 'rgba(251, 191, 36, 0.45)' : 'rgba(129, 140, 248, 0.4)',
            size: 1 + Math.random() * 3,
            life: 0,
            maxLife: 200 + Math.random() * 150,
            type: timeStateRef.current === 'DAY' ? 'flame' : 'star',
          });
        }

        // 3. Keep player visual flame breathing
        setPlayerFlamePulse(1.0 + Math.sin(timestamp * 0.009) * 0.14);

        // 4. Movement Keys & velocities calculation
        let movedX = false;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
          p.vx -= ACCEL;
          if (p.vx < -MAX_SPEED) p.vx = -MAX_SPEED;
          movedX = true;
          consumeDaylight(0.015); // movement consumes extra energy
        }
        if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
          p.vx += ACCEL;
          if (p.vx > MAX_SPEED) p.vx = MAX_SPEED;
          movedX = true;
          consumeDaylight(0.015);
        }

        // Friction when no key is pushed
        if (!movedX) {
          p.vx *= FRICTION;
          if (Math.abs(p.vx) < 0.1) p.vx = 0;
        }

        // Apply constant gravitational force
        p.vy += GRAVITY;

        // Special Burst Dash! Pressed Shift/C with left/right keys and no cooldown
        if ((keysPressed.current['c'] || keysPressed.current['shift']) && dashCooldown.current <= 0 && (Math.abs(p.vx) > 0.5)) {
          // Dash thrust
          const sign = Math.sign(p.vx) || 1;
          p.vx = DASH_FORCE * sign;
          dashCooldown.current = 50; // frames cooldown
          consumeDaylight(6.0, 'dash');
          sound.playJump();
          createBurstParticles(p.x + p.width/2, p.y + p.height/2, 10, '#ec4899', 'wind');
        }

        if (dashCooldown.current > 0) dashCooldown.current--;

        // 5. Collision checks & adjustments
        // Move along X axis first
        p.x += p.vx;
        if (checkTileCollision(p.x, p.y, p.width, p.height, level)) {
          // Step back
          p.x -= p.vx;
          p.vx = 0;
        }

        // Move along Y axis
        p.y += p.vy;
        p.isGrounded = false;
        if (checkTileCollision(p.x, p.y, p.width, p.height, level)) {
          // step back
          p.y -= p.vy;
          if (p.vy > 0) {
            p.isGrounded = true;
            p.jumpCount = 0; // reset extra double leap counts
          }
          p.vy = 0;
        }

        // 6. Special custom tile triggers (like death Spikes, water hazard, bouncy mushroom spring)
        const playerCenterGridX = Math.floor((p.x + p.width / 2) / TILE_SIZE);
        const playerCenterGridY = Math.floor((p.y + p.height / 2) / TILE_SIZE);

        const currentTile = level.tiles[`${playerCenterGridX},${playerCenterGridY}`] || 'EMPTY';

        // Death Obstacle/Spikes Damage Reset
        // Also check grid overlap coordinates below player feet to make sure spikes hit early!
        const feetGridY = Math.floor((p.y + p.height - 4) / TILE_SIZE);
        const feetTile = level.tiles[`${playerCenterGridX},${feetGridY}`] || 'EMPTY';

        if (currentTile === 'DEATH_OBSTACLE' || feetTile === 'DEATH_OBSTACLE') {
          // Reset player to start, penalize daylight
          p.x = level.startX * TILE_SIZE;
          p.y = level.startY * TILE_SIZE - TILE_SIZE;
          p.vx = 0;
          p.vy = 0;
          consumeDaylight(16.0, 'spike-damage');
          sound.playLoss();
          createBurstParticles(p.x + p.width/2, p.y + p.height/2, 25, '#ef4444', 'flame');
        }

        // Swimming slowing dampener
        if (currentTile === 'WATER' || feetTile === 'WATER') {
          p.vx *= 0.65;
          p.vy = Math.min(2.0, p.vy); // sink slower
          if (keysPressed.current['w'] || keysPressed.current[' '] || keysPressed.current['arrowup']) {
            p.vy = -3.5; // smooth upward swim swimming
          }
        }

        // Mushroom Spring launch
        if (currentTile === 'BOUNCY_MUSHROOM' || feetTile === 'BOUNCY_MUSHROOM') {
          // Night spring is twice as strong, day spring is mild cushion
          const bounceFactor = timeStateRef.current === 'NIGHT' ? 1.6 : 1.0;
          p.vy = JUMP_FORCE * 1.35 * bounceFactor;
          p.isGrounded = false;
          sound.playJump();
          createBurstParticles(p.x + p.width/2, p.y + p.height, 15, '#e0f2fe', 'star');
        }

        // 7. Auto-pressure-plate switch triggering when crossing it
        level.switches.forEach((sw, idx) => {
          if (!sw.active) {
            const rangeX = Math.abs((sw.gridX * TILE_SIZE + TILE_SIZE/2) - (p.x + p.width/2));
            const rangeY = Math.abs((sw.gridY * TILE_SIZE + TILE_SIZE/2) - (p.y + p.height/2));
            if (rangeX < TILE_SIZE * 0.95 && rangeY < TILE_SIZE * 0.95) {
              triggerSwitchToggle(idx);
            }
          }
        });

        // 8. Collectible detection
        level.collectibles.forEach((item) => {
          if (!item.collected && !collectedInLevel.includes(item.id)) {
            const rangeX = Math.abs((item.gridX * TILE_SIZE + TILE_SIZE/2) - (p.x + p.width/2));
            const rangeY = Math.abs((item.gridY * TILE_SIZE + TILE_SIZE/2) - (p.y + p.height/2));
            if (rangeX < TILE_SIZE * 1.1 && rangeY < TILE_SIZE * 1.1) {
              item.collected = true;
              setCollectedInLevel((prev) => [...prev, item.id]);
              sound.playCollect();

              // Large daylight fuel boost to extend solstice minute!
              restoreDaylight(18);
              createBurstParticles(
                item.gridX * TILE_SIZE + TILE_SIZE/2, 
                item.gridY * TILE_SIZE + TILE_SIZE/2, 
                15, 
                item.type === 'SUN_FRAGMENT' ? '#fbbf24' : '#e0f2fe', 
                'collect'
              );
            }
          }
        });

        // 9. Goal beacon checking
        const reachX = Math.abs((level.beaconX * TILE_SIZE + TILE_SIZE/2) - (p.x + p.width/2));
        const reachY = Math.abs((level.beaconY * TILE_SIZE + TILE_SIZE/2) - (p.y + p.height/2));
        if (reachX < TILE_SIZE * 1.3 && reachY < TILE_SIZE * 1.35) {
          triggerGameOver(true);
        }

        // Camera Tracking
        // Centers the player comfortably on screen smoothly
        const targetCamX = p.x - canvas.width / 2;
        const targetCamY = p.y - canvas.height * 0.55;
        
        camera.current.x += (targetCamX - camera.current.x) * 0.08;
        camera.current.y += (targetCamY - camera.current.y) * 0.08;

        // Clamp camera tracking bounds safely so it doesn't move outside level grid space
        camera.current.x = Math.max(0, Math.min(level.gridWidth * TILE_SIZE - canvas.width, camera.current.x));
        camera.current.y = Math.max(0, Math.min(level.gridHeight * TILE_SIZE - canvas.height, camera.current.y));
      }
    }

      // RENDER SECTION
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // A. Deep Atmospheric Background Gradients
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (timeStateRef.current === 'DAY') {
        // Celestial day world solstice: suns gold orange sky
        // Shift colors slightly depending on remaining daylight
        const ratio = daylightRef.current / 100;
        const col1 = `rgba(14, 116, 144, 1.0)`; // deep turquoise blue
        const col2 = `rgba(245, 158, 11, ${0.4 + ratio * 0.5})`; // dynamic rich gold sun ray
        bgGrad.addColorStop(0, '#0284c7');
        bgGrad.addColorStop(1, col2);
      } else {
        // Solstice midnight sky
        bgGrad.addColorStop(0, '#030712'); // black twilight
        bgGrad.addColorStop(0.65, '#1e1b4b'); // deep indigo
        bgGrad.addColorStop(1, '#311042'); // soft purple reflections
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw aesthetic sun rays/lunar beams
      if (timeStateRef.current === 'DAY') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let idx = 0; idx < 4; idx++) {
          ctx.beginPath();
          ctx.moveTo(100 + idx * 180, 0);
          ctx.lineTo(240 + idx * 180, 0);
          ctx.lineTo(50 + idx * 180, canvas.height);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Draw moon crescent outline
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(canvas.width - 120, 80, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Save canvas state before camera panning
      ctx.save();
      ctx.translate(-camera.current.x, -camera.current.y);

      // B. Draw Level Tiles
      for (let tx = 0; tx < level.gridWidth; tx++) {
        for (let ty = 0; ty < level.gridHeight; ty++) {
          const type = level.tiles[`${tx},${ty}`];
          if (!type || type === 'EMPTY') continue;

          const blockX = tx * TILE_SIZE;
          const blockY = ty * TILE_SIZE;

          switch (type) {
            case 'SOLID_ALWAYS':
              // Earthy meadow bricks / stones
              ctx.fillStyle = timeStateRef.current === 'DAY' ? '#334155' : '#1e293b';
              ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
              
              // Top grass trim
              ctx.fillStyle = timeStateRef.current === 'DAY' ? '#047857' : '#312e81';
              ctx.fillRect(blockX, blockY, TILE_SIZE, 6);

              // Stone cracks texture
              ctx.strokeStyle = 'rgba(255,255,255,0.1)';
              ctx.strokeRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
              break;

            case 'SOLID_DAY_ONLY':
              // Solstice golden leaves or sunbeam platforms
              ctx.fillStyle = timeStateRef.current === 'DAY' ? '#d97706' : '#78350f';
              ctx.strokeStyle = timeStateRef.current === 'DAY' ? '#fbbf24' : '#451a03';
              ctx.lineWidth = 1.5;

              if (timeStateRef.current === 'DAY') {
                ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                // Golden core light
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(blockX + TILE_SIZE/3, blockY + TILE_SIZE/3, TILE_SIZE/3, TILE_SIZE/3);
              } else {
                // Dim transparent outline in night world (shows it doesn't exist)
                ctx.globalAlpha = 0.2;
                ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.globalAlpha = 1.0;
              }
              break;

            case 'SOLID_NIGHT_ONLY':
              // Lunar crystal sapphire stones
              ctx.fillStyle = timeStateRef.current === 'NIGHT' ? '#5b21b6' : '#2e1065';
              ctx.strokeStyle = timeStateRef.current === 'NIGHT' ? '#c084fc' : '#1e1b4b';
              ctx.lineWidth = 1.5;

              if (timeStateRef.current === 'NIGHT') {
                ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                // Sparkling purple heart
                ctx.fillStyle = '#f5f3ff';
                ctx.beginPath();
                ctx.arc(blockX + TILE_SIZE/2, blockY + TILE_SIZE/2, 4, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Dim ghost outline in day world
                ctx.globalAlpha = 0.2;
                ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
                ctx.globalAlpha = 1.0;
              }
              break;

            case 'DEATH_OBSTACLE':
              // Deadly ancient spikes spikes
              ctx.fillStyle = '#991b1b'; // deep blood red
              ctx.beginPath();
              // Make 3 nice spiky triangles
              for (let spin = 0; spin < 3; spin++) {
                const sX = blockX + spin * (TILE_SIZE / 3);
                ctx.moveTo(sX, blockY + TILE_SIZE);
                ctx.lineTo(sX + (TILE_SIZE / 6), blockY);
                ctx.lineTo(sX + (TILE_SIZE / 3), blockY + TILE_SIZE);
              }
              ctx.closePath();
              ctx.fill();
              break;

            case 'BOUNCY_MUSHROOM':
              // Bouncy trampoline spore shrooms
              const isNight = timeStateRef.current === 'NIGHT';
              ctx.fillStyle = isNight ? '#9333ea' : '#ec4899'; // purpler under moon
              
              // Draw rounded mushroom head
              ctx.beginPath();
              ctx.arc(blockX + TILE_SIZE/2, blockY + TILE_SIZE, TILE_SIZE/2, Math.PI, 0);
              ctx.fill();

              // draw stem
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(blockX + TILE_SIZE/2 - 4, blockY + TILE_SIZE/2, 8, TILE_SIZE/2);
              
              // Glowing dots on mushroom cap
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(blockX + TILE_SIZE/2, blockY + TILE_SIZE * 0.65, 3, 0, Math.PI*2);
              ctx.arc(blockX + TILE_SIZE/3, blockY + TILE_SIZE * 0.75, 2, 0, Math.PI*2);
              ctx.arc(blockX + TILE_SIZE * 0.7, blockY + TILE_SIZE * 0.75, 2, 0, Math.PI*2);
              ctx.fill();
              break;

            case 'GATE_CLOSED':
              const isGateOpen = activatedSwitches.includes(`${level.id}-gate`) || activatedSwitches.some(s => s.endsWith('-gate'));
              if (!isGateOpen) {
                // Solid glowing force barrier
                ctx.fillStyle = '#06b6d4';
                ctx.fillRect(blockX + 6, blockY, TILE_SIZE - 12, TILE_SIZE);
                
                // Draw horizontal locking patterns
                ctx.strokeStyle = '#e0f7fa';
                ctx.lineWidth = 2;
                ctx.strokeRect(blockX + 8, blockY + 4, TILE_SIZE - 16, TILE_SIZE - 8);
              } else {
                // Open empty pathway outline
                ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
                ctx.lineWidth = 1;
                ctx.strokeRect(blockX + 8, blockY, TILE_SIZE - 16, TILE_SIZE);
              }
              break;

            case 'WATER':
              // Deep rippling blue lake hazards
              ctx.fillStyle = 'rgba(14, 165, 233, 0.5)';
              ctx.fillRect(blockX, blockY, TILE_SIZE, TILE_SIZE);
              
              // Ripple lines on wave surface
              ctx.strokeStyle = 'rgba(255,255,255,0.25)';
              ctx.beginPath();
              ctx.moveTo(blockX, blockY + 4);
              ctx.lineTo(blockX + TILE_SIZE, blockY + 4);
              ctx.stroke();
              break;
          }
        }
      }

      // C. Draw Switches / Plates
      level.switches.forEach((sw) => {
        const swX = sw.gridX * TILE_SIZE;
        const swY = sw.gridY * TILE_SIZE;
        const matchingActive = activatedSwitches.includes(sw.id);
        const isActiveState = sw.timeMode === 'BOTH' || sw.timeMode === timeStateRef.current;

        // Base box
        ctx.fillStyle = '#475569';
        ctx.fillRect(swX + 4, swY + TILE_SIZE - 6, TILE_SIZE - 8, 6);

        // Pressed/Active status plate
        if (matchingActive) {
          ctx.fillStyle = '#10b981'; // Green active beam
          ctx.fillRect(swX + 8, swY + TILE_SIZE - 10, TILE_SIZE - 16, 4);
        } else {
          // Unpressed condition button
          ctx.fillStyle = isActiveState ? '#f43f5e' : '#94a3b8'; // active pinkish, inactive soft gray
          ctx.fillRect(swX + 8, swY + TILE_SIZE - 14, TILE_SIZE - 16, 8);
        }

        // Draw hover letters / guide
        if (!matchingActive && isActiveState) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px Arial';
          ctx.fillText('SWITCH', swX + 2, swY + TILE_SIZE - 20);
        }
      });

      // D. Draw Tablets Inscriptions
      level.tablets.forEach((tablet) => {
        const tabX = tablet.gridX * TILE_SIZE;
        const tabY = tablet.gridY * TILE_SIZE;

        // Draw stone slab tablet artwork
        ctx.fillStyle = '#94a3b8'; // Slate grey stone
        ctx.beginPath();
        ctx.moveTo(tabX + 8, tabY + TILE_SIZE);
        ctx.lineTo(tabX + 8, tabY + 8);
        ctx.lineTo(tabX + TILE_SIZE - 8, tabY + 8);
        ctx.lineTo(tabX + TILE_SIZE - 8, tabY + TILE_SIZE);
        ctx.closePath();
        ctx.fill();

        // draw cute golden glowing ancient runes/glyphs lines
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tabX + 14, tabY + 16);
        ctx.lineTo(tabX + TILE_SIZE - 14, tabY + 16);
        ctx.moveTo(tabX + 12, tabY + 24);
        ctx.lineTo(tabX + TILE_SIZE - 12, tabY + 24);
        ctx.stroke();

        // Speak/Read hint if player stands nearby
        const pLocX = p.x + p.width/2;
        const pLocY = p.y + p.height/2;
        const dst = Math.hypot((tabX + TILE_SIZE/2) - pLocX, (tabY + TILE_SIZE/2) - pLocY);
        if (dst < TILE_SIZE * 1.6) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'semibold 11px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Read [E]', tabX + TILE_SIZE/2, tabY - 14);
        }
      });

      // E. Draw NPCs
      level.npcs.forEach((npc) => {
        const nX = npc.gridX * TILE_SIZE;
        const nY = npc.gridY * TILE_SIZE;

        // Draw soft glowing orb below NPC
        const radial = ctx.createRadialGradient(
          nX + TILE_SIZE/2, nY + TILE_SIZE/2, 2,
          nX + TILE_SIZE/2, nY + TILE_SIZE/2, TILE_SIZE
        );
        radial.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        radial.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(nX + TILE_SIZE/2, nY + TILE_SIZE/2, TILE_SIZE * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw Avatar Emoji/Text nicely centered
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(npc.avatar, nX + TILE_SIZE / 2, nY + TILE_SIZE * 0.82);

        // Check distance to player
        const dst = Math.hypot((nX + TILE_SIZE/2) - (p.x + p.width/2), (nY + TILE_SIZE/2) - (p.y + p.height/2));
        if (dst < TILE_SIZE * 1.6) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'semibold 11px system-ui';
          ctx.fillText(`Speak to ${npc.name} [E]`, nX + TILE_SIZE/2, nY - 12);
        }
      });

      // F. Draw Collectibles (Sun Fragments / Star Fragments)
      level.collectibles.forEach((item) => {
        if (item.collected || collectedInLevel.includes(item.id)) return;

        const pulse = 1.0 + Math.sin(timestamp * 0.007 + item.gridX) * 0.15;
        const itemX = item.gridX * TILE_SIZE + TILE_SIZE / 2;
        const itemY = item.gridY * TILE_SIZE + TILE_SIZE / 2;

        ctx.save();
        ctx.translate(itemX, itemY);
        ctx.scale(pulse, pulse);

        if (item.type === 'SUN_FRAGMENT') {
          // Radiant shining Sun core
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // sunburst spikes edges surrounding diamond
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          for (let sAngle = 0; sAngle < 8; sAngle++) {
            const rot = (sAngle * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(rot) * 8, Math.sin(rot) * 8);
            ctx.lineTo(Math.cos(rot) * 14, Math.sin(rot) * 14);
            ctx.stroke();
          }
        } else {
          // Lunar glowing crescent stardust fragment
          ctx.fillStyle = '#a78bfa';
          ctx.strokeStyle = '#ddd6fe';
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(-4, -6);
          ctx.quadraticCurveTo(4, 0, -4, 6);
          ctx.quadraticCurveTo(0, 0, -4, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      // G. Draw Solstice Goal Beacon
      const bX = level.beaconX * TILE_SIZE + TILE_SIZE / 2;
      const bY = level.beaconY * TILE_SIZE + TILE_SIZE / 2;

      // Draw beautiful beacon pedestal
      ctx.fillStyle = '#475569';
      ctx.fillRect(bX - 20, bY + 10, 40, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bX - 12, bY, 24, 10);

      // Celestial vortex beacon light
      const isNight = timeStateRef.current === 'NIGHT';
      const beaconRadial = ctx.createRadialGradient(bX, bY - 20, 2, bX, bY - 20, 45);
      beaconRadial.addColorStop(0, isNight ? 'rgba(167, 139, 250, 0.95)' : 'rgba(251, 146, 60, 0.95)');
      beaconRadial.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      
      ctx.fillStyle = beaconRadial;
      ctx.beginPath();
      ctx.arc(bX, bY - 20, 45, 0, Math.PI * 2);
      ctx.fill();

      // Spinning crown of stars around Solstice Beacon
      ctx.save();
      ctx.translate(bX, bY - 20);
      ctx.rotate(timestamp * 0.0025);
      ctx.strokeStyle = isNight ? '#ddd6fe' : '#fef08a';
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.restore();

      // H. Draw particles
      particles.current.forEach((part, index) => {
        part.x += part.vx;
        part.y += part.vy;
        part.life++;

        const alpha = Math.max(0, 1 - part.life / part.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = part.color;

        ctx.beginPath();
        if (part.type === 'star') {
          // Draw star diamond sparkle particle shape
          ctx.rect(part.x - part.size, part.y - part.size, part.size*2, part.size*2);
        } else {
          // Flame round particles
          ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();

        // Filter expired
        if (part.life >= part.maxLife) {
          particles.current.splice(index, 1);
        }
      });

      // I. DRAW PLAYER (THE KEEPER SPIRIT FLAME)
      // Visual feedback shows the player as a floating glowing ember flame that grows and shrinks based on daylight resource!
      const flameRadius = Math.max(8, 16 * (daylightRef.current / 100)) * playerFlamePulse;
      
      // Draw shadow trail behind player
      ctx.fillStyle = timeStateRef.current === 'DAY' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(129, 140, 248, 0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.width/2, p.y + p.height - 1, 12, 4, 0, 0, Math.PI*2);
      ctx.fill();

      // Draw gorgeous Solstice Flame Spirit core
      const playerGrad = ctx.createRadialGradient(
        p.x + p.width/2, p.y + p.height/2, 1,
        p.x + p.width/2, p.y + p.height/2, flameRadius + 14
      );
      if (timeStateRef.current === 'DAY') {
        playerGrad.addColorStop(0, '#ffffff'); // super warm white core
        playerGrad.addColorStop(0.35, '#fbbf24'); // sunny golden halo
        playerGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)'); // fire red tail
      } else {
        playerGrad.addColorStop(0, '#ffffff'); // silver core
        playerGrad.addColorStop(0.35, '#818cf8'); // soft indigo starlight moon rays
        playerGrad.addColorStop(1, 'rgba(109, 40, 217, 0.0)'); // deep violet shadow tail
      }
      ctx.fillStyle = playerGrad;
      ctx.beginPath();
      // Draw fluid flame drop shape
      ctx.moveTo(p.x + p.width/2, p.y + 4);
      ctx.bezierCurveTo(p.x - 2, p.y + p.height/2, p.x, p.y + p.height, p.x + p.width/2, p.y + p.height);
      ctx.bezierCurveTo(p.x + p.width + 2, p.y + p.height, p.x + p.width + 2, p.y + p.height/2, p.x + p.width/2, p.y + 4);
      ctx.closePath();
      ctx.fill();

      // Emit flames trail from player feet/tail
      if (Math.random() < 0.35 && (Math.abs(p.vx) > 0.2 || Math.abs(p.vy) > 0.2)) {
        particles.current.push({
          x: p.x + p.width / 2 + (-4 + Math.random() * 8),
          y: p.y + p.height - 4,
          vx: -p.vx * 0.25 + (-0.3 + Math.random() * 0.6),
          vy: -p.vy * 0.25 - (0.1 + Math.random() * 0.4),
          color: timeStateRef.current === 'DAY' ? '#f59e0b' : '#a78bfa',
          size: 2 + Math.random() * 3,
          life: 0,
          maxLife: 20 + Math.random() * 20,
          type: 'flame'
        });
      }

      ctx.restore(); // restore camera offsets translation

      animationId = requestAnimationFrame(mainGameLoop);
    };

    animationId = requestAnimationFrame(mainGameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [currentLevelIndex, activatedSwitches, collectedInLevel]);


  return (
    <div id="game-container" className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. Header Bar controls */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-base font-bold text-slate-950">☀️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              The Last Minute of Daylight
            </h1>
            <p className="text-xs text-slate-400">June Solstice 2D Platformer</p>
          </div>
        </div>

        {/* Dynamic Global Controls */}
        <div className="flex items-center gap-3">
          {gameState === 'PLAYING' && (
            <>
              <div className="hidden sm:flex items-center gap-2 mr-1 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 transition">
                <span className="text-xxs text-slate-400 uppercase font-semibold">Mode:</span>
                <span className={`text-xs font-black font-mono tracking-wider ${
                  difficulty === 'EASY' 
                    ? 'text-emerald-400' 
                    : difficulty === 'HARD' 
                      ? 'text-rose-400' 
                      : 'text-amber-400'
                }`}>
                  {difficulty === 'HARD' ? 'SOLSTICE' : difficulty}
                </span>
              </div>

              <div className="hidden md:flex items-center gap-4 mr-2 bg-slate-900/60 hover:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 transition">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5" /> Stage:
                </span>
                <span className="text-sm font-semibold text-white">{LEVELS[currentLevelIndex].name}</span>
              </div>

              <button
                id="control_info_btn"
                onClick={toggleHowToPlay}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 transition-all flex items-center justify-center cursor-pointer"
                title="How to Play / Solar Lore [H]"
              >
                <Info className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            id="control_mute_btn"
            onClick={handleToggleMute}
            className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all flex items-center justify-center cursor-pointer"
            title={isMuted ? "Unmute Ambient sounds" : "Mute Soundtracks"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {gameState === 'PLAYING' && (
            <>
              <button
                id="control_reset_btn"
                onClick={handleRestartLevel}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all flex items-center justify-center cursor-pointer"
                title="Restart this Stage"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                id="control_pause_btn"
                onClick={() => setGameState('PAUSED')}
                className="px-4 py-2 rounded-lg bg-indigo-950 border border-indigo-800 hover:bg-indigo-900 text-indigo-200 text-sm font-medium transition cursor-pointer"
              >
                Pause
              </button>
            </>
          )}

          {gameState !== 'MENU' && (
            <button
              id="control_menu_btn"
              onClick={() => {
                setGameState('MENU');
                sound.stopAmbientMusic();
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition cursor-pointer"
            >
              Main Menu
            </button>
          )}
        </div>
      </header>

      {/* Main Playable Core Box layout */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
        
        {/* GAME SCREEN 1: MAIN MENU */}
        {gameState === 'MENU' && (
          <div id="game_screen_menu" className="w-full max-w-4xl bg-slate-950/80 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl backdrop-blur-lg relative overflow-hidden flex flex-col items-center">
            {/* Visual background details */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold mb-6 uppercase tracking-wider">
              <Sun className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '12s' }} /> In Honor of the June Solstice
            </div>

            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-400 text-center mb-4 leading-none">
              The Last Minute of Daylight
            </h2>
            <p className="text-slate-400 text-center max-w-xl text-sm md:text-base mb-8">
              The Sun is sinking on the longest day of the year. As the Keeper of the Solstice Flame, you must traverse changing landscape epochs of Light and Night to preserve cyclical eternity.
            </p>

            {/* Quick overview panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
              {/* Controls guide */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-830">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4" /> Solstice Controls
                </h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span>Move Left / Right</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-705 text-xs font-mono">A / D or ◀ / ▶</kbd>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span>Jump / Double Jump</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-705 text-xs font-mono">W or Space</kbd>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span>Time Flip (Day ⇄ Night)</span>
                    <kbd className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-xs font-bold">Shift or F</kbd>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/40 pb-1.5">
                    <span>Action / Read / Speak</span>
                    <kbd className="px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-705 text-xs font-mono">E or Enter</kbd>
                  </li>
                  <li className="flex justify-between text-rose-400">
                    <span className="text-xs italic">*Movement & jumping consume flame daylight!</span>
                  </li>
                </ul>
              </div>

              {/* Solstice Lore mechanics */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-830 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> Solstice Mechanics
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed mb-2">
                    ☀️ <strong className="text-amber-400 font-semibold">Day World:</strong> Golden barriers are active; press sun switches during daylight hours.
                  </p>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    🌙 <strong className="text-indigo-400 font-semibold">Night World:</strong> Deep amethyst stones emerge; step on bouncy mushrooms for celestial heights!
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>✨ Star fragments offer big score boosts</span>
                  <span>🔥 Sun fragments fuel your fire</span>
                </div>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="w-full mb-8 max-w-2xl bg-slate-900/40 p-5 rounded-2xl border border-slate-800/85">
              <h3 className="text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-indigo-400 mb-2 text-center">
                Solstice Difficulty Mode
              </h3>
              <p className="text-center text-slate-400 text-xxs mb-4 leading-normal">
                Determine the vitality of your Solstice Flame. Starting flame levels and daylight decay rates adapt based on this setting.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  id="diff_easy_btn"
                  onClick={() => handleDifficultyChange('EASY')}
                  className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    difficulty === 'EASY'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <Sun className="w-4 h-4 mb-1 text-emerald-400" />
                  <span className="text-xs font-black font-mono tracking-wider">EASY</span>
                  <span className="text-[10px] font-mono mt-0.5 opacity-80">100% Start</span>
                  <span className="text-[9px] font-mono opacity-60">0.6x Decay</span>
                </button>
                <button
                  id="diff_normal_btn"
                  onClick={() => handleDifficultyChange('NORMAL')}
                  className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    difficulty === 'NORMAL'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/40 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <Sun className="w-4 h-4 mb-1 text-amber-400 animate-pulse" />
                  <span className="text-xs font-black font-mono tracking-wider">NORMAL</span>
                  <span className="text-[10px] font-mono mt-0.5 opacity-80">100% Start</span>
                  <span className="text-[9px] font-mono opacity-60">1.0x Decay</span>
                </button>
                <button
                  id="diff_hard_btn"
                  onClick={() => handleDifficultyChange('HARD')}
                  className={`p-3 rounded-xl border transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    difficulty === 'HARD'
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/40 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:border-rose-300 hover:text-slate-350'
                  }`}
                >
                  <Moon className="w-4 h-4 mb-1 text-rose-400" />
                  <span className="text-xs font-black font-mono tracking-wider text-rose-300">SOLSTICE</span>
                  <span className="text-[10px] font-mono mt-0.5 opacity-80">80% Start</span>
                  <span className="text-[9px] font-mono opacity-60">1.4x Decay</span>
                </button>
              </div>
            </div>

            {/* Stage Level Picker */}
            <div className="w-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">
                Select Seasonal Threshold
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                {LEVELS.map((lvl, index) => {
                  const isUnlocked = unlockedLevels.includes(lvl.id);
                  const highScore = highScores[lvl.id] || 0;

                  return (
                    <button
                      key={lvl.id}
                      onClick={() => isUnlocked && selectLevel(index)}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between text-left transition-all relative group cursor-pointer ${
                        isUnlocked 
                          ? 'bg-slate-900 border-indigo-500/20 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'
                          : 'bg-slate-950 border-slate-900 select-none opacity-45 cursor-not-allowed'
                      }`}
                    >
                      <div>
                        <span className="text-xxs font-bold text-indigo-400 tracking-widest block uppercase mb-1">
                          Stage 0{lvl.id}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-tight group-hover:text-amber-400 transition">
                          {lvl.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{lvl.difficulty}</p>
                      </div>

                      {isUnlocked ? (
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-900">
                            Hi: {highScore}
                          </span>
                          <Play className="w-3.5 h-3.5 text-amber-500 group-hover:scale-125 transition" />
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-medium">Locked</span>
                          <span className="text-xs">🔒</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* GAME SCREEN 2: ACTIVE GAME PLAYING */}
        {gameState === 'PLAYING' && (
          <div className="w-full max-w-6xl flex flex-col gap-4">
            
            {/* Top HUD: daylight gauge and score indices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full items-center">
              
              {/* Daylight Meter HUD */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 uppercase font-bold tracking-widest flex items-center gap-1.5">
                    {timeState === 'DAY' ? (
                      <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    )}
                    Daylight Pulse
                  </span>
                  <span className={`text-sm font-black font-mono px-2 py-0.5 rounded ${
                    daylight < 25 ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse' : 'text-amber-400'
                  }`}>
                    {Math.max(0, Math.round(LEVELS[currentLevelIndex].baseTimeLimit * (daylight / 100)))}s ({Math.round(daylight)}%)
                  </span>
                </div>
                
                {/* Visual Bar structure */}
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-75 ${
                      timeState === 'DAY' 
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-300 shadow-[0_0_10px_#f59e0b]' 
                        : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-300 shadow-[0_0_10px_#818cf8]'
                    }`}
                    style={{ width: `${daylight}%` }}
                  />
                </div>
              </div>

              {/* Dimension Switch Quick Indicator Info */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur flex justify-between items-center">
                <div>
                  <span className="text-xxs text-slate-400 uppercase tracking-widest font-semibold block">Era Dimension</span>
                  <span className={`text-base font-bold tracking-wide ${
                    timeState === 'DAY' ? 'text-amber-400' : 'text-indigo-400'
                  }`}>
                    {timeState === 'DAY' ? 'Golden Daylight' : 'Amethyst Moonlight'}
                  </span>
                </div>
                
                <button
                  id="hud_time_flip_btn"
                  onClick={triggerTimeFlip}
                  className={`px-4 py-2 text-xs font-black rounded-lg border uppercase hover:scale-105 transition cursor-pointer flex items-center gap-1.5 ${
                    timeState === 'DAY' 
                      ? 'bg-indigo-950 border-indigo-800 text-indigo-200 shadow-md shadow-indigo-500/10' 
                      : 'bg-amber-950 border-amber-800 text-amber-200'
                  }`}
                >
                  {timeState === 'DAY' ? (
                    <>Sunset <Moon className="w-3.5 h-3.5" /></>
                  ) : (
                    <>Sunrise <Sun className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>

              {/* Items & Status count */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur flex justify-between items-center">
                <div>
                  <span className="text-xxs text-slate-400 uppercase tracking-widest font-semibold block">Solar Fragments</span>
                  <span className="text-base font-bold text-white block">
                    Collected {collectedInLevel.length} / {LEVELS[currentLevelIndex].collectibles.length}
                  </span>
                </div>
                
                <div className="text-right">
                  <span className="text-xxs text-slate-400 uppercase tracking-widest font-semibold block">Base Score</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {Math.round(daylight * 10) + collectedInLevel.length * 150}
                  </span>
                </div>
              </div>
            </div>

            {/* Game Canvas Container wrapper */}
            <div ref={containerRef} className="w-full bg-slate-950 border-2 border-slate-900 hover:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
              <canvas 
                ref={canvasRef} 
                className="w-full block bg-slate-950" 
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Controls Overlay Tips inside corner */}
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-xxs text-slate-300 pointer-events-none flex gap-4 z-10">
                <span><strong className="text-amber-400">[A/D]</strong> Move</span>
                <span><strong className="text-amber-400">[W/Space]</strong> Jump</span>
                <span><strong className="text-pink-500">[Shift/C]</strong> Dash</span>
                <span><strong className="text-indigo-400">[Q/F]</strong> Time Flip</span>
                <span><strong className="text-teal-400">[E]</strong> Talk</span>
                <span><strong className="text-sky-400">[H]</strong> Help</span>
              </div>

              {/* HOW TO PLAY INSTRUCTIONS MODAL */}
              {showHowToPlay && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-20 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-b from-indigo-950/90 to-slate-950/95 p-6 rounded-2xl border border-indigo-700/40 max-w-2xl w-full shadow-2xl relative">
                    <button 
                      onClick={closeHowToPlay}
                      className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/65 px-2 py-1 rounded-lg border border-slate-800 text-xs transition cursor-pointer"
                    >
                      ✕ Close [H]
                    </button>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <HelpCircle className="w-5 h-5 text-sky-400" />
                      <h3 className="text-xl font-bold text-white">How to Play: Solstice Quest</h3>
                    </div>

                    <div className="space-y-4 text-sm text-slate-300">
                      <p className="text-xs">
                        Welcome, Keeper! Your mission is to preserve the cyclical balance by delivering the <strong className="text-amber-400">Solstice Flame</strong> to the goal beacon at the end of each stage.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-905/65 p-4 rounded-xl border border-slate-800/80 text-xs">
                        <div>
                          <h4 className="font-bold text-amber-400 text-xxs uppercase tracking-wider mb-2">Controls Guide</h4>
                          <ul className="space-y-2">
                            <li className="flex justify-between"><span>Move Left / Right:</span> <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">A / D / ◀ / ▶</span></li>
                            <li className="flex justify-between"><span>Jump / Double:</span> <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">W / Space</span></li>
                            <li className="flex justify-between"><span>Time Flip:</span> <span className="font-mono bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px]">Shift / F / Q</span></li>
                            <li className="flex justify-between"><span>Dash Thrust:</span> <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">Shift / C</span></li>
                            <li className="flex justify-between"><span>Interact / Talk:</span> <span className="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[10px]">E / Enter</span></li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-400 text-xxs uppercase tracking-wider mb-2">Solstice Mechanics</h4>
                          <ul className="space-y-1.5 leading-relaxed text-[11px]">
                            <li>☀️ <strong className="text-amber-300">Day World:</strong> Golden barriers are active; press sun switches during daylight hours.</li>
                            <li>🌙 <strong className="text-indigo-300">Night World:</strong> Amethyst crystals emerge; step on bouncy mushrooms for celestial heights!</li>
                            <li>🔄 <strong className="text-pink-400 font-semibold">Tethered Time:</strong> Actions consume daylight energy! Collect sun fragments to refill your flame.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-lg flex items-start gap-2.5">
                        <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-sky-200">
                          <strong className="block text-sky-300 font-bold mb-0.5">☀️ Spiritual Trivia Bonus</strong>
                          Talk to local NPC spirits (`E` or click on them). If you answer their solar question correctly, you will earn a massive <strong className="text-emerald-400 font-semibold">Daylight Time increase (+25s / +25%!)</strong> to aid your quest!
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-800/40 text-center">
                      <button
                        onClick={closeHowToPlay}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition cursor-pointer"
                      >
                        Resume Quest
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SOLSTICE SPIRIT TRIVIA PUZZLE OVERLAY */}
              {activePuzzle && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-b from-indigo-950/95 to-slate-950/98 p-5 rounded-2xl border border-indigo-500/40 max-w-lg w-full shadow-2xl flex flex-col gap-3">
                    
                    <div className="flex items-center gap-3 border-b border-indigo-900/40 pb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-955 flex items-center justify-center text-2xl border border-indigo-500/20 animate-pulse">
                        {activePuzzle.avatar}
                      </div>
                      <div>
                        <h4 className="text-xs uppercase font-bold tracking-widest text-indigo-400">{activePuzzle.npcName}</h4>
                        <span className="text-xxs text-emerald-400 font-medium">✨ Solstice Spirits Trivia</span>
                      </div>

                      {activePuzzle.answered && activePuzzle.isCorrect && (
                        <div className="ml-auto bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xxs px-2 py-0.5 rounded font-black uppercase">
                          Solved
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-slate-300 text-xs italic mb-1">"Help me balance the seasonal cycle, Keeper, and I will intensify your daylight flame..."</p>
                      <h3 className="text-sm font-bold text-white leading-normal">
                        {activePuzzle.question}
                      </h3>
                    </div>

                    {/* Choices Options List */}
                    <div className="flex flex-col gap-2 my-1">
                      {activePuzzle.options.map((option, idx) => {
                        const isSelected = activePuzzle.selectedIndex === idx;
                        
                        let btnStyle = "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800";
                        let indicator = `[${idx + 1}]`;

                        if (activePuzzle.answered) {
                          if (idx === activePuzzle.correctIndex) {
                            btnStyle = "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 cursor-default";
                            indicator = "✓ Correct Answer";
                          } else if (isSelected) {
                            btnStyle = "bg-rose-950/85 border-rose-500/60 text-rose-300 cursor-default";
                            indicator = "✗ Incorrect Choice";
                          } else {
                            btnStyle = "bg-slate-950/40 text-slate-600 border-slate-900 opacity-50 cursor-default";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            disabled={activePuzzle.answered}
                            onClick={() => handlePuzzleAnswer(idx)}
                            className={`p-2.5 rounded-xl border text-xs text-left font-medium transition duration-150 flex items-center justify-between cursor-pointer ${btnStyle}`}
                          >
                            <span>{option}</span>
                            <span className="text-xxs font-mono uppercase tracking-widest bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/40">
                              {indicator}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanations Feedback */}
                    {activePuzzle.answered && (
                      <div className={`p-3 rounded-xl border text-xxs leading-relaxed animate-in slide-in-from-bottom duration-200 ${
                        activePuzzle.isCorrect 
                          ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      }`}>
                        <div className="font-bold mb-0.5 uppercase tracking-wider text-xxs">
                          {activePuzzle.isCorrect ? "🔥 Solstice Power Intensified!" : "⚡ Incorrect alignment"}
                        </div>
                        <p>{activePuzzle.isCorrect ? activePuzzle.explanation : "The spirits' flame gutters... That is not the true celestial alignment. Do not fear, try again to prove your seasonal wisdom!"}</p>
                        {activePuzzle.isCorrect && (
                          <span className="block mt-1 font-black text-emerald-400 text-xxs">
                            Daylight level replenished (+{activePuzzle.daylightReward}% flame power!)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom row actions */}
                    <div className="flex gap-3 justify-end border-t border-indigo-900/20 pt-2.5 mt-0.5">
                      {activePuzzle.answered && !activePuzzle.isCorrect && (
                        <button
                          onClick={handleRetryPuzzle}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Try Again [R]
                        </button>
                      )}
                      
                      <button
                        onClick={closePuzzle}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-xs transition cursor-pointer"
                      >
                        {activePuzzle.isCorrect ? "Continue [Enter]" : "Close [Esc]"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DYNAMIC LOWER SUB-HUD PANELS (NPC/TABLET VIEWER INTEGRATION) */}
            {npcDialogue && (
              <div id="hud_npc_panel" className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl border border-indigo-700/40 shadow-xl flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-950 rounded-xl border border-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0 animate-bounce">
                  ✨
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-indigo-400 uppercase">{npcDialogue.npcName}</span>
                    {npcDialogue.loading && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded animate-pulse">
                        Listening to Gemini...
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-400 uppercase italic">NPCDialogue</span>
                  </div>
                  <p className="text-sm md:text-base text-indigo-100 font-medium">
                    "{npcDialogue.text}"
                  </p>
                  <p className="text-xxs text-slate-500 mt-2">
                    Character is feeling <span className="text-amber-400 font-semibold">{npcDialogue.mood}</span>. Press any movement keys to continue.
                  </p>
                </div>
              </div>
            )}

            {tabletLore && (
              <div id="hud_tablet_panel" className="bg-gradient-to-r from-slate-900 to-slate-950 p-5 rounded-2xl border border-amber-600/30 shadow-xl flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-950/50 rounded-xl border border-amber-500/20 flex items-center justify-center text-lg text-amber-400 flex-shrink-0">
                  📜
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold text-amber-500 uppercase">Ancient Rune Tablet Inscription</span>
                    {tabletLore.loading && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded animate-pulse">
                        Translating Glyphs...
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-slate-400 uppercase italic">TabletLore</span>
                  </div>
                  <p className="text-sm md:text-base text-amber-100 font-serif leading-relaxed italic">
                    "{tabletLore.text}"
                  </p>
                  <p className="text-xxs text-slate-500 mt-2">
                    Emanating an atmosphere of <span className="text-indigo-400 font-semibold">{tabletLore.mood}</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME SCREEN 3: PAUSE CONSOLE */}
        {gameState === 'PAUSED' && (
          <div id="game_screen_paused" className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold text-white mb-2">Stage Suspended</h3>
            <p className="text-xs text-indigo-400 uppercase tracking-widest font-semibold mb-6">Solstice Day cycle paused</p>

            <div className="flex flex-col gap-3 w-full">
              <button
                id="btn_resume"
                onClick={() => setGameState('PLAYING')}
                className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
              >
                Resume Quest
              </button>
              
              <button
                id="btn_restart"
                onClick={handleRestartLevel}
                className="w-full py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
              >
                Restart Level
              </button>

              <button
                onClick={() => {
                  setGameState('MENU');
                  sound.stopAmbientMusic();
                }}
                className="w-full py-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 font-semibold transition cursor-pointer"
              >
                Main Menu
              </button>
            </div>
          </div>
        )}

        {/* GAME SCREEN 4: DEFEAT - RUN OUT OF LIGHT */}
        {gameState === 'GAME_OVER' && (
          <div id="game_screen_game_over" className="w-full max-w-lg bg-slate-950 border border-rose-900/30 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute -top-12 w-40 h-40 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-2xl mb-4 animate-pulse">
              🌑
            </div>

            <h3 className="text-3xl font-black tracking-tight text-rose-500 mb-2">The Flame Faded</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              Your daylight fuel collapsed. The solstice ember decayed into absolute dark before reaching the beacon. Try again to preserve the cycle.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                id="btn_retry_level"
                onClick={handleRestartLevel}
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Try Again
              </button>

              <button
                onClick={() => setGameState('MENU')}
                className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold transition cursor-pointer"
              >
                Back to Stage List
              </button>
            </div>
          </div>
        )}

        {/* GAME SCREEN 5: VICTORY SCREEN */}
        {gameState === 'VICTORY' && (
          <div id="game_screen_victory" className="w-full max-w-xl bg-slate-950 border-2 border-emerald-500/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500"></div>
            
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-emerald-500/10">
              👑
            </div>

            <h3 className="text-3xl font-black tracking-tight text-emerald-400 mb-1">Solstice Beacon Kindle!</h3>
            <p className="text-xs uppercase tracking-widest text-[#a7f3d0] font-bold mb-6">
              You Have Preserved the Longest Day
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full mb-6 grid grid-cols-3 gap-2">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Remaining Light</span>
                <span className="text-lg font-black text-amber-400 font-mono">{Math.round(daylight)}%</span>
              </div>
              <div className="text-center border-l border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Fragments collected</span>
                <span className="text-lg font-black text-indigo-400 font-mono">{collectedInLevel.length}</span>
              </div>
              <div className="text-center border-l border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Final Score</span>
                <span className="text-lg font-black text-white font-mono">{score}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              {currentLevelIndex < LEVELS.length - 1 ? (
                <button
                  id="btn_next_level"
                  onClick={() => selectLevel(currentLevelIndex + 1)}
                  className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  Advance to Next Stage ➔
                </button>
              ) : (
                <div className="p-3 bg-indigo-950/30 rounded-lg text-indigo-300 border border-indigo-900 text-xs w-full mb-3">
                  🎉 Supreme Victory! You have conquered all stages of the Solstice Spires!
                </div>
              )}

              <button
                onClick={() => setGameState('MENU')}
                className="px-6 py-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-350 font-semibold transition cursor-pointer"
              >
                Menu Selection
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Static Footer */}
      <footer className="text-center py-4 border-t border-slate-900 text-xxs text-slate-500 tracking-wider">
        THE LAST MINUTE OF DAYLIGHT © {new Date().getFullYear()} — EXPERIENCING SOLSTICE CYCLE STABILITY
      </footer>
    </div>
  );
}
