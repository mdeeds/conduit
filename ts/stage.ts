import * as THREE from "three";

export class Stage extends THREE.Object3D {
  constructor() {
    super();

    let r = 2;
    {
      const light = new THREE.HemisphereLight('#8bf', '#951', 0.5);
      this.add(light);
    }

    let b: THREE.Object3D = null;
    for (let i = 0; i < 9; ++i) {
      const x = r * Math.sin(i / 9 * 2 * Math.PI);
      const z = -r * Math.cos(i / 9 * 2 * Math.PI);
      const ballGeometry = new THREE.IcosahedronBufferGeometry(0.3, 3);
      ballGeometry.translate(0, 0.3, 0);
      b = new THREE.Mesh(
        ballGeometry,
        new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.2 }));
      b.position.set(x, 0, z);
      b.castShadow = true;
      this.add(b);
    }
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

}