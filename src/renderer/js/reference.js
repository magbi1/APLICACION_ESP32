// Referencia rápida: sintaxis de C/C++, Arduino y ESP32 con búsqueda, categorías e inserción en el editor.
const Reference = (() => {
  let category = 'Todas';

  /** Convierte la sintaxis de snippet de Monaco en código legible. */
  function plain(body) {
    return body
      .replace(/\$\{\d+\|((?:\\.|[^,|\\])*)(?:,(?:\\.|[^|\\])*)*\|\}/g, (_m, first) => first.replace(/\\(.)/g, '$1'))
      .replace(/\$\{\d+:([^}]*)\}/g, '$1')
      .replace(/^([ \t]*)(?:\$\{\d+\}|\$\d+)[ \t]*$/gm, '$1// ...')
      .replace(/\$\{\d+\}|\$\d+/g, '')
      .replace(/\t/g, '  ');
  }

  function matches(entry, q) {
    if (!q) return true;
    const [label, doc, body, cat] = entry;
    return `${label} ${doc} ${plain(body)} ${cat}`.toLowerCase().includes(q);
  }

  function renderCats() {
    const counts = {};
    SNIPPETS.forEach((s) => (counts[s[3]] = (counts[s[3]] || 0) + 1));
    const cats = ['Todas', ...SNIPPET_CATEGORIES];
    $('#refCats').innerHTML = cats.map((c) => `
      <button class="ref-cat ${c === category ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}<span>${c === 'Todas' ? SNIPPETS.length : counts[c] || 0}</span></button>`).join('');
    $$('#refCats .ref-cat').forEach((b) => {
      b.onclick = () => {
        category = b.dataset.cat;
        render();
      };
    });
  }

  function render() {
    renderCats();
    const q = $('#refFilter').value.trim().toLowerCase();
    const list = SNIPPETS
      .map((s, i) => [s, i])
      .filter(([s]) => (category === 'Todas' || s[3] === category) && matches(s, q));
    $('#refCount').textContent = `${list.length} de ${SNIPPETS.length}`;
    if (!list.length) {
      $('#refGrid').innerHTML = '<p class="muted pad">Sin resultados. Prueba con otra palabra.</p>';
      return;
    }
    $('#refGrid').innerHTML = list.map(([[label, doc, body, cat], i]) => `
      <div class="ref-card">
        <div class="ref-head"><b>${esc(label)}</b><span class="tag">${esc(cat)}</span></div>
        <p>${esc(doc)}</p>
        <pre class="ref-code">${esc(plain(body))}</pre>
        <div class="ref-actions">
          <button class="btn sm primary" data-insert="${i}">${iconSvg('plus', 13)}Insertar</button>
          <button class="btn sm ghost" data-copy="${i}">${iconSvg('copy', 13)}Copiar</button>
        </div>
      </div>`).join('');
    $$('#refGrid [data-insert]').forEach((b) => {
      b.onclick = () => {
        if (!Editor.active) return toast('Abre un archivo en el editor para insertar el código', 'error');
        showView('editor');
        Editor.insertSnippet(SNIPPETS[+b.dataset.insert][2]);
      };
    });
    $$('#refGrid [data-copy]').forEach((b) => {
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(plain(SNIPPETS[+b.dataset.copy][2]));
          toast('Código copiado', 'success', 2000);
        } catch {
          toast('No se pudo copiar al portapapeles', 'error');
        }
      };
    });
  }

  function bind() {
    $('#refFilter').oninput = render;
    Bus.on('view', (v) => {
      if (v !== 'reference') return;
      render();
      $('#refFilter').focus();
    });
  }

  return { bind, render, plain };
})();
