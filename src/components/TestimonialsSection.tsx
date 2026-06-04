import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Video, Image as ImageIcon, Quote, Play } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface TestimonialsSectionProps {
  testimonials?: any[];
}

export function TestimonialsSection({ testimonials: initialTestimonials }: TestimonialsSectionProps) {
  const [testimonials, setTestimonials] = useState<any[]>(initialTestimonials || []);
  const [loading, setLoading] = useState(!initialTestimonials);

  useEffect(() => {
    if (!initialTestimonials) {
      fetchTestimonials();
    } else {
      setTestimonials(initialTestimonials);
      setLoading(false);
    }
  }, [initialTestimonials]);

  async function fetchTestimonials() {
    try {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      
      if (data) setTestimonials(data);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || testimonials.length === 0) return null;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <Badge variant="outline" className="border-primary/30 text-primary uppercase font-black italic tracking-widest px-4 py-1">
            Social Proof
          </Badge>
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-foreground leading-tight">
            Ganhadores <span className="text-primary">Reais</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Veja quem já arrematou produtos incríveis por preços inacreditáveis na nossa plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full bg-card border-border hover:border-primary/30 transition-all duration-500 group rounded-[32px] overflow-hidden flex flex-col">
                {t.media_url && (
                  <div className="relative aspect-video overflow-hidden">
                    {t.media_type === 'video' ? (
                      <div className="relative w-full h-full">
                        <video src={t.media_url} className="w-full h-full object-cover" muted loop playsInline />
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-black">
                                <Play className="w-6 h-6 fill-current" />
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl bg-black border-0 p-0 overflow-hidden">
                            <video src={t.media_url} controls autoPlay className="w-full h-full" />
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="relative w-full h-full cursor-pointer">
                            <img src={t.media_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={t.name} />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-black border-0 p-0 overflow-hidden">
                          <img src={t.media_url} className="w-full h-full" alt={t.name} />
                        </DialogContent>
                      </Dialog>
                    )}
                    <div className="absolute top-4 right-4 z-10">
                      {t.media_type === 'video' ? (
                        <div className="bg-primary text-black p-2 rounded-full shadow-lg">
                          <Video className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="bg-primary text-black p-2 rounded-full shadow-lg">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <CardContent className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.rating || 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <div className="relative">
                      <Quote className="absolute -top-2 -left-4 w-8 h-8 text-primary/10 -z-10" />
                      <p className="text-muted-foreground italic leading-relaxed line-clamp-4">
                        "{t.content}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-6 border-t border-border mt-auto">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                      {t.avatar_url ? (
                        <img src={t.avatar_url} className="w-full h-full object-cover" alt={t.name} />
                      ) : (
                        <span className="text-lg font-black text-primary">{t.name?.substring(0, 1)}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black italic uppercase tracking-tighter text-foreground">{t.name}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Ganhador Verificado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
