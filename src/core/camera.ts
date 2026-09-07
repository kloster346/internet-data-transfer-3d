import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6.6, 16.2);
  camera.lookAt(0, 1.2, 0);
  return camera;
}

export interface CameraRig {
  controls: OrbitControls;
  reset(): void;
  /** 开场运镜（仅页面可见时播放；隐藏环境跳过） */
  startIntro(): void;
  /** 平滑聚焦到某节点（步骤切换时聚焦激活节点） */
  focusOn(pos: THREE.Vector3): void;
  update(dt: number, now: number): void;
}

const IDLE_SECONDS = 4;
const INTRO_DURATION = 2.6;
const INTRO_START = new THREE.Vector3(17, 22, 30);
const INTRO_TARGET = new THREE.Vector3(0, 5, 0);
const INTRO_END = new THREE.Vector3(0, 6.6, 16.2);
const FINAL_TARGET = new THREE.Vector3(0, 1.4, 0);

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createCameraRig(camera: THREE.PerspectiveCamera, domElement: HTMLElement): CameraRig {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 1.4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 34;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotateSpeed = 0.6;
  controls.update();

  let lastInteract = performance.now() / 1000;
  let introActive = false;
  let introT = 0;
  let focusTarget: THREE.Vector3 | null = null;

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    lastInteract = performance.now() / 1000;
  });

  return {
    controls,
    reset() {
      introActive = false;
      focusTarget = null;
      controls.autoRotate = false;
      lastInteract = performance.now() / 1000;
      camera.position.copy(INTRO_END);
      controls.target.copy(FINAL_TARGET);
      controls.update();
    },
    startIntro() {
      if (document.visibilityState === 'hidden') return;
      camera.position.copy(INTRO_START);
      controls.target.copy(INTRO_TARGET);
      introActive = true;
      introT = 0;
      lastInteract = performance.now() / 1000;
      controls.autoRotate = false;
    },
    focusOn(pos) {
      // 向场景中心收敛：避免单节点聚焦导致画面过度偏移、右侧节点被裁
      focusTarget = new THREE.Vector3(pos.x * 0.5, pos.y + 1.0, pos.z * 0.5);
    },
    update(dt, now) {
      if (introActive) {
        introT = Math.min(1, introT + dt / INTRO_DURATION);
        const e = easeOutCubic(introT);
        camera.position.lerpVectors(INTRO_START, INTRO_END, e);
        controls.target.lerpVectors(INTRO_TARGET, FINAL_TARGET, e);
        if (introT >= 1) introActive = false;
        controls.update();
        return;
      }

      if (focusTarget) {
        controls.target.lerp(focusTarget, 1 - Math.exp(-dt * 1.6));
      }
      if (!controls.autoRotate && now - lastInteract > IDLE_SECONDS) {
        controls.autoRotate = true;
      }
      controls.update();
    }
  };
}
