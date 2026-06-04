import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  mercado_pago_public_key: string;
  pix_key: string;
  pix_name: string;
  hero_display_mode: 'phrases' | 'banners';
  theme_mode: 'light' | 'dark';
  ga_id: string;
  fb_pixel_id: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  google_site_verification: string;
  font_color_primary: string;
  font_color_secondary: string;
  card_background_color: string;
  block_background_color: string;
  page_background_color: string;
  border_color: string;
  logo_height: number;
  logo_height_mobile: number;
  logo_padding_x: number;
  logo_padding_y: number;
  google_reviews_widget: string;
  support_whatsapp: string;
  sound_enabled: boolean;
  narration_enabled: boolean;
  welcome_bids: number;
  marquee_text: string;
  marquee_enabled: boolean;
  demo_auctions_enabled: boolean;
  pwa_enabled: boolean;
  android_app_url: string;
  ios_app_url: string;
  whatsapp_number: string;
  whatsapp_float_enabled: boolean;
  terms_of_use: string;
  privacy_policy: string;
  show_secondary_banner: boolean;
  show_finished_auctions: boolean;
  show_testimonials: boolean;
  show_winners_ranking: boolean;
  secondary_banner_title: string;
  secondary_banner_subtitle: string;
  secondary_banner_image: string;
  secondary_banner_link: string;
}





interface SettingsContextType extends SiteSettings {
  updateSettings: (data: Partial<SiteSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Leilão de Centavos",
  logo_url: "https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/site-assets/logo-0.8516991638992043.png",
  favicon_url: "https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/site-assets/favicon-0.8740770155566795.png",
  primary_color: "#f58c14",
  secondary_color: "#1d5bd7",
  mercado_pago_public_key: "",
  pix_key: "",
  pix_name: "",
  hero_display_mode: 'phrases',
  theme_mode: 'dark',
  ga_id: "",
  fb_pixel_id: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  google_site_verification: "",
  font_color_primary: "#ffffff",
  font_color_secondary: "#a1a1aa",
  card_background_color: "#18181b",
  block_background_color: "#27272a",
  page_background_color: "#09090b",
  border_color: "#3f3f46",
  logo_height: 40,
  logo_height_mobile: 32,
  logo_padding_x: 0,
  logo_padding_y: 0,
  google_reviews_widget: "",
  support_whatsapp: "",
  sound_enabled: true,
  narration_enabled: true,
  welcome_bids: 0,
  marquee_text: "Ganhe 5 lances grátis ao se cadastrar! 🚀 Participe dos leilões e arremate produtos incríveis com descontos de até 99%!",
  marquee_enabled: true,
  demo_auctions_enabled: false,
  pwa_enabled: true,
  android_app_url: "",
  ios_app_url: "",
  whatsapp_number: "",
  whatsapp_float_enabled: true,
  terms_of_use: "",
  privacy_policy: "",
  show_secondary_banner: true,
  show_finished_auctions: true,
  show_testimonials: true,
  show_winners_ranking: true,
  secondary_banner_title: "Pacote de Lances com 50% de Desconto",
  secondary_banner_subtitle: "Comece com o pé direito! Adquira seu primeiro pacote de lances agora e ganhe o dobro para disputar seus produtos favoritos.",
  secondary_banner_image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?q=80&w=2000&auto=format&fit=crop",
  secondary_banner_link: "/packages",
};





export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('site_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {
          console.error("Error parsing saved settings", e);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const applySettingsToDOM = (fetchedSettings: SiteSettings) => {
    if (typeof document === 'undefined') return;

    if (fetchedSettings.theme_mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const root = document.documentElement.style;
    root.setProperty("--primary", fetchedSettings.primary_color);
    root.setProperty("--secondary", fetchedSettings.secondary_color);
    root.setProperty("--foreground", fetchedSettings.font_color_primary);
    root.setProperty("--muted-foreground", fetchedSettings.font_color_secondary);
    root.setProperty("--card", fetchedSettings.card_background_color);
    root.setProperty("--muted", fetchedSettings.block_background_color);
    root.setProperty("--background", fetchedSettings.page_background_color);
    root.setProperty("--border", fetchedSettings.border_color);
    
    const glassColor = fetchedSettings.card_background_color;
    root.setProperty("--glass", glassColor + "66");
    root.setProperty("--glass-border", fetchedSettings.border_color + "33");
    root.setProperty("--glass-foreground", fetchedSettings.font_color_primary);

    // Update title immediately if possible
    if (fetchedSettings.meta_title || fetchedSettings.site_name) {
      document.title = fetchedSettings.meta_title || fetchedSettings.site_name;
    }
  };

  // Run on first render to avoid flicker
  if (typeof window !== 'undefined') {
    applySettingsToDOM(settings);
  }

  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings]);

  const updateMetaTags = (data: Partial<SiteSettings>) => {
    const title = data.meta_title || data.site_name || "Leilão de Centavos";
    document.title = title;

    if (data.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.favicon_url;
    }
  };

  const injectScripts = (ga_id?: string, fb_pixel_id?: string) => {
    if (ga_id && !document.getElementById('ga-script-1')) {
      const script1 = document.createElement('script');
      script1.id = 'ga-script-1';
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${ga_id}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.id = 'ga-script-2';
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga_id}');
      `;
      document.head.appendChild(script2);
    }
  };

  const updateSettings = async (data: Partial<SiteSettings>) => {
    const { data: currentSettings } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
    if (!currentSettings) return;

    const { error } = await supabase
      .from("site_settings")
      .update(data)
      .eq("id", currentSettings.id);

    if (error) throw error;
  };

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("Error fetching site settings:", error);
          return;
        }

        if (data) {
          const fetchedSettings: SiteSettings = {
            site_name: data.site_name || DEFAULT_SETTINGS.site_name,
            logo_url: data.logo_url || DEFAULT_SETTINGS.logo_url,
            favicon_url: data.favicon_url || DEFAULT_SETTINGS.favicon_url,
            primary_color: data.primary_color || DEFAULT_SETTINGS.primary_color,
            secondary_color: data.secondary_color || DEFAULT_SETTINGS.secondary_color,
            mercado_pago_public_key: data.mercado_pago_public_key || DEFAULT_SETTINGS.mercado_pago_public_key,
            pix_key: data.pix_key || DEFAULT_SETTINGS.pix_key,
            pix_name: data.pix_name || DEFAULT_SETTINGS.pix_name,
            hero_display_mode: (data.hero_display_mode as any) || DEFAULT_SETTINGS.hero_display_mode,
            theme_mode: (data.theme_mode as any) || DEFAULT_SETTINGS.theme_mode,
            ga_id: data.ga_id || DEFAULT_SETTINGS.ga_id,
            fb_pixel_id: data.fb_pixel_id || DEFAULT_SETTINGS.fb_pixel_id,
            meta_title: data.meta_title || DEFAULT_SETTINGS.meta_title,
            meta_description: data.meta_description || DEFAULT_SETTINGS.meta_description,
            meta_keywords: data.meta_keywords || DEFAULT_SETTINGS.meta_keywords,
            google_site_verification: data.google_site_verification || DEFAULT_SETTINGS.google_site_verification,
            font_color_primary: data.font_color_primary || DEFAULT_SETTINGS.font_color_primary,
            font_color_secondary: data.font_color_secondary || DEFAULT_SETTINGS.font_color_secondary,
            card_background_color: data.card_background_color || DEFAULT_SETTINGS.card_background_color,
            block_background_color: data.block_background_color || DEFAULT_SETTINGS.block_background_color,
            page_background_color: data.page_background_color || DEFAULT_SETTINGS.page_background_color,
            border_color: data.border_color || DEFAULT_SETTINGS.border_color,
            logo_height: data.logo_height || DEFAULT_SETTINGS.logo_height,
            logo_height_mobile: data.logo_height_mobile || DEFAULT_SETTINGS.logo_height_mobile,
            logo_padding_x: data.logo_padding_x || DEFAULT_SETTINGS.logo_padding_x,
            logo_padding_y: data.logo_padding_y || DEFAULT_SETTINGS.logo_padding_y,
            google_reviews_widget: data.google_reviews_widget || DEFAULT_SETTINGS.google_reviews_widget,
            support_whatsapp: data.support_whatsapp || DEFAULT_SETTINGS.support_whatsapp,
            sound_enabled: data.sound_enabled ?? DEFAULT_SETTINGS.sound_enabled,
            narration_enabled: data.narration_enabled ?? DEFAULT_SETTINGS.narration_enabled,
            welcome_bids: data.welcome_bids || DEFAULT_SETTINGS.welcome_bids,
            marquee_text: data.marquee_text || DEFAULT_SETTINGS.marquee_text,
            marquee_enabled: data.marquee_enabled ?? DEFAULT_SETTINGS.marquee_enabled,
            demo_auctions_enabled: data.demo_auctions_enabled ?? DEFAULT_SETTINGS.demo_auctions_enabled,
            pwa_enabled: data.pwa_enabled ?? DEFAULT_SETTINGS.pwa_enabled,
            android_app_url: data.android_app_url || DEFAULT_SETTINGS.android_app_url,
            ios_app_url: data.ios_app_url || DEFAULT_SETTINGS.ios_app_url,
            whatsapp_number: data.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
            whatsapp_float_enabled: data.whatsapp_float_enabled ?? DEFAULT_SETTINGS.whatsapp_float_enabled,
            terms_of_use: data.terms_of_use || DEFAULT_SETTINGS.terms_of_use,
            privacy_policy: data.privacy_policy || DEFAULT_SETTINGS.privacy_policy,
            show_secondary_banner: data.show_secondary_banner ?? DEFAULT_SETTINGS.show_secondary_banner,
            show_finished_auctions: data.show_finished_auctions ?? DEFAULT_SETTINGS.show_finished_auctions,
            show_testimonials: data.show_testimonials ?? DEFAULT_SETTINGS.show_testimonials,
            show_winners_ranking: data.show_winners_ranking ?? DEFAULT_SETTINGS.show_winners_ranking,
            secondary_banner_title: data.secondary_banner_title || DEFAULT_SETTINGS.secondary_banner_title,
            secondary_banner_subtitle: data.secondary_banner_subtitle || DEFAULT_SETTINGS.secondary_banner_subtitle,
            secondary_banner_image: data.secondary_banner_image || DEFAULT_SETTINGS.secondary_banner_image,
            secondary_banner_link: data.secondary_banner_link || DEFAULT_SETTINGS.secondary_banner_link,
          };




          
          setSettings(fetchedSettings);
          localStorage.setItem('site_settings', JSON.stringify(fetchedSettings));
          updateMetaTags(fetchedSettings);
          if (fetchedSettings.ga_id) injectScripts(fetchedSettings.ga_id, fetchedSettings.fb_pixel_id);
          applySettingsToDOM(fetchedSettings);
        }
      } catch (err) {
        console.error("Critical error in fetchSettings:", err);
      }
    }

    fetchSettings();

    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_settings" },
        (payload) => {
          const newData = payload.new as any;
          setSettings(prev => {
            const updated = { ...prev, ...newData };
            updateMetaTags(updated);
            if (updated.ga_id) injectScripts(updated.ga_id, updated.fb_pixel_id);
            applySettingsToDOM(updated);
            localStorage.setItem('site_settings', JSON.stringify(updated));
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ ...settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      ...DEFAULT_SETTINGS,
      updateSettings: async () => {},
    };
  }
  return context;
};