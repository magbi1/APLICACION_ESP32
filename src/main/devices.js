'use strict';
// Puertos/placas conectadas, monitor serie, utilidades esptool y gestor de librerías.
const settings = require('./settings');
const toolchain = require('./toolchain');
const proc = require('./proc');

const IS_WIN = process.platform === 'win32';

// VID conocidos de puentes USB-serie usados en placas ESP32
const USB_BRIDGES = {
  '10C4': 'Silicon Labs CP210x',
  '1A86': 'WCH CH340/CH9102',
  '0403': 'FTDI',
  '303A': 'Espressif USB nativo'
};

async function listPorts() {
  const cli = toolchain.arduinoCli();
  const ports = [];
  if (cli) {
    const r = await proc.run(cli, ['board', 'list', '--format', 'json']);
    try {
      const j = JSON.parse(r.stdout || '[]');
      const list = Array.isArray(j) ? j : j.detected_ports || [];
      for (const item of list) {
        const p = item.port || item;
        if (!p.address) continue;
        const vid = (p.properties?.vid || '').replace(/^0x/i, '').toUpperCase();
        ports.push({
          address: p.address,
          label: p.label || p.address,
          protocol: p.protocol || 'serial',
          vid,
          pid: (p.properties?.pid || '').replace(/^0x/i, '').toUpperCase(),
          serial: p.properties?.serialNumber || '',
          bridge: USB_BRIDGES[vid] || p.protocol_label || '',
          boards: (item.matching_boards || []).map((b) => ({ name: b.name, fqbn: b.fqbn }))
        });
      }
    } catch {
      /* ignorar */
    }
  }
  if (!ports.length && IS_WIN) {
    const ps = "Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match '\\(COM\\d+\\)' } | ForEach-Object { $_.Name + '|' + $_.PNPDeviceID }";
    const r = await proc.run('powershell.exe', ['-NoProfile', '-Command', ps]);
    for (const line of r.stdout.split(/\r?\n/).filter(Boolean)) {
      const [name, id] = line.split('|');
      const com = (name.match(/\((COM\d+)\)/) || [])[1];
      const vid = ((id || '').match(/VID_([0-9A-F]{4})/i) || [])[1] || '';
      if (com) ports.push({ address: com, label: name, protocol: 'serial', vid, pid: '', bridge: USB_BRIDGES[vid.toUpperCase()] || '', boards: [] });
    }
  }
  return ports.filter((p) => p.protocol === 'serial');
}

function startMonitor(opts, onData, onExit) {
  const cli = toolchain.arduinoCli();
  if (!cli) throw new Error('arduino-cli no está instalado.');
  const s = settings.load();
  const port = opts.port || s.port;
  if (!port) throw new Error('Selecciona un puerto.');
  const baud = opts.baudrate || s.baudrate;
  const args = ['monitor', '-p', port, '--config', `baudrate=${baud}`, '--quiet'];
  proc.start('monitor', cli, args, { onData, onExit });
  return { ok: true, port, baud };
}

function stopMonitor() {
  return proc.stop('monitor');
}

function sendMonitor(text) {
  return proc.write('monitor', text);
}

/** Operaciones directas con esptool (info de chip, borrado, escritura de .bin). */
async function esptool(action, opts, onData) {
  const tool = toolchain.esptool();
  if (!tool) throw new Error('esptool no encontrado. Instala el núcleo ESP32 desde Herramientas.');
  const s = settings.load();
  const port = opts.port || s.port;
  if (!port) throw new Error('Selecciona un puerto.');
  const base = ['--port', port, '--baud', String(opts.baud || s.uploadSpeed)];
  if (opts.chip && opts.chip !== 'auto') base.unshift('--chip', opts.chip);
  const actions = {
    chip_id: ['chip_id'],
    flash_id: ['flash_id'],
    read_mac: ['read_mac'],
    erase_flash: ['erase_flash'],
    write_flash: ['write_flash', '-z', opts.address || '0x0', opts.file || ''],
    read_flash: ['read_flash', '0x0', opts.size || '0x400000', opts.file || 'backup.bin']
  };
  if (!actions[action]) throw new Error('Acción esptool desconocida: ' + action);
  const args = [...base, ...actions[action]];
  onData(`> esptool ${args.join(' ')}\n`);
  const r = await proc.run(tool, args, { onData, id: 'esptool' });
  return { ok: r.code === 0, output: r.stdout + r.stderr };
}

async function cliJson(args) {
  const cli = toolchain.arduinoCli();
  if (!cli) throw new Error('arduino-cli no está instalado.');
  const r = await proc.run(cli, [...args, '--format', 'json', '--additional-urls', toolchain.ESP32_INDEX]);
  try {
    return JSON.parse(r.stdout || 'null');
  } catch {
    throw new Error(r.stderr || 'Respuesta inválida de arduino-cli');
  }
}

async function searchLibraries(query) {
  const j = await cliJson(['lib', 'search', query || 'esp32', '--omit-releases-details']);
  return (j?.libraries || []).slice(0, 60).map((l) => ({
    name: l.name,
    author: l.latest?.author || '',
    sentence: l.latest?.sentence || '',
    version: l.latest?.version || l.available_versions?.slice(-1)[0] || '',
    category: l.latest?.category || ''
  }));
}

async function installedLibraries() {
  const j = await cliJson(['lib', 'list']);
  const list = Array.isArray(j) ? j : j?.installed_libraries || [];
  return list.map((x) => ({ name: x.library?.name, version: x.library?.version, sentence: x.library?.sentence || '' }));
}

async function libraryAction(action, name, onData) {
  const cli = toolchain.arduinoCli();
  const r = await proc.run(cli, ['lib', action, name], { onData });
  return { ok: r.code === 0 };
}

async function listBoards() {
  try {
    const j = await cliJson(['board', 'listall', 'esp32']);
    return (j?.boards || []).map((b) => ({ name: b.name, fqbn: b.fqbn })).filter((b) => b.fqbn.startsWith('esp32:'));
  } catch {
    return [];
  }
}

module.exports = {
  listPorts,
  startMonitor,
  stopMonitor,
  sendMonitor,
  esptool,
  searchLibraries,
  installedLibraries,
  libraryAction,
  listBoards
};
