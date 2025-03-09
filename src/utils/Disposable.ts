/**
 * Interface for any class that manages resources
 * that need to be cleaned up when no longer needed
 */
export interface Disposable {
  /**
   * Clean up all resources held by this object
   */
  dispose(): void;
}