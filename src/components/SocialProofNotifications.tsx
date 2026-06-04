import { useState, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, ShoppingBag, Users, Eye } from "lucide-react";

const ACTIVITY_MESSAGES = [
  {
    template: "Fernanda acabou de fazer o cadastro...",
    icon: <UserPlus className="w-4 h-4 text-primary" />,
  },
  {
    template: "João Pedro acabou de comprar um pacote de 100 lances...",
    icon: <ShoppingBag className="w-4 h-4 text-primary" />,
  },
  {
    template: "{count} usuários online...",
    icon: <Users className="w-4 h-4 text-primary" />,
    isDynamic: true,
    type: "online"
  },
  {
    template: "{count} pessoas visualizando os leilões...",
    icon: <Eye className="w-4 h-4 text-primary" />,
    isDynamic: true,
    type: "viewers"
  },
  {
    template: "Três pessoas acabaram de fazer o cadastro..",
    icon: <UserPlus className="w-4 h-4 text-primary" />,
  },
  {
    template: "Mariana acabou de entrar na plataforma...",
    icon: <UserPlus className="w-4 h-4 text-primary" />,
  },
  {
    template: "Ricardo comprou um pacote de 50 lances!",
    icon: <ShoppingBag className="w-4 h-4 text-primary" />,
  },
  {
    template: "Alguém acabou de arrematar um iPhone!",
    icon: <ShoppingBag className="w-4 h-4 text-primary" />,
  }
];

export function SocialProofNotifications() {
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    // Show maximum 3 notifications per session loop or per "burst"
    let notificationsShown = 0;
    const maxNotificationsPerInterval = 3;
    
    const showNotification = () => {
      if (notificationsShown >= maxNotificationsPerInterval) return;

      const randomIndex = Math.floor(Math.random() * ACTIVITY_MESSAGES.length);
      const message = ACTIVITY_MESSAGES[randomIndex];
      
      let displayMessage = message.template;
      
      if (message.isDynamic) {
        const count = message.type === "online" 
          ? Math.floor(Math.random() * 50) + 15 
          : Math.floor(Math.random() * 100) + 30;
        displayMessage = displayMessage.replace("{count}", count.toString());
      }

      toast(displayMessage, {
        icon: message.icon,
        duration: 5000,
        className: "bg-background/95 backdrop-blur-sm border-primary/20",
      });

      notificationsShown++;
    };

    // Initial delay before first notification
    const initialTimeout = setTimeout(() => {
      showNotification();
    }, 15000);

    // Interval between notifications in a burst (short)
    // But the user asked for a "large interval of at least two minutes"
    // and appearing "max two or three times".
    
    const interval = setInterval(() => {
      notificationsShown = 0; // Reset counter every interval to allow another burst
      
      // Show first one immediately when interval triggers
      showNotification();
      
      // Schedule the second one a bit later
      setTimeout(showNotification, 45000);
      
      // Schedule the third one even later
      setTimeout(showNotification, 90000);
      
    }, 2.5 * 60 * 1000); // 2.5 minutes interval

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return null;
}
