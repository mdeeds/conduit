import * as THREE from "three";
import { Bar } from "./bar";
import { Hand } from "./hand";
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Tracker } from "./tracker";
import { ParticleSystem } from "./particleSystem";

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private camera: THREE.Camera;
  private particleSystem: ParticleSystem;

  private leftBar: Bar;
  private rightBar: Bar;
  private middleBar: Bar;
  private middleBar2: Bar;

  private leftHand: Hand;
  private rightHand: Hand;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.leftBar = new Bar(new THREE.Color('blue'));
    this.scene.add(this.leftBar);

    this.rightBar = new Bar(new THREE.Color('red'));
    this.scene.add(this.rightBar);

    this.middleBar = new Bar(new THREE.Color('green'));
    this.scene.add(this.middleBar);
    this.middleBar2 = new Bar(new THREE.Color('white'));
    this.scene.add(this.middleBar2);

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, /*near=*/0.1,
      /*far=*/100);
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);

    const light = new THREE.HemisphereLight(0xffffff, 0x554433, 1.0);
    this.scene.add(light);

    this.setUpRenderer();
    this.leftHand = new Hand('left', this.renderer, this.scene);
    this.rightHand = new Hand('right', this.renderer, this.scene);

    this.setUpAnimation();
    this.setUpMouseBar();


    this.particleSystem = new ParticleSystem(this.scene);
    for (let i = 0; i < 1000; ++i) {
      const p = new THREE.Vector3(6 * (Math.random() - 0.5),
        2 * (0.5 + Math.random()), 3 * Math.random() - 2);
      const v = new THREE.Vector3(
        0.1 * (Math.random() - 0.5),
        0.1 * (Math.random() - 0.5),
        0.1 * (Math.random() - 0.5));
      this.particleSystem.AddParticle(p, v, new THREE.Color('white'));
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
      this.middleBar.setExtent(motion.velocity);
      this.middleBar2.setExtent(motion.acceleration);
    });
  }

  private setUpRenderer() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    document.body.appendChild(VRButton.createButton(this.renderer));
    this.renderer.xr.enabled = true;
  }

  private elapsedS: number = 0;
  private animationLoop() {
    const deltaS = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedS += deltaS;

    this.particleSystem.step(this.camera, deltaS);

    this.renderer.render(this.scene, this.camera);

    const leftMotion = this.leftHand.updateMotion(this.elapsedS, deltaS);
    this.leftBar.setExtent(leftMotion.acceleration);
    const rightMotion = this.rightHand.updateMotion(this.elapsedS, deltaS);
    this.rightBar.setExtent(rightMotion.acceleration);
    if (Math.random() < 0.5 && leftMotion.velocity.length() > 0.3) {
      this.particleSystem.AddParticle(
        leftMotion.position, leftMotion.velocity, new THREE.Color('blue'));
    }
    if (Math.random() < 0.5 && rightMotion.velocity.length() > 0.3) {
      this.particleSystem.AddParticle(
        rightMotion.position, rightMotion.velocity, new THREE.Color('red'));
    }
  }
  private setUpAnimation() {
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(
      (function (self: Game) {
        return function () { self.animationLoop(); }
      })(this));
  }
}