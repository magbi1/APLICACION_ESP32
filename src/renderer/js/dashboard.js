// Dashboard de inicio: KPIs, memoria, dispositivos, proyectos, herramientas y plantillas.
const Dashboard = (() => {
  let templates = [];

  const CATEGORY_ICON = { Básico: 'bulb', Conectividad: 'wifi', Sensores: 'thermometer', Pantallas: 'monitor', Energía: 'moon', RTOS: 'layers', 'ESP-IDF': 'cpu', PlatformIO: 'tool', Bluetooth: 'bluetooth' };

  function setGauge(id, data, label) {
    const el = $(id);
    const circ = 2 * Math.PI * 50;
    const pct = data ? Math.min(100, data.pct || (data.max ? (data.used / data.max) * 100 : 0)) : 0;
    const fg = el.querySelector('.g-fg');
    fg.style.strokeDasharray = `${circ}`;
    fg.style.strokeDashoffset = `${circ * (1 - pct / 100)}`;
    fg.classList.toggle('warn', pct > 75);
    fg.classList.toggle('crit', pct > 90);
    el.querySelector('.g-center b').textContent = data ? `${Math.round(pct)}%` : '—';
    el.querySelector('.g-center span').textContent = label;
    el.querySelector('.g-detail').textContent = data ? `${fmtBytes(data.used)}${data.max ? ' / ' + fmtBytes(data.max) : ''}` : 'Sin datos';
  }

  function renderBuild() {
    const b = State.settings.lastBuild;
    setGauge('#gaugeFlash', b?.memory?.flash, 'Flash');
    setGauge('#gaugeRam', b?.memory?.ram, 'RAM');
    $('#kpiBuild').textContent = b ? `${b.ok ? '✔' : '✖'} ${timeAgo(b.date)}` : '—';
    $('#memProject').textContent = b ? b.project : '';
    if (!b) return;
    const errors = (b.diagnostics || []).filter((d) => d.severity === 'error').length;
    const warns = (b.diagnostics || []).filter((d) => d.severity === 'warning').length;
    $('#buildSummary').innerHTML = `
      <div class="stat-row"><span>Estado</span><b class="${b.ok ? 'ok' : 'err'}">${b.ok ? 'Correcta' : 'Con errores'}</b></div>
      <div class="stat-row"><span>Proyecto</span><b>${esc(b.project)}</b></div>
      <div class="stat-row"><span>Sistema</span><b>${esc(b.type)}</b></div>
      <div class="stat-row"><span>Placa</span><b>${esc(b.fqbn)}</b></div>
      <div class="stat-row"><span>Tiempo</span><b>${esc(b.seconds)} s</b></div>
      <div class="stat-row"><span>Errores / avisos</span><b><span class="err">${errors}</span> / <span class="warn">${warns}</span></b></div>`;
  }

  function renderPorts() {
    $('#kpiPorts').textContent = State.ports.length;
    const el = $('#dashPorts');
    if (!State.ports.length) {
      el.innerHTML = `<li class="empty">${iconSvg('usb', 28)}<span>No hay placas conectadas.</span><small class="muted">Conecta tu ESP32 por USB. Si no aparece, instala el driver CP210x o CH340.</small></li>`;
      return;
    }
    el.innerHTML = State.ports.map((p) => `
      <li class="port ${p.address === State.settings.port ? 'selected' : ''}" data-port="${esc(p.address)}">
        <div class="port-dot"></div>
        <div class="port-info"><b>${esc(p.address)}</b><small>${esc(p.boards[0]?.name || p.bridge || p.label)}</small></div>
        <small class="muted">${p.vid ? `VID ${esc(p.vid)}` : ''}</small>
      </li>`).join('');
    $$('#dashPorts .port').forEach((li) => {
      li.onclick = () => App.selectPort(li.dataset.port);
    });
  }

  async function renderProjects() {
    let list = [];
    try {
      list = await call('project:list');
    } catch {
      /* ignorar */
    }
    list.sort((a, b) => b.modified.localeCompare(a.modified));
    const el = $('#dashProjects');
    if (!list.length) {
      el.innerHTML = `<div class="empty-projects">${iconSvg('folder', 32)}<p>Aún no tienes proyectos.</p><button class="btn primary sm" onclick="App.newProject()">Crear el primero</button></div>`;
      return;
    }
    const badge = { arduino: 'Arduino', platformio: 'PlatformIO', 'esp-idf': 'ESP-IDF' };
    el.innerHTML = list.slice(0, 12).map((p) => `
      <button class="project ${State.project?.projectDir === p.path ? 'current' : ''}" data-path="${esc(p.path)}" title="${esc(p.path)}">
        <div class="project-icon ${p.type}">${iconSvg(p.type === 'esp-idf' ? 'cpu' : p.type === 'platformio' ? 'tool' : 'code', 18)}</div>
        <div class="project-meta"><b>${esc(p.name)}</b><small>${badge[p.type]} · ${timeAgo(p.modified)}</small></div>
      </button>`).join('');
    $$('#dashProjects .project').forEach((b) => {
      b.onclick = () => App.openProject(b.dataset.path);
    });
  }

  function toolRow(name, ok, detail, action) {
    return `<li class="${ok ? 'ok' : 'missing'}"><span class="dot"></span><div><b>${esc(name)}</b><small>${esc(detail)}</small></div>${!ok && action ? `<button class="btn sm" data-install="${action}">Instalar</button>` : ''}</li>`;
  }

  function renderTools() {
    const t = State.tools;
    const el = $('#dashTools');
    if (!t) {
      el.innerHTML = '<li class="muted">Comprobando…</li>';
      return;
    }
    el.innerHTML = [
      toolRow('arduino-cli', !!t.arduinoCli.path, t.arduinoCli.version || 'No instalado', 'arduinoCli'),
      toolRow('Núcleo ESP32 (Espressif)', t.esp32Core.installed, t.esp32Core.version ? `v${t.esp32Core.version}` : 'No instalado', 'esp32Core'),
      toolRow('esptool', !!t.esptool.path, t.esptool.version || (t.esptool.path ? 'Disponible' : 'Se instala con el núcleo'), null),
      toolRow('Wokwi CLI (simulación)', !!t.wokwi.path, t.wokwi.path ? (t.wokwi.token ? 'Listo' : 'Falta token') : 'No instalado', 'wokwi'),
      toolRow('QEMU Espressif', !!t.qemu.path, t.qemu.path ? 'Disponible' : 'Opcional (vía ESP-IDF)', null),
      toolRow('PlatformIO', !!t.platformio.path, t.platformio.version || 'Opcional', null),
      toolRow('ESP-IDF', !!t.espIdf.path, t.espIdf.path || 'Opcional', null)
    ].join('');
    $$('#dashTools [data-install]').forEach((b) => {
      b.onclick = () => Tools.install(b.dataset.install);
    });
  }

  async function renderTemplates() {
    if (!templates.length) {
      try {
        templates = await call('project:templates');
      } catch {
        return;
      }
    }
    $('#dashTemplates').innerHTML = templates.map((t) => `
      <button class="template" data-id="${esc(t.id)}">
        <div class="template-icon">${iconSvg(CATEGORY_ICON[t.category] || 'code', 20)}</div>
        <div><b>${esc(t.name)}</b><small>${esc(t.description)}</small><span class="tag">${esc(t.category)}</span>${t.simulate ? '<span class="tag sim">Simulable</span>' : ''}</div>
      </button>`).join('');
    $$('#dashTemplates .template').forEach((b) => {
      b.onclick = () => App.newProject(b.dataset.id);
    });
  }

  function renderKpis() {
    $('#kpiProject').textContent = State.project ? State.project.name : '—';
    const board = State.boards.find((b) => b.fqbn === State.settings.fqbn);
    $('#kpiBoard').textContent = board ? board.name.replace(/\s*\(.*\)/, '') : State.settings.fqbn || '—';
  }

  function render() {
    renderKpis();
    renderBuild();
    renderPorts();
    renderTools();
    renderProjects();
    renderTemplates();
  }

  function bind() {
    $('#dashNew').onclick = () => App.newProject();
    $('#dashOpen').onclick = () => App.openProjectDialog();
    $('#dashGoTools').onclick = () => showView('settings');
    $('#dashRefreshPorts').onclick = () => App.refreshPorts();
    $('#dashRefreshTools').onclick = () => Tools.refresh();
    $('#dashWorkspace').onclick = () => call('shell:showItem', State.settings.workspaceDir);
  }

  Bus.on('ports', renderPorts);
  Bus.on('tools', renderTools);
  Bus.on('build', () => {
    renderBuild();
    renderProjects();
  });
  Bus.on('project', () => {
    renderKpis();
    renderProjects();
  });
  Bus.on('settings', renderKpis);
  Bus.on('view', (v) => v === 'dashboard' && render());

  return { render, bind, templates: () => templates };
})();
