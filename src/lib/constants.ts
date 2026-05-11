export const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop";
export const FALLBACK_USER_IMAGE = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=800&auto=format&fit=crop";

export const REAL_PERSON_PHOTOS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?q=80&w=200&auto=format&fit=crop"
];

export const getFallbackAvatarUrl = (name?: string) => {
  if (!name) return FALLBACK_USER_IMAGE;
  // Use name to consistently pick a photo from the list
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const photoIndex = charCodeSum % REAL_PERSON_PHOTOS.length;
  return REAL_PERSON_PHOTOS[photoIndex];
};

export const FICTITIOUS_PARTICIPANTS = [
  "Marcos Silva", "Ana Oliveira", "Ricardo Santos", "Beatriz Costa", 
  "Lucas Pereira", "Julia Rodrigues", "Thiago Lima", "Fernanda Souza",
  "Gabriel Martins", "Camila Ferreira", "Bruno Alves", "Larissa Gomes",
  "Rafael Ribeiro", "Mariana Carvalho", "Diego Lopes", "Vanessa Teixeira"
];

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
