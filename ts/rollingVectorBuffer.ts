import * as THREE from "three";

export class RollingVectorBuffer {

  private buffer: THREE.Vector3[] = [];
  private last = -1;
  constructor(readonly size: number) {
    for (let i = 0; i < size; ++i) {
      this.buffer.push(new THREE.Vector3());
    }
  }

  public addXYZ(x: number, y: number, z: number) {
    this.last = (this.last + 1) % this.size;
    this.buffer[this.last].set(x, y, z);
  }

  public add(v: THREE.Vector3) {
    this.last = (this.last + 1) % this.size;
    this.buffer[this.last].copy(v);
  }

  public get(i: number, out: THREE.Vector3) {
    const index = (this.last + i) % this.size;
    out.copy(this.buffer[index]);
  }

}