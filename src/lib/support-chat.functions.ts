import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `Você é a Fernanda, atendente virtual da Lance Certo (lance-certo.com / centavo-campeão), uma plataforma brasileira de leilões online de centavos e da modalidade "Menor Lance Único".

TOM: amigável, simpática, direta e em português brasileiro. Use no máximo 3 a 5 frases por resposta. Use emojis com moderação (🙂✨🎯).

COMO FUNCIONA A PLATAFORMA:

1) LEILÃO DE CENTAVOS (modalidade principal):
- Cada lance custa 1 unidade do seu saldo (pacote de lances).
- Cada lance dado aumenta o preço do produto em poucos centavos e reinicia o cronômetro regressivo (normalmente 15 segundos).
- Quando o cronômetro chega a zero sem novos lances, quem deu o ÚLTIMO lance ARREMATA o produto pelo preço final exibido (muito abaixo do valor de mercado).
- Os "robôs" são participantes automáticos que mantêm o leilão ativo — competir contra eles é parte da disputa.
- Após o cronômetro zerar, o leilão fica em "Aguardando Auditoria" enquanto a equipe confirma o vencedor.

2) MENOR LANCE ÚNICO:
- O usuário dá palpites de valor (em reais) dentro de uma faixa, ex.: R$ 0,01 a R$ 100,00.
- Cada palpite custa 1 lance do saldo.
- No encerramento da campanha, ganha o MENOR valor que NINGUÉM MAIS tenha palpitado.
- Tem data e cronômetro de encerramento exibido na página da campanha.

3) PACOTES DE LANCES:
- Para participar é preciso ter saldo de lances. Pacotes são comprados em /packages.
- Pagamento via Pix / cartão (Mercado Pago Checkout Pro), crédito é liberado automaticamente.
- Novos cadastros ganham 5 lances grátis (válidos APENAS para leilão de centavos, não valem para Menor Lance Único).
- No Menor Lance Único é OBRIGATÓRIO ter comprado pelo menos um pacote.

4) PAINEL DO USUÁRIO (/profile):
- Abas: Visão Geral, Pagamentos, Meus Lances, Menor Lance Único, Pacotes, Suporte e Conta.

REGRAS DE RESPOSTA:
- Se o usuário pedir para "falar com humano", "atendente", "WhatsApp" ou demonstrar frustração, responda brevemente e termine com: [HANDOFF_WHATSAPP]
- Após 3 ou mais perguntas do usuário na conversa, ofereça o WhatsApp adicionando [HANDOFF_WHATSAPP] no final.
- NUNCA invente preços, datas de leilões específicos, garantias de ganho ou política de reembolso que não esteja listada aqui.
- Se não souber a resposta, seja honesta e ofereça encaminhar para o WhatsApp com [HANDOFF_WHATSAPP].
- Foque em tirar dúvidas e incentivar o uso responsável da plataforma (sem prometer ganhos).`;

const Input = z.object({
  sessionId: z.string().min(8).max(120),
  message: z.string().min(1).max(2000),
  userId: z.string().uuid().nullable().optional(),
  visitorName: z.string().max(80).nullable().optional(),
});

type ChatMsg = { role: "user" | "assistant"; content: string };

export const sendSupportMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Ensure chat row exists
    const { data: existing } = await supabaseAdmin
      .from("support_chats")
      .select("id, message_count")
      .eq("session_id", data.sessionId)
      .maybeSingle();

    let chatId: string;
    let messageCount = 0;
    if (existing) {
      chatId = existing.id;
      messageCount = existing.message_count ?? 0;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("support_chats")
        .insert({
          session_id: data.sessionId,
          user_id: data.userId ?? null,
          visitor_name: data.visitorName ?? null,
        })
        .select("id")
        .single();
      if (createErr || !created) throw new Error(createErr?.message || "Failed to create chat");
      chatId = created.id;
    }

    // Load recent history (last 20)
    const { data: history } = await supabaseAdmin
      .from("support_chat_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(20);

    const prior: ChatMsg[] = (history || [])
      .filter((m: any) => m.role === "user" || m.role === "assistant")
      .map((m: any) => ({ role: m.role, content: m.content }));

    // Save user message
    await supabaseAdmin.from("support_chat_messages").insert({
      chat_id: chatId,
      session_id: data.sessionId,
      role: "user",
      content: data.message,
    });

    // Call Lovable AI Gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "lance-certo-support",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...prior,
          { role: "user", content: data.message },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) throw new Error("Muitas requisições, tente em alguns segundos.");
      if (aiRes.status === 402) throw new Error("Créditos de IA esgotados — avise o administrador.");
      throw new Error(`AI gateway error ${aiRes.status}: ${errText.slice(0, 200)}`);
    }
    const aiJson: any = await aiRes.json();
    let reply: string = aiJson?.choices?.[0]?.message?.content?.trim() || "Desculpe, não consegui responder agora.";

    // Detect/strip handoff sentinel
    let handoff = false;
    if (reply.includes("[HANDOFF_WHATSAPP]")) {
      handoff = true;
      reply = reply.replace(/\[HANDOFF_WHATSAPP\]/g, "").trim();
    }
    // After 3+ user messages, also flag handoff
    const newCount = messageCount + 1;
    if (newCount >= 3) handoff = true;

    await supabaseAdmin.from("support_chat_messages").insert({
      chat_id: chatId,
      session_id: data.sessionId,
      role: "assistant",
      content: reply,
    });

    await supabaseAdmin
      .from("support_chats")
      .update({
        message_count: newCount,
        last_message_at: new Date().toISOString(),
        handoff_whatsapp: handoff ? true : undefined,
      })
      .eq("id", chatId);

    return { reply, handoff };
  });

const HistoryInput = z.object({ sessionId: z.string().min(8).max(120) });
export const getSupportHistory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => HistoryInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: chat } = await supabaseAdmin
      .from("support_chats")
      .select("id, message_count, handoff_whatsapp")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!chat) return { messages: [], handoff: false };
    const { data: msgs } = await supabaseAdmin
      .from("support_chat_messages")
      .select("role, content, created_at")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true })
      .limit(50);
    return {
      messages: (msgs || []).map((m: any) => ({ role: m.role, content: m.content, created_at: m.created_at })),
      handoff: !!chat.handoff_whatsapp,
    };
  });
