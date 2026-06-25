import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TENANT_ID } from "@/lib/tenant";

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
}

// Cache localStorage isolado por tenant (evita settings de um tenant
// vazarem para outro no mesmo browser)
const SETTINGS_CACHE_KEY = `site_settings_${TENANT_ID}`;

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
};

const SettingsContext = createContext<SiteSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    // Carrega cache do tenant atual para evitar FOUC
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SETTINGS_CACHE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("[settings] Erro ao parsear cache:", e);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const applySettingsToDOM = (s: SiteSettings) => {
    if (typeof document === 'undefined') return;

    if (s.theme_mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.style.setProperty("--primary", s.primary_color);
    document.documentElement.style.setProperty("--secondary", s.secondary_color);
    document.documentElement.style.setProperty("--foreground", s.font_color_primary);
    document.documentElement.style.setProperty("--muted-foreground", s.font_color_secondary);
    document.documentElement.style.setProperty("--card", s.card_background_color);
    document.documentElement.style.setProperty("--muted", s.block_background_color);
    document.documentElement.style.setProperty("--background", s.page_background_color);
    document.documentElement.style.setProperty("--border", s.border_color);
    document.documentElement.style.setProperty("--glass", s.card_background_color + "66");
    document.documentElement.style.setProperty("--glass-border", s.border_color + "33");
    document.documentElement.style.setProperty("--glass-foreground", s.font_color_primary);
  };

  // Aplica defaults/cache imediatamente
  useEffect(() => {
    applySettingsToDOM(settings);
  }, []);

  const updateMetaTags = (data: Partial<SiteSettings>) => {
    document.title = data.meta_title || data.site_name || "Leilão de Centavos";

    if (data.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.favicon_url;
    }

    const setMeta = (name: string, content?: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };

    setMeta('description', data.meta_description);
    setMeta('keywords', data.meta_keywords);
    setMeta('google-site-verification', data.google_site_verification);
  };

  const injectScripts = (ga_id?: string, fb_pixel_id?: string) => {
    if (ga_id && !document.getElementById('ga-script-1')) {
      const s1 = document.createElement('script');
      s1.id = 'ga-script-1';
      s1.async = true;
      s1.src = `https://www.googletagmanager.com/gtag/js?id=${ga_id}`;
      document.head.appendChild(s1);

      const s2 = document.createElement('script');
      s2.id = 'ga-script-2';
      s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga_id}');`;
      document.head.appendChild(s2);
    }

    if (fb_pixel_id && !document.getElementById('fb-pixel-script')) {
      const s = document.createElement('script');
      s.id = 'fb-pixel-script';
      s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb_pixel_id}');fbq('track','PageView');`;
      document.head.appendChild(s);
    }
  };

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("*")
          .eq("tenant_id", TENANT_ID)   // filtra pelo tenant do domínio atual
          .maybeSingle();

        if (error) {
          console.error(`[settings] Erro ao buscar settings para tenant "${TENANT_ID}":`, error);
          return;
        }

        if (!data) {
          console.warn(`[settings] Nenhuma configuração encontrada para tenant "${TENANT_ID}". Usando defaults.`);
          return;
        }

        const fetched: SiteSettings = {
          site_name:                data.site_name || DEFAULT_SETTINGS.site_name,
          logo_url:                 data.logo_url || DEFAULT_SETTINGS.logo_url,
          favicon_url:              data.favicon_url || "",
          primary_color:            data.primary_color || DEFAULT_SETTINGS.primary_color,
          secondary_color:          data.secondary_color || DEFAULT_SETTINGS.secondary_color,
          mercado_pago_public_key:  data.mercado_pago_public_key || "",
          pix_key:                  data.pix_key || "",
          pix_name:                 data.pix_name || "",
          hero_display_mode:        (data.hero_display_mode as any) || 'phrases',
          theme_mode:               (data.theme_mode as any) || 'dark',
          ga_id:                    data.ga_id || "",
          fb_pixel_id:              data.fb_pixel_id || "",
          meta_title:               data.meta_title || "",
          meta_description:         data.meta_description || "",
          meta_keywords:            data.meta_keywords || "",
          google_site_verification: data.google_site_verification || "",
          font_color_primary:       data.font_color_primary || (data.theme_mode === 'dark' ? "#ffffff" : "#000000"),
          font_color_secondary:     data.font_color_secondary || (data.theme_mode === 'dark' ? "#a1a1aa" : "#666666"),
          card_background_color:    data.card_background_color || (data.theme_mode === 'dark' ? "#18181b" : "#ffffff"),
          block_background_color:   data.block_background_color || (data.theme_mode === 'dark' ? "#27272a" : "#f3f4f6"),
          page_background_color:    data.page_background_color || (data.theme_mode === 'dark' ? "#09090b" : "#ffffff"),
          border_color:             data.border_color || (data.theme_mode === 'dark' ? "#3f3f46" : "#e5e7eb"),
          logo_height:              data.logo_height || 40,
          logo_height_mobile:       data.logo_height_mobile || 32,
          logo_padding_x:           data.logo_padding_x ?? 0,
          logo_padding_y:           data.logo_padding_y ?? 0,
          google_reviews_widget:    data.google_reviews_widget || "",
          support_whatsapp:         data.support_whatsapp || "",
        };

        setSettings(fetched);
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(fetched));
        updateMetaTags(fetched);
        injectScripts(fetched.ga_id, fetched.fb_pixel_id);
        applySettingsToDOM(fetched);
      } catch (err) {
        console.error("[settings] Erro crítico em fetchSettings:", err);
      }
    }

    fetchSettings();

    // Realtime: escuta mudanças apenas do tenant atual
    const channel = supabase
      .channel(`site_settings_changes_${TENANT_ID}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "site_settings",
          filter: `tenant_id=eq.${TENANT_ID}`,
        },
        (payload) => {
          const d = payload.new as any;
          setSettings(prev => {
            const updated: SiteSettings = {
              ...prev,
              site_name:                d.site_name || prev.site_name,
              logo_url:                 d.logo_url || prev.logo_url,
              favicon_url:              d.favicon_url || prev.favicon_url,
              primary_color:            d.primary_color || prev.primary_color,
              secondary_color:          d.secondary_color || prev.secondary_color,
              mercado_pago_public_key:  d.mercado_pago_public_key ?? prev.mercado_pago_public_key,
              pix_key:                  d.pix_key ?? prev.pix_key,
              pix_name:                 d.pix_name ?? prev.pix_name,
              hero_display_mode:        d.hero_display_mode || prev.hero_display_mode,
              theme_mode:               d.theme_mode || prev.theme_mode,
              ga_id:                    d.ga_id ?? prev.ga_id,
              fb_pixel_id:              d.fb_pixel_id ?? prev.fb_pixel_id,
              meta_title:               d.meta_title ?? prev.meta_title,
              meta_description:         d.meta_description ?? prev.meta_description,
              meta_keywords:            d.meta_keywords ?? prev.meta_keywords,
              google_site_verification: d.google_site_verification ?? prev.google_site_verification,
              font_color_primary:       d.font_color_primary || prev.font_color_primary,
              font_color_secondary:     d.font_color_secondary || prev.font_color_secondary,
              card_background_color:    d.card_background_color || prev.card_background_color,
              block_background_color:   d.block_background_color || prev.block_background_color,
              page_background_color:    d.page_background_color || prev.page_background_color,
              border_color:             d.border_color || prev.border_color,
              logo_height:              d.logo_height || prev.logo_height,
              logo_height_mobile:       d.logo_height_mobile || prev.logo_height_mobile,
              logo_padding_x:           d.logo_padding_x ?? prev.logo_padding_x,
              logo_padding_y:           d.logo_padding_y ?? prev.logo_padding_y,
              google_reviews_widget:    d.google_reviews_widget ?? prev.google_reviews_widget,
              support_whatsapp:         d.support_whatsapp ?? prev.support_whatsapp,
            };
            updateMetaTags(updated);
            injectScripts(updated.ga_id, updated.fb_pixel_id);
            applySettingsToDOM(updated);
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
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
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) return DEFAULT_SETTINGS;
  return context;
};
