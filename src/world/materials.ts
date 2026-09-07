import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export interface TextTexture {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
}

/** 创建一个画布纹理（用于屏幕 / JSON 文档等 2D 内容贴到 3D 面片上） */
export function makeTextTexture(_text: string, opts: { width?: number; height?: number } = {}): TextTexture {
  const c = document.createElement('canvas');
  const w = opts.width ?? 512;
  const h = opts.height ?? 256;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { canvas: c, ctx, tex: new THREE.CanvasTexture(c) };
}

/** 3D 空间里的 CSS2D 文字标签 */
export function label(text: string, cls = ''): CSS2DObject {
  const el = document.createElement('div');
  el.className = 'label3d ' + cls;
  el.textContent = text;
  return new CSS2DObject(el);
}

/** 自发光材质（用于 LED / 网关核心 / 数据包等发光件） */
export function glow(color: number, intensity = 1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.2
  });
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 把 t∈[t0,t1] 线性映射到 [y0,y1]，越界时钳制 */
export function mapRange(t: number, t0: number, t1: number, y0: number, y1: number): number {
  return y0 + (y1 - y0) * clamp01((t - t0) / (t1 - t0));
}
