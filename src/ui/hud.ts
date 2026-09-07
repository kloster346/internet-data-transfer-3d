import { REQUEST_TEXT, STEPS, USER_JSON } from '../data/scenarios';

/** JSON 语法高亮：键名/字符串/数字/布尔/null 分别着色 */
function jsonToHtml(obj: unknown): string {
  const s = JSON.stringify(obj, null, 2);
  return s.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'num';
      if (/^"/.test(m)) cls = /:\s*$/.test(m) ? 'key' : 'str';
      else if (/true|false/.test(m)) cls = 'bool';
      else if (/null/.test(m)) cls = 'null';
      return '<span class="j-' + cls + '">' + m + '</span>';
    }
  );
}

/** HTTP 请求报文高亮（方法/路径/请求头） */
function requestHtml(): string {
  return REQUEST_TEXT.split('\n')
    .map((ln, i) => {
      if (i === 0) {
        const [method, path, ...rest] = ln.split(' ');
        return (
          '<span class="req-method">' + method + '</span> <span class="req-path">' + path + '</span> ' + rest.join(' ')
        );
      }
      return '<span class="req-head">' + ln + '</span>';
    })
    .join('\n');
}

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
  bind(c: HudControls): void;
}

/** 创建 HUD：填充步骤列表、更新步骤/JSON 面板，并绑定控制按钮 */
export function createHud(): Hud {
  const stepListEl = document.getElementById('stepList')!;
  const stepTitleEl = document.getElementById('stepTitle')!;
  const stepDescEl = document.getElementById('stepDesc')!;
  const jsonCodeEl = document.getElementById('jsonCode')!;
  const btnPlay = document.getElementById('btnPlay') as HTMLButtonElement;

  STEPS.forEach((s, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    div.innerHTML =
      '<span class="idx">' + (i + 1) + '</span><span>' + s.title.replace(/^[①②③④⑤⑥⑦] /, '') + '</span>';
    stepListEl.appendChild(div);
  });
  const stepDoms = stepListEl.children;

  function setStep(i: number): void {
    const s = STEPS[i];
    stepTitleEl.textContent = s.title;
    stepDescEl.textContent = s.desc;
    for (let k = 0; k < stepDoms.length; k++) {
      stepDoms[k].classList.toggle('active', k === i);
      stepDoms[k].classList.toggle('done', k < i);
    }
    if (s.json === 'json') jsonCodeEl.innerHTML = jsonToHtml(USER_JSON);
    else if (s.json === 'req') jsonCodeEl.innerHTML = requestHtml();
    else jsonCodeEl.innerHTML = '<span class="req-head">… 等待数据 …</span>';
  }

  return {
    setStep,
    setPlaying(p) {
      btnPlay.textContent = p ? '⏸ 暂停' : '▶ 播放';
      btnPlay.classList.toggle('primary', p);
    },
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
