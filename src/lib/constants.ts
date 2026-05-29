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
  "https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534751435712-4b9845490a18?q=80&w=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=200&auto=format&fit=crop"
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
