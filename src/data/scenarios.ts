import type { Scenario, Step, StepPacket } from './types';

/** 演示用的用户数据对象（后端序列化前的内存对象，可被「可编辑 JSON」修改） */
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

/** 校验并应用用户编辑的 JSON（保持 id/name/role/skills/active 结构） */
export function applyPayload(next: unknown): boolean {
  if (typeof next !== 'object' || next === null) return false;
  const o = next as Partial<UserPayload>;
  if (
    typeof o.id !== 'number' ||
    typeof o.name !== 'string' ||
    typeof o.role !== 'string' ||
    !Array.isArray(o.skills) ||
    typeof o.active !== 'boolean'
  ) {
    return false;
  }
  USER_JSON.id = o.id;
  USER_JSON.name = o.name;
  USER_JSON.role = o.role;
  USER_JSON.skills = o.skills;
  USER_JSON.active = o.active;
  return true;
}

export function payloadText(): string {
  return JSON.stringify(USER_JSON, null, 2);
}

/** HTTP 请求报文（请求阶段展示） */
export const REQUEST_TEXT =
  'GET /api/users/42  HTTP/1.1\nHost: example.com\nAccept: application/json';

/** 示例代码（前端 fetch / 后端 Express），行号从 0 计，供代码面板逐行高亮 */
export const FRONTEND_CODE = [
  'async function getUser(id) {',
  '  const res = await fetch(`/api/users/${id}`, {',
  "    method: 'GET',",
  "    headers: { 'Accept': 'application/json' }",
  '  });',
  '  if (!res.ok) throw new Error(`HTTP ${res.status}`);',
  '  const data = await res.json();  // JSON 解析',
  '  render(data);                  // 渲染页面',
  '}'
];

export const BACKEND_CODE = [
  "app.get('/api/users/:id', async (req, res) => {",
  '  const id = Number(req.params.id);',
  '  const cached = await cache.get(`user:${id}`);  // 查缓存',
  '  if (cached) return res.json(cached);',
  "  const user = await db.query('SELECT * FROM users WHERE id=?', [id]);  // 查库",
  "  if (!user) return res.status(404).json({ error: 'Not Found' });",
  '  const data = { id, name, role, skills, active };',
  '  res.status(200).json(data);   // 序列化 + 响应',
  ']'
];

// ---- 复用的小工具：请求/响应数据包 ----
const req = (link: string): StepPacket => ({
  spec: { kind: 'http-request', label: 'HTTP 请求', color: 0x4cc9f0, link },
  t0: 0.1,
  t1: 0.9
});
const resp = (link: string, t0: number, t1: number): StepPacket => ({
  spec: { kind: 'http-response', label: 'HTTP 响应', color: 0x2ecc71, link },
  t0,
  t1,
  reverse: true
});

/** 主场景：GET 用户信息 —— 完整请求生命周期（14 步） */
const GET_USER: Scenario = {
  id: 'get-user',
  name: 'GET 用户信息',
  request: { method: 'GET', path: '/api/users/42' },
  response: { status: 200, statusText: 'OK' },
  steps: [
    { id: 'user-action', title: '① 用户操作', desc: '用户在前端页面点击「获取用户信息」按钮，浏览器生成一个 HTTP 请求，准备发往服务器。', duration: 2.0, packets: [], activate: ['client'] },
    { id: 'dns-query', title: '② DNS 解析', desc: '浏览器把域名 example.com 解析成 IP 地址，向 DNS 服务器发起查询。', duration: 2.0, packets: [{ spec: { kind: 'dns-query', label: 'DNS 查询', color: 0x4cc9f0, link: 'dns' }, t0: 0.1, t1: 0.9 }], activate: ['client', 'dns'] },
    { id: 'dns-answer', title: '③ DNS 应答', desc: 'DNS 返回域名对应的 IP 地址（如 10.0.0.5），浏览器拿到真实服务器地址。', duration: 1.6, packets: [{ spec: { kind: 'dns-answer', label: '10.0.0.5', color: 0x4cc9f0, link: 'dns' }, t0: 0.1, t1: 0.9, reverse: true }], activate: ['client', 'dns'] },
    { id: 'tcp-handshake', title: '④ TCP 三次握手', desc: '传输层建立可靠连接：客户端发 SYN，服务器回 SYN+ACK，客户端再回 ACK。', duration: 3.0, packets: [
      { spec: { kind: 'tcp-syn', label: 'SYN', color: 0x4361ee, link: 'client-cdn' }, t0: 0.05, t1: 0.35 },
      { spec: { kind: 'tcp-synack', label: 'SYN+ACK', color: 0x4361ee, link: 'client-cdn' }, t0: 0.35, t1: 0.65, reverse: true },
      { spec: { kind: 'tcp-ack', label: 'ACK', color: 0x4361ee, link: 'client-cdn' }, t0: 0.65, t1: 0.95 }
    ], activate: ['client', 'cdn'] },
    { id: 'tls-handshake', title: '⑤ TLS 加密握手', desc: 'HTTPS 下，客户端与服务器协商加密密钥，之后传输的数据都会被加密。', duration: 2.4, packets: [{ spec: { kind: 'tls', label: 'TLS 握手', color: 0xffb703, link: 'client-cdn' }, t0: 0.1, t1: 0.9 }], activate: ['client', 'cdn'] },
    { id: 'http-request', title: '⑥ HTTP 请求', desc: '加密通道建立后，客户端发送 HTTP 请求：方法 GET + 路径 /api/users/42。', duration: 2.0, packets: [req('client-cdn')], activate: ['client', 'cdn'], ui: { json: 'req', code: { file: 'frontend', line: 1 } } },
    { id: 'cdn-edge', title: '⑦ CDN 边缘', desc: '请求到达 CDN 边缘节点，它缓存了静态资源；动态 API 请求会转发给源站。', duration: 1.6, packets: [req('cdn-lb')], activate: ['cdn', 'lb'] },
    { id: 'load-balance', title: '⑧ 负载均衡', desc: '负载均衡器把请求分发给后端 API 网关，保证多台服务器负载均匀。', duration: 1.6, packets: [req('lb-api')], activate: ['lb', 'api'] },
    { id: 'api-route', title: '⑨ API 网关路由', desc: 'API 网关解析路由 /api/users/42，把请求转发给「用户服务」后端。', duration: 1.6, packets: [req('api-backend')], activate: ['api', 'backend'], ui: { code: { file: 'backend', line: 0 } } },
    { id: 'cache-miss', title: '⑩ 缓存查询', desc: '后端先查缓存（Redis），没有命中（miss），于是回源数据库查询。', duration: 2.0, packets: [
      { spec: { kind: 'cache-query', label: '查缓存', color: 0xf72585, link: 'backend-cache' }, t0: 0.05, t1: 0.5 },
      { spec: { kind: 'cache-result', label: 'miss', color: 0xf72585, link: 'backend-cache' }, t0: 0.5, t1: 0.9, reverse: true }
    ], activate: ['backend', 'cache'], ui: { code: { file: 'backend', line: 2 } } },
    { id: 'db-query', title: '⑪ 数据库查询', desc: '后端向数据库执行 SQL：SELECT * FROM users WHERE id=42，取回用户记录。', duration: 2.2, packets: [
      { spec: { kind: 'sql-query', label: 'SQL 查询', color: 0x9d4edd, link: 'backend-db' }, t0: 0.05, t1: 0.5 },
      { spec: { kind: 'sql-result', label: '结果集', color: 0x9d4edd, link: 'backend-db' }, t0: 0.5, t1: 0.95, reverse: true }
    ], activate: ['backend', 'db'], ui: { code: { file: 'backend', line: 4 } } },
    { id: 'json-serialize', title: '⑫ JSON 序列化', desc: '后端把数据对象序列化成 JSON 字符串，并用 gzip 压缩，准备返回。', duration: 2.2, packets: [], activate: ['backend'], ui: { json: 'json', code: { file: 'backend', line: 6 } } },
    { id: 'response-return', title: '⑬ 响应返回', desc: '状态码 200 OK + JSON 响应体，经 API、负载均衡、CDN 一路加密返回前端。', duration: 3.5, packets: [
      resp('api-backend', 0.05, 0.28), resp('lb-api', 0.28, 0.5), resp('cdn-lb', 0.5, 0.72), resp('client-cdn', 0.72, 0.95)
    ], activate: ['api', 'lb', 'cdn', 'client'], ui: { json: 'json', code: { file: 'backend', line: 7 } } },
    { id: 'render', title: '⑭ 前端渲染', desc: '前端用 JSON.parse() 解析响应，把数据渲染到页面，用户最终看到结果。', duration: 2.5, packets: [], activate: ['client'], ui: { json: 'json', code: { file: 'frontend', line: 6 } } }
  ]
};

/** POST 创建用户 */
const POST_USER: Scenario = {
  id: 'post-user',
  name: 'POST 创建用户',
  request: { method: 'POST', path: '/api/users' },
  response: { status: 201, statusText: 'Created' },
  steps: [
    { id: 'form-fill', title: '① 填写表单', desc: '用户在前端填写新用户信息，点击「提交」。', duration: 2.0, packets: [], activate: ['client'] },
    { id: 'post-request', title: '② POST 请求', desc: '前端把表单数据放到请求体（JSON），发送 POST /api/users。', duration: 2.0, packets: [req('client-cdn')], activate: ['client', 'cdn'], ui: { json: 'json' } },
    { id: 'post-cdn-lb', title: '③ 边缘转发', desc: '请求经 CDN 边缘与负载均衡转发到 API 网关。', duration: 2.4, packets: [req('cdn-lb'), req('lb-api')], activate: ['cdn', 'lb', 'api'] },
    { id: 'post-api', title: '④ API → 后端', desc: 'API 网关把请求转发给「用户服务」后端。', duration: 1.6, packets: [req('api-backend')], activate: ['api', 'backend'] },
    { id: 'db-insert', title: '⑤ 数据库写入', desc: '后端执行 INSERT，把新用户写入数据库。', duration: 2.2, packets: [
      { spec: { kind: 'sql-query', label: 'INSERT', color: 0x9d4edd, link: 'backend-db' }, t0: 0.05, t1: 0.5 },
      { spec: { kind: 'sql-result', label: '成功', color: 0x9d4edd, link: 'backend-db' }, t0: 0.5, t1: 0.95, reverse: true }
    ], activate: ['backend', 'db'] },
    { id: 'post-response', title: '⑥ 201 Created', desc: '后端返回 201 Created，响应体是新用户的 JSON。', duration: 3.0, packets: [
      resp('api-backend', 0.05, 0.3), resp('lb-api', 0.3, 0.55), resp('cdn-lb', 0.55, 0.75), resp('client-cdn', 0.75, 0.95)
    ], activate: ['api', 'lb', 'cdn', 'client'], ui: { json: 'json' } },
    { id: 'post-render', title: '⑦ 刷新列表', desc: '前端解析响应，把新用户加到列表中。', duration: 2.0, packets: [], activate: ['client'], ui: { json: 'json' } }
  ]
};

/** 404 资源不存在 */
const NOT_FOUND: Scenario = {
  id: 'not-found',
  name: '404 资源不存在',
  request: { method: 'GET', path: '/api/users/999' },
  response: { status: 404, statusText: 'Not Found' },
  steps: [
    { id: 'nf-request', title: '① 请求不存在资源', desc: '用户请求一个不存在的用户 id=999。', duration: 2.0, packets: [], activate: ['client'] },
    { id: 'nf-forward', title: '② 请求转发', desc: '请求经边缘、负载均衡、API 网关转发到后端。', duration: 3.0, packets: [req('client-cdn'), req('cdn-lb'), req('lb-api'), req('api-backend')], activate: ['cdn', 'lb', 'api', 'backend'], ui: { json: 'req' } },
    { id: 'nf-db', title: '③ 数据库无结果', desc: '数据库查询 id=999 返回空结果。', duration: 2.2, packets: [
      { spec: { kind: 'sql-query', label: 'SQL 查询', color: 0x9d4edd, link: 'backend-db' }, t0: 0.05, t1: 0.5 },
      { spec: { kind: 'sql-result', label: '空结果', color: 0x9d4edd, link: 'backend-db' }, t0: 0.5, t1: 0.95, reverse: true }
    ], activate: ['backend', 'db'] },
    { id: 'nf-response', title: '④ 404 Not Found', desc: '后端返回 404 Not Found，响应体是错误信息 JSON。', duration: 3.0, packets: [
      resp('api-backend', 0.05, 0.3), resp('lb-api', 0.3, 0.55), resp('cdn-lb', 0.55, 0.75), resp('client-cdn', 0.75, 0.95)
    ], activate: ['api', 'lb', 'cdn', 'client'], ui: { json: 'json' } },
    { id: 'nf-render', title: '⑤ 显示错误', desc: '前端解析响应，显示「用户不存在」的提示。', duration: 2.0, packets: [], activate: ['client'], ui: { json: 'json' } }
  ]
};

/** 429 限流 */
const RATE_LIMIT: Scenario = {
  id: 'rate-limit',
  name: '429 请求限流',
  request: { method: 'GET', path: '/api/users/42' },
  response: { status: 429, statusText: 'Too Many Requests' },
  steps: [
    { id: 'rl-burst', title: '① 高频请求', desc: '客户端短时间内发出大量请求，超过正常频率。', duration: 2.0, packets: [], activate: ['client'] },
    { id: 'rl-lb', title: '② 到达负载均衡', desc: '请求到达负载均衡器，它检测到请求频率过高。', duration: 1.8, packets: [req('client-cdn'), req('cdn-lb')], activate: ['client', 'cdn', 'lb'] },
    { id: 'rl-trigger', title: '③ 触发限流', desc: '负载均衡器触发限流策略，不再把请求转发到后端。', duration: 2.2, packets: [], activate: ['lb'] },
    { id: 'rl-response', title: '④ 429 Too Many Requests', desc: '直接返回 429 Too Many Requests，提示客户端稍后重试。', duration: 2.6, packets: [
      { spec: { kind: 'http-response', label: '429 限流', color: 0xffb703, link: 'cdn-lb' }, t0: 0.1, t1: 0.5, reverse: true },
      { spec: { kind: 'http-response', label: '429 限流', color: 0xffb703, link: 'client-cdn' }, t0: 0.5, t1: 0.9, reverse: true }
    ], activate: ['lb', 'cdn', 'client'] },
    { id: 'rl-render', title: '⑤ 提示重试', desc: '前端显示「请求过于频繁，请稍后再试」。', duration: 2.0, packets: [], activate: ['client'] }
  ]
};

export const SCENARIOS: Scenario[] = [GET_USER, POST_USER, NOT_FOUND, RATE_LIMIT];

export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? GET_USER;
}

/** 兼容旧引用：主场景 */
export const SCENARIO: Scenario = GET_USER;
