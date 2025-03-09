# VibePlay Engine Memory

This file serves as persistent memory for AI assistants working with the VibePlay engine. AI assistants should update this file when making significant changes to the codebase.

## Project Status
- Engine core systems implemented: renderer, scenes, input, audio, assets
- Optional systems ready: physics, networking
- Example scene with basic player controls created
- LLM documentation available in src/llm-docs/

## Engine Architecture
- Core: Engine, SceneManager, RendererManager, SystemManager
- Systems: AssetManager, InputManager, AudioManager, PhysicsSystem, NetworkSystem
- Components: Player (implemented), others to be added as needed
- Scenes: ExampleScene (implemented), others to be added as needed

## Key Features
- Three.js-based rendering with optimized pipeline
- Modular ECS-inspired architecture
- Asset streaming and resource management
- Input handling for keyboard, mouse, and pointers
- Spatial audio system using Howler.js
- Physics simulation using Cannon.js (optional)
- P2P networking using PeerJS (optional)

## Code Style Preferences
- Typescript with strict typing
- 2-space indentation
- Private variables with underscore prefix (_varName)
- PascalCase for classes, camelCase for variables and methods
- Explicit member visibility (public, private, protected)
- Interface-based design for flexibility

## Last Updates
- Initial project setup completed
- Core engine architecture implemented
- Basic example scene created
- Player movement and camera controls added
- Memory system created for LLM context persistence