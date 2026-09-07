import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export interface Renderers {
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
}

/** 创建 WebGL 渲染器与 CSS2D 标签渲染器，并挂载到容器 */
export function createRenderers(container: HTMLElement): Renderers {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  return { renderer, labelRenderer };
}

/** 视口尺寸变化时同步更新渲染器与相机 */
export function resize(renderers: Renderers, camera: THREE.PerspectiveCamera): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderers.renderer.setSize(window.innerWidth, window.innerHeight);
  renderers.labelRenderer.setSize(window.innerWidth, window.innerHeight);
}
