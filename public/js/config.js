// Pet Lar · chaves de funcionamento que mudam com o tempo.

// Fotos e vídeos do diário: por enquanto a Lari manda pelo WhatsApp (decisão do Bruno, 12/11/2026),
// para não pagar armazenamento maior agora. Para voltar a guardar no painel, troque para true.
// O código de envio (foto, vídeo em alta, medidor de espaço) continua pronto.
export const MIDIA_NO_PAINEL = false;
export const midiaNoPainel = () => { if (MIDIA_NO_PAINEL) return true; try { return localStorage.getItem("petlar_midia_painel") === "1"; } catch { return false; } }; // o "1" no aparelho é só para testes
