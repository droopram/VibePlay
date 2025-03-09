import { World, Body, Vec3, Box, Sphere, Plane } from "cannon-es";
import {
  Vector3,
  Quaternion,
  Object3D,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
} from "three";
import { System } from "@core/SystemManager";
import type { Engine } from "@core/Engine";

/**
 * Physics body component that can be attached to a Three.js object
 */
export class PhysicsBody {
  private _body: Body;
  private _object: Object3D;
  private _engine: Engine;
  private _isEnabled = true;

  constructor(body: Body, object: Object3D, engine: Engine) {
    this._body = body;
    this._object = object;
    this._engine = engine;

    // Store reference to this component on the object
    (object as any).physicsBody = this;
  }

  /**
   * Get the Cannon.js physics body
   */
  get body(): Body {
    return this._body;
  }

  /**
   * Get the associated Three.js object
   */
  get object(): Object3D {
    return this._object;
  }

  /**
   * Check if physics is enabled for this body
   */
  get isEnabled(): boolean {
    return this._isEnabled;
  }

  /**
   * Enable or disable physics for this body
   */
  set isEnabled(value: boolean) {
    this._isEnabled = value;
  }

  /**
   * Apply force to the physics body
   */
  public applyForce(force: Vector3, worldPoint?: Vector3): void {
    const cannonForce = new Vec3(force.x, force.y, force.z);

    if (worldPoint) {
      const cannonPoint = new Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
      this._body.applyForce(cannonForce, cannonPoint);
    } else {
      this._body.applyForce(cannonForce, new Vec3());
    }
  }

  /**
   * Apply impulse to the physics body
   */
  public applyImpulse(impulse: Vector3, worldPoint?: Vector3): void {
    const cannonImpulse = new Vec3(impulse.x, impulse.y, impulse.z);

    if (worldPoint) {
      const cannonPoint = new Vec3(worldPoint.x, worldPoint.y, worldPoint.z);
      this._body.applyImpulse(cannonImpulse, cannonPoint);
    } else {
      this._body.applyImpulse(cannonImpulse, new Vec3());
    }
  }

  /**
   * Sync the physics body position and rotation to the Three.js object
   */
  public syncToObject(): void {
    this._body.position.x = this._object.position.x;
    this._body.position.y = this._object.position.y;
    this._body.position.z = this._object.position.z;

    this._body.quaternion.x = this._object.quaternion.x;
    this._body.quaternion.y = this._object.quaternion.y;
    this._body.quaternion.z = this._object.quaternion.z;
    this._body.quaternion.w = this._object.quaternion.w;
  }

  /**
   * Sync the Three.js object position and rotation to the physics body
   */
  public syncFromBody(): void {
    this._object.position.x = this._body.position.x;
    this._object.position.y = this._body.position.y;
    this._object.position.z = this._body.position.z;

    this._object.quaternion.x = this._body.quaternion.x;
    this._object.quaternion.y = this._body.quaternion.y;
    this._object.quaternion.z = this._body.quaternion.z;
    this._object.quaternion.w = this._body.quaternion.w;
  }
}

/**
 * Physics system using Cannon.js
 */
export class PhysicsSystem implements System {
  public readonly name = "physics";
  public readonly priority = 10; // Run before other systems
  public isEnabled = false;

  // @ts-ignore - Needed for logger even if not directly referenced
  private _engine: Engine; // Needed for logger
  private _world: World;
  private _physicsBodies: PhysicsBody[] = [];
  private _timeStep = 1 / 60;
  private _maxSubSteps = 3;

  constructor(engine: Engine) {
    this._engine = engine; // Needed for logger

    // Initialize cannon.js world
    this._world = new World();
    this._world.gravity.set(0, -9.82, 0); // Earth gravity
  }

  /**
   * Initialize the physics system
   */
  public async init(): Promise<void> {
    this._engine.logger.info("PhysicsSystem initializing");
    this.isEnabled = true;
  }

  /**
   * Update physics simulation
   */
  public update(deltaTime: number): void {
    if (!this.isEnabled) return;

    // Step the physics world
    this._world.step(this._timeStep, deltaTime, this._maxSubSteps);

    // Sync physics bodies to objects
    for (const body of this._physicsBodies) {
      if (body.isEnabled) {
        body.syncFromBody();
      }
    }
  }

  /**
   * Create a box physics body
   */
  public createBoxBody(
    object: Object3D,
    size: Vector3,
    mass = 1,
    options: {
      position?: Vector3;
      quaternion?: Quaternion;
      material?: any;
    } = {}
  ): PhysicsBody {
    // Create physics shape
    const halfExtents = new Vec3(size.x / 2, size.y / 2, size.z / 2);
    const boxShape = new Box(halfExtents);

    // Create body
    const boxBody = new Body({
      mass,
      material: options.material,
    });

    boxBody.addShape(boxShape);

    // Set position and rotation
    if (options.position) {
      boxBody.position.x = options.position.x;
      boxBody.position.y = options.position.y;
      boxBody.position.z = options.position.z;
    } else {
      boxBody.position.x = object.position.x;
      boxBody.position.y = object.position.y;
      boxBody.position.z = object.position.z;
    }

    if (options.quaternion) {
      boxBody.quaternion.x = options.quaternion.x;
      boxBody.quaternion.y = options.quaternion.y;
      boxBody.quaternion.z = options.quaternion.z;
      boxBody.quaternion.w = options.quaternion.w;
    } else {
      boxBody.quaternion.x = object.quaternion.x;
      boxBody.quaternion.y = object.quaternion.y;
      boxBody.quaternion.z = object.quaternion.z;
      boxBody.quaternion.w = object.quaternion.w;
    }

    // Add to world
    this._world.addBody(boxBody);

    // Create and store physics body component
    const physicsBody = new PhysicsBody(boxBody, object, this._engine);
    this._physicsBodies.push(physicsBody);

    return physicsBody;
  }

  /**
   * Create a sphere physics body
   */
  public createSphereBody(
    object: Object3D,
    radius: number,
    mass = 1,
    options: {
      position?: Vector3;
      quaternion?: Quaternion;
      material?: any;
    } = {}
  ): PhysicsBody {
    // Create physics shape
    const sphereShape = new Sphere(radius);

    // Create body
    const sphereBody = new Body({
      mass,
      material: options.material,
    });

    sphereBody.addShape(sphereShape);

    // Set position and rotation
    if (options.position) {
      sphereBody.position.x = options.position.x;
      sphereBody.position.y = options.position.y;
      sphereBody.position.z = options.position.z;
    } else {
      sphereBody.position.x = object.position.x;
      sphereBody.position.y = object.position.y;
      sphereBody.position.z = object.position.z;
    }

    if (options.quaternion) {
      sphereBody.quaternion.x = options.quaternion.x;
      sphereBody.quaternion.y = options.quaternion.y;
      sphereBody.quaternion.z = options.quaternion.z;
      sphereBody.quaternion.w = options.quaternion.w;
    } else {
      sphereBody.quaternion.x = object.quaternion.x;
      sphereBody.quaternion.y = object.quaternion.y;
      sphereBody.quaternion.z = object.quaternion.z;
      sphereBody.quaternion.w = object.quaternion.w;
    }

    // Add to world
    this._world.addBody(sphereBody);

    // Create and store physics body component
    const physicsBody = new PhysicsBody(sphereBody, object, this._engine);
    this._physicsBodies.push(physicsBody);

    return physicsBody;
  }

  /**
   * Create a plane physics body (for ground or walls)
   */
  public createPlaneBody(
    object: Object3D,
    mass = 0,
    options: {
      position?: Vector3;
      quaternion?: Quaternion;
      material?: any;
    } = {}
  ): PhysicsBody {
    // Create physics shape
    const planeShape = new Plane();

    // Create body
    const planeBody = new Body({
      mass, // Usually 0 for static ground
      material: options.material,
    });

    planeBody.addShape(planeShape);

    // Set position and rotation
    if (options.position) {
      planeBody.position.x = options.position.x;
      planeBody.position.y = options.position.y;
      planeBody.position.z = options.position.z;
    } else {
      planeBody.position.x = object.position.x;
      planeBody.position.y = object.position.y;
      planeBody.position.z = object.position.z;
    }

    if (options.quaternion) {
      planeBody.quaternion.x = options.quaternion.x;
      planeBody.quaternion.y = options.quaternion.y;
      planeBody.quaternion.z = options.quaternion.z;
      planeBody.quaternion.w = options.quaternion.w;
    } else {
      planeBody.quaternion.x = object.quaternion.x;
      planeBody.quaternion.y = object.quaternion.y;
      planeBody.quaternion.z = object.quaternion.z;
      planeBody.quaternion.w = object.quaternion.w;
    }

    // Add to world
    this._world.addBody(planeBody);

    // Create and store physics body component
    const physicsBody = new PhysicsBody(planeBody, object, this._engine);
    this._physicsBodies.push(physicsBody);

    return physicsBody;
  }

  /**
   * Automatically create a physics body based on mesh geometry
   */
  public createBodyFromMesh(mesh: Mesh, mass = 1): PhysicsBody | null {
    const geometry = mesh.geometry;

    if (geometry instanceof BoxGeometry) {
      // Calculate box size
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const size = new Vector3();
      box.getSize(size);

      // Scale by mesh scale
      size.multiply(mesh.scale);

      return this.createBoxBody(mesh, size, mass);
    } else if (geometry instanceof SphereGeometry) {
      // Get sphere radius
      const radius =
        geometry.parameters.radius *
        Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z);

      return this.createSphereBody(mesh, radius, mass);
    } else if (geometry instanceof PlaneGeometry) {
      return this.createPlaneBody(mesh, mass);
    } else {
      this._engine.logger.warn(
        "Unsupported geometry type for automatic physics body creation"
      );
      return null;
    }
  }

  /**
   * Remove a physics body
   */
  public removeBody(physicsBody: PhysicsBody): void {
    const index = this._physicsBodies.indexOf(physicsBody);
    if (index !== -1) {
      this._physicsBodies.splice(index, 1);
      this._world.removeBody(physicsBody.body);

      // Remove reference from object
      delete (physicsBody.object as any).physicsBody;
    }
  }

  /**
   * Set world gravity
   */
  public setGravity(gravity: Vector3): void {
    this._world.gravity.set(gravity.x, gravity.y, gravity.z);
  }

  /**
   * Clean up physics resources
   */
  public dispose(): void {
    // Remove all bodies from world
    for (const physicsBody of this._physicsBodies) {
      this._world.removeBody(physicsBody.body);
      delete (physicsBody.object as any).physicsBody;
    }

    this._physicsBodies = [];
    this.isEnabled = false;

    this._engine.logger.info("PhysicsSystem disposed");
  }
}
