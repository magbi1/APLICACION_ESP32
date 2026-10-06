// Comprobación rápida de sintaxis de los scripts de la interfaz y de las plantillas.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
for (const dir of [path.join(root, 'src', 'main'), path.join(root, 'src', 'renderer', 'js')]) {
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    execFileSync(process.execPath, ['--check', path.join(dir, f)], { stdio: 'inherit' });
  }
}
const tplDir = path.join(root, 'templates');
for (const t of fs.readdirSync(tplDir)) {
  const meta = JSON.parse(fs.readFileSync(path.join(tplDir, t, 'template.json'), 'utf8'));
  if (!meta.name || !meta.category) throw new Error(`Plantilla inválida: ${t}`);
  const dia = path.join(tplDir, t, 'diagram.json');
  if (fs.existsSync(dia)) JSON.parse(fs.readFileSync(dia, 'utf8'));
}
const exDir = path.join(root, 'ejemplos');
for (const e of fs.existsSync(exDir) ? fs.readdirSync(exDir) : []) {
  const dia = path.join(exDir, e, 'diagram.json');
  if (fs.existsSync(dia)) JSON.parse(fs.readFileSync(dia, 'utf8'));
  if (!fs.existsSync(path.join(exDir, e, `${e}.ino`))) throw new Error(`Falta ${e}.ino en ejemplos/${e}`);
}
JSON.parse(fs.readFileSync(path.join(root, 'branding.json'), 'utf8'));
console.log('OK: interfaz, plantillas y branding válidos');
