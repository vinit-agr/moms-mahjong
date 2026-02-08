/**
 * SoundManager - Generates pleasant Mahjong-style sounds using Web Audio API
 * No external files needed - all sounds are procedurally generated
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  constructor() {
    // AudioContext must be created after user interaction on mobile
  }

  /**
   * Initialize audio context - call after first user interaction
   */
  public init(): void {
    if (this.initialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // Create master gain for overall volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
      
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  /**
   * Resume audio context (needed after page visibility change on mobile)
   */
  public resume(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Tile click/select - soft wood "clack" sound
   */
  public playClick(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const now = this.audioContext.currentTime;
    
    // Create noise for wood texture
    const bufferSize = this.audioContext.sampleRate * 0.05;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      noise[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // Bandpass filter for wood-like tone
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    
    // Quick envelope for percussive sound
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noiseSource.start(now);
    noiseSource.stop(now + 0.1);
  }

  /**
   * Tile match - pleasant chime/bell (bamboo wind chimes)
   */
  public playMatch(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const now = this.audioContext.currentTime;
    
    // Pentatonic scale notes - C5, E5, G5 (Hz)
    const frequencies = [523.25, 659.25, 783.99];
    
    frequencies.forEach((freq, i) => {
      // Main tone
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Harmonic for richness
      const osc2 = this.audioContext!.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2.5;
      
      // Envelope for bell-like decay
      const gain = this.audioContext!.createGain();
      const gain2 = this.audioContext!.createGain();
      
      const startTime = now + i * 0.08;
      
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      gain2.gain.setValueAtTime(0.08, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
      
      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(this.masterGain!);
      gain2.connect(this.masterGain!);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
      osc2.start(startTime);
      osc2.stop(startTime + 0.3);
    });
  }

  /**
   * Invalid move/shake - soft thud
   */
  public playInvalid(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const now = this.audioContext.currentTime;
    
    // Low frequency thump
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Game win - celebratory ascending tones
   */
  public playWin(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const now = this.audioContext.currentTime;
    
    // Major chord arpeggio ascending - C5, E5, G5, C6
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const osc2 = this.audioContext!.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 1.5;
      
      const gain = this.audioContext!.createGain();
      const startTime = now + i * 0.15;
      
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(startTime);
      osc.stop(startTime + 0.7);
      osc2.start(startTime);
      osc2.stop(startTime + 0.5);
    });
  }

  /**
   * Game over - gentle descending tone
   */
  public playGameOver(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.resume();

    const now = this.audioContext.currentTime;
    
    // Descending notes - G4, E4, C4
    const frequencies = [392.00, 329.63, 261.63];
    
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const gain = this.audioContext!.createGain();
      const startTime = now + i * 0.25;
      
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }
}

/**
 * VibrationManager - Haptic feedback for mobile devices
 */
export class VibrationManager {
  private supported: boolean;

  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  private vibrate(pattern: number | number[]): void {
    if (this.supported) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently ignore - some browsers block vibration
      }
    }
  }

  /** Tile click - very short tap */
  public click(): void {
    this.vibrate(10);
  }

  /** Match found - double pulse */
  public match(): void {
    this.vibrate([20, 10, 20]);
  }

  /** Invalid move - single slightly longer */
  public invalid(): void {
    this.vibrate(30);
  }

  /** Win celebration - happy pattern */
  public win(): void {
    this.vibrate([50, 30, 50, 30, 100]);
  }

  /** Game over - single long */
  public gameOver(): void {
    this.vibrate(100);
  }
}
