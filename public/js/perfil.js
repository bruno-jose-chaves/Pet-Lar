// Quem está usando o painel e o que pode fazer (o banco também garante isso pelo RLS)
export const PAPEIS = {
  admin: { nome: "Administrador", desc: "Tudo, inclusive dar e tirar acessos." },
  gestora: { nome: "Gestora", desc: "Todo o negócio: propostas, valores, financeiro, Pix e configurações. Não mexe em acessos." },
  assistente: { nome: "Assistente", desc: "Rotina dos pets: Hoje, Agenda, Pets e Tutores. Não vê valores, propostas nem financeiro." },
};
export const perfil = { papel: null, email: null, nome: null };
export const gestao = () => perfil.papel === "admin" || perfil.papel === "gestora";
export const admin = () => perfil.papel === "admin";
