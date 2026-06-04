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
}

interface SettingsContextType extends SiteSettings {
  updateSettings: (data: Partial<SiteSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: "Leilão de Centavos",
  logo_url: "https://jqwnzcuvslqpltjwawyr.supabase.co/storage/v1/object/public/site-assets/logo-0.8516991638992043.png",
  favicon_url: "",
  primary_color: "#8B5CF6",
  secondary_color: "#7C3AED",
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
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('site_settings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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

    document.documentElement.style.setProperty("--primary", fetchedSettings.primary_color);
    document.documentElement.style.setProperty("--secondary", fetchedSettings.secondary_color);
    document.documentElement.style.setProperty("--foreground", fetchedSettings.font_color_primary);
    document.documentElement.style.setProperty("--muted-foreground", fetchedSettings.font_color_secondary);
    document.documentElement.style.setProperty("--card", fetchedSettings.card_background_color);
    document.documentElement.style.setProperty("--muted", fetchedSettings.block_background_color);
    document.documentElement.style.setProperty("--background", fetchedSettings.page_background_color);
    document.documentElement.style.setProperty("--border", fetchedSettings.border_color);
    
    const glassColor = fetchedSettings.card_background_color;
    document.documentElement.style.setProperty("--glass", glassColor + "66");
    document.documentElement.style.setProperty("--glass-border", fetchedSettings.border_color + "33");
    document.documentElement.style.setProperty("--glass-foreground", fetchedSettings.font_color_primary);
  };

  useEffect(() => {
    applySettingsToDOM(settings);
  }, []);

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

    if (data.meta_description) {
      let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.getElementsByTagName('head')[0].appendChild(metaDesc);
      }
      metaDesc.content = data.meta_description;
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
    const { error } = await supabase
      .from("site_settings")
      .update(data)
      .eq("id", (await supabase.from("site_settings").select("id").limit(1).single()).data?.id);

    if (error) throw error;
    // The real-time subscription will update the local state
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
            ...DEFAULT_SETTINGS,
            ...data
          };
          
          setSettings(fetchedSettings);
          localStorage.setItem('site_settings', JSON.stringify(fetchedSettings));
          updateMetaTags(fetchedSettings);
          injectScripts(fetchedSettings.ga_id, fetchedSettings.fb_pixel_id);
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
            injectScripts(updated.ga_id, updated.fb_pixel_id);
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