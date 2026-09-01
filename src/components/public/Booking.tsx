import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  MessageCircle,
  Home,
  Bath,
  BedDouble,
  Plus,
  Check,
  CalendarCheck,
  AlertCircle,
  Copy,
  ExternalLink,
  Mail,
} from 'lucide-react';
import {
  SERVICES,
  BUSINESS,
  CLEANING_EXTRAS,
  BASE_PRICING,
} from '../../lib/constants';
import { TIME_SLOTS as FALLBACK_TIME_SLOTS } from '../../lib/constants';
import { useRevealOnScroll } from '../../hooks/useUtils';
import {
  createBooking,
  getBookingsByDate,
  subscribeToBookingsByDate,
  normalizeTimeSlot,
  normalizeDate,
  getLocalTomorrowString,
  getDayOfWeekFromDate,
  parseLocalDate,
  subscribeToScheduleConfig,
} from '../../lib/firestore';
import { generateTimeSlots, getPricingConfig, DEFAULT_PRICING } from '../../lib/firestore';
import type { PricingConfig, ScheduleConfig } from '../../types';
import { sendBookingEmail, sendClientReceiptEmail } from '../../lib/email';
import './Booking.css';

type Step = 1 | 2 | 3;

interface FormData {
  service: string;
  bedrooms: number;
  bathrooms: number;
  extras: string[];
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  website_hp?: string; // Bot honeypot trap
}

/** Sanitize input strings to remove any script or HTML injections */
function sanitizeText(str: string): string {
  return (str || '').replace(/<[^>]*>?/gm, '').trim();
}

const INITIAL: FormData = {
  service: 'deep',
  bedrooms: 2,
  bathrooms: 2,
  extras: [],
  date: getLocalTomorrowString(),
  time: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  website_hp: '',
};

const DAY_KEYS: (keyof ScheduleConfig['workDays'])[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Helper to check if a specific date is closed or blocked */
function getDateAvailability(dateStr: string, config: ScheduleConfig | null): { unavailable: boolean; reason?: string; dayName?: string } {
  if (!dateStr) return { unavailable: false };
  const cleanDate = normalizeDate(dateStr);
  const d = parseLocalDate(cleanDate);
  if (isNaN(d.getTime())) {
    return { unavailable: true, reason: 'Invalid date format' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) {
    return { unavailable: true, reason: 'Please choose a future date' };
  }

  if (config) {
    if (config.blockedDates?.includes(cleanDate)) {
      return {
        unavailable: true,
        reason: 'This date is currently blocked on our calendar and unavailable for appointments.',
      };
    }
    const dayIndex = getDayOfWeekFromDate(cleanDate);
    const dayKey = DAY_KEYS[dayIndex];
    const dayName = DAY_NAMES_EN[dayIndex];

    if (config.workDays && config.workDays[dayKey] === false) {
      return {
        unavailable: true,
        dayName,
        reason: `Our team does not operate on ${dayName}s. Please choose an open day of the week.`,
      };
    }
  }

  return { unavailable: false };
}

/** Helper to find the first open business day starting from tomorrow */
function findFirstOpenDate(config: ScheduleConfig): string {
  const cur = new Date();
  cur.setDate(cur.getDate() + 1);

  for (let i = 0; i < 21; i++) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const status = getDateAvailability(dateStr, config);
    if (!status.unavailable) {
      return dateStr;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return getLocalTomorrowString();
}

export default function Booking() {
  const ref = useRevealOnScroll();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>(FALLBACK_TIME_SLOTS);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Real-time listener for schedule config from admin (active days, slots, blocked dates)
  useEffect(() => {
    const unsubSchedule = subscribeToScheduleConfig((config) => {
      setScheduleConfig(config);
      const slots = generateTimeSlots(config);
      if (slots.length > 0) setTimeSlots(slots);

      // Check current selected date against new schedule
      setForm(prev => {
        const status = getDateAvailability(prev.date, config);
        if (status.unavailable) {
          const nextOpen = findFirstOpenDate(config);
          return { ...prev, date: nextOpen, time: '' };
        }
        return prev;
      });
    });

    getPricingConfig()
      .then(cfg => {
        if (cfg) setPricingConfig(cfg);
      })
      .catch(() => { /* keep default */ });

    return () => {
      unsubSchedule();
    };
  }, []);

  // Real-time listener for booked slots on the selected date to prevent double booking
  useEffect(() => {
    if (!form.date) {
      setBookedSlots([]);
      return;
    }

    setLoadingSlots(true);
    const cleanDate = normalizeDate(form.date);
    const unsubscribe = subscribeToBookingsByDate(cleanDate, (taken) => {
      setBookedSlots(taken);
      setLoadingSlots(false);

      // If user had a slot selected that just got booked by someone else, clear it
      if (form.time && taken.some(b => normalizeTimeSlot(b) === normalizeTimeSlot(form.time))) {
        setForm(prev => ({ ...prev, time: '' }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [form.date, form.time]);

  const set = useCallback((field: keyof FormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const toggleExtra = useCallback((extraId: string) => {
    setForm(prev => {
      const exists = prev.extras.includes(extraId);
      const newExtras = exists
        ? prev.extras.filter(id => id !== extraId)
        : [...prev.extras, extraId];
      return { ...prev, extras: newExtras };
    });
  }, []);

  const extrasList = pricingConfig.extras || CLEANING_EXTRAS;
  const basePrice = pricingConfig.basePrices?.[form.service] ?? BASE_PRICING[form.service] ?? 140;
  const extraBedsPrice = Math.max(0, form.bedrooms - 1) * (pricingConfig.pricePerBedroom ?? 25);
  const extraBathsPrice = Math.max(0, form.bathrooms - 1) * (pricingConfig.pricePerBathroom ?? 30);
  const extrasTotal = form.extras.reduce((sum, extraId) => {
    const extra = extrasList.find(e => e.id === extraId);
    return sum + (extra ? extra.price : 0);
  }, 0);

  // Background estimate for admin quote suggestion (not displayed to client)
  const estimatedPrice = basePrice + extraBedsPrice + extraBathsPrice + extrasTotal;

  const validateStep = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};

    if (step === 1 && !form.service) errs.service = 'Please select a service package';
    if (step === 2) {
      if (!form.date) {
        errs.date = 'Please select a date';
      } else {
        const dateAvail = getDateAvailability(form.date, scheduleConfig);
        if (dateAvail.unavailable) {
          errs.date = dateAvail.reason || 'This date is unavailable for booking';
        }
      }

      const dateAvail = getDateAvailability(form.date, scheduleConfig);
      if (!dateAvail.unavailable) {
        if (!form.time) {
          errs.time = 'Please select an arrival time slot';
        } else if (form.date && form.time) {
          const isTaken = bookedSlots.some(b => normalizeTimeSlot(b) === normalizeTimeSlot(form.time));
          if (isTaken) {
            errs.time = 'This time slot is already reserved. Please select another time.';
          }
        }
      }
    }
    if (step === 3) {
      const nameParts = form.name.trim().split(/\s+/).filter(Boolean);
      if (!form.name.trim()) {
        errs.name = 'Full name is required';
      } else if (nameParts.length < 2 || nameParts[0].length < 2 || nameParts[1].length < 2) {
        errs.name = 'Please enter your first and last name (e.g. John Smith)';
      }
      
      const cleanEmail = form.email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!cleanEmail) {
        errs.email = 'Email address is required to receive your quote';
      } else if (!emailRegex.test(cleanEmail) || !cleanEmail.includes('.')) {
        errs.email = 'Please enter a valid email address (e.g. yourname@example.com)';
      } else if (
        cleanEmail.endsWith('@gamil.com') ||
        cleanEmail.endsWith('@gmai.com') ||
        cleanEmail.endsWith('@hotmial.com') ||
        cleanEmail.endsWith('@yaho.com') ||
        cleanEmail.endsWith('@outlok.com')
      ) {
        errs.email = 'Please check for typos in your email domain (e.g. @gmail.com, @hotmail.com)';
      }

      const cleanPhoneDigits = form.phone.replace(/\D/g, '');
      if (!form.phone.trim()) {
        errs.phone = 'Phone number is required';
      } else if (cleanPhoneDigits.length < 10) {
        errs.phone = 'Please enter a complete 10-digit phone number (e.g. (774) 280-9723)';
      }

      if (!form.address.trim()) {
        errs.address = 'Service address is required';
      } else if (form.address.trim().length < 6) {
        errs.address = 'Please enter a complete address (street name and number)';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, form, bookedSlots, scheduleConfig]);

  const next = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (validateStep()) {
      const el = document.getElementById('booking');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      }
      setStep(s => Math.min(s + 1, 3) as Step);
    }
  }, [validateStep]);

  const prev = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const el = document.getElementById('booking');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    }
    setStep(s => Math.max(s - 1, 1) as Step);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;

    // 1. Anti-bot honeypot check: If invisible field is populated, silently reject
    if (form.website_hp && form.website_hp.trim().length > 0) {
      setSubmitted(true);
      return;
    }

    // 2. Flood / DDoS rate-limit protection (2 seconds cooldown)
    const lastSubmitTime = parseInt(sessionStorage.getItem('luxe_last_booking_submit') || '0', 10);
    const now = Date.now();
    if (now - lastSubmitTime < 2000) {
      setErrors(prev => ({
        ...prev,
        notes: 'Please wait a moment before submitting again.',
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanDate = normalizeDate(form.date);
      const cleanTime = normalizeTimeSlot(form.time);

      // Re-verify slot availability immediately before creating to prevent race conditions
      const currentBookings = await getBookingsByDate(cleanDate);
      const isTaken = currentBookings.some(b => normalizeTimeSlot(b.time) === cleanTime);
      if (isTaken) {
        setErrors(prev => ({
          ...prev,
          time: 'This time slot was just reserved by another customer. Please choose a different time.'
        }));
        setForm(prev => ({ ...prev, time: '' }));
        setStep(2);
        setIsSubmitting(false);
        const el = document.getElementById('booking');
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 70;
          window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
        }
        return;
      }

      const serviceObj = SERVICES.find(s => s.id === form.service);
      const serviceName = serviceObj?.name || form.service;
      const extraNames = form.extras.map(eId => extrasList.find(e => e.id === eId)?.name || eId);

      const bookingPayload = {
        service: serviceName,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        extras: extraNames,
        estimatedPrice,
        date: cleanDate,
        time: cleanTime,
        name: sanitizeText(form.name).trim(),
        email: sanitizeText(form.email).trim(),
        phone: sanitizeText(form.phone).trim(),
        address: sanitizeText(form.address).trim(),
        notes: sanitizeText(form.notes).trim(),
      };

      const newId = await createBooking(bookingPayload);
      setCreatedBookingId(newId);
      sessionStorage.setItem('luxe_last_booking_submit', String(Date.now()));
      
      // Dispatch email to admin and instant receipt to client
      sendBookingEmail(bookingPayload).catch(e => console.error('Admin email send error:', e));
      sendClientReceiptEmail(bookingPayload, newId).catch(e => console.error('Client email send error:', e));
      
      setSubmitted(true);
    } catch (err: unknown) {
      console.error('Failed to submit booking:', err);
      const msg = err instanceof Error ? err.message : 'An error occurred while creating your reservation.';
      setErrors(prev => ({
        ...prev,
        time: msg.includes('slot') || msg.includes('reserved') || msg.includes('booked')
          ? msg
          : 'Could not complete reservation. Please try another time slot.'
      }));
      setForm(prev => ({ ...prev, time: '' }));
      setStep(2);
      const el = document.getElementById('booking');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, form, estimatedPrice, extrasList]);

  const selectedService = SERVICES.find(s => s.id === form.service);

  // Get min date (tomorrow in local time)
  const minDate = getLocalTomorrowString();

  const handleResetForm = useCallback(() => {
    setForm(INITIAL);
    setStep(1);
    setErrors({});
    setSubmitted(false);
    setCreatedBookingId('');
    setCopiedKey(false);
  }, []);

  const [copiedKey, setCopiedKey] = useState(false);
  const handleCopyKey = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  if (submitted) {
    return (
      <section className="booking section section-dark" id="booking">
        <div className="container">
          <div className="booking__success animate-fade-in-up">
            <div className="booking__success-icon">
              <CheckCircle size={48} />
            </div>
            <h2 className="booking__success-title">Booking Request Received!</h2>
            <p className="booking__success-text">
              Thank you, <strong>{form.name}</strong>! We've received your booking request for{' '}
              <strong>{selectedService?.name}</strong> on <strong>{form.date}</strong> at{' '}
              <strong>{form.time}</strong>.
            </p>

            {createdBookingId && (
              <div
                style={{
                  background: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  margin: '20px auto',
                  maxWidth: '480px',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                  Your Booking Reference Key
                </span>
                <strong style={{ fontSize: '18px', color: 'var(--color-gold)', fontFamily: 'monospace', letterSpacing: '1px', display: 'block', marginBottom: '10px' }}>
                  {createdBookingId}
                </strong>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline-gold btn-sm"
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                    onClick={() => handleCopyKey(createdBookingId)}
                  >
                    {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey ? 'Key Copied!' : 'Copy Key'}
                  </button>
                  <Link
                    to={`/manage-booking?id=${createdBookingId}`}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                  >
                    <ExternalLink size={13} />
                    View &amp; Manage Reservation
                  </Link>
                </div>
              </div>
            )}

            <p className="booking__success-sub">
              Our team is reviewing your home specifications ({form.bedrooms} Bed, {form.bathrooms} Bath) and will send your customized quote and confirmation details shortly.
            </p>

            <div
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                margin: '16px auto 24px',
                maxWidth: '480px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
              }}
            >
              <Mail size={22} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-300)', lineHeight: '1.4' }}>
                A confirmation receipt was sent to <strong>{form.email}</strong>. If you don't see it in your inbox, please check your <strong>Spam / Junk</strong> folder.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href={BUSINESS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={handleResetForm}
              >
                <Plus size={18} />
                Book Another Cleaning
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="booking section section-dark" id="booking">
      <div className="container" ref={ref}>
        <div className="section-header reveal">
          <span className="section-label">Online Booking</span>
          <h2 className="section-title">Schedule Your Cleaning</h2>
          <hr className="gold-line" />
          <p className="section-subtitle">
            Select your cleaning package, home size, and preferred schedule. We will send you a personalized quote to confirm your appointment.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="booking__progress reveal">
          {[
            { num: 1, label: 'Service & Home', icon: <Home size={16} /> },
            { num: 2, label: 'Date & Time', icon: <Clock size={16} /> },
            { num: 3, label: 'Your Details', icon: <User size={16} /> },
          ].map(({ num, label, icon }) => (
            <div
              key={num}
              className={`booking__step-indicator ${step >= num ? 'booking__step-indicator--active' : ''} ${step > num ? 'booking__step-indicator--done' : ''}`}
            >
              <div className="booking__step-circle">
                {step > num ? <CheckCircle size={16} /> : icon}
              </div>
              <span className="booking__step-label">{label}</span>
              {num < 3 && <div className="booking__step-line" />}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="booking__card reveal">
          {/* Step 1: Service + Home Details + Extras */}
          {step === 1 && (
            <div className="booking__step">
              <h3 className="booking__step-title">1. Select Cleaning Package</h3>
              <div className="booking__services-grid">
                {SERVICES.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    className={`booking__service-option ${form.service === service.id ? 'booking__service-option--selected' : ''}`}
                    onClick={() => set('service', service.id)}
                  >
                    <div className="booking__service-option-top">
                      <strong>{service.name}</strong>
                    </div>
                    <span>{service.description}</span>
                  </button>
                ))}
              </div>
              {errors.service && <p className="form-error">{errors.service}</p>}

              {/* Home Size Selectors */}
              <div className="booking__home-size">
                <h4 className="booking__subheading">2. How large is your home?</h4>
                <div className="booking__counter-grid">
                  {/* Bedrooms */}
                  <div className="booking__counter-card">
                    <div className="booking__counter-label">
                      <BedDouble size={18} />
                      <span>Bedrooms</span>
                    </div>
                    <div className="booking__counter-buttons">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`booking__counter-btn ${form.bedrooms === num ? 'booking__counter-btn--active' : ''}`}
                          onClick={() => set('bedrooms', num)}
                        >
                          {num >= 5 ? '5+' : num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="booking__counter-card">
                    <div className="booking__counter-label">
                      <Bath size={18} />
                      <span>Bathrooms</span>
                    </div>
                    <div className="booking__counter-buttons">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`booking__counter-btn ${form.bathrooms === num ? 'booking__counter-btn--active' : ''}`}
                          onClick={() => set('bathrooms', num)}
                        >
                          {num >= 5 ? '5+' : num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add-on Extras */}
              <div className="booking__extras-section">
                <h4 className="booking__subheading">3. Optional Add-ons &amp; Extras</h4>
                <div className="booking__extras-grid">
                  {extrasList.map(extra => {
                    const isSelected = form.extras.includes(extra.id);
                    return (
                      <button
                        key={extra.id}
                        type="button"
                        className={`booking__extra-card ${isSelected ? 'booking__extra-card--selected' : ''}`}
                        onClick={() => toggleExtra(extra.id)}
                      >
                        <div className="booking__extra-check">
                          {isSelected ? <Check size={14} /> : <Plus size={14} />}
                        </div>
                        <div className="booking__extra-info">
                          <strong>{extra.name}</strong>
                          <span>{extra.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (() => {
            const dateAvail = getDateAvailability(form.date, scheduleConfig);

            return (
              <div className="booking__step">
                <h3 className="booking__step-title">Choose Preferred Date &amp; Time</h3>
                <div className="booking__datetime">
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-date" style={{ color: 'var(--color-gray-300)', marginBottom: 'var(--space-2)' }}>
                      Select Cleaning Date
                    </label>
                    <div className="booking__date-wrapper">
                      <input
                        id="booking-date"
                        type="date"
                        className={`form-input form-input-dark booking__date-input ${errors.date || dateAvail.unavailable ? 'error' : ''}`}
                        value={form.date}
                        min={minDate}
                        onChange={e => {
                          const newDate = e.target.value;
                          set('date', newDate);
                          const st = getDateAvailability(newDate, scheduleConfig);
                          if (st.unavailable) {
                            set('time', '');
                          }
                        }}
                      />
                    </div>
                    {errors.date && <p className="form-error">{errors.date}</p>}
                  </div>

                  {/* Unavailable Day of Week / Blocked Date Alert */}
                  {dateAvail.unavailable && (
                    <div className="booking__unavailable-banner animate-fade-in">
                      <AlertCircle size={20} className="booking__unavailable-icon" />
                      <div>
                        <strong>Day Unavailable for Appointments</strong>
                        <p>{dateAvail.reason}</p>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                      <label className="form-label" style={{ color: 'var(--color-gray-400)', margin: 0 }}>Select Arrival Time Slot</label>
                      {loadingSlots && !dateAvail.unavailable && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold)' }}>Checking availability...</span>}
                    </div>

                    {dateAvail.unavailable ? (
                      <div className="booking__no-slots">
                        <Clock size={28} />
                        <p>No arrival time slots available for this day. Please select an available working day above.</p>
                      </div>
                    ) : (
                      <div className="booking__time-grid">
                        {timeSlots.map(slot => {
                          const isBooked = bookedSlots.some(b => normalizeTimeSlot(b) === normalizeTimeSlot(slot));
                          const isSelected = !isBooked && form.time && normalizeTimeSlot(form.time) === normalizeTimeSlot(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              aria-disabled={isBooked}
                              className={`booking__time-slot ${isSelected ? 'booking__time-slot--selected' : ''} ${isBooked ? 'booking__time-slot--booked' : ''}`}
                              onClick={() => {
                                if (!isBooked) {
                                  set('time', slot);
                                }
                              }}
                              title={isBooked ? 'This slot has already been reserved' : slot}
                            >
                              <span>{slot}</span>
                              {isBooked && <span className="booking__time-slot-tag">Reserved</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {errors.time && !dateAvail.unavailable && <p className="form-error">{errors.time}</p>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Step 3: Personal info */}
          {step === 3 && (
            <div className="booking__step">
              <h3 className="booking__step-title">Your Contact &amp; Property Information</h3>

              {/* Honeypot field - Invisible to humans, catches automated spam bots */}
              <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="booking-website">Website</label>
                <input
                  id="booking-website"
                  type="text"
                  name="website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website_hp || ''}
                  onChange={e => set('website_hp', e.target.value)}
                />
              </div>

              <div className="booking__info-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="booking-name" style={{ color: 'var(--color-gray-400)' }}>Full Name</label>
                  <input
                    id="booking-name"
                    type="text"
                    className={`form-input form-input-dark ${errors.name ? 'error' : ''}`}
                    placeholder="e.g. John Smith"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    maxLength={100}
                  />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-email" style={{ color: 'var(--color-gray-400)' }}>Email Address</label>
                  <input
                    id="booking-email"
                    type="email"
                    className={`form-input form-input-dark ${errors.email ? 'error' : ''}`}
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    maxLength={200}
                  />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-phone" style={{ color: 'var(--color-gray-400)' }}>Phone Number (Mobile for SMS / Confirmation)</label>
                  <input
                    id="booking-phone"
                    type="tel"
                    className={`form-input form-input-dark ${errors.phone ? 'error' : ''}`}
                    placeholder="(774) 280-9723"
                    value={form.phone}
                    onChange={e => {
                      const raw = e.target.value;
                      const digits = raw.replace(/\D/g, '');
                      let formatted = raw;
                      if (digits.length > 0 && digits.length <= 10) {
                        if (digits.length <= 3) formatted = `(${digits}`;
                        else if (digits.length <= 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                        else formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                      }
                      set('phone', formatted);
                    }}
                    maxLength={22}
                  />
                  {errors.phone && <p className="form-error">{errors.phone}</p>}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="booking-address" style={{ color: 'var(--color-gray-400)' }}>Service Address</label>
                  <input
                    id="booking-address"
                    type="text"
                    className={`form-input form-input-dark ${errors.address ? 'error' : ''}`}
                    placeholder="123 Main St, Apt 4B, Worcester, MA 01604"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    maxLength={300}
                  />
                  {errors.address && <p className="form-error">{errors.address}</p>}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="booking-notes" style={{ color: 'var(--color-gray-400)' }}>Special Requests or Access Codes (Optional)</label>
                  <textarea
                    id="booking-notes"
                    className="form-textarea form-textarea-dark"
                    placeholder="Any entry codes, pets on property, special focus areas..."
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>

              {/* Order review summary */}
              <div className="booking__summary-card">
                <h4 className="booking__summary-header">
                  <CalendarCheck size={18} />
                  <span>Booking &amp; Service Summary</span>
                </h4>
                <div className="booking__summary-rows">
                  <div className="booking__summary-row">
                    <span>Package:</span>
                    <strong>{selectedService?.name}</strong>
                  </div>
                  <div className="booking__summary-row">
                    <span>Property Size:</span>
                    <strong>{form.bedrooms} Bed, {form.bathrooms} Bath</strong>
                  </div>
                  {form.extras.length > 0 && (
                    <div className="booking__summary-row">
                      <span>Selected Add-ons:</span>
                      <strong>{form.extras.map(eId => extrasList.find(e => e.id === eId)?.name).filter(Boolean).join(', ')}</strong>
                    </div>
                  )}
                  <div className="booking__summary-row">
                    <span>Schedule:</span>
                    <strong>{form.date} at {form.time}</strong>
                  </div>
                </div>
                <p className="booking__summary-disclaimer">
                  * No upfront payment required. Our team will review your property specifications and send your personalized quote via SMS / iMessage, WhatsApp, or Email to confirm your booking.
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="booking__nav">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={prev}>
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Booking Request
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
