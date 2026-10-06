// Ajustes, instalación de herramientas, flash (esptool), librerías y pinout.
const Tools = (() => {
  const TOOL_INFO = [
    { key: 'arduinoCli', name: 'arduino-cli', desc: 'Compilador y cargador oficial de Arduino.', install: 'arduinoCli', ok: (t) => !!t.arduinoCli.path, detail: (t) => t.arduinoCli.version || t.arduinoCli.path },
    { key: 'esp32Core', name: 'Núcleo ESP32', desc: 'arduino-esp32 de Espressif: toolchains Xtensa/RISC‑V, esptool y librerías.', install: 'esp32Core', ok: (t) => t.esp32Core.installed, detail: (t) => (t.esp32Core.version ? 'v' + t.esp32Core.version : '') },
    { key: 'wokwi', name: 'Wokwi CLI', desc: 'Simulador de ESP32 con periféricos (LEDs, sensores, pantallas). Requiere token gratuito.', install: 'wokwi', ok: (t) => !!t.wokwi.path, detail: (t) => `${t.wokwi.version || t.wokwi.path} ${t.wokwi.token ? '· token ✔' : '· falta token'}` },
    { key: 'qemu', name: 'QEMU Espressif', desc: 'Emulador a nivel de instrucciones (ESP32, ESP32‑C3, ESP32‑S3). Se instala con ESP‑IDF.', install: 'qemu', ok: (t) => !!t.qemu.path, detail: (t) => t.qemu.path },
    { key: 'platformio', name: 'PlatformIO', desc: 'Sistema de compilación alternativo (proyectos con platformio.ini). Requiere Python.', install: 'platformio', ok: (t) => !!t.platformio.path, detail: (t) => t.platformio.version || t.platformio.path },
    { key: 'espIdf', name: 'ESP-IDF', desc: 'Framework oficial de Espressif. Instálalo con el instalador de Espressif para Windows.', install: null, url: 'https://dl.espressif.com/dl/esp-idf/', ok: (t) => !!t.espIdf.path, detail: (t) => t.espIdf.path }
  ];

  async function refresh() {
    State.tools = null;
    Bus.emit('tools');
    try {
      State.tools = await call('tools:status');
    } catch {
      return;
    }
    Bus.emit('tools');
    renderToolCards();
  }

  function renderToolCards() {
    const t = State.tools;
    if (!t) return;
    $('#toolCards').innerHTML = TOOL_INFO.map((i) => {
      const ok = i.ok(t);
      return `<div class="tool-card ${ok ? 'ok' : ''}">
        <div class="tool-card-head"><span class="dot"></span><b>${esc(i.name)}</b></div>
        <p>${esc(i.desc)}</p>
        <small class="muted ellipsis" title="${esc(i.detail(t) || '')}">${esc(ok ? i.detail(t) || 'Instalado' : 'No instalado')}</small>
        ${i.install ? `<button class="btn sm ${ok ? 'ghost' : 'primary'}" data-install="${i.install}">${ok ? 'Reinstalar / actualizar' : 'Instalar'}</button>` : `<button class="btn sm ghost" data-url="${i.url}">Descargar</button>`}
      </div>`;
    }).join('');
    $$('#toolCards [data-install]').forEach((b) => {
      b.onclick = () => install(b.dataset.install);
    });
    $$('#toolCards [data-url]').forEach((b) => {
      b.onclick = () => call('shell:openExternal', b.dataset.url);
    });
  }

  async function install(what) {
    showView('settings');
    const out = $('#toolsOutput');
    appendConsole(out, `\n▶ Instalando ${what}…\n`, 'stdout');
    setStatus(`Instalando ${what}…`, 'busy');
    try {
      await call('tools:install', what);
      appendConsole(out, `✔ ${what} listo\n`, 'stdout');
      toast(`${what} instalado`, 'success');
      setStatus('Listo');
      if (what === 'esp32Core') App.loadBoards();
    } catch (err) {
      appendConsole(out, `✖ ${err.message}\n`, 'stderr');
      setStatus('Error de instalación', 'error');
    }
    refresh();
  }

  function fillSettings() {
    const s = State.settings;
    const b = State.branding;
    $('#setAppName').value = s.appName || b.appName || '';
    $('#setCompany').value = s.company || b.company || '';
    $('#setWorkspace').value = s.workspaceDir || '';
    $('#setUploadSpeed').value = String(s.uploadSpeed || 921600);
    $('#setFontSize').value = s.fontSize || 14;
    $('#setWokwiToken').value = s.wokwiToken || '';
    $('#setAutoSave').checked = !!s.autoSave;
    $('#setVerbose').checked = !!s.verboseBuild;
    $('#pathArduino').value = s.arduinoCliPath || '';
    $('#pathWokwi').value = s.wokwiCliPath || '';
    $('#pathEsptool').value = s.esptoolPath || '';
    $('#pathQemu').value = s.qemuPath || '';
    $('#pathPio').value = s.platformioPath || '';
    $('#pathIdf').value = s.idfPath || '';
    $('#setLogo').src = fileUrl(b.logo);
    $('#setLogo2').src = fileUrl(b.logoSecondary);
  }

  async function saveSettings(patch, msg = 'Ajustes guardados') {
    State.settings = await call('settings:set', patch);
    Bus.emit('settings');
    toast(msg, 'success');
  }

  // ---------- Flash ----------
  async function esptool(action) {
    const out = $('#flashOutput');
    const opts = { chip: $('#flChip').value, baud: Number($('#flBaud').value) };
    if (action === 'write_flash') {
      opts.file = $('#flFile').value.trim();
      opts.address = $('#flAddr').value.trim() || '0x10000';
      if (!opts.file) return toast('Selecciona un archivo .bin', 'error');
    }
    if (action === 'read_flash') {
      const f = await call('dialog:saveFile', 'flash_backup.bin');
      if (!f) return;
      opts.file = f;
    }
    if (action === 'erase_flash' && !confirm('Se borrará TODA la memoria flash del chip. ¿Continuar?')) return;
    out.textContent = '';
    setStatus(`esptool ${action}…`, 'busy');
    try {
      const r = await Monitor.pauseForUpload(() => call('esptool:run', action, opts));
      setStatus(r.ok ? 'esptool terminado' : 'esptool falló', r.ok ? 'idle' : 'error');
    } catch {
      setStatus('esptool falló', 'error');
    }
  }

  // ---------- Librerías ----------
  async function searchLibs(installed) {
    const el = $('#libList');
    el.innerHTML = '<p class="muted pad">Buscando…</p>';
    try {
      const list = installed ? await call('lib:installed') : await call('lib:search', $('#libQuery').value.trim());
      if (!list.length) {
        el.innerHTML = '<p class="muted pad">Sin resultados.</p>';
        return;
      }
      el.innerHTML = list.map((l) => `
        <div class="lib">
          <div class="lib-icon">${iconSvg('book', 18)}</div>
          <div class="lib-meta"><b>${esc(l.name)}</b> <span class="muted">v${esc(l.version || '')}${l.author ? ' · ' + esc(l.author) : ''}</span><p>${esc(l.sentence)}</p></div>
          ${installed
            ? `<button class="btn sm danger" data-lib="${esc(l.name)}" data-act="uninstall">Desinstalar</button>`
            : `<button class="btn sm primary" data-lib="${esc(l.name)}" data-act="install">Instalar</button>`}
        </div>`).join('');
      $$('#libList [data-lib]').forEach((b) => {
        b.onclick = async () => {
          b.disabled = true;
          b.textContent = '…';
          try {
            const r = await call('lib:action', b.dataset.act, b.dataset.lib);
            toast(r.ok ? `${b.dataset.lib}: ${b.dataset.act === 'install' ? 'instalada' : 'desinstalada'}` : 'La operación falló', r.ok ? 'success' : 'error');
            b.textContent = r.ok ? '✔' : 'Error';
          } catch {
            b.textContent = 'Error';
          }
        };
      });
    } catch (err) {
      el.innerHTML = `<p class="muted pad">${esc(err.message)}</p>`;
    }
  }

  // ---------- Pinout ----------
  function renderPinout() {
    const chip = $('#pinChip').value;
    const data = PINOUTS[chip];
    const f = $('#pinFilter').value.trim().toLowerCase();
    const pins = data.pins.filter(([g, fn, tags, note]) => !f || `gpio${g} ${fn} ${tags.map((t) => PIN_TAGS[t]).join(' ')} ${note}`.toLowerCase().includes(f));
    $('#pinout').innerHTML = `<div class="pin-note">${iconSvg('info', 14)} ${esc(data.note)}</div>
      <div class="pin-legend">${Object.entries(PIN_TAGS).map(([k, v]) => `<span class="ptag ${k}">${v}</span>`).join('')}</div>
      <div class="pin-grid">${pins.map(([g, fn, tags, note]) => `
        <div class="pin-card ${tags.includes('flash') ? 'danger' : tags.includes('strap') ? 'warn' : ''}">
          <div class="pin-num">GPIO<b>${g}</b></div>
          <div class="pin-body"><div class="pin-fn">${esc(fn)}</div><div class="pin-tags">${tags.map((t) => `<span class="ptag ${t}">${PIN_TAGS[t]}</span>`).join('')}</div><small>${esc(note)}</small></div>
        </div>`).join('')}</div>`;
  }

  function bind() {
    $('#setRefreshTools').onclick = refresh;
    $('#pickLogo').onclick = async () => {
      const b = await call('branding:pickLogo', 'logo');
      if (b) App.applyBranding(b);
    };
    $('#pickLogo2').onclick = async () => {
      const b = await call('branding:pickLogo', 'logoSecondary');
      if (b) App.applyBranding(b);
    };
    $('#saveBrand').onclick = async () => {
      await saveSettings({ appName: $('#setAppName').value.trim(), company: $('#setCompany').value.trim() }, 'Marca actualizada');
      App.applyBranding(await call('branding:get'));
    };
    $('#resetBrand').onclick = async () => {
      App.applyBranding(await call('branding:reset'));
      State.settings = await call('settings:get');
      fillSettings();
    };
    $('#pickWorkspace').onclick = async () => {
      const d = await call('dialog:openFolder', 'Carpeta de trabajo');
      if (d) $('#setWorkspace').value = d;
    };
    $('#savePrefs').onclick = async () => {
      await saveSettings({
        workspaceDir: $('#setWorkspace').value.trim(),
        uploadSpeed: Number($('#setUploadSpeed').value),
        fontSize: Number($('#setFontSize').value) || 14,
        wokwiToken: $('#setWokwiToken').value.trim(),
        autoSave: $('#setAutoSave').checked,
        verboseBuild: $('#setVerbose').checked
      });
      Editor.setFontSize(State.settings.fontSize);
      refresh();
    };
    $('#savePaths').onclick = async () => {
      await saveSettings({
        arduinoCliPath: $('#pathArduino').value.trim(),
        wokwiCliPath: $('#pathWokwi').value.trim(),
        esptoolPath: $('#pathEsptool').value.trim(),
        qemuPath: $('#pathQemu').value.trim(),
        platformioPath: $('#pathPio').value.trim(),
        idfPath: $('#pathIdf').value.trim()
      }, 'Rutas guardadas');
      refresh();
    };
    $$('[data-url]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        call('shell:openExternal', a.dataset.url);
      });
    });
    // Flash
    $$('[data-esptool]').forEach((b) => {
      b.onclick = () => esptool(b.dataset.esptool);
    });
    $('#flPick').onclick = async () => {
      const f = await call('dialog:openFile', [{ name: 'Binarios', extensions: ['bin'] }]);
      if (f) $('#flFile').value = f;
    };
    // Librerías
    $('#libSearch').onclick = () => searchLibs(false);
    $('#libQuery').onkeydown = (e) => e.key === 'Enter' && searchLibs(false);
    $('#libInstalled').onclick = () => searchLibs(true);
    // Pinout
    $('#pinChip').onchange = renderPinout;
    $('#pinFilter').oninput = renderPinout;
    window.api.onToolsLog(({ text, stream }) => {
      appendConsole($('#toolsOutput'), text, stream);
      appendConsole($('#flashOutput'), text, stream);
    });
    Bus.on('view', (v) => {
      if (v === 'settings') {
        fillSettings();
        renderToolCards();
      }
      if (v === 'pinout') renderPinout();
      if (v === 'libraries' && !$('#libList').children.length) searchLibs(true).catch(() => {});
    });
  }

  return { bind, refresh, install, fillSettings, renderPinout };
})();
