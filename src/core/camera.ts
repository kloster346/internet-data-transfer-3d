import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** 创建默认透视相机（俯视场景中心） */
export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 6.6, 16.2);
  camera.lookAt(0, 1.2, 0);
  return camera;
}

export interface CameraRig {
  controls: OrbitControls;
  reset(): void;
  /** 每帧调用：在用户空闲若干秒后开启自动旋转，手动拖动即接管 */
  update(now: number): void;
}

const IDLE_SECONDS = 4;

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
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    lastInteract = performance.now() / 1000;
  });

  return {
    controls,
    reset() {
      controls.autoRotate = false;
      lastInteract = performance.now() / 1000;
      camera.position.set(0, 6.6, 16.2);
      controls.target.set(0, 1.4, 0);
      controls.update();
    },
    update(now) {
      if (!controls.autoRotate && now - lastInteract > IDLE_SECONDS) {
        controls.autoRotate = true;
      }
    }
  };
}
