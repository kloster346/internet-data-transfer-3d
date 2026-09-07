import * as THREE from 'three';

/** 布置灯光、地面网格、地板与背景星点 */
export function setupEnvironment(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0x8899cc, 1.15));

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(8, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  scene.add(sun);

  const cyan = new THREE.PointLight(0x4cc9f0, 30, 40, 2);
  cyan.position.set(0, 0, 0);
  scene.add(cyan);

  const fill = new THREE.PointLight(0xf72585, 14, 30, 2);
  fill.position.set(-9, 3, 6);
  scene.add(fill);

  const grid = new THREE.GridHelper(40, 40, 0x2a3f70, 0x17233f);
  grid.position.y = -0.02;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x0d1530, roughness: 0.95, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const stars = new THREE.BufferGeometry();
  const starPos: number[] = [];
  for (let i = 0; i < 240; i++) {
    starPos.push((Math.random() - 0.5) * 60, Math.random() * 18 + 0.5, (Math.random() - 0.5) * 40 - 8);
  }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      stars,
      new THREE.PointsMaterial({
        color: 0x4cc9f0,
        size: 0.06,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    )
  );

  // 环境尘埃：漂浮的微光粒子，增加氛围
  const dust = new THREE.BufferGeometry();
  const dustPos = new Float32Array(360 * 3);
  for (let i = 0; i < 360; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 40;
    dustPos[i * 3 + 1] = Math.random() * 12 + 0.5;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 24;
  }
  dust.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  scene.add(
    new THREE.Points(
      dust,
      new THREE.PointsMaterial({
        color: 0x6f8fc0,
        size: 0.045,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    )
  );
}
