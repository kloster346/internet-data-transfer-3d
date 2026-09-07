import * as THREE from 'three';
import { clamp01, mapRange } from '../world/materials';
import { drawScreen, type Nodes, type ScreenTexture } from '../world/nodes';
import {
  LINK_BASE_OPACITY,
  LINK_BASE_EMISSIVE,
  LINK_ACTIVE_OPACITY,
  LINK_ACTIVE_EMISSIVE,
  type Link
} from '../world/links';
import { packetKey, updateTrail, resetTrail, type Packet } from '../world/packets';
import { ShockwavePool } from '../world/effects';
import type { NodeId, Scenario, ScreenState } from '../data/types';

/** 引擎依赖的最小 UI 接口（由 main.ts 用 hud + panels 门面实现） */
export interface EngineUi {
  setStep(i: number): void;
  setPlaying(p: boolean): void;
  setScenario(sc: Scenario): void;
}

export interface WorldRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  nodes: Nodes;
  links: Map<string, Link>;
  /** 数据包池（跨场景去重） */
  packets: Map<string, Packet>;
  jsonDoc: THREE.Group;
  scenario: Scenario;
}

export interface Engine {
  frame(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  setSpeed(v: number): void;
  currentStep(): number;
  stepCount(): number;
  getTotalDuration(): number;
  getCurrentTime(): number;
  getStepAtTime(time: number): number;
  setScenario(scenario: Scenario): void;
  scrub(time: number): void;
}

function nodeColor(nodeId: NodeId, nodes: Nodes): number {
  const n = nodes.list.get(nodeId);
  if (n && n.glowMeshes[0]) return (n.glowMeshes[0].material as THREE.MeshStandardMaterial).color.getHex();
  return 0x4cc9f0;
}

/** 绘制后端前面板负载屏 */
function drawStats(screen: ScreenTexture, now: number): void {
  const { ctx, canvas, tex } = screen;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#0c1631';
  ctx.fillRect(0, 0, w, h);
  const load = 40 + (Math.sin(now * 1.5) + 1) * 22;
  ctx.fillStyle = '#4cc9f0';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('CPU', 14, 32);
  ctx.fillStyle = '#9ce8b0';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(Math.round(load) + '%', 66, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(14, 54, w - 28, 14);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(14, 54, (w - 28) * load / 100, 14);
  tex.needsUpdate = true;
}

export function createEngine(refs: WorldRefs, ui: EngineUi): Engine {
  const { camera, nodes, links, packets, jsonDoc } = refs;
  let scenario = refs.scenario;
  let steps = scenario.steps;
  const shockwaves = new ShockwavePool(refs.scene);
  const bounceMap = new Map<NodeId, number>();

  let offsets: number[] = [];
  let total = 0;
  let firstSend = -1;

  function recompute(): void {
    offsets = [];
    total = 0;
    for (const st of steps) {
      offsets.push(total);
      total += st.duration;
    }
    firstSend = steps.findIndex((s) => s.packets.some((p) => p.spec.kind === 'http-request'));
  }
  recompute();

  const clock = new THREE.Clock();
  let simTime = 0;
  let playing = true;
  let speed = 1;
  let manualStep = -1;
  let lastStep = -1;
  let prevActivate = new Set<NodeId>();

  function locate(time: number): { index: number; progress: number } {
    const t = ((time % total) + total) % total;
    for (let i = 0; i < steps.length; i++) {
      if (t < offsets[i] + steps[i].duration) return { index: i, progress: (t - offsets[i]) / steps[i].duration };
    }
    return { index: steps.length - 1, progress: 1 };
  }

  function stepMid(index: number): number {
    return offsets[index] + steps[index].duration / 2;
  }

  function currentStep(): number {
    return manualStep >= 0 ? manualStep : locate(simTime).index;
  }

  function updateScene(time: number, now: number, dt: number): void {
    const { index, progress } = locate(time);
    const step = steps[index];

    // 数据包：显示 + 定位 + 彗尾
    for (const p of packets.values()) p.group.visible = false;
    for (const sp of step.packets) {
      const pkt = packets.get(packetKey(sp.spec));
      const link = links.get(sp.spec.link);
      if (!pkt || !link) continue;
      const within = progress >= sp.t0 - 1e-4 && progress <= sp.t1 + 1e-4;
      pkt.group.visible = within;
      if (within) {
        const u = sp.reverse
          ? mapRange(progress, sp.t0, sp.t1, 1, 0)
          : mapRange(progress, sp.t0, sp.t1, 0, 1);
        pkt.group.position.copy(link.curve.getPointAt(clamp01(u)));
        pkt.mesh.rotation.y += dt * 3;
        const pulse = 1 + Math.sin(now * 6) * 0.18;
        pkt.mesh.scale.setScalar(pulse);
        pkt.trail.scale.setScalar(1 + (sp.reverse ? clamp01(u) : 1 - clamp01(u)) * 0.6);
        updateTrail(pkt, pkt.group.position);
      }
    }
    for (const p of packets.values()) if (!p.group.visible) resetTrail(p);

    // 节点：发光脉冲 + 待机旋转 + 弹跳
    for (const node of nodes.list.values()) {
      const active = step.activate.includes(node.id);
      for (const gm of node.glowMeshes) {
        const base = (gm.userData.baseGlow as number) ?? 1;
        const mat = gm.material as THREE.MeshStandardMaterial;
        if (active) {
          const p = 0.5 + 0.5 * Math.sin(now * 8);
          mat.emissiveIntensity = base * (1 + p * 0.8);
        } else {
          mat.emissiveIntensity = base;
        }
      }
      for (const sp of node.spinners) sp.rotation.y += dt * ((sp.userData.spinSpeed as number) ?? 1.2);

      let b = bounceMap.get(node.id) ?? 0;
      if (b > 0) {
        b = Math.max(0, b - dt * 2.8);
        bounceMap.set(node.id, b);
        node.group.scale.setScalar(1 + Math.sin(b * Math.PI) * 0.12);
      } else {
        node.group.scale.setScalar(1);
      }
    }

    // 步骤切换：新激活节点冲击波 + 弹跳
    if (index !== lastStep) {
      for (const id of step.activate) {
        if (!prevActivate.has(id)) {
          const np = nodes.list.get(id);
          if (np) {
            shockwaves.emit(np.group.position, nodeColor(id, nodes));
            bounceMap.set(id, 1);
          }
        }
      }
      lastStep = index;
      prevActivate = new Set(step.activate);
      ui.setStep(index);
    }
    shockwaves.update(dt);

    // 前端屏幕
    const screenState: ScreenState =
      index === steps.length - 1 ? 'rendered' : firstSend >= 0 && index >= firstSend ? 'sending' : 'idle';
    drawScreen(nodes.client, screenState);

    // 后端负载屏
    const backend = nodes.list.get('backend');
    const stats = backend?.group.userData.statsScreen as ScreenTexture | undefined;
    if (stats) drawStats(stats, now);

    // JSON 文档
    jsonDoc.visible = step.ui?.json === 'json';
    if (jsonDoc.visible) {
      const bp = nodes.list.get('backend')!.group.position;
      jsonDoc.position.set(bp.x, bp.y + 3.4, bp.z);
      jsonDoc.lookAt(camera.position);
      jsonDoc.scale.setScalar(index === steps.findIndex((s) => s.ui?.json === 'json') ? mapRange(progress, 0, 1, 0.3, 1) : 1);
    }

    // 链路点亮：数据包在链路上飞行时提高 glow，其余保持极淡
    const activeLinks = new Set<string>();
    for (const sp of step.packets) {
      const within = progress >= sp.t0 - 1e-4 && progress <= sp.t1 + 1e-4;
      if (within) activeLinks.add(sp.spec.link);
    }
    for (const link of links.values()) {
      const target = activeLinks.has(link.id) ? 1 : 0;
      link.glow += (target - link.glow) * (1 - Math.exp(-dt * 6));
      link.mat.opacity = LINK_BASE_OPACITY + (LINK_ACTIVE_OPACITY - LINK_BASE_OPACITY) * link.glow;
      link.mat.emissiveIntensity = LINK_BASE_EMISSIVE + (LINK_ACTIVE_EMISSIVE - LINK_BASE_EMISSIVE) * link.glow;
    }
  }

  function frame(): void {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (playing) simTime += dt * speed;
    updateScene(manualStep >= 0 ? stepMid(manualStep) : simTime, performance.now() / 1000, dt);
  }

  return {
    frame,
    toggle() {
      playing = !playing;
      manualStep = -1;
      ui.setPlaying(playing);
    },
    next() {
      const cur = currentStep();
      manualStep = Math.min(steps.length - 1, cur + 1);
      ui.setStep(manualStep);
    },
    prev() {
      const cur = currentStep();
      manualStep = Math.max(0, cur - 1);
      ui.setStep(manualStep);
    },
    setSpeed(v) {
      speed = v;
    },
    currentStep,
    stepCount: () => steps.length,
    getTotalDuration: () => total,
    getCurrentTime: () => (manualStep >= 0 ? stepMid(manualStep) : simTime % total),
    getStepAtTime: (time) => locate(time).index,
    setScenario(next) {
      scenario = next;
      steps = next.steps;
      recompute();
      simTime = 0;
      manualStep = -1;
      lastStep = -1;
      prevActivate = new Set();
      bounceMap.clear();
      ui.setScenario(next);
    },
    scrub(time) {
      manualStep = -1;
      simTime = ((time % total) + total) % total;
    }
  };
}
