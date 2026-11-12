// Vídeos do diário: qualidade primeiro. O vídeo vai ORIGINAL sempre que couber no limite do armazenamento.
// Só quando passa do limite ele é regravado no próprio celular em Full HD (1920 px), com a maior taxa
// que ainda cabe (até 16 Mbps). Nunca diminui abaixo de Full HD.
// O limite vem do armazenamento: Supabase grátis aceita até 50 MB por arquivo.

export const MAX_SEG = 90;            // duração máxima aceita
export const MAX_MB = 48;             // tamanho máximo do arquivo enviado
const LADO_MAX = 1920;                // Full HD

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
  const k = Math.min(1, LADO_MAX / Math.max(meta.w || LADO_MAX, meta.h || 1080));
  cv.width = Math.round((meta.w || 1920) * k / 2) * 2; cv.height = Math.round((meta.h || 1080) * k / 2) * 2;
  // a maior taxa que cabe no limite (com folga de 8% para o áudio e o "envelope" do arquivo)
  const bps = Math.max(4_000_000, Math.min(16_000_000, Math.floor(MAX_MB * 1048576 * 8 * 0.92 / Math.max(1, meta.dur || 30)) - 160_000));
  const ctx = cv.getContext("2d");
  const v = document.createElement("video"); v.playsInline = true; v.src = meta.url; v.crossOrigin = "anonymous";
  const stream = cv.captureStream(Math.min(60, Math.max(24, Math.round(meta.fps || 30))));
  try { // áudio: passa pelo WebAudio (não toca no alto-falante)
    const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
    const src = ac.createMediaElementSource(v); const dst = ac.createMediaStreamDestination(); src.connect(dst);
    dst.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  } catch { v.muted = true; }
  const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: bps, audioBitsPerSecond: 160_000 });
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
    if (file.size > MAX_MB * 1048576) { // só regrava quando não cabe; abaixo disso vai o original, na qualidade do iPhone
      const menor = await comprimir(file, meta, aoAvancar).catch(() => null);
      if (menor && menor.size < file.size) blob = menor;
    }
    if (blob.size > MAX_MB * 1048576) throw new Error(`Esse vídeo tem ${Math.round(blob.size / 1048576)} MB e o limite hoje é ${MAX_MB} MB. Envie um trecho menor (no app Fotos: Editar e cortar).`);
    const tipo = (blob.type || file.type || "video/mp4").split(";")[0];
    const ext = tipo.includes("webm") ? "webm" : tipo.includes("quicktime") ? "mov" : "mp4";
    return { blob, tipo, ext, dur: meta.dur };
  } finally { URL.revokeObjectURL(meta.url); }
}
