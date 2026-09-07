import * as THREE from 'three';

export interface DataPath {
  curve: THREE.CatmullRomCurve3;
  tube: THREE.Mesh;
  flowGeo: THREE.BufferGeometry;
  flowPts: number;
}

/**
 * 互联网"数据高速公路"：一条拱形曲线管道，上面有流动粒子表示数据在传输。
 * 请求包与响应包都沿这条曲线往返。
 */
export function buildDataPath(scene: THREE.Scene): DataPath {
  const pathCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-7, 1.75, 0),
      new THREE.Vector3(-3.5, 2.9, 0),
      new THREE.Vector3(0, 3.05, 0),
      new THREE.Vector3(3.5, 2.9, 0),
      new THREE.Vector3(7, 1.75, 0)
    ],
    false,
    'catmullrom',
    0.5
  );

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(pathCurve, 200, 0.1, 12, false),
    new THREE.MeshStandardMaterial({
      color: 0x2c3d6b,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x0d1a3a,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.95
    })
  );
  scene.add(tube);

  const flowPts = 160;
  const flowPos = new Float32Array(flowPts * 3);
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  const flow = new THREE.Points(
    flowGeo,
    new THREE.PointsMaterial({
      color: 0x4cc9f0,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
  );
  scene.add(flow);

  return { curve: pathCurve, tube, flowGeo, flowPts };
}
