import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  reset(): void;
}

/** 创建透视相机与 OrbitControls 轨道控制，并提供重置视角方法 */
export function createCameraRig(domElement: HTMLElement): CameraRig {
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 7.5, 19);
  camera.lookAt(0, 1.2, 0);

  const controls = new OrbitControls(camera, domElement);
  controls.target.set(0, 1.4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 34;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.update();

  return {
    camera,
    controls,
    reset() {
      camera.position.set(0, 7.5, 19);
      controls.target.set(0, 1.4, 0);
      controls.update();
    }
  };
}
