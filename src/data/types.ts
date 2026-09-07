/**
 * 核心类型定义。
 * 阶段 0 只承载当前 7 步教学结构；阶段 2 会扩展为完整的
 * Scenario / Step / PacketSpec / NetworkNode 数据驱动模型。
 */

/** 教学步骤（与现有 7 步结构一致） */
export interface TeachingStep {
  title: string;
  action: string;
  /** null = 无数据；'req' = HTTP 请求头；'json' = JSON 响应体 */
  json: null | 'req' | 'json';
  desc: string;
}

/** 前端屏幕的可视状态 */
export type ScreenState = 'idle' | 'sending' | 'rendered';
