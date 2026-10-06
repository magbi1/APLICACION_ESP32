'use strict';
// Proceso principal de ESP32 Studio.
const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const settings = require('./settings');
const toolchain = require('./toolchain');
const builder = require('./builder');
const simulator = require('./simulator');
const devices = require('./devices');
const projects = require('./projects');
const proc = require('./proc');

const ROOT = path.join(__dirname, '..', '..');
let win = null;

function branding() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'branding.json'), 'utf8'));
  const s = settings.load();
  const resolve = (p) => (p && fs.existsSync(p) ? p : path.join(ROOT, p));
  return {
    appName: s.appName || base.appName,
    company: s.company || base.company,
    tagline: base.tagline,
    accentColor: base.accentColor,
    logo: s.logo && fs.existsSync(s.logo) ? s.logo : resolve(base.logo),
    logoSecondary: s.logoSecondary && fs.existsSync(s.logoSecondary) ? s.logoSecondary : resolve(base.logoSecondary)
  };
}

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

const log = (channel) => (text, stream) => send(channel, { text, stream });

function createWindow() {
  const b = branding();
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 680,
    title: b.appName,
    backgroundColor: '#0b1220',
    icon: path.join(ROOT, 'build', 'icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(ROOT, 'src', 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
  if (process.argv.includes('--dev')) win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/** Registra un manejador IPC que devuelve { ok, data } o { ok:false, error }. */
function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });
}

function registerIpc() {
  // Ventana
  handle('win:minimize', () => win.minimize());
  handle('win:maximize', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  handle('win:close', () => win.close());

  // Configuración y marca
  handle('settings:get', () => settings.load());
  handle('settings:set', (patch) => settings.save(patch));
  handle('branding:get', () => branding());
  handle('branding:pickLogo', async (which) => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Selecciona tu logo',
      filters: [{ name: 'Imágenes', extensions: ['png', 'svg', 'jpg', 'jpeg', 'webp', 'ico'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const dir = path.join(app.getPath('userData'), 'branding');
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, `${which}${path.extname(r.filePaths[0])}`);
    fs.copyFileSync(r.filePaths[0], dest);
    settings.save({ [which]: dest });
    return branding();
  });
  handle('branding:reset', () => {
    settings.save({ logo: '', logoSecondary: '', appName: '', company: '' });
    return branding();
  });

  // Diálogos y sistema
  handle('dialog:openFolder', async (title) => {
    const r = await dialog.showOpenDialog(win, { title: title || 'Abrir carpeta', properties: ['openDirectory', 'createDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  handle('dialog:openFile', async (filters) => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: filters || [] });
    return r.canceled ? null : r.filePaths[0];
  });
  handle('dialog:saveFile', async (defaultPath) => {
    const r = await dialog.showSaveDialog(win, { defaultPath });
    return r.canceled ? null : r.filePath;
  });
  handle('shell:openExternal', (url) => shell.openExternal(url));
  handle('shell:showItem', (p) => shell.showItemInFolder(p));
  handle('shell:openTerminal', (cwd) => {
    if (process.platform === 'win32') {
      require('child_process').spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `cd /d "${cwd}"`], { detached: true, windowsHide: false });
    }
  });

  // Herramientas
  handle('tools:status', () => toolchain.status());
  handle('tools:install', async (what) => {
    const onData = log('tools:log');
    const map = {
      arduinoCli: toolchain.installArduinoCli,
      esp32Core: toolchain.installEsp32Core,
      wokwi: toolchain.installWokwiCli,
      platformio: toolchain.installPlatformio,
      qemu: toolchain.installQemu
    };
    if (!map[what]) throw new Error('Herramienta desconocida');
    return map[what](onData);
  });

  // Proyectos
  handle('project:templates', () => projects.listTemplates());
  handle('project:create', (opts) => projects.create(opts));
  handle('project:open', (dir) => projects.open(dir));
  handle('project:tree', (dir) => projects.tree(dir));
  handle('project:list', () => projects.listWorkspace());
  handle('file:read', (f) => projects.readFile(f));
  handle('file:write', (f, c) => projects.writeFile(f, c));
  handle('file:new', (dir, name) => projects.newFile(dir, name));
  handle('folder:new', (dir, name) => projects.newFolder(dir, name));
  handle('file:rename', (from, to) => projects.rename(from, to));
  handle('file:delete', (target) => projects.remove(target));

  // Compilación / carga
  handle('build:compile', (dir, opts) => builder.compile(dir, opts || {}, log('build:log')));
  handle('build:upload', (dir, opts) => builder.upload(dir, opts || {}, log('build:log')));
  handle('build:cancel', () => proc.stop('build') || proc.stop('upload'));
  handle('build:artifacts', (dir) => builder.artifacts(dir));

  // Simulación
  handle('sim:start', (dir, opts) => simulator.start(dir, opts || {}, log('sim:log'), (code) => send('sim:exit', code)));
  handle('sim:stop', () => simulator.stop());
  handle('sim:send', (t) => simulator.send(t));
  handle('sim:diagram', (dir, chip) => {
    const f = simulator.ensureDiagram(dir, chip);
    return { file: f, content: fs.readFileSync(f, 'utf8') };
  });
  handle('sim:boards', () => simulator.WOKWI_BOARDS);

  // Dispositivos
  handle('dev:ports', () => devices.listPorts());
  handle('dev:boards', () => devices.listBoards());
  handle('monitor:start', (opts) => devices.startMonitor(opts || {}, log('monitor:data'), (code) => send('monitor:exit', code)));
  handle('monitor:stop', () => devices.stopMonitor());
  handle('monitor:send', (t) => devices.sendMonitor(t));
  handle('esptool:run', (action, opts) => devices.esptool(action, opts || {}, log('tools:log')));
  handle('lib:search', (q) => devices.searchLibraries(q));
  handle('lib:installed', () => devices.installedLibraries());
  handle('lib:action', (action, name) => devices.libraryAction(action, name, log('tools:log')));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on('window-all-closed', () => {
  proc.stopAll();
  if (process.platform !== 'darwin') app.quit();
});
