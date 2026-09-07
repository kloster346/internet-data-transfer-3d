import * as THREE from 'three';

/**
 * 冲击波（扩散环）池：复用一组环形网格，节点激活 / 数据包到达时扩散淡出。
 */
export class ShockwavePool {
  private pool: THREE.Mesh[] = [];
  private active: { mesh: THREE.Mesh; life: number }[] = [];

  constructor(scene: THREE.Scene, color = 0x4cc9f0) {
    const geo = new THREE.RingGeometry(0.62, 0.72, 42);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  /** 在指定世界坐标触发一次扩散 */
  emit(pos: THREE.Vector3, color = 0x4cc9f0, y = 1.4): void {
    const mesh = this.pool.find((m) => !this.active.some((a) => a.mesh === m));
    if (!mesh) return;
    mesh.position.set(pos.x, pos.y + y, pos.z);
    mesh.visible = true;
    mesh.scale.setScalar(0.12);
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
    this.active.push({ mesh, life: 1.0 });
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.life -= dt * 2.0;
      if (a.life <= 0) {
        a.mesh.visible = false;
        this.active.splice(i, 1);
        continue;
      }
      a.mesh.scale.setScalar(0.12 + (1.0 - a.life) * 3.0);
      (a.mesh.material as THREE.MeshBasicMaterial).opacity = a.life * 0.75;
    }
  }
}
