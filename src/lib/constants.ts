export const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop";
export const FALLBACK_USER_IMAGE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=800&auto=format&fit=crop";

export const getFallbackAvatarUrl = (name?: string) => {
  if (!name) return FALLBACK_USER_IMAGE;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
};

export const FICTITIOUS_PARTICIPANTS = [
  "Marcos Silva", "Ana Oliveira", "Ricardo Santos", "Beatriz Costa", 
  "Lucas Pereira", "Julia Rodrigues", "Thiago Lima", "Fernanda Souza",
  "Gabriel Martins", "Camila Ferreira", "Bruno Alves", "Larissa Gomes",
  "Rafael Ribeiro", "Mariana Carvalho", "Diego Lopes", "Vanessa Teixeira"

export const FICTITIOUS_CHAT_PHRASES = [
  "Vou levar essa!",
  "Alguém mais está de olho?",
  "Esse preço está muito bom",
  "Opa, mais um lance!",
  "Agora vai!",
  "Quase levei na última...",
  "Produto top demais",
  "Será que o preço sobe mais?",
  "Eita, a disputa está quente!",
  "Não desisto fácil",
  "Meu primeiro leilão aqui",
  "Boa sorte a todos!",
  "Essa economia é real mesmo?",
  "Caramba, quase perdi o tempo",
  "Só mais um lancezinho",
  "Alguém já ganhou algo hoje?"
];