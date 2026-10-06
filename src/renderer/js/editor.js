// Editor de código: Monaco, pestañas, explorador de archivos y diagnósticos.
const Editor = (() => {
  const MONACO_BASE = new URL('../../node_modules/monaco-editor/min/', location.href).href;
  let monacoEditor = null;
  let fallback = null; // <textarea> si Monaco no está disponible
  const tabs = []; // { path, model, view, dirty, text }
  let active = null;
  const expanded = new Set();
  let diagnostics = [];

  function langFor(path) {
    const ext = path.split('.').pop().toLowerCase();
    return { ino: 'cpp', c: 'c', h: 'cpp', hpp: 'cpp', cpp: 'cpp', cc: 'cpp', json: 'json', md: 'markdown', py: 'python', ini: 'ini', toml: 'ini', yml: 'yaml', yaml: 'yaml', html: 'html', css: 'css', js: 'javascript', txt: 'plaintext', csv: 'plaintext' }[ext] || (/CMakeLists/.test(path) ? 'plaintext' : 'plaintext');
  }

  function loadMonaco() {
    return new Promise((resolve) => {
      window.MonacoEnvironment = {
        getWorkerUrl() {
          const src = `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}'};importScripts('${MONACO_BASE}vs/base/worker/workerMain.js');`;
          return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        }
      };
      const s = document.createElement('script');
      s.src = MONACO_BASE + 'vs/loader.js';
      s.onload = () => {
        window.require.config({ paths: { vs: MONACO_BASE + 'vs' } });
        window.require(['vs/editor/editor.main'], () => resolve(window.monaco), () => resolve(null));
      };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  function defineTheme(monaco) {
    monaco.editor.defineTheme('esp32-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6d8a', fontStyle: 'italic' },
        { token: 'keyword', foreground: '4fd1ff' },
        { token: 'string', foreground: 'a3e88f' },
        { token: 'number', foreground: 'ffb86c' },
        { token: 'type', foreground: '7dd3fc' },
        { token: 'identifier', foreground: 'dbe6ff' },
        { token: 'delimiter', foreground: '8aa0c8' }
      ],
      colors: {
        'editor.background': '#0d1526',
        'editor.foreground': '#dbe6ff',
        'editorLineNumber.foreground': '#3b4a68',
        'editorLineNumber.activeForeground': '#00b4d8',
        'editor.lineHighlightBackground': '#14203a',
        'editor.selectionBackground': '#1f4b7a',
        'editorCursor.foreground': '#00e5ff',
        'editorIndentGuide.background1': '#1a2742',
        'editorWidget.background': '#111c33',
        'editorSuggestWidget.background': '#111c33',
        'editorSuggestWidget.selectedBackground': '#1b3157',
        'scrollbarSlider.background': '#22345a80'
      }
    });
  }

  function registerCompletions(monaco) {
    const provider = {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn };
        const suggestions = SNIPPETS.map(([label, doc, body]) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: doc,
          insertText: body,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range
        }));
        const words = ['HIGH', 'LOW', 'OUTPUT', 'INPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'LED_BUILTIN', 'delay', 'delayMicroseconds', 'millis', 'micros', 'Serial', 'Serial1', 'Serial2', 'WiFi', 'Wire', 'SPI', 'String', 'uint8_t', 'uint16_t', 'uint32_t', 'int32_t', 'size_t', 'bool', 'map', 'constrain', 'random', 'randomSeed', 'ESP', 'WL_CONNECTED', 'WIFI_STA', 'WIFI_AP', 'GPIO_NUM_0', 'portMAX_DELAY', 'pdMS_TO_TICKS', 'xQueueCreate', 'xSemaphoreCreateMutex', 'SemaphoreHandle_t', 'TaskHandle_t'];
        words.forEach((w) => suggestions.push({ label: w, kind: monaco.languages.CompletionItemKind.Keyword, insertText: w, range }));
        return { suggestions };
      }
    };
    monaco.languages.registerCompletionItemProvider('cpp', provider);
    monaco.languages.registerCompletionItemProvider('c', provider);
  }

  async function init() {
    const monaco = await loadMonaco();
    const host = $('#editorHost');
    if (monaco) {
      defineTheme(monaco);
      registerCompletions(monaco);
      monacoEditor = monaco.editor.create(host, {
        theme: 'esp32-dark',
        automaticLayout: true,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
        fontLigatures: true,
        fontSize: State.settings.fontSize || 14,
        minimap: { enabled: true, scale: 1, renderCharacters: false },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        padding: { top: 10 },
        renderLineHighlight: 'all',
        scrollBeyondLastLine: false,
        tabSize: 2
      });
      monacoEditor.onDidChangeCursorPosition((e) => {
        $('#sbCursor').textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
      });
      monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => save());
      $('#emptyEditor').style.zIndex = 5;
    } else {
      fallback = document.createElement('textarea');
      fallback.className = 'fallback-editor';
      fallback.spellcheck = false;
      fallback.addEventListener('input', () => {
        if (active) {
          active.text = fallback.value;
          markDirty(active, true);
        }
      });
      host.appendChild(fallback);
    }
    updateEmpty();
  }

  function updateEmpty() {
    $('#emptyEditor').style.display = active ? 'none' : 'flex';
    if (fallback) fallback.style.display = active ? 'block' : 'none';
  }

  function markDirty(tab, dirty) {
    tab.dirty = dirty;
    renderTabs();
  }

  async function open(path) {
    let tab = tabs.find((t) => t.path === path);
    if (!tab) {
      const text = await call('file:read', path);
      tab = { path, dirty: false, text };
      if (monacoEditor) {
        const uri = monaco.Uri.file(path);
        tab.model = monaco.editor.getModel(uri) || monaco.editor.createModel(text, langFor(path), uri);
        tab.model.setValue(text);
        tab.model.onDidChangeContent(() => !tab.dirty && markDirty(tab, true));
      }
      tabs.push(tab);
    }
    activate(tab);
    showView('editor');
    return tab;
  }

  function activate(tab) {
    if (active && monacoEditor) active.view = monacoEditor.saveViewState();
    active = tab;
    if (monacoEditor && tab) {
      monacoEditor.setModel(tab.model);
      tab.view && monacoEditor.restoreViewState(tab.view);
      monacoEditor.focus();
    } else if (fallback && tab) {
      fallback.value = tab.text;
    }
    $('#sbType').textContent = tab ? langFor(tab.path).toUpperCase() : '';
    renderTabs();
    renderTree();
    updateEmpty();
  }

  function close(tab) {
    if (tab.dirty && !confirm(`¿Cerrar ${basename(tab.path)} sin guardar?`)) return;
    const i = tabs.indexOf(tab);
    tabs.splice(i, 1);
    tab.model && tab.model.dispose();
    if (active === tab) {
      active = null;
      activate(tabs[Math.min(i, tabs.length - 1)] || null);
      if (!tabs.length && monacoEditor) monacoEditor.setModel(null);
    }
    renderTabs();
    updateEmpty();
  }

  function closeAll() {
    tabs.splice(0).forEach((t) => t.model && t.model.dispose());
    active = null;
    if (monacoEditor) monacoEditor.setModel(null);
    renderTabs();
    updateEmpty();
  }

  function content(tab) {
    return tab.model ? tab.model.getValue() : tab.text;
  }

  async function save(tab = active) {
    if (!tab) return;
    await call('file:write', tab.path, content(tab));
    markDirty(tab, false);
    setStatus(`Guardado ${basename(tab.path)}`);
  }

  async function saveAll() {
    for (const t of tabs.filter((t) => t.dirty)) await save(t);
  }

  function renderTabs() {
    const el = $('#tabs');
    el.innerHTML = '';
    tabs.forEach((t) => {
      const b = document.createElement('div');
      b.className = 'tab' + (t === active ? ' active' : '') + (t.dirty ? ' dirty' : '');
      b.title = t.path;
      b.innerHTML = `${iconSvg('file', 13)}<span>${esc(basename(t.path))}</span><button class="tab-close" title="Cerrar">${iconSvg('x', 12)}</button>`;
      b.onclick = (e) => (e.target.closest('.tab-close') ? close(t) : activate(t));
      b.onauxclick = (e) => e.button === 1 && close(t);
      el.appendChild(b);
    });
  }

  function fileIcon(name) {
    if (/\.ino$/i.test(name)) return '<span class="fi ino">∞</span>';
    if (/\.(c|cpp|cc)$/i.test(name)) return '<span class="fi c">C</span>';
    if (/\.(h|hpp)$/i.test(name)) return '<span class="fi h">H</span>';
    if (/\.json$/i.test(name)) return '<span class="fi json">{}</span>';
    if (/\.(ini|toml)$/i.test(name)) return '<span class="fi ini">⚙</span>';
    if (/\.md$/i.test(name)) return '<span class="fi md">M</span>';
    return iconSvg('file', 13);
  }

  function renderTree() {
    const root = $('#fileTree');
    if (!State.project) {
      root.innerHTML = '<p class="muted pad">Abre un proyecto desde el Inicio.</p>';
      return;
    }
    const errFiles = new Set(diagnostics.filter((d) => d.severity === 'error').map((d) => normalize(d.file)));
    const build = (nodes, depth) => nodes.map((n) => {
      const pad = `style="padding-left:${10 + depth * 14}px"`;
      if (n.dir) {
        const open = expanded.has(n.path);
        return `<div class="tnode dir" data-path="${esc(n.path)}" ${pad}><span class="chev ${open ? 'open' : ''}">${iconSvg('chevron', 12)}</span>${iconSvg('folder', 13)}<span>${esc(n.name)}</span></div>${open ? build(n.children, depth + 1) : ''}`;
      }
      const isActive = active && active.path === n.path;
      return `<div class="tnode file ${isActive ? 'active' : ''} ${errFiles.has(normalize(n.path)) ? 'has-error' : ''} ${n.text ? '' : 'binary'}" data-path="${esc(n.path)}" ${pad}>${fileIcon(n.name)}<span>${esc(n.name)}</span></div>`;
    }).join('');
    root.innerHTML = build(State.project.tree, 0);
  }

  async function refreshTree() {
    if (!State.project) return;
    State.project.tree = await call('project:tree', State.project.projectDir);
    renderTree();
  }

  function normalize(p) {
    return String(p).replace(/\\/g, '/').toLowerCase();
  }

  function setDiagnostics(list) {
    diagnostics = list || [];
    const errors = diagnostics.filter((d) => d.severity !== 'note');
    $('#problemCount').textContent = errors.length;
    $('#problemCount').classList.toggle('has', errors.length > 0);
    $('#problems').innerHTML = errors.length
      ? errors.map((d, i) => `<li class="${d.severity}" data-i="${i}">${iconSvg(d.severity === 'error' ? 'alert' : 'info', 13)}<span class="msg">${esc(d.message)}</span><span class="loc">${esc(basename(d.file))}:${d.line}:${d.column}</span></li>`).join('')
      : '<li class="muted">Sin problemas detectados.</li>';
    $$('#problems li[data-i]').forEach((li) => {
      li.onclick = () => reveal(errors[+li.dataset.i]);
    });
    if (window.monaco) {
      monaco.editor.getModels().forEach((m) => {
        const mine = errors.filter((d) => normalize(d.file) === normalize(m.uri.fsPath) || normalize(d.file).endsWith('/' + normalize(basename(m.uri.fsPath))));
        monaco.editor.setModelMarkers(m, 'build', mine.map((d) => ({
          startLineNumber: d.line,
          startColumn: d.column,
          endLineNumber: d.line,
          endColumn: d.column + 1000,
          message: d.message,
          severity: d.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
        })));
      });
    }
    renderTree();
  }

  async function reveal(d) {
    if (!d) return;
    try {
      await open(d.file);
    } catch {
      return;
    }
    if (monacoEditor) {
      monacoEditor.revealLineInCenter(d.line);
      monacoEditor.setPosition({ lineNumber: d.line, column: d.column });
      monacoEditor.focus();
    }
  }

  function setFontSize(n) {
    monacoEditor && monacoEditor.updateOptions({ fontSize: n });
  }

  function bindExplorer() {
    $('#fileTree').addEventListener('click', (e) => {
      const node = e.target.closest('.tnode');
      if (!node) return;
      const p = node.dataset.path;
      if (node.classList.contains('dir')) {
        expanded.has(p) ? expanded.delete(p) : expanded.add(p);
        renderTree();
      } else if (!node.classList.contains('binary')) {
        open(p);
      }
    });
    $('#fileTree').addEventListener('contextmenu', async (e) => {
      const node = e.target.closest('.tnode');
      if (!node) return;
      e.preventDefault();
      const p = node.dataset.path;
      const r = await modal(basename(p), [{ id: 'action', label: 'Acción', type: 'select', value: 'rename', options: [
        { value: 'rename', label: 'Renombrar' }, { value: 'reveal', label: 'Mostrar en el Explorador de Windows' }, { value: 'delete', label: 'Eliminar' }
      ] }]);
      if (!r) return;
      if (r.action === 'reveal') return call('shell:showItem', p);
      if (r.action === 'delete') {
        if (!confirm(`¿Eliminar ${basename(p)}?`)) return;
        await call('file:delete', p);
        const t = tabs.find((t) => t.path === p);
        t && close(t);
      }
      if (r.action === 'rename') {
        const n = await modal('Renombrar', [{ id: 'name', label: 'Nuevo nombre', value: basename(p) }]);
        if (!n || !n.name) return;
        await call('file:rename', p, n.name);
        const t = tabs.find((t) => t.path === p);
        t && close(t);
      }
      refreshTree();
    });
    const targetDir = () => {
      if (!State.project) return null;
      return active ? dirname(active.path) : State.project.projectDir;
    };
    $('#exNewFile').onclick = async () => {
      const dir = targetDir();
      if (!dir) return toast('Abre un proyecto primero', 'error');
      const r = await modal('Nuevo archivo', [{ id: 'name', label: 'Nombre', placeholder: 'sensor.h, utils.cpp, config.json…' }]);
      if (!r || !r.name) return;
      const f = await call('file:new', dir, r.name);
      await refreshTree();
      open(f);
    };
    $('#exNewFolder').onclick = async () => {
      const dir = targetDir();
      if (!dir) return toast('Abre un proyecto primero', 'error');
      const r = await modal('Nueva carpeta', [{ id: 'name', label: 'Nombre', placeholder: 'src, data, lib…' }]);
      if (!r || !r.name) return;
      const f = await call('folder:new', dir, r.name);
      expanded.add(f);
      refreshTree();
    };
    $('#exRefresh').onclick = refreshTree;
    $('#exTerminal').onclick = () => State.project && call('shell:openTerminal', State.project.projectDir);
  }

  return { init, open, save, saveAll, closeAll, renderTree, refreshTree, setDiagnostics, setFontSize, bindExplorer, get active() { return active; }, get tabs() { return tabs; } };
})();
