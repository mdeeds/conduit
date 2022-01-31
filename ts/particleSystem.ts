import * as THREE from "three";

class Particle {
  constructor(
    readonly position: THREE.Vector3,
    readonly color: THREE.Vector4,
    readonly currentSize: number,
    readonly rotation: number
  ) { }
}

export class ParticleSystem {
  private static kVS = `
uniform float pointMultiplier;
attribute float size;
attribute float angle;
attribute vec4 colour;
varying vec4 vColor;
varying vec2 vAngle;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;
  vAngle = vec2(cos(angle), sin(angle));
  vColor = color;
}`;

  private static kFS = `
uniform sampler2D diffuseTexture;
varying vec4 vColor;
varying vec2 vAngle;
void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColor;
}`;

  private material: THREE.ShaderMaterial;
  private particles: Particle[] = [];
  private geometry = new THREE.BufferGeometry();
  private points: THREE.Points;

  constructor(scene: THREE.Object3D) {
    const uniforms = {
      diffuseTexture: {
        value: new THREE.TextureLoader().load('./img/dot.png')
      },
      pointMultiplier: {
        value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
      }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: ParticleSystem.kVS,
      fragmentShader: ParticleSystem.kFS,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    this.geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
    this.geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
    this.geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

    this.points = new THREE.Points(this.geometry, this.material);

    scene.add(this.points);

    // this._alphaSpline = new LinearSpline((t, a, b) => {
    //   return a + t * (b - a);
    // });
    // this._alphaSpline.AddPoint(0.0, 0.0);
    // this._alphaSpline.AddPoint(0.1, 1.0);
    // this._alphaSpline.AddPoint(0.6, 1.0);
    // this._alphaSpline.AddPoint(1.0, 0.0);

    // this._colorSpline = new LinearSpline((t, a, b) => {
    //   const c = a.clone();
    //   return c.lerp(b, t);
    // });
    // this._colorSpline.AddPoint(0.0, new THREE.Color(0xFFFF80));
    // this._colorSpline.AddPoint(1.0, new THREE.Color(0xFF8080));

    // this._sizeSpline = new LinearSpline((t, a, b) => {
    //   return a + t * (b - a);
    // });
    // this._sizeSpline.AddPoint(0.0, 1.0);
    // this._sizeSpline.AddPoint(0.5, 5.0);
    // this._sizeSpline.AddPoint(1.0, 1.0);

    this.UpdateGeometry();
  }

  AddParticle(position: THREE.Vector3, color: THREE.Color) {
    const colorVector = new THREE.Vector4(color.r, color.g, color.b, 0.5);
    this.particles.push(new Particle(
      position, colorVector,
      Math.random() * 0.05,
      Math.random() * 2 * Math.PI));
  }

  private UpdateGeometry() {
    const positions: number[] = [];
    const sizes: number[] = [];
    const colors: number[] = [];
    const angles: number[] = [];

    for (let p of this.particles) {
      positions.push(p.position.x, p.position.y, p.position.z);
      colors.push(p.color.x, p.color.y, p.color.z, p.color.w);
      sizes.push(p.currentSize);
      angles.push(p.rotation);
    }

    this.geometry.setAttribute(
      'position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute(
      'size', new THREE.Float32BufferAttribute(sizes, 1));
    this.geometry.setAttribute(
      'color', new THREE.Float32BufferAttribute(colors, 4));
    this.geometry.setAttribute(
      'angle', new THREE.Float32BufferAttribute(angles, 1));

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.angle.needsUpdate = true;
  }

  private UpdateParticles(camera: THREE.Camera) {
    // this.particles.sort((a, b) => {
    //   const d1 = camera.position.distanceTo(a.position);
    //   const d2 = camera.position.distanceTo(b.position);
    //   return d2 - d1;
    // });
  }

  step(camera: THREE.Camera, deltaS: number) {
    this.UpdateParticles(camera);
    this.UpdateGeometry();
  }
}