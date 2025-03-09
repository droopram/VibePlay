import { EventEmitter } from "eventemitter3";
import {
  Texture,
  AudioLoader,
  TextureLoader,
  CubeTextureLoader,
  LoadingManager,
  Material,
  Mesh,
  Group,
  BufferGeometry,
} from "three";
// Add type definitions for GLTF and GLTFLoader since the module can't be resolved
type GLTF = {
  scene: Group;
  scenes: Group[];
  cameras: any[];
  animations: any[];
  asset: any;
  parser: any;
};

// Mock GLTFLoader for now
// @ts-ignore - Ignoring unused parameters to satisfy the interface
class GLTFLoader {
  // @ts-ignore - Ignoring unused parameter
  constructor(loadingManager?: LoadingManager) {
    // This will be replaced with the actual implementation
  }

  // @ts-ignore - Ignoring unused parameters
  load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): void {
    // This will be replaced with the actual implementation
  }
}

import { Disposable } from "@utils/Disposable";
import type { Engine } from "@core/Engine";

/**
 * Asset types supported by the AssetManager
 */
export type AssetType = "texture" | "cubeTexture" | "model" | "audio" | "json";

/**
 * Interface for assets that require disposing
 */
export interface DisposableAsset extends Disposable {
  isDisposed: boolean;
}

/**
 * Generic asset caching structure
 */
export interface AssetCache<T> {
  asset: T;
  url: string;
  refCount: number;
  lastUsed: number;
}

/**
 * Manages loading, caching, and disposing of game assets
 */
export class AssetManager extends EventEmitter implements Disposable {
  private _engine: Engine;
  private _loadingManager: LoadingManager;
  private _textureLoader: TextureLoader;
  private _cubeTextureLoader: CubeTextureLoader;
  private _gltfLoader: GLTFLoader;
  private _audioLoader: AudioLoader;

  // Caches for different asset types
  private _textureCache: Map<string, AssetCache<Texture>> = new Map();
  private _cubeTextureCache: Map<string, AssetCache<Texture>> = new Map();
  private _modelCache: Map<string, AssetCache<GLTF>> = new Map();
  private _audioCache: Map<string, AssetCache<AudioBuffer>> = new Map();
  private _jsonCache: Map<string, AssetCache<unknown>> = new Map();

  // Queues for prioritized loading
  private _highPriorityQueue: Array<() => Promise<void>> = [];
  private _normalPriorityQueue: Array<() => Promise<void>> = [];
  private _lowPriorityQueue: Array<() => Promise<void>> = [];

  private _isLoading = false;
  private _concurrentLoads = 0;
  private _maxConcurrentLoads = 4;

  constructor(engine: Engine) {
    super();
    this._engine = engine;

    // Create loading manager
    this._loadingManager = new LoadingManager();
    this._loadingManager.onProgress = (url, loaded, total) => {
      this.emit("progress", { url, loaded, total });
    };

    // Initialize loaders
    this._textureLoader = new TextureLoader(this._loadingManager);
    this._cubeTextureLoader = new CubeTextureLoader(this._loadingManager);
    this._gltfLoader = new GLTFLoader(this._loadingManager);
    this._audioLoader = new AudioLoader(this._loadingManager);

    // Start processing the queue
    this._processQueues();

    engine.logger.info("AssetManager initialized");
  }

  /**
   * Load a texture with automatic caching
   */
  public loadTexture(
    url: string,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<Texture> {
    // Check cache first
    const cached = this._textureCache.get(url);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return Promise.resolve(cached.asset);
    }

    // Create a loading promise
    const loadPromise = () =>
      new Promise<Texture>((resolve, reject) => {
        this._textureLoader.load(
          url,
          (texture) => {
            // Store in cache
            this._textureCache.set(url, {
              asset: texture,
              url,
              refCount: 1,
              lastUsed: Date.now(),
            });

            resolve(texture);
            this._engine.logger.debug(`Texture loaded: ${url}`);
          },
          undefined,
          (error) => {
            this._engine.logger.error(`Failed to load texture: ${url}`, error);
            reject(error);
          }
        );
      });

    // Add to appropriate queue
    this._addToQueue(loadPromise, priority);

    // Return a promise that will resolve when the asset is loaded
    return new Promise((resolve, reject) => {
      this.once(`loaded:${url}`, (texture: Texture) => resolve(texture));
      this.once(`error:${url}`, (error: Error) => reject(error));
    });
  }

  /**
   * Load a cube texture with automatic caching
   */
  public loadCubeTexture(
    urls: string[],
    name: string,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<Texture> {
    // Check cache first
    const cached = this._cubeTextureCache.get(name);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return Promise.resolve(cached.asset);
    }

    // Create a loading promise
    const loadPromise = () =>
      new Promise<Texture>((resolve, reject) => {
        this._cubeTextureLoader.load(
          urls,
          (texture) => {
            // Store in cache
            this._cubeTextureCache.set(name, {
              asset: texture,
              url: name,
              refCount: 1,
              lastUsed: Date.now(),
            });

            resolve(texture);
            this._engine.logger.debug(`Cube texture loaded: ${name}`);
          },
          undefined,
          (error) => {
            this._engine.logger.error(
              `Failed to load cube texture: ${name}`,
              error
            );
            reject(error);
          }
        );
      });

    // Add to appropriate queue
    this._addToQueue(loadPromise, priority);

    // Return a promise that will resolve when the asset is loaded
    return new Promise((resolve, reject) => {
      this.once(`loaded:${name}`, (texture: Texture) => resolve(texture));
      this.once(`error:${name}`, (error: Error) => reject(error));
    });
  }

  /**
   * Load a GLTF model with automatic caching
   */
  public loadModel(
    url: string,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<GLTF> {
    // Check cache first
    const cached = this._modelCache.get(url);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return Promise.resolve(cached.asset);
    }

    // Create a loading promise
    const loadPromise = () =>
      new Promise<GLTF>((resolve, reject) => {
        this._gltfLoader.load(
          url,
          (gltf) => {
            // Store in cache
            this._modelCache.set(url, {
              asset: gltf,
              url,
              refCount: 1,
              lastUsed: Date.now(),
            });

            resolve(gltf);
            this._engine.logger.debug(`Model loaded: ${url}`);
          },
          undefined,
          (error) => {
            this._engine.logger.error(`Failed to load model: ${url}`, error);
            reject(error);
          }
        );
      });

    // Add to appropriate queue
    this._addToQueue(loadPromise, priority);

    // Return a promise that will resolve when the asset is loaded
    return new Promise((resolve, reject) => {
      this.once(`loaded:${url}`, (gltf: GLTF) => resolve(gltf));
      this.once(`error:${url}`, (error: Error) => reject(error));
    });
  }

  /**
   * Load an audio file with automatic caching
   */
  public loadAudio(
    url: string,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<AudioBuffer> {
    // Check cache first
    const cached = this._audioCache.get(url);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return Promise.resolve(cached.asset);
    }

    // Create a loading promise
    const loadPromise = () =>
      new Promise<AudioBuffer>((resolve, reject) => {
        this._audioLoader.load(
          url,
          (buffer) => {
            // Store in cache
            this._audioCache.set(url, {
              asset: buffer,
              url,
              refCount: 1,
              lastUsed: Date.now(),
            });

            resolve(buffer);
            this._engine.logger.debug(`Audio loaded: ${url}`);
          },
          undefined,
          (error) => {
            this._engine.logger.error(`Failed to load audio: ${url}`, error);
            reject(error);
          }
        );
      });

    // Add to appropriate queue
    this._addToQueue(loadPromise, priority);

    // Return a promise that will resolve when the asset is loaded
    return new Promise((resolve, reject) => {
      this.once(`loaded:${url}`, (buffer: AudioBuffer) => resolve(buffer));
      this.once(`error:${url}`, (error: Error) => reject(error));
    });
  }

  /**
   * Load a JSON file with automatic caching
   */
  public loadJSON<T = unknown>(
    url: string,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<T> {
    // Check cache first
    const cached = this._jsonCache.get(url);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = Date.now();
      return Promise.resolve(cached.asset as T);
    }

    // Create a loading promise
    const loadPromise = () =>
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
          }
          return response.json();
        })
        .then((json: T) => {
          // Store in cache
          this._jsonCache.set(url, {
            asset: json,
            url,
            refCount: 1,
            lastUsed: Date.now(),
          });

          this._engine.logger.debug(`JSON loaded: ${url}`);
          this.emit(`loaded:${url}`, json);
          return json;
        })
        .catch((error) => {
          this._engine.logger.error(`Failed to load JSON: ${url}`, error);
          this.emit(`error:${url}`, error);
          throw error;
        });

    // Add to appropriate queue
    this._addToQueue(loadPromise, priority);

    // Return a promise that will resolve when the asset is loaded
    return new Promise((resolve, reject) => {
      this.once(`loaded:${url}`, (json: T) => resolve(json));
      this.once(`error:${url}`, (error: Error) => reject(error));
    });
  }

  /**
   * Release an asset (decrement ref count)
   */
  public releaseAsset(url: string, type: AssetType): void {
    let cache: Map<string, AssetCache<any>>;

    // Select the appropriate cache
    switch (type) {
      case "texture":
        cache = this._textureCache;
        break;
      case "cubeTexture":
        cache = this._cubeTextureCache;
        break;
      case "model":
        cache = this._modelCache;
        break;
      case "audio":
        cache = this._audioCache;
        break;
      case "json":
        cache = this._jsonCache;
        break;
      default:
        return;
    }

    const cached = cache.get(url);
    if (!cached) return;

    cached.refCount--;

    // If refCount is 0 and asset can be disposed, add to cleanup candidates
    if (cached.refCount <= 0) {
      this._engine.logger.debug(`Asset marked for potential cleanup: ${url}`);
    }
  }

  /**
   * Dispose of unused assets
   */
  public cleanupUnusedAssets(maxAgeMs = 60000): void {
    const now = Date.now();

    // Clean textures
    this._textureCache.forEach((cached, url) => {
      if (cached.refCount <= 0 && now - cached.lastUsed > maxAgeMs) {
        cached.asset.dispose();
        this._textureCache.delete(url);
        this._engine.logger.debug(`Disposed texture: ${url}`);
      }
    });

    // Clean cube textures
    this._cubeTextureCache.forEach((cached, url) => {
      if (cached.refCount <= 0 && now - cached.lastUsed > maxAgeMs) {
        cached.asset.dispose();
        this._cubeTextureCache.delete(url);
        this._engine.logger.debug(`Disposed cube texture: ${url}`);
      }
    });

    // Clean models (dispose of geometries and materials)
    this._modelCache.forEach((cached, url) => {
      if (cached.refCount <= 0 && now - cached.lastUsed > maxAgeMs) {
        // Dispose of geometries and materials in the model
        cached.asset.scene.traverse((object) => {
          if (object instanceof Mesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }

            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else if (object.material) {
              object.material.dispose();
            }
          }
        });

        this._modelCache.delete(url);
        this._engine.logger.debug(`Disposed model: ${url}`);
      }
    });

    // Audio buffers and JSON don't need explicit disposal
    this._audioCache.forEach((cached, url) => {
      if (cached.refCount <= 0 && now - cached.lastUsed > maxAgeMs) {
        this._audioCache.delete(url);
        this._engine.logger.debug(`Removed audio from cache: ${url}`);
      }
    });

    this._jsonCache.forEach((cached, url) => {
      if (cached.refCount <= 0 && now - cached.lastUsed > maxAgeMs) {
        this._jsonCache.delete(url);
        this._engine.logger.debug(`Removed JSON from cache: ${url}`);
      }
    });
  }

  /**
   * Add a loading function to the appropriate queue
   */
  private _addToQueue<T>(
    loadFunc: () => Promise<T>,
    priority: "high" | "normal" | "low"
  ): void {
    const wrapped = async () => {
      this._concurrentLoads++;
      try {
        await loadFunc();
      } catch (error) {
        // Error is already emitted in the load functions
      } finally {
        this._concurrentLoads--;
        this._processQueues();
      }
    };

    switch (priority) {
      case "high":
        this._highPriorityQueue.push(wrapped);
        break;
      case "normal":
        this._normalPriorityQueue.push(wrapped);
        break;
      case "low":
        this._lowPriorityQueue.push(wrapped);
        break;
    }

    // Start processing if not already doing so
    if (!this._isLoading) {
      this._processQueues();
    }
  }

  /**
   * Process the loading queues in priority order
   */
  private _processQueues(): void {
    if (this._concurrentLoads >= this._maxConcurrentLoads) {
      return;
    }

    this._isLoading = true;

    // Process high priority first, then normal, then low
    let nextLoad: (() => Promise<void>) | undefined;

    if (this._highPriorityQueue.length > 0) {
      nextLoad = this._highPriorityQueue.shift();
    } else if (this._normalPriorityQueue.length > 0) {
      nextLoad = this._normalPriorityQueue.shift();
    } else if (this._lowPriorityQueue.length > 0) {
      nextLoad = this._lowPriorityQueue.shift();
    }

    if (nextLoad) {
      nextLoad();

      // Continue processing if we have capacity and more items
      if (
        this._concurrentLoads < this._maxConcurrentLoads &&
        (this._highPriorityQueue.length > 0 ||
          this._normalPriorityQueue.length > 0 ||
          this._lowPriorityQueue.length > 0)
      ) {
        this._processQueues();
      }
    } else {
      this._isLoading = false;
    }
  }

  /**
   * Check if there are any assets currently loading
   */
  public isLoading(): boolean {
    return this._isLoading;
  }

  /**
   * Create a clone of a model
   */
  public cloneModel(originalUrl: string): Group | null {
    const cached = this._modelCache.get(originalUrl);
    if (!cached) {
      this._engine.logger.warn(
        `Cannot clone model, original not found: ${originalUrl}`
      );
      return null;
    }

    // Clone the scene
    const clone = cached.asset.scene.clone();

    // Track the reference to the original
    cached.refCount++;
    cached.lastUsed = Date.now();

    return clone;
  }

  /**
   * Dispose of all assets
   */
  public dispose(): void {
    // Dispose of all textures
    this._textureCache.forEach((cached) => {
      cached.asset.dispose();
    });
    this._textureCache.clear();

    // Dispose of all cube textures
    this._cubeTextureCache.forEach((cached) => {
      cached.asset.dispose();
    });
    this._cubeTextureCache.clear();

    // Dispose of all models' geometries and materials
    this._modelCache.forEach((cached) => {
      cached.asset.scene.traverse((object) => {
        if (object instanceof Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        }
      });
    });
    this._modelCache.clear();

    // Clear other caches
    this._audioCache.clear();
    this._jsonCache.clear();

    // Clear queues
    this._highPriorityQueue = [];
    this._normalPriorityQueue = [];
    this._lowPriorityQueue = [];

    this.removeAllListeners();
    this._engine.logger.info("AssetManager disposed");
  }
}
