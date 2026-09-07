import * as THREE from 'three';
import { clamp01, mapRange } from '../world/materials';
import { drawScreen, type Nodes } from '../world/nodes';
import type { Link } from '../world/links';
import type { Packet } from '../world/packets';
import type { Scenario, ScreenState } from '../data/types';
import type { Hud } from '../ui/hud';

export interface WorldRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  nodes: Nodes;
  links: Map<string, Link>;
  /** 数据包池，键为 `${kind}:${link}` */
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
}

/**
 * 数据驱动时间线引擎：持有模拟时间与播放状态，每帧定位当前步骤，
 * 把该步骤的数据包沿对应链路按 t0/t1 定位、脉冲激活节点、更新 HUD。
 */
export function createEngine(refs: WorldRefs, hud: Hud): Engine {
  const { camera, nodes, links, packets, jsonDoc, scenario } = refs;
  const steps = scenario.steps;

  // 累计时长与每步起始偏移
  const offsets: number[] = [];
  let total = 0;
  for (const st of steps) {
    offsets.push(total);
    total += st.duration;
  }

  // 「发送中」从第一个含 http-request 包的步骤开始，直到最后一步之前
  const firstSend = steps.findIndex((s) => s.packets.some((p) => p.spec.kind === 'http-request'));

  const clock = new THREE.Clock();
  let simTime = 0;
  let playing = true;
  let speed = 1;
  let manualStep = -1;
  let lastStep = -1;

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

  function updateScene(time: number, now: number): void {
    const { index, progress } = locate(time);
    const step = steps[index];

    // 隐藏所有数据包，再按当前步骤显示并定位
    for (const p of packets.values()) p.group.visible = false;
    for (const sp of step.packets) {
      const pkt = packets.get(sp.spec.kind + ':' + sp.spec.link);
      const link = links.get(sp.spec.link);
      if (!pkt || !link) continue;
      const within = progress >= sp.t0 - 1e-4 && progress <= sp.t1 + 1e-4;
      pkt.group.visible = within;
      if (within) {
        const u = sp.reverse
          ? mapRange(progress, sp.t0, sp.t1, 1, 0)
          : mapRange(progress, sp.t0, sp.t1, 0, 1);
        pkt.group.position.copy(link.curve.getPointAt(clamp01(u)));
        pkt.mesh.rotation.y += 0.05;
        const pulse = 1 + Math.sin(now * 6) * 0.18;
        pkt.mesh.scale.setScalar(pulse);
        pkt.trail.scale.setScalar(1 + (sp.reverse ? clamp01(u) : 1 - clamp01(u)) * 0.6);
      }
    }

    // 节点激活脉冲
    for (const node of nodes.list.values()) {
      const active = step.activate.includes(node.id);
      for (const gm of node.glowMeshes) {
        const base = (gm.userData.baseGlow as number) ?? 1;
        const mat = gm.material as THREE.MeshStandardMaterial;
        if (active) {
          const p = 0.5 + 0.5 * Math.sin(now * 8);
          mat.emissiveIntensity = base * (1 + p * 0.8);
          gm.scale.setScalar(1 + p * 0.1);
        } else {
          mat.emissiveIntensity = base;
          gm.scale.setScalar(1);
        }
      }
    }

    // 前端屏幕：最后一步=渲染完成；首个 HTTP 请求之后=发送中；其余=空闲
    const screenState: ScreenState =
      index === steps.length - 1
        ? 'rendered'
        : firstSend >= 0 && index >= firstSend
          ? 'sending'
          : 'idle';
    drawScreen(nodes.client, screenState);

    // JSON 文档（JSON 序列化 / 响应 / 渲染阶段悬浮在后端上方）
    jsonDoc.visible = step.ui?.json === 'json';
    if (jsonDoc.visible) {
      const bp = nodes.list.get('backend')!.group.position;
      jsonDoc.position.set(bp.x, bp.y + 3.4, bp.z);
      jsonDoc.lookAt(camera.position);
      jsonDoc.scale.setScalar(index === 11 ? mapRange(progress, 0, 1, 0.3, 1) : 1);
    }

    // 链路流动粒子
    for (const link of links.values()) {
      const arr = (link.flowGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < link.flowPts; i++) {
        const u = (i / link.flowPts + now * 0.04) % 1;
        const pp = link.curve.getPointAt(u);
        arr[i * 3] = pp.x;
        arr[i * 3 + 1] = pp.y;
        arr[i * 3 + 2] = pp.z;
      }
      (link.flowGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    if (index !== lastStep) {
      lastStep = index;
      hud.setStep(index);
    }
  }

  function frame(): void {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (playing) simTime += dt * speed;
    updateScene(manualStep >= 0 ? stepMid(manualStep) : simTime, performance.now() / 1000);
  }

  return {
    frame,
    toggle() {
      playing = !playing;
      manualStep = -1;
      hud.setPlaying(playing);
    },
    next() {
      const cur = currentStep();
      manualStep = Math.min(steps.length - 1, cur + 1);
      hud.setStep(manualStep);
    },
    prev() {
      const cur = currentStep();
      manualStep = Math.max(0, cur - 1);
      hud.setStep(manualStep);
    },
    setSpeed(v) {
      speed = v;
    },
    currentStep,
    stepCount: () => steps.length
  };
}
