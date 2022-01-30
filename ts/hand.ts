import * as THREE from "three";
import { RollingVectorBuffer } from "./rollingVectorBuffer";

export type Side = 'left' | 'right';

export class Motion {
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public acceleration = new THREE.Vector3();
  constructor() { }
}

export class Hand {
  readonly gamepad: Gamepad;
  private grip: THREE.Group;
  private motion = new Motion();
  private buffer = new RollingVectorBuffer(5);

  constructor(readonly side: Side, renderer: THREE.WebGLRenderer,
    private scene: THREE.Object3D) {
    const index = (side == 'left') ? 0 : 1;
    this.grip = renderer.xr.getControllerGrip(index);
    // this.grip = new THREE.Group();
    this.grip.position.set((index - 0.5), 0.3, -1.4);
    console.log(`Grip name: ${this.grip.name}`);
    const pads = window.navigator.getGamepads();
    if (pads.length > index) {
      this.gamepad = pads[index];
    }
    this.setUpMeshes();
  }

  private setUpMeshes() {
    const handGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.20);
    handGeometry.translate(0, 0, 0.20);
    const handMesh = new THREE.Mesh(handGeometry,
      new THREE.MeshStandardMaterial(
        { color: 'orange', roughness: 0.9 }));
    handMesh.castShadow = true;
    handMesh.receiveShadow = true;

    this.grip.add(handMesh);
    this.scene.add(this.grip);
  }

  private p0 = new THREE.Vector3();
  private p1 = new THREE.Vector3();
  private p2 = new THREE.Vector3();
  private v0 = new THREE.Vector3();
  private v1 = new THREE.Vector3();

  public updateMotion(deltaS: number): Motion {
    this.motion.position.copy(this.grip.position);
    this.buffer.add(this.motion.position);
    this.buffer.get(0, this.p0);
    this.buffer.get(1, this.p1);
    this.buffer.get(2, this.p2);
    this.motion.velocity.copy(this.p0);
    this.motion.velocity.sub(this.p1);
    this.motion.velocity.multiplyScalar(1 / deltaS);
    this.v1.copy(this.p1);
    this.v1.sub(this.p2);
    this.v1.multiplyScalar(1 / deltaS);
    this.motion.acceleration.copy(this.motion.velocity);
    this.motion.acceleration.sub(this.v1);
    return this.motion;
  }


}