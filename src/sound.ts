class SolsticeSynthManager {
  private ctx: AudioContext | null = null;
  private musicIntervalId: any = null;
  private isMuted: boolean = false;
  private masterVolume: GainNode | null = null;
  
  // Current playing music state
  private currentMode: 'DAY' | 'NIGHT' = 'DAY';
  private currentRatio: number = 1.0;

  constructor() {
    // Lazy loaded on first user gesture
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterVolume = this.ctx.createGain();
      this.masterVolume.gain.value = this.isMuted ? 0 : 0.15; // cozy background level
      this.masterVolume.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser', e);
    }
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(mute ? 0 : 0.15, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  // SOUND EFFECTS
  public playJump() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    // swept upwards for standard jumping feel
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
    
    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  public playCollect() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    // double pleasant coin chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(783.99, now + 0.06); // G5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(this.masterVolume || this.ctx.destination);
    
    osc1.start();
    osc1.stop(now + 0.25);
  }

  public playFlip(toNight: boolean) {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(toNight ? 300 : 120, now);
    osc.frequency.exponentialRampToValueAtTime(toNight ? 80 : 450, now + 0.35);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(toNight ? 1200 : 400, now);
    filter.frequency.exponentialRampToValueAtTime(toNight ? 200 : 1500, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    osc.start();
    osc.stop(now + 0.35);
  }

  public playSwitch() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(440, now + 0.05);
    osc.frequency.setValueAtTime(330, now + 0.1);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterVolume || this.ctx.destination);

    osc.start();
    osc.stop(now + 0.2);
  }

  public playWin() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc.connect(gain);
      gain.connect(this.masterVolume || this.ctx!.destination);
      
      osc.start(now + idx * 0.1);
      osc.stop(now + 1.0);
    });
  }

  public playLoss() {
    this.initContext();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [220.00, 207.65, 196.00, 164.81]; // Gloomy descending
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.3, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.masterVolume || this.ctx!.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + 1.2);
    });
  }

  // AMBIENT MUSIC SCHEDULER
  // Plays procedural ambient pads based on current daylight level and time mode.
  public setMusicState(timeMode: 'DAY' | 'NIGHT', daylightRatio: number) {
    this.currentMode = timeMode;
    this.currentRatio = Math.max(0.01, Math.min(1.0, daylightRatio));
    
    if (!this.musicIntervalId) {
      this.startMusicLoop();
    }
  }

  private startMusicLoop() {
    this.initContext();
    
    // Notes for dynamic scales
    // Day: Solstice Sun Melodies (G Major Pentatonic - cheerful, warm, celestial)
    const dayScale = [196.00, 220.00, 246.94, 293.66, 329.63, 392.00]; // G3, A3, B3, D4, E4, G4
    
    // Night: Solstice Shadows (E Minor Pentatonic / Celestial 7ths - reflective, mysterious, silver)
    const nightScale = [164.81, 196.00, 220.00, 246.94, 293.66, 392.00, 440.00]; // E3, G3, A3, B3, D4, G4, A4

    const triggerTones = () => {
      if (!this.ctx || this.isMuted) return;

      const scale = this.currentMode === 'DAY' ? dayScale : nightScale;
      // Synthesize 1-2 concurrent cozy notes
      const notesToPlay = Math.random() > 0.4 ? 2 : 1;
      
      const now = this.ctx.currentTime;
      
      // Decelerate music or mutate tone when daylight ratio is super low!
      // High ratio: faster tempo & brighter filters. Low ratio: slowing, deeper tones.
      for (let i = 0; i < notesToPlay; i++) {
        const randomNote = scale[Math.floor(Math.random() * scale.length)];
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // If daylight is critically low, drop octave or reduce speed
        let pitchScale = 1;
        if (this.currentRatio < 0.25) {
          pitchScale = 0.5; // lower octave
        }

        osc.type = this.currentMode === 'DAY' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(randomNote * pitchScale, now);

        // Filter out bright harmonics as light fades
        filter.type = 'lowpass';
        const baseCutoff = this.currentMode === 'DAY' ? 1200 : 700;
        const dynamicCutoff = baseCutoff * this.currentRatio + 200;
        filter.frequency.setValueAtTime(dynamicCutoff, now);
        filter.Q.setValueAtTime(3, now);

        // Soft slow rise and decay envelope
        const duration = (2.5 + Math.random() * 2.0) * (0.5 + 0.5 * this.currentRatio);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterVolume || this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      }
    };

    // Initial pitch and scale triggering
    triggerTones();

    // Adjust loop repeating time dynamically according to daylight ratio!
    // Fading light = slower ambient breaths.
    const pollInterval = () => {
      const waitTime = (2500 + Math.random() * 1500) * (1.5 - 0.5 * this.currentRatio);
      this.musicIntervalId = setTimeout(() => {
        triggerTones();
        pollInterval();
      }, waitTime);
    };

    pollInterval();
  }

  public stopAmbientMusic() {
    if (this.musicIntervalId) {
      clearTimeout(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}

export const sound = new SolsticeSynthManager();
