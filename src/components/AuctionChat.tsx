import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS, FICTITIOUS_CHAT_PHRASES } from "@/lib/constants";

export function AuctionChat({ auctionId, isFinished }: { auctionId: string, isFinished?: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<string>(`auction_chat_${auctionId}_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Pre-populate with some fictitious messages
    const initialMessages = Array.from({ length: 5 }).map(() => ({
      id: Math.random().toString(36).substring(7),
      message: FICTITIOUS_CHAT_PHRASES[Math.floor(Math.random() * FICTITIOUS_CHAT_PHRASES.length)],
      profile: {
        username: FICTITIOUS_PARTICIPANTS[Math.floor(Math.random() * FICTITIOUS_PARTICIPANTS.length)],
        avatar_url: null
      },
      created_at: new Date().toISOString()
    }));
    setMessages(initialMessages);

    fetchMessages();

    const channel = supabase
      .channel(channelRef.current)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `auction_id=eq.${auctionId}` },
        (payload) => {
          fetchMessageDetail(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    // Fictitious chat simulation
    const chatInterval = setInterval(() => {
      if (isFinished) return;
      if (Math.random() < 0.2) { // 20% chance of a bot sending a message
        const randomUser = FICTITIOUS_PARTICIPANTS[Math.floor(Math.random() * FICTITIOUS_PARTICIPANTS.length)];
        const randomPhrase = FICTITIOUS_CHAT_PHRASES[Math.floor(Math.random() * FICTITIOUS_CHAT_PHRASES.length)];
        
        const botMessage = {
          id: Math.random().toString(36).substring(7),
          message: randomPhrase,
          profile: {
            username: randomUser,
            avatar_url: null
          },
          created_at: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, botMessage].slice(-50));
      }
    }, 4000);

    return () => clearInterval(chatInterval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (data) setMessages(data);
  }

  async function fetchMessageDetail(id: string) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("id", id)
      .single();
    
    if (data) setMessages(prev => [...prev, data]);
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      toast.error("Você precisa estar logado para enviar mensagens.");
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      auction_id: auctionId,
      user_id: user.id,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Erro ao enviar mensagem.");
    } else {
      // For fictitious mode, we add it locally immediately
      const userMessage = {
        id: Math.random().toString(36).substring(7),
        message: newMessage.trim(),
        profile: {
          username: user?.email?.split('@')[0] || "Você",
          avatar_url: null
        },
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage].slice(-50));
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 border border-border rounded-[32px] overflow-hidden backdrop-blur-3xl">
      <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground">Chat do <span className="text-primary">Arremate</span></h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black text-muted-foreground uppercase">LIVE</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground/20">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-muted-foreground/30 font-black uppercase tracking-widest text-[10px] italic">Inicie a conversa agora!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="w-9 h-9 border border-border shadow-sm shrink-0">
                <AvatarImage src={msg.profile?.avatar_url || getFallbackAvatarUrl(msg.profile?.username)} />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">
                  {msg.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{msg.profile?.username || "Usuário"}</span>
                <div className="bg-muted border border-border rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <p className="text-sm text-foreground/80 leading-relaxed break-words">{msg.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-6 border-t border-border bg-muted/30 flex gap-3">
        <Input 
          placeholder="Escreva algo épico..." 
          className="bg-background border-border h-12 text-sm rounded-2xl focus:ring-primary/50 transition-all placeholder:text-primary/50 placeholder:italic font-medium"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95">
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
