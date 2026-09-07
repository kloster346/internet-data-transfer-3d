import * as THREE from 'three';
import './style.css';
import { createRenderers } from './core/renderer';
import { createCamera, createCameraRig } from './core/camera';
import { setupEnvironment } from './world/scene';
import { buildAllNodes, addNodeLabels } from './world/nodes';
import { buildBackdrop } from './world/backdrop';
import { buildLinks } from './world/links';
import { buildPacket, buildJsonDoc, packetKey, type Packet } from './world/packets';
import { createEngine } from './core/engine';
import { createHud } from './ui/hud';
import { createPanels } from './ui/panels';
import { createTimeline } from './ui/timeline';
import { createInspector } from './ui/inspector';
import { SCENARIO, SCENARIOS, getScenario } from './data/scenarios';
import type { Scenario } from './data/types';

const container = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b16);
scene.fog = new THREE.Fog(0x070b16, 26, 70);

const camera = createCamera();
const renderers = createRenderers(container, scene, camera);
const cameraRig = createCameraRig(camera, renderers.renderer.domElement);

setupEnvironment(scene);
buildBackdrop(scene);

// 构建 8 节点拓扑 + 链路 + 数据包池（跨场景去重）+ JSON 文档
const nodes = buildAllNodes();
for (const n of nodes.list.values()) scene.add(n.group);
addNodeLabels(scene);

const links = buildLinks(scene);

const packets = new Map<string, Packet>();
for (const sc of SCENARIOS) {
  for (const step of sc.steps) {
    for (const sp of step.packets) {
      const key = packetKey(sp.spec);
      if (!packets.has(key)) {
        const pkt = buildPacket(sp.spec);
        scene.add(pkt.group);
        packets.set(key, pkt);
      }
    }
  }
}

const jsonDoc = buildJsonDoc();
scene.add(jsonDoc.group);

// UI 门面：引擎只依赖最小接口，门面同时驱动 HUD 与右侧面板
const hud = createHud();
const panels = createPanels();
const ui = {
  setStep: (i: number): void => {
    hud.setStep(i);
    panels.setStep(i);
  },
  setPlaying: (p: boolean): void => hud.setPlaying(p),
  setScenario: (sc: Scenario): void => {
    hud.setScenario(sc);
    panels.setScenario(sc);
  }
};

const engine = createEngine(
  { scene, camera, nodes, links, packets, jsonDoc: jsonDoc.group, scenario: SCENARIO },
  ui
);

hud.bind({
  toggle: () => engine.toggle(),
  next: () => engine.next(),
  prev: () => engine.prev(),
  reset: () => cameraRig.reset(),
  setSpeed: (v) => engine.setSpeed(v)
});
panels.onApplyPayload(() => jsonDoc.redraw());

// 场景切换
const scenarioSel = document.getElementById('scenario') as HTMLSelectElement;
for (const sc of SCENARIOS) {
  const opt = document.createElement('option');
  opt.value = sc.id;
  opt.textContent = sc.name;
  scenarioSel.appendChild(opt);
}
scenarioSel.value = SCENARIO.id;
scenarioSel.addEventListener('change', () => switchScenario(scenarioSel.value));

// 时间轴
const timeline = createTimeline();
timeline.setScenario(SCENARIO);
timeline.onScrub((t) => engine.scrub(t));

// 节点点击详情
createInspector(camera, nodes, renderers.renderer.domElement);

function switchScenario(id: string): void {
  const sc = getScenario(id);
  engine.setScenario(sc);
  timeline.setScenario(sc);
}

// 后期特效开关
const btnFx = document.getElementById('btnFx') as HTMLButtonElement;
let fxOn = true;
btnFx.addEventListener('click', () => {
  fxOn = !fxOn;
  renderers.setEffects(fxOn);
  btnFx.textContent = fxOn ? '✨ 特效：开' : '✨ 特效：关';
  btnFx.classList.toggle('primary', fxOn);
});

ui.setStep(0);
cameraRig.startIntro();

let lastNow = performance.now() / 1000;
function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  const dt = Math.min(0.1, now - lastNow);
  lastNow = now;
  engine.frame();
  timeline.update(engine.getCurrentTime(), engine.currentStep());
  cameraRig.update(dt);
  renderers.render(scene, camera);
  renderers.labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderers.setSize(window.innerWidth, window.innerHeight);
});
