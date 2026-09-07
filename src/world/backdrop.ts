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

  // 同心圆环（电路感层次）
  for (const [rad, w, col, it] of [
    [5.5, 0.03, 0x2a4a86, 0.5],
    [9.5, 0.025, 0x22386a, 0.4]
  ] as const) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rad, w, 8, 90),
      new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: it,
        roughness: 0.4,
        metalness: 0.3
      })
    );
    ring.position.y = 0.06;
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
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
