import { Howl, Howler } from 'howler';
import { EventEmitter } from 'eventemitter3';
import { Disposable } from '@utils/Disposable';
import type { Engine } from '@core/Engine';
import type { Vector3 } from 'three';

// Audio settings
export interface AudioSettings {
  volume: number;
  muted: boolean;
  spatialScale: number;
}

// Sound effect options
export interface SoundOptions {
  volume?: number;
  loop?: boolean;
  autoplay?: boolean;
  rate?: number;
  spatial?: boolean;
  position?: Vector3;
  maxDistance?: number;
  refDistance?: number;
  rolloffFactor?: number;
}

/**
 * Manages all game audio including music, sound effects, and spatial audio
 */
export class AudioManager extends EventEmitter implements Disposable {
  private _engine: Engine;
  private _sounds: Map<string, Howl> = new Map();
  private _activeSounds: Map<number, { id: string; spatial: boolean }> = new Map();
  private _settings: AudioSettings = {
    volume: 1.0,
    muted: false,
    spatialScale: 1.0
  };
  
  constructor(engine: Engine) {
    super();
    this._engine = engine;
    
    // Configure Howler
    Howler.autoUnlock = true;
    Howler.html5PoolSize = 10;
    
    // Load saved settings if available
    this._loadSettings();
    
    engine.logger.info('AudioManager initialized');
  }

  /**
   * Load audio settings from localStorage
   */
  private _loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem('audio_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this._settings = { ...this._settings, ...parsed };
        
        // Apply loaded settings
        Howler.volume(this._settings.volume);
        Howler.mute(this._settings.muted);
      }
    } catch (error) {
      this._engine.logger.warn('Failed to load audio settings', error);
    }
  }

  /**
   * Save current audio settings to localStorage
   */
  private _saveSettings(): void {
    try {
      localStorage.setItem('audio_settings', JSON.stringify(this._settings));
    } catch (error) {
      this._engine.logger.warn('Failed to save audio settings', error);
    }
  }

  /**
   * Register a sound with the audio manager
   */
  public registerSound(id: string, url: string): void {
    if (this._sounds.has(id)) {
      this._engine.logger.warn(`Sound "${id}" is already registered`);
      return;
    }
    
    const sound = new Howl({
      src: [url],
      preload: false,
      onload: () => {
        this._engine.logger.debug(`Sound loaded: ${id}`);
        this.emit('soundLoaded', id);
      },
      onloaderror: (_, error) => {
        this._engine.logger.error(`Failed to load sound: ${id}`, error);
        this.emit('soundError', id, error);
      }
    });
    
    this._sounds.set(id, sound);
  }

  /**
   * Load a registered sound
   */
  public loadSound(id: string): Promise<void> {
    const sound = this._sounds.get(id);
    if (!sound) {
      return Promise.reject(new Error(`Sound "${id}" not found`));
    }
    
    return new Promise((resolve, reject) => {
      if (sound.state() === 'loaded') {
        resolve();
        return;
      }
      
      sound.once('load', resolve);
      sound.once('loaderror', reject);
      sound.load();
    });
  }

  /**
   * Play a sound with options
   */
  public playSound(id: string, options: SoundOptions = {}): number {
    const sound = this._sounds.get(id);
    if (!sound) {
      this._engine.logger.warn(`Cannot play sound "${id}": Not found`);
      return -1;
    }
    
    // Configure sound properties
    if (options.volume !== undefined) {
      sound.volume(options.volume);
    }
    
    if (options.loop !== undefined) {
      sound.loop(options.loop);
    }
    
    if (options.rate !== undefined) {
      sound.rate(options.rate);
    }
    
    // Configure 3D audio if spatial
    if (options.spatial && options.position) {
      sound.pos(
        options.position.x * this._settings.spatialScale,
        options.position.y * this._settings.spatialScale,
        options.position.z * this._settings.spatialScale
      );
      
      if (options.maxDistance !== undefined) {
        sound.pannerAttr({ maxDistance: options.maxDistance });
      }
      
      if (options.refDistance !== undefined) {
        sound.pannerAttr({ refDistance: options.refDistance });
      }
      
      if (options.rolloffFactor !== undefined) {
        sound.pannerAttr({ rolloffFactor: options.rolloffFactor });
      }
    }
    
    // Play the sound
    const soundId = sound.play();
    
    // Track active sounds
    this._activeSounds.set(soundId, {
      id,
      spatial: options.spatial || false
    });
    
    // Set up cleanup when sound ends
    sound.once('end', () => {
      this._activeSounds.delete(soundId);
    });
    
    return soundId;
  }

  /**
   * Stop a sound by its instance ID
   */
  public stopSound(soundId: number): void {
    const info = this._activeSounds.get(soundId);
    if (!info) return;
    
    const sound = this._sounds.get(info.id);
    if (sound) {
      sound.stop(soundId);
      this._activeSounds.delete(soundId);
    }
  }

  /**
   * Stop all instances of a sound by ID
   */
  public stopAllSoundInstances(id: string): void {
    const sound = this._sounds.get(id);
    if (sound) {
      sound.stop();
      
      // Remove all instances of this sound from active sounds
      Array.from(this._activeSounds.entries())
        .filter(([_, info]) => info.id === id)
        .forEach(([soundId]) => {
          this._activeSounds.delete(soundId);
        });
    }
  }

  /**
   * Stop all sounds
   */
  public stopAllSounds(): void {
    Howler.stop();
    this._activeSounds.clear();
  }

  /**
   * Update spatial audio positions
   */
  public updateSpatialPosition(soundId: number, position: Vector3): void {
    const info = this._activeSounds.get(soundId);
    if (!info || !info.spatial) return;
    
    const sound = this._sounds.get(info.id);
    if (sound) {
      sound.pos(
        position.x * this._settings.spatialScale,
        position.y * this._settings.spatialScale,
        position.z * this._settings.spatialScale,
        soundId
      );
    }
  }

  /**
   * Update listener position (camera position)
   */
  public updateListenerPosition(position: Vector3, direction: Vector3): void {
    Howler.pos(
      position.x * this._settings.spatialScale,
      position.y * this._settings.spatialScale,
      position.z * this._settings.spatialScale
    );
    
    // Set orientation (forward and up vectors)
    Howler.orientation(
      direction.x, direction.y, direction.z, // Forward
      0, 1, 0 // Up vector (y-up)
    );
  }

  /**
   * Set the master volume
   */
  public setVolume(volume: number): void {
    this._settings.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this._settings.volume);
    this._saveSettings();
    this.emit('volumeChanged', this._settings.volume);
  }

  /**
   * Get the current master volume
   */
  public getVolume(): number {
    return this._settings.volume;
  }

  /**
   * Mute/unmute all audio
   */
  public setMuted(muted: boolean): void {
    this._settings.muted = muted;
    Howler.mute(muted);
    this._saveSettings();
    this.emit('mutedChanged', muted);
  }

  /**
   * Check if audio is muted
   */
  public isMuted(): boolean {
    return this._settings.muted;
  }

  /**
   * Set spatial scale factor
   */
  public setSpatialScale(scale: number): void {
    this._settings.spatialScale = scale;
    this._saveSettings();
    
    // This requires updating all active spatial sounds
    this.emit('spatialScaleChanged', scale);
  }

  /**
   * Unload a sound to free memory
   */
  public unloadSound(id: string): void {
    const sound = this._sounds.get(id);
    if (sound) {
      // Stop all instances first
      sound.stop();
      
      // Unload from memory
      sound.unload();
      
      // Remove from active sounds
      Array.from(this._activeSounds.entries())
        .filter(([_, info]) => info.id === id)
        .forEach(([soundId]) => {
          this._activeSounds.delete(soundId);
        });
    }
  }

  /**
   * Dispose of all audio resources
   */
  public dispose(): void {
    // Unload and destroy all sounds
    this._sounds.forEach(sound => {
      sound.stop();
      sound.unload();
    });
    
    this._sounds.clear();
    this._activeSounds.clear();
    
    this.removeAllListeners();
    this._engine.logger.info('AudioManager disposed');
  }
}