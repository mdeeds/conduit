import * as THREE from "three";

export class RollingVectorBuffer {

  private buffer: THREE.Vector3[] = [];
  private timeBuffer: number[] = []
  private last = -1;
  constructor(readonly size: number) {
    for (let i = 0; i < size; ++i) {
      this.buffer.push(new THREE.Vector3());
      this.timeBuffer.push(0);
    }
  }

  public addXYZ(x: number, y: number, z: number, ts: number) {
    if (ts - this.timeBuffer[this.last] < 10) {
      return;
    }
    this.last = (this.last + 1) % this.size;
    this.buffer[this.last].set(x, y, z);
    this.timeBuffer[this.last] = ts;
  }

  public add(v: THREE.Vector3, ts: number) {
    if (ts - this.timeBuffer[this.last] < 10) {
      return;
    }
    this.last = (this.last + 1) % this.size;
    this.buffer[this.last].copy(v);
    this.timeBuffer[this.last] = ts;
  }

  public get(i: number, out: THREE.Vector3): number {
    const index = (this.last + i) % this.size;
    out.copy(this.buffer[index]);
    return this.timeBuffer[index];
  }

}