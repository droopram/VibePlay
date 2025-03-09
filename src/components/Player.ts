import {
  Object3D,
  Vector3,
  PerspectiveCamera,
  Raycaster,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh
} from 'three';
import { Disposable } from '@utils/Disposable';
import type { Engine } from '@core/Engine';

/**
 * Player movement settings
 */
interface PlayerMovementSettings {
  walkSpeed: number;
  runSpeed: number;
  jumpForce: number;
  gravity: number;
  lookSensitivity: number;
}

/**
 * Player component that handles movement, input, and camera
 */
export class Player implements Disposable {
  private _engine: Engine;
  private _camera: PerspectiveCamera;
  private _object: Object3D;
  private _raycaster: Raycaster;
  private _isEnabled = false;
  
  // Movement state
  private _velocity = new Vector3();
  private _isGrounded = true;
  private _isJumping = false;
  private _isRunning = false;
  
  // Camera control
  private _pitch = 0;
  private _yaw = 0;
  
  // Settings
  private _settings: PlayerMovementSettings = {
    walkSpeed: 5,
    runSpeed: 10,
    jumpForce: 7,
    gravity: 20,
    lookSensitivity: 0.002
  };
  
  /**
   * Get the player's 3D object
   */
  public get object(): Object3D {
    return this._object;
  }
  
  /**
   * Get the player's position
   */
  public get position(): Vector3 {
    return this._object.position;
  }
  
  constructor(engine: Engine, camera: PerspectiveCamera) {
    this._engine = engine;
    this._camera = camera;
    
    // Create player object
    this._object = new Object3D();
    this._object.position.set(0, 1.8, 0); // Eye height
    
    // If debug mode, add a visible body
    if (engine.isDebugMode()) {
      const bodyGeometry = new BoxGeometry(0.5, 1.8, 0.5);
      const bodyMaterial = new MeshStandardMaterial({ color: 0x0000ff, wireframe: true });
      const bodyMesh = new Mesh(bodyGeometry, bodyMaterial);
      bodyMesh.position.y = -0.9; // Center the mesh on player position
      this._object.add(bodyMesh);
    }
    
    // Add camera as child of player
    this._object.add(this._camera);
    
    // Create raycaster for ground detection
    this._raycaster = new Raycaster();
    
    // Listen for input events
    this._setupInputListeners();
    
    // Debug message
    console.log('Player component initialized');
  }

  /**
   * Set up input event listeners
   */
  private _setupInputListeners(): void {
    // Mouse movement - for camera control
    this._engine.inputManager.on('mouseMove', (_, delta) => {
      if (!this._isEnabled) return;
      
      console.log('Mouse move detected:', delta);
      
      // Update camera rotation
      this._yaw -= delta.x * this._settings.lookSensitivity;
      this._pitch -= delta.y * this._settings.lookSensitivity;
      
      // Clamp pitch to prevent camera flipping
      this._pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this._pitch));
      
      // Apply rotations
      this._object.rotation.y = this._yaw;
      this._camera.rotation.x = this._pitch;
    });
    
    // Add direct key listener for jump
    window.addEventListener('keydown', (event) => {
      if (!this._isEnabled) return;
      
      if (event.code === 'Space' && this._isGrounded) {
        console.log('Jump key pressed');
        this._velocity.y = this._settings.jumpForce;
        this._isGrounded = false;
        this._isJumping = true;
      }
    });
    
    // Running state
    this._engine.inputManager.on('action', action => {
      if (!this._isEnabled) return;
      
      console.log('Action received:', action);
      
      if (action === 'run') {
        this._isRunning = true;
      }
      
      // Jump action
      if (action === 'jump' && this._isGrounded) {
        console.log('Jump action triggered');
        this._velocity.y = this._settings.jumpForce;
        this._isGrounded = false;
        this._isJumping = true;
      }
    });
  }

  /**
   * Enable player controls
   */
  public enable(): void {
    this._isEnabled = true;
  }

  /**
   * Disable player controls
   */
  public disable(): void {
    this._isEnabled = false;
    this._isRunning = false;
  }

  /**
   * Update player state
   */
  public update(deltaTime: number): void {
    if (!this._isEnabled) return;
    
    // Handle movement input
    this._handleMovementInput();
    
    // Apply gravity
    this._applyGravity(deltaTime);
    
    // Check ground collision
    this._checkGroundCollision();
    
    // Update position
    this._object.position.add(this._velocity.clone().multiplyScalar(deltaTime));
    
    // Reset running state (needs to be held)
    this._isRunning = false;
  }

  /**
   * Handle player movement from input
   */
  private _handleMovementInput(): void {
    // Calculate movement speed
    const speed = this._isRunning ? this._settings.runSpeed : this._settings.walkSpeed;
    
    // Reset horizontal velocity
    this._velocity.x = 0;
    this._velocity.z = 0;
    
    // Get movement direction from input
    if (this._engine.inputManager.isKeyDown('w')) {
      const direction = new Vector3(0, 0, -1);
      direction.applyAxisAngle(new Vector3(0, 1, 0), this._object.rotation.y);
      this._velocity.add(direction.multiplyScalar(speed));
    }
    
    if (this._engine.inputManager.isKeyDown('s')) {
      const direction = new Vector3(0, 0, 1);
      direction.applyAxisAngle(new Vector3(0, 1, 0), this._object.rotation.y);
      this._velocity.add(direction.multiplyScalar(speed));
    }
    
    if (this._engine.inputManager.isKeyDown('a')) {
      const direction = new Vector3(-1, 0, 0);
      direction.applyAxisAngle(new Vector3(0, 1, 0), this._object.rotation.y);
      this._velocity.add(direction.multiplyScalar(speed));
    }
    
    if (this._engine.inputManager.isKeyDown('d')) {
      const direction = new Vector3(1, 0, 0);
      direction.applyAxisAngle(new Vector3(0, 1, 0), this._object.rotation.y);
      this._velocity.add(direction.multiplyScalar(speed));
    }
    
    // Play footstep sounds if moving on ground
    if (this._isGrounded && (this._velocity.x !== 0 || this._velocity.z !== 0)) {
      // Could play footstep sounds here at intervals
    }
  }

  /**
   * Apply gravity effect
   */
  private _applyGravity(deltaTime: number): void {
    if (!this._isGrounded) {
      this._velocity.y -= this._settings.gravity * deltaTime;
    }
  }

  /**
   * Check for ground collision
   */
  private _checkGroundCollision(): void {
    // Cast a ray downward to detect ground
    this._raycaster.set(this._object.position, new Vector3(0, -1, 0));
    
    const intersects = this._raycaster.intersectObjects(
      this._engine.sceneManager.activeScene?.children || [],
      true
    );
    
    // Check if we're close to the ground
    const wasGrounded = this._isGrounded;
    this._isGrounded = false;
    
    // Debug ground detection
    console.log('Ground check:', intersects.length > 0 ? `Found ${intersects.length} objects below` : 'No ground detected');
    
    // Force grounded state for demo
    this._isGrounded = true;
    
    for (const intersect of intersects) {
      console.log('Ground distance:', intersect.distance);
      if (intersect.distance < 1.8) { // Player height
        this._isGrounded = true;
        
        // If we just landed
        if (!wasGrounded && this._isJumping) {
          console.log('Player landed');
          this._isJumping = false;
          this._velocity.y = 0;
        }
        break;
      }
    }
    
    // If on ground, zero out Y velocity
    if (this._isGrounded && this._velocity.y < 0) {
      this._velocity.y = 0;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove any mesh children and their materials
    this._object.traverse(child => {
      if (child instanceof Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    
    // Remove from parent if added to a scene
    if (this._object.parent) {
      this._object.parent.remove(this._object);
    }
  }
}