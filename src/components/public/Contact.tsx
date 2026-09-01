import { useState, useCallback } from 'react';
import { Send, MessageCircle, Phone, Mail, MapPin, CheckCircle, X, MessageSquare } from 'lucide-react';
import { BUSINESS } from '../../lib/constants';
import { useRevealOnScroll } from '../../hooks/useUtils';
import { createMessage } from '../../lib/firestore';
import { sendContactEmail } from '../../lib/email';
import './Contact.css';

interface ContactForm {
  name: string;
  email: string;
  message: string;
  fax_hp?: string; // Honeypot trap for spam bots
}

/** Sanitize input strings to prevent XSS / script injections */
function sanitizeText(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

/** Modal offering contact channels: WhatsApp, Email, iMessage/SMS */
function ContactOptionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="contact-modal__overlay" onClick={onClose}>
      <div className="contact-modal__box" onClick={e => e.stopPropagation()}>
        <button className="contact-modal__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h3 className="contact-modal__title">How would you like to reach us?</h3>
        <p className="contact-modal__sub">Select your preferred communication channel below:</p>

        <div className="contact-modal__options">
          {/* Direct Phone Call - English */}
          <a
            href={`tel:+${BUSINESS.phoneEN.replace(/\D/g, '')}`}
            className="contact-modal__option contact-modal__option--phone"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <Phone size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>Direct Call</strong>
                <span className="contact-modal__tag">🇺🇸 English</span>
              </div>
              <small>{BUSINESS.phoneEN}</small>
            </div>
          </a>

          {/* Direct Phone Call - PT & ES */}
          <a
            href={`tel:+${BUSINESS.phone.replace(/\D/g, '')}`}
            className="contact-modal__option contact-modal__option--phone"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <Phone size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>Direct Call</strong>
                <span className="contact-modal__tag">🇧🇷 PT &amp; 🇪🇸 ES</span>
              </div>
              <small>{BUSINESS.phone}</small>
            </div>
          </a>

          {/* iMessage / SMS - English */}
          <a
            href={`sms:+${BUSINESS.phoneEN.replace(/\D/g, '')}`}
            className="contact-modal__option contact-modal__option--imessage"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <MessageSquare size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>iMessage / SMS</strong>
                <span className="contact-modal__tag">🇺🇸 English</span>
              </div>
              <small>{BUSINESS.phoneEN}</small>
            </div>
          </a>

          {/* iMessage / SMS - Portuguese & Spanish */}
          <a
            href={`sms:+${BUSINESS.phone.replace(/\D/g, '')}`}
            className="contact-modal__option contact-modal__option--imessage"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <MessageSquare size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>iMessage / SMS</strong>
                <span className="contact-modal__tag">🇧🇷 PT &amp; 🇪🇸 ES</span>
              </div>
              <small>{BUSINESS.phone}</small>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={BUSINESS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-modal__option contact-modal__option--whatsapp"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <MessageCircle size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>WhatsApp</strong>
                <span className="contact-modal__tag contact-modal__tag--green">Fast Chat</span>
              </div>
              <small>Instant response</small>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${BUSINESS.email}`}
            className="contact-modal__option contact-modal__option--email"
            onClick={onClose}
          >
            <div className="contact-modal__option-icon">
              <Mail size={20} />
            </div>
            <div className="contact-modal__option-text">
              <div className="contact-modal__option-header">
                <strong>Direct Email</strong>
              </div>
              <small>{BUSINESS.email}</small>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Contact() {
  const ref = useRevealOnScroll();
  const [form, setForm] = useState<ContactForm>({ name: '', email: '', message: '', fax_hp: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const set = useCallback((field: keyof ContactForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Anti-bot Honeypot trap: If the hidden honeypot field is filled, silently ignore
    if (form.fax_hp && form.fax_hp.trim().length > 0) {
      setSubmitted(true);
      return;
    }

    // 2. Client-side Flood / Rate-limit protection (10 seconds cooldown between submissions)
    const lastSubmitTime = parseInt(sessionStorage.getItem('luxe_last_contact_submit') || '0', 10);
    const now = Date.now();
    if (now - lastSubmitTime < 10000) {
      setErrors({ message: 'Please wait a few seconds before sending another message.' });
      return;
    }

    const errs: Partial<Record<keyof ContactForm, string>> = {};
    const cleanName = sanitizeText(form.name);
    const cleanEmail = sanitizeText(form.email);
    const cleanMessage = sanitizeText(form.message);

    if (!cleanName) errs.name = 'Name is required';
    if (!cleanEmail) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) errs.email = 'Invalid email';
    if (!cleanMessage) errs.message = 'Message is required';
    else if (cleanMessage.length < 10) errs.message = 'Message too short (min 10 characters)';

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    try {
      const contactPayload = {
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      };

      await Promise.allSettled([
        createMessage(contactPayload),
        sendContactEmail(contactPayload),
      ]);
      sessionStorage.setItem('luxe_last_contact_submit', String(Date.now()));
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Still show success for UX
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [form]);

  return (
    <section className="contact section section-light" id="contact">
      <div className="container" ref={ref}>
        <div className="section-header reveal">
          <span className="section-label" style={{ color: 'var(--color-gold-dark)' }}>Get in Touch</span>
          <h2 className="section-title" style={{ color: 'var(--color-black)' }}>Contact Us</h2>
          <hr className="gold-line" />
          <p className="section-subtitle" style={{ color: 'var(--color-gray-600)' }}>
            Have questions? We'd love to hear from you. Send us a message or reach out directly.
          </p>
        </div>

        <div className="contact__grid reveal">
          {/* Contact info */}
          <div className="contact__info">
            <div className="contact__info-card">
              <div className="contact__info-item">
                <div className="contact__info-icon">
                  <Phone size={20} />
                </div>
                <div>
                  <strong>Call Us</strong>
                  <a href={`tel:+${BUSINESS.phone.replace(/\D/g, '')}`} className="contact__phone-link">
                    {BUSINESS.phone}
                    <span className="contact__phone-lang">🇧🇷 PT &amp; 🇪🇸 ES</span>
                  </a>
                  <a href={`tel:+${BUSINESS.phoneEN.replace(/\D/g, '')}`} className="contact__phone-link">
                    {BUSINESS.phoneEN}
                    <span className="contact__phone-lang">🇺🇸 EN</span>
                  </a>
                </div>
              </div>

              <div className="contact__info-item">
                <div className="contact__info-icon">
                  <Mail size={20} />
                </div>
                <div>
                  <strong>Email</strong>
                  <span>{BUSINESS.email}</span>
                </div>
              </div>

              <div className="contact__info-item">
                <div className="contact__info-icon">
                  <MapPin size={20} />
                </div>
                <div>
                  <strong>Service Area</strong>
                  <span>{BUSINESS.city}, {BUSINESS.state}</span>
                </div>
              </div>
            </div>

            {/* Quick Contact CTA */}
            <button
              type="button"
              className="contact__whatsapp"
              onClick={() => setShowContactModal(true)}
              aria-label="Contact options"
            >
              <MessageCircle size={24} />
              <div>
                <strong>Quick Message / Chat</strong>
                <span>WhatsApp, iMessage &amp; Email</span>
              </div>
            </button>
          </div>

          {/* Contact form */}
          <div className="contact__form-wrapper">
            {submitted ? (
              <div className="contact__form-success animate-fade-in-up">
                <CheckCircle size={40} />
                <h3>Message Sent!</h3>
                <p>Thank you for reaching out. We'll get back to you shortly.</p>
              </div>
            ) : (
              <form className="contact__form" onSubmit={handleSubmit}>
                {/* Honeypot field - Invisible to humans, catches automated spam bots */}
                <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                  <label htmlFor="contact-fax">Fax</label>
                  <input
                    id="contact-fax"
                    type="text"
                    name="fax_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.fax_hp || ''}
                    onChange={e => set('fax_hp', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-name">Your Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Full name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    maxLength={100}
                  />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-email">Email Address</label>
                  <input
                    id="contact-email"
                    type="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    maxLength={200}
                  />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    className={`form-textarea ${errors.message ? 'error' : ''}`}
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    rows={5}
                    maxLength={2000}
                  />
                  {errors.message && <p className="form-error">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  className="btn btn-dark btn-lg"
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner spinner-sm" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        className="contact__fab"
        onClick={() => setShowContactModal(true)}
        aria-label="Open contact channels"
      >
        <MessageCircle size={28} />
      </button>

      {/* Contact modal */}
      {showContactModal && (
        <ContactOptionsModal onClose={() => setShowContactModal(false)} />
      )}
    </section>
  );
}
