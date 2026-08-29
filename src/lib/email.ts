/**
 * EmailJS Notification Service — sends instant detailed booking & contact emails.
 */
import emailjs from '@emailjs/browser';
import type { BookingFormData, ContactFormData } from '../types';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const BOOKING_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const CONTACT_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || BOOKING_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const isEmailConfigured = Boolean(SERVICE_ID && BOOKING_TEMPLATE_ID && PUBLIC_KEY);

/** Send a detailed booking notification email */
export async function sendBookingEmail(booking: BookingFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured in .env. Skipping email delivery.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'Ana Paula',
      to_email: 'annapaulasoouza98@icloud.com',
      client_name: booking.name,
      client_email: booking.email,
      client_phone: booking.phone,
      service_name: booking.service,
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

/** Send a contact form message email */
export async function sendContactEmail(contact: ContactFormData): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info('[EmailJS] Keys not configured in .env. Skipping email delivery.');
    return false;
  }

  try {
    const templateParams = {
      to_name: 'Ana Paula',
      to_email: 'annapaulasoouza98@icloud.com',
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
