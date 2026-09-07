import * as THREE from 'three';
import { label, glow } from './materials';
import { USER_JSON } from '../data/scenarios';
import type { PacketKind, PacketSpec } from '../data/types';

/** 彗尾采样点数 */
export const TRAIL_N = 14;

export interface Packet {
  group: THREE.Group;
  mesh: THREE.Mesh;
  trail: THREE.Mesh;
  trailPts: THREE.Points;
  trailGeo: THREE.BufferGeometry;
  /** 最近位置历史（越长越新的在前） */
  history: THREE.Vector3[];
  baseColor: THREE.Color;
}

export interface JsonDoc {
  group: THREE.Group;
  redraw(): void;
}

/** 数据包池键（kind + link + color） */
export function packetKey(spec: PacketSpec): string {
  return spec.kind + ':' + spec.link + ':' + spec.color;
}

/** 不同协议类型用不同形状 */
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

/** 更新彗尾：把当前位置插入历史，按新旧程度着色（越旧越暗） */
export function updateTrail(pkt: Packet, pos: THREE.Vector3): void {
  pkt.history.unshift(pos.clone());
  if (pkt.history.length > TRAIL_N) pkt.history.pop();

  const posAttr = pkt.trailGeo.getAttribute('position') as THREE.BufferAttribute;
  const colAttr = pkt.trailGeo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < TRAIL_N; i++) {
    const p = pkt.history[i];
    if (p) {
      posAttr.setXYZ(i, p.x, p.y, p.z);
      const f = 1 - i / TRAIL_N;
      colAttr.setXYZ(i, pkt.baseColor.r * f, pkt.baseColor.g * f, pkt.baseColor.b * f);
    } else {
      posAttr.setXYZ(i, pos.x, pos.y, pos.z);
      colAttr.setXYZ(i, 0, 0, 0);
    }
  }
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
}

export function resetTrail(pkt: Packet): void {
  pkt.history.length = 0;
}

/** 数据包：发光主体 + 尾迹光球 + 彗尾粒子 + CSS2D 标签 */
export function buildPacket(spec: PacketSpec): Packet {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(shapeFor(spec.kind), glow(spec.color, 1.4));
  g.add(mesh);

  const trail = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    new THREE.MeshBasicMaterial({
      color: spec.color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  g.add(trail);

  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 3), 3));
  const trailPts = new THREE.Points(
    trailGeo,
    new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  trailPts.frustumCulled = false;
  g.add(trailPts);

  const l = label(spec.label, 'small');
  l.position.y = 0.6;
  g.add(l);

  return { group: g, mesh, trail, trailPts, trailGeo, history: [], baseColor: new THREE.Color(spec.color) };
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
