import * as THREE from "three";

import { Hand, State } from "./hand";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Tracker } from "./tracker";
import { ParticleSystem } from "./particleSystem";
import { Synth } from "./synth";
import { Stage } from "./stage";
import { Assets } from "./assets";
import { InstancedObject } from "./instancedObject";

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private camera: THREE.Camera;
  private particleSystem: ParticleSystem;

  private leftHand: Hand;
  private rightHand: Hand;

  private synth: Synth;
  private stage: Stage;

  constructor(private audioCtx: AudioContext) {
    this.synth = new Synth(audioCtx);
    document.querySelector('body').addEventListener('keydown', (ev) => {
      switch (ev.code) {
        case 'Space': this.synth.pluck(); break;
        case 'ArrowUp': this.synth.getVolumeKnob().change(0.1); break;
        case 'ArrowDown': this.synth.getVolumeKnob().change(-0.1); break;
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
      75, window.innerWidth / window.innerHeight, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.6, 0);
    this.camera.lookAt(0, 0.15, -2);
    this.scene.add(this.camera);

    this.stage = new Stage(this.synth);
    this.scene.add(this.stage);

    // const light = new THREE.HemisphereLight(0xffffff, 0x554433, 1.0);
    // this.scene.add(light);

    this.setUpRenderer();
    this.leftHand = new Hand('left', this.renderer, this.scene, this.synth);
    this.rightHand = new Hand('right', this.renderer, this.scene, this.synth);

    this.setUpAnimation();
    this.setUpMouseBar();
    this.particleSystem = new ParticleSystem(this.scene);
    this.setUpMeshes();
  }

  private async setUpMeshes() {
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.scene.add(light);
    const gltf = await Assets.loadMesh('knob');
    const knobs = new InstancedObject(gltf.scene, 50);
    this.scene.add(knobs);
    for (let i = 0; i < 30; ++i) {
      const m = new THREE.Matrix4();
      m.setPosition(Math.random() * 3 - 1.5,
        Math.random() * 3 - 1.5,
        Math.random() * 3 - 1.5);
      knobs.addInstance(m);
    }
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

  private setUpRenderer() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private elapsedS: number = 0;

  private louderColor = new THREE.Color('orange');
  private softerColor = new THREE.Color('lightblue');
  private pointColor = new THREE.Color('yellow');
  private pluckColor = new THREE.Color('pink');
  private fofColor = new THREE.Color('#f0f');

  private getColorForState(s: State): THREE.Color {
    switch (s) {
      case 'softer': return this.softerColor;
      case 'louder': return this.louderColor;
      case 'point': return this.pointColor;
      case 'pluck': return this.pluckColor;
      default: return this.fofColor;
    }
  }

  private addRandomDot() {
    const p = new THREE.Vector3(
      6 * (Math.random() - 0.5),
      3 * (Math.random()),
      6 * (Math.random() - 0.5));
    const v = new THREE.Vector3(
      0.1 * (Math.random() - 0.5),
      0.1 * (Math.random() - 0.2),
      0.1 * (Math.random() - 0.5));
    this.particleSystem.AddParticle(p, v, new THREE.Color('white'));
  }

  private animationLoop() {
    const deltaS = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedS += deltaS;

    this.particleSystem.step(this.camera, deltaS);
    this.stage.update(this.elapsedS);

    this.renderer.render(this.scene, this.camera);

    const leftMotion = this.leftHand.updateMotion(this.elapsedS, deltaS);
    const rightMotion = this.rightHand.updateMotion(this.elapsedS, deltaS);
    if (leftMotion.velocity.length() > Math.random()) {
      this.particleSystem.AddParticle(
        leftMotion.position, leftMotion.velocity,
        this.getColorForState(this.leftHand.getState()));
    }
    if (rightMotion.velocity.length() > Math.random()) {
      this.particleSystem.AddParticle(
        rightMotion.position, rightMotion.velocity,
        this.getColorForState(this.rightHand.getState()));
    }
    this.addRandomDot();
  }
  private setUpAnimation() {
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(
      (function (self: Game) {
        return function () { self.animationLoop(); }
      })(this));
  }
}