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
  /** 激活时脉冲的发光部件（userData.baseGlow 记录基础强度） */
  glowMeshes: THREE.Mesh[];
  /** 待机旋转部件 */
  spinners: THREE.Object3D[];
}

export interface ClientNode extends NetworkNode {
  screen: ScreenTexture;
  screenMesh: THREE.Mesh;
}

export interface Nodes {
  list: Map<NodeId, NetworkNode>;
  client: ClientNode;
}

/** 各节点的世界坐标（地面 y=0）——前中后纵深 + 左右对称布局 */
export const POS: Record<NodeId, [number, number, number]> = {
  client: [0, 0, 7.2],
  dns: [-5.2, 0, 3.0],
  cdn: [5.2, 0, 3.0],
  lb: [0, 0, 1.2],
  api: [0, 0, -2.2],
  backend: [0, 0, -5.5],
  cache: [-3.8, 0, -4.8],
  db: [3.8, 0, -4.8]
};

function steel(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.25 });
}

function glowPart(geo: THREE.BufferGeometry, color: number, intensity: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, glow(color, intensity));
  m.userData.baseGlow = intensity;
  return m;
}

function register(
  id: NodeId,
  g: THREE.Group,
  glowMeshes: THREE.Mesh[],
  spinners: THREE.Object3D[] = []
): NetworkNode {
  g.position.set(POS[id][0], POS[id][1], POS[id][2]);
  return { id, group: g, glowMeshes, spinners };
}

/** 客户端（浏览器）：显示器（带边框）+ 支架 + 键盘底座 + 天线 + 底部氛围光条 */
function buildClient(): ClientNode {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 0.9, 8), steel(0x3a4a72));
  stand.position.y = 0.45;
  stand.castShadow = true;
  g.add(stand);

  // 显示器外壳 + 屏幕
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.95, 0.26), steel(0x2c3e6b));
  body.position.y = 1.9;
  body.castShadow = true;
  g.add(body);
  const screen = makeTextTexture('', { width: 512, height: 320 });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.75, 1.72), new THREE.MeshBasicMaterial({ map: screen.tex }));
  screenMesh.position.set(0, 1.9, 0.145);
  g.add(screenMesh);

  // 底部氛围光条（发光）
  const glowBar = glowPart(new THREE.BoxGeometry(2.2, 0.05, 0.03), 0x4cc9f0, 0.9);
  glowBar.position.set(0, 0.86, 0.16);
  g.add(glowBar);

  const antenna = glowPart(new THREE.SphereGeometry(0.14, 16, 16), 0x4cc9f0, 1.0);
  antenna.position.set(0, 3.05, 0);
  g.add(antenna);

  const node = register('client', g, [antenna, glowBar], []);
  return { ...node, screen, screenMesh };
}

/** DNS 解析器：发光球 + 半透明经纬外壳 + 内核心 + 环 */
function buildDns(): NetworkNode {
  const g = new THREE.Group();
  const sphere = glowPart(new THREE.SphereGeometry(0.52, 32, 32), 0x4cc9f0, 0.7);
  sphere.position.y = 1.05;
  g.add(sphere);
  const core = glowPart(new THREE.IcosahedronGeometry(0.28, 0), 0x9be8ff, 1.2);
  core.position.y = 1.05;
  g.add(core);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x4cc9f0, wireframe: true, transparent: true, opacity: 0.35 })
  );
  shell.position.y = 1.05;
  g.add(shell);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 12, 48), steel(0x35518f));
  ring.position.y = 1.05;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 2.1, 10), steel(0x3a4a72));
  pillar.position.y = 1.05;
  pillar.castShadow = true;
  g.add(pillar);
  return register('dns', g, [sphere, core], [core, shell]);
}

/** CDN 边缘节点：六棱柱 + 内嵌发光核心 */
function buildCdn(): NetworkNode {
  const g = new THREE.Group();
  const prism = glowPart(new THREE.CylinderGeometry(0.72, 0.72, 0.6, 6), 0x06d6a0, 0.75);
  prism.position.y = 1.05;
  prism.castShadow = true;
  g.add(prism);
  const core = glowPart(new THREE.CylinderGeometry(0.3, 0.3, 0.66, 6), 0xb2ffef, 1.2);
  core.position.y = 1.05;
  g.add(core);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 2.1, 10), steel(0x3a4a72));
  pillar.position.y = 1.05;
  pillar.castShadow = true;
  g.add(pillar);
  return register('cdn', g, [prism, core], [core]);
}

/** 负载均衡器：外八面体 + 内部反向旋转小八面体 */
function buildLb(): NetworkNode {
  const g = new THREE.Group();
  const octa = glowPart(new THREE.OctahedronGeometry(0.66, 0), 0xffb703, 0.75);
  octa.position.y = 1.05;
  g.add(octa);
  const inner = glowPart(new THREE.OctahedronGeometry(0.34, 0), 0xfff3c4, 1.2);
  inner.position.y = 1.05;
  g.add(inner);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 2.1, 10), steel(0x3a4a72));
  pillar.position.y = 1.05;
  pillar.castShadow = true;
  g.add(pillar);
  return register('lb', g, [octa, inner], [octa, inner]);
}

/** API 网关：双反向旋转环 + 核心 + 发光光柱 */
function buildApi(): NetworkNode {
  const g = new THREE.Group();
  const ring = glowPart(new THREE.TorusGeometry(1.05, 0.11, 20, 60), 0x9d4edd, 1.0);
  ring.position.y = 1.35;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  const ring2 = glowPart(new THREE.TorusGeometry(0.82, 0.06, 16, 48), 0xc77dff, 1.0);
  ring2.position.y = 1.35;
  ring2.rotation.x = Math.PI / 2;
  g.add(ring2);
  const core = glowPart(new THREE.IcosahedronGeometry(0.42, 1), 0x9d4edd, 1.3);
  core.position.y = 1.35;
  g.add(core);
  ring2.userData.spinSpeed = -1.4;
  core.userData.spinSpeed = 1.8;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.34, 2.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x9d4edd, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  beam.position.y = 1.35;
  g.add(beam);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.7, 12), steel(0x3a4a72));
  pillar.position.y = 1.35;
  pillar.castShadow = true;
  g.add(pillar);
  return register('api', g, [ring, ring2, core], [ring2, core]);
}

/** 后端：机柜 + 3 刀片 + 通风栅格 + 前面板负载屏 + LED */
function buildBackend(): NetworkNode {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.6, 1.3), steel(0x33476f));
  rack.position.y = 1.3;
  rack.castShadow = true;
  g.add(rack);

  // 前面板负载小屏
  const stat = makeTextTexture('', { width: 256, height: 128 });
  stat.tex.wrapS = THREE.RepeatWrapping;
  const statMat = new THREE.MeshBasicMaterial({ map: stat.tex });
  const statMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), statMat);
  statMesh.position.set(0, 1.9, 0.66);
  g.add(statMesh);

  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.1), steel(0x3d5380));
    b.position.set(0, 0.85 + i * 0.8, 0);
    b.castShadow = true;
    g.add(b);
    // 通风栅格
    for (let s = 0; s < 4; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.02), steel(0x22314f));
      slat.position.set(0, 0.85 + i * 0.8 + 0.18 - s * 0.12, 0.56);
      g.add(slat);
    }
    const led = glowPart(new THREE.SphereGeometry(0.06, 12, 12), 0x2ecc71, 0.9);
    led.position.set(0.62, 0.85 + i * 0.8, 0.56);
    g.add(led);
    leds.push(led);
  }
  const node = register('backend', g, leds, []);
  g.userData.statsScreen = stat;
  g.userData.statMesh = statMesh;
  return node;
}

/** 缓存（Redis 类）：外层立方体 + 内层发光核心 */
function buildCache(): NetworkNode {
  const g = new THREE.Group();
  const cube = glowPart(new THREE.BoxGeometry(0.66, 0.66, 0.66), 0xf72585, 0.7);
  cube.position.y = 1.05;
  cube.castShadow = true;
  g.add(cube);
  const inner = glowPart(new THREE.BoxGeometry(0.34, 0.34, 0.34), 0xffb3d9, 1.3);
  inner.position.y = 1.05;
  g.add(inner);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 2.1, 10), steel(0x3a4a72));
  pillar.position.y = 1.05;
  pillar.castShadow = true;
  g.add(pillar);
  return register('cache', g, [cube, inner], [inner]);
}

/** 数据库：多层圆盘堆叠（经典数据库造型） */
function buildDb(): NetworkNode {
  const g = new THREE.Group();
  const discs: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const d = glowPart(new THREE.CylinderGeometry(0.72, 0.72, 0.3, 28), 0x2ecc71, 0.6);
    d.position.y = 0.7 + i * 0.36;
    d.castShadow = true;
    g.add(d);
    discs.push(d);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.14, 28), steel(0x2a3a5e));
  top.position.y = 1.84;
  g.add(top);
  return register('db', g, discs, discs);
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
    ['client', '前端（浏览器）', [0, 3.9, 7.2]],
    ['dns', 'DNS 解析器', [-5.2, 2.6, 3.0]],
    ['cdn', 'CDN 边缘', [5.2, 2.6, 3.0]],
    ['lb', '负载均衡', [0, 2.6, 1.2]],
    ['api', 'API 网关', [0, 2.9, -2.2]],
    ['backend', '后端（服务器）', [0, 3.5, -5.5]],
    ['cache', '缓存', [-3.8, 2.5, -4.8]],
    ['db', '数据库', [3.8, 2.5, -4.8]]
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
