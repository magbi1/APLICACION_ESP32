'use strict';
// Gestión de proyectos y archivos del espacio de trabajo.
const fs = require('fs');
const path = require('path');
const settings = require('./settings');
const builder = require('./builder');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');
const IGNORED = new Set(['build', '.pio', 'node_modules', '.git', '.vscode', 'managed_components']);
const TEXT_EXT = /\.(ino|c|cc|cpp|h|hpp|txt|md|json|toml|ini|csv|py|cmake|yml|yaml|html|css|js|properties|defaults)$|^(CMakeLists\.txt|Makefile|Kconfig.*|sdkconfig.*)$/i;

function listTemplates() {
  return fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const meta = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, d.name, 'template.json'), 'utf8'));
      return { id: d.name, ...meta };
    })
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

function sanitize(name) {
  return String(name).trim().replace(/[^A-Za-z0-9_\-]/g, '_').replace(/^(\d)/, '_$1') || 'proyecto';
}

function copyDir(src, dst, rename) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name === 'template.json') continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, rename(e.name));
    if (e.isDirectory()) copyDir(s, d, (n) => n);
    else fs.copyFileSync(s, d);
  }
}

function create({ name, template, dir }) {
  const safe = sanitize(name);
  const parent = dir || settings.load().workspaceDir;
  const projectDir = path.join(parent, safe);
  if (fs.existsSync(projectDir)) throw new Error(`Ya existe un proyecto llamado "${safe}"`);
  copyDir(path.join(TEMPLATES_DIR, template || 'blink'), projectDir, (n) => (n === 'sketch.ino' ? `${safe}.ino` : n));
  settings.addRecent(projectDir);
  return { projectDir, main: mainFile(projectDir) };
}

function mainFile(projectDir) {
  const base = path.basename(projectDir);
  const candidates = [
    `${base}.ino`,
    path.join('src', 'main.cpp'),
    path.join('main', 'main.c'),
    path.join('main', 'main.cpp')
  ];
  for (const c of candidates) {
    const f = path.join(projectDir, c);
    if (fs.existsSync(f)) return f;
  }
  const ino = fs.readdirSync(projectDir).find((n) => n.endsWith('.ino'));
  return ino ? path.join(projectDir, ino) : '';
}

function tree(dir, depth = 0) {
  if (depth > 6) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => !IGNORED.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name))
    .map((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory()
        ? { name: e.name, path: p, dir: true, children: tree(p, depth + 1) }
        : { name: e.name, path: p, dir: false, text: TEXT_EXT.test(e.name) };
    });
}

function open(projectDir) {
  if (!fs.existsSync(projectDir)) throw new Error('El proyecto no existe: ' + projectDir);
  settings.addRecent(projectDir);
  return {
    projectDir,
    name: path.basename(projectDir),
    type: builder.detectType(projectDir),
    main: mainFile(projectDir),
    tree: tree(projectDir)
  };
}

function listWorkspace() {
  const s = settings.load();
  fs.mkdirSync(s.workspaceDir, { recursive: true });
  const fromWs = fs.readdirSync(s.workspaceDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(s.workspaceDir, d.name));
  const all = [...new Set([...s.recentProjects.filter((p) => fs.existsSync(p)), ...fromWs])];
  return all.map((p) => {
    const st = fs.statSync(p);
    return { path: p, name: path.basename(p), type: builder.detectType(p), modified: st.mtime.toISOString(), recent: s.recentProjects.includes(p) };
  });
}

function readFile(f) {
  return fs.readFileSync(f, 'utf8');
}

function writeFile(f, content) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  return true;
}

function newFile(dir, name) {
  const f = path.join(dir, name);
  if (fs.existsSync(f)) throw new Error('El archivo ya existe');
  let content = '';
  if (/\.(h|hpp)$/i.test(name)) {
    const guard = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    content = `#ifndef ${guard}\n#define ${guard}\n\n\n#endif // ${guard}\n`;
  }
  writeFile(f, content);
  return f;
}

function newFolder(dir, name) {
  const f = path.join(dir, name);
  fs.mkdirSync(f, { recursive: true });
  return f;
}

function rename(from, toName) {
  const to = path.join(path.dirname(from), toName);
  fs.renameSync(from, to);
  return to;
}

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

module.exports = { listTemplates, create, open, tree, listWorkspace, readFile, writeFile, newFile, newFolder, rename, remove, mainFile };
