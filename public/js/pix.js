// Pix "copia e cola" (BR Code estático, padrão EMV do Banco Central) + QR Code
const f = (id, v) => id + String(v.length).padStart(2, "0") + v;
const limpa = (s, n) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .@+\-_/]/g, "").trim().toUpperCase().slice(0, n);

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// chave: CPF/CNPJ (só números), e-mail, telefone (+55...) ou aleatória
export function normalizaChave(ch) {
  ch = String(ch || "").trim();
  if (/@/.test(ch)) return ch.toLowerCase();
  const d = ch.replace(/\D/g, "");
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ch)) return ch.toLowerCase(); // aleatória
  if (d.length === 11 && /^\(?\d{2}\)?\s?9/.test(ch)) return "+55" + d; // celular com DDD
  if (d.length === 13 && d.startsWith("55")) return "+" + d;
  return d || ch; // CPF/CNPJ
}

export function pixPayload({ chave, nome, cidade, valor, txid }) {
  const gui = f("00", "br.gov.bcb.pix") + f("01", normalizaChave(chave));
  let p = f("00", "01") + f("26", gui) + f("52", "0000") + f("53", "986");
  if (valor && valor > 0) p += f("54", Number(valor).toFixed(2));
  p += f("58", "BR") + f("59", limpa(nome || "PET LAR", 25) || "PET LAR") + f("60", limpa(cidade || "BALNEARIO CAMBORIU", 15) || "BALNEARIO");
  p += f("62", f("05", (String(txid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25)) || "***"));
  p += "6304";
  return p + crc16(p);
}

export async function pixQR(payload, cell = 6) {
  if (!window.qrcode) { const { loadScript } = await import("./ui.js"); await loadScript("/vendor/qrcode.js"); }
  const qr = window.qrcode(0, "M"); qr.addData(payload); qr.make();
  return qr.createDataURL(cell, 2);
}
