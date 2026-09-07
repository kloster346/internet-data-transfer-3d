import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface Renderers {
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  composer: EffectComposer;
  /** 开/关后期特效（Bloom，供低端设备关闭） */
  setEffects(on: boolean): void;
  /** 依据当前特效开关渲染场景 */
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  setSize(w: number, h: number): void;
}

/**
 * 创建 WebGL 渲染器 + CSS2D 标签渲染器 + 后处理链（Bloom），
 * 并应用 RoomEnvironment 环境贴图（PBR 材质真实反射）。
 */
export function createRenderers(
  container: HTMLElement,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): Renderers {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // 环境贴图：RoomEnvironment → PMREM，赋予场景全局反射
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
  pmrem.dispose();

  // 后处理链：RenderPass → UnrealBloomPass → OutputPass
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.1, // strength
    0.4, // radius
    0.6  // threshold
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  let effects = true;

  return {
    renderer,
    labelRenderer,
    composer,
    setEffects(on) {
      effects = on;
      bloom.enabled = on;
    },
    render(scene, camera) {
      if (effects) composer.render();
      else renderer.render(scene, camera);
    },
    setSize(w, h) {
      renderer.setSize(w, h);
      composer.setSize(w, h);
      labelRenderer.setSize(w, h);
    }
  };
}
