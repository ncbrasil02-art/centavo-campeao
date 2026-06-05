import { ptBR } from "date-fns/locale";
import { format } from "date-fns";

export function formatSchedule(dateString: string) {
  const date = new Date(dateString);
  return {
    full: format(date, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }),
    day: format(date, "dd/MM", { locale: ptBR }),
    time: format(date, "HH:mm")
  };
}
