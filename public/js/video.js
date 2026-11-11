// Vídeos do diário: confere a duração e, se o arquivo for grande, diminui no próprio celular
// (480p, ~1,2 Mbps) antes de enviar. Assim um vídeo de 30 s fica com uns 5 MB em vez de 40 MB.
// Se o navegador não conseguir diminuir, manda o original (até o limite).

export const MAX_SEG = 90;            // duração máxima aceita
export const MAX_MB = 45;             // tamanho máximo do arquivo enviado (limite do Supabase grátis: 50 MB)
const COMPRIMIR_ACIMA_MB = 10;        // abaixo disso manda como está

function metadados(file) {
  return new Promise((res, rej) => {
    const v = document.createElement("video"); v.preload = "metadata"; v.muted = true; v.playsInline = true;
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight, url }); };
    v.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Não consegui abrir esse vídeo.")); };
    v.src = url;
  });
}

function formatoGravacao() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"])
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  return null;
}

async function comprimir(file, meta, aoAvancar) {
  const tipo = formatoGravacao(); const cv = document.createElement("canvas");
  if (!tipo || !cv.captureStream) return null;
  const k = Math.min(1, 854 / Math.max(meta.w || 854, meta.h || 480));
  cv.width = Math.round((meta.w || 854) * k / 2) * 2; cv.height = Math.round((meta.h || 480) * k / 2) * 2;
  const ctx = cv.getContext("2d");
  const v = document.createElement("video"); v.playsInline = true; v.src = meta.url; v.crossOrigin = "anonymous";
  const stream = cv.captureStream(30);
  try { // áudio: passa pelo WebAudio (não toca no alto-falante)
    const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
    const src = ac.createMediaElementSource(v); const dst = ac.createMediaStreamDestination(); src.connect(dst);
    dst.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch { v.muted = true; }
  const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 96_000 });
  const partes = []; rec.ondataavailable = e => e.data.size && partes.push(e.data);
  const fim = new Promise(res => { rec.onstop = res; });
  await new Promise((res, rej) => { v.oncanplay = res; v.onerror = () => rej(new Error("video")); v.load(); });
  rec.start(1000);
  let parar = false;
  const desenhar = () => { if (parar) return; ctx.drawImage(v, 0, 0, cv.width, cv.height); aoAvancar?.(Math.min(99, Math.round(100 * v.currentTime / (meta.dur || 1)))); requestAnimationFrame(desenhar); };
  await v.play(); desenhar();
  await new Promise(res => { v.onended = res; });
  parar = true; rec.stop(); await fim;
  const blob = new Blob(partes, { type: tipo.split(";")[0] });
  return blob.size > 0 ? blob : null;
}

// devolve { blob, tipo, ext } pronto para enviar, ou lança erro com mensagem para a Lari
export async function prepararVideo(file, aoAvancar) {
  const meta = await metadados(file);
  try {
    if (meta.dur && meta.dur > MAX_SEG + 0.5) throw new Error(`O vídeo tem ${Math.round(meta.dur)} s. Envie vídeos de até ${MAX_SEG} s (dá para cortar no app Fotos).`);
    let blob = file;
    if (file.size > COMPRIMIR_ACIMA_MB * 1048576) {
      const menor = await comprimir(file, meta, aoAvancar).catch(() => null);
      if (menor && menor.size < file.size) blob = menor;
    }
    if (blob.size > MAX_MB * 1048576) throw new Error(`O vídeo ficou com ${Math.round(blob.size / 1048576)} MB. O limite é ${MAX_MB} MB: envie um trecho menor.`);
    const tipo = (blob.type || file.type || "video/mp4").split(";")[0];
    const ext = tipo.includes("webm") ? "webm" : tipo.includes("quicktime") ? "mov" : "mp4";
    return { blob, tipo, ext, dur: meta.dur };
  } finally { URL.revokeObjectURL(meta.url); }
}
