/**
 * Serviço de e-mail via EmailJS — envia notificações de agendamento, confirmação, cancelamento e contato.
 */
import emailjs from '@emailjs/browser';
import type { BookingFormData, ContactFormData, Booking } from '../types';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_ej0ck9z';
const BOOKING_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_ymjnxv8';
const CONTACT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const CONFIRM_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CONFIRM_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const CANCEL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CANCEL_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'EyKqkTJBOSponl3xH';

export const isEmailConfigured = Boolean(SERVICE_ID && BOOKING_TEMPLATE_ID && PUBLIC_KEY);

// Inicializa o EmailJS com a chave pública
if (PUBLIC_KEY) {
  try {
    emailjs.init({ publicKey: PUBLIC_KEY });
  } catch (err) {
    console.warn('[EmailJS] Aviso na inicialização:', err);
  }
}

/** Envia e-mail de notificação de novo agendamento para o Admin */
export async function sendBookingEmail(booking: BookingFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Chaves não configuradas. E-mail não enviado.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com', // Sempre chega ao Gmail do Admin
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      home_size: `${booking.bedrooms} Bedroom(s), ${booking.bathrooms} Bathroom(s)`,
      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      estimated_price: `$${booking.estimatedPrice}`,
      final_price: `$${booking.estimatedPrice} (Reference Suggestion)`,
      price: `$${booking.estimatedPrice}`,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      message: `NEW CLIENT REQUEST:\n• Name: ${booking.name}\n• Phone: ${booking.phone}\n• Email: ${booking.email}\n• Address: ${booking.address}\n• Home Size: ${booking.bedrooms} Bed, ${booking.bathrooms} Bath\n• Service: ${booking.service}\n• Date: ${booking.date} at ${booking.time}`,
      manage_url: `${window.location.origin}/admin`,
      subject: `New Booking Request: ${booking.name} (${booking.date} at ${booking.time})`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail para Admin enviado com sucesso:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de agendamento para o Admin:', error);
    return false;
  }
}

/** 1º E-mail para o CLIENTE: Recibo de solicitação recebida (Aguardando orçamento do ADM) */
export async function sendClientReceiptEmail(booking: BookingFormData, bookingId: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const manageUrl = `${window.location.origin}/manage-booking?id=${bookingId}`;
    const templateParams = {
      to_name: booking.name,
      to_email: booking.email, // Chega ao e-mail do Cliente
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      home_size: `${booking.bedrooms} Bedroom(s), ${booking.bathrooms} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      final_price: 'Quote Under Review (Our team will send your customized price shortly)',
      estimated_price: 'Pending Review',
      price: 'Pending Review',
      manage_url: manageUrl,
      message: `Thank you for choosing LUXE A&P Cleaning! We have received your booking request for ${booking.service} on ${booking.date} at ${booking.time}. Our team is reviewing your home specifications and will send your personalized quote shortly.`,
      subject: `Your Booking Request with LUXE A&P Cleaning (${booking.date})`,
    };

    const res = await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail de recibo para o Cliente enviado com sucesso:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de recibo para o Cliente:', error);
    return false;
  }
}

/** 2º E-mail para o CLIENTE: Enviado pelo ADM com o orçamento pronto para aprovação */
export async function sendClientQuoteEmail(booking: Booking): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;
    const approveUrl = `${window.location.origin}/manage-booking?id=${booking.id}&action=approve`;
    const declineUrl = `${window.location.origin}/manage-booking?id=${booking.id}&action=decline`;
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const templateParams = {
      to_name: booking.name,
      to_email: booking.email,
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice}`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      approve_url: approveUrl,
      decline_url: declineUrl,
      manage_url: manageUrl,
      message: `Great news! Our team has reviewed your home details and prepared your customized quote of $${quotePrice} for ${booking.service} on ${booking.date} at ${booking.time}. Please click one of the buttons below to approve or decline your quote so we can reserve your cleaning team!`,
      subject: `Your Customized Quote ($${quotePrice}): LUXE A&P Cleaning (${booking.date})`,
    };

    const res = await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail de orçamento para cliente enviado:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de orçamento para cliente:', error);
    return false;
  }
}

/** Notifica o Admin que o cliente APROVOU o orçamento */
export async function sendAdminQuoteApprovedAlert(booking: Booking): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;
    const manageUrl = `${window.location.origin}/admin`;

    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice} (Approved by Client)`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      message: `🎉 GREAT NEWS! Customer ${booking.name} has officially APPROVED your quote of $${quotePrice} for ${booking.service} on ${booking.date} at ${booking.time}. The appointment is now CONFIRMED!`,
      subject: `Quote Approved by Client: ${booking.name} ($${quotePrice}) — ${booking.date}`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Alerta de aprovação de orçamento enviado ao admin:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar alerta de aprovação para admin:', error);
    return false;
  }
}

/** Notifica o Admin que o cliente RECUSOU o orçamento */
export async function sendAdminQuoteDeclinedAlert(booking: Booking, reason?: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;
    const manageUrl = `${window.location.origin}/admin`;
    const declineReason = reason || 'Customer declined the quote';

    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice} (Declined)`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      message: `CUSTOMER DECLINED QUOTE:\n• Customer: ${booking.name}\n• Phone: ${booking.phone}\n• Email: ${booking.email}\n• Quote Value: $${quotePrice}\n• Service: ${booking.service} on ${booking.date} at ${booking.time}\n• Reason/Feedback: ${declineReason}`,
      subject: `Quote Declined by Customer: ${booking.name} ($${quotePrice})`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Alerta de recusa de orçamento enviado ao admin:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar alerta de recusa para admin:', error);
    return false;
  }
}

/** E-mail de confirmação final direta para o Cliente */
export async function sendClientConfirmationEmail(booking: Booking): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const templateParams = {
      to_name: booking.name,
      to_email: booking.email,
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address,
      address: booking.address,
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice}`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      message: `Your appointment for ${booking.service} on ${booking.date} at ${booking.time} has been officially confirmed at $${quotePrice}. We look forward to serving you!`,
      subject: `Appointment Confirmed: LUXE A&P Cleaning (${booking.date})`,
    };

    const res = await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail de confirmação com orçamento enviado com sucesso:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de confirmação para o Cliente:', error);
    return false;
  }
}

/** Envia e-mail de cancelamento de agendamento para o Cliente */
export async function sendClientCancellationEmail(booking: Booking, reason?: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;
    const cancelReason = reason || 'Cancelled per customer request';
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;

    const templateParams = {
      to_name: booking.name,
      to_email: booking.email,
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address || 'On file',
      address: booking.address || 'On file',
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice} (Cancelled)`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      cancel_reason: cancelReason,
      message: `Your appointment for ${booking.service} on ${booking.date} at ${booking.time} has been officially cancelled (${cancelReason}). If you wish to reschedule in the future, please feel free to book again on our website!`,
      subject: `Appointment Cancelled: LUXE A&P Cleaning (${booking.date})`,
    };

    const res = await emailjs.send(SERVICE_ID, CANCEL_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail de cancelamento enviado:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de cancelamento para o Cliente:', error);
    return false;
  }
}

/** Envia alerta de cancelamento feito pelo cliente para o Admin */
export async function sendAdminCancellationAlert(booking: Booking, reason?: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const manageUrl = `${window.location.origin}/admin`;
    const cancelReason = reason || 'Customer cancelled via online self-service';
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;

    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: booking.name,
      name: booking.name,
      client_email: booking.email,
      email: booking.email,
      client_phone: booking.phone,
      phone: booking.phone,
      service_name: booking.service,
      service: booking.service,
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      service_address: booking.address || 'On file',
      address: booking.address || 'On file',
      home_size: `${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      service_notes: booking.notes || 'None provided',
      notes: booking.notes || 'None provided',
      final_price: `$${quotePrice}`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      cancel_reason: cancelReason,
      message: `CUSTOMER CANCELLATION NOTICE:\n• Name: ${booking.name}\n• Phone: ${booking.phone}\n• Email: ${booking.email}\n• Reason: ${cancelReason}\n• Appointment: ${booking.service} on ${booking.date} at ${booking.time}`,
      subject: `Customer Cancelled: ${booking.name} (${booking.date} at ${booking.time})`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Alerta de cancelamento enviado para o Admin:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar alerta de cancelamento para o Admin:', error);
    return false;
  }
}

/** Envia e-mail com mensagem do formulário de contato */
export async function sendContactEmail(contact: ContactFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Chaves não configuradas. E-mail não enviado.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: contact.name,
      name: contact.name,
      client_email: contact.email,
      email: contact.email,
      message_content: contact.message,
      message: contact.message,
      subject: `New Contact Message from ${contact.name}`,
    };

    const res = await emailjs.send(SERVICE_ID, CONTACT_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] E-mail de contato enviado:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Falha ao enviar e-mail de contato:', error);
    return false;
  }
}

/** Função de teste para diagnóstico do EmailJS */
export async function testEmailConnection(testEmail: string): Promise<{ success: boolean; message: string }> {
  if (!isEmailConfigured) {
    return { success: false, message: 'Chaves do EmailJS não estão configuradas.' };
  }
  try {
    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, {
      to_name: 'Teste de Conexão',
      to_email: testEmail,
      client_name: 'Teste',
      name: 'Teste',
      email: testEmail,
      phone: '+1 774 000 0000',
      service: 'Standard Cleaning',
      subject: '🧪 Teste de Conexão EmailJS — LUXE A&P',
      message: 'Este é um e-mail de teste para validar a integração do EmailJS com seu Gmail.',
    }, {
      publicKey: PUBLIC_KEY,
    });
    return { success: true, message: `E-mail de teste enviado com sucesso! (${res.status} ${res.text})` };
  } catch (err: unknown) {
    const errObj = err as { status?: number; text?: string; message?: string };
    return {
      success: false,
      message: `Erro do EmailJS (${errObj.status || 'Falha'}): ${errObj.text || errObj.message || String(err)}`
    };
  }
}
