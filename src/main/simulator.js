'use strict';
// Simulación: Wokwi CLI (circuito completo con periféricos) y QEMU de Espressif.
const fs = require('fs');
const path = require('path');
const settings = require('./settings');
const toolchain = require('./toolchain');
const builder = require('./builder');
const proc = require('./proc');

const WOKWI_BOARDS = {
  esp32: 'board-esp32-devkit-c-v4',
  esp32s2: 'board-esp32-s2-devkitm-1',
  esp32s3: 'board-esp32-s3-devkitc-1',
  esp32c3: 'board-esp32-c3-devkitm-1',
  esp32c6: 'board-esp32-c6-devkitc-1',
  esp32h2: 'board-esp32-h2-devkitm-1',
  esp32p4: 'board-esp32-p4-function-ev'
};

const BOOTLOADER_OFFSET = { esp32: 0x1000, esp32s2: 0x1000, esp32p4: 0x2000 };

function defaultDiagram(chip) {
  const board = WOKWI_BOARDS[chip] || WOKWI_BOARDS.esp32;
  return {
    version: 1,
    author: settings.load().company || 'ESP32 Studio',
    editor: 'esp32-studio',
    parts: [{ type: board, id: 'esp', top: 0, left: 0, attrs: {} }],
    connections: [
      ['esp:TX', '$serialMonitor:RX', '', []],
      ['esp:RX', '$serialMonitor:TX', '', []]
    ],
    dependencies: {}
  };
}

function ensureDiagram(projectDir, chip) {
  const f = path.join(projectDir, 'diagram.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(defaultDiagram(chip), null, 2));
  return f;
}

function rel(projectDir, p) {
  return path.relative(projectDir, p).split(path.sep).join('/');
}

async function runWokwi(projectDir, opts, onData, onExit) {
  const cli = toolchain.wokwiCli();
  if (!cli) throw new Error('Wokwi CLI no está instalado. Ve a Herramientas → Instalar Wokwi CLI.');
  const token = settings.load().wokwiToken || process.env.WOKWI_CLI_TOKEN;
  if (!token) throw new Error('Falta el token de Wokwi. Obtén uno gratis en https://wokwi.com/dashboard/ci y guárdalo en Ajustes.');
  const a = builder.artifacts(projectDir);
  const firmware = a.merged || a.bin;
  if (!firmware || !fs.existsSync(firmware)) throw new Error('Compila el proyecto antes de simular.');
  const chip = builder.chipFromFqbn(opts.fqbn || settings.load().fqbn);
  ensureDiagram(projectDir, chip);
  const toml = [
    '# Generado por ESP32 Studio',
    '[wokwi]',
    'version = 1',
    `firmware = '${rel(projectDir, firmware)}'`,
    a.elf && fs.existsSync(a.elf) ? `elf = '${rel(projectDir, a.elf)}'` : ''
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(projectDir, 'wokwi.toml'), toml);
  const args = ['--interactive', '--timeout', String(opts.timeout ?? 600000)];
  if (opts.expectText) args.push('--expect-text', opts.expectText);
  if (opts.scenario) args.push('--scenario', opts.scenario);
  args.push(projectDir);
  onData(`▶ Simulación Wokwi (${chip})\n> wokwi-cli ${args.join(' ')}\n`);
  proc.start('sim', cli, args, { cwd: projectDir, env: { WOKWI_CLI_TOKEN: token }, onData, onExit });
  return { ok: true, engine: 'wokwi', chip };
}

/** Crea una imagen de flash completa (4 MB) que QEMU pueda arrancar. */
async function buildFlashImage(projectDir, chip, onData) {
  const a = builder.artifacts(projectDir);
  const out = path.join(projectDir, 'build', 'qemu_flash.bin');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let source = a.merged && fs.existsSync(a.merged) ? a.merged : '';
  if (!source) {
    const esptool = toolchain.esptool();
    if (!esptool) throw new Error('esptool no encontrado (se instala con el núcleo ESP32).');
    if (![a.bootloader, a.partitions, a.bin].every((f) => f && fs.existsSync(f))) {
      throw new Error('Faltan bootloader/partitions/app. Compila el proyecto primero.');
    }
    const boot = BOOTLOADER_OFFSET[chip] ?? 0x0;
    const args = ['--chip', chip, 'merge_bin', '-o', out, '--fill-flash-size', '4MB',
      '0x' + boot.toString(16), a.bootloader, '0x8000', a.partitions, '0x10000', a.bin];
    onData(`> esptool ${args.join(' ')}\n`);
    const r = await proc.run(esptool, args, { onData });
    if (r.code !== 0) throw new Error('No se pudo generar la imagen de flash');
    source = out;
  } else {
    fs.copyFileSync(source, out);
  }
  // QEMU exige tamaños de flash de 2, 4, 8 o 16 MB
  const size = fs.statSync(out).size;
  const target = [2, 4, 8, 16].map((m) => m * 1048576).find((s) => s >= size) || size;
  if (size < target) {
    const fd = fs.openSync(out, 'r+');
    const pad = Buffer.alloc(target - size, 0xff);
    fs.writeSync(fd, pad, 0, pad.length, size);
    fs.closeSync(fd);
  }
  return out;
}

async function runQemu(projectDir, opts, onData, onExit) {
  const chip = builder.chipFromFqbn(opts.fqbn || settings.load().fqbn);
  if (!['esp32', 'esp32c3', 'esp32s3'].includes(chip)) {
    throw new Error(`QEMU de Espressif no soporta ${chip}. Usa Wokwi para este chip.`);
  }
  const bin = toolchain.qemu(chip);
  if (!bin) throw new Error('QEMU de Espressif no encontrado. Instálalo desde Herramientas o configura la ruta en Ajustes.');
  const flash = await buildFlashImage(projectDir, chip, onData);
  const args = ['-nographic', '-machine', chip];
  if (chip === 'esp32c3') args.push('-icount', '3');
  args.push('-drive', `file=${flash},if=mtd,format=raw`);
  if (chip === 'esp32') args.push('-nic', 'user,model=open_eth', '-global', 'driver=timer.esp32.timg,property=wdt_disable,value=true');
  onData(`▶ Simulación QEMU (${chip})\n> ${path.basename(bin)} ${args.join(' ')}\n`);
  proc.start('sim', bin, args, { cwd: projectDir, onData, onExit });
  return { ok: true, engine: 'qemu', chip };
}

async function start(projectDir, opts, onData, onExit) {
  if (opts.engine === 'qemu') return runQemu(projectDir, opts, onData, onExit);
  return runWokwi(projectDir, opts, onData, onExit);
}

function stop() {
  return proc.stop('sim');
}

function send(text) {
  return proc.write('sim', text);
}

module.exports = { start, stop, send, ensureDiagram, defaultDiagram, WOKWI_BOARDS };
