import './style.css';
import { Engine } from '@core/Engine';
import { ExampleScene } from '@scenes/ExampleScene';
import { PhysicsSystem } from '@systems/physics/PhysicsSystem';
import { NetworkSystem } from '@systems/network/NetworkSystem';

// Create engine with config
const engine = new Engine({
  debugMode: true,
  showFPS: true,
  logLevel: 3, // INFO level
});

// Create and register example scene first
const exampleScene = new ExampleScene(engine);
engine.sceneManager.registerScene('example', exampleScene);

// Register assets (commented out until files are available)
// Uncomment these when you add the actual audio files
/*
engine.assetManager.registerSound('ambient', '/assets/audio/ambient.mp3');
engine.assetManager.registerSound('jump', '/assets/audio/jump.mp3');
engine.assetManager.registerSound('land', '/assets/audio/land.mp3');
*/

// Initialize lazy-loaded systems when needed
const initPhysics = async () => {
  const physicsSystem = new PhysicsSystem(engine);
  await physicsSystem.init();
  engine.systemManager.registerSystem(physicsSystem);
  return physicsSystem;
};

const initNetworking = async () => {
  const networkSystem = new NetworkSystem(engine);
  await networkSystem.init();
  engine.systemManager.registerSystem(networkSystem);
  return networkSystem;
};

// Add minimal UI elements if needed
const createDemoUI = () => {
  // No UI elements needed for the basic demo
  // We're using the instructions from the scene instead
};

// Add any additional styles needed
const addStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    body {
      margin: 0;
      overflow: hidden;
    }
    
    canvas {
      display: block;
    }
    
    .pointer-lock {
      cursor: none;
    }
  `;
  document.head.appendChild(style);
};

// Initialize the application
const init = async () => {
  try {
    // No assets to load for now
    // When you add audio files, uncomment this:
    /*
    await Promise.all([
      engine.assetManager.loadSound('ambient'),
      engine.assetManager.loadSound('jump'),
      engine.assetManager.loadSound('land')
    ]);
    */
    
    // Hide loading screen
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
    
    // Activate the example scene
    engine.sceneManager.activateScene('example');
    
    // Start the engine
    engine.start();
    
    // Create demo UI
    createDemoUI();
    addStyles();
    
    // Update memory file
    updateMemory('Engine started successfully with example scene');
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
};

// Helper to update memory file
const updateMemory = (status: string) => {
  const memory = {
    status,
    timestamp: new Date().toISOString(),
    activeScene: engine.sceneManager.activeScene ? 'example' : 'none',
    systems: {
      physics: !!engine.systemManager.getSystem('physics'),
      networking: !!engine.systemManager.getSystem('networking')
    }
  };
  
  // In a real application, this would write to mem.md
  console.log('Memory updated:', memory);
};

// Handle cleanup when window is closed
window.addEventListener('beforeunload', () => {
  engine.dispose();
});

// Start the application
init();