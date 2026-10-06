'use strict';
// Compilación y carga: Arduino (arduino-cli), PlatformIO y ESP-IDF.
const fs = require('fs');
const path = require('path');
const settings = require('./settings');
const toolchain = require('./toolchain');
const proc = require('./proc');

const IS_WIN = process.platform === 'win32';

function detectType(projectDir) {
  if (fs.existsSync(path.join(projectDir, 'platformio.ini'))) return 'platformio';
  const cmake = path.join(projectDir, 'CMakeLists.txt');
  if (fs.existsSync(cmake) && /project\.cmake|idf/i.test(fs.readFileSync(cmake, 'utf8'))) return 'esp-idf';
  return 'arduino';
}

/** Chip a partir del FQBN (esp32:esp32:esp32s3 -> esp32s3). */
function chipFromFqbn(fqbn) {
  const board = (fqbn || '').split(':')[2] || 'esp32';
  const m = board.match(/esp32(s2|s3|c2|c3|c5|c6|h2|p4)?/);
  if (m) return 'esp32' + (m[1] || '');
  return 'esp32';
}

/** Extrae uso de memoria del texto de salida del compilador. */
function parseMemory(text) {
  const mem = {};
  let m = text.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage space\. Maximum is (\d+)/);
  if (m) mem.flash = { used: +m[1], pct: +m[2], max: +m[3] };
  m = text.match(/Global variables use (\d+) bytes \((\d+)%\) of dynamic memory.*?Maximum is (\d+)/s);
  if (m) mem.ram = { used: +m[1], pct: +m[2], max: +m[3] };
  m = text.match(/RAM:\s+\[[^\]]*\]\s+([\d.]+)% \(used (\d+) bytes from (\d+) bytes\)/);
  if (m) mem.ram = { used: +m[2], pct: +m[1], max: +m[3] };
  m = text.match(/Flash:\s+\[[^\]]*\]\s+([\d.]+)% \(used (\d+) bytes from (\d+) bytes\)/);
  if (m) mem.flash = { used: +m[2], pct: +m[1], max: +m[3] };
  m = text.match(/Total image size:\s+(\d+) bytes/);
  if (m && !mem.flash) mem.flash = { used: +m[1], pct: 0, max: 0 };
  return mem;
}

/** Convierte mensajes "archivo:línea:col: error: texto" en diagnósticos. */
function parseDiagnostics(text) {
  const diags = [];
  const re = /^(.*?):(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$/gm;
  let m;
  while ((m = re.exec(text))) {
    diags.push({
      file: m[1].trim(),
      line: +m[2],
      column: +m[3],
      severity: m[4] === 'fatal error' ? 'error' : m[4],
      message: m[5]
    });
  }
  return diags.slice(0, 200);
}

function idfShell(projectDir, idfArgs, onData, id) {
  const idf = toolchain.idfPath();
  if (!idf) throw new Error('ESP-IDF no encontrado. Configura la ruta en Ajustes.');
  if (IS_WIN) {
    const cmd = `"${path.join(idf, 'export.bat')}" && idf.py -C "${projectDir}" ${idfArgs}`;
    return proc.run('cmd.exe', ['/d', '/s', '/c', `"${cmd}"`], { onData, id, cwd: projectDir });
  }
  return proc.run('bash', ['-lc', `. "${path.join(idf, 'export.sh')}" >/dev/null && idf.py -C "${projectDir}" ${idfArgs}`], { onData, id, cwd: projectDir });
}

async function compile(projectDir, opts, onData) {
  const s = settings.load();
  const fqbn = opts.fqbn || s.fqbn;
  const type = detectType(projectDir);
  const t0 = Date.now();
  let r;
  onData(`▶ Compilando (${type}) ${projectDir}\n`);
  if (type === 'arduino') {
    const cli = toolchain.arduinoCli();
    if (!cli) throw new Error('arduino-cli no está instalado. Ve a Herramientas → Instalar.');
    const args = ['compile', '--fqbn', fqbn, '--output-dir', path.join(projectDir, 'build'),
      '--additional-urls', toolchain.ESP32_INDEX, '--warnings', 'default'];
    if (s.verboseBuild) args.push('--verbose');
    if (opts.extraFlags) args.push('--build-property', `compiler.cpp.extra_flags=${opts.extraFlags}`);
    args.push(projectDir);
    onData(`> arduino-cli ${args.join(' ')}\n`);
    r = await proc.run(cli, args, { onData, id: 'build' });
  } else if (type === 'platformio') {
    const pio = toolchain.platformio();
    if (!pio) throw new Error('PlatformIO no está instalado.');
    r = await proc.run(pio, ['run', '-d', projectDir], { onData, id: 'build' });
  } else {
    r = await idfShell(projectDir, 'build', onData, 'build');
  }
  const text = r.stdout + '\n' + r.stderr;
  const result = {
    ok: r.code === 0,
    type,
    fqbn,
    seconds: ((Date.now() - t0) / 1000).toFixed(1),
    memory: parseMemory(text),
    diagnostics: parseDiagnostics(text),
    date: new Date().toISOString(),
    project: path.basename(projectDir)
  };
  settings.save({ lastBuild: result });
  onData(result.ok ? `\n✔ Compilación correcta en ${result.seconds}s\n` : `\n✖ Error de compilación (código ${r.code})\n`);
  return result;
}

async function upload(projectDir, opts, onData) {
  const s = settings.load();
  const fqbn = opts.fqbn || s.fqbn;
  const port = opts.port || s.port;
  if (!port) throw new Error('Selecciona un puerto COM antes de cargar.');
  const type = detectType(projectDir);
  let r;
  onData(`▶ Cargando en ${port} (${type})\n`);
  if (type === 'arduino') {
    const cli = toolchain.arduinoCli();
    const args = ['upload', '-p', port, '--fqbn', fqbn, '--input-dir', path.join(projectDir, 'build'),
      '--board-options', `UploadSpeed=${opts.uploadSpeed || s.uploadSpeed}`, '--verbose', projectDir];
    onData(`> arduino-cli ${args.join(' ')}\n`);
    r = await proc.run(cli, args, { onData, id: 'upload' });
  } else if (type === 'platformio') {
    r = await proc.run(toolchain.platformio(), ['run', '-d', projectDir, '-t', 'upload', '--upload-port', port], { onData, id: 'upload' });
  } else {
    r = await idfShell(projectDir, `-p ${port} -b ${opts.uploadSpeed || s.uploadSpeed} flash`, onData, 'upload');
  }
  onData(r.code === 0 ? '\n✔ Carga completada\n' : `\n✖ La carga falló (código ${r.code}). Mantén presionado BOOT si el chip no entra en modo descarga.\n`);
  return { ok: r.code === 0 };
}

/** Localiza los binarios generados (app, elf y merged) para simular. */
function artifacts(projectDir) {
  const type = detectType(projectDir);
  const out = { type, bin: '', elf: '', merged: '', bootloader: '', partitions: '' };
  const pick = (dir, re) => {
    try {
      const f = fs.readdirSync(dir).find((n) => re.test(n));
      return f ? path.join(dir, f) : '';
    } catch {
      return '';
    }
  };
  if (type === 'arduino') {
    const d = path.join(projectDir, 'build');
    out.merged = pick(d, /\.ino\.merged\.bin$/);
    out.bin = pick(d, /\.ino\.bin$/);
    out.elf = pick(d, /\.ino\.elf$/);
    out.bootloader = pick(d, /\.ino\.bootloader\.bin$/);
    out.partitions = pick(d, /\.ino\.partitions\.bin$/);
  } else if (type === 'platformio') {
    const root = path.join(projectDir, '.pio', 'build');
    let env = '';
    try {
      env = fs.readdirSync(root).find((n) => fs.existsSync(path.join(root, n, 'firmware.bin')));
    } catch {
      /* sin compilar */
    }
    if (env) {
      const d = path.join(root, env);
      out.bin = path.join(d, 'firmware.bin');
      out.elf = path.join(d, 'firmware.elf');
      out.bootloader = pick(d, /^bootloader\.bin$/);
      out.partitions = pick(d, /^partitions\.bin$/);
    }
  } else {
    const d = path.join(projectDir, 'build');
    out.elf = pick(d, /\.elf$/);
    out.bin = out.elf ? out.elf.replace(/\.elf$/, '.bin') : '';
    out.bootloader = path.join(d, 'bootloader', 'bootloader.bin');
    out.partitions = path.join(d, 'partition_table', 'partition-table.bin');
  }
  return out;
}

module.exports = { compile, upload, artifacts, detectType, chipFromFqbn, parseMemory, parseDiagnostics };
