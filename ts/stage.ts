import * as THREE from "three";
import { ShaderMaterial } from "three";
import { KnobTarget } from "./knob";
import { Synth } from "./synth";

export class Stage extends THREE.Object3D {
  constructor(synth: Synth) {
    super();

    let r = 2;
    {
      const light = new THREE.HemisphereLight('#8bf', '#951', 0.5);
      this.add(light);
    }

    let b: THREE.Mesh = null;
    for (let i = 0; i < 9; ++i) {
      const x = r * Math.sin(i / 9 * 2 * Math.PI);
      const z = -r * Math.cos(i / 9 * 2 * Math.PI);
      const ballGeometry = new THREE.IcosahedronBufferGeometry(0.3, 3);
      ballGeometry.translate(0, 0.3, 0);
      b = new THREE.Mesh(
        ballGeometry,
        this.getBlobMaterial(new THREE.Color('#885')));
      b.position.set(x, 0, z);
      b.castShadow = true;
      this.add(b);
    }

    if (b.material instanceof THREE.ShaderMaterial) {
      b.material.uniforms['color'].value = new THREE.Color('#ffa');
    }

    synth.getVolumeKnob().addTarget(KnobTarget.fromObjectScale(b));

    const light = new THREE.SpotLight('white',
      /*intensity=*/ 2,
      /*distance=*/0,
      /*angle=*/Math.PI / 32,
      /*penumbra=*/0.15,
      /*decay=*/2);
    light.position.set(b.position.x, 5, b.position.z);
    light.castShadow = true;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 10;
    light.shadow.focus = 1;
    light.target = b;
    this.add(light);


    const floor = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(5, 5),
      new THREE.MeshStandardMaterial({ color: '#444' }));
    floor.receiveShadow = true;

    floor.rotateX(-Math.PI / 2);
    this.add(floor);
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
      },
      vertexShader: `
uniform vec3 color;
varying float v_Density;
varying vec3 v_Color;

void main() {
  // A unit vector pointing from the object to the camera.
  vec4 worldPosition = modelMatrix * vec4(position, 1);
  worldPosition = worldPosition / worldPosition.w;
  vec3 cameraVector = normalize(cameraPosition - worldPosition.xyz);
  v_Density = clamp(2.0 * pow(dot(cameraVector, normal), 0.8), 0.0, 1.0);
  float light = dot(normal, vec3(0, 1, 0));
  v_Color = light * color;

  gl_Position = projectionMatrix * modelViewMatrix * 
    vec4(position * 1.1, 1.0);
}      
      `,
      fragmentShader: `
varying float v_Density;
varying vec3 v_Color;
            
void main() {
  gl_FragColor = vec4(v_Color, v_Density);
  // gl_FragColor = vec4(v_Normal, 0.5);
}      
      `,
      transparent: true,
    });

    return material;
  }


}