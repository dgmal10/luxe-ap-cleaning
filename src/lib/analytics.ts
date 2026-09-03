/**
 * Google Analytics 4 — Utilitário de rastreamento de eventos e pageviews.
 * Usa a variável de ambiente VITE_GA_MEASUREMENT_ID.
 * Se não configurada, todas as funções são silenciosamente ignoradas (modo demo/dev).
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

/** Retorna true se o GA está configurado e o gtag está disponível */
function isGAReady(): boolean {
  return Boolean(GA_ID && typeof window !== 'undefined' && typeof (window as any).gtag === 'function');
}

/**
 * Rastreia uma visualização de página (pageview).
 * Chamado automaticamente em cada mudança de rota.
 */
export function trackPageView(path: string, title?: string): void {
  if (!isGAReady()) return;
  (window as any).gtag('config', GA_ID, {
    page_path: path,
    page_title: title || document.title,
  });
}

/**
 * Rastreia um evento personalizado.
 * @example trackEvent('booking', 'form_submitted', 'Deep Cleaning')
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
): void {
  if (!isGAReady()) return;
  (window as any).gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
}

/** Eventos pré-definidos para o site LUXE A&P */
export const Analytics = {
  /** Cliente iniciou o formulário de agendamento */
  bookingStarted: () => trackEvent('booking', 'booking_started'),

  /** Cliente concluiu um agendamento com sucesso */
  bookingCompleted: (service: string, price: number) =>
    trackEvent('booking', 'booking_completed', service, price),

  /** Cliente enviou mensagem de contato */
  contactMessageSent: () => trackEvent('contact', 'message_sent'),

  /** Cliente clicou em WhatsApp */
  whatsappClicked: () => trackEvent('contact', 'whatsapp_clicked'),

  /** Cliente clicou em ligar */
  phoneCallClicked: () => trackEvent('contact', 'phone_call_clicked'),

  /** Cliente clicou no botão Book Now */
  bookNowClicked: (source: string) => trackEvent('cta', 'book_now_clicked', source),
};
