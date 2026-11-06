// Controlador principal: arranque, marca, proyectos, compilación y carga.
const App = (() => {
  function applyBranding(b) {
    State.branding = b;
    const logo = fileUrl(b.logo);
    const logo2 = fileUrl(b.logoSecondary);
    ['#brandLogo', '#heroLogo', '#emptyLogo', '#setLogo'].forEach((s) => $(s) && ($(s).src = logo));
    ['#brandLogo2', '#setLogo2'].forEach((s) => $(s) && ($(s).src = logo2));
    $('#brandName').textContent = b.appName;
    $('#heroTitle').textContent = b.appName;
    $('#heroTagline').textContent = b.tagline;
    $('#sbCompany').textContent = b.company ? `© ${b.company}` : '';
    document.title = b.appName;
    if (b.accentColor) document.documentElement.style.setProperty('--accent', b.accentColor);
  }

  function renderBoards() {
    const sel = $('#boardSelect');
    const list = State.boards;
    if (!list.some((b) => b.fqbn === State.settings.fqbn)) list.unshift({ name: State.settings.fqbn, fqbn: State.settings.fqbn });
    sel.innerHTML = list.map((b) => `<option value="${esc(b.fqbn)}" ${b.fqbn === State.settings.fqbn ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    $('#sbBoard').textContent = State.settings.fqbn;
  }

  async function loadBoards() {
    try {
      const boards = await window.api.invoke('dev:boards');
      if (boards.length) {
        const preferred = DEFAULT_BOARDS.filter((d) => boards.some((b) => b.fqbn === d.fqbn));
        const rest = boards.filter((b) => !preferred.some((p) => p.fqbn === b.fqbn)).sort((a, b) => a.name.localeCompare(b.name));
        State.boards = [...preferred, ...rest];
      }
    } catch {
      /* arduino-cli aún no instalado */
    }
    renderBoards();
  }

  function renderPorts() {
    const sel = $('#portSelect');
    const cur = State.settings.port;
    const opts = State.ports.map((p) => `<option value="${esc(p.address)}" ${p.address === cur ? 'selected' : ''}>${esc(p.address)}${p.bridge ? ' · ' + esc(p.bridge) : ''}</option>`);
    if (cur && !State.ports.some((p) => p.address === cur)) opts.unshift(`<option value="${esc(cur)}" selected>${esc(cur)} (desconectado)</option>`);
    if (!opts.length) opts.push('<option value="">Sin puertos</option>');
    sel.innerHTML = opts.join('');
    $('#sbPort').textContent = cur || 'Sin puerto';
  }

  async function refreshPorts(quiet) {
    try {
      State.ports = await window.api.invoke('dev:ports');
    } catch {
      State.ports = [];
    }
    if (!State.settings.port && State.ports[0]) await selectPort(State.ports[0].address, true);
    renderPorts();
    Bus.emit('ports');
    !quiet && toast(`${State.ports.length} puerto(s) detectado(s)`);
  }

  async function selectPort(port, quiet) {
    State.settings = await call('settings:set', { port });
    renderPorts();
    Bus.emit('ports');
    !quiet && toast(`Puerto seleccionado: ${port}`, 'success');
  }

  async function selectBoard(fqbn) {
    State.settings = await call('settings:set', { fqbn });
    renderBoards();
    Bus.emit('settings');
  }

  // ---------- Proyectos ----------
  async function openProject(dir) {
    if (!dir) return;
    if (Simulator.running) await Simulator.stop();
    const p = await call('project:open', dir);
    Editor.closeAll();
    State.project = p;
    $('#tbProject').textContent = p.name;
    $('#exProject').innerHTML = `${iconSvg('folder', 14)}<b>${esc(p.name)}</b><span class="tag">${esc(p.type)}</span>`;
    $('#sbType').textContent = p.type;
    Editor.renderTree();
    Bus.emit('project', p);
    if (p.main) await Editor.open(p.main);
    else showView('editor');
    setStatus(`Proyecto ${p.name} abierto`);
  }

  async function openProjectDialog() {
    const d = await call('dialog:openFolder', 'Abrir proyecto (carpeta del sketch, PlatformIO o ESP-IDF)');
    if (d) openProject(d);
  }

  async function newProject(template) {
    const tpls = Dashboard.templates().length ? Dashboard.templates() : await call('project:templates');
    const r = await modal('Nuevo proyecto', [
      { id: 'name', label: 'Nombre del proyecto', value: template ? template.replace(/-/g, '_') : 'mi_proyecto' },
      { id: 'template', label: 'Plantilla', type: 'select', value: template || 'blink', options: tpls.map((t) => ({ value: t.id, label: `${t.name} — ${t.category}` })) }
    ], 'Crear');
    if (!r || !r.name) return;
    const created = await call('project:create', { name: r.name, template: r.template });
    toast('Proyecto creado', 'success');
    const tpl = tpls.find((t) => t.id === r.template);
    if (tpl?.fqbn && tpl.fqbn !== State.settings.fqbn) await selectBoard(tpl.fqbn);
    await openProject(created.projectDir);
    if (tpl?.libraries?.length && State.tools?.arduinoCli?.path) {
      setStatus('Instalando librerías de la plantilla…', 'busy');
      for (const lib of tpl.libraries) {
        try {
          const r = await call('lib:action', 'install', lib);
          toast(r.ok ? `Librería instalada: ${lib}` : `No se pudo instalar ${lib}`, r.ok ? 'success' : 'error');
        } catch {
          /* el toast ya muestra el error */
        }
      }
      setStatus('Listo');
    }
  }

  // ---------- Compilación / carga ----------
  function progress(on) {
    $('#buildProgress').classList.toggle('on', on);
    State.busy = on;
    ['#btnVerify', '#btnUpload'].forEach((s) => ($(s).disabled = on));
  }

  function openPanel(name) {
    $$('.ptab').forEach((t) => t.classList.toggle('active', t.dataset.panel === name));
    $$('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
  }

  async function compile(opts = {}) {
    if (!State.project) {
      toast('Abre o crea un proyecto primero', 'error');
      return false;
    }
    if (State.busy) return false;
    if (State.settings.autoSave) await Editor.saveAll();
    if (!opts.silentView) showView('editor');
    openPanel('output');
    $('#buildOutput').textContent = '';
    progress(true);
    setStatus('Compilando…', 'busy');
    let r;
    try {
      r = await call('build:compile', State.project.projectDir, { fqbn: State.settings.fqbn });
    } catch {
      progress(false);
      setStatus('Error', 'error');
      return false;
    }
    progress(false);
    State.settings.lastBuild = r;
    Editor.setDiagnostics(r.diagnostics);
    Bus.emit('build', r);
    if (r.ok) {
      const f = r.memory.flash;
      setStatus(`Compilado en ${r.seconds}s${f ? ` · Flash ${f.pct}%` : ''}`);
      toast(`Compilación correcta (${r.seconds}s)`, 'success');
    } else {
      setStatus('Error de compilación', 'error');
      toast('Error de compilación. Revisa Problemas.', 'error');
      if (r.diagnostics.some((d) => d.severity === 'error')) openPanel('problems');
    }
    return r.ok;
  }

  async function upload() {
    if (!State.project) return toast('Abre o crea un proyecto primero', 'error');
    if (!State.settings.port) return toast('Selecciona un puerto COM', 'error');
    const ok = await compile();
    if (!ok) return;
    progress(true);
    setStatus(`Cargando en ${State.settings.port}…`, 'busy');
    try {
      const r = await Monitor.pauseForUpload(() => call('build:upload', State.project.projectDir, { fqbn: State.settings.fqbn, port: State.settings.port }));
      setStatus(r.ok ? 'Carga completada' : 'La carga falló', r.ok ? 'idle' : 'error');
      toast(r.ok ? 'Firmware cargado en la placa' : 'La carga falló', r.ok ? 'success' : 'error');
    } catch {
      setStatus('La carga falló', 'error');
    }
    progress(false);
  }

  // ---------- Interfaz ----------
  function bindChrome() {
    $$('.nav-item').forEach((b) => {
      b.onclick = () => showView(b.dataset.view);
    });
    $$('[data-win]').forEach((b) => {
      b.onclick = () => window.api.invoke(`win:${b.dataset.win}`);
    });
    $('#btnVerify').onclick = () => compile();
    $('#btnUpload').onclick = upload;
    $('#btnSimulate').onclick = () => (Simulator.running ? Simulator.stop() : Simulator.start());
    $('#boardSelect').onchange = (e) => selectBoard(e.target.value);
    $('#portSelect').onchange = (e) => e.target.value && selectPort(e.target.value);
    $('#refreshPorts').onclick = () => refreshPorts();
    $$('.ptab').forEach((t) => {
      t.onclick = () => openPanel(t.dataset.panel);
    });
    $('#clearOutput').onclick = () => {
      $('#buildOutput').textContent = '';
      $('#miniSerial').textContent = '';
    };
    $('#cancelBuild').onclick = () => window.api.invoke('build:cancel');

    // Divisor redimensionable del panel inferior
    const splitter = $('#splitter');
    const panel = $('#bottomPanel');
    splitter.onmousedown = (e) => {
      const startY = e.clientY;
      const startH = panel.offsetHeight;
      const move = (ev) => {
        panel.style.height = Math.max(90, Math.min(window.innerHeight * 0.7, startH + startY - ev.clientY)) + 'px';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    };
    $('.titlebar').ondblclick = (e) => !e.target.closest('.no-drag') && window.api.invoke('win:maximize');

    // Atajos de teclado estilo Arduino IDE
    document.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        showView('reference');
      } else if (ctrl && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        compile();
      } else if (ctrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        upload();
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.shiftKey ? Editor.saveAll() : Editor.save();
      } else if (ctrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        newProject();
      } else if (ctrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openProjectDialog();
      } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        showView('monitor');
      } else if (e.key === 'F5') {
        e.preventDefault();
        Simulator.running ? Simulator.stop() : Simulator.start();
      }
    });

    window.api.onBuildLog(({ text, stream }) => appendConsole($('#buildOutput'), text, stream));
    window.addEventListener('beforeunload', (e) => {
      if (Editor.tabs.some((t) => t.dirty) && !confirm('Hay archivos sin guardar. ¿Salir de todos modos?')) e.returnValue = false;
    });
  }

  async function init() {
    renderIcons();
    State.settings = await window.api.invoke('settings:get');
    applyBranding(await window.api.invoke('branding:get'));
    renderBoards();
    renderPorts();
    bindChrome();
    Editor.bindExplorer();
    Dashboard.bind();
    Simulator.bind();
    Monitor.bind();
    Tools.bind();
    Reference.bind();
    Dashboard.render();
    Editor.renderTree();
    Editor.init();
    setStatus('Listo');
    Tools.refresh();
    loadBoards();
    refreshPorts(true);
    // Sondeo ligero de puertos para detectar conexiones/desconexiones USB
    setInterval(() => !State.busy && !Monitor.connected && refreshPorts(true), 6000);
    // Reabrir el último proyecto
    const last = State.settings.recentProjects?.[0];
    if (last) {
      try {
        const p = await window.api.invoke('project:open', last);
        State.project = p;
        $('#tbProject').textContent = p.name;
        $('#exProject').innerHTML = `${iconSvg('folder', 14)}<b>${esc(p.name)}</b><span class="tag">${esc(p.type)}</span>`;
        Editor.renderTree();
        Bus.emit('project', p);
      } catch {
        /* el proyecto ya no existe */
      }
    }
  }

  return { init, applyBranding, openProject, openProjectDialog, newProject, compile, upload, refreshPorts, selectPort, loadBoards };
})();

window.addEventListener('DOMContentLoaded', () => App.init());
