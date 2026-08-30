/**
 * EmailJS Notification Service — sends instant detailed booking, confirmation, cancellation & contact emails.
 */
import emailjs from '@emailjs/browser';
import type { BookingFormData, ContactFormData, Booking } from '../types';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_ej0ck9z';
const BOOKING_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_jnxzjak';
const CONTACT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const CONFIRM_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CONFIRM_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const CANCEL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CANCEL_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'EyKqkTJBOSponl3xH';

export const isEmailConfigured = Boolean(SERVICE_ID && BOOKING_TEMPLATE_ID && PUBLIC_KEY);

// Initialize EmailJS with public key
if (PUBLIC_KEY) {
  try {
    emailjs.init({ publicKey: PUBLIC_KEY });
  } catch (err) {
    console.warn('[EmailJS] Initialization warning:', err);
  }
}

/** Send a detailed new booking notification email to Admin */
export async function sendBookingEmail(booking: BookingFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured. Skipping email delivery.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'LUXE A&P Team',
      to_email: 'luxeaepcleaning@gmail.com', // Always arrives at Admin's Gmail
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
      subject: `🔔 NEW BOOKING REQUEST from ${booking.name} (${booking.date} at ${booking.time})`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Admin email sent successfully:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send booking email to admin:', error);
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
      to_email: booking.email, // Arrives at Client's Email
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
      subject: `✨ We Received Your Booking Request! — LUXE A&P Cleaning`,
    };

    const res = await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Client receipt email sent successfully:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send client receipt email:', error);
    return false;
  }
}

/** 2º E-mail para o CLIENTE: Enviado pelo ADM quando define o orçamento e confirma */
export async function sendClientConfirmationEmail(booking: Booking): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
    const quotePrice = booking.finalPrice || booking.estimatedPrice || 0;
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const templateParams = {
      to_name: booking.name,
      to_email: booking.email, // Arrives at Client's Email with the ADM price
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
      final_price: `$${quotePrice}`,
      estimated_price: `$${quotePrice}`,
      price: `$${quotePrice}`,
      manage_url: manageUrl,
      message: `Your customized quote for ${booking.service} on ${booking.date} at ${booking.time} is $${quotePrice}. Your appointment has been officially confirmed!`,
      subject: `✅ Booking Confirmed & Official Quote ($${quotePrice}) — LUXE A&P Cleaning`,
    };

    const res = await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Client confirmation quote email sent successfully:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send client confirmation email:', error);
    return false;
  }
}

/** Send an appointment cancellation notification email to the Client */
export async function sendClientCancellationEmail(booking: Booking, reason?: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
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
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      cancel_reason: reason || 'Cancelled per customer request',
      subject: `❌ Booking Cancellation: LUXE A&P Cleaning - ${booking.date}`,
    };

    const res = await emailjs.send(SERVICE_ID, CANCEL_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Cancellation email sent:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send client cancellation email:', error);
    return false;
  }
}

/** Send an alert email to Admin when a customer cancels online */
export async function sendAdminCancellationAlert(booking: Booking, reason?: string): Promise<boolean> {
  if (!isEmailConfigured) {
    return false;
  }

  try {
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
      service_date: booking.date,
      date: booking.date,
      service_time: booking.time,
      time: booking.time,
      cancel_reason: reason || 'Customer cancelled via online self-service',
      subject: `⚠️ Customer Cancelled Booking: ${booking.name} (${booking.date} at ${booking.time})`,
    };

    const res = await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Admin cancellation alert sent:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send admin cancellation alert:', error);
    return false;
  }
}

/** Send a contact form message email */
export async function sendContactEmail(contact: ContactFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured. Skipping email delivery.');
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
      subject: `📬 New Contact Message from ${contact.name}`,
    };

    const res = await emailjs.send(SERVICE_ID, CONTACT_TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
    });
    console.log('[EmailJS] Contact email sent:', res.status, res.text);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send contact email:', error);
    return false;
  }
}
