import * as THREE from "three";

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
}