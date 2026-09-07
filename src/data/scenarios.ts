import type { TeachingStep } from './types';

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

/** HTTP 请求报文（请求阶段在 JSON 面板中展示） */
export const REQUEST_TEXT =
  'GET /api/users/42  HTTP/1.1\nHost: example.com\nAccept: application/json';

/** 7 个教学步骤 */
export const STEPS: TeachingStep[] = [
  { title: '① 用户操作', action: 'frontend', json: null,
    desc: '用户在前端页面点击「获取用户信息」按钮，浏览器生成一个 HTTP 请求，准备发往服务器。' },
  { title: '② 请求发出', action: 'req-front-api', json: 'req',
    desc: '请求包携带「方法 GET + 路径 /api/users/42」从浏览器出发，沿着互联网数据高速公路驶向 API 网关。' },
  { title: '③ API 网关', action: 'api', json: null,
    desc: 'API 收到请求后解析路由，识别出要访问「用户服务」，并把请求转发给后端。API 是前后端之间的约定接口。' },
  { title: '④ 后端处理', action: 'req-api-back', json: null,
    desc: '后端根据 id=42 查询数据库，取出用户记录，在内存中形成一个「数据对象」。' },
  { title: '⑤ JSON 序列化', action: 'json', json: 'json',
    desc: '后端把数据对象序列化成 JSON 字符串——一种轻量、易读、跨语言的文本数据格式（键值对 + 数组 + 布尔值）。' },
  { title: '⑥ 响应返回', action: 'res-back-front', json: 'json',
    desc: '携带 JSON 的响应包从后端经 API 返回前端，响应头标注 Content-Type: application/json。' },
  { title: '⑦ 前端渲染', action: 'render', json: 'json',
    desc: '前端用 JSON.parse() 解析字符串，把数据渲染到页面，用户最终看到结果。一次完整传输到此完成。' }
];

/** 一个完整传输周期的秒数（速度=1） */
export const CYCLE_DURATION = 18;

/** 各步骤的时间窗口（0~1 归一化） */
export const WINDOWS: [number, number][] = [
  [0.0, 0.08], [0.08, 0.26], [0.26, 0.36], [0.36, 0.54], [0.54, 0.62], [0.62, 0.88], [0.88, 1.0]
];

/** 由归一化时间 t 得到当前步骤索引 */
export function stepAt(t: number): number {
  for (let i = 0; i < WINDOWS.length; i++) if (t < WINDOWS[i][1]) return i;
  return WINDOWS.length - 1;
}
