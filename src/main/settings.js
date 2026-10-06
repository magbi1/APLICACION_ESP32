'use strict';
// Persistencia de configuración del usuario (JSON en %APPDATA%/ESP32 Studio).
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  arduinoCliPath: '',
  wokwiCliPath: '',
  wokwiToken: '',
  qemuPath: '',
  platformioPath: '',
  idfPath: '',
  esptoolPath: '',
  buildSystem: 'arduino',
  fqbn: 'esp32:esp32:esp32',
  port: '',
  baudrate: 115200,
  uploadSpeed: 921600,
  workspaceDir: '',
  recentProjects: [],
  fontSize: 14,
  theme: 'dark',
  autoSave: true,
  verboseBuild: false,
  logo: '',
  logoSecondary: '',
  appName: '',
  company: '',
  lastBuild: null
};

let cache = null;

function file() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) };
  } catch {
    cache = { ...DEFAULTS };
  }
  if (!cache.workspaceDir) {
    cache.workspaceDir = path.join(app.getPath('documents'), 'ESP32 Studio');
  }
  return cache;
}

function save(patch) {
  cache = { ...load(), ...patch };
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(cache, null, 2));
  return cache;
}

function addRecent(projectDir) {
  const s = load();
  const list = [projectDir, ...s.recentProjects.filter((p) => p !== projectDir)].slice(0, 12);
  return save({ recentProjects: list });
}

module.exports = { load, save, addRecent, DEFAULTS };
