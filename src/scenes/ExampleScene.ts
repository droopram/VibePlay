import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  CylinderGeometry,
  Color,
  Vector3,
  PerspectiveCamera,
  BackSide,
  HemisphereLight,
  Float32BufferAttribute,
} from "three";
import { GameScene } from "@core/SceneManager";
import type { Engine } from "@core/Engine";
import { FirstPersonController } from "@components/FirstPersonController";

/**
 * Example scene to demonstrate basic functionality
 */
export class ExampleScene extends GameScene {
  private _camera: PerspectiveCamera;
  private _fpController: FirstPersonController;

  constructor(engine: Engine) {
    super(engine);

    // Create a custom camera for this scene
    this._camera = new PerspectiveCamera(
      75,
      engine.getRenderWidth() / engine.getRenderHeight(),
      0.1,
      1000
    );

    // Initial setup - position will be set by the controller
    this._camera.position.set(0, 2, 0);

    // Create first-person controller
    this._fpController = new FirstPersonController(engine, this._camera);

    // Setup lighting
    this._setupLights();

    // Setup environment
    this._setupEnvironment();
  }

  /**
   * Set up lights for the scene
   */
  private _setupLights(): void {
    // Stronger ambient light for AO-style lighting
    const ambientLight = new AmbientLight(0xffffff, 0.8);
    this.add(ambientLight);

    // Main directional light with softer shadows
    const sunLight = new DirectionalLight(0xfffaf0, 0.8); // Warm sunlight color
    sunLight.position.set(5, 15, 5);
    sunLight.castShadow = true;

    // Configure shadow properties for softer shadows
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.radius = 2; // Blur shadow edges

    this.add(sunLight);

    // Add fill light from opposite direction
    const fillLight = new DirectionalLight(0xe6f0ff, 0.4); // Slightly blue fill light
    fillLight.position.set(-5, 10, -5);
    this.add(fillLight);
  }

  /**
   * Set up basic environment objects
   */
  private _setupEnvironment(): void {
    // Create sky gradient
    this._createSkyGradient();

    // Add hemisphere light to enhance the scene lighting from sky
    const hemisphereLight = new HemisphereLight(
      0x87ceeb, // Sky color - light blue
      0x404040, // Ground color
      0.5
    );
    this.add(hemisphereLight);

    // Larger ground plane
    const groundGeometry = new PlaneGeometry(200, 200);
    const groundMaterial = new MeshStandardMaterial({
      color: 0x3a7d3a, // More vibrant green grass
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.add(ground);

    // Add parkour course
    this._createParkourCourse();

    // Add some decorative elements
    this._addDecorativeElements();
  }

  /**
   * Create a parkour course
   */
  private _createParkourCourse(): void {
    // Materials
    const platformMaterial = new MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.2,
    });

    const highlightMaterial = new MeshStandardMaterial({
      color: 0x3498db, // Blue highlight
      roughness: 0.6,
      metalness: 0.3,
    });

    const goalMaterial = new MeshStandardMaterial({
      color: 0x2ecc71, // Green goal
      roughness: 0.5,
      metalness: 0.4,
      emissive: 0x2ecc71,
      emissiveIntensity: 0.2,
    });

    // Starting platform
    const startPlatform = new Mesh(
      new BoxGeometry(4, 0.5, 4),
      platformMaterial
    );
    startPlatform.position.set(0, 0.25, 5);
    startPlatform.receiveShadow = true;
    startPlatform.castShadow = true;
    this.add(startPlatform);

    // First jump - small gap
    const platform1 = new Mesh(new BoxGeometry(3, 0.5, 3), platformMaterial);
    platform1.position.set(0, 0.25, 10);
    platform1.receiveShadow = true;
    platform1.castShadow = true;
    this.add(platform1);

    // Second jump - slightly higher
    const platform2 = new Mesh(new BoxGeometry(3, 0.5, 3), platformMaterial);
    platform2.position.set(4, 1, 14);
    platform2.receiveShadow = true;
    platform2.castShadow = true;
    this.add(platform2);

    // Moving to a thin platform
    const platform3 = new Mesh(new BoxGeometry(1, 0.5, 4), highlightMaterial);
    platform3.position.set(8, 1, 18);
    platform3.receiveShadow = true;
    platform3.castShadow = true;
    this.add(platform3);

    // Jump to a higher platform
    const platform4 = new Mesh(new BoxGeometry(3, 0.5, 3), platformMaterial);
    platform4.position.set(4, 2, 22);
    platform4.receiveShadow = true;
    platform4.castShadow = true;
    this.add(platform4);

    // Series of stepping stones
    const stonePositions = [
      { x: 1, y: 2, z: 26 },
      { x: -2, y: 2, z: 28 },
      { x: -5, y: 2, z: 26 },
      { x: -8, y: 2, z: 28 },
    ];

    stonePositions.forEach((pos, index) => {
      const stone = new Mesh(
        new CylinderGeometry(1, 1.2, 0.5, 8),
        index === stonePositions.length - 1
          ? highlightMaterial
          : platformMaterial
      );
      stone.position.set(pos.x, pos.y, pos.z);
      stone.receiveShadow = true;
      stone.castShadow = true;
      this.add(stone);
    });

    // Final stretch - ascending platforms
    for (let i = 0; i < 4; i++) {
      const platform = new Mesh(
        new BoxGeometry(2, 0.5, 2),
        i === 3 ? goalMaterial : platformMaterial
      );
      platform.position.set(-10 - i * 3, 2 + i * 1, 28);
      platform.receiveShadow = true;
      platform.castShadow = true;
      this.add(platform);
    }

    // Add some walls for a corridor challenge
    const wallMaterial = new MeshStandardMaterial({
      color: 0x95a5a6,
      roughness: 0.9,
      metalness: 0.1,
    });

    const wall1 = new Mesh(new BoxGeometry(0.5, 3, 8), wallMaterial);
    wall1.position.set(-24, 1.5, 26);
    wall1.receiveShadow = true;
    wall1.castShadow = true;
    this.add(wall1);

    const wall2 = new Mesh(new BoxGeometry(0.5, 3, 8), wallMaterial);
    wall2.position.set(-21, 1.5, 26);
    wall2.receiveShadow = true;
    wall2.castShadow = true;
    this.add(wall2);

    // Floor between walls
    const corridor = new Mesh(new BoxGeometry(3, 0.5, 8), platformMaterial);
    corridor.position.set(-22.5, 0.25, 26);
    corridor.receiveShadow = true;
    corridor.castShadow = true;
    this.add(corridor);

    // Final goal platform
    const goalPlatform = new Mesh(new BoxGeometry(5, 0.5, 5), goalMaterial);
    goalPlatform.position.set(-22.5, 0.25, 32);
    goalPlatform.receiveShadow = true;
    goalPlatform.castShadow = true;
    this.add(goalPlatform);

    // Add a trophy on the goal platform
    const trophyBase = new Mesh(
      new CylinderGeometry(0.5, 0.7, 0.3, 16),
      new MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8,
      })
    );
    trophyBase.position.set(-22.5, 0.8, 32);
    trophyBase.castShadow = true;
    this.add(trophyBase);

    const trophyCup = new Mesh(
      new CylinderGeometry(0.3, 0.5, 0.8, 16),
      new MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xffff00,
        emissiveIntensity: 0.3,
      })
    );
    trophyCup.position.set(-22.5, 1.35, 32);
    trophyCup.castShadow = true;
    this.add(trophyCup);
  }

  /**
   * Add decorative elements around the scene
   */
  private _addDecorativeElements(): void {
    // Add some random cubes
    for (let i = 0; i < 10; i++) {
      const cubeGeometry = new BoxGeometry(
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5,
        0.5 + Math.random() * 1.5
      );
      const cubeMaterial = new MeshStandardMaterial({
        color: new Color(Math.random(), Math.random(), Math.random()),
        roughness: 0.7,
        metalness: 0.3,
      });

      const cube = new Mesh(cubeGeometry, cubeMaterial);

      // Place decorative elements away from the parkour course
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;

      cube.position.set(
        Math.cos(angle) * distance,
        0.5 + Math.random() * 2,
        Math.sin(angle) * distance
      );

      cube.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      cube.castShadow = true;
      cube.receiveShadow = true;

      this.add(cube);
    }

    // Add some spheres
    for (let i = 0; i < 8; i++) {
      const sphereGeometry = new SphereGeometry(0.3 + Math.random() * 0.7);
      const sphereMaterial = new MeshStandardMaterial({
        color: new Color(Math.random(), Math.random(), Math.random()),
        roughness: 0.4,
        metalness: 0.6,
      });

      const sphere = new Mesh(sphereGeometry, sphereMaterial);

      // Place decorative elements away from the parkour course
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 35;

      sphere.position.set(
        Math.cos(angle) * distance,
        0.5 + Math.random() * 2,
        Math.sin(angle) * distance
      );

      sphere.castShadow = true;
      sphere.receiveShadow = true;

      this.add(sphere);
    }
  }

  // First-person controller handles its own input

  /**
   * Create a sky gradient using a large sphere with vertex colors
   */
  private _createSkyGradient(): void {
    // Create large sphere for sky
    const skyGeometry = new SphereGeometry(500, 32, 32);

    // Create gradient material
    const skyMaterial = new MeshStandardMaterial({
      side: BackSide, // Render inside of sphere
      fog: false,
      metalness: 0,
      roughness: 1,
      vertexColors: true,
    });

    // Set vertex colors for gradient effect
    const skyColor = new Color(0x87ceeb); // Sky blue
    const horizonColor = new Color(0xe0f7ff); // Light horizon

    if (skyGeometry.attributes.position) {
      const positions = skyGeometry.attributes.position;
      const colors = [];

      for (let i = 0; i < positions.count; i++) {
        // Get normalized y position (-1 to 1)
        const y = positions.getY(i);
        const normalizedY = y / 500;

        // Create gradient based on height
        const color = new Color();
        if (normalizedY > 0) {
          // Upper hemisphere - blend from horizon to sky
          color.lerpColors(horizonColor, skyColor, normalizedY);
        } else {
          // Lower hemisphere - similar to horizon
          color.copy(horizonColor);
        }

        colors.push(color.r, color.g, color.b);
      }

      skyGeometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    }

    const sky = new Mesh(skyGeometry, skyMaterial);
    this.add(sky);

    // Set background color to match horizon
    this.background = horizonColor;
  }

  /**
   * Handle window resize event
   */
  public handleResize(width: number, height: number): void {
    if (this._camera) {
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
    }
  }

  /**
   * Called when the scene is activated
   */
  public onActivate(): void {
    // Set the active camera for rendering
    this.engine.sceneManager.activeCamera = this._camera;

    // Enable first-person controls
    this._fpController.enable();

    console.log("Example scene activated with first-person controls");
    console.log("Use WASD to move, Space to jump, Shift to run");
    console.log("Click on the screen to enable mouse look");

    // Add dynamic instructions to the screen
    const instructions = document.createElement("div");
    instructions.id = "instructions";
    instructions.innerHTML = `
      <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); 
                  background: rgba(0,0,0,0.7); color: white; padding: 10px; border-radius: 5px;
                  text-align: center; z-index: 100; font-family: sans-serif; min-width: 300px;">
        <p id="control-status">Click to enable controls</p>
        <p>WASD to move | Space to jump | Shift to run</p>
        <p style="font-size: 0.9em; color: #3498db;">Try the parkour course ahead! Reach the trophy at the end!</p>
      </div>
    `;
    document.body.appendChild(instructions);

    // Listen for pointer lock changes to update instructions
    document.addEventListener("pointerlockchange", this._updateInstructions);
  }

  /**
   * Update instructions based on pointer lock state
   */
  private _updateInstructions = (): void => {
    const statusElement = document.getElementById("control-status");
    if (statusElement) {
      if (document.pointerLockElement) {
        statusElement.textContent = "Press ESC to unlock mouse";
      } else {
        statusElement.textContent = "Click to enable controls";
      }
    }
  };

  /**
   * Called when the scene is deactivated
   */
  public onDeactivate(): void {
    // Disable first-person controls
    this._fpController.disable();

    // Remove event listener
    document.removeEventListener("pointerlockchange", this._updateInstructions);

    // Remove instructions
    const instructions = document.getElementById("instructions");
    if (instructions) {
      instructions.remove();
    }
  }

  /**
   * Update the scene
   */
  public update(deltaTime: number): void {
    // Update first-person controller
    this._fpController.update(deltaTime);

    // Update audio listener position to match camera
    this.engine.audioManager.updateListenerPosition(
      this._camera.position,
      new Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion)
    );
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clean up first-person controller
    this._fpController.dispose();

    // Dispose of all geometries and materials
    this.traverse((object) => {
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
  }
}
