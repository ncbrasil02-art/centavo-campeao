import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TENANT_ID } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Upload, CheckCircle2, Video, Camera, Clock, CheckCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { getFallbackAvatarUrl } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";


export function AuctionClaimPanel({ auctionId, winnerData }: { auctionId: string, winnerData: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(winnerData?.payment_receipt_url || null);
  const [paymentStatus, setPaymentStatus] = useState<string>(winnerData?.payment_status || 'pending');
  const [testimonialContent, setTestimonialContent] = useState("");
  const [testimonialMedia, setTestimonialMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [testimonialStatus, setTestimonialStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    fetchMessages();
    fetchTestimonial();

    const channel = supabase
      .channel(`claim_chat_${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_claim_messages', filter: `auction_id=eq.${auctionId}` },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("auction_claim_messages")
      .select("*")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true });
    
    if (data) setMessages(data);
  }

  async function fetchTestimonial() {
    const { data } = await supabase
      .from("testimonials")
      .select("*")
      .eq("auction_id", auctionId)
      .single();
    
    if (data) {
      setTestimonialContent(data.content);
      if (data.media_url) {
        setTestimonialMedia({ url: data.media_url, type: data.media_type as any });
      }
      setTestimonialStatus(data.status as any);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const { error } = await supabase.from("auction_claim_messages").insert({
      auction_id: auctionId,
      sender_id: user.id,
      message: newMessage.trim(),
      is_admin_reply: false
    });

    if (error) {
      toast.error("Erro ao enviar mensagem.");
    } else {
      setNewMessage("");
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${auctionId}_receipt_${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('auction-claims')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('auction-claims')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.rpc('submit_winner_receipt', {
        p_auction_id: auctionId,
        p_url: publicUrl,
      });

      if (updateError) throw updateError;

      setReceiptUrl(publicUrl);
      setPaymentStatus('pending');
      toast.success("Comprovante enviado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao enviar comprovante: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithBids = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("pay_with_bid_balance", {
        p_auction_id: auctionId
      });

      if (error) throw error;
      
      const result = data as any;
      if (result.success) {
        setPaymentStatus('approved');
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("Erro ao processar pagamento com lances: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadTestimonialMedia = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${auctionId}_testimonial_${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath);

      setTestimonialMedia({ url: publicUrl, type });
      toast.success("Mídia carregada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao carregar mídia: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTestimonial = async () => {
    if (!testimonialContent.trim() || !user) {
      toast.error("Por favor, escreva seu depoimento.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        auction_id: auctionId,
        user_id: user.id,
        name: user.user_metadata?.username || user.email?.split('@')[0] || "Ganhador",
        content: testimonialContent,
        media_url: testimonialMedia?.url || null,
        media_type: testimonialMedia?.type || 'text',
        status: 'pending',
        active: false,
        rating: 5,
        tenant_id: TENANT_ID
      };

      const { error } = await supabase
        .from('testimonials')
        .upsert(payload, { onConflict: 'auction_id' });

      if (error) throw error;

      setTestimonialStatus('pending');
      toast.success("Depoimento enviado para moderação!");
    } catch (error: any) {
      toast.error("Erro ao enviar depoimento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-2xl p-1 h-14">
          <TabsTrigger value="chat" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs">
            <MessageSquare className="w-4 h-4 mr-2" /> Chat Suporte
          </TabsTrigger>
          <TabsTrigger value="payment" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Pagamento
          </TabsTrigger>
          <TabsTrigger value="testimonial" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase italic text-xs">
            <Video className="w-4 h-4 mr-2" /> Depoimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6 border-0 p-0 outline-none">
          <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden flex flex-col h-[500px]">
            <CardHeader className="bg-white/5 border-b border-white/10">
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Chat com <span className="text-primary">Administração</span></CardTitle>
              <CardDescription>Use este chat para tirar dúvidas sobre a entrega do seu prêmio.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="flex flex-col gap-4">
                  {messages.length === 0 && (
                    <div className="text-center py-10 opacity-40 italic">Inicie uma conversa para reivindicar seu prêmio.</div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${msg.is_admin_reply ? 'bg-zinc-800 rounded-tl-none' : 'bg-primary text-black font-medium rounded-tr-none'}`}>
                        <p className="text-sm">{msg.message}</p>
                        <span className={`text-[10px] mt-1 block ${msg.is_admin_reply ? 'text-white/40' : 'text-black/60'}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
                <Input 
                  placeholder="Mensagem..." 
                  className="bg-black/20 border-white/10"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" className="bg-primary text-black">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card className="bg-white/5 border-white/10 rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase italic">Comprovante de <span className="text-primary">Pagamento</span></CardTitle>
              <CardDescription>Anexe o comprovante do pagamento residual do leilão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {paymentStatus === 'approved' ? (
                <div className="bg-green-500/10 border border-green-500/20 p-8 rounded-3xl text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase italic text-green-500">Pagamento Confirmado!</h3>
                  <p className="text-white/60">Seu pagamento foi verificado e aprovado. Em breve seu produto será enviado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                      <h4 className="font-bold mb-2">Instruções:</h4>
                      <ul className="text-sm text-white/60 space-y-2 list-disc pl-4">
                        <li>Realize o pagamento do valor arrematado.</li>
                        <li>Tire um print ou foto do comprovante.</li>
                        <li>Anexe o arquivo abaixo.</li>
                        <li>Aguarde a conferência administrativa (até 24h).</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Status Atual:</Label>
                      <div className="flex items-center gap-2">
                        {paymentStatus === 'pending' ? (
                          <span className="flex items-center gap-1.5 text-amber-500 font-bold uppercase italic text-xs">
                            <Clock className="w-4 h-4" /> Aguardando Conferência
                          </span>
                        ) : paymentStatus === 'rejected' ? (
                          <span className="flex items-center gap-1.5 text-red-500 font-bold uppercase italic text-xs">
                            <XCircle className="w-4 h-4" /> Comprovante Recusado
                          </span>
                        ) : (
                          <span className="text-white/40 text-xs italic">Nenhum comprovante enviado ainda.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-6 bg-black/20 group hover:border-primary/50 transition-colors cursor-pointer relative h-32">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*,application/pdf"
                        onChange={handleUploadReceipt}
                        disabled={loading}
                      />
                      {receiptUrl ? (
                        <div className="text-center flex items-center gap-4">
                          <img src={receiptUrl} className="h-16 w-16 object-cover rounded-xl border border-white/10" alt="Comprovante" />
                          <p className="text-[10px] text-primary font-bold uppercase italic">Trocar Comprovante</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-white/20 mb-2 mx-auto group-hover:text-primary transition-colors" />
                          <p className="text-sm font-bold">Enviar Comprovante</p>
                          <p className="text-[10px] text-white/40">PNG, JPG ou PDF (Máx. 5MB)</p>
                        </div>
                      )}
                    </div>

                    <div className="p-1 bg-gradient-to-r from-primary/20 to-amber-500/20 rounded-3xl border border-white/5">
                      <Button 
                        onClick={handlePayWithBids}
                        disabled={loading || paymentStatus === 'pending'}
                        className="w-full h-16 bg-black/40 hover:bg-black/60 text-white rounded-[22px] flex flex-col items-center justify-center gap-0 border-0 group"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-primary animate-pulse" />
                          <span className="font-black uppercase italic tracking-tighter">Pagar com Lances</span>
                        </div>
                        <span className="text-[9px] text-white/40 uppercase font-bold">Usar saldo da conta (1 lance = R$ 1,00)</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testimonial" className="mt-6">
          <Card className="bg-white/5 border-white/10 rounded-[32px]">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase italic">Subir meu <span className="text-primary">Depoimento</span></CardTitle>
              <CardDescription>Conte sua experiência e mostre seu prêmio para o mundo!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {testimonialStatus === 'approved' && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl mb-4">
                  <p className="text-green-500 text-sm font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Seu depoimento já está publicado no site!
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seu Relato</Label>
                    <Textarea 
                      placeholder="Ex: Não acreditei quando ganhei esse iPhone gastando tão poucos lances! O site é nota 10..."
                      className="bg-white/5 border-white/10 min-h-[150px]"
                      value={testimonialContent}
                      onChange={e => setTestimonialContent(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full bg-primary text-black font-black uppercase italic" 
                    onClick={handleSubmitTestimonial}
                    disabled={loading || testimonialStatus === 'pending'}
                  >
                    {testimonialStatus === 'pending' ? 'AGUARDANDO APROVAÇÃO' : 'ENVIAR DEPOIMENTO'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <Label>Foto ou Vídeo do Produto</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 bg-black/20 hover:border-primary/50 transition-colors cursor-pointer relative h-40">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*"
                        onChange={e => handleUploadTestimonialMedia(e, 'image')}
                        disabled={loading}
                      />
                      <Camera className="w-8 h-8 text-white/20 mb-2" />
                      <p className="text-[10px] font-bold uppercase text-center">Subir Foto</p>
                    </div>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 bg-black/20 hover:border-primary/50 transition-colors cursor-pointer relative h-40">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="video/*"
                        onChange={e => handleUploadTestimonialMedia(e, 'video')}
                        disabled={loading}
                      />
                      <Video className="w-8 h-8 text-white/20 mb-2" />
                      <p className="text-[10px] font-bold uppercase text-center">Subir Vídeo</p>
                    </div>
                  </div>

                  {testimonialMedia && (
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl overflow-hidden">
                      <p className="text-xs font-bold text-primary mb-2 uppercase italic flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> Arquivo Selecionado
                      </p>
                      {testimonialMedia.type === 'video' ? (
                        <video src={testimonialMedia.url} className="w-full rounded-lg max-h-40 object-cover" controls />
                      ) : (
                        <img src={testimonialMedia.url} className="w-full rounded-lg max-h-40 object-cover" alt="Depoimento" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function XCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  )
}
