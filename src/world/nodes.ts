import * as THREE from 'three';
import { makeTextTexture, label, glow } from './materials';
import { USER_JSON } from '../data/scenarios';
import type { ScreenState, NodeId } from '../data/types';

export interface ScreenTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
}

export interface NetworkNode {
  id: NodeId;
  group: THREE.Group;
  /** 激活时脉冲的发光部件（其 userData.baseGlow 记录基础强度） */
  glowMeshes: THREE.Mesh[];
}

export interface ClientNode extends NetworkNode {
  screen: ScreenTexture;
  screenMesh: THREE.Mesh;
}

export interface Nodes {
  list: Map<NodeId, NetworkNode>;
  client: ClientNode;
}

/** 各节点的世界坐标（地面 y=0） */
export const POS: Record<NodeId, [number, number, number]> = {
  client: [-9, 0, 0],
  dns: [-5, 0, 4.5],
  cdn: [-3.5, 0, -4.5],
  lb: [-1.5, 0, 0],
  api: [2.5, 0, 0],
  backend: [6, 0, 0],
  cache: [8, 0, 2.6],
  db: [8, 0, -2.6]
};

function steel(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 });
}

function glowPart(geo: THREE.BufferGeometry, color: number, intensity: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, glow(color, intensity));
  m.userData.baseGlow = intensity;
  return m;
}

function register(id: NodeId, g: THREE.Group, glowMeshes: THREE.Mesh[]): NetworkNode {
  g.position.set(POS[id][0], POS[id][1], POS[id][2]);
  return { id, group: g, glowMeshes };
}

/** 客户端（浏览器）：显示器 + 屏幕 + 天线 */
function buildClient(): ClientNode {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 0.9, 8), steel(0x3a4a72));
  stand.position.y = 0.45;
  stand.castShadow = true;
  g.add(stand);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.24), steel(0x2c3e6b));
  body.position.y = 1.85;
  body.castShadow = true;
  g.add(body);
  const screen = makeTextTexture('', { width: 512, height: 320 });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.5), new THREE.MeshBasicMaterial({ map: screen.tex }));
  screenMesh.position.set(0, 1.85, 0.13);
  g.add(screenMesh);
  const antenna = glowPart(new THREE.SphereGeometry(0.13, 16, 16), 0x4cc9f0, 1.6);
  antenna.position.set(0, 2.85, 0);
  g.add(antenna);
  const node = register('client', g, [antenna]);
  return { ...node, screen, screenMesh };
}

/** DNS 解析器：发光球体 + 环 */
function buildDns(): NetworkNode {
  const g = new THREE.Group();
  const sphere = glowPart(new THREE.SphereGeometry(0.85, 32, 32), 0x4cc9f0, 1.3);
  sphere.position.y = 1.1;
  g.add(sphere);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 12, 48), steel(0x3a4a72));
  ring.position.y = 1.1;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 2.2, 10), steel(0x3a4a72));
  pillar.position.y = 1.1;
  pillar.castShadow = true;
  g.add(pillar);
  return register('dns', g, [sphere]);
}

/** CDN 边缘节点：六棱柱 */
function buildCdn(): NetworkNode {
  const g = new THREE.Group();
  const prism = glowPart(new THREE.CylinderGeometry(0.95, 0.95, 0.7, 6), 0x06d6a0, 1.3);
  prism.position.y = 1.1;
  prism.castShadow = true;
  g.add(prism);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 2.2, 10), steel(0x3a4a72));
  pillar.position.y = 1.1;
  pillar.castShadow = true;
  g.add(pillar);
  return register('cdn', g, [prism]);
}

/** 负载均衡器：八面体 */
function buildLb(): NetworkNode {
  const g = new THREE.Group();
  const octa = glowPart(new THREE.OctahedronGeometry(0.85, 0), 0xffb703, 1.3);
  octa.position.y = 1.1;
  g.add(octa);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 2.2, 10), steel(0x3a4a72));
  pillar.position.y = 1.1;
  pillar.castShadow = true;
  g.add(pillar);
  return register('lb', g, [octa]);
}

/** API 网关：发光环 + 二十面体核心 */
function buildApi(): NetworkNode {
  const g = new THREE.Group();
  const ring = glowPart(new THREE.TorusGeometry(1.1, 0.14, 20, 60), 0x9d4edd, 1.7);
  ring.position.y = 1.35;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const core = glowPart(new THREE.IcosahedronGeometry(0.55, 1), 0x9d4edd, 1.7);
  core.position.y = 1.35;
  g.add(core);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.7, 12), steel(0x3a4a72));
  pillar.position.y = 1.35;
  pillar.castShadow = true;
  g.add(pillar);
  return register('api', g, [ring, core]);
}

/** 后端：服务器机柜 + 刀片 + LED 指示灯 */
function buildBackend(): NetworkNode {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.6, 1.3), steel(0x2a3a5e));
  rack.position.y = 1.3;
  rack.castShadow = true;
  g.add(rack);
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.1), steel(0x33476e));
    b.position.set(0, 0.85 + i * 0.8, 0);
    b.castShadow = true;
    g.add(b);
    const led = glowPart(new THREE.SphereGeometry(0.06, 12, 12), 0x2ecc71, 1.4);
    led.position.set(0.62, 0.85 + i * 0.8, 0.56);
    g.add(led);
    leds.push(led);
  }
  return register('backend', g, leds);
}

/** 缓存（Redis 类）：发光立方体 */
function buildCache(): NetworkNode {
  const g = new THREE.Group();
  const cube = glowPart(new THREE.BoxGeometry(0.9, 0.9, 0.9), 0xf72585, 1.3);
  cube.position.y = 1.1;
  cube.castShadow = true;
  g.add(cube);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 2.2, 10), steel(0x3a4a72));
  pillar.position.y = 1.1;
  pillar.castShadow = true;
  g.add(pillar);
  return register('cache', g, [cube]);
}

/** 数据库：圆柱（数据库图标） */
function buildDb(): NetworkNode {
  const g = new THREE.Group();
  const cyl = glowPart(new THREE.CylinderGeometry(0.85, 0.85, 1.2, 24), 0x2ecc71, 1.2);
  cyl.position.y = 1.1;
  cyl.castShadow = true;
  g.add(cyl);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.18, 24), steel(0x2a3a5e));
  top.position.y = 1.75;
  g.add(top);
  return register('db', g, [cyl]);
}

/** 构建全部 8 个节点 */
export function buildAllNodes(): Nodes {
  const client = buildClient();
  const list = new Map<NodeId, NetworkNode>();
  list.set('client', client);
  list.set('dns', buildDns());
  list.set('cdn', buildCdn());
  list.set('lb', buildLb());
  list.set('api', buildApi());
  list.set('backend', buildBackend());
  list.set('cache', buildCache());
  list.set('db', buildDb());
  return { list, client };
}

/** 为节点添加 CSS2D 文字标签 */
export function addNodeLabels(scene: THREE.Scene): void {
  const defs: [NodeId, string, [number, number, number]][] = [
    ['client', '前端（浏览器）', [-9, 3.5, 0]],
    ['dns', 'DNS 解析器', [-5, 2.6, 4.5]],
    ['cdn', 'CDN 边缘', [-3.5, 2.6, -4.5]],
    ['lb', '负载均衡', [-1.5, 2.6, 0]],
    ['api', 'API 网关', [2.5, 2.9, 0]],
    ['backend', '后端（服务器）', [6, 3.4, 0]],
    ['cache', '缓存', [8, 2.4, 2.6]],
    ['db', '数据库', [8, 2.4, -2.6]]
  ];
  for (const [id, text, p] of defs) {
    const l = label(text, 'small');
    l.position.set(p[0], p[1], p[2]);
    scene.add(l);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 绘制前端屏幕内容（idle / sending / rendered） */
export function drawScreen(client: ClientNode, state: ScreenState): void {
  const { ctx, canvas, tex } = client.screen;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0e1830';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#22304f';
  ctx.strokeRect(0, 0, w, h);

  if (state === 'rendered') {
    ctx.fillStyle = '#1b2740';
    roundRect(ctx, 30, 26, w - 60, h - 52, 14);
    ctx.fill();
    ctx.fillStyle = '#4cc9f0';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('用户信息', 52, 68);
    const rows: [string, string][] = [
      ['ID', String(USER_JSON.id)],
      ['姓名', USER_JSON.name],
      ['角色', USER_JSON.role],
      ['技能', USER_JSON.skills.join(' · ')],
      ['在线', USER_JSON.active ? '是' : '否']
    ];
    ctx.font = '26px sans-serif';
    rows.forEach((r, i) => {
      ctx.fillStyle = '#7cc7ff';
      ctx.fillText(r[0] + ':', 52, 106 + i * 34);
      ctx.fillStyle = '#e8eefc';
      ctx.fillText(r[1], 130, 106 + i * 34);
    });
  } else if (state === 'sending') {
    ctx.fillStyle = '#4cc9f0';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('发送请求…', w / 2, 80);
    ctx.fillStyle = '#93a3c4';
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GET /api/users/42', 70, 150);
    ctx.fillText('Accept: application/json', 70, 185);
    for (let i = 0; i < 3; i++) {
      const a = ((performance.now() / 300) + i / 3) % 1;
      ctx.fillStyle = 'rgba(76,201,240,' + (1 - a) + ')';
      ctx.beginPath();
      ctx.arc(70 + a * 120, 235, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#1b2740';
    roundRect(ctx, 40, 150, w - 80, 76, 12);
    ctx.fill();
    ctx.fillStyle = '#4cc9f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('获取用户信息', w / 2, 198);
    ctx.fillStyle = '#93a3c4';
    ctx.font = '20px sans-serif';
    ctx.fillText('等待用户操作…', w / 2, 110);
  }
  tex.needsUpdate = true;
}
