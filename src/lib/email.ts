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

/** Send a detailed new booking notification email to Admin */
export async function sendBookingEmail(booking: BookingFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured in .env. Skipping email delivery.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'Ana Paula',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: booking.name,
      client_email: booking.email,
      client_phone: booking.phone,
      service_name: booking.service,
      home_size: `${booking.bedrooms} Bed, ${booking.bathrooms} Bath`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      estimated_price: `$${booking.estimatedPrice}`,
      service_date: booking.date,
      service_time: booking.time,
      service_address: booking.address,
      service_notes: booking.notes || 'No special notes provided',
      subject: `✨ New Booking: ${booking.service} - ${booking.name}`,
    };

    await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send booking email:', error);
    return false;
  }
}

/** Send an official appointment confirmation email to the Client */
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
      service_name: booking.service,
      service_date: booking.date,
      service_time: booking.time,
      service_address: booking.address,
      home_size: `${booking.bedrooms || 1} Bed, ${booking.bathrooms || 1} Bath`,
      selected_extras: booking.extras && booking.extras.length > 0 ? booking.extras.join(', ') : 'None',
      final_price: `$${quotePrice}`,
      manage_url: manageUrl,
      subject: `✅ Booking Confirmed ($${quotePrice}): ${booking.service} with LUXE A&P Cleaning`,
    };

    await emailjs.send(SERVICE_ID, CONFIRM_TEMPLATE_ID, templateParams, PUBLIC_KEY);
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
      service_name: booking.service,
      service_date: booking.date,
      service_time: booking.time,
      cancel_reason: reason || 'Cancelled per customer request',
      subject: `❌ Booking Cancellation: LUXE A&P Cleaning - ${booking.date}`,
    };

    await emailjs.send(SERVICE_ID, CANCEL_TEMPLATE_ID, templateParams, PUBLIC_KEY);
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
      to_name: 'Ana Paula',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: booking.name,
      client_email: booking.email,
      client_phone: booking.phone,
      service_name: booking.service,
      service_date: booking.date,
      service_time: booking.time,
      cancel_reason: reason || 'Customer cancelled via online self-service',
      subject: `⚠️ Customer Cancelled Booking: ${booking.name} (${booking.date} at ${booking.time})`,
    };

    await emailjs.send(SERVICE_ID, BOOKING_TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send admin cancellation alert:', error);
    return false;
  }
}

/** Send a contact form message email */
export async function sendContactEmail(contact: ContactFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured in .env. Skipping email delivery.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'Ana Paula',
      to_email: 'luxeaepcleaning@gmail.com',
      client_name: contact.name,
      client_email: contact.email,
      message_content: contact.message,
      subject: `📬 New Contact Message from ${contact.name}`,
    };

    await emailjs.send(SERVICE_ID, CONTACT_TEMPLATE_ID, templateParams, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('[EmailJS] Failed to send contact email:', error);
    return false;
  }
}
