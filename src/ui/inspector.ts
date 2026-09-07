import * as THREE from 'three';
import type { Nodes } from '../world/nodes';
import type { NodeId } from '../data/types';

/** 节点静态信息（点击详情） */
export const NODE_INFO: Record<NodeId, { label: string; role: string; address: string; desc: string }> = {
  client: { label: '前端（浏览器）', role: '客户端', address: '用户设备', desc: '发起 HTTP 请求，解析并渲染 JSON 响应' },
  dns: { label: 'DNS 解析器', role: '域名解析', address: '8.8.8.8', desc: '把域名解析成 IP 地址' },
  cdn: { label: 'CDN 边缘', role: '内容分发', address: '边缘节点', desc: '缓存静态资源，就近加速访问' },
  lb: { label: '负载均衡器', role: '流量分发', address: '10.0.0.1', desc: '把请求分发给多台后端，限流' },
  api: { label: 'API 网关', role: '接口网关', address: '10.0.0.2', desc: '路由、鉴权、协议转换' },
  backend: { label: '后端（服务器）', role: '业务服务', address: '10.0.0.3', desc: '处理业务逻辑，读写缓存与数据库' },
  cache: { label: '缓存', role: '内存缓存', address: '10.0.0.4', desc: '加速热点数据读取（Redis）' },
  db: { label: '数据库', role: '持久化存储', address: '10.0.0.5', desc: '存储用户数据（SQL）' }
};

export interface Inspector {
  dispose(): void;
}

/** 节点点击详情：Raycaster 拾取 → 弹出信息面板 */
export function createInspector(camera: THREE.PerspectiveCamera, nodes: Nodes, domElement: HTMLElement): Inspector {
  const panel = document.createElement('div');
  panel.id = 'inspector';
  panel.style.display = 'none';
  document.body.appendChild(panel);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function findNodeRoot(obj: THREE.Object3D): NodeId | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      for (const n of nodes.list.values()) {
        if (n.group === cur) return n.id;
      }
      cur = cur.parent;
    }
    return null;
  }

  function onClick(e: MouseEvent): void {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(Array.from(nodes.list.values(), (n) => n.group), true);
    if (hits.length) {
      const id = findNodeRoot(hits[0].object);
      if (id) {
        const info = NODE_INFO[id];
        panel.innerHTML =
          '<div class="ins-title">' + info.label + '</div>' +
          '<div class="ins-row"><b>角色</b>' + info.role + '</div>' +
          '<div class="ins-row"><b>地址</b>' + info.address + '</div>' +
          '<div class="ins-desc">' + info.desc + '</div>';
        panel.style.display = 'block';
        panel.style.left = clamp(e.clientX + 14, 8, window.innerWidth - 220) + 'px';
        panel.style.top = clamp(e.clientY + 14, 8, window.innerHeight - 140) + 'px';
        return;
      }
    }
    panel.style.display = 'none';
  }

  domElement.addEventListener('click', onClick);

  return {
    dispose() {
      domElement.removeEventListener('click', onClick);
      panel.remove();
    }
  };
}

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v));
}
