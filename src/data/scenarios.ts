import type { Scenario } from './types';

/** 演示用的用户数据对象（后端序列化前的内存对象） */
export interface UserPayload {
  id: number;
  name: string;
  role: string;
  skills: string[];
  active: boolean;
}

export const USER_JSON: UserPayload = {
  id: 42,
  name: '小明',
  role: '全栈开发者',
  skills: ['JavaScript', 'Three.js', 'API'],
  active: true
};

/** HTTP 请求报文（步骤⑥ 在 JSON 面板中展示） */
export const REQUEST_TEXT =
  'GET /api/users/42  HTTP/1.1\nHost: example.com\nAccept: application/json';

/** 主场景：GET 用户信息 —— 完整请求生命周期（14 步） */
export const SCENARIO: Scenario = {
  id: 'get-user',
  name: 'GET 用户信息',
  steps: [
    {
      id: 'user-action',
      title: '① 用户操作',
      desc: '用户在前端页面点击「获取用户信息」按钮，浏览器生成一个 HTTP 请求，准备发往服务器。',
      duration: 2.0,
      packets: [],
      activate: ['client']
    },
    {
      id: 'dns-query',
      title: '② DNS 解析',
      desc: '浏览器需要先把域名 example.com 解析成 IP 地址，向 DNS 服务器发起查询请求。',
      duration: 2.0,
      packets: [
        { spec: { kind: 'dns-query', label: 'DNS 查询', color: 0x4cc9f0, link: 'dns' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['client', 'dns']
    },
    {
      id: 'dns-answer',
      title: '③ DNS 应答',
      desc: 'DNS 返回域名对应的 IP 地址（如 10.0.0.5），浏览器拿到真实服务器地址。',
      duration: 1.6,
      packets: [
        { spec: { kind: 'dns-answer', label: '10.0.0.5', color: 0x4cc9f0, link: 'dns' }, t0: 0.1, t1: 0.9, reverse: true }
      ],
      activate: ['client', 'dns']
    },
    {
      id: 'tcp-handshake',
      title: '④ TCP 三次握手',
      desc: '传输层建立可靠连接：客户端发 SYN，服务器回 SYN+ACK，客户端再回 ACK。',
      duration: 3.0,
      packets: [
        { spec: { kind: 'tcp-syn', label: 'SYN', color: 0x4361ee, link: 'client-cdn' }, t0: 0.05, t1: 0.35 },
        { spec: { kind: 'tcp-synack', label: 'SYN+ACK', color: 0x4361ee, link: 'client-cdn' }, t0: 0.35, t1: 0.65, reverse: true },
        { spec: { kind: 'tcp-ack', label: 'ACK', color: 0x4361ee, link: 'client-cdn' }, t0: 0.65, t1: 0.95 }
      ],
      activate: ['client', 'cdn']
    },
    {
      id: 'tls-handshake',
      title: '⑤ TLS 加密握手',
      desc: 'HTTPS 下，客户端与服务器协商加密密钥，之后传输的数据都会被加密。',
      duration: 2.4,
      packets: [
        { spec: { kind: 'tls', label: 'TLS 握手', color: 0xffb703, link: 'client-cdn' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['client', 'cdn']
    },
    {
      id: 'http-request',
      title: '⑥ HTTP 请求',
      desc: '加密通道建立后，客户端发送 HTTP 请求：方法 GET + 路径 /api/users/42。',
      duration: 2.0,
      packets: [
        { spec: { kind: 'http-request', label: 'GET /api/users/42', color: 0x4cc9f0, link: 'client-cdn' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['client', 'cdn'],
      ui: { json: 'req' }
    },
    {
      id: 'cdn-edge',
      title: '⑦ CDN 边缘',
      desc: '请求到达 CDN 边缘节点，它缓存了静态资源；动态 API 请求会转发给源站。',
      duration: 1.6,
      packets: [
        { spec: { kind: 'http-request', label: 'GET /api/users/42', color: 0x4cc9f0, link: 'cdn-lb' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['cdn', 'lb']
    },
    {
      id: 'load-balance',
      title: '⑧ 负载均衡',
      desc: '负载均衡器把请求分发给后端 API 网关，保证多台服务器负载均匀。',
      duration: 1.6,
      packets: [
        { spec: { kind: 'http-request', label: 'GET /api/users/42', color: 0x4cc9f0, link: 'lb-api' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['lb', 'api']
    },
    {
      id: 'api-route',
      title: '⑨ API 网关路由',
      desc: 'API 网关解析路由 /api/users/42，把请求转发给「用户服务」后端。',
      duration: 1.6,
      packets: [
        { spec: { kind: 'http-request', label: 'GET /api/users/42', color: 0x4cc9f0, link: 'api-backend' }, t0: 0.1, t1: 0.9 }
      ],
      activate: ['api', 'backend']
    },
    {
      id: 'cache-miss',
      title: '⑩ 缓存查询',
      desc: '后端先查缓存（Redis），没有命中（miss），于是回源数据库查询。',
      duration: 2.0,
      packets: [
        { spec: { kind: 'cache-query', label: '查缓存', color: 0xf72585, link: 'backend-cache' }, t0: 0.05, t1: 0.5 },
        { spec: { kind: 'cache-result', label: 'miss', color: 0xf72585, link: 'backend-cache' }, t0: 0.5, t1: 0.9, reverse: true }
      ],
      activate: ['backend', 'cache']
    },
    {
      id: 'db-query',
      title: '⑪ 数据库查询',
      desc: '后端向数据库执行 SQL：SELECT * FROM users WHERE id=42，取回用户记录。',
      duration: 2.2,
      packets: [
        { spec: { kind: 'sql-query', label: 'SQL 查询', color: 0x9d4edd, link: 'backend-db' }, t0: 0.05, t1: 0.5 },
        { spec: { kind: 'sql-result', label: '结果集', color: 0x9d4edd, link: 'backend-db' }, t0: 0.5, t1: 0.95, reverse: true }
      ],
      activate: ['backend', 'db']
    },
    {
      id: 'json-serialize',
      title: '⑫ JSON 序列化',
      desc: '后端把数据对象序列化成 JSON 字符串，并用 gzip 压缩，准备返回。',
      duration: 2.2,
      packets: [],
      activate: ['backend'],
      ui: { json: 'json' }
    },
    {
      id: 'response-return',
      title: '⑬ 响应返回',
      desc: '状态码 200 OK + JSON 响应体，经 API、负载均衡、CDN 一路加密返回前端。',
      duration: 3.5,
      packets: [
        { spec: { kind: 'http-response', label: '200 OK · JSON', color: 0x2ecc71, link: 'api-backend' }, t0: 0.05, t1: 0.28, reverse: true },
        { spec: { kind: 'http-response', label: '200 OK · JSON', color: 0x2ecc71, link: 'lb-api' }, t0: 0.28, t1: 0.5, reverse: true },
        { spec: { kind: 'http-response', label: '200 OK · JSON', color: 0x2ecc71, link: 'cdn-lb' }, t0: 0.5, t1: 0.72, reverse: true },
        { spec: { kind: 'http-response', label: '200 OK · JSON', color: 0x2ecc71, link: 'client-cdn' }, t0: 0.72, t1: 0.95, reverse: true }
      ],
      activate: ['api', 'lb', 'cdn', 'client'],
      ui: { json: 'json' }
    },
    {
      id: 'render',
      title: '⑭ 前端渲染',
      desc: '前端用 JSON.parse() 解析响应，把数据渲染到页面，用户最终看到结果。',
      duration: 2.5,
      packets: [],
      activate: ['client'],
      ui: { json: 'json' }
    }
  ]
};
