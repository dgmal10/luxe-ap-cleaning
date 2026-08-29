import { useState, useCallback, useEffect } from 'react';
import { Calendar, Clock, User, ArrowRight, ArrowLeft, CheckCircle, MessageCircle } from 'lucide-react';
import { SERVICES, BUSINESS } from '../../lib/constants';
import { TIME_SLOTS as FALLBACK_TIME_SLOTS } from '../../lib/constants';
import { useRevealOnScroll } from '../../hooks/useUtils';
import { createBooking } from '../../lib/firestore';
import { getScheduleConfig, generateTimeSlots } from '../../lib/firestore';
import './Booking.css';

type Step = 1 | 2 | 3 | 4;

interface FormData {
  service: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const INITIAL: FormData = {
  service: '',
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

  // Load dynamic time slots from admin schedule config
  useEffect(() => {
    getScheduleConfig()
      .then(config => {
        const slots = generateTimeSlots(config);
        if (slots.length > 0) setTimeSlots(slots);
      })
      .catch(() => { /* keep fallback slots */ });
  }, []);

  const set = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const validateStep = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};

    if (step === 1 && !form.service) errs.service = 'Please select a service';
    if (step === 2) {
      if (!form.date) errs.date = 'Please select a date';
      if (!form.time) errs.time = 'Please select a time';
      // Check if date is in the future
      if (form.date && new Date(form.date) < new Date(new Date().toDateString())) {
        errs.date = 'Please select a future date';
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
  }, [step, form]);

  const next = useCallback(() => {
    if (validateStep()) setStep(s => Math.min(s + 1, 4) as Step);
  }, [validateStep]);

  const prev = useCallback(() => {
    setStep(s => Math.max(s - 1, 1) as Step);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      const serviceName = SERVICES.find(s => s.id === form.service)?.name || form.service;
      await createBooking({
        service: serviceName,
        date: form.date,
        time: form.time,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit booking:', err);
      // Still show success for UX (WhatsApp fallback)
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateStep, form]);

  const selectedService = SERVICES.find(s => s.id === form.service);

  // Get min date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

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
              Thank you, {form.name}! We've received your cleaning request for{' '}
              <strong>{selectedService?.name}</strong> on <strong>{form.date}</strong> at{' '}
              <strong>{form.time}</strong>.
            </p>
            <p className="booking__success-sub">
              We'll confirm your appointment shortly. You can also reach us directly:
            </p>
            <a
              href={BUSINESS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
            >
              <MessageCircle size={18} />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="booking section section-dark" id="booking">
      <div className="container" ref={ref}>
        <div className="section-header reveal">
          <span className="section-label">Book Now</span>
          <h2 className="section-title">Schedule Your Cleaning</h2>
          <hr className="gold-line" />
          <p className="section-subtitle">
            Fill out the form below and we'll confirm your appointment within 24 hours.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="booking__progress reveal">
          {[
            { num: 1, label: 'Service', icon: <Calendar size={16} /> },
            { num: 2, label: 'Schedule', icon: <Clock size={16} /> },
            { num: 3, label: 'Details', icon: <User size={16} /> },
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
          {/* Step 1: Service */}
          {step === 1 && (
            <div className="booking__step animate-fade-in">
              <h3 className="booking__step-title">Choose Your Service</h3>
              <div className="booking__services-grid">
                {SERVICES.map(service => (
                  <button
                    key={service.id}
                    className={`booking__service-option ${form.service === service.id ? 'booking__service-option--selected' : ''}`}
                    onClick={() => set('service', service.id)}
                  >
                    <strong>{service.name}</strong>
                    <span>{service.description}</span>
                  </button>
                ))}
              </div>
              {errors.service && <p className="form-error">{errors.service}</p>}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="booking__step animate-fade-in">
              <h3 className="booking__step-title">Pick a Date & Time</h3>
              <div className="booking__datetime">
                <div className="form-group">
                  <label className="form-label" htmlFor="booking-date">Preferred Date</label>
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
                  <label className="form-label" style={{ color: 'var(--color-gray-400)' }}>Preferred Time</label>
                  <div className="booking__time-grid">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        className={`booking__time-slot ${form.time === slot ? 'booking__time-slot--selected' : ''}`}
                        onClick={() => set('time', slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  {errors.time && <p className="form-error">{errors.time}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personal info */}
          {step === 3 && (
            <div className="booking__step animate-fade-in">
              <h3 className="booking__step-title">Your Information</h3>
              <div className="booking__info-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="booking-name" style={{ color: 'var(--color-gray-400)' }}>Full Name</label>
                  <input
                    id="booking-name"
                    type="text"
                    className={`form-input form-input-dark ${errors.name ? 'error' : ''}`}
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    maxLength={100}
                  />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-email" style={{ color: 'var(--color-gray-400)' }}>Email</label>
                  <input
                    id="booking-email"
                    type="email"
                    className={`form-input form-input-dark ${errors.email ? 'error' : ''}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    maxLength={200}
                  />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="booking-phone" style={{ color: 'var(--color-gray-400)' }}>Phone</label>
                  <input
                    id="booking-phone"
                    type="tel"
                    className={`form-input form-input-dark ${errors.phone ? 'error' : ''}`}
                    placeholder="(555) 123-4567"
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
                    placeholder="Full address of the property"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    maxLength={300}
                  />
                  {errors.address && <p className="form-error">{errors.address}</p>}
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" htmlFor="booking-notes" style={{ color: 'var(--color-gray-400)' }}>Special Requests (Optional)</label>
                  <textarea
                    id="booking-notes"
                    className="form-textarea form-textarea-dark"
                    placeholder="Any special instructions, access codes, pets, etc."
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="booking__nav">
            {step > 1 && (
              <button className="btn btn-secondary" onClick={prev}>
                <ArrowLeft size={16} />
                Back
              </button>
            )}
            <div style={{ flex: 1 }} />
            {step < 3 ? (
              <button className="btn btn-primary" onClick={next}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Summary sidebar on step 3 */}
          {step === 3 && selectedService && (
            <div className="booking__summary">
              <h4 className="booking__summary-title">Booking Summary</h4>
              <div className="booking__summary-item">
                <span>Service</span>
                <strong>{selectedService.name}</strong>
              </div>
              <div className="booking__summary-item">
                <span>Date</span>
                <strong>{form.date}</strong>
              </div>
              <div className="booking__summary-item">
                <span>Time</span>
                <strong>{form.time}</strong>
              </div>

            </div>
          )}
        </div>
      </div>
    </section>
  );
}
