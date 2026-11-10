// Manual de uso: lê /manual.md (o mesmo texto da nota do Obsidian) e mostra formatado
import * as U from "../ui.js";

const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function inline(s) {
  return U.esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\(#([\w-]+)\)/g, '<a href="#" data-ancora="$2">$1</a>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)(https:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
export function mdToHtml(md) {
  const L = md.replace(/\r/g, "").split("\n"); const out = []; let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,3}) (.*)$/))) { const n = m[1].length; out.push(`<h${n} id="${slug(m[2])}">${inline(m[2])}</h${n}>`); i++; continue; }
    if (l.startsWith("|")) {
      const rows = []; while (i < L.length && L[i].startsWith("|")) { rows.push(L[i]); i++; }
      const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push(`<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`); continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      const ord = /^\d+\. /.test(l); const items = [];
      while (i < L.length && /^(- |\d+\. )/.test(L[i])) { items.push(L[i].replace(/^(- |\d+\. )/, "")); i++; }
      out.push(`<${ord ? "ol" : "ul"}>${items.map(x => `<li>${inline(x)}</li>`).join("")}</${ord ? "ol" : "ul"}>`); continue;
    }
    const p = []; while (i < L.length && L[i].trim() && !/^(#|\||- |\d+\. )/.test(L[i])) { p.push(L[i]); i++; }
    out.push(`<p>${inline(p.join(" "))}</p>`);
  }
  return out.join("\n");
}

export async function mount(root) {
  root.innerHTML = `<div class="manual">${U.skeleton(6)}</div>`;
  try {
    const r = await fetch("/manual.md", { cache: "no-cache" }); if (!r.ok) throw new Error(r.status);
    root.firstElementChild.innerHTML = mdToHtml(await r.text());
  } catch { root.firstElementChild.innerHTML = `<div class="empty">Não consegui abrir o manual. Verifique a internet.</div>`; return; }
  const onClick = e => {
    const a = e.target.closest("[data-ancora]"); if (!a) return; e.preventDefault();
    const h = root.querySelector("#" + CSS.escape(a.dataset.ancora)); if (h) h.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  root.addEventListener("click", onClick);
  return { destroy() { root.removeEventListener("click", onClick); } };
}
