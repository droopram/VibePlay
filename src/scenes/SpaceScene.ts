import {
  AmbientLight,
  PointLight,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  SphereGeometry,
  Vector3,
  PerspectiveCamera,
  BackSide,
  Color,
  Group,
  Raycaster,
  AdditiveBlending,
  Points,
  BufferGeometry,
  PointsMaterial,
  Float32BufferAttribute,
  Quaternion,
  ShaderMaterial,
  CanvasTexture,
} from "three";
import { GameScene } from "@core/SceneManager";
import type { Engine } from "@core/Engine";

/**
 * Spaceship class that represents the player-controlled rocket ship
 */
class Spaceship extends Group {
  private _velocity = new Vector3(0, 0, 0);
  private _acceleration = new Vector3(0, 0, 0);
  private _rotationSpeed = 2.0;
  private _maxSpeed = 5;
  private _isDestroyed = false;
  private _direction = new Vector3(0, 0, -1); // Forward direction vector

  // Particle system for engine exhaust
  private _particleCount = 200;
  private _maxParticleLifetime = 1.0; // seconds
  private _thrusterParticles!: Points; // Using non-null assertion for properties initialized in methods
  private _particleGeometry!: BufferGeometry;
  private _particleMaterial!: PointsMaterial;
  private _particlePositions!: Float32Array;
  private _particleVelocities: Vector3[] = [];
  private _particleLifetimes!: Float32Array;

  constructor() {
    super();

    // Create rocket body (main cylindrical part)
    const bodyGeometry = new BoxGeometry(0.5, 0.5, 2);
    const bodyMaterial = new MeshStandardMaterial({
      color: 0xe0e0e0, // Silvery white
      metalness: 0.5,
      roughness: 0.4,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const body = new Mesh(bodyGeometry, bodyMaterial);
    this.add(body);

    // Create rocket nose cone (pointed tip)
    const tipGeometry = new BoxGeometry(0.5, 0.5, 0.8);
    const tipMaterial = new MeshStandardMaterial({
      color: 0xff4444, // Red
      metalness: 0.4,
      roughness: 0.5,
      emissive: 0x441111,
      emissiveIntensity: 0.2,
    });
    const tip = new Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, 0, -1.4); // Place at front of rocket
    tip.scale.set(1, 1, 0.5); // Make it taper to a point
    this.add(tip);

    // Create rocket fins (triangular stabilizers)
    const finMaterial = new MeshStandardMaterial({
      color: 0xff4444, // Red
      metalness: 0.4,
      roughness: 0.5,
      emissive: 0x441111,
      emissiveIntensity: 0.2,
    });

    // Top fin
    const topFin = new Mesh(new BoxGeometry(0.1, 0.6, 0.6), finMaterial);
    topFin.position.set(0, 0.5, 0.8); // Top of rocket
    this.add(topFin);

    // Bottom fin
    const bottomFin = new Mesh(new BoxGeometry(0.1, 0.6, 0.6), finMaterial);
    bottomFin.position.set(0, -0.5, 0.8); // Bottom of rocket
    this.add(bottomFin);

    // Left fin
    const leftFin = new Mesh(new BoxGeometry(0.6, 0.1, 0.6), finMaterial);
    leftFin.position.set(-0.5, 0, 0.8); // Left side of rocket
    this.add(leftFin);

    // Right fin
    const rightFin = new Mesh(new BoxGeometry(0.6, 0.1, 0.6), finMaterial);
    rightFin.position.set(0.5, 0, 0.8); // Right side of rocket
    this.add(rightFin);

    // Create engine nozzle (instead of just a sphere)
    const nozzleGeometry = new BoxGeometry(0.4, 0.4, 0.3);
    const nozzleMaterial = new MeshStandardMaterial({
      color: 0x444444, // Dark gray
      metalness: 0.8,
      roughness: 0.2,
    });
    const nozzle = new Mesh(nozzleGeometry, nozzleMaterial);
    nozzle.position.set(0, 0, 1.1); // Back of rocket
    this.add(nozzle);

    // Initialize thruster particle system
    this._initThrusterParticles();

    // Set initial rotation so nose points forward
    this.rotation.y = Math.PI; // Rotate 180 degrees so nose points forward (-Z direction)
  }

  /**
   * Initialize the particle system for rocket thrusters
   */
  private _initThrusterParticles(): void {
    // Create geometry and material for particles
    this._particleGeometry = new BufferGeometry();
    this._particleMaterial = new PointsMaterial({
      color: 0xffaa22,
      size: 0.3,
      blending: AdditiveBlending,
      transparent: true,
      sizeAttenuation: true,
      opacity: 0.8,
    });

    // Create arrays for particle positions and lifetimes
    this._particlePositions = new Float32Array(this._particleCount * 3);
    this._particleLifetimes = new Float32Array(this._particleCount);

    // Initialize particles
    for (let i = 0; i < this._particleCount; i++) {
      // All particles start at the engine position
      this._particlePositions[i * 3] = 0;
      this._particlePositions[i * 3 + 1] = 0;
      this._particlePositions[i * 3 + 2] = 1.1; // Just behind the engine

      // Random velocities for particles (primarily backward with some spread)
      const spread = 0.2;
      this._particleVelocities.push(
        new Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          Math.random() * 2 + 3 // Backward velocity (z-direction)
        )
      );

      // Random lifetimes for particles
      this._particleLifetimes[i] = Math.random() * this._maxParticleLifetime;
    }

    // Set attributes for the particle geometry
    this._particleGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(this._particlePositions, 3)
    );

    // Create the particle system
    this._thrusterParticles = new Points(
      this._particleGeometry,
      this._particleMaterial
    );
    this.add(this._thrusterParticles);
  }

  /**
   * Create a texture for particles (simple radial gradient)
   */
  private _createParticleTexture(): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create canvas context");

    // Draw a radial gradient
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(255, 180, 0, 1)");
    gradient.addColorStop(0.7, "rgba(255, 80, 0, 0.5)");
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    // Create texture from canvas
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Update spaceship position and rotation
   */
  public update(deltaTime: number, inputManager: any): void {
    if (this._isDestroyed) return;

    // Handle input for ship control
    this._handleInput(inputManager, deltaTime);

    // Calculate current direction vector based on ship's rotation
    // Forward is -Z in Three.js coordinate system
    this._direction.set(0, 0, -1).applyQuaternion(this.quaternion);

    // Apply acceleration in the direction the ship is facing
    if (this._acceleration.z !== 0) {
      // For forward/backward movement, use the direction vector
      const forwardMovement = this._direction
        .clone()
        .multiplyScalar(-this._acceleration.z * deltaTime);
      this._velocity.add(forwardMovement);
    }

    // Apply vertical acceleration directly (up/down isn't affected by rotation)
    this._velocity.y += this._acceleration.y * deltaTime;

    // Limit speed
    if (this._velocity.length() > this._maxSpeed) {
      this._velocity.normalize().multiplyScalar(this._maxSpeed);
    }

    // Apply friction
    const friction = 0.97;
    this._velocity.multiplyScalar(friction);

    // Update position
    this.position.add(this._velocity.clone().multiplyScalar(deltaTime));

    // Reset acceleration
    this._acceleration.set(0, 0, 0);

    // Update thruster particles
    this._updateThrusterParticles(deltaTime, inputManager);
  }

  /**
   * Update the thruster particles for rocket exhaust effect
   */
  private _updateThrusterParticles(deltaTime: number, inputManager: any): void {
    // Check if thrusting forward (W key) to determine particle emission rate
    const isThrusting = inputManager.isKeyDown("w");

    // Update existing particles
    for (let i = 0; i < this._particleCount; i++) {
      // Update lifetime
      this._particleLifetimes[i] -= deltaTime;

      // If particle is dead, reset it
      if (this._particleLifetimes[i] <= 0) {
        // Reset particle position to engine (with small random offset for width)
        this._particlePositions[i * 3] = (Math.random() - 0.5) * 0.2; // X - random spread
        this._particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.2; // Y - random spread
        this._particlePositions[i * 3 + 2] = 1.1 + Math.random() * 0.1; // Z - just behind engine

        // New lifetime based on whether we're thrusting
        this._particleLifetimes[i] = isThrusting
          ? Math.random() * this._maxParticleLifetime
          : Math.random() * this._maxParticleLifetime * 0.3; // Shorter lifetime when not thrusting
      } else {
        // Move particle based on its velocity
        this._particlePositions[i * 3] +=
          this._particleVelocities[i].x * deltaTime * 2;
        this._particlePositions[i * 3 + 1] +=
          this._particleVelocities[i].y * deltaTime * 2;
        this._particlePositions[i * 3 + 2] +=
          this._particleVelocities[i].z * deltaTime * 2;
      }
    }

    // Set particle visibility based on thrust
    this._thrusterParticles.visible = true; // Always visible, but intensity varies

    // Update the opacity based on thrust - brighter when thrusting
    this._particleMaterial.opacity = isThrusting ? 0.8 : 0.2;

    // Change color based on thrust - yellower when thrusting, oranger when idle
    if (isThrusting) {
      this._particleMaterial.color.setHex(0xffaa22); // Bright yellow-orange
      this._particleMaterial.size = 0.3;
    } else {
      this._particleMaterial.color.setHex(0xff5500); // Deep orange-red
      this._particleMaterial.size = 0.15;
    }

    // Ensure the geometry is updated
    this._particleGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * Handle user input for ship control
   */
  private _handleInput(inputManager: any, deltaTime: number): void {
    // Forward/backward
    if (inputManager.isKeyDown("w")) {
      this._acceleration.z -= 10; // Accelerate forward
      this.rotation.x = -0.2; // Pitch down slightly for visual feedback
    } else if (inputManager.isKeyDown("s")) {
      this._acceleration.z += 5; // Slower backward movement
      this.rotation.x = 0.2; // Pitch up slightly for visual feedback
    } else {
      this.rotation.x *= 0.9; // Return to neutral pitch position
    }

    // Rotation (left/right)
    if (inputManager.isKeyDown("a")) {
      // Rotate around Y axis (yaw)
      this.rotateY(this._rotationSpeed * deltaTime);
    } else if (inputManager.isKeyDown("d")) {
      // Rotate around Y axis (yaw)
      this.rotateY(-this._rotationSpeed * deltaTime);
    }

    // Up/down
    if (inputManager.isKeyDown("q")) {
      this._acceleration.y += 10;
    } else if (inputManager.isKeyDown("e")) {
      this._acceleration.y -= 10;
    }

    // Roll visual effect based on turning
    if (inputManager.isKeyDown("a")) {
      this.rotation.z = Math.min(this.rotation.z + 0.05, 0.3);
    } else if (inputManager.isKeyDown("d")) {
      this.rotation.z = Math.max(this.rotation.z - 0.05, -0.3);
    } else {
      // Return to neutral roll position
      if (this.rotation.z > 0.01) {
        this.rotation.z -= 0.05;
      } else if (this.rotation.z < -0.01) {
        this.rotation.z += 0.05;
      } else {
        this.rotation.z = 0;
      }
    }
  }

  /**
   * Check if spaceship is destroyed
   */
  public isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Mark spaceship as destroyed
   */
  public destroy(): void {
    this._isDestroyed = true;
    this.visible = false;
  }

  /**
   * Reset spaceship state
   */
  public reset(): void {
    this._isDestroyed = false;
    this.visible = true;
    this.position.set(0, 0, 0);
    this._velocity.set(0, 0, 0);
    this._acceleration.set(0, 0, 0);
    this._direction.set(0, 0, -1);
    this.rotation.set(0, 0, 0);
    this.rotation.y = Math.PI; // Reset to forward direction
    this.quaternion.setFromEuler(this.rotation);
  }
}

/**
 * Planet class for creating celestial bodies with gradient materials
 */
class Planet extends Mesh {
  constructor(radius: number, color: number, emissive: number = 0x000000) {
    // Create a sphere geometry with more segments for smoother appearance
    const geometry = new SphereGeometry(radius, 64, 48);

    // Create a shader material for gradient effect
    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 baseColor;
      uniform vec3 highlightColor;
      uniform vec3 emissiveColor;
      uniform float emissiveIntensity;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      
      void main() {
        // Create gradient based on the Y normal (poles to equator gradient)
        float gradientFactor = pow(abs(vNormal.y), 0.5) * 0.7 + 0.3;
        
        // Mix base color and highlight color based on the gradient factor
        vec3 finalColor = mix(baseColor, highlightColor, gradientFactor);
        
        // Add simple lighting effect based on normal
        float lightIntensity = max(0.5, dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))));
        finalColor *= lightIntensity;
        
        // Add emissive glow
        finalColor += emissiveColor * emissiveIntensity;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Convert hex colors to Vector3 for the shader
    const baseColorVector = new Color(color);
    const highlightColorVector = new Color(color).multiplyScalar(1.5); // Lighter version of base color
    const emissiveColorVector = new Color(emissive);

    // Create shader material
    const material = new ShaderMaterial({
      uniforms: {
        baseColor: {
          value: new Vector3(
            baseColorVector.r,
            baseColorVector.g,
            baseColorVector.b
          ),
        },
        highlightColor: {
          value: new Vector3(
            highlightColorVector.r,
            highlightColorVector.g,
            highlightColorVector.b
          ),
        },
        emissiveColor: {
          value: new Vector3(
            emissiveColorVector.r,
            emissiveColorVector.g,
            emissiveColorVector.b
          ),
        },
        emissiveIntensity: { value: emissive === 0x000000 ? 0.0 : 0.5 },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });

    super(geometry, material);
  }
}

/**
 * Particle effect for spaceship explosion
 */
class ExplosionEffect extends Points {
  private _particles: number = 200;
  private _geometry: BufferGeometry;
  private _material: PointsMaterial;
  private _velocities: Vector3[] = [];
  private _startTime: number = 0;
  private _duration: number = 2; // seconds
  private _isActive: boolean = false;

  constructor() {
    const geometry = new BufferGeometry();
    const material = new PointsMaterial({
      color: 0xff5500,
      size: 0.2,
      blending: AdditiveBlending,
      transparent: true,
      sizeAttenuation: true,
    });

    super(geometry, material);

    this._geometry = geometry;
    this._material = material;

    // Pre-create positions and velocities arrays
    const positions = new Float32Array(this._particles * 3);

    for (let i = 0; i < this._particles; i++) {
      // All particles start at origin (0,0,0)
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Random velocity in all directions
      const velocity = new Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      this._velocities.push(velocity);
    }

    this._geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3)
    );
    this.visible = false;
  }

  /**
   * Start the explosion effect
   */
  public start(position: Vector3): void {
    this.position.copy(position);
    this._startTime = performance.now() / 1000;
    this._isActive = true;
    this.visible = true;

    // Reset particle positions
    const positions = this._geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this._particles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    this._geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Update explosion particles
   */
  public update(deltaTime: number): boolean {
    if (!this._isActive) return false;

    const currentTime = performance.now() / 1000;
    const elapsed = currentTime - this._startTime;

    if (elapsed > this._duration) {
      this._isActive = false;
      this.visible = false;
      return false;
    }

    const positions = this._geometry.attributes.position.array as Float32Array;
    const progress = elapsed / this._duration;

    // Update particle positions
    for (let i = 0; i < this._particles; i++) {
      positions[i * 3] += this._velocities[i].x * deltaTime;
      positions[i * 3 + 1] += this._velocities[i].y * deltaTime;
      positions[i * 3 + 2] += this._velocities[i].z * deltaTime;
    }

    // Fade out particles
    this._material.opacity = 1 - progress;
    this._material.size = 0.2 * (1 - progress * 0.5);

    this._geometry.attributes.position.needsUpdate = true;
    return true;
  }
}

/**
 * Space scene with a flyable spaceship and planet obstacles
 */
export class SpaceScene extends GameScene {
  private _camera: PerspectiveCamera;
  private _spaceship: Spaceship;
  private _planets: Planet[] = [];
  private _explosion: ExplosionEffect;
  private _raycaster: Raycaster;
  private _gameOver: boolean = false;
  private _restartTimer: number = 0;
  private _restartDelay: number = 3; // seconds

  constructor(engine: Engine) {
    super(engine);

    // Create a camera
    this._camera = new PerspectiveCamera(
      75,
      engine.getRenderWidth() / engine.getRenderHeight(),
      0.1,
      1000
    );

    // Create spaceship
    this._spaceship = new Spaceship();
    this.add(this._spaceship);

    // Position camera behind the ship at initialization
    this._camera.position.set(0, 3, 10); // Behind and slightly above
    this._camera.lookAt(this._spaceship.position);

    // Set this camera as the active camera for rendering
    engine.sceneManager.activeCamera = this._camera;

    // Create explosion effect
    this._explosion = new ExplosionEffect();
    this.add(this._explosion);

    // Create raycaster for collision detection
    this._raycaster = new Raycaster();

    // Setup lighting
    this._setupLights();

    // Setup environment
    this._setupEnvironment();
  }

  /**
   * Set up lights for the scene
   */
  private _setupLights(): void {
    // Brighter ambient light for better overall illumination
    const ambientLight = new AmbientLight(0xffffff, 0.4);
    this.add(ambientLight);

    // Add a "sun" point light
    const sunLight = new PointLight(0xffffff, 1.2, 1000);
    sunLight.position.set(50, 50, 50);
    this.add(sunLight);

    // Add a secondary light for the ship - illuminates from the front
    const frontLight = new PointLight(0xffffee, 0.8, 50);
    frontLight.position.set(0, 5, -10);
    this.add(frontLight);

    // Add a fill light from below
    const fillLight = new PointLight(0x8888ff, 0.3, 20);
    fillLight.position.set(0, -5, 0);
    this.add(fillLight);
  }

  /**
   * Setup space environment with planets
   */
  private _setupEnvironment(): void {
    // Create starfield background
    this._createStarfield();

    // Create various planets at different distances
    this._createPlanets();
  }

  /**
   * Create a starfield background
   */
  private _createStarfield(): void {
    // Create a large sphere for the starfield
    const starfieldGeometry = new SphereGeometry(500, 32, 32);
    const starfieldMaterial = new MeshStandardMaterial({
      color: 0x000020,
      emissive: 0x000020,
      side: BackSide,
    });

    const starfield = new Mesh(starfieldGeometry, starfieldMaterial);
    this.add(starfield);

    // Add stars as points
    const starsGeometry = new BufferGeometry();
    const starsMaterial = new PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: false,
    });

    const starPositions = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2;
      const y = (Math.random() - 0.5) * 2;
      const z = (Math.random() - 0.5) * 2;

      // Normalize to place on sphere
      const norm = Math.sqrt(x * x + y * y + z * z);
      starPositions.push((x / norm) * 490, (y / norm) * 490, (z / norm) * 490);
    }

    starsGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(starPositions, 3)
    );
    const stars = new Points(starsGeometry, starsMaterial);
    this.add(stars);
  }

  /**
   * Create planets at various locations
   */
  private _createPlanets(): void {
    // Add a few planets as obstacles with more interesting colors
    const planetPositions = [
      // Blue ice planet with subtle glow
      {
        position: new Vector3(-50, 0, -100),
        radius: 20,
        color: 0x3498db,
        emissive: 0x0a2d44,
        name: "Ice Giant",
      },

      // Red/orange lava planet
      {
        position: new Vector3(70, 30, -200),
        radius: 15,
        color: 0xe74c3c,
        emissive: 0x4a1c16,
        name: "Lava World",
      },

      // Emerald green planet
      {
        position: new Vector3(0, -40, -150),
        radius: 25,
        color: 0x2ecc71,
        emissive: 0x0f4d2a,
        name: "Emerald Sphere",
      },

      // Golden/amber gas giant
      {
        position: new Vector3(-90, 20, -250),
        radius: 18,
        color: 0xf39c12,
        emissive: 0x7d5109,
        name: "Amber Giant",
      },

      // Purple/violet mysterious planet
      {
        position: new Vector3(120, -50, -300),
        radius: 30,
        color: 0x9b59b6,
        emissive: 0x5b3570,
        name: "Violet Mystery",
      },
    ];

    planetPositions.forEach((planet) => {
      const newPlanet = new Planet(
        planet.radius,
        planet.color,
        planet.emissive
      );
      newPlanet.position.copy(planet.position);

      // Add slight random rotation to each planet for variety
      newPlanet.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      // Store the planet name as a property
      (newPlanet as any).planetName = planet.name;

      this.add(newPlanet);
      this._planets.push(newPlanet);
    });

    // Add a sun in the distance with strong emissive glow
    const sun = new Planet(80, 0xf9d71c, 0xf9d71c);
    sun.position.set(500, 100, -800);
    (sun as any).planetName = "Solar Star";
    this.add(sun);
  }

  /**
   * Check for collisions between spaceship and planets
   */
  private _checkCollisions(): void {
    if (this._spaceship.isDestroyed() || this._gameOver) return;

    // Simple distance-based collision for now
    for (const planet of this._planets) {
      const distance = this._spaceship.position.distanceTo(planet.position);
      // Cast to SphereGeometry to access radius parameter
      const planetGeometry = planet.geometry as SphereGeometry;
      if (distance < planetGeometry.parameters.radius + 2) {
        this._handleCollision(planet);
        break;
      }
    }
  }

  /**
   * Handle collision between spaceship and obstacle
   */
  private _handleCollision(planet?: Planet): void {
    this._gameOver = true;
    this._spaceship.destroy();

    // Start explosion effect at ship position
    this._explosion.start(this._spaceship.position.clone());

    // Start restart timer
    this._restartTimer = this._restartDelay;

    // Show game over message with planet name if available
    this._showGameOverMessage(planet);
  }

  /**
   * Show game over message with restart instructions
   */
  private _showGameOverMessage(planet?: Planet): void {
    const message = document.createElement("div");
    message.id = "game-over-message";
    message.style.position = "absolute";
    message.style.top = "50%";
    message.style.left = "50%";
    message.style.transform = "translate(-50%, -50%)";
    message.style.color = "white";
    message.style.fontFamily = "Arial, sans-serif";
    message.style.fontSize = "24px";
    message.style.textAlign = "center";
    message.style.textShadow = "0 0 10px rgba(0,0,0,0.8)";

    // Get planet name if available
    const planetName = planet
      ? (planet as any).planetName || "Unknown Planet"
      : "a planet";

    message.innerHTML = `
      <h1>Ship Destroyed!</h1>
      <p>Your ship collided with ${planetName}</p>
      <p>Restarting in ${Math.ceil(this._restartTimer)} seconds...</p>
      <p>W/S = Accelerate/Brake | A/D = Rotate | Q/E = Up/Down</p>
    `;

    document.body.appendChild(message);
  }

  /**
   * Update game over message
   */
  private _updateGameOverMessage(): void {
    const message = document.getElementById("game-over-message");
    if (message) {
      // Extract the planet name from the existing message to preserve it
      const planetNameMatch = message.innerHTML.match(
        /Your ship collided with (.*?)<\/p>/
      );
      const planetName = planetNameMatch ? planetNameMatch[1] : "a planet";

      message.innerHTML = `
        <h1>Ship Destroyed!</h1>
        <p>Your ship collided with ${planetName}</p>
        <p>Restarting in ${Math.ceil(this._restartTimer)} seconds...</p>
        <p>W/S = Accelerate/Brake | A/D = Rotate | Q/E = Up/Down</p>
      `;
    }
  }

  /**
   * Remove game over message
   */
  private _removeGameOverMessage(): void {
    const message = document.getElementById("game-over-message");
    if (message) {
      message.remove();
    }
  }

  /**
   * Restart the game
   */
  private _restartGame(): void {
    // Reset game state
    this._gameOver = false;

    // Reset spaceship position and state
    this._spaceship.reset();
    this._spaceship.position.set(0, 0, 0); // Explicitly set to origin
    this._spaceship.rotation.set(0, 0, 0); // Reset rotation
    this._spaceship.quaternion.identity(); // Reset quaternion

    // Reset camera
    this._camera.position.set(0, 3, 10); // Reset to initial position
    this._camera.lookAt(this._spaceship.position);

    // Remove UI
    this._removeGameOverMessage();
  }

  /**
   * Update camera to follow the ship
   */
  private _updateCamera(): void {
    if (this._spaceship.isDestroyed()) return;

    // Calculate the ship's forward direction
    const forward = new Vector3(0, 0, -1).applyQuaternion(
      this._spaceship.quaternion
    );

    // Calculate the backward vector (camera follows from behind)
    const backward = forward.clone().negate();

    // Position camera behind the ship with offset based on direction
    const cameraOffset = backward.multiplyScalar(10); // 10 units behind
    const heightOffset = new Vector3(0, 3, 0); // 3 units above

    // Calculate the desired camera position
    const targetPosition = this._spaceship.position
      .clone()
      .add(cameraOffset)
      .add(heightOffset);

    // Smoothly move camera towards target position
    // Use a lower factor (0.05) for smoother following, or higher (0.1) for more responsive
    this._camera.position.lerp(targetPosition, 0.1);

    // Point camera slightly ahead of the ship in its forward direction
    const lookAtPoint = this._spaceship.position
      .clone()
      .add(forward.clone().multiplyScalar(5));
    this._camera.lookAt(lookAtPoint);

    // Update the active camera in SceneManager (redundant but ensures it's always set)
    this.engine.sceneManager.activeCamera = this._camera;
  }

  /**
   * Scene activation
   */
  public onActivate(): void {
    // Reset spaceship and camera position
    this._spaceship.reset();

    // Ensure our camera is the active camera
    this.engine.sceneManager.activeCamera = this._camera;

    // Update camera position immediately
    this._updateCamera();

    // Show controls hint
    const instructions = document.createElement("div");
    instructions.id = "space-instructions";
    instructions.style.position = "absolute";
    instructions.style.bottom = "20px";
    instructions.style.left = "50%";
    instructions.style.transform = "translateX(-50%)";
    instructions.style.color = "white";
    instructions.style.fontFamily = "Arial, sans-serif";
    instructions.style.fontSize = "16px";
    instructions.style.textAlign = "center";
    instructions.style.textShadow = "0 0 10px rgba(0,0,0,0.8)";
    instructions.innerHTML = `
      <p>W/S = Accelerate/Brake | A/D = Rotate | Q/E = Up/Down</p>
      <p>Avoid colliding with planets!</p>
    `;

    document.body.appendChild(instructions);
  }

  /**
   * Scene deactivation
   */
  public onDeactivate(): void {
    // Remove any UI elements
    const instructions = document.getElementById("space-instructions");
    if (instructions) {
      instructions.remove();
    }

    this._removeGameOverMessage();
  }

  /**
   * Update function called every frame
   */
  public update(deltaTime: number): void {
    // Clamp deltaTime to avoid large jumps
    const clampedDeltaTime = Math.min(deltaTime, 0.1);

    // Update explosion effect if active
    this._explosion.update(clampedDeltaTime);

    if (this._gameOver) {
      // Count down restart timer
      this._restartTimer -= clampedDeltaTime;
      this._updateGameOverMessage();

      if (this._restartTimer <= 0) {
        this._restartGame();
      }
    } else {
      // Update spaceship
      this._spaceship.update(clampedDeltaTime, this.engine.inputManager);

      // Check for collisions
      this._checkCollisions();
    }

    // Always update camera position to follow ship
    this._updateCamera();

    // Debug - print camera position for troubleshooting
    if (this.engine.isDebugMode() && Math.random() < 0.01) {
      // Only print occasionally
      console.log("Camera position:", this._camera.position);
      console.log("Ship position:", this._spaceship.position);
    }
  }

  /**
   * Handle window resize
   */
  public handleResize(width: number, height: number): void {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
  }

  /**
   * Clean up resources on scene disposal
   */
  public dispose(): void {
    // First call onDeactivate to clean up UI elements
    this.onDeactivate();

    // Remove event listeners if any

    // Properly dispose of all geometries and materials
    this.traverse((object) => {
      if (object instanceof Mesh || object instanceof Points) {
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

    // Clear references
    this._planets = [];
    this._spaceship = null as any;
    this._explosion = null as any;
    this._raycaster = null as any;
  }
}
