import { Peer, DataConnection } from 'peerjs';
import { EventEmitter } from 'eventemitter3';
import { System } from '@core/SystemManager';
import type { Engine } from '@core/Engine';
import { Vector3, Quaternion } from 'three';

/**
 * Network message types
 */
export enum MessageType {
  HANDSHAKE = 'handshake',
  PLAYER_TRANSFORM = 'player_transform',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEAVE = 'player_leave',
  GAME_STATE = 'game_state',
  OBJECT_SPAWN = 'object_spawn',
  OBJECT_DESTROY = 'object_destroy',
  CHAT_MESSAGE = 'chat_message',
  EVENT = 'event'
}

/**
 * Base interface for all network messages
 */
export interface NetworkMessage {
  type: MessageType;
  senderId: string;
  timestamp: number;
}

/**
 * Player transform message
 */
export interface PlayerTransformMessage extends NetworkMessage {
  type: MessageType.PLAYER_TRANSFORM;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity?: { x: number; y: number; z: number };
}

/**
 * Network peer information
 */
export interface PeerInfo {
  id: string;
  connection: DataConnection;
  lastSeen: number;
  isHost: boolean;
}

/**
 * Networking system using PeerJS for P2P connections
 */
export class NetworkSystem extends EventEmitter implements System {
  public readonly name = 'network';
  public readonly priority = 5;
  public isEnabled = false;
  
  private _engine: Engine;
  private _peer?: Peer;
  private _connections: Map<string, PeerInfo> = new Map();
  private _peerId?: string;
  private _isHost = false;
  private _roomId?: string;
  private _lastUpdateTime = 0;
  private _updateRate = 100; // ms between updates
  
  constructor(engine: Engine) {
    super();
    this._engine = engine;
  }

  /**
   * Initialize the networking system
   */
  public async init(): Promise<void> {
    this._engine.logger.info('NetworkSystem initializing');
    
    // Create a new peer
    this._peer = new Peer({
      debug: this._engine._config.debugMode ? 2 : 0
    });
    
    // Set up event listeners
    this._peer.on('open', this._handlePeerOpen);
    this._peer.on('connection', this._handlePeerConnection);
    this._peer.on('disconnected', this._handlePeerDisconnected);
    this._peer.on('error', this._handlePeerError);
    
    // Wait for the peer to be initialized
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Peer initialization timed out'));
      }, 10000);
      
      this._peer!.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      this._peer!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    this.isEnabled = true;
    this._engine.logger.info(`NetworkSystem initialized with peer ID: ${this._peerId}`);
  }

  /**
   * Handle peer initialization
   */
  private _handlePeerOpen = (id: string): void => {
    this._peerId = id;
    this._engine.logger.info(`Peer initialized with ID: ${id}`);
    this.emit('ready', id);
  };

  /**
   * Handle incoming connections
   */
  private _handlePeerConnection = (connection: DataConnection): void => {
    this._engine.logger.info(`Incoming connection from: ${connection.peer}`);
    
    // Set up connection event handlers
    this._setupConnectionEvents(connection);
    
    // Add to connections map
    this._connections.set(connection.peer, {
      id: connection.peer,
      connection,
      lastSeen: Date.now(),
      isHost: false
    });
    
    // Send handshake if we're the host
    if (this._isHost) {
      this._sendHandshake(connection);
    }
    
    this.emit('peerConnected', connection.peer);
  };

  /**
   * Handle peer disconnection
   */
  private _handlePeerDisconnected = (): void => {
    this._engine.logger.info('Peer disconnected from server, attempting to reconnect');
    
    // Try to reconnect
    setTimeout(() => {
      this._peer?.reconnect();
    }, 1000);
  };

  /**
   * Handle peer errors
   */
  private _handlePeerError = (error: Error): void => {
    this._engine.logger.error('Peer error:', error);
    this.emit('error', error);
  };

  /**
   * Set up event handlers for a connection
   */
  private _setupConnectionEvents(connection: DataConnection): void {
    connection.on('data', (data) => {
      this._handleConnectionData(connection.peer, data);
    });
    
    connection.on('close', () => {
      this._handleConnectionClose(connection.peer);
    });
    
    connection.on('error', (error) => {
      this._handleConnectionError(connection.peer, error);
    });
  }

  /**
   * Handle incoming data from a connection
   */
  private _handleConnectionData(peerId: string, data: unknown): void {
    try {
      const message = data as NetworkMessage;
      
      // Update last seen time
      const peerInfo = this._connections.get(peerId);
      if (peerInfo) {
        peerInfo.lastSeen = Date.now();
      }
      
      // Process message based on type
      switch (message.type) {
        case MessageType.HANDSHAKE:
          this._handleHandshakeMessage(peerId, message);
          break;
          
        case MessageType.PLAYER_TRANSFORM:
          this._handlePlayerTransformMessage(peerId, message as PlayerTransformMessage);
          break;
          
        case MessageType.PLAYER_JOIN:
          this._handlePlayerJoinMessage(peerId, message);
          break;
          
        case MessageType.PLAYER_LEAVE:
          this._handlePlayerLeaveMessage(peerId, message);
          break;
          
        case MessageType.CHAT_MESSAGE:
          this.emit('chatMessage', peerId, message);
          break;
          
        case MessageType.EVENT:
          this.emit('event', peerId, message);
          break;
          
        default:
          // Forward unknown message types to listeners
          this.emit('message', peerId, message);
      }
    } catch (error) {
      this._engine.logger.error('Error processing network message:', error);
    }
  }

  /**
   * Handle connection closure
   */
  private _handleConnectionClose(peerId: string): void {
    this._engine.logger.info(`Connection closed with peer: ${peerId}`);
    
    // Remove from connections
    this._connections.delete(peerId);
    
    // Notify listeners
    this.emit('peerDisconnected', peerId);
  }

  /**
   * Handle connection errors
   */
  private _handleConnectionError(peerId: string, error: Error): void {
    this._engine.logger.error(`Connection error with peer ${peerId}:`, error);
    
    // Notify listeners
    this.emit('connectionError', peerId, error);
  }

  /**
   * Handle handshake messages
   */
  private _handleHandshakeMessage(peerId: string, message: NetworkMessage): void {
    this._engine.logger.debug(`Handshake received from: ${peerId}`);
    
    // Process handshake
    const peerInfo = this._connections.get(peerId);
    if (peerInfo) {
      peerInfo.isHost = (message as any).isHost || false;
    }
    
    this.emit('handshake', peerId, message);
  }

  /**
   * Handle player transform messages
   */
  private _handlePlayerTransformMessage(peerId: string, message: PlayerTransformMessage): void {
    // Don't log every transform message to avoid spam
    // Forward to listeners
    this.emit('playerTransform', peerId, message);
  }

  /**
   * Handle player join messages
   */
  private _handlePlayerJoinMessage(peerId: string, message: NetworkMessage): void {
    this._engine.logger.info(`Player joined: ${peerId}`);
    this.emit('playerJoin', peerId, message);
  }

  /**
   * Handle player leave messages
   */
  private _handlePlayerLeaveMessage(peerId: string, message: NetworkMessage): void {
    this._engine.logger.info(`Player left: ${peerId}`);
    this.emit('playerLeave', peerId, message);
  }

  /**
   * Create a new network room as host
   */
  public createRoom(): string {
    if (!this._peer || !this._peerId) {
      throw new Error('Peer not initialized');
    }
    
    // Generate a room ID
    this._roomId = this._generateRoomId();
    this._isHost = true;
    
    this._engine.logger.info(`Created room: ${this._roomId}`);
    this.emit('roomCreated', this._roomId);
    
    return this._roomId;
  }

  /**
   * Join an existing room
   */
  public joinRoom(roomId: string): Promise<void> {
    if (!this._peer || !this._peerId) {
      return Promise.reject(new Error('Peer not initialized'));
    }
    
    this._roomId = roomId;
    this._isHost = false;
    
    // Connect to the host (room ID is the host's peer ID)
    return new Promise((resolve, reject) => {
      const connection = this._peer!.connect(roomId);
      
      connection.once('open', () => {
        this._engine.logger.info(`Joined room: ${roomId}`);
        
        // Set up connection event handlers
        this._setupConnectionEvents(connection);
        
        // Add to connections map
        this._connections.set(roomId, {
          id: roomId,
          connection,
          lastSeen: Date.now(),
          isHost: true
        });
        
        // Send handshake
        this._sendHandshake(connection);
        
        this.emit('roomJoined', roomId);
        resolve();
      });
      
      connection.once('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Send a handshake message
   */
  private _sendHandshake(connection: DataConnection): void {
    const handshakeMessage: NetworkMessage & { isHost: boolean } = {
      type: MessageType.HANDSHAKE,
      senderId: this._peerId!,
      timestamp: Date.now(),
      isHost: this._isHost
    };
    
    connection.send(handshakeMessage);
  }

  /**
   * Send player transform to all peers
   */
  public sendPlayerTransform(position: Vector3, rotation: Quaternion, velocity?: Vector3): void {
    if (!this.isEnabled || this._connections.size === 0) return;
    
    // Limit update rate
    const now = Date.now();
    if (now - this._lastUpdateTime < this._updateRate) {
      return;
    }
    
    this._lastUpdateTime = now;
    
    // Create message
    const message: PlayerTransformMessage = {
      type: MessageType.PLAYER_TRANSFORM,
      senderId: this._peerId!,
      timestamp: now,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w }
    };
    
    if (velocity) {
      message.velocity = { x: velocity.x, y: velocity.y, z: velocity.z };
    }
    
    // Send to all peers
    this._broadcastMessage(message);
  }

  /**
   * Send a message to all connected peers
   */
  private _broadcastMessage(message: NetworkMessage): void {
    this._connections.forEach((peerInfo) => {
      if (peerInfo.connection.open) {
        peerInfo.connection.send(message);
      }
    });
  }

  /**
   * Send a message to a specific peer
   */
  public sendMessage(peerId: string, message: NetworkMessage): void {
    if (!this.isEnabled) return;
    
    const peerInfo = this._connections.get(peerId);
    if (peerInfo && peerInfo.connection.open) {
      peerInfo.connection.send(message);
    } else {
      this._engine.logger.warn(`Cannot send message to peer ${peerId}: Not connected`);
    }
  }

  /**
   * Send a chat message to all peers
   */
  public sendChatMessage(content: string): void {
    if (!this.isEnabled) return;
    
    const message: NetworkMessage & { content: string } = {
      type: MessageType.CHAT_MESSAGE,
      senderId: this._peerId!,
      timestamp: Date.now(),
      content
    };
    
    this._broadcastMessage(message);
  }

  /**
   * Generate a room ID
   */
  private _generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Check if connected to a room
   */
  public isInRoom(): boolean {
    return !!this._roomId;
  }

  /**
   * Get the current room ID
   */
  public getRoomId(): string | undefined {
    return this._roomId;
  }

  /**
   * Check if this peer is the host
   */
  public isHost(): boolean {
    return this._isHost;
  }

  /**
   * Get peer ID
   */
  public getPeerId(): string | undefined {
    return this._peerId;
  }

  /**
   * Get all connected peers
   */
  public getConnectedPeers(): string[] {
    return Array.from(this._connections.keys());
  }

  /**
   * Leave the current room
   */
  public leaveRoom(): void {
    if (!this._roomId) return;
    
    // Send leave message
    const message: NetworkMessage = {
      type: MessageType.PLAYER_LEAVE,
      senderId: this._peerId!,
      timestamp: Date.now()
    };
    
    this._broadcastMessage(message);
    
    // Close all connections
    this._connections.forEach((peerInfo) => {
      peerInfo.connection.close();
    });
    
    this._connections.clear();
    this._roomId = undefined;
    this._isHost = false;
    
    this._engine.logger.info('Left room');
    this.emit('roomLeft');
  }

  /**
   * Update the networking system
   */
  public update(deltaTime: number): void {
    if (!this.isEnabled) return;
    
    // Check for stale connections
    const now = Date.now();
    this._connections.forEach((peerInfo, peerId) => {
      if (now - peerInfo.lastSeen > 30000) { // 30 second timeout
        this._engine.logger.warn(`Connection to peer ${peerId} timed out`);
        peerInfo.connection.close();
        this._connections.delete(peerId);
        this.emit('peerDisconnected', peerId);
      }
    });
  }

  /**
   * Clean up networking resources
   */
  public dispose(): void {
    // Leave room if in one
    if (this._roomId) {
      this.leaveRoom();
    }
    
    // Close peer connection
    if (this._peer) {
      this._peer.destroy();
      this._peer = undefined;
    }
    
    this.isEnabled = false;
    this.removeAllListeners();
    
    this._engine.logger.info('NetworkSystem disposed');
  }
}