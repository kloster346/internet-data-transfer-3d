import * as THREE from 'three';
import { label, glow, makeTextTexture } from './materials';

export interface Packet {
  group: THREE.Group;
  mesh: THREE.Mesh;
  trail: THREE.Mesh;
}

/** 数据包：八面体主体 + 尾迹光球 + CSS2D 标签 */
export function buildPacket(color: number, text: string, cls: string): Packet {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), glow(color, 1.6));
  g.add(mesh);
  const trail = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
  );
  g.add(trail);
  const l = label(text, cls);
  l.position.y = 0.65;
  g.add(l);
  return { group: g, mesh, trail };
}

/** 漂浮的 JSON 文档面片（后端序列化结果的可视化） */
export function buildJsonDoc(): THREE.Group {
  const g = new THREE.Group();
  const t = makeTextTexture('{ }', { width: 512, height: 320 });
  const mat = new THREE.MeshBasicMaterial({ map: t.tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat);
  g.add(plane);
  g.visible = false;
  return g;
}
