/** 拓扑节点标识 */
export type NodeId = 'client' | 'dns' | 'cdn' | 'lb' | 'api' | 'backend' | 'cache' | 'db';

/** 数据包类型（决定形状与默认色，语义上区分协议） */
export type PacketKind =
  | 'dns-query'
  | 'dns-answer'
  | 'tcp-syn'
  | 'tcp-synack'
  | 'tcp-ack'
  | 'tls'
  | 'http-request'
  | 'http-response'
  | 'cache-query'
  | 'cache-result'
  | 'sql-query'
  | 'sql-result';

export interface PacketSpec {
  kind: PacketKind;
  label: string;
  color: number;
  /** 所在链路 id */
  link: string;
}

/** 一个步骤内某数据包的运动：t0/t1 为该步骤时间窗（0~1）内的飞行区间 */
export interface StepPacket {
  spec: PacketSpec;
  t0: number;
  t1: number;
  /** 是否反向（1→0）飞行 */
  reverse?: boolean;
}

export type JsonPanelContent = null | 'req' | 'json';
export type CodeFile = 'frontend' | 'backend';

export interface StepUi {
  json?: JsonPanelContent;
  code?: { file: CodeFile; line: number };
}

export interface Step {
  id: string;
  title: string;
  desc: string;
  /** 秒（速度=1） */
  duration: number;
  packets: StepPacket[];
  /** 本步高亮的节点 */
  activate: NodeId[];
  ui?: StepUi;
}

export interface Scenario {
  id: string;
  name: string;
  steps: Step[];
}

export type ScreenState = 'idle' | 'sending' | 'rendered';
