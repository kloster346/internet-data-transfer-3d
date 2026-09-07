import * as THREE from 'three';

/**
 * 数据中心氛围背景：圆形发光数据平台 + 外圈服务器机柜 + 渐变天空穹顶。
 * 让整体从"示意图"升级为"有纵深的机房"。
 */
export function buildBackdrop(scene: THREE.Scene): void {
  // 圆形数据平台
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 13, 0.18, 72),
    new THREE.MeshStandardMaterial({ color: 0x0c1631, roughness: 0.85, metalness: 0.2 })
  );
  disc.receiveShadow = true;
  scene.add(disc);

  // 平台边缘发光环
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(13, 0.09, 12, 96),
    new THREE.MeshStandardMaterial({
      color: 0x3aa0ff,
      emissive: 0x3aa0ff,
      emissiveIntensity: 1.2,
      roughness: 0.3,
      metalness: 0.2
    })
  );
  rim.position.y = 0.1;
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  // 内圈细环（层次）
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(9.5, 0.03, 8, 80),
    new THREE.MeshStandardMaterial({
      color: 0x2a4a86,
      emissive: 0x2a4a86,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.3
    })
  );
  inner.position.y = 0.06;
  inner.rotation.x = Math.PI / 2;
  scene.add(inner);

  // 数据中心：平台后侧一圈服务器机柜（低模剪影，背向相机）
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x182647, roughness: 0.6, metalness: 0.4 });
  const ledColors = [0x2ecc71, 0x4cc9f0, 0xffb703, 0xf72585, 0x9d4edd];
  const rackCount = 16;
  const r = 15.0;
  for (let i = 0; i < rackCount; i++) {
    // a ∈ [200°, 340°]，集中在后侧，避免遮挡默认相机
    const a = (200 + (i / (rackCount - 1)) * 140) * (Math.PI / 180);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.3, 0.85), rackMat);
    rack.position.set(x, 1.15, z);
    rack.rotation.y = -a + Math.PI / 2;
    scene.add(rack);

    const ledColor = ledColors[i % ledColors.length];
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 1.4 })
    );
    led.position.set(Math.cos(a) * (r - 0.52), 1.95, Math.sin(a) * (r - 0.52));
    led.rotation.y = -a + Math.PI / 2;
    scene.add(led);
  }

  // 天空穹顶（上下渐变）
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#04060f');
  grad.addColorStop(0.55, '#0a1430');
  grad.addColorStop(1, '#152a50');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(72, 32, 24),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide, fog: false, depthWrite: false })
  );
  scene.add(sky);
}
