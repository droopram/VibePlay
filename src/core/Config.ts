import { LogLevel } from '@utils/Logger';

/**
 * Engine configuration options
 */
export interface Config {
  // Rendering options
  renderWidth: number;
  renderHeight: number;
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  
  // Performance options
  targetFPS: number;
  maxDeltaTime: number;
  
  // Debug options
  debugMode: boolean;
  showFPS: boolean;
  logLevel: LogLevel;
  
  // System options
  loadingScreenEnabled: boolean;
  autoResizeEnabled: boolean;
  audioEnabled: boolean;
}

/**
 * Default engine configuration
 */
export const defaultConfig: Config = {
  // Rendering defaults
  renderWidth: window.innerWidth,
  renderHeight: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  antialias: true,
  shadows: true,
  
  // Performance defaults
  targetFPS: 60,
  maxDeltaTime: 1/30, // Cap delta time to avoid huge jumps
  
  // Debug defaults
  debugMode: false,
  showFPS: false,
  logLevel: LogLevel.WARN,
  
  // System defaults
  loadingScreenEnabled: true,
  autoResizeEnabled: true,
  audioEnabled: true
};