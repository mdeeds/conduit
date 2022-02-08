import * as THREE from "three";

import { Hand, HandState } from "./hand";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Motion, Tracker } from "./tracker";
import { ParticleSystem } from "./particleSystem";
import { Stage } from "./stage";
import { Assets } from "./assets";
import { InstancedObject } from "./instancedObject";
import { Selection } from "./selection";
import { Synth } from "./synth";
import { Panel } from "./panel";
import { Orb } from "./orb";
import { Vortex } from "./vortex";
import { S } from "./settings";

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private camera: THREE.Camera;
  private particleSystem: ParticleSystem;
  private vortexSystem: Vortex;

  private leftHand: Hand;
  private rightHand: Hand;

  private stage: Stage;
  private selection = new Selection();
  private currentSynth: Synth = null;

  constructor(private audioCtx: AudioContext) {
    document.querySelector('body').addEventListener('keydown', (ev) => {
      switch (ev.code) {
        case 'Space': if (this.currentSynth) {
          this.trigger(this.currentSynth);
        } break;
        case 'ArrowUp': if (this.currentSynth) this.currentSynth.getVolumeKnob().change(0.1); break;
        case 'ArrowDown': if (this.currentSynth) this.currentSynth.getVolumeKnob().change(-0.1); break;
        case 'KeyW': this.camera.position.z -= 0.2; break;
        case 'KeyS': this.camera.position.z += 0.2; break;
        case 'KeyA': this.camera.position.x -= 0.2; break;
        case 'KeyD': this.camera.position.x += 0.2; break;
        case 'KeyQ': this.camera.rotateOnWorldAxis(this.camera.up, Math.PI / 32); break;
        case 'KeyE': this.camera.rotateOnWorldAxis(this.camera.up, -Math.PI / 32); break;
      }
    });

    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75, 800 / 360, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.6, 0);
    this.camera.lookAt(0, 1.6, -2);
    this.scene.add(this.camera);

    this.stage = new Stage(this.audioCtx, this.selection, this.camera);
    this.scene.add(this.stage);

    // const light = new THREE.HemisphereLight(0xffffff, 0x554433, 1.0);
    // this.scene.add(light);

    this.setUpRenderer();
    this.leftHand = new Hand('left', this.renderer, this.scene, this.selection, this.camera);
    this.rightHand = new Hand('right', this.renderer, this.scene, this.selection, this.camera);

    this.vortexSystem = new Vortex();
    this.vortexSystem.position.set(0, 1.5, -0.5);
    this.scene.add(this.vortexSystem);
    this.setUpAnimation();
    this.setUpMouseBar();
    this.particleSystem = new ParticleSystem(this.scene);
    this.setUpMeshes();
  }

  private async setUpMeshes() {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.scene.add(light);
  }

  private setUpMouseBar() {
    const body = document.querySelector('body');
    let lastTs = window.performance.now() / 1000;
    const p = new THREE.Vector3();
    const tracker = new Tracker();

    body.addEventListener('mousemove', (ev: MouseEvent) => {
      const currentTs = window.performance.now() / 1000;
      const dt = currentTs - lastTs;
      lastTs += dt;
      p.set(ev.clientX / 100, -ev.clientY / 100, 0);
      const motion = tracker.updateMotion(p, currentTs, dt);
    });
  }

  private mousePosition = new THREE.Vector2();
  private setUpRenderer() {
    this.renderer.shadowMap.enabled = true;
    // this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(800, 360);
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.addEventListener('mousemove',
      (ev: MouseEvent) => {
        this.mousePosition.x = (ev.clientX / window.innerWidth) * 2 - 1;
        this.mousePosition.y = - (ev.clientY / window.innerHeight) * 2 + 1;
        this.setRayFromCamera(this.mousePosition);
      });
  }

  private louderColor = new THREE.Color('orange');
  private softerColor = new THREE.Color('lightblue');
  private pointColor = new THREE.Color('yellow');
  private pluckColor = new THREE.Color('pink');
  private fofColor = new THREE.Color('#f0f');

  private getColorForState(s: HandState): THREE.Color {
    switch (s) {
      case 'softer': return this.softerColor;
      case 'louder': return this.louderColor;
      case 'point': return this.pointColor;
      case 'pluck': return this.pluckColor;
      default: return this.fofColor;
    }
  }

  private slowColor = new THREE.Color('#f00');
  private mediumColor = new THREE.Color('#ff0');
  private fastColor = new THREE.Color('#fff');

  private addRandomDot(deltaS: number) {
    const p = new THREE.Vector3(
      6 * (Math.random() - 0.5),
      3 * (Math.random()),
      6 * (Math.random() - 0.5));
    const v = new THREE.Vector3(
      0.1 * (Math.random() - 0.5),
      0.1 * (Math.random() - 0.2),
      0.1 * (Math.random() - 0.5));
    let color = this.fastColor;
    if (deltaS > 1 / 50) {
      color = this.slowColor;
    } else if (deltaS > 1 / 85) {
      color = this.mediumColor;
    }
    this.particleSystem.AddParticle(p, v, color);
  }

  private elapsedS: number = 0;
  private animationLoop() {
    const deltaS = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedS += deltaS;

    if (this.ray.direction.manhattanLength() > 0) {
      this.selection.select(this.ray);
    }
    const selected = this.selection.getSelected();
    if (selected instanceof Orb) {
      this.currentSynth = selected.getSynth();
    }

    this.particleSystem.step(this.camera, deltaS);
    this.vortexSystem.step(this.camera, deltaS);
    this.stage.update(this.elapsedS);

    this.renderer.render(this.scene, this.camera);
    this.handleHand(this.leftHand, deltaS);
    this.handleHand(this.rightHand, deltaS);

    this.addRandomDot(deltaS);
  }
  private setUpAnimation() {
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(
      (function (self: Game) {
        return function () { self.animationLoop(); }
      })(this));
  }

  private ray = new THREE.Ray();
  private setRayFromCamera(coords: THREE.Vector2) {
    this.ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
    this.ray.direction.set(coords.x, coords.y, 0.5)
      .unproject(this.camera).sub(this.ray.origin).normalize();
  }

  private static triggerColor = new THREE.Color('white');
  private trigger(synth: Synth) {
    synth.pluck();
    this.vortexSystem.AddParticle(
      new THREE.Vector3(0.5, 0, 0),
      new THREE.Vector3(0, 0, -0.2), Game.triggerColor);
  }

  private static pluckThreshold = S.float('p');
  private static volumeRate = S.float('v');

  private handleMotion(motion: Motion, state: HandState) {
    const selected = this.selection.getSelected();
    if (selected != null && selected instanceof Orb) {
      const synth = selected.getSynth();
      switch (state) {
        case 'pluck':
          if (motion.acceleration.y > Game.pluckThreshold &&
            motion.velocity.y < 0) {
            this.trigger(synth);
          }
          break;
        case 'softer':
        case 'louder':
          const magnitude = motion.velocity.length() *
            ((state === 'softer') ? -Game.volumeRate : Game.volumeRate);
          synth.getVolumeKnob().change(magnitude);
          break;
      }
    }
  }

  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private handleHand(hand: Hand, deltaS: number) {
    const motion = hand.updateMotion(this.elapsedS, deltaS);
    this.handleMotion(motion, hand.getState());
    const state = hand.getState();
    if (motion.velocity.length() > Math.random()) {
      this.particleSystem.AddParticle(
        motion.position, motion.velocity,
        this.getColorForState(state));
    }
    if (state == 'point') {
      this.ray.origin.copy(motion.position);
      this.v1.copy(motion.position);
      this.camera.getWorldPosition(this.v2);
      this.v1.sub(this.v2);
      this.v2.normalize();
      this.ray.direction.copy(this.v2);
    }
  }

}