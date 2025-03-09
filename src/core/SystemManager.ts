import { EventEmitter } from 'eventemitter3';
import { Disposable } from '@utils/Disposable';
import type { Engine } from '@core/Engine';

/**
 * Base interface for all engine systems
 */
export interface System extends Disposable {
  readonly name: string;
  readonly priority: number;
  isEnabled: boolean;
  
  init(): Promise<void>;
  update(deltaTime: number): void;
}

/**
 * Manages all game systems with priority-based execution
 */
export class SystemManager extends EventEmitter implements Disposable {
  private _engine: Engine;
  private _systems: Map<string, System> = new Map();
  private _sortedSystems: System[] = [];
  private _needsSort = false;
  
  constructor(engine: Engine) {
    super();
    this._engine = engine;
    engine.logger.info('SystemManager initialized');
  }

  /**
   * Register a system with the manager
   */
  public registerSystem(system: System): void {
    if (this._systems.has(system.name)) {
      this._engine.logger.warn(`System "${system.name}" is already registered`);
      return;
    }
    
    this._systems.set(system.name, system);
    this._needsSort = true;
    
    // Initialize the system
    system.init().catch(err => {
      this._engine.logger.error(`Failed to initialize system "${system.name}"`, err);
    });
    
    this._engine.logger.debug(`System "${system.name}" registered`);
    this.emit('systemRegistered', system.name);
  }

  /**
   * Unregister and dispose of a system
   */
  public unregisterSystem(name: string): void {
    const system = this._systems.get(name);
    
    if (!system) {
      this._engine.logger.warn(`System "${name}" is not registered`);
      return;
    }
    
    system.dispose();
    this._systems.delete(name);
    this._needsSort = true;
    
    this._engine.logger.debug(`System "${name}" unregistered`);
    this.emit('systemUnregistered', name);
  }

  /**
   * Get a system by name
   */
  public getSystem<T extends System>(name: string): T | null {
    return (this._systems.get(name) as T) || null;
  }

  /**
   * Update all enabled systems in priority order
   */
  public update(deltaTime: number): void {
    // Sort systems by priority if needed
    if (this._needsSort) {
      this._sortSystems();
    }
    
    // Update each enabled system
    for (const system of this._sortedSystems) {
      if (system.isEnabled) {
        system.update(deltaTime);
      }
    }
  }

  /**
   * Sort systems by priority (higher priority systems run first)
   */
  private _sortSystems(): void {
    this._sortedSystems = Array.from(this._systems.values())
      .sort((a, b) => b.priority - a.priority);
    this._needsSort = false;
  }

  /**
   * Dispose of all systems
   */
  public dispose(): void {
    // Dispose all systems
    this._systems.forEach(system => {
      system.dispose();
    });
    
    this._systems.clear();
    this._sortedSystems = [];
    
    this.removeAllListeners();
    this._engine.logger.info('SystemManager disposed');
  }
}