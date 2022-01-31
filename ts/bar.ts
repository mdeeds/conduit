import * as THREE from "three";

export class Bar extends THREE.Object3D {
  constructor(color: THREE.Color) {
    super();
    // Cones extend into the y direction
    const geometry = new THREE.ConeBufferGeometry(0.05, 1.0);
    geometry.rotateX(Math.PI);
    geometry.translate(0, 0.5, 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: color
    }))
    this.add(mesh);
  }

  private static zero = new THREE.Vector3(0, 0, 0);
  private m = new THREE.Matrix4();
  private orientation = new THREE.Matrix4();
  private q = new THREE.Quaternion();

  private updatePole(from: THREE.Vector3, to: THREE.Vector3) {
    this.m.set(1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, 0, 1);
    /* THREE.Object3D().up (=Y) default orientation for all objects */
    this.orientation.lookAt(from, to, this.up);
    /* rotation around axis X by -90 degrees 
     * matches the default orientation Y 
     * with the orientation of looking Z */
    this.orientation.multiply(this.m);
    this.rotation.set(0, 0, 0);
    this.applyMatrix4(this.orientation);
  }

  public setExtent(v: THREE.Vector3) {
    if (v.length() === 0) {
      this.scale.set(0.1, 0.1, 0.1);
    } else {
      // this.m.lookAt(Bar.zero, v, this.up);
      // this.matrix.makeScale(1, v.length(), 1);
      // this.matrix.multiply(this.m);
      this.updatePole(Bar.zero, v);
      this.scale.set(1, v.length(), 1);
    }
  }

}