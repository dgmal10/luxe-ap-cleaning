import { useState, useCallback, useEffect } from 'react';
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
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { SERVICES, BUSINESS, CLEANING_EXTRAS, calculateEstimatedPrice } from '../../lib/constants';
import { TIME_SLOTS as FALLBACK_TIME_SLOTS } from '../../lib/constants';
import { useRevealOnScroll } from '../../hooks/useUtils';
import { createBooking, getBookingsByDate } from '../../lib/firestore';
import { getScheduleConfig, generateTimeSlots } from '../../lib/firestore';
import { sendBookingEmail } from '../../lib/email';
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
}

const INITIAL: FormData = {
  service: 'deep',
  bedrooms: 2,
  bathrooms: 2,
  extras: [],
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

export default function Booking() {
  const ref = useRevealOnScroll();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>(FALLBACK_TIME_SLOTS);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Load dynamic time slots from admin schedule config
  useEffect(() => {
    getScheduleConfig()
      .then(config => {
        const slots = generateTimeSlots(config);
        if (slots.length > 0) setTimeSlots(slots);
      })
      .catch(() => { /* keep fallback slots */ });
  }, []);

  // Check booked slots whenever date changes to prevent double-booking
  useEffect(() => {
    if (!form.date) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    getBookingsByDate(form.date)
      .then(bookings => {
        const taken = bookings.map(b => b.time);
        setBookedSlots(taken);
        if (form.time && taken.includes(form.time)) {
          set('time', '');
        }
      })
      .catch(err => {
        console.error('Error checking booked slots:', err);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [form.date]);

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

  const estimatedPrice = calculateEstimatedPrice(
    form.service,
    form.bedrooms,
    form.bathrooms,
    form.extras
  );

  const validateStep = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};

    if (step === 1 && !form.service) errs.service = 'Please select a service';
    if (step === 2) {
      if (!form.date) errs.date = 'Please select a date';
      if (!form.time) errs.time = 'Please select a time';
      if (form.date && new Date(form.date) < new Date(new Date().toDateString())) {
        errs.date = 'Please select a future date';
      }
      if (form.date && form.time && bookedSlots.includes(form.time)) {
        errs.time = 'This time slot is already reserved. Please select another time.';
      }
    }
    if (step === 3) {
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!form.email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
      if (!form.phone.trim()) errs.phone = 'Phone is required';
      else if (!/^[\d\s\-().+]{7,}$/.test(form.phone)) errs.phone = 'Invalid phone number';
      if (!form.address.trim()) errs.address = 'Address is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [step, form, bookedSlots]);

  const next = useCallback(() => {
    if (validateStep()) setStep(s => Math.min(s + 1, 3) as Step);
  }, [validateStep]);

  const prev = useCallback(() => {
    setStep(s => Math.max(s - 1, 1) as Step);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      // Re-verify slot availability immediately before creating to prevent race conditions
      const currentBookings = await getBookingsByDate(form.date);
      const isTaken = currentBookings.some(b => b.time === form.time);
      if (isTaken) {
        setErrors(prev => ({
          ...prev,
          time: 'This time slot was just booked by another customer. Please choose a different time.'
        }));
        setStep(2);
        setIsSubmitting(false);
        return;
      }

      const serviceObj = SERVICES.find(s => s.id === form.service);
      const serviceName = serviceObj?.name || form.service;
      const extraNames = form.extras.map(eId => CLEANING_EXTRAS.find(e => e.id === eId)?.name || eId);

      const bookingPayload = {
        service: serviceName,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        extras: extraNames,
        estimatedPrice,
        date: form.date,
        time: form.time,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      };

      await Promise.allSettled([
        createBooking(bookingPayload),
        sendBookingEmail(bookingPayload),
      ]);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit booking:', err);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, form, estimatedPrice]);

  const selectedService = SERVICES.find(s => s.id === form.service);

  // Get min date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleResetForm = useCallback(() => {
    setForm(INITIAL);
    setStep(1);
    setErrors({});
    setSubmitted(false);
  }, []);

  if (submitted) {
    return (
      <section className="booking section section-dark" id="booking">
        <div className="container">
          <div className="booking__success animate-fade-in-up">
            <div className="booking__success-icon">
              <CheckCircle size={48} />
            </div>
            <h2 className="booking__success-title">Request Submitted!</h2>
            <p className="booking__success-text">
              Thank you, <strong>{form.name}</strong>! We've received your request for{' '}
              <strong>{selectedService?.name}</strong> on <strong>{form.date}</strong> at{' '}
              <strong>{form.time}</strong>.
            </p>
            <div className="booking__success-quote">
              <span>Estimated Quote:</span>
              <strong>${estimatedPrice}</strong>
            </div>
            <p className="booking__success-sub">
              We'll confirm your final appointment details shortly via SMS or email.
            </p>
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
            Get an instant transparent estimate and book your preferred date in minutes.
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

        {/* Estimate Banner Box */}
        <div className="booking__estimate-banner reveal">
          <div className="booking__estimate-left">
            <Sparkles size={20} className="booking__estimate-sparkle" />
            <div>
              <span className="booking__estimate-tag">Instant Estimate</span>
              <p className="booking__estimate-sub">
                {form.bedrooms} Bed &bull; {form.bathrooms} Bath
                {form.extras.length > 0 && ` + ${form.extras.length} Add-on${form.extras.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <div className="booking__estimate-price-wrap">
            <span className="booking__estimate-currency">$</span>
            <span className="booking__estimate-val">{estimatedPrice}</span>
            <span className="booking__estimate-note">estimated</span>
          </div>
        </div>

        {/* Form card */}
        <div className="booking__card reveal">
          {/* Step 1: Service + Home Details + Extras */}
          {step === 1 && (
            <div className="booking__step animate-fade-in">
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
                      {[1, 1.5, 2, 2.5, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`booking__counter-btn ${form.bathrooms === num ? 'booking__counter-btn--active' : ''}`}
                          onClick={() => set('bathrooms', num)}
                        >
                          {num >= 4 ? '4+' : num}
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
                  {CLEANING_EXTRAS.map(extra => {
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
                        <span className="booking__extra-price">+${extra.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="booking__step animate-fade-in">
              <h3 className="booking__step-title">Choose Preferred Date &amp; Time</h3>
              <div className="booking__datetime">
                <div className="form-group">
                  <label className="form-label" htmlFor="booking-date">Select Date</label>
                  <input
                    id="booking-date"
                    type="date"
                    className={`form-input form-input-dark ${errors.date ? 'error' : ''}`}
                    value={form.date}
                    min={minDate}
                    onChange={e => set('date', e.target.value)}
                  />
                  {errors.date && <p className="form-error">{errors.date}</p>}
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label className="form-label" style={{ color: 'var(--color-gray-400)', margin: 0 }}>Select Arrival Time Slot</label>
                    {loadingSlots && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold)' }}>Checking availability...</span>}
                  </div>
                  <div className="booking__time-grid">
                    {timeSlots.map(slot => {
                      const isBooked = bookedSlots.includes(slot);
                      const isSelected = form.time === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          className={`booking__time-slot ${isSelected ? 'booking__time-slot--selected' : ''} ${isBooked ? 'booking__time-slot--booked' : ''}`}
                          onClick={() => !isBooked && set('time', slot)}
                          title={isBooked ? 'This slot has already been reserved' : slot}
                        >
                          <span>{slot}</span>
                          {isBooked && <span className="booking__time-slot-tag">Reserved</span>}
                        </button>
                      );
                    })}
                  </div>
                  {errors.time && <p className="form-error">{errors.time}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personal info */}
          {step === 3 && (
            <div className="booking__step animate-fade-in">
              <h3 className="booking__step-title">Your Contact &amp; Property Information</h3>
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
                  <label className="form-label" htmlFor="booking-phone" style={{ color: 'var(--color-gray-400)' }}>Phone Number (Mobile for SMS confirmation)</label>
                  <input
                    id="booking-phone"
                    type="tel"
                    className={`form-input form-input-dark ${errors.phone ? 'error' : ''}`}
                    placeholder="(508) 555-0123"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    maxLength={20}
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
                  <DollarSign size={18} />
                  <span>Estimated Total &amp; Service Summary</span>
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
                      <span>Add-ons:</span>
                      <strong>{form.extras.map(eId => CLEANING_EXTRAS.find(e => e.id === eId)?.name).join(', ')}</strong>
                    </div>
                  )}
                  <div className="booking__summary-row">
                    <span>Schedule:</span>
                    <strong>{form.date} at {form.time}</strong>
                  </div>
                  <div className="booking__summary-row booking__summary-row--total">
                    <span>Estimated Total:</span>
                    <strong className="booking__summary-price">${estimatedPrice}</strong>
                  </div>
                </div>
                <p className="booking__summary-disclaimer">
                  * No payment required now. Final quote confirmed with you via SMS/text or phone upon booking review.
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
                    Complete Booking Request
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
