import * as THREE from 'three';
import { POS } from './nodes';
import type { NodeId } from '../data/types';

export interface Link {
  id: string;
  curve: THREE.CatmullRomCurve3;
  flowGeo: THREE.BufferGeometry;
  flowPts: number;
}

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

/** 构建所有链路：拱形曲线管道 + 流动粒子（表示数据传输） */
export function buildLinks(scene: THREE.Scene): Map<string, Link> {
  const map = new Map<string, Link>();
  for (const d of DEFS) {
    const a = POS[d.from];
    const b = POS[d.to];
    const p0 = new THREE.Vector3(a[0], 2.0, a[2]);
    const p1 = new THREE.Vector3(b[0], 2.0, b[2]);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y += 1.4;

    const curve = new THREE.CatmullRomCurve3([p0, mid, p1], false, 'catmullrom', 0.5);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 60, 0.05, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0x2c3d6b,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x0d1a3a,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
      })
    );
    scene.add(tube);

    const flowPts = 26;
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flowPts * 3), 3));
    const flow = new THREE.Points(
      flowGeo,
      new THREE.PointsMaterial({
        color: 0x4cc9f0,
        size: 0.09,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    scene.add(flow);

    map.set(d.id, { id: d.id, curve, flowGeo, flowPts });
  }
  return map;
}
