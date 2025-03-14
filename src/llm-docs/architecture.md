# VibePlay Engine Architecture

This document explains the architecture of the VibePlay engine to help AI assistants understand how to work with it effectively.

## Core Architecture

The VibePlay engine follows a modular, component-based architecture with these key concepts:

### Engine Core

- `Engine`: Central singleton that manages the game loop and all systems
- `SceneManager`: Handles scenes, transitions, and the active camera
- `RendererManager`: Manages Three.js renderer, post-processing, and rendering state
- `SystemManager`: Controls all game systems with priority-based execution order
- `Config`: Engine configuration options with sensible defaults

### System Layer

Systems are specialized modules that provide specific functionality:

- `AssetManager`: Handles loading, caching, and disposing of assets (textures, models, audio)
- `InputManager`: Processes keyboard, mouse, touch, and gamepad input
- `AudioManager`: Controls spatial audio, sound effects, and music
- `PhysicsSystem`: Optional physics simulation using Cannon.js
- `NetworkSystem`: Optional peer-to-peer networking using PeerJS

### Scene Layer

- `GameScene`: Base class for all game scenes
- Custom scenes inherit from GameScene and implement game-specific logic
- Scenes manage the objects, lights, and cameras in the 3D world

### Component Layer

- Components are reusable building blocks that can be attached to game objects
- Examples: Player, PhysicsBody, AI controllers, etc.
- Follow composition over inheritance principle

## Key Design Patterns

1. **Singleton Pattern**: Used for the Engine core and managers
2. **Component Pattern**: For gameplay elements and behaviors
3. **Observer Pattern**: Event-based communication using EventEmitter
4. **Factory Pattern**: For creating objects with proper initialization
5. **Resource Management**: Proper loading, caching, and disposal of resources

## Memory Management

The engine uses a strict resource management approach:

1. All Three.js objects (geometries, materials, textures) must be disposed of when no longer needed
2. The `Disposable` interface ensures consistent cleanup
3. Caching is used to prevent duplicate loading of assets
4. Reference counting tracks resource usage

## Extension Points

To extend the engine:

1. Create custom systems by implementing the `System` interface
2. Create new scenes by extending `GameScene`
3. Create components by following the component pattern
4. Add post-processing effects through the RendererManager

## Asset Pipeline

Assets are loaded through the AssetManager with:

1. Priority-based queuing
2. Automatic caching
3. Reference counting
4. Type-safe handling of different asset types (textures, models, audio, etc.)

## Performance Considerations

1. Use LOD (Level of Detail) for complex models
2. Implement frustum culling for large scenes
3. Batch geometries for static objects
4. Use object pooling for frequently created/destroyed objects
5. Lazy-load systems and assets when they're needed