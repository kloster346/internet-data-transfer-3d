import { SCENARIO } from '../data/scenarios';
import type { Scenario } from '../data/types';

export interface HudControls {
  toggle(): void;
  next(): void;
  prev(): void;
  reset(): void;
  setSpeed(v: number): void;
}

export interface Hud {
  setStep(i: number): void;
  setPlaying(p: boolean): void;
  setScenario(sc: Scenario): void;
  bind(c: HudControls): void;
}

/** 创建 HUD：步骤列表 + 标题/描述，并绑定控制按钮 */
export function createHud(): Hud {
  const stepListEl = document.getElementById('stepList')!;
  const stepTitleEl = document.getElementById('stepTitle')!;
  const stepDescEl = document.getElementById('stepDesc')!;
  const btnPlay = document.getElementById('btnPlay') as HTMLButtonElement;

  let scenario = SCENARIO;
  let steps = scenario.steps;
  let stepDoms = stepListEl.children;

  function populate(): void {
    stepListEl.innerHTML = '';
    steps.forEach((s, i) => {
      const div = document.createElement('div');
      div.className = 'step';
      div.innerHTML =
        '<span class="idx">' + (i + 1) + '</span><span>' + s.title.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭]\s*/, '') + '</span>';
      stepListEl.appendChild(div);
    });
    stepDoms = stepListEl.children;
  }
  populate();

  function setStep(i: number): void {
    const s = steps[i];
    if (!s) return;
    stepTitleEl.textContent = s.title;
    stepDescEl.textContent = s.desc;
    // 重新触发淡入动画
    stepTitleEl.classList.remove('swap');
    stepDescEl.classList.remove('swap');
    void stepTitleEl.offsetWidth;
    stepTitleEl.classList.add('swap');
    stepDescEl.classList.add('swap');
    for (let k = 0; k < stepDoms.length; k++) {
      stepDoms[k].classList.toggle('active', k === i);
      stepDoms[k].classList.toggle('done', k < i);
    }
  }

  function setScenario(sc: Scenario): void {
    scenario = sc;
    steps = sc.steps;
    populate();
    setStep(0);
  }

  return {
    setStep,
    setPlaying(p) {
      btnPlay.textContent = p ? '⏸ 暂停' : '▶ 播放';
      btnPlay.classList.toggle('primary', p);
    },
    setScenario,
    bind(c) {
      btnPlay.addEventListener('click', c.toggle);
      document.getElementById('btnNext')!.addEventListener('click', c.next);
      document.getElementById('btnPrev')!.addEventListener('click', c.prev);
      document.getElementById('btnReset')!.addEventListener('click', c.reset);
      document.getElementById('speed')!.addEventListener('input', (e) =>
        c.setSpeed(parseFloat((e.target as HTMLInputElement).value))
      );
    }
  };
}
