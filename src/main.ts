import "./style.css";
import { Engine } from "@core/Engine";
import { SpaceScene } from "@scenes/SpaceScene";
import { PhysicsSystem } from "@systems/physics/PhysicsSystem";
import { NetworkSystem } from "@systems/network/NetworkSystem";

// Create engine with config
const engine = new Engine({
  debugMode: true,
  showFPS: true,
  logLevel: 3, // INFO level
});

// Create and register space scene
const spaceScene = new SpaceScene(engine);
engine.sceneManager.registerScene("space", spaceScene);

// Register assets (commented out until files are available)
// Uncomment these when you add the actual audio files
/*
engine.assetManager.registerSound('ambient', '/assets/audio/ambient.mp3');
engine.assetManager.registerSound('explosion', '/assets/audio/explosion.mp3');
engine.assetManager.registerSound('thrust', '/assets/audio/thrust.mp3');
*/

// Initialize lazy-loaded systems when needed
export const initPhysics = async () => {
  const physicsSystem = new PhysicsSystem(engine);
  await physicsSystem.init();
  engine.systemManager.registerSystem(physicsSystem);
  return physicsSystem;
};

export const initNetworking = async () => {
  const networkSystem = new NetworkSystem(engine);
  await networkSystem.init();
  engine.systemManager.registerSystem(networkSystem);
  return networkSystem;
};

// Create demo UI
const createDemoUI = () => {
  // Add any UI elements here
};

// Add any additional styles needed
const addStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #000;
    }
    #app {
      width: 100vw;
      height: 100vh;
    }
  `;
  document.head.appendChild(style);
};

// Main initialization function
const init = async () => {
  try {
    // Add styles
    addStyles();

    // Create UI
    createDemoUI();

    // Load any necessary systems or assets
    // Uncomment if needed
    // await initPhysics();

    // Hide loading screen
    const loadingScreen = document.querySelector(".loading-screen");
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
    }

    // Activate the space scene
    engine.sceneManager.activateScene("space");

    // Start the engine
    engine.start();

    // Update memory file
    updateMemory("Engine started successfully with space scene");
  } catch (error) {
    console.error("Failed to initialize game:", error);
  }
};

// For debugging - stores game state
const updateMemory = (status: string) => {
  const memory = {
    status,
    timestamp: new Date().toISOString(),
    activeScene: engine.sceneManager.activeScene ? "space" : "none",
    systems: {
      physics: !!engine.systemManager.getSystem("physics"),
      networking: !!engine.systemManager.getSystem("networking"),
    },
  };

  // In a real application, this would write to mem.md
  console.log("Memory updated:", memory);
};

// Handle cleanup when window is closed
window.addEventListener("beforeunload", () => {
  engine.dispose();
});

// Start the application
init();
