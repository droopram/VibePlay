import { EventEmitter } from 'eventemitter3';
import { Disposable } from '@utils/Disposable';
import type { Engine } from '@core/Engine';
import { Vector2 } from 'three';

/**
 * Input action types
 */
export type InputActionType = 'pressed' | 'released' | 'held';

/**
 * Input binding configuration
 */
export interface InputBinding {
  key: string;
  action: string;
  type: InputActionType;
}

/**
 * Manages all user input (keyboard, mouse, touch, gamepad)
 */
export class InputManager extends EventEmitter implements Disposable {
  private _engine: Engine;
  private _bindings: InputBinding[] = [];
  private _keysDown: Map<string, boolean> = new Map();
  private _mousePosition: Vector2 = new Vector2();
  private _mouseDelta: Vector2 = new Vector2();
  private _isMouseDown: boolean = false;
  private _isPointerLocked: boolean = false;
  
  constructor(engine: Engine) {
    super();
    this._engine = engine;
    
    // Initialize event listeners
    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('mousedown', this._handleMouseDown);
    window.addEventListener('mouseup', this._handleMouseUp);
    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('contextmenu', this._handleContextMenu);
    window.addEventListener('pointerlockchange', this._handlePointerLockChange);
    
    engine.logger.info('InputManager initialized');
  }

  /**
   * Add a new input binding
   */
  public addBinding(binding: InputBinding): void {
    this._bindings.push(binding);
  }

  /**
   * Remove an input binding
   */
  public removeBinding(action: string): void {
    this._bindings = this._bindings.filter(b => b.action !== action);
  }

  /**
   * Check if a key is currently pressed
   */
  public isKeyDown(key: string): boolean {
    return this._keysDown.get(key) || false;
  }

  /**
   * Get the current mouse position
   */
  public getMousePosition(): Vector2 {
    return this._mousePosition.clone();
  }

  /**
   * Get the mouse movement delta
   */
  public getMouseDelta(): Vector2 {
    return this._mouseDelta.clone();
  }

  /**
   * Check if the mouse button is pressed
   */
  public isMouseDown(): boolean {
    return this._isMouseDown;
  }

  /**
   * Request pointer lock for mouse capture
   */
  public requestPointerLock(): void {
    const canvas = this._engine.rendererManager.renderer.domElement;
    
    // Add a click listener to request pointer lock on user interaction
    // This is needed because pointer lock requires a user gesture
    const requestLockOnClick = () => {
      canvas.requestPointerLock();
    };
    
    canvas.addEventListener('click', requestLockOnClick, { once: true });
    this._engine.logger.info('Click the game screen to enable controls');
    
    // Also try direct request (may work if already had permission)
    canvas.requestPointerLock();
  }

  /**
   * Exit pointer lock
   */
  public exitPointerLock(): void {
    document.exitPointerLock();
  }

  /**
   * Handle key down events
   */
  private _handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    console.log('Key down:', key, 'code:', event.code);
    
    // Special handling for space
    if (event.code === 'Space') {
      this._keysDown.set('space', true);
      this._keysDown.set(' ', true);
      this._processBindings('space', 'pressed');
      this._processBindings(' ', 'pressed');
      this.emit('keyDown', 'space');
      return;
    }
    
    // Only process if state changed
    if (!this._keysDown.get(key)) {
      this._keysDown.set(key, true);
      
      // Trigger 'pressed' bindings
      this._processBindings(key, 'pressed');
      
      this.emit('keyDown', key);
    }
  };

  /**
   * Handle key up events
   */
  private _handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    
    this._keysDown.set(key, false);
    
    // Trigger 'released' bindings
    this._processBindings(key, 'released');
    
    this.emit('keyUp', key);
  };

  /**
   * Handle mouse down events
   */
  private _handleMouseDown = (event: MouseEvent): void => {
    this._isMouseDown = true;
    
    // Convert mousebutton to key name
    const buttonMap = ['left', 'middle', 'right'];
    const key = `mouse${buttonMap[event.button] || event.button}`;
    
    this._keysDown.set(key, true);
    
    // Trigger 'pressed' bindings
    this._processBindings(key, 'pressed');
    
    this.emit('mouseDown', event);
  };

  /**
   * Handle mouse up events
   */
  private _handleMouseUp = (event: MouseEvent): void => {
    this._isMouseDown = false;
    
    // Convert mousebutton to key name
    const buttonMap = ['left', 'middle', 'right'];
    const key = `mouse${buttonMap[event.button] || event.button}`;
    
    this._keysDown.set(key, false);
    
    // Trigger 'released' bindings
    this._processBindings(key, 'released');
    
    this.emit('mouseUp', event);
  };

  /**
   * Handle mouse move events
   */
  private _handleMouseMove = (event: MouseEvent): void => {
    // Update mouse position
    this._mousePosition.set(event.clientX, event.clientY);
    
    // Calculate delta movement for pointer lock
    if (this._isPointerLocked) {
      console.log('Mouse move with pointer lock:', event.movementX, event.movementY);
      this._mouseDelta.set(event.movementX, event.movementY);
      this.emit('mouseMove', this._mousePosition, this._mouseDelta);
    } else {
      this._mouseDelta.set(0, 0);
      
      // Debug if we're getting mouse events but pointer isn't locked
      if (event.movementX !== 0 || event.movementY !== 0) {
        console.log('Mouse move without pointer lock - click to enable controls');
      }
    }
  };

  /**
   * Handle context menu events (prevent right-click menu)
   */
  private _handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  /**
   * Handle pointer lock change
   */
  private _handlePointerLockChange = (): void => {
    const previousState = this._isPointerLocked;
    this._isPointerLocked = document.pointerLockElement === this._engine.rendererManager.renderer.domElement;
    
    if (previousState !== this._isPointerLocked) {
      console.log('Pointer lock state changed:', this._isPointerLocked ? 'LOCKED' : 'UNLOCKED');
      
      if (this._isPointerLocked) {
        console.log('Controls enabled - use mouse to look around');
        document.body.classList.add('pointer-lock');
      } else {
        console.log('Controls disabled - click to re-enable');
        document.body.classList.remove('pointer-lock');
        
        // Re-add click handler for re-enabling
        const canvas = this._engine.rendererManager.renderer.domElement;
        canvas.addEventListener('click', () => canvas.requestPointerLock(), { once: true });
      }
    }
    
    this.emit('pointerLockChange', this._isPointerLocked);
  };

  /**
   * Process input bindings for a key and type
   */
  private _processBindings(key: string, type: InputActionType): void {
    for (const binding of this._bindings) {
      if (binding.key === key && binding.type === type) {
        this.emit('action', binding.action);
      }
    }
  }

  /**
   * Update input state (check for held keys)
   */
  public update(deltaTime: number): void {
    // Process 'held' bindings
    this._keysDown.forEach((isDown, key) => {
      if (isDown) {
        this._processBindings(key, 'held');
      }
    });
    
    // Reset mouse delta after processing
    this._mouseDelta.set(0, 0);
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('mousedown', this._handleMouseDown);
    window.removeEventListener('mouseup', this._handleMouseUp);
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('contextmenu', this._handleContextMenu);
    window.removeEventListener('pointerlockchange', this._handlePointerLockChange);
    
    this.removeAllListeners();
    this._engine.logger.info('InputManager disposed');
  }
}