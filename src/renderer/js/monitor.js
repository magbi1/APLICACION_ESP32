// Monitor serie (vía arduino-cli monitor) y plotter en tiempo real.
const Monitor = (() => {
  let connected = false;
  let paused = false;
  let lineBuf = '';
  let atLineStart = true;
  const series = new Map(); // nombre -> number[]
  const MAX_POINTS = 400;
  const PALETTE = ['#00d4ff', '#3ddc84', '#ff9f43', '#f472b6', '#b07cff', '#facc15', '#ff5c6c', '#22d3ee'];
  let raf = 0;

  function stamp(text) {
    if (!$('#monTimestamps').checked) return text;
    let out = '';
    for (const ch of text) {
      if (atLineStart && ch !== '\n') {
        const d = new Date();
        out += `[${d.toLocaleTimeString()}.${String(d.getMilliseconds()).padStart(3, '0')}] `;
        atLineStart = false;
      }
      out += ch;
      if (ch === '\n') atLineStart = true;
    }
    return out;
  }

  function onData({ text, stream }) {
    const out = $('#monOutput');
    const auto = $('#monAutoscroll').checked;
    const t = stamp(text);
    appendConsole(out, t, stream);
    if (auto) out.scrollTop = out.scrollHeight;
    appendConsole($('#miniSerial'), text, stream);
    parsePlot(text);
  }

  function parsePlot(text) {
    lineBuf += text;
    const lines = lineBuf.split(/\r?\n/);
    lineBuf = lines.pop();
    if (paused) return;
    for (const line of lines) {
      const tokens = line.trim().split(/[,\t ]+/).filter(Boolean);
      if (!tokens.length) continue;
      let idx = 0;
      let any = false;
      for (const tok of tokens) {
        const m = tok.match(/^([A-Za-z_][\w.]*)[:=](-?\d+(?:\.\d+)?(?:e-?\d+)?)$/i);
        let name, val;
        if (m) {
          name = m[1];
          val = parseFloat(m[2]);
        } else if (/^-?\d+(?:\.\d+)?(?:e-?\d+)?$/i.test(tok)) {
          name = `v${++idx}`;
          val = parseFloat(tok);
        } else {
          continue;
        }
        any = true;
        if (!series.has(name)) series.set(name, []);
        const arr = series.get(name);
        arr.push(val);
        if (arr.length > MAX_POINTS) arr.shift();
      }
      if (any) schedule();
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function draw() {
    raf = 0;
    const canvas = $('#plotter');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height, padL = 48, padR = 12, padT = 12, padB = 22;
    ctx.clearRect(0, 0, W, H);
    let min = Infinity, max = -Infinity;
    series.forEach((a) => a.forEach((v) => {
      if (v < min) min = v;
      if (v > max) max = v;
    }));
    if (!isFinite(min)) {
      ctx.fillStyle = '#5c6d8a';
      ctx.font = '13px Segoe UI, sans-serif';
      ctx.fillText('Esperando datos numéricos…  ej.: Serial.printf("temp:%f,hum:%f\\n", t, h);', padL, H / 2);
      $('#plotLegend').innerHTML = '';
      return;
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    min -= range * 0.08;
    max += range * 0.08;
    // Rejilla
    ctx.strokeStyle = 'rgba(120,150,200,0.12)';
    ctx.fillStyle = '#6b7fa3';
    ctx.font = '11px Consolas, monospace';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padT + ((H - padT - padB) * i) / 5;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const val = max - ((max - min) * i) / 5;
      ctx.fillText(val.toFixed(Math.abs(val) < 10 ? 2 : 0), 4, y + 4);
    }
    let k = 0;
    const legend = [];
    series.forEach((arr, name) => {
      const color = PALETTE[k++ % PALETTE.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = padL + ((W - padL - padR) * i) / (MAX_POINTS - 1);
        const y = padT + (H - padT - padB) * (1 - (v - min) / (max - min));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
      legend.push(`<span><i style="background:${color}"></i>${esc(name)} <b>${arr[arr.length - 1]}</b></span>`);
    });
    $('#plotLegend').innerHTML = legend.join('');
  }

  function setConnected(on) {
    connected = on;
    const b = $('#monConnect');
    b.innerHTML = on ? `${iconSvg('unlink')}Desconectar` : `${iconSvg('link')}Conectar`;
    b.classList.toggle('danger', on);
    b.classList.toggle('primary', !on);
  }

  async function connect() {
    if (connected) return disconnect();
    try {
      const r = await call('monitor:start', { port: State.settings.port, baudrate: Number($('#monBaud').value) });
      setConnected(true);
      appendConsole($('#monOutput'), `▶ Conectado a ${r.port} @ ${r.baud} baudios\n`, 'stdout');
      setStatus(`Monitor serie ${r.port} @ ${r.baud}`);
    } catch {
      /* el toast ya muestra el error */
    }
  }

  async function disconnect() {
    await call('monitor:stop');
    setConnected(false);
    setStatus('Monitor desconectado');
  }

  /** Libera el puerto antes de cargar y lo reabre al terminar. */
  async function pauseForUpload(fn) {
    const was = connected;
    if (was) await disconnect();
    try {
      return await fn();
    } finally {
      if (was) setTimeout(connect, 800);
    }
  }

  function send() {
    const inp = $('#monInput');
    if (!connected) return toast('Conecta el monitor primero', 'error');
    const eol = { '\\n': '\n', '\\r\\n': '\r\n', '\\r': '\r' }[$('#monEol').value] || '';
    call('monitor:send', inp.value + eol);
    appendConsole($('#monOutput'), `» ${inp.value}\n`, 'stdout');
    inp.value = '';
  }

  function bind() {
    $('#monBaud').value = String(State.settings.baudrate || 115200);
    $('#monBaud').onchange = () => call('settings:set', { baudrate: Number($('#monBaud').value) });
    $('#monConnect').onclick = connect;
    $('#monClear').onclick = () => {
      $('#monOutput').textContent = '';
    };
    $('#monSave').onclick = async () => {
      const f = await call('dialog:saveFile', `serial-${Date.now()}.log`);
      if (f) {
        await call('file:write', f, $('#monOutput').textContent);
        toast('Registro exportado', 'success');
      }
    };
    $('#monSend').onclick = send;
    $('#monInput').onkeydown = (e) => e.key === 'Enter' && send();
    $('#plotPause').onclick = () => {
      paused = !paused;
      $('#plotPause').textContent = paused ? 'Reanudar' : 'Pausar';
    };
    $('#plotClear').onclick = () => {
      series.clear();
      schedule();
    };
    window.api.onMonitorData(onData);
    window.api.onMonitorExit(() => {
      if (connected) appendConsole($('#monOutput'), '\n■ Puerto cerrado\n', 'stderr');
      setConnected(false);
    });
    window.addEventListener('resize', schedule);
    Bus.on('view', (v) => v === 'monitor' && schedule());
  }

  return { bind, connect, disconnect, pauseForUpload, get connected() { return connected; } };
})();
