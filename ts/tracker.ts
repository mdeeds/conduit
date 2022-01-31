import * as THREE from "three";
import { RollingVectorBuffer } from "./rollingVectorBuffer";

export class Motion {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public acceleration = new THREE.Vector3();
  constructor() { }
}

export class Tracker {
  private positionBuffer = new RollingVectorBuffer(5);
  private velocityBuffer = new RollingVectorBuffer(5);
  private motion = new Motion();

  constructor() {
  }

  private p0 = new THREE.Vector3();
  private p1 = new THREE.Vector3();
  private v0 = new THREE.Vector3();
  private v1 = new THREE.Vector3();

  public updateMotion(position: THREE.Vector3,
    elapsedS: number, deltaS: number): Motion {
    this.motion.position.copy(position);
    this.positionBuffer.add(this.motion.position, elapsedS);
    {
      const t0 = this.positionBuffer.get(0, this.p0);
      const t1 = this.positionBuffer.get(1, this.p1);
      if (t1 === t0) {
        return this.motion;
      }
      this.motion.velocity.copy(this.p0);
      this.motion.velocity.sub(this.p1);
      this.motion.velocity.multiplyScalar(1 / (t0 - t1));
      this.velocityBuffer.add(this.motion.velocity, (t0 + t1) / 2);
    }
    const t0 = this.velocityBuffer.get(0, this.v0);
    const t1 = this.velocityBuffer.get(1, this.v1);
    if (t1 === t0) {
      return this.motion;
    }
    this.motion.acceleration.copy(this.v0);
    this.motion.acceleration.sub(this.v1);
    this.motion.acceleration.multiplyScalar(1 / (t0 - t1));

    return this.motion;
  }
}