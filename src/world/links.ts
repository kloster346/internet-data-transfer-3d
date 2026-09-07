import * as THREE from 'three';
import { POS } from './nodes';
import type { NodeId } from '../data/types';

export interface Link {
  id: string;
  curve: THREE.CatmullRomCurve3;
  /** 细发光路径（数据包飞行时被点亮） */
  path: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  /** 当前点亮量 0..1（引擎每帧更新） */
  glow: number;
}

export const LINK_BASE_OPACITY = 0.12;
export const LINK_BASE_EMISSIVE = 0.28;
export const LINK_ACTIVE_OPACITY = 0.9;
export const LINK_ACTIVE_EMISSIVE = 1.9;

/** 链路定义（from→to 决定曲线方向；reverse 飞行 = to→from） */
const DEFS: { id: string; from: NodeId; to: NodeId }[] = [
  { id: 'dns', from: 'client', to: 'dns' },
  { id: 'client-cdn', from: 'client', to: 'cdn' },
  { id: 'cdn-lb', from: 'cdn', to: 'lb' },
  { id: 'lb-api', from: 'lb', to: 'api' },
  { id: 'api-backend', from: 'api', to: 'backend' },
  { id: 'backend-cache', from: 'backend', to: 'cache' },
  { id: 'backend-db', from: 'backend', to: 'db' }
];

/**
 * 构建链路：极淡的细发光路径（平时如虚线般仅作参考），
 * 当数据包在该链路上飞行时引擎会把 glow 提高 → 路径被点亮。
 */
export function buildLinks(scene: THREE.Scene): Map<string, Link> {
  const map = new Map<string, Link>();
  for (const d of DEFS) {
    const a = POS[d.from];
    const b = POS[d.to];
    const p0 = new THREE.Vector3(a[0], 2.0, a[2]);
    const p1 = new THREE.Vector3(b[0], 2.0, b[2]);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y += 1.2;

    const curve = new THREE.CatmullRomCurve3([p0, mid, p1], false, 'catmullrom', 0.5);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x6fb5ff,
      emissive: 0x2e6cff,
      emissiveIntensity: LINK_BASE_EMISSIVE,
      transparent: true,
      opacity: LINK_BASE_OPACITY,
      roughness: 0.3,
      metalness: 0.2,
      depthWrite: false
    });
    const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.026, 8, false), mat);
    scene.add(path);

    map.set(d.id, { id: d.id, curve, path, mat, glow: 0 });
  }
  return map;
}
