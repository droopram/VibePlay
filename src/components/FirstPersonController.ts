import { Object3D, Vector3, PerspectiveCamera, Euler, Raycaster } from 'three';
import { Disposable } from '@utils/Disposable';
import type { Engine } from '@core/Engine';

/**
 * Simple first-person camera controller
 */
export class FirstPersonController implements Disposable {
  private _engine: Engine;
  private _camera: PerspectiveCamera;
  private _isEnabled = false;
  
  // Movement
  private _moveSpeed = 5.0;
  private _runSpeed = 10.0;
  private _velocity = new Vector3();
  private _moveForward = false;
  private _moveBackward = false;
  private _moveLeft = false;
  private _moveRight = false;
  private _isRunning = false;
  
  // Jumping - adjusted for snappier feel
  private _canJump = true;
  private _isJumping = false;
  private _jumpHeight = 30.0; // Higher initial jump velocity
  private _verticalVelocity = 0;
  private _gravity = 60.0; // Higher gravity for less floaty jumps
  
  // Camera control
  private _euler = new Euler(0, 0, 0, 'YXZ');
  private _lookSensitivity = 0.002;
  
  // Raycaster for platform detection
  private _raycaster = new Raycaster();
  private _downDirection = new Vector3(0, -1, 0);
  
  constructor(engine: Engine, camera: PerspectiveCamera) {
    this._engine = engine;
    this._camera = camera;
    
    // Initialize position at the start of the parkour course
    this._camera.position.set(0, 2, 3); // At the starting platform
    
    // Listen for input events
    this._setupInputListeners();
    
    console.log('FirstPersonController initialized');
  }
  
  /**
   * Set up input event listeners
   */
  private _setupInputListeners(): void {
    // Reset movement state
    this._moveForward = false;
    this._moveBackward = false;
    this._moveLeft = false;
    this._moveRight = false;
    
    // Key down events
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    
    // Mouse movement
    document.addEventListener('mousemove', this._onMouseMove);
    
    // Click to enable pointer lock
    document.addEventListener('click', this._onClick);
    
    // Pointer lock change
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    
    console.log("Input listeners set up");
  }
  
  /**
   * Handle key down events
   */
  private _onKeyDown = (event: KeyboardEvent): void => {
    if (!this._isEnabled) return;
    
    console.log('Key pressed:', event.code);
    
    // FIXED key mapping to ensure W is forward, S is backward
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._moveForward = true;
        this._moveBackward = false; // Ensure opposite direction is off
        console.log('FORWARD set to TRUE');
        break;
        
      case 'KeyS':
      case 'ArrowDown':
        this._moveBackward = true;
        this._moveForward = false; // Ensure opposite direction is off
        console.log('BACKWARD set to TRUE');
        break;
        
      case 'KeyA':
      case 'ArrowLeft':
        this._moveLeft = true;
        this._moveRight = false; // Ensure opposite direction is off
        break;
        
      case 'KeyD':
      case 'ArrowRight':
        this._moveRight = true;
        this._moveLeft = false; // Ensure opposite direction is off
        break;
        
      case 'Space':
        if (this._canJump) {
          console.log('Jump initiated');
          this._verticalVelocity = this._jumpHeight;
          this._canJump = false;
          this._isJumping = true;
        }
        break;
        
      case 'ShiftLeft':
      case 'ShiftRight':
        this._isRunning = true;
        break;
    }
  };
  
  /**
   * Handle key up events
   */
  private _onKeyUp = (event: KeyboardEvent): void => {
    if (!this._isEnabled) return;
    
    console.log('Key released:', event.code);
    
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this._moveForward = false;
        console.log('FORWARD set to FALSE');
        break;
        
      case 'KeyS':
      case 'ArrowDown':
        this._moveBackward = false;
        console.log('BACKWARD set to FALSE');
        break;
        
      case 'KeyA':
      case 'ArrowLeft':
        this._moveLeft = false;
        break;
        
      case 'KeyD':
      case 'ArrowRight':
        this._moveRight = false;
        break;
        
      case 'ShiftLeft':
      case 'ShiftRight':
        this._isRunning = false;
        break;
    }
  };
  
  /**
   * Handle mouse movement for camera rotation
   */
  private _onMouseMove = (event: MouseEvent): void => {
    if (!this._isEnabled || !this._isPointerLocked()) return;
    
    // Adjust camera rotation based on mouse movement
    this._euler.setFromQuaternion(this._camera.quaternion);
    
    // Apply mouse movement (with sensitivity adjustment)
    this._euler.y -= event.movementX * this._lookSensitivity;
    this._euler.x -= event.movementY * this._lookSensitivity;
    
    // Clamp vertical look to prevent camera flipping
    this._euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this._euler.x));
    
    // Apply rotation to camera
    this._camera.quaternion.setFromEuler(this._euler);
    
    console.log('Mouse move processed', event.movementX, event.movementY);
  };
  
  /**
   * Handle click to request pointer lock
   */
  private _onClick = (): void => {
    if (!this._isEnabled || this._isPointerLocked()) return;
    
    // Request pointer lock on click
    document.body.requestPointerLock();
    console.log('Requesting pointer lock from click');
  };
  
  /**
   * Handle pointer lock change
   */
  private _onPointerLockChange = (): void => {
    if (this._isPointerLocked()) {
      console.log('Pointer locked - controls enabled');
      document.body.classList.add('pointer-lock');
    } else {
      console.log('Pointer unlocked - click to enable controls');
      document.body.classList.remove('pointer-lock');
    }
  };
  
  /**
   * Check if pointer is locked
   */
  private _isPointerLocked(): boolean {
    return document.pointerLockElement === document.body;
  }
  
  /**
   * Enable controller
   */
  public enable(): void {
    this._isEnabled = true;
    console.log('First person controller enabled');
  }
  
  /**
   * Disable controller
   */
  public disable(): void {
    this._isEnabled = false;
    
    // Reset movement state
    this._moveForward = false;
    this._moveBackward = false;
    this._moveLeft = false;
    this._moveRight = false;
    this._isRunning = false;
    
    // Exit pointer lock if active
    if (this._isPointerLocked()) {
      document.exitPointerLock();
    }
  }
  
  /**
   * Update controller
   */
  public update(deltaTime: number): void {
    if (!this._isEnabled) return;
    
    console.log("Movement state:", { 
      forward: this._moveForward, 
      backward: this._moveBackward, 
      left: this._moveLeft, 
      right: this._moveRight 
    });
    
    // Calculate speed based on running state
    const speed = this._isRunning ? this._runSpeed : this._moveSpeed;
    
    // Reset horizontal velocity
    this._velocity.x = 0;
    this._velocity.z = 0;
    
    // Get movement direction from input (FIXED W/S mapping)
    const moveDirection = new Vector3();
    
    // IMPORTANT: W should move FORWARD (negative Z), S should move BACKWARD (positive Z)
    if (this._moveForward) {
      moveDirection.z = -1; // Forward is negative Z in Three.js
    }
    if (this._moveBackward) {
      moveDirection.z = 1; // Backward is positive Z in Three.js
    }
    if (this._moveLeft) {
      moveDirection.x = -1; // Left is negative X
    }
    if (this._moveRight) {
      moveDirection.x = 1; // Right is positive X
    }
    
    // Normalize if moving diagonally
    if (moveDirection.length() > 1) {
      moveDirection.normalize();
    }
    
    // Apply movement direction to velocity with speed
    this._velocity.x = moveDirection.x * speed * deltaTime;
    this._velocity.z = moveDirection.z * speed * deltaTime;
    
    // Apply gravity and jumping
    this._verticalVelocity -= this._gravity * deltaTime;
    
    // Check for collision with ground or platforms
    this._checkPlatformCollision(deltaTime);
    
    // Apply vertical velocity
    this._camera.position.y += this._verticalVelocity * deltaTime;
    
    // Convert forward/right movements relative to camera direction
    if (this._velocity.x !== 0 || this._velocity.z !== 0) {
      console.log("Moving with velocity:", this._velocity);
      
      // Get direction vectors from camera quaternion
      const forward = new Vector3(0, 0, -1).applyQuaternion(this._camera.quaternion);
      forward.y = 0; // Keep movement horizontal
      forward.normalize();
      
      const right = new Vector3(1, 0, 0).applyQuaternion(this._camera.quaternion);
      right.y = 0; // Keep movement horizontal
      right.normalize();
      
      // Scale by velocity (THIS IS CRITICAL - if z is wrong, W/S will be reversed)
      const forwardMovement = forward.clone().multiplyScalar(this._velocity.z);
      const rightMovement = right.clone().multiplyScalar(this._velocity.x);
      
      // Debug
      console.log("Forward movement:", forwardMovement);
      console.log("Right movement:", rightMovement);
      
      // Apply movement
      this._camera.position.add(forwardMovement);
      this._camera.position.add(rightMovement);
    }
  }
  
  /**
   * Get camera position
   */
  public getPosition(): Vector3 {
    return this._camera.position.clone();
  }
  
  /**
   * Set camera position
   */
  public setPosition(position: Vector3): void {
    this._camera.position.copy(position);
  }
  
  /**
   * Check for collision with ground and platforms
   */
  private _checkPlatformCollision(deltaTime: number): void {
    // Get all objects from the scene to check for collisions
    const scene = this._engine.sceneManager.activeScene;
    if (!scene) return;
    
    // Set raycaster position and direction
    this._raycaster.set(this._camera.position, this._downDirection);
    
    // Get all intersections below the player
    const intersects = this._raycaster.intersectObjects(scene.children, true);
    
    // Debug
    console.log(`Found ${intersects.length} objects below player`);
    
    // The default ground height when there's no platform
    const DEFAULT_HEIGHT = 2.0;
    
    // Check if we hit anything below
    if (intersects.length > 0) {
      // Get the closest intersection
      const intersection = intersects[0];
      
      // Calculate distance to bottom of player (player height is approx 2 units)
      const playerHeight = 2.0;
      const distanceToGround = intersection.distance;
      
      console.log(`Distance to ground: ${distanceToGround}, Player height: ${playerHeight}`);
      
      // If we're very close to a surface or below it
      if (distanceToGround <= playerHeight && this._verticalVelocity <= 0) {
        // Snap to the surface
        this._verticalVelocity = 0;
        
        // Position player at exact surface level plus player height
        const targetY = intersection.point.y + playerHeight;
        
        // Only snap if we're not jumping up through a platform
        if (this._camera.position.y <= targetY) {
          this._camera.position.y = targetY;
        }
        
        // Allow jumping
        this._canJump = true;
        
        // Mark as landed if we were jumping
        if (this._isJumping) {
          this._isJumping = false;
          console.log('Landed on platform at height:', targetY);
        }
      }
    } else {
      // No platforms below, check if we're at or below default ground level
      if (this._camera.position.y <= DEFAULT_HEIGHT && this._verticalVelocity <= 0) {
        this._verticalVelocity = 0;
        this._camera.position.y = DEFAULT_HEIGHT;
        this._canJump = true;
        
        if (this._isJumping) {
          this._isJumping = false;
          console.log('Landed on default ground');
        }
      }
    }
    
    // Safety check - prevent falling below default ground
    if (this._camera.position.y < DEFAULT_HEIGHT) {
      this._camera.position.y = DEFAULT_HEIGHT;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove event listeners
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    
    this.disable();
    
    console.log('FirstPersonController disposed');
  }
}