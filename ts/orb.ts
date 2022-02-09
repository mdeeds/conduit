import * as THREE from "three";
import { KnobTarget } from "./knob";
import { Selectable } from "./selection";
import { S } from "./settings";
import { Synth } from "./synth";

export class Orb extends THREE.Object3D implements Selectable {
  private material: THREE.ShaderMaterial;
  private static litColor = new THREE.Color('#ffa');
  private static darkColor = new THREE.Color('#885');

  constructor(x: number, z: number, private synth: Synth) {
    super();
    this.position.set(x, 0, z);
    const ballGeometry = new THREE.IcosahedronBufferGeometry(
      0.3, /*detail=*/S.float('s'));
    ballGeometry.translate(0, 0.3, 0);
    this.material = this.getBlobMaterial(Orb.darkColor);
    const b = new THREE.Mesh(ballGeometry, this.material);
    b.castShadow = true;
    synth.getVolumeKnob().addTarget(KnobTarget.fromObjectScale(b));
    this.add(b);
  }

  public getSynth(): Synth {
    return this.synth;
  }

  public select() {
    this.material.uniforms['color'].value = Orb.litColor;
  }

  public deselect() {
    this.material.uniforms['color'].value = Orb.darkColor;
  }

  public getObject3D() {
    return this;
  }

  public trigger() {
    this.synth.trigger();
  }

  public release() {
    this.synth.release();
  }

  public change(relativeDelta: number) {
    this.synth.getVolumeKnob().change(relativeDelta);
  }

  getBlobMaterial(color: THREE.Color): THREE.ShaderMaterial {
    // Vertex shader
    // uniform: cameraPosition
    // attribute: position
    // attribute: normal
    // Fragment shader
    // 
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        time: { value: 0 },
      },
      vertexShader: `
uniform vec3 color;
uniform float time;

varying float v_Density;
varying vec4 v_WorldPosition;
varying float v_Light;

void main() {
  // A unit vector pointing from the object to the camera.
  vec4 worldPosition = modelMatrix * vec4(position, 1);
  worldPosition = worldPosition / worldPosition.w;
  vec3 cameraVector = normalize(cameraPosition - worldPosition.xyz);
  v_Density = clamp(1.5 * pow(dot(cameraVector, normal), 0.9), 0.0, 1.0);
  float light = dot(normal, vec3(0, 1, 0));
  v_Light = light;
  v_WorldPosition = worldPosition;

  gl_Position = projectionMatrix * modelViewMatrix * 
    vec4(position * 1.1, 1.0);
}      
      `,
      fragmentShader: `
uniform vec3 color;
uniform float time;

varying float v_Density;
varying vec4 v_WorldPosition;
varying float v_Light;
                  
void main() {
  vec4 worldPosition = v_WorldPosition;
  vec3 cf = sin(sin(4.1 * worldPosition.xyz * worldPosition.y + 0.2 * time) * 
      4.0 + cos(3.2 * worldPosition.yzx * 2.3) * 2.1 * worldPosition.x + 0.314 * time);
  float light = v_Light;
  vec3 co = color * light * length(cf);

  gl_FragColor = vec4(co, v_Density);
}      
      `,
      transparent: true,
    });

    return material;
  }

  update(elapsedS: number) {
    this.material.uniforms['time'].value = elapsedS;

  }

}