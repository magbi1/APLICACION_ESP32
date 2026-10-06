// Utilidades de interfaz y estado global compartido.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const State = {
  settings: {},
  branding: {},
  project: null, // { projectDir, name, type, main, tree }
  ports: [],
  boards: DEFAULT_BOARDS.slice(),
  tools: null,
  busy: false,
  listeners: {}
};

const Bus = {
  on(evt, fn) {
    (State.listeners[evt] = State.listeners[evt] || []).push(fn);
  },
  emit(evt, data) {
    (State.listeners[evt] || []).forEach((fn) => fn(data));
  }
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fileUrl(p) {
  if (!p) return '';
  if (/^(https?|data|file):/.test(p)) return p;
  return 'file:///' + p.replace(/\\/g, '/').replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
}

function basename(p) {
  return String(p).split(/[\\/]/).pop();
}

function dirname(p) {
  const parts = String(p).split(/[\\/]/);
  parts.pop();
  return parts.join(p.includes('\\') ? '\\' : '/');
}

function joinPath(dir, name) {
  return dir + (dir.includes('\\') ? '\\' : '/') + name;
}

function fmtBytes(n) {
  if (n == null) return '—';
  if (n >= 1048576) return (n / 1048576).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' B';
}

function timeAgo(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function toast(msg, type = 'info', ms = 4200) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${iconSvg(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info')}<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

function setStatus(text, kind = 'idle') {
  const el = $('#sbStatus');
  el.className = kind;
  el.innerHTML = `${iconSvg(kind === 'busy' ? 'refresh' : kind === 'error' ? 'alert' : 'circle', 12)}${esc(text)}`;
}

/** Modal genérico. fields: [{ id, label, type, value, options }] */
function modal(title, fields, okText = 'Aceptar') {
  return new Promise((resolve) => {
    $('#modalTitle').textContent = title;
    const body = $('#modalBody');
    if (typeof fields === 'string') {
      body.innerHTML = `<p>${fields}</p>`;
    } else {
      body.innerHTML = fields.map((f) => {
        if (f.type === 'select') {
          return `<label class="field">${esc(f.label)}<select id="m_${f.id}">${f.options.map((o) => `<option value="${esc(o.value)}" ${o.value === f.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
        }
        if (f.type === 'html') return f.html;
        return `<label class="field">${esc(f.label)}<input id="m_${f.id}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" /></label>`;
      }).join('');
    }
    $('#modalOk').textContent = okText;
    const m = $('#modal');
    m.classList.add('open');
    const first = body.querySelector('input,select');
    first && setTimeout(() => first.focus(), 50);
    const close = (val) => {
      m.classList.remove('open');
      $('#modalOk').onclick = null;
      $('#modalCancel').onclick = null;
      body.onkeydown = null;
      resolve(val);
    };
    const collect = () => {
      if (typeof fields === 'string') return true;
      const out = {};
      fields.forEach((f) => {
        const el = $(`#m_${f.id}`);
        if (el) out[f.id] = el.value;
      });
      return out;
    };
    $('#modalOk').onclick = () => close(collect());
    $('#modalCancel').onclick = () => close(null);
    body.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') close(collect());
      if (e.key === 'Escape') close(null);
    };
  });
}

/** Consola con colores básicos para errores/avisos/éxitos. */
function appendConsole(el, text, stream) {
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  const frag = document.createDocumentFragment();
  for (const line of text.split(/(\n)/)) {
    if (line === '\n') {
      frag.appendChild(document.createTextNode('\n'));
      continue;
    }
    if (!line) continue;
    const span = document.createElement('span');
    if (/error|✖|fatal|failed|falló/i.test(line)) span.className = 'c-err';
    else if (/warning|advertencia/i.test(line)) span.className = 'c-warn';
    else if (/✔|success|Hash of data verified|Leaving|correcta|completad/i.test(line)) span.className = 'c-ok';
    else if (/^(>|▶)/.test(line)) span.className = 'c-cmd';
    else if (stream === 'stderr') span.className = 'c-dim';
    span.textContent = line;
    frag.appendChild(span);
  }
  el.appendChild(frag);
  // Limitar tamaño del buffer
  while (el.childNodes.length > 6000) el.removeChild(el.firstChild);
  if (atBottom) el.scrollTop = el.scrollHeight;
}

function showView(name) {
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  Bus.emit('view', name);
}

async function call(channel, ...args) {
  try {
    return await window.api.invoke(channel, ...args);
  } catch (err) {
    toast(err.message, 'error', 6500);
    throw err;
  }
}
