import * as THREE from 'three';
import { label, glow } from './materials';
import { USER_JSON } from '../data/scenarios';
import type { PacketKind, PacketSpec } from '../data/types';

export interface Packet {
  group: THREE.Group;
  mesh: THREE.Mesh;
  trail: THREE.Mesh;
}

export interface JsonDoc {
  group: THREE.Group;
  /** 载荷变化后重绘 JSON 文档面片 */
  redraw(): void;
}

/** 数据包池键（kind + link + color，允许不同场景用不同色） */
export function packetKey(spec: PacketSpec): string {
  return spec.kind + ':' + spec.link + ':' + spec.color;
}

/** 不同协议类型用不同形状，增强可辨识度 */
function shapeFor(kind: PacketKind): THREE.BufferGeometry {
  switch (kind) {
    case 'tcp-syn':
    case 'tcp-synack':
    case 'tcp-ack':
      return new THREE.SphereGeometry(0.28, 16, 16);
    case 'dns-query':
    case 'dns-answer':
      return new THREE.SphereGeometry(0.24, 14, 14);
    case 'sql-query':
    case 'sql-result':
      return new THREE.BoxGeometry(0.5, 0.5, 0.5);
    default:
      return new THREE.OctahedronGeometry(0.34, 0);
  }
}

/** 数据包：按类型取形状，主体发光 + 尾迹光球 + CSS2D 标签 */
export function buildPacket(spec: PacketSpec): Packet {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(shapeFor(spec.kind), glow(spec.color, 2.2));
  g.add(mesh);
  const trail = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  g.add(trail);
  const l = label(spec.label, 'small');
  l.position.y = 0.6;
  g.add(l);
  return { group: g, mesh, trail };
}

/** 在画布上绘制 JSON 键值对（后端序列化结果的可视化） */
function drawJsonCanvas(c: HTMLCanvasElement): void {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = 'rgba(15,22,42,0.95)';
  ctx.fillRect(0, 0, 512, 320);
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 312);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('{ JSON 响应 }', 24, 48);
  const rows: [string, string][] = [
    ['"id"', String(USER_JSON.id)],
    ['"name"', '"' + USER_JSON.name + '"'],
    ['"role"', '"' + USER_JSON.role + '"'],
    ['"skills"', '["JavaScript", ...]'],
    ['"active"', String(USER_JSON.active)]
  ];
  ctx.font = '22px monospace';
  rows.forEach((r, i) => {
    ctx.fillStyle = '#7cc7ff';
    ctx.fillText(r[0], 32, 96 + i * 40);
    ctx.fillStyle = '#9ce8b0';
    ctx.fillText(': ' + r[1], 130, 96 + i * 40);
  });
}

/** 漂浮的 JSON 文档面片 */
export function buildJsonDoc(): JsonDoc {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  drawJsonCanvas(c);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), mat);
  g.add(plane);
  g.visible = false;
  return {
    group: g,
    redraw() {
      drawJsonCanvas(c);
      tex.needsUpdate = true;
    }
  };
}
