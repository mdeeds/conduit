import * as THREE from "three";
import { KnobTarget } from "./knob";
import { Orb } from "./orb";
import { Selectable, Selection, SelectionChangeCallback } from "./selection";
import { S } from "./settings";
import { Synth } from "./synth";

export class Stage extends THREE.Object3D {
  private orbs: Orb[] = [];
  constructor(private audioCtx: AudioContext, private selection: Selection) {
    super();

    let r = 2;
    {
      const light = new THREE.HemisphereLight('#8bf', '#951', 0.5);
      this.add(light);
    }

    for (let i = 0; i < 9; ++i) {
      const x = r * Math.sin(i / 9 * 2 * Math.PI);
      const z = -r * Math.cos(i / 9 * 2 * Math.PI);
      const synth = new Synth(audioCtx);
      const orb = new Orb(x, z, synth);
      this.add(orb);
      this.orbs.push(orb);
      this.selection.add(orb);
    }

    const light = new THREE.SpotLight('white',
      /*intensity=*/ 2,
      /*distance=*/0,
      /*angle=*/Math.PI / 32,
      /*penumbra=*/0.15,
      /*decay=*/2);
    light.visible = false;
    light.castShadow = true;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 10;
    light.shadow.focus = 1;
    this.add(light);

    selection.addChangeListener((previous: Selectable, current: Selectable) => {
      if (current) {
        light.position.copy(current.getObject3D().position);
        light.position.y = 5;
        light.target = current.getObject3D();
        light.visible = true;
      } else {
        light.visible = false;
      }
    });


    const floor = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(5, 5),
      new THREE.MeshStandardMaterial({ color: '#444' }));
    floor.receiveShadow = true;

    floor.rotateX(-Math.PI / 2);
    this.add(floor);
  }

  update(elapsedS: number) {
    for (const o of this.orbs) {
      o.update(elapsedS);
    }
  }
}