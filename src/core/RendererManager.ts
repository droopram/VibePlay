import {
  WebGLRenderer,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  Color,
} from "three";
import Stats from "stats.js";
import { Disposable } from "@utils/Disposable";
import type { Engine } from "@core/Engine";

/**
 * Manages the WebGL renderer, post-processing, and render states
 */
export class RendererManager implements Disposable {
  private _engine: Engine;
  private _renderer: WebGLRenderer;
  private _container: HTMLElement;
  private _stats?: Stats;

  /**
   * Get the main WebGL renderer
   */
  get renderer(): WebGLRenderer {
    return this._renderer;
  }

  constructor(engine: Engine) {
    this._engine = engine;

    // Create renderer
    this._renderer = new WebGLRenderer({
      antialias: engine.isAntialiasEnabled(),
      powerPreference: "high-performance",
      alpha: false,
    });

    // Configure renderer
    this._renderer.setSize(engine.getRenderWidth(), engine.getRenderHeight());
    this._renderer.setPixelRatio(engine.getPixelRatio());
    this._renderer.setClearColor(new Color(0x000000));

    // Configure shadows
    this._renderer.shadowMap.enabled = engine.areShadowsEnabled();
    this._renderer.shadowMap.type = PCFSoftShadowMap;

    // Setup tone mapping
    this._renderer.toneMapping = ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.0;

    // Add to DOM
    this._container = document.getElementById("app") || document.body;
    this._container.appendChild(this._renderer.domElement);

    // Setup performance stats if enabled
    if (engine.isShowFPSEnabled()) {
      this._stats = new Stats();
      this._stats.showPanel(0); // 0: fps, 1: ms, 2: mb
      this._container.appendChild(this._stats.dom);
    }

    // Setup auto resize if enabled
    if (engine.isAutoResizeEnabled()) {
      window.addEventListener("resize", this._handleResize);
    }

    engine.logger.info("RendererManager initialized");
  }

  /**
   * Handle window resize events
   */
  private _handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this._renderer.setSize(width, height);

    // Notify scene manager to update camera aspect ratio
    this._engine.sceneManager.handleResize(width, height);

    this._engine.logger.debug("Renderer resized", { width, height });
  };

  /**
   * Render the current scene
   */
  public render(): void {
    if (this._stats) this._stats.begin();

    const activeScene = this._engine.sceneManager.activeScene;
    const activeCamera = this._engine.sceneManager.activeCamera;

    if (activeScene && activeCamera) {
      this._renderer.render(activeScene, activeCamera);
    }

    if (this._stats) this._stats.end();
  }

  /**
   * Dispose of renderer and resources
   */
  public dispose(): void {
    if (this._engine.isAutoResizeEnabled()) {
      window.removeEventListener("resize", this._handleResize);
    }

    if (this._stats && this._stats.dom.parentElement) {
      this._stats.dom.parentElement.removeChild(this._stats.dom);
    }

    this._renderer.dispose();
    this._engine.logger.info("RendererManager disposed");
  }
}
