// Enquadrar a foto do pet: arrastar para reposicionar, pinça (ou a barra) para dar zoom e girar.
// Devolve um JPEG quadrado (o painel e a área do tutor mostram em círculo ou quadrado).
// Uso: const blob = await enquadrar(fileOuUrl); if (!blob) return; // null = cancelou
import * as U from "./ui.js";
import { ic } from "./icones.js";

function carregar(fonte) {
  return new Promise((res, rej) => {
    const img = new Image(); img.decoding = "async";
    const url = fonte instanceof Blob ? URL.createObjectURL(fonte) : fonte;
    if (!(fonte instanceof Blob)) img.crossOrigin = "anonymous";
    img.onload = () => res({ img, url, solta: fonte instanceof Blob });
    img.onerror = () => rej(new Error("Não consegui abrir essa foto."));
    img.src = url;
  });
}

export async function enquadrar(fonte, { saida = 1080, titulo = "Enquadrar a foto" } = {}) {
  const { img, url, solta } = await carregar(fonte);
  return new Promise(resolve => {
    let fim = false;
    const m = U.modal(`<h3>${U.esc(titulo)}</h3>
      <p class="muted rc-dica">Arraste para posicionar. Use dois dedos ou a barra para aproximar.</p>
      <div class="rc-palco" tabindex="0" aria-label="Foto: use as setas para mover e + ou − para zoom"><canvas></canvas><div class="rc-mascara"></div></div>
      <div class="rc-ctrl"><button type="button" class="btn soft small" data-z="-" aria-label="Afastar">−</button>
        <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Zoom">
        <button type="button" class="btn soft small" data-z="+" aria-label="Aproximar">+</button>
        <button type="button" class="btn soft small" data-girar aria-label="Girar">${ic("voltar")}</button></div>
      <div class="acts"><button class="btn primary" data-usar>${ic("check")} Usar esta foto</button><button class="btn soft" data-close>Cancelar</button></div>`,
      { onClose: () => { if (!fim) { fim = true; if (solta) URL.revokeObjectURL(url); resolve(null); } } });
    m.el.classList.add("rc-modal");
    const palco = m.el.querySelector(".rc-palco"), cv = palco.querySelector("canvas"), ctx = cv.getContext("2d");
    const range = m.el.querySelector("input[type=range]");
    let rot = 0, zoom = 1, cx = 0, cy = 0; // cx, cy: deslocamento do centro da foto em relação ao centro do quadro (px do quadro)
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    let L = 300; // lado do quadro em px de tela
    const dims = () => (rot % 180 ? [img.height, img.width] : [img.width, img.height]);
    const base = () => { const [w, h] = dims(); return L / Math.min(w, h); }; // escala para cobrir o quadro
    function limitar() {
      const [w, h] = dims(), s = base() * zoom, mx = Math.max(0, (w * s - L) / 2), my = Math.max(0, (h * s - L) / 2);
      cx = Math.max(-mx, Math.min(mx, cx)); cy = Math.max(-my, Math.min(my, cy));
    }
    function desenhar(c = ctx, lado = L * dpr, k = dpr) {
      c.save(); c.fillStyle = "#30251F"; c.fillRect(0, 0, lado, lado);
      c.translate(lado / 2 + cx * k, lado / 2 + cy * k); c.rotate(rot * Math.PI / 180);
      const s = base() * zoom * k; c.imageSmoothingQuality = "high";
      c.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s); c.restore();
    }
    function medir() { L = Math.round(palco.clientWidth) || 300; cv.width = cv.height = L * dpr; cv.style.width = cv.style.height = L + "px"; limitar(); desenhar(); }
    const setZoom = (z, ax = 0, ay = 0) => { // zoom mantendo o ponto (ax, ay) do quadro no lugar
      const novo = Math.max(1, Math.min(4, z)), f = novo / zoom; cx = ax + (cx - ax) * f; cy = ay + (cy - ay) * f; zoom = novo; range.value = zoom; limitar(); desenhar(); };

    // arrastar e pinça (Pointer Events: mouse, dedo e caneta)
    const pts = new Map(); let ini = null;
    palco.addEventListener("pointerdown", e => { palco.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); ini = null; e.preventDefault(); });
    palco.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return; const ant = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { cx += e.clientX - ant.x; cy += e.clientY - ant.y; limitar(); desenhar(); }
      else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = palco.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - r.left - L / 2, my = (a.y + b.y) / 2 - r.top - L / 2;
        if (!ini) ini = { d, z: zoom }; else setZoom(ini.z * d / ini.d, mx, my);
      }
    });
    const solta_ = e => { pts.delete(e.pointerId); ini = null; };
    palco.addEventListener("pointerup", solta_); palco.addEventListener("pointercancel", solta_);
    palco.addEventListener("wheel", e => { e.preventDefault(); const r = palco.getBoundingClientRect(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), e.clientX - r.left - L / 2, e.clientY - r.top - L / 2); }, { passive: false });
    palco.addEventListener("keydown", e => { const p = 12, mapa = { ArrowLeft: [p, 0], ArrowRight: [-p, 0], ArrowUp: [0, p], ArrowDown: [0, -p] };
      if (mapa[e.key]) { cx += mapa[e.key][0]; cy += mapa[e.key][1]; limitar(); desenhar(); e.preventDefault(); }
      if (e.key === "+" || e.key === "=") setZoom(zoom * 1.1); if (e.key === "-") setZoom(zoom / 1.1); });
    range.addEventListener("input", () => setZoom(Number(range.value)));
    m.el.querySelectorAll("[data-z]").forEach(b => b.addEventListener("click", () => setZoom(zoom * (b.dataset.z === "+" ? 1.15 : 1 / 1.15))));
    m.el.querySelector("[data-girar]").addEventListener("click", () => { rot = (rot + 90) % 360; cx = cy = 0; limitar(); desenhar(); });
    m.el.querySelector("[data-usar]").addEventListener("click", () => {
      // tamanho final: até 1080 px, sem aumentar além da resolução real da foto
      const [w, h] = dims(); const lado = Math.round(Math.min(saida, Math.min(w, h) / zoom));
      const c = document.createElement("canvas"); c.width = c.height = lado; desenhar(c.getContext("2d"), lado, lado / L);
      c.toBlob(b => { fim = true; if (solta) URL.revokeObjectURL(url); m.close(); resolve(b); }, "image/jpeg", .9);
    });
    requestAnimationFrame(medir); window.addEventListener("resize", medir, { once: true });
  });
}
