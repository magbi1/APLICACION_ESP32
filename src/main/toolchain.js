'use strict';
// Detección e instalación de las herramientas: arduino-cli, núcleo ESP32,
// esptool, Wokwi CLI (simulación), QEMU de Espressif, PlatformIO y ESP-IDF.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { app, net } = require('electron');
const settings = require('./settings');
const proc = require('./proc');

const IS_WIN = process.platform === 'win32';
const EXE = IS_WIN ? '.exe' : '';
const ESP32_INDEX = 'https://espressif.github.io/arduino-esp32/package_esp32_index.json';

const URLS = {
  arduinoCli: IS_WIN
    ? 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip'
    : process.platform === 'darwin'
      ? 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz'
      : 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz',
  wokwiCli: IS_WIN
    ? 'https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-win-x64.exe'
    : process.platform === 'darwin'
      ? 'https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-macos-arm64'
      : 'https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-linuxstatic-x64'
};

function toolsDir() {
  const d = path.join(app.getPath('userData'), 'tools');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function exists(p) {
  try {
    return !!p && fs.existsSync(p);
  } catch {
    return false;
  }
}

/** Busca un ejecutable en el PATH del sistema. */
function which(name) {
  const dirs = (process.env.PATH || '').split(path.delimiter);
  const exts = IS_WIN ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  for (const d of dirs) {
    for (const e of exts) {
      const p = path.join(d, name + e.toLowerCase());
      if (exists(p)) return p;
      const p2 = path.join(d, name + e);
      if (exists(p2)) return p2;
    }
  }
  return '';
}

function arduinoDataDir() {
  if (IS_WIN) return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Arduino15');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Arduino15');
  return path.join(os.homedir(), '.arduino15');
}

/** Devuelve el primer archivo que coincide dentro de un árbol (profundidad limitada). */
function findFile(root, fileName, depth = 4) {
  if (!exists(root) || depth < 0) return '';
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return '';
  }
  // Versiones más nuevas primero
  entries.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  for (const e of entries) {
    if (e.isFile() && e.name.toLowerCase() === fileName.toLowerCase()) return path.join(root, e.name);
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const f = findFile(path.join(root, e.name), fileName, depth - 1);
      if (f) return f;
    }
  }
  return '';
}

function arduinoCli() {
  const s = settings.load();
  if (exists(s.arduinoCliPath)) return s.arduinoCliPath;
  const local = path.join(toolsDir(), 'arduino-cli' + EXE);
  if (exists(local)) return local;
  return which('arduino-cli');
}

function wokwiCli() {
  const s = settings.load();
  if (exists(s.wokwiCliPath)) return s.wokwiCliPath;
  const local = path.join(toolsDir(), 'wokwi-cli' + EXE);
  if (exists(local)) return local;
  return which('wokwi-cli');
}

function esptool() {
  const s = settings.load();
  if (exists(s.esptoolPath)) return s.esptoolPath;
  const fromCore = findFile(path.join(arduinoDataDir(), 'packages', 'esp32', 'tools', 'esptool_py'), 'esptool' + EXE, 3);
  if (fromCore) return fromCore;
  return which('esptool') || which('esptool.py');
}

function qemu(target = 'esp32') {
  const s = settings.load();
  const bin = (target.startsWith('esp32c') || target.startsWith('esp32h') ? 'qemu-system-riscv32' : 'qemu-system-xtensa') + EXE;
  if (exists(s.qemuPath) && path.basename(s.qemuPath).toLowerCase() === bin.toLowerCase()) return s.qemuPath;
  if (exists(s.qemuPath) && fs.statSync(s.qemuPath).isDirectory()) {
    const f = findFile(s.qemuPath, bin, 4);
    if (f) return f;
  }
  if (exists(s.qemuPath)) {
    const f = findFile(path.dirname(s.qemuPath), bin, 1);
    if (f) return f;
  }
  const espressifTools = path.join(os.homedir(), '.espressif', 'tools');
  const sub = bin.includes('riscv') ? 'qemu-riscv32' : 'qemu-xtensa';
  return findFile(path.join(espressifTools, sub), bin, 5) || which(bin.replace(EXE, ''));
}

function platformio() {
  const s = settings.load();
  if (exists(s.platformioPath)) return s.platformioPath;
  const penv = path.join(os.homedir(), '.platformio', 'penv', IS_WIN ? 'Scripts' : 'bin', 'pio' + EXE);
  if (exists(penv)) return penv;
  return which('pio') || which('platformio');
}

function idfPath() {
  const s = settings.load();
  if (exists(s.idfPath)) return s.idfPath;
  if (exists(process.env.IDF_PATH)) return process.env.IDF_PATH;
  const guesses = IS_WIN
    ? ['C:\\Espressif\\frameworks\\esp-idf-v5.4', 'C:\\Espressif\\frameworks\\esp-idf-v5.3', 'C:\\Espressif\\frameworks\\esp-idf-v5.2', path.join(os.homedir(), 'esp', 'esp-idf')]
    : [path.join(os.homedir(), 'esp', 'esp-idf')];
  return guesses.find(exists) || '';
}

async function version(cmd, args) {
  if (!cmd) return '';
  const r = await proc.run(cmd, args);
  if (r.code !== 0) return '';
  return (r.stdout || r.stderr).trim().split('\n')[0].slice(0, 120);
}

/** Estado general de todas las herramientas para el dashboard. */
async function status() {
  const cli = arduinoCli();
  const result = {
    arduinoCli: { path: cli, version: await version(cli, ['version']) },
    esp32Core: { installed: false, version: '' },
    esptool: { path: esptool(), version: '' },
    wokwi: { path: wokwiCli(), version: '', token: !!(settings.load().wokwiToken || process.env.WOKWI_CLI_TOKEN) },
    qemu: { path: qemu('esp32'), riscv: qemu('esp32c3') },
    platformio: { path: platformio(), version: '' },
    espIdf: { path: idfPath() }
  };
  if (cli) {
    const r = await proc.run(cli, ['core', 'list', '--format', 'json']);
    try {
      const j = JSON.parse(r.stdout || '{}');
      const list = Array.isArray(j) ? j : j.platforms || [];
      const core = list.find((p) => p.id === 'esp32:esp32');
      if (core) {
        result.esp32Core.installed = true;
        result.esp32Core.version = core.installed_version || core.installed || '';
      }
    } catch {
      /* salida no JSON */
    }
  }
  if (result.esptool.path) result.esptool.version = await version(result.esptool.path, ['version']);
  if (result.wokwi.path) result.wokwi.version = await version(result.wokwi.path, ['--version']);
  if (result.platformio.path) result.platformio.version = await version(result.platformio.path, ['--version']);
  return result;
}

async function download(url, dest, onData) {
  onData && onData(`Descargando ${url}\n`);
  const res = await net.fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const out = fs.createWriteStream(dest);
  let got = 0;
  let lastPct = -10;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out.write(Buffer.from(value));
    got += value.length;
    if (total) {
      const pct = Math.floor((got / total) * 100);
      if (pct >= lastPct + 10) {
        lastPct = pct;
        onData && onData(`  ${pct}% (${(got / 1048576).toFixed(1)} MB)\n`);
      }
    }
  }
  await new Promise((r) => out.end(r));
  onData && onData(`Descarga completa: ${dest}\n`);
}

async function extract(archive, destDir, onData) {
  if (archive.endsWith('.zip') && IS_WIN) {
    const r = await proc.run('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${destDir}' -Force`
    ], { onData });
    if (r.code !== 0) throw new Error('No se pudo descomprimir ' + archive);
  } else {
    const r = await proc.run('tar', ['-xf', archive, '-C', destDir], { onData });
    if (r.code !== 0) throw new Error('No se pudo descomprimir ' + archive);
  }
}

async function installArduinoCli(onData) {
  const dir = toolsDir();
  const archive = path.join(dir, path.basename(URLS.arduinoCli));
  await download(URLS.arduinoCli, archive, onData);
  await extract(archive, dir, onData);
  fs.rmSync(archive, { force: true });
  const cli = path.join(dir, 'arduino-cli' + EXE);
  if (!exists(cli)) throw new Error('arduino-cli no se encontró tras la extracción');
  if (!IS_WIN) fs.chmodSync(cli, 0o755);
  settings.save({ arduinoCliPath: cli });
  onData && onData(`arduino-cli instalado en ${cli}\n`);
  return cli;
}

async function installEsp32Core(onData) {
  let cli = arduinoCli();
  if (!cli) cli = await installArduinoCli(onData);
  const steps = [
    ['config', 'init', '--overwrite', '--additional-urls', ESP32_INDEX],
    ['core', 'update-index', '--additional-urls', ESP32_INDEX],
    ['core', 'install', 'esp32:esp32', '--additional-urls', ESP32_INDEX]
  ];
  for (const args of steps) {
    onData && onData(`\n> arduino-cli ${args.join(' ')}\n`);
    const r = await proc.run(cli, args, { onData });
    if (r.code !== 0 && args[1] !== 'init') throw new Error(`Falló: arduino-cli ${args.join(' ')}`);
  }
  onData && onData('\n✔ Núcleo ESP32 instalado.\n');
  return true;
}

async function installWokwiCli(onData) {
  const dest = path.join(toolsDir(), 'wokwi-cli' + EXE);
  await download(URLS.wokwiCli, dest, onData);
  if (!IS_WIN) fs.chmodSync(dest, 0o755);
  settings.save({ wokwiCliPath: dest });
  onData && onData(`Wokwi CLI instalado en ${dest}\n`);
  return dest;
}

async function installPlatformio(onData) {
  const py = which('python') || which('python3') || which('py');
  if (!py) throw new Error('Python no está instalado. Instálalo desde python.org y vuelve a intentar.');
  const r = await proc.run(py, ['-m', 'pip', 'install', '--user', '-U', 'platformio'], { onData });
  if (r.code !== 0) throw new Error('No se pudo instalar PlatformIO con pip');
  return true;
}

async function installQemu(onData) {
  const idf = idfPath();
  if (!idf) {
    throw new Error('QEMU de Espressif se instala con ESP-IDF. Instala ESP-IDF (https://dl.espressif.com/dl/esp-idf/) o configura la ruta de QEMU en Ajustes.');
  }
  const py = which('python') || which('python3') || which('py');
  const script = path.join(idf, 'tools', 'idf_tools.py');
  for (const t of ['qemu-xtensa', 'qemu-riscv32']) {
    onData && onData(`\n> idf_tools.py install ${t}\n`);
    await proc.run(py, [script, 'install', t], { onData });
  }
  return true;
}

module.exports = {
  ESP32_INDEX,
  arduinoCli,
  wokwiCli,
  esptool,
  qemu,
  platformio,
  idfPath,
  arduinoDataDir,
  status,
  installArduinoCli,
  installEsp32Core,
  installWokwiCli,
  installPlatformio,
  installQemu,
  exists,
  which
};
