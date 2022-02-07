import * as THREE from "three";
import { Assets } from "./assets";
import { InstancedObject } from "./instancedObject";
import { KnobTarget } from "./knob";
import { Synth } from "./synth";

export class Panel extends THREE.Object3D {

  private canvasTexture: THREE.CanvasTexture = null;
  private panelGeometry: THREE.PlaneGeometry = null;
  private panelMaterial: THREE.MeshStandardMaterial = null;
  private panelMesh: THREE.Mesh;
  private knobs: InstancedObject = null;

  private volumeTarget: KnobTarget;

  constructor(private synth: Synth) {
    super();
    this.panelGeometry = new THREE.PlaneGeometry(2, 0.5);
    this.panelMaterial = new THREE.MeshStandardMaterial({
      emissive: 0.5
    });
    this.panelMesh = new THREE.Mesh(this.panelGeometry, this.panelMaterial);
    this.add(this.panelMesh);
    this.setUpTexture();
    this.setUpMeshes();

    this.volumeTarget = new KnobTarget((x) => {
      if (this.knobs && this.knobs.getInstanceCount() > 0) {
        this.setKnobPosition(this.knobs.getInstanceCount() - 1, x);
      }
    });
    synth.getVolumeKnob().addTarget(this.volumeTarget);
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
    });
  }

  private knobRotateOne = (() => {
    const m = new THREE.Matrix4();
    m.makeRotationZ(Math.PI * 2 / 12 * 10);
    return m;
  })();

  // position should be between 0 and 1.
  // 0 is the seven o'clock position, and 1 is 5 o'clock
  private setKnobPosition(i: number, position: number) {
    console.log(`AAAAA: ${position}`);
    const m = new THREE.Matrix4();
    this.knobs.getMatrixAt(i, m);
    const v = new THREE.Vector3();
    v.setFromMatrixPosition(m);
    m.makeRotationX(Math.PI / 2);
    const m2 = new THREE.Matrix4();
    m2.makeRotationY(Math.PI * 2 / 12 * (-position * 10 + 5));
    m.multiply(m2);
    m.setPosition(v);
    this.knobs.setMatrixAt(i, m);
  }

  async setUpMeshes() {
    const gltf = await Assets.loadMesh('knob');
    this.knobs = new InstancedObject(gltf.scene, 50);
    this.add(this.knobs);
    for (let row = 0; row < 2; ++row) {
      const y = -0.2 * row + 0.12;
      for (let column = 0; column < 9; ++column) {
        const x = 0.2 * column - 0.8;
        const m = new THREE.Matrix4();
        m.makeRotationX(Math.PI / 2);
        m.setPosition(x, y, 0);
        this.knobs.addInstance(m);
      }
    }
    for (let i = 0; i < this.knobs.getInstanceCount(); ++i) {
      this.setKnobPosition(i, Math.random());
    }
  }
}