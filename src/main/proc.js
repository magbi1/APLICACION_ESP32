'use strict';
// Utilidades para lanzar procesos externos y transmitir su salida a la interfaz.
const { spawn } = require('child_process');

const running = new Map(); // id -> ChildProcess

/**
 * Ejecuta un comando y emite cada fragmento de salida mediante onData.
 * Devuelve una promesa con { code, stdout, stderr }.
 */
function run(cmd, args, { cwd, env, onData, id, input } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(cmd, args, {
        cwd,
        env: { ...process.env, ...env },
        windowsHide: true,
        shell: false
      });
    } catch (err) {
      resolve({ code: -1, stdout, stderr: String(err) });
      return;
    }
    if (id) running.set(id, child);
    child.stdout.on('data', (d) => {
      const s = d.toString();
      stdout += s;
      onData && onData(s, 'stdout');
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      stderr += s;
      onData && onData(s, 'stderr');
    });
    child.on('error', (err) => {
      stderr += String(err);
      onData && onData(`\n${err.message}\n`, 'stderr');
    });
    child.on('close', (code) => {
      if (id) running.delete(id);
      resolve({ code: code ?? -1, stdout, stderr });
    });
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/** Lanza un proceso de larga duración (monitor serie, simulador) y lo registra. */
function start(id, cmd, args, { cwd, env, onData, onExit } = {}) {
  stop(id);
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true
  });
  running.set(id, child);
  child.stdout.on('data', (d) => onData && onData(d.toString(), 'stdout'));
  child.stderr.on('data', (d) => onData && onData(d.toString(), 'stderr'));
  child.on('error', (err) => onData && onData(`\n${err.message}\n`, 'stderr'));
  child.on('close', (code) => {
    if (running.get(id) === child) running.delete(id);
    onExit && onExit(code);
  });
  return child;
}

function write(id, data) {
  const child = running.get(id);
  if (!child || !child.stdin.writable) return false;
  child.stdin.write(data);
  return true;
}

function stop(id) {
  const child = running.get(id);
  if (!child) return false;
  running.delete(id);
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    /* el proceso ya terminó */
  }
  return true;
}

function isRunning(id) {
  return running.has(id);
}

function stopAll() {
  for (const id of [...running.keys()]) stop(id);
}

module.exports = { run, start, write, stop, isRunning, stopAll };
