import type { Scenario } from '../data/types';

export interface Timeline {
  setScenario(sc: Scenario): void;
  update(time: number, step: number): void;
  onScrub(cb: (time: number) => void): void;
}

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** 底部时间轴：步骤分段 + 拖拽回放 + 播放头指示 */
export function createTimeline(): Timeline {
  const track = document.getElementById('tlTrack')!;
  const playhead = document.getElementById('tlPlayhead')!;
  let sc: Scenario;
  let segments: HTMLElement[] = [];
  let scrubCb: ((t: number) => void) | null = null;
  let total = 0;

  function render(): void {
    track.innerHTML = '';
    segments = [];
    for (const st of sc.steps) {
      const seg = document.createElement('div');
      seg.className = 'tl-seg';
      seg.style.flexGrow = String(st.duration);
      seg.title = st.title;
      track.appendChild(seg);
      segments.push(seg);
    }
    total = sc.steps.reduce((s, st) => s + st.duration, 0);
  }

  function timeFromEvent(e: MouseEvent | PointerEvent): number {
    const rect = track.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return ratio * total;
  }

  track.addEventListener('pointerdown', (e) => {
    scrubCb?.(timeFromEvent(e));
    track.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent): void => scrubCb?.(timeFromEvent(ev));
    const onUp = (): void => {
      track.removeEventListener('pointermove', onMove);
      track.removeEventListener('pointerup', onUp);
    };
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onUp);
  });

  return {
    setScenario(next) {
      sc = next;
      render();
    },
    update(time, step) {
      playhead.style.left = ((time / total) * 100).toFixed(2) + '%';
      segments.forEach((seg, i) => seg.classList.toggle('active', i === step));
    },
    onScrub(cb) {
      scrubCb = cb;
    }
  };
}
