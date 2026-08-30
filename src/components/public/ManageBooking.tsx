import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CalendarCheck,
  MapPin,
  BedDouble,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react';
import { BUSINESS } from '../../lib/constants';
import { getBookingById, updateBookingStatus } from '../../lib/firestore';
import { sendClientCancellationEmail, sendAdminCancellationAlert } from '../../lib/email';
import type { Booking } from '../../types';
import './ManageBooking.css';

export default function ManageBooking() {
  const [searchParams] = useSearchParams();
  const urlBookingId = searchParams.get('id') || '';

  const [searchId, setSearchId] = useState(urlBookingId);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchBooking = useCallback(async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    setLoading(true);
    setError('');
    setCancelSuccess(false);

    try {
      const found = await getBookingById(idToFetch.trim());
      if (found) {
        setBooking(found);
      } else {
        setError('Appointment not found. Please check your reference code and try again.');
        setBooking(null);
      }
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('An error occurred while retrieving appointment details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlBookingId) {
      fetchBooking(urlBookingId);
    }
  }, [urlBookingId, fetchBooking]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      await updateBookingStatus(booking.id, 'cancelled');

      setBooking(prev => (prev ? { ...prev, status: 'cancelled' } : null));
      setCancelSuccess(true);
      setShowConfirmModal(false);

      // Trigger background notification emails
      sendClientCancellationEmail(booking).catch(() => {});
      sendAdminCancellationAlert(booking).catch(() => {});
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Could not cancel your appointment at this time. Please contact us directly.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="manage-booking">
      {/* Background decoration */}
      <div className="manage-booking__bg">
        <div className="manage-booking__bg-gradient" />
      </div>

      <div className="container manage-booking__container">
        {/* Header brand */}
        <div className="manage-booking__header">
          <Link to="/" className="manage-booking__brand">
            <span className="gold-text">LUXE</span> A&amp;P
          </Link>
          <h1 className="manage-booking__title">Manage Your Appointment</h1>
          <p className="manage-booking__subtitle">
            Review your reservation details or cancel your appointment at any time.
          </p>
        </div>

        {/* Search / Lookup Box */}
        {!booking && !loading && (
          <div className="manage-booking__card manage-booking__card--search animate-fade-in-up">
            <h3>Find Your Reservation</h3>
            <p>Enter the booking reference key you received upon booking or in your confirmation:</p>
            <form
              onSubmit={e => {
                e.preventDefault();
                fetchBooking(searchId);
              }}
              className="manage-booking__search-form"
            >
              <input
                type="text"
                className="form-input form-input-dark"
                placeholder="Ex: abc123XYZ or reference key"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={!searchId.trim()}>
                Look Up Appointment
              </button>
            </form>
            {error && <p className="manage-booking__error">{error}</p>}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="manage-booking__loading">
            <div className="spinner spinner-lg" style={{ color: 'var(--color-gold)' }} />
            <p>Locating appointment details...</p>
          </div>
        )}

        {/* Booking Details Card */}
        {booking && (
          <div className="manage-booking__card animate-fade-in-up">
            {/* Status Header */}
            <div className="manage-booking__status-bar">
              <div>
                <span className="manage-booking__ref">Booking #{booking.id.slice(0, 8).toUpperCase()}</span>
                <h2 className="manage-booking__service-name">{booking.service}</h2>
              </div>
              <span className={`manage-booking__badge manage-booking__badge--${booking.status}`}>
                {booking.status === 'confirmed' && '✅ Confirmed'}
                {booking.status === 'pending' && '⏳ Pending Review'}
                {booking.status === 'cancelled' && '❌ Cancelled'}
                {booking.status === 'completed' && '✨ Completed'}
              </span>
            </div>

            {/* Cancel Success Alert */}
            {cancelSuccess && (
              <div className="manage-booking__alert-success animate-fade-in">
                <CheckCircle size={24} />
                <div>
                  <strong>Appointment Successfully Cancelled</strong>
                  <p>Your reservation has been cancelled and your time slot has been released. A cancellation receipt has been logged.</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="manage-booking__grid">
              <div className="manage-booking__item">
                <CalendarCheck size={18} className="manage-booking__icon" />
                <div>
                  <strong>Date &amp; Time</strong>
                  <span>{booking.date} at {booking.time}</span>
                </div>
              </div>

              <div className="manage-booking__item">
                <MapPin size={18} className="manage-booking__icon" />
                <div>
                  <strong>Service Address</strong>
                  <span>{booking.address}</span>
                </div>
              </div>

              <div className="manage-booking__item">
                <BedDouble size={18} className="manage-booking__icon" />
                <div>
                  <strong>Home Specifications</strong>
                  <span>{booking.bedrooms || 1} Bedroom(s) • {booking.bathrooms || 1} Bathroom(s)</span>
                </div>
              </div>

              {booking.extras && booking.extras.length > 0 && (
                <div className="manage-booking__item">
                  <Sparkles size={18} className="manage-booking__icon" />
                  <div>
                    <strong>Selected Add-ons</strong>
                    <span>{booking.extras.join(', ')}</span>
                  </div>
                </div>
              )}

              {booking.finalPrice ? (
                <div className="manage-booking__item manage-booking__item--highlight">
                  <span className="manage-booking__price-label">Confirmed Quote Price:</span>
                  <strong className="manage-booking__price-val">${booking.finalPrice}</strong>
                </div>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="manage-booking__actions">
              {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() => setShowConfirmModal(true)}
                >
                  <XCircle size={16} />
                  Cancel this Appointment
                </button>
              )}

              <a
                href={BUSINESS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <MessageCircle size={16} />
                Chat with Team on WhatsApp
              </a>

              <Link to="/" className="btn btn-outline-gold">
                <ArrowLeft size={16} />
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="manage-booking__modal-backdrop animate-fade-in">
            <div className="manage-booking__modal animate-fade-in-up">
              <AlertTriangle size={42} className="manage-booking__modal-icon" />
              <h3>Are you sure you want to cancel?</h3>
              <p>
                By confirming, your reserved time slot on <strong>{booking?.date} at {booking?.time}</strong> will be released.
              </p>
              <div className="manage-booking__modal-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isCancelling}
                  onClick={handleCancelBooking}
                >
                  {isCancelling ? 'Cancelling...' : 'Yes, Cancel Appointment'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-gold"
                  disabled={isCancelling}
                  onClick={() => setShowConfirmModal(false)}
                >
                  No, Keep Reservation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
