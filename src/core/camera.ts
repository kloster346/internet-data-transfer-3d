import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 7.8, 17.8);
  camera.lookAt(0, 1.4, 0);
  return camera;
}

export interface CameraRig {
  controls: OrbitControls;
  reset(): void;
  /** 一次性开场运镜（页面可见时播放；用户拖动即中断接管） */
  startIntro(): void;
  update(dt: number): void;
}

const INTRO_DURATION = 2.4;
const INTRO_START = new THREE.Vector3(15, 19, 27);
const INTRO_TARGET = new THREE.Vector3(0, 4, 0);
const INTRO_END = new THREE.Vector3(0, 7.8, 17.8);
const FINAL_TARGET = new THREE.Vector3(0, 1.4, 0);

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createCameraRig(camera: THREE.PerspectiveCamera, domElement: HTMLElement): CameraRig {
  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 1.6, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 40;
  controls.maxPolarAngle = Math.PI * 0.55;
  controls.update();

  let introActive = false;
  let introT = 0;

  controls.addEventListener('start', () => {
    introActive = false; // 用户拖动即接管相机
  });

  return {
    controls,
    reset() {
      introActive = false;
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
    },
    update(dt) {
      if (introActive) {
        introT = Math.min(1, introT + dt / INTRO_DURATION);
        const e = easeOutCubic(introT);
        camera.position.lerpVectors(INTRO_START, INTRO_END, e);
        controls.target.lerpVectors(INTRO_TARGET, FINAL_TARGET, e);
        if (introT >= 1) introActive = false;
        controls.update();
        return;
      }
      controls.update();
    }
  };
}
