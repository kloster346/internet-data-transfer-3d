import * as THREE from 'three';
import { clamp01, mapRange } from '../world/materials';
import { drawScreen, type FrontendNode, type BackendNode, type ApiNode } from '../world/nodes';
import type { DataPath } from '../world/links';
import type { Packet } from '../world/packets';
import { CYCLE_DURATION, STEPS, WINDOWS, stepAt } from '../data/scenarios';
import type { Hud } from '../ui/hud';

export interface WorldRefs {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  frontend: FrontendNode;
  backend: BackendNode;
  api: ApiNode;
  path: DataPath;
  requestPacket: Packet;
  responsePacket: Packet;
  jsonDoc: THREE.Group;
}

export interface Engine {
  frame(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  setSpeed(v: number): void;
  currentStep(): number;
}

/**
 * 时间线引擎：持有模拟时间与播放状态，每帧把归一化时间 t 映射为
 * 数据包沿路径的位置、节点激活脉冲、前端屏幕状态与 HUD 步骤。
 * 阶段 2 会把它泛化为数据驱动的 Scenario/Step 模型。
 */
export function createEngine(refs: WorldRefs, hud: Hud): Engine {
  const { camera, frontend, backend, api, path, requestPacket, responsePacket, jsonDoc } = refs;
  const clock = new THREE.Clock();
  let simTime = 0;
  let playing = true;
  let speed = 1;
  let manualStep = -1;
  let lastStep = -1;

  function currentStep(): number {
    return manualStep >= 0 ? manualStep : stepAt((simTime % CYCLE_DURATION) / CYCLE_DURATION);
  }

  function updateScene(t: number, now: number): void {
    const step = stepAt(t);

    // 请求包位置（前端 → API → 后端）
    const reqPos = (() => {
      if (t < 0.08) return { visible: false, u: 0 };
      if (t < 0.26) return { visible: true, u: mapRange(t, 0.08, 0.26, 0, 0.5) };
      if (t < 0.36) return { visible: true, u: 0.5 };
      if (t < 0.54) return { visible: true, u: mapRange(t, 0.36, 0.54, 0.5, 1.0) };
      return { visible: false, u: 1.0 };
    })();

    // 响应包位置（后端 → API → 前端）
    const resPos = (() => {
      if (t < 0.62) return { visible: false, u: 1.0 };
      if (t < 0.88) return { visible: true, u: mapRange(t, 0.62, 0.88, 1.0, 0.0) };
      return { visible: false, u: 0.0 };
    })();

    const p = path.curve.getPointAt(clamp01(reqPos.u));
    requestPacket.group.position.copy(p);
    requestPacket.group.visible = reqPos.visible;
    requestPacket.mesh.rotation.y += 0.04;
    requestPacket.mesh.rotation.x += 0.02;
    const pulse = 1 + Math.sin(now * 6) * 0.18;
    requestPacket.mesh.scale.setScalar(pulse);
    requestPacket.trail.scale.setScalar(1 + (1 - clamp01(reqPos.u)) * 0.6);

    const q = path.curve.getPointAt(clamp01(resPos.u));
    responsePacket.group.position.copy(q);
    responsePacket.group.visible = resPos.visible;
    responsePacket.mesh.rotation.y -= 0.04;
    const pulse2 = 1 + Math.sin(now * 7) * 0.18;
    responsePacket.mesh.scale.setScalar(pulse2);
    responsePacket.trail.scale.setScalar(1 + clamp01(resPos.u) * 0.6);

    (frontend.screenMesh.material as THREE.MeshBasicMaterial).color.setRGB(1, 1, 1);
    const screenState = step >= 6 ? 'rendered' : step >= 1 && step <= 3 ? 'sending' : 'idle';
    drawScreen(frontend, screenState);

    api.ring.rotation.z += 0.008;
    api.core.rotation.y += 0.02;
    const apiPulse = step === 2 ? 1 + Math.sin(now * 8) * 0.5 : 0;
    api.core.scale.setScalar(1 + apiPulse * 0.4);
    api.ring.scale.setScalar(1 + apiPulse * 0.25);

    backend.blades.forEach((b, i) => {
      const led = b.userData.led as THREE.Mesh;
      const on = (step === 3 || step === 4) && Math.sin(now * 10 + i) > -0.3;
      const mat = led.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = on ? 2.2 : 0.2;
      mat.color.setHex(on ? 0x2ecc71 : 0x1c2740);
    });

    jsonDoc.visible = step === 4 || step === 5 || step === 6;
    if (jsonDoc.visible) {
      const base = path.curve.getPointAt(clamp01(resPos.u > 0.01 ? resPos.u : 1.0));
      jsonDoc.position.copy(base).add(new THREE.Vector3(0, 1.5, 0));
      jsonDoc.lookAt(camera.position);
      const scale = step === 4 ? mapRange(t, 0.54, 0.62, 0.3, 1) : 1;
      jsonDoc.scale.setScalar(scale);
    }

    const posArr = (path.flowGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < path.flowPts; i++) {
      const u = (i / path.flowPts + now * 0.05) % 1;
      const pp = path.curve.getPointAt(u);
      posArr[i * 3] = pp.x;
      posArr[i * 3 + 1] = pp.y;
      posArr[i * 3 + 2] = pp.z;
    }
    (path.flowGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    if (step !== lastStep) {
      lastStep = step;
      hud.setStep(step);
    }
  }

  function frame(): void {
    // 夹紧 dt，避免后台标签页 rAF 被节流后切回时时间跳变
    const dt = Math.min(clock.getDelta(), 0.1);
    if (playing) simTime += dt * speed;
    const t =
      manualStep >= 0
        ? (WINDOWS[manualStep][0] + WINDOWS[manualStep][1]) / 2
        : (simTime % CYCLE_DURATION) / CYCLE_DURATION;
    updateScene(t, performance.now() / 1000);
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
      manualStep = Math.min(STEPS.length - 1, cur + 1);
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
    currentStep
  };
}
