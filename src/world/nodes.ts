import * as THREE from 'three';
import { makeTextTexture, label, glow } from './materials';
import { USER_JSON } from '../data/scenarios';
import type { ScreenState } from '../data/types';

/** 三个节点的世界坐标（也作为数据路径端点的参照） */
export const FRONT = new THREE.Vector3(-7, 0, 0);
export const API = new THREE.Vector3(0, 0, 0);
export const BACK = new THREE.Vector3(7, 0, 0);

export interface ScreenTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
}

export interface FrontendNode {
  group: THREE.Group;
  screen: ScreenTexture;
  screenMesh: THREE.Mesh;
}

export interface BackendNode {
  group: THREE.Group;
  blades: THREE.Mesh[];
}

export interface ApiNode {
  group: THREE.Group;
  ring: THREE.Mesh;
  core: THREE.Mesh;
}

/** 前端（浏览器）：底座 + 显示器 + 可绘制屏幕 */
export function buildFrontend(): FrontendNode {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a4a72, roughness: 0.5, metalness: 0.3 })
  );
  stand.position.y = 0.45;
  stand.castShadow = true;
  g.add(stand);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.7, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x2c3e6b, roughness: 0.5, metalness: 0.2 })
  );
  body.position.y = 1.85;
  body.castShadow = true;
  g.add(body);

  const screen = makeTextTexture('', { width: 512, height: 320 });
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.tex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.5), screenMat);
  screenMesh.position.set(0, 1.85, 0.13);
  g.add(screenMesh);

  g.position.copy(FRONT);
  return { group: g, screen, screenMesh };
}

/** 后端（服务器机架）：机柜 + 3 个刀片 + 指示灯 */
export function buildBackend(): BackendNode {
  const g = new THREE.Group();
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2.6, 1.3),
    new THREE.MeshStandardMaterial({ color: 0x2a3a5e, roughness: 0.5, metalness: 0.2 })
  );
  rack.position.y = 1.3;
  rack.castShadow = true;
  g.add(rack);

  const blades: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.6, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x33476e, roughness: 0.5, metalness: 0.25 })
    );
    b.position.set(0, 0.85 + i * 0.8, 0);
    b.castShadow = true;
    g.add(b);
    blades.push(b);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), glow(0x2ecc71, 1.4));
    led.position.set(0.62, 0.85 + i * 0.8, 0.56);
    g.add(led);
    b.userData.led = led;
  }
  g.position.copy(BACK);
  return { group: g, blades };
}

/** API 网关（中枢）：发光环 + 二十面体核心 + 支柱 */
export function buildApi(): ApiNode {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 20, 60), glow(0x9d4edd, 1.4));
  ring.position.y = 1.35;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), glow(0x9d4edd, 1.1));
  core.position.y = 1.35;
  g.add(core);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.3, 2.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a4a72, roughness: 0.5, metalness: 0.3 })
  );
  pillar.position.y = 1.35;
  pillar.castShadow = true;
  g.add(pillar);

  g.position.copy(API);
  return { group: g, ring, core };
}

/** 给前端 + 后端 + API 添加 CSS2D 文字标签 */
export function addNodeLabels(scene: THREE.Scene): void {
  const frontLabel = label('前端（浏览器）');
  frontLabel.position.set(-7, 3.2, 0);
  scene.add(frontLabel);

  const backLabel = label('后端（服务器）');
  backLabel.position.set(7, 3.4, 0);
  scene.add(backLabel);

  const apiLabel = label('API 网关', 'small');
  apiLabel.position.set(0, 2.5, 0);
  scene.add(apiLabel);

  const routeLabel = label('GET /api/users/42', 'small');
  routeLabel.position.set(0, 0.9, 0);
  scene.add(routeLabel);
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

/** 绘制前端屏幕内容（idle / sending / rendered 三种状态） */
export function drawScreen(frontend: FrontendNode, state: ScreenState): void {
  const { ctx, canvas, tex } = frontend.screen;
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
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = ((performance.now() / 300) + i / n) % 1;
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
