import { Clock } from "three";
import { EventEmitter } from "eventemitter3";
import { SceneManager } from "@core/SceneManager";
import { RendererManager } from "@core/RendererManager";
import { AssetManager } from "@systems/assets/AssetManager";
import { InputManager } from "@systems/input/InputManager";
import { AudioManager } from "@systems/audio/AudioManager";
import { Logger } from "@utils/Logger";
import { Config, defaultConfig } from "@core/Config";
import { SystemManager } from "@core/SystemManager";

/**
 * Core Engine class that manages the main game loop and systems
 */
export class Engine extends EventEmitter {
  private static _instance: Engine;
  private _isRunning = false;
  private _clock: Clock = new Clock();
  private _lastTime = 0;
  private _config: Config = { ...defaultConfig };

  public sceneManager!: SceneManager;
  public rendererManager!: RendererManager;
  public assetManager!: AssetManager;
  public inputManager!: InputManager;
  public audioManager!: AudioManager;
  public systemManager!: SystemManager;
  public logger!: Logger;

  constructor(config: Partial<Config> = {}) {
    super();

    if (Engine._instance) {
      return Engine._instance;
    }

    Engine._instance = this;
    this._config = { ...defaultConfig, ...config };
    this._clock = new Clock();

    // Initialize core systems
    this.logger = new Logger(this._config.logLevel);
    this.rendererManager = new RendererManager(this);
    this.sceneManager = new SceneManager(this);
    this.assetManager = new AssetManager(this);
    this.inputManager = new InputManager(this);
    this.audioManager = new AudioManager(this);
    this.systemManager = new SystemManager(this);

    // Make config property accessible
    this._config = this._config as Config;

    this.logger.info("Engine initialized");
  }

  /**
   * Start the engine and begin the game loop
   */
  public start(): void {
    if (this._isRunning) return;

    this._isRunning = true;
    this._clock.start();
    this._lastTime = this._clock.getElapsedTime();

    this.emit("start");
    this.logger.info("Engine started");

    // Start animation loop
    this._tick();
  }

  /**
   * Stop the engine and game loop
   */
  public stop(): void {
    if (!this._isRunning) return;

    this._isRunning = false;
    this._clock.stop();

    this.emit("stop");
    this.logger.info("Engine stopped");
  }

  /**
   * Main engine loop
   */
  private _tick = (): void => {
    if (!this._isRunning) return;

    // Calculate delta time
    const currentTime = this._clock.getElapsedTime();
    const deltaTime = currentTime - this._lastTime;
    this._lastTime = currentTime;

    // Pre-update phase
    this.emit("preUpdate", deltaTime);

    // Update all systems
    this.systemManager.update(deltaTime);
    this.inputManager.update();
    this.sceneManager.update(deltaTime);

    // Post-update phase
    this.emit("postUpdate", deltaTime);

    // Render
    this.rendererManager.render();

    // Schedule next frame
    requestAnimationFrame(this._tick);
  };

  /**
   * Clean up and dispose of all resources
   */
  public dispose(): void {
    this.stop();

    this.rendererManager.dispose();
    this.sceneManager.dispose();
    this.assetManager.dispose();
    this.inputManager.dispose();
    this.audioManager.dispose();
    this.systemManager.dispose();

    this.removeAllListeners();
    this.logger.info("Engine disposed");
  }

  /**
   * Get access to the engine singleton
   */
  public static getInstance(): Engine {
    if (!Engine._instance) {
      Engine._instance = new Engine();
    }
    return Engine._instance;
  }

  /**
   * Check if debug mode is enabled
   */
  public isDebugMode(): boolean {
    return this._config.debugMode;
  }

  /**
   * Get render width configuration
   */
  public getRenderWidth(): number {
    return this._config.renderWidth;
  }

  /**
   * Get render height configuration
   */
  public getRenderHeight(): number {
    return this._config.renderHeight;
  }

  /**
   * Get pixel ratio configuration
   */
  public getPixelRatio(): number {
    return this._config.pixelRatio;
  }

  /**
   * Check if shadows are enabled
   */
  public areShadowsEnabled(): boolean {
    return this._config.shadows;
  }

  /**
   * Check if antialias is enabled
   */
  public isAntialiasEnabled(): boolean {
    return this._config.antialias;
  }

  /**
   * Check if FPS display is enabled
   */
  public isShowFPSEnabled(): boolean {
    return this._config.showFPS;
  }

  /**
   * Check if auto resize is enabled
   */
  public isAutoResizeEnabled(): boolean {
    return this._config.autoResizeEnabled;
  }
}
