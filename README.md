# VibePlay Engine

VibePlay is a modular 3D game engine built with Three.js and Vite, designed to serve as a comprehensive starter kit for game development with AI assistance.

## Features

- **Modular Architecture**: Core systems plus optional plug-ins
- **Asset Management**: Efficient loading, caching, and memory management
- **Input Handling**: Keyboard, mouse, and pointer controls
- **Physics**: Optional physics simulation via Cannon.js
- **Networking**: P2P multiplayer support via PeerJS
- **Audio**: Spatial audio system with Howler.js
- **Component System**: Entity-Component-System inspired design
- **AI-Friendly**: Designed to work well with AI coding assistants
- **Memory System**: Persistent context for LLMs via mem.md

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## AI-Assisted Development

VibePlay is designed to work well with AI coding assistants. The project includes:

- **CLAUDE.md**: Development guidelines for AI assistants
- **mem.md**: Persistent memory file for AI context
- **src/llm-docs/**: Detailed documentation of the engine architecture

## Engine Architecture

The engine follows a modular, component-based architecture:

- **Core**: Engine, SceneManager, RendererManager, SystemManager
- **Systems**: AssetManager, InputManager, AudioManager, PhysicsSystem, NetworkSystem
- **Components**: Reusable gameplay elements (Player, etc.)
- **Scenes**: Game levels and states

## Example Scene

The project includes an example scene that demonstrates:

- Basic scene setup with lighting
- Player movement and camera controls
- Input handling
- Dynamic object creation

## License

MIT

## Acknowledgments

- Three.js - https://threejs.org/
- Cannon.js - https://schteppe.github.io/cannon.js/
- Howler.js - https://howlerjs.com/
- PeerJS - https://peerjs.com/