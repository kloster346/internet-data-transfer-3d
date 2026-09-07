import { BACKEND_CODE, FRONTEND_CODE, SCENARIO, USER_JSON, applyPayload, payloadText } from '../data/scenarios';
import type { Scenario } from '../data/types';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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

function requestHtml(sc: Scenario): string {
  const first = sc.request.method + ' ' + sc.request.path + '  HTTP/1.1';
  const lines = [first, 'Host: example.com', 'Accept: application/json'];
  return lines
    .map((ln, i) => {
      if (i === 0) {
        const parts = ln.split(' ');
        return (
          '<span class="req-method">' + parts[0] + '</span> <span class="req-path">' + parts[1] + '</span> ' +
          parts.slice(2).join(' ')
        );
      }
      return '<span class="req-head">' + ln + '</span>';
    })
    .join('\n');
}

export interface Panels {
  setStep(i: number): void;
  setScenario(sc: Scenario): void;
  onApplyPayload(cb: () => void): void;
}

/** 右侧标签面板：JSON（可编辑）/ 代码（逐行高亮）/ 网络（瀑布图） */
export function createPanels(): Panels {
  const jsonCodeEl = document.getElementById('jsonCode')!;
  const jsonEditEl = document.getElementById('jsonEdit') as HTMLTextAreaElement;
  const btnEdit = document.getElementById('btnEdit') as HTMLButtonElement;
  const codeViewEl = document.getElementById('codeView')!;
  const netRequestEl = document.getElementById('netRequest')!;
  const netWaterfallEl = document.getElementById('netWaterfall')!;
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('#panel .tab'));
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('#panel .tab-body'));

  let sc = SCENARIO;
  let curStep = 0;
  let applyCb: (() => void) | null = null;
  let editing = false;

  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('active', x === t));
      bodies.forEach((b) => {
        b.hidden = b.id !== 'tab-' + t.dataset.tab;
      });
    })
  );

  btnEdit.addEventListener('click', () => {
    if (!editing) {
      editing = true;
      jsonEditEl.value = payloadText();
      jsonEditEl.classList.remove('invalid');
      jsonEditEl.style.display = 'block';
      jsonCodeEl.style.display = 'none';
      btnEdit.textContent = '✓ 应用';
    } else {
      let ok = false;
      try {
        ok = applyPayload(JSON.parse(jsonEditEl.value));
      } catch {
        ok = false;
      }
      if (!ok) {
        jsonEditEl.classList.add('invalid');
        return;
      }
      editing = false;
      jsonEditEl.style.display = 'none';
      jsonCodeEl.style.display = 'block';
      btnEdit.textContent = '✏️ 编辑';
      renderJson();
      applyCb?.();
    }
  });

  function renderJson(): void {
    jsonCodeEl.innerHTML = jsonToHtml(USER_JSON);
  }

  function renderCode(): void {
    const focus = sc.steps[curStep]?.ui?.code;
    const fe = FRONTEND_CODE.map(
      (ln, i) =>
        '<div class="code-line' + (focus && focus.file === 'frontend' && focus.line === i ? ' focus' : '') + '">' +
        escapeHtml(ln) + '</div>'
    ).join('');
    const be = BACKEND_CODE.map(
      (ln, i) =>
        '<div class="code-line' + (focus && focus.file === 'backend' && focus.line === i ? ' focus' : '') + '">' +
        escapeHtml(ln) + '</div>'
    ).join('');
    codeViewEl.innerHTML = '<div class="code-file">前端 · fetch</div>' + fe + '<div class="code-file">后端 · Express</div>' + be;
  }

  function renderNetwork(): void {
    const statusCls = sc.response.status < 400 ? 'ok' : 'err';
    netRequestEl.innerHTML =
      '<span class="req-method">' + sc.request.method + '</span> ' +
      '<span class="req-path">' + sc.request.path + '</span> ' +
      '<span class="net-status ' + statusCls + '">' + sc.response.status + ' ' + sc.response.statusText + '</span>';
    const total = sc.steps.reduce((s, st) => s + st.duration, 0);
    netWaterfallEl.innerHTML = sc.steps
      .map(
        (st, i) =>
          '<div class="wf-row' + (i === curStep ? ' active' : '') + '">' +
          '<span class="wf-name">' + st.title.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭]\s*/, '') + '</span>' +
          '<span class="wf-bar"><span class="wf-fill" style="width:' + ((st.duration / total) * 100).toFixed(1) + '%"></span></span>' +
          '<span class="wf-dur">' + st.duration + 's</span>' +
          '</div>'
      )
      .join('');
  }

  function setStep(i: number): void {
    curStep = i;
    if (!editing) {
      const step = sc.steps[i];
      if (step?.ui?.json === 'json') renderJson();
      else if (step?.ui?.json === 'req') jsonCodeEl.innerHTML = requestHtml(sc);
      else jsonCodeEl.innerHTML = '<span class="req-head">… 等待数据 …</span>';
    }
    renderCode();
    renderNetwork();
  }

  function setScenario(next: Scenario): void {
    sc = next;
    editing = false;
    jsonEditEl.style.display = 'none';
    jsonCodeEl.style.display = 'block';
    btnEdit.textContent = '✏️ 编辑';
    jsonEditEl.classList.remove('invalid');
    renderNetwork();
    renderCode();
  }

  return {
    setStep,
    setScenario,
    onApplyPayload(cb) {
      applyCb = cb;
    }
  };
}
