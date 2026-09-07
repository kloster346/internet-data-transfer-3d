import * as THREE from 'three';
import './style.css';
import { createRenderers } from './core/renderer';
import { createCamera, createCameraRig } from './core/camera';
import { setupEnvironment } from './world/scene';
import { buildFrontend, buildBackend, buildApi, addNodeLabels } from './world/nodes';
import { buildDataPath } from './world/links';
import { buildPacket, buildJsonDoc } from './world/packets';
import { createEngine } from './core/engine';
import { createHud } from './ui/hud';

const container = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b16);
scene.fog = new THREE.Fog(0x070b16, 26, 70);

const camera = createCamera();
const renderers = createRenderers(container, scene, camera);
const cameraRig = createCameraRig(camera, renderers.renderer.domElement);
const { controls } = cameraRig;

setupEnvironment(scene);

// 构建世界：三个节点 + 标签 + 数据路径 + 数据包 + JSON 文档
const frontend = buildFrontend();
scene.add(frontend.group);
const backend = buildBackend();
scene.add(backend.group);
const api = buildApi();
scene.add(api.group);
addNodeLabels(scene);

const path = buildDataPath(scene);

const requestPacket = buildPacket(0x4cc9f0, '请求 Request', 'small');
scene.add(requestPacket.group);
const responsePacket = buildPacket(0x2ecc71, '响应 JSON', 'json-label');
scene.add(responsePacket.group);
const jsonDoc = buildJsonDoc();
scene.add(jsonDoc);

// 装配 HUD 与引擎
const hud = createHud();
const engine = createEngine(
  { scene, camera, frontend, backend, api, path, requestPacket, responsePacket, jsonDoc },
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
