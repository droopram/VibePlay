import { Scene, Camera, PerspectiveCamera, Vector3 } from "three";
import { Disposable } from "@utils/Disposable";
import type { Engine } from "@core/Engine";
import { EventEmitter } from "eventemitter3";

/**
 * Base class for all game scenes
 */
export abstract class GameScene extends Scene implements Disposable {
  protected engine: Engine;

  constructor(engine: Engine) {
    super();
    this.engine = engine;
  }

  /**
   * Called when the scene is loaded and becoming active
   */
  public abstract onActivate(): void;

  /**
   * Called when the scene is being unloaded or becoming inactive
   */
  public abstract onDeactivate(): void;

  /**
   * Update logic for the scene
   */
  public abstract update(deltaTime: number): void;

  /**
   * Clean up resources when scene is destroyed
   */
  public abstract dispose(): void;
}

/**
 * Manages game scenes and cameras
 */
export class SceneManager extends EventEmitter implements Disposable {
  private _engine: Engine;
  private _scenes: Map<string, GameScene> = new Map();
  private _activeSceneId: string | null = null;
  private _defaultCamera: PerspectiveCamera;
  private _activeCamera: Camera;

  /**
   * Get the current active scene
   */
  get activeScene(): GameScene | null {
    return this._activeSceneId
      ? this._scenes.get(this._activeSceneId) || null
      : null;
  }

  /**
   * Get the current active camera
   */
  get activeCamera(): Camera {
    return this._activeCamera;
  }

  /**
   * Set the current active camera
   */
  set activeCamera(camera: Camera) {
    this._activeCamera = camera;
  }

  constructor(engine: Engine) {
    super();
    this._engine = engine;

    // Create default camera
    this._defaultCamera = new PerspectiveCamera(
      75,
      engine.getRenderWidth() / engine.getRenderHeight(),
      0.1,
      1000
    );
    this._defaultCamera.position.set(0, 5, 10);
    this._defaultCamera.lookAt(new Vector3(0, 0, 0));

    this._activeCamera = this._defaultCamera;

    engine.logger.info("SceneManager initialized");
  }

  /**
   * Register a scene with the manager
   */
  public registerScene(id: string, scene: GameScene): void {
    if (this._scenes.has(id)) {
      this._engine.logger.warn(`Scene with id "${id}" already exists`);
      return;
    }

    this._scenes.set(id, scene);
    this._engine.logger.debug(`Scene "${id}" registered`);
  }

  /**
   * Unregister and dispose of a scene
   */
  public unregisterScene(id: string): void {
    const scene = this._scenes.get(id);

    if (!scene) {
      this._engine.logger.warn(`Scene with id "${id}" not found`);
      return;
    }

    if (this._activeSceneId === id) {
      this.activateScene(null);
    }

    scene.dispose();
    this._scenes.delete(id);
    this._engine.logger.debug(`Scene "${id}" unregistered`);
  }

  /**
   * Activate a scene by id
   */
  public activateScene(id: string | null): void {
    // Deactivate current scene if exists
    if (this._activeSceneId) {
      const currentScene = this._scenes.get(this._activeSceneId);
      if (currentScene) {
        currentScene.onDeactivate();
        this.emit("sceneDeactivated", this._activeSceneId);
        this._engine.logger.debug(`Scene "${this._activeSceneId}" deactivated`);
      }
    }

    // Set active scene to null if id is null
    if (id === null) {
      this._activeSceneId = null;
      return;
    }

    // Activate new scene
    const newScene = this._scenes.get(id);

    if (!newScene) {
      this._engine.logger.error(
        `Cannot activate scene: Scene "${id}" not found`
      );
      return;
    }

    this._activeSceneId = id;
    newScene.onActivate();

    this.emit("sceneActivated", id);
    this._engine.logger.debug(`Scene "${id}" activated`);
  }

  /**
   * Update the active scene
   */
  public update(deltaTime: number): void {
    if (this._activeSceneId) {
      const activeScene = this._scenes.get(this._activeSceneId);
      activeScene?.update(deltaTime);
    }
  }

  /**
   * Handle resize events
   */
  public handleResize(width: number, height: number): void {
    // Update default camera aspect ratio
    if (this._defaultCamera) {
      this._defaultCamera.aspect = width / height;
      this._defaultCamera.updateProjectionMatrix();
    }

    // Let the active scene handle resize if it has a custom implementation
    if (this._activeSceneId) {
      const activeScene = this._scenes.get(this._activeSceneId);
      if (activeScene && "handleResize" in activeScene) {
        (activeScene as any).handleResize(width, height);
      }
    }
  }

  /**
   * Dispose of all scenes and resources
   */
  public dispose(): void {
    // Dispose of all scenes
    this._scenes.forEach((scene, id) => {
      scene.dispose();
      this._engine.logger.debug(`Scene "${id}" disposed`);
    });

    this._scenes.clear();
    this._activeSceneId = null;

    this.removeAllListeners();
    this._engine.logger.info("SceneManager disposed");
  }
}
