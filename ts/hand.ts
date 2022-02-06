import * as THREE from "three";
import { Orb } from "./orb";
import { Selection } from "./selection";
import { S } from "./settings";

import { Synth } from "./synth";
import { Motion, Tracker } from "./tracker";

export type Side = 'left' | 'right';
export type State = 'louder' | 'point' | 'softer' | 'pluck';

export class Hand {
  readonly gamepad: Gamepad;
  private grip: THREE.Group;
  public tracker = new Tracker();
  private state: State;
  private pluckThreshold = S.float('p');
  private volumeRate = S.float('v');

  constructor(readonly side: Side, renderer: THREE.WebGLRenderer,
    private scene: THREE.Object3D, private selection: Selection) {
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
    {
      const handGeometry = new THREE.BoxGeometry(0.01, 0.15, 0.20);
      if (this.side === 'left') {
        handGeometry.translate(-0.005, 0, -0.20);
      } else {
        handGeometry.translate(0.005, 0, -0.20);
      }
      const handMesh = new THREE.Mesh(handGeometry,
        new THREE.MeshStandardMaterial(
          { color: 'midnightblue', roughness: 0.9 }));
      this.grip.add(handMesh);
    }
    {
      const handGeometry = new THREE.BoxGeometry(0.01, 0.15, 0.20);
      if (this.side === 'left') {
        handGeometry.translate(0.005, 0, -0.20);
      } else {
        handGeometry.translate(-0.005, 0, -0.20);
      }
      const handMesh = new THREE.Mesh(handGeometry,
        new THREE.MeshStandardMaterial(
          { color: 'royalblue', roughness: 0.9 }));
      this.grip.add(handMesh);
    }
    this.scene.add(this.grip);
  }

  public getState(): State { return this.state; }

  private v = new THREE.Vector3();
  public updateMotion(elapsedS: number, deltaS: number): Motion {
    this.grip.updateMatrix();
    const xx = this.grip.matrix.elements[0];
    const xy = this.grip.matrix.elements[1];
    if (Math.abs(xx) > Math.abs(xy)) {
      this.grip.getWorldPosition(this.v);
      this.v.y = 0;
      if (this.v.length() > S.float('pr')) {
        this.state = 'point';
      } else {
        this.state = 'pluck';
      }
    } else if (xy < 0) {
      this.state = 'louder';
    } else {
      this.state = 'softer';
    }
    const motion = this.tracker.updateMotion(
      this.grip.position, elapsedS, deltaS);

    const selected = this.selection.getSelected();
    if (selected != null && selected instanceof Orb) {
      const synth = selected.getSynth();
      switch (this.state) {
        case 'pluck':
          const goRate = motion.acceleration.y;
          if (goRate > this.pluckThreshold) {
            synth.pluck();
          }
          break;
        case 'softer':
        case 'louder':
          const magnitude = motion.velocity.length() *
            ((this.state === 'softer') ? -this.volumeRate : this.volumeRate);
          synth.getVolumeKnob().change(magnitude);

          break;
      }
    }
    return motion;
  }
}