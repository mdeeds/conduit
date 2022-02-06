import * as THREE from "three";
import { Assets } from "./assets";
import { InstancedObject } from "./instancedObject";

export class Panel extends THREE.Object3D {

  private canvasTexture: THREE.CanvasTexture = null;
  private panelGeometry: THREE.PlaneGeometry = null;
  private panelMaterial: THREE.MeshStandardMaterial = null;
  private panelMesh: THREE.Mesh;

  constructor() {
    super();
    this.panelGeometry = new THREE.PlaneGeometry(2, 0.5);
    this.panelMaterial = new THREE.MeshStandardMaterial({ color: 'green' });
    this.panelMesh = new THREE.Mesh(this.panelGeometry, this.panelMaterial);
    this.add(this.panelMesh);
    this.setUpTexture();
    this.setUpMeshes();
  }


  setUpTexture() {
    const loader = new THREE.ImageLoader();
    loader.load('img/panel.png', (image) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      this.canvasTexture = new THREE.CanvasTexture(canvas);
      this.canvasTexture.needsUpdate = true;
      this.panelMaterial.map = this.canvasTexture;
      this.panelMaterial.color = null; // new THREE.Color('white');
      this.panelMaterial.needsUpdate = true;
      console.log('AAAAA');

    });
  }

  async setUpMeshes() {
    const gltf = await Assets.loadMesh('knob');
    const knobs = new InstancedObject(gltf.scene, 50);
    this.add(knobs);
    for (let row = 0; row < 2; ++row) {
      const y = 0.2 * row - 0.1;
      for (let column = 0; column < 9; ++column) {
        const x = 0.2 * column - 0.8;
        const m = new THREE.Matrix4();
        m.makeRotationX(Math.PI / 2);
        m.setPosition(x, y, 0);
        knobs.addInstance(m);
      }
    }
    for (let i = 0; i < 30; ++i) {
    }
  }
}