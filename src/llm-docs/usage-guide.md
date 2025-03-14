# VibePlay Engine Usage Guide

This guide explains how to use the VibePlay engine to create 3D games.

## Getting Started

### Initializing the Engine

The first step is to create an instance of the Engine with your desired configuration:

```typescript
import { Engine } from '@core/Engine';

const engine = new Engine({
  // Optional configuration
  debugMode: true,
  showFPS: true,
  shadows: true
});
```

### Creating a Scene

Create a custom scene by extending the GameScene class:

```typescript
import { GameScene } from '@core/SceneManager';

export class MyScene extends GameScene {
  constructor(engine: Engine) {
    super(engine);
    
    // Set up your scene
    this._setupLights();
    this._setupEnvironment();
  }
  
  // Required methods
  onActivate(): void {
    // Called when the scene becomes active
  }
  
  onDeactivate(): void {
    // Called when the scene is no longer active
  }
  
  update(deltaTime: number): void {
    // Update logic for each frame
  }
  
  dispose(): void {
    // Clean up resources
  }
  
  // Custom methods
  private _setupLights(): void {
    // Add lights to the scene
  }
  
  private _setupEnvironment(): void {
    // Add objects to the scene
  }
}
```

### Registering and Activating the Scene

Register your scene with the engine and activate it:

```typescript
const myScene = new MyScene(engine);
engine.sceneManager.registerScene('main', myScene);
engine.sceneManager.activateScene('main');
```

### Starting the Engine

Start the game loop:

```typescript
engine.start();
```

## Working with Assets

### Loading Assets

Use the AssetManager to load and manage assets:

```typescript
// Register assets
engine.assetManager.registerSound('music', '/assets/audio/music.mp3');

// Load textures
const texture = await engine.assetManager.loadTexture('/assets/textures/diffuse.jpg');

// Load models
const model = await engine.assetManager.loadModel('/assets/models/character.glb');

// Add model to scene
myScene.add(model.scene);
```

### Releasing Assets

When you no longer need an asset, release it:

```typescript
engine.assetManager.releaseAsset('/assets/textures/diffuse.jpg', 'texture');
```

## Handling Input

### Basic Input Checking

Check for key presses directly:

```typescript
if (engine.inputManager.isKeyDown('w')) {
  // Move forward
}
```

### Input Bindings

Create bindings for specific actions:

```typescript
// Setup bindings
engine.inputManager.addBinding({ key: 'w', action: 'move_forward', type: 'held' });
engine.inputManager.addBinding({ key: 'space', action: 'jump', type: 'pressed' });

// Listen for actions
engine.inputManager.on('action', (action) => {
  if (action === 'jump') {
    // Perform jump
  }
});
```

## Using Physics

### Initializing Physics

```typescript
import { PhysicsSystem } from '@systems/physics/PhysicsSystem';

const physicsSystem = new PhysicsSystem(engine);
await physicsSystem.init();
engine.systemManager.registerSystem(physicsSystem);
```

### Creating Physics Bodies

```typescript
// Create a box physics body
const boxMesh = new Mesh(
  new BoxGeometry(1, 1, 1),
  new MeshStandardMaterial({ color: 0xff0000 })
);
myScene.add(boxMesh);

const boxBody = physicsSystem.createBoxBody(
  boxMesh,
  new Vector3(1, 1, 1),
  1 // mass
);

// Apply forces
boxBody.applyForce(new Vector3(0, 10, 0));
```

## Adding Networking

### Initializing Networking

```typescript
import { NetworkSystem } from '@systems/network/NetworkSystem';

const networkSystem = new NetworkSystem(engine);
await networkSystem.init();
engine.systemManager.registerSystem(networkSystem);
```

### Creating or Joining a Room

```typescript
// Create a room as host
const roomId = networkSystem.createRoom();

// Or join an existing room
await networkSystem.joinRoom('ROOM123');
```

### Sending and Receiving Data

```typescript
// Send player position
networkSystem.sendPlayerTransform(
  player.position,
  player.quaternion,
  player.velocity
);

// Listen for other players
networkSystem.on('playerTransform', (peerId, data) => {
  // Update other player position
  updateRemotePlayer(peerId, data);
});
```

## Working with Audio

### Playing Sounds

```typescript
// Play a sound effect
engine.audioManager.playSound('jump', {
  volume: 0.5,
  spatial: true,
  position: player.position
});

// Play background music
engine.audioManager.playSound('music', {
  loop: true,
  volume: 0.3
});
```

### Spatial Audio

```typescript
// Update audio listener position (usually the camera)
engine.audioManager.updateListenerPosition(
  camera.position,
  new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
);

// Update a sound's position
const soundId = engine.audioManager.playSound('footsteps', {
  spatial: true,
  position: character.position
});

// Later update the position
engine.audioManager.updateSpatialPosition(soundId, character.position);
```

## Performance Optimization

### Object Pooling

Reuse objects rather than creating/destroying them:

```typescript
class BulletPool {
  private _pool: Bullet[] = [];
  
  getBullet(): Bullet {
    // Reuse an inactive bullet or create a new one
    const bullet = this._pool.find(b => !b.active) || this._createBullet();
    bullet.active = true;
    return bullet;
  }
  
  returnBullet(bullet: Bullet): void {
    bullet.active = false;
  }
  
  private _createBullet(): Bullet {
    const bullet = new Bullet();
    this._pool.push(bullet);
    return bullet;
  }
}
```

### Level of Detail (LOD)

Use LOD for complex models:

```typescript
import { LOD } from 'three';

const characterLOD = new LOD();

// Add LOD levels
characterLOD.addLevel(highDetailModel, 0);    // Close distance
characterLOD.addLevel(mediumDetailModel, 10); // Medium distance
characterLOD.addLevel(lowDetailModel, 50);    // Far distance

scene.add(characterLOD);
```

## UI Integration

### Basic UI

Create UI elements with HTML and CSS:

```typescript
const uiElement = document.createElement('div');
uiElement.className = 'health-bar';
uiElement.style.width = `${health}%`;
document.getElementById('ui-container').appendChild(uiElement);
```

### 3D UI

Create UI elements in 3D space:

```typescript
import { Sprite, SpriteMaterial } from 'three';

// Create a sprite for a health bar
const healthBarMaterial = new SpriteMaterial({
  map: healthBarTexture,
  transparent: true
});

const healthBar = new Sprite(healthBarMaterial);
healthBar.position.y = 2; // Above character
character.add(healthBar);
```

## Memory Management

Always dispose of resources when you're done with them:

```typescript
dispose(): void {
  // Dispose geometries
  this.geometry.dispose();
  
  // Dispose materials
  if (Array.isArray(this.material)) {
    this.material.forEach(m => m.dispose());
  } else {
    this.material.dispose();
  }
  
  // Dispose textures
  this.texture.dispose();
  
  // Remove from parent
  if (this.parent) {
    this.parent.remove(this);
  }
  
  // Remove event listeners
  this.removeAllListeners();
}
```