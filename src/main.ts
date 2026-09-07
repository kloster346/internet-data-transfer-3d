import * as THREE from 'three';
import './style.css';
import { createRenderers } from './core/renderer';
import { createCamera, createCameraRig } from './core/camera';
import { setupEnvironment } from './world/scene';
import { buildAllNodes, addNodeLabels } from './world/nodes';
import { buildLinks } from './world/links';
import { buildPacket, buildJsonDoc, type Packet } from './world/packets';
import { createEngine } from './core/engine';
import { createHud } from './ui/hud';
import { SCENARIO } from './data/scenarios';

const container = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b16);
scene.fog = new THREE.Fog(0x070b16, 26, 70);

const camera = createCamera();
const renderers = createRenderers(container, scene, camera);
const cameraRig = createCameraRig(camera, renderers.renderer.domElement);
const { controls } = cameraRig;

setupEnvironment(scene);

// 构建 8 节点拓扑 + 链路 + 数据包池 + JSON 文档
const nodes = buildAllNodes();
for (const n of nodes.list.values()) scene.add(n.group);
addNodeLabels(scene);

const links = buildLinks(scene);

const packets = new Map<string, Packet>();
for (const step of SCENARIO.steps) {
  for (const sp of step.packets) {
    const key = sp.spec.kind + ':' + sp.spec.link;
    if (!packets.has(key)) {
      const pkt = buildPacket(sp.spec);
      scene.add(pkt.group);
      packets.set(key, pkt);
    }
  }
}

const jsonDoc = buildJsonDoc();
scene.add(jsonDoc);

// 装配 HUD 与引擎
const hud = createHud();
const engine = createEngine(
  { scene, camera, nodes, links, packets, jsonDoc, scenario: SCENARIO },
  hud
);
hud.bind({
  toggle: () => engine.toggle(),
  next: () => engine.next(),
  prev: () => engine.prev(),
  reset: () => cameraRig.reset(),
  setSpeed: (v) => engine.setSpeed(v)
});

hud.setStep(0);

// 后期特效开关（低端设备可关闭 Bloom）
const btnFx = document.getElementById('btnFx') as HTMLButtonElement;
let fxOn = true;
btnFx.addEventListener('click', () => {
  fxOn = !fxOn;
  renderers.setEffects(fxOn);
  btnFx.textContent = fxOn ? '✨ 特效：开' : '✨ 特效：关';
  btnFx.classList.toggle('primary', fxOn);
});

function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  engine.frame();
  cameraRig.update(now);
  controls.update();
  renderers.render(scene, camera);
  renderers.labelRenderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderers.setSize(window.innerWidth, window.innerHeight);
});
