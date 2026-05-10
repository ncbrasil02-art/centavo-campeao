import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function GlobalActivityChat() {
  const [items, setItems] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<string>(`global_chat_${Math.random().toString(36).substring(7)}`);
  const bidChannelRef = useRef<string>(`global_bids_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    fetchInitialData();

    // Subscribe to general chat messages
    const chatChannel = supabase
      .channel(channelRef.current)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (!payload.new.auction_id) {
            fetchMessageDetail(payload.new.id);
          }
        }
      )
      .subscribe();

    // Subscribe to ALL bids for activity feed
    const bidChannel = supabase
      .channel(bidChannelRef.current)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          fetchBidDetail(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(bidChannel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  async function fetchInitialData() {
    // Get last 20 general messages
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .is("auction_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    
    const formattedMessages = (messages || []).map(m => ({ ...m, type: 'chat' }));
    setItems(formattedMessages.reverse());
  }

  async function fetchMessageDetail(id: string) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("id", id)
      .single();
    
    if (data) setItems(prev => [...prev.slice(-49), { ...data, type: 'chat' }]);
  }

  async function fetchBidDetail(id: string) {
    const { data } = await supabase
      .from("bids")
      .select("*, profile:profiles(username), auction:auctions(product:products(name))")
      .eq("id", id)
      .single();
    
    if (data) {
      const bidItem = {
        id: data.id,
        type: 'bid',
        username: data.profile?.username,
        productName: data.auction?.product?.name,
        price: data.price_at_bid,
        created_at: data.created_at
      };
      setItems(prev => [...prev.slice(-49), bidItem]);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      toast.error("Entre para participar do chat!");
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      message: newMessage.trim(),
      auction_id: null
    });

    if (error) {
      toast.error("Erro ao enviar.");
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-3xl overflow-hidden">
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/80">Atividade <span className="text-primary">Global</span></h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] font-black text-white/30 uppercase">LIVE</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="flex flex-col gap-3 py-4">
          {items.length === 0 && (
            <div className="py-10 text-center space-y-2 opacity-20">
              <MessageSquare className="w-6 h-6 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest italic">Silêncio no chat...</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
              {item.type === 'chat' ? (
                <div className="flex gap-2">
                  <Avatar className="w-6 h-6 border border-white/10 shrink-0">
                    <AvatarImage src={item.profile?.avatar_url || getFallbackAvatarUrl(item.profile?.username)} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[8px] font-black">
                      {item.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-primary/80 uppercase tracking-tighter leading-none mb-1">{item.profile?.username}</span>
                    <div className="bg-white/5 rounded-xl rounded-tl-none px-2.5 py-1.5 border border-white/5">
                      <p className="text-xs text-white/70 leading-snug break-words">{item.message}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl p-2 py-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Zap className="w-2.5 h-2.5 text-primary fill-primary animate-pulse" />
                  </div>
                  <div className="text-[9px] leading-tight">
                    <span className="font-black text-white/90">{item.username}</span>
                    <span className="text-white/30 mx-1">lance em</span>
                    <span className="font-black text-primary">{item.productName}</span>
                    <span className="text-white/30 ml-1">por R$ {item.price?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/[0.02] flex gap-2">
        <Input 
          placeholder="Diga algo..." 
          className="bg-black/20 border-white/5 h-9 text-xs rounded-xl placeholder:text-white/20"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="icon" className="h-9 w-9 shrink-0 bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all rounded-xl">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}
