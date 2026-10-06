// Vista de simulación: Wokwi / QEMU, consola y diseñador visual de diagram.json.
const Simulator = (() => {
  let engine = 'wokwi';
  let diagram = null;
  let diagramFile = '';
  let running = false;

  const chip = () => {
    const board = (State.settings.fqbn || '').split(':')[2] || 'esp32';
    const m = board.match(/esp32(s2|s3|c3|c6|h2)?/);
    return m ? 'esp32' + (m[1] || '') : 'esp32';
  };

  function boardPart() {
    return diagram?.parts.find((p) => p.type.startsWith('board-esp32')) || null;
  }

  function setRunning(on, label) {
    running = on;
    $('#simStart').disabled = on;
    $('#simStop').disabled = !on;
    $('#simState').textContent = label || (on ? 'En ejecución' : 'Detenido');
    $('#simState').className = 'sim-state' + (on ? ' on' : '');
    $('#btnSimulate').classList.toggle('running', on);
  }

  async function loadDiagram() {
    if (!State.project) {
      diagram = null;
      renderDesigner();
      return;
    }
    try {
      const r = await call('sim:diagram', State.project.projectDir, chip());
      diagramFile = r.file;
      diagram = JSON.parse(r.content);
      diagram.parts = diagram.parts || [];
      diagram.connections = diagram.connections || [];
    } catch {
      diagram = null;
    }
    renderDesigner();
  }

  async function saveDiagram(silent) {
    if (!diagram || !diagramFile) return;
    await call('file:write', diagramFile, JSON.stringify(diagram, null, 2));
    // sincronizar si está abierto en el editor
    const tab = Editor.tabs.find((t) => t.path === diagramFile);
    if (tab && tab.model) tab.model.setValue(JSON.stringify(diagram, null, 2));
    !silent && toast('diagram.json guardado', 'success');
  }

  function connectionOf(endpoint) {
    return diagram.connections.find((c) => c[0] === endpoint || c[1] === endpoint);
  }

  function otherEnd(c, endpoint) {
    return c[0] === endpoint ? c[1] : c[0];
  }

  function wireColor(target) {
    if (/GND/i.test(target)) return 'black';
    if (/3V3|5V|VCC/i.test(target)) return 'red';
    const palette = ['green', 'blue', 'orange', 'purple', 'cyan', 'magenta', 'gold'];
    return palette[(diagram.connections.length) % palette.length];
  }

  function setConnection(endpoint, target) {
    diagram.connections = diagram.connections.filter((c) => c[0] !== endpoint && c[1] !== endpoint);
    if (target) diagram.connections.push([endpoint, target, wireColor(target), []]);
  }

  function partMeta(type) {
    return WOKWI_PARTS.find((p) => p.type === type) || { name: type, pins: [], prefix: 'p' };
  }

  function targetsFor(selfId) {
    const bp = boardPart();
    const opts = [];
    if (bp) {
      const pins = WOKWI_BOARD_PINS[chip()] || WOKWI_BOARD_PINS.esp32;
      pins.forEach((p) => opts.push({ value: `${bp.id}:${p}`, label: /^\d+$/.test(p) ? `GPIO${p}` : p }));
    }
    diagram.parts.filter((p) => p !== bp && p.id !== selfId).forEach((p) => {
      partMeta(p.type).pins.forEach((pin) => opts.push({ value: `${p.id}:${pin}`, label: `${p.id}.${pin}` }));
    });
    return opts;
  }

  function renderDesigner() {
    const table = $('#partsTable');
    const svgHost = $('#circuit');
    if (!diagram) {
      table.innerHTML = '<p class="muted pad">Abre un proyecto para diseñar su circuito.</p>';
      svgHost.innerHTML = '';
      return;
    }
    const bp = boardPart();
    const parts = diagram.parts.filter((p) => p !== bp);
    if (!parts.length) {
      table.innerHTML = `<p class="muted pad">Sin componentes. Pulsa «Componente» para añadir LEDs, sensores, pantallas…</p>`;
    } else {
      table.innerHTML = parts.map((p) => {
        const meta = partMeta(p.type);
        const opts = targetsFor(p.id);
        const pins = meta.pins.map((pin) => {
          const ep = `${p.id}:${pin}`;
          const c = connectionOf(ep);
          const cur = c ? otherEnd(c, ep) : '';
          return `<label class="pin-sel"><span>${esc(pin)}</span><select data-ep="${esc(ep)}"><option value="">—</option>${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === cur ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
        }).join('');
        const attrs = Object.entries(p.attrs || {}).map(([k, v]) => `${k}=${v}`).join(', ');
        return `<div class="part-row">
          <div class="part-head"><b>${esc(p.id)}</b><span class="muted">${esc(meta.name)}</span>
            <input class="attrs" data-id="${esc(p.id)}" value="${esc(attrs)}" placeholder="atributos: color=red" title="Atributos (clave=valor, separados por coma)" />
            <button class="icon-btn sm" data-del="${esc(p.id)}" title="Eliminar">${iconSvg('trash', 13)}</button></div>
          <div class="pins">${pins}</div></div>`;
      }).join('');
    }
    $$('#partsTable select[data-ep]').forEach((s) => {
      s.onchange = () => {
        setConnection(s.dataset.ep, s.value);
        renderDesigner();
        saveDiagram(true);
      };
    });
    $$('#partsTable [data-del]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.del;
        diagram.parts = diagram.parts.filter((p) => p.id !== id);
        diagram.connections = diagram.connections.filter((c) => !c[0].startsWith(id + ':') && !c[1].startsWith(id + ':'));
        renderDesigner();
        saveDiagram(true);
      };
    });
    $$('#partsTable input.attrs').forEach((inp) => {
      inp.onchange = () => {
        const p = diagram.parts.find((x) => x.id === inp.dataset.id);
        p.attrs = {};
        inp.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((kv) => {
          const [k, ...v] = kv.split('=');
          if (k) p.attrs[k.trim()] = v.join('=').trim();
        });
        saveDiagram(true);
        renderSvg();
      };
    });
    renderSvg();
  }

  const COLORS = { black: '#8a94a8', red: '#ff5c6c', green: '#3ddc84', blue: '#4f9dff', orange: '#ff9f43', purple: '#b07cff', cyan: '#22d3ee', magenta: '#f472b6', gold: '#facc15', white: '#e5e7eb', gray: '#9ca3af', yellow: '#facc15', violet: '#a78bfa' };

  function renderSvg() {
    const host = $('#circuit');
    const bp = boardPart();
    if (!diagram || !bp) {
      host.innerHTML = '';
      return;
    }
    const parts = diagram.parts.filter((p) => p !== bp);
    const boardPins = [...new Set(diagram.connections
      .filter((c) => !c[0].startsWith('$') && !c[1].startsWith('$'))
      .flatMap((c) => [c[0], c[1]])
      .filter((e) => e.startsWith(bp.id + ':'))
      .map((e) => e.split(':')[1]))];
    const rowH = 22;
    const boardH = Math.max(150, boardPins.length * rowH + 60);
    const partPos = {};
    let y = 20;
    parts.forEach((p) => {
      const pins = partMeta(p.type).pins;
      const h = Math.max(46, pins.length * 18 + 28);
      partPos[p.id] = { y, h, pins };
      y += h + 16;
    });
    const H = Math.max(boardH + 40, y + 10);
    const W = 620;
    const bx = 30, bw = 170, by = 20;
    const pinXY = {};
    boardPins.forEach((pin, i) => {
      pinXY[`${bp.id}:${pin}`] = { x: bx + bw, y: by + 44 + i * rowH };
    });
    const px = 400, pw = 190;
    parts.forEach((p) => {
      const pos = partPos[p.id];
      pos.pins.forEach((pin, i) => {
        pinXY[`${p.id}:${pin}`] = { x: px, y: pos.y + 30 + i * 18 };
      });
    });
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14304f"/><stop offset="1" stop-color="#0d1f36"/></linearGradient></defs>
      <rect x="${bx}" y="${by}" width="${bw}" height="${boardH}" rx="10" fill="url(#pcb)" stroke="var(--accent)" stroke-width="1.5"/>
      <rect x="${bx + 30}" y="${by + boardH / 2 - 28}" width="70" height="56" rx="4" fill="#1d2a40" stroke="#41587d"/>
      <text x="${bx + 65}" y="${by + boardH / 2 + 4}" text-anchor="middle" class="svg-chip">${esc(chip().toUpperCase())}</text>
      <text x="${bx + 12}" y="${by + 22}" class="svg-title">${esc(bp.id)}</text>`;
    boardPins.forEach((pin) => {
      const { x, y: yy } = pinXY[`${bp.id}:${pin}`];
      svg += `<circle cx="${x}" cy="${yy}" r="4" fill="#d4af37"/><text x="${x - 10}" y="${yy + 4}" text-anchor="end" class="svg-pin">${esc(/^\d+$/.test(pin) ? 'GPIO' + pin : pin)}</text>`;
    });
    parts.forEach((p) => {
      const pos = partPos[p.id];
      const meta = partMeta(p.type);
      const col = COLORS[p.attrs?.color] || 'var(--accent2)';
      svg += `<rect x="${px}" y="${pos.y}" width="${pw}" height="${pos.h}" rx="8" fill="#111c33" stroke="${col}" stroke-width="1.5"/>
        <text x="${px + pw - 10}" y="${pos.y + 18}" text-anchor="end" class="svg-title">${esc(p.id)}</text>
        <text x="${px + pw - 10}" y="${pos.y + 32}" text-anchor="end" class="svg-sub">${esc(meta.name)}</text>`;
      pos.pins.forEach((pin) => {
        const { x, y: yy } = pinXY[`${p.id}:${pin}`];
        svg += `<circle cx="${x}" cy="${yy}" r="3.5" fill="#d4af37"/><text x="${x + 9}" y="${yy + 4}" class="svg-pin">${esc(pin)}</text>`;
      });
    });
    diagram.connections.forEach((c) => {
      const a = pinXY[c[0]];
      const b = pinXY[c[1]];
      if (!a || !b) return;
      const color = COLORS[c[2]] || '#8a94a8';
      const loop = a.x === b.x;
      const d = loop
        ? `M${a.x},${a.y} C${a.x - 60},${a.y} ${b.x - 60},${b.y} ${b.x},${b.y}`
        : `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`;
      svg += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
    });
    svg += '</svg>';
    host.innerHTML = svg;
  }

  async function addPart() {
    if (!diagram) return toast('Abre un proyecto primero', 'error');
    const r = await modal('Añadir componente', [
      { id: 'type', label: 'Componente', type: 'select', value: 'wokwi-led', options: WOKWI_PARTS.map((p) => ({ value: p.type, label: p.name })) }
    ], 'Añadir');
    if (!r) return;
    const meta = partMeta(r.type);
    let n = 1;
    while (diagram.parts.some((p) => p.id === `${meta.prefix}${n}`)) n++;
    const id = `${meta.prefix}${n}`;
    const count = diagram.parts.length;
    diagram.parts.push({ type: r.type, id, top: -120 + (count % 4) * 90, left: 220 + Math.floor(count / 4) * 140, attrs: { ...meta.attrs } });
    // Conexiones sugeridas de alimentación / bus
    const bp = boardPart();
    if (bp && meta.hint) {
      const pins = WOKWI_BOARD_PINS[chip()] || [];
      Object.entries(meta.hint).forEach(([pin, target]) => {
        if (target === 'GPIO') return;
        const match = pins.find((p) => p === target) || pins.find((p) => p.startsWith(target + '.')) || pins.find((p) => p.startsWith(target));
        if (match) setConnection(`${id}:${pin}`, `${bp.id}:${match}`);
      });
    }
    renderDesigner();
    saveDiagram(true);
  }

  async function start() {
    if (!State.project) return toast('Abre un proyecto primero', 'error');
    if (running) return;
    showView('simulator');
    $('#simOutput').textContent = '';
    await saveDiagram(true);
    setRunning(true, 'Compilando…');
    const ok = await App.compile({ silentView: true });
    if (!ok) {
      setRunning(false, 'Error de compilación');
      appendConsole($('#simOutput'), '✖ La compilación falló. Revisa la pestaña Problemas en el editor.\n', 'stderr');
      return;
    }
    setRunning(true, engine === 'qemu' ? 'QEMU en ejecución' : 'Wokwi en ejecución');
    try {
      await call('sim:start', State.project.projectDir, {
        engine,
        fqbn: State.settings.fqbn,
        timeout: Math.max(0, Number($('#simTimeout').value) || 0) * 1000,
        expectText: $('#simExpect').value.trim() || undefined
      });
      setStatus(`Simulando con ${engine === 'qemu' ? 'QEMU' : 'Wokwi'}`, 'busy');
    } catch (err) {
      setRunning(false, 'Error');
      appendConsole($('#simOutput'), `✖ ${err.message}\n`, 'stderr');
    }
  }

  async function stop() {
    await call('sim:stop');
    setRunning(false);
    setStatus('Simulación detenida');
  }

  function bind() {
    $$('#simEngine button').forEach((b) => {
      b.onclick = () => {
        engine = b.dataset.engine;
        $$('#simEngine button').forEach((x) => x.classList.toggle('active', x === b));
      };
    });
    $('#simStart').onclick = start;
    $('#simStop').onclick = stop;
    $('#simAddPart').onclick = addPart;
    $('#simSaveDiagram').onclick = () => saveDiagram();
    $('#simWokwiWeb').onclick = async () => {
      if (diagram) {
        try {
          await navigator.clipboard.writeText(JSON.stringify(diagram, null, 2));
          toast('diagram.json copiado al portapapeles. Pégalo en la pestaña diagram.json de Wokwi.', 'success', 6000);
        } catch {
          /* sin portapapeles */
        }
      }
      call('shell:openExternal', `https://wokwi.com/projects/new/${chip() === 'esp32' ? 'esp32' : chip().replace('esp32', 'esp32-')}`);
    };
    const send = () => {
      const v = $('#simInput').value;
      if (!v) return;
      call('sim:send', v + '\n');
      appendConsole($('#simOutput'), `» ${v}\n`, 'stdout');
      $('#simInput').value = '';
    };
    $('#simSend').onclick = send;
    $('#simInput').onkeydown = (e) => e.key === 'Enter' && send();
    window.api.onSimLog(({ text, stream }) => appendConsole($('#simOutput'), text, stream));
    window.api.onSimExit((code) => {
      setRunning(false, code === 0 ? 'Finalizado' : `Terminó (código ${code})`);
      appendConsole($('#simOutput'), `\n■ Simulación terminada (código ${code})\n`, code === 0 ? 'stdout' : 'stderr');
      setStatus('Simulación terminada');
    });
  }

  Bus.on('project', loadDiagram);
  Bus.on('settings', () => State.project && renderDesigner());
  Bus.on('view', (v) => v === 'simulator' && State.project && !diagram && loadDiagram());

  return { bind, start, stop, loadDiagram, get running() { return running; } };
})();
