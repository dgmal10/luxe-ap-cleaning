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
import { ensureAnonymousAuth } from '../../lib/firebase';
import {
  sendClientCancellationEmail,
  sendAdminCancellationAlert,
  sendAdminQuoteDeclinedAlert,
} from '../../lib/email';
import type { Booking } from '../../types';
import './ManageBooking.css';

export default function ManageBooking() {
  const [searchParams] = useSearchParams();
  const urlBookingId = searchParams.get('id') || '';
  const urlAction = searchParams.get('action') || '';

  const [searchId, setSearchId] = useState(urlBookingId);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Actions states
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [approveSuccess, setApproveSuccess] = useState(false);
  const [declineSuccess, setDeclineSuccess] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const fetchBooking = useCallback(async (idToFetch: string, action?: string) => {
    if (!idToFetch.trim()) return;
    setLoading(true);
    setError('');
    setCancelSuccess(false);
    setApproveSuccess(false);
    setDeclineSuccess(false);

    try {
      await ensureAnonymousAuth();
      const found = await getBookingById(idToFetch.trim());
      if (found) {
        setBooking(found);
        // Se o cliente clicou direto no botão de aprovar ou recusar dentro do e-mail:
        if (action === 'approve' && (found.status === 'quote_sent' || found.status === 'pending')) {
          setIsApproving(true);
          await updateBookingStatus(found.id, 'confirmed');
          const updated = { ...found, status: 'confirmed' as const };
          setBooking(updated);
          setApproveSuccess(true);
          setIsApproving(false);
        } else if (action === 'decline' && found.status === 'quote_sent') {
          setShowDeclineModal(true);
        }
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
      fetchBooking(urlBookingId, urlAction);
    }
  }, [urlBookingId, urlAction, fetchBooking]);

  /** Cliente APROVA o orçamento */
  const handleApproveQuote = async () => {
    if (!booking) return;
    setIsApproving(true);
    try {
      await updateBookingStatus(booking.id, 'confirmed');
      const updated = { ...booking, status: 'confirmed' as const };
      setBooking(updated);
      setApproveSuccess(true);
    } catch (err) {
      console.error('Failed to approve quote:', err);
      alert('Could not confirm quote at this time. Please contact us directly.');
    } finally {
      setIsApproving(false);
    }
  };

  /** Cliente RECUSA o orçamento */
  const handleDeclineQuote = async () => {
    if (!booking) return;
    setIsDeclining(true);
    try {
      await updateBookingStatus(booking.id, 'cancelled');
      const updated = { ...booking, status: 'cancelled' as const };
      setBooking(updated);
      setDeclineSuccess(true);
      setShowDeclineModal(false);

      // Notifica o Admin por e-mail
      await sendAdminQuoteDeclinedAlert(updated, declineReason);
    } catch (err) {
      console.error('Failed to decline quote:', err);
      alert('Could not update quote at this time. Please contact us directly.');
    } finally {
      setIsDeclining(false);
    }
  };

  /** Cliente CANCELA um agendamento já existente */
  const handleCancelBooking = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      await updateBookingStatus(booking.id, 'cancelled');

      setBooking(prev => (prev ? { ...prev, status: 'cancelled' } : null));
      setCancelSuccess(true);
      setShowConfirmModal(false);

      // Dispara e-mails de cancelamento em background
      sendClientCancellationEmail(booking).catch(() => {});
      sendAdminCancellationAlert(booking).catch(() => {});
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Could not cancel your appointment at this time. Please contact us directly.');
    } finally {
      setIsCancelling(false);
    }
  };

  const currentPrice = booking ? (booking.finalPrice || booking.estimatedPrice || 0) : 0;

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
            Review your customized quote, confirm reservation, or manage your appointment schedule.
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
                {booking.status === 'quote_sent' && '⏳ Quote Awaiting Your Approval'}
                {booking.status === 'pending' && '⏳ Quote Under Review'}
                {booking.status === 'cancelled' && '❌ Cancelled'}
                {booking.status === 'completed' && '✨ Completed'}
              </span>
            </div>

            {/* Quote Approval Success Banner */}
            {approveSuccess && (
              <div className="manage-booking__alert-success animate-fade-in">
                <CheckCircle size={26} />
                <div>
                  <strong>🎉 Quote Officially Approved!</strong>
                  <p>Your appointment has been confirmed for <strong>{booking.date} at {booking.time}</strong> for <strong>${currentPrice}</strong>. Our professional cleaning crew has been scheduled for your home!</p>
                </div>
              </div>
            )}

            {/* Quote Decline Alert */}
            {declineSuccess && (
              <div className="manage-booking__alert-declined animate-fade-in">
                <XCircle size={26} />
                <div>
                  <strong>Quote Declined</strong>
                  <p>You have declined this quote. Your reservation has been cancelled and no charges apply. If you change your mind, you can book again anytime.</p>
                </div>
              </div>
            )}

            {/* Cancel Success Alert */}
            {cancelSuccess && (
              <div className="manage-booking__alert-success animate-fade-in">
                <CheckCircle size={26} />
                <div>
                  <strong>Appointment Successfully Cancelled</strong>
                  <p>Your reservation has been cancelled and your time slot has been released. A cancellation receipt has been logged.</p>
                </div>
              </div>
            )}

            {/* ============================================================
                QUOTE APPROVAL ACTION CARD (When status is quote_sent)
               ============================================================ */}
            {booking.status === 'quote_sent' && !approveSuccess && !declineSuccess && (
              <div className="manage-booking__quote-box animate-fade-in">
                <div className="manage-booking__quote-header">
                  <Sparkles size={24} className="gold-text" />
                  <div>
                    <h3 className="manage-booking__quote-title">Your Official Cleaning Quote is Ready!</h3>
                    <p className="manage-booking__quote-desc">
                      Our team reviewed your home specifications and prepared your customized price:
                    </p>
                  </div>
                </div>

                <div className="manage-booking__quote-price-card">
                  <span className="manage-booking__quote-price-label">Official Quote Price</span>
                  <strong className="manage-booking__quote-price-val">${currentPrice}</strong>
                  <span className="manage-booking__quote-price-sub">All supplies &amp; selected extras included</span>
                </div>

                <div className="manage-booking__quote-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    style={{ flex: '1 1 240px', fontSize: '15px' }}
                    disabled={isApproving}
                    onClick={handleApproveQuote}
                  >
                    <CheckCircle size={18} />
                    {isApproving ? 'Confirming Appointment...' : `Approve & Confirm ($${currentPrice})`}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    style={{ flex: '0 1 160px' }}
                    disabled={isApproving}
                    onClick={() => setShowDeclineModal(true)}
                  >
                    <XCircle size={18} />
                    Decline Quote
                  </button>
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
                  <span className="manage-booking__price-label">Official Quote Price:</span>
                  <strong className="manage-booking__price-val">${booking.finalPrice}</strong>
                </div>
              ) : null}
            </div>

            {/* Footer Action Buttons */}
            <div className="manage-booking__actions">
              {booking.status !== 'cancelled' && booking.status !== 'completed' && booking.status !== 'quote_sent' && (
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

        {/* Modal: Recusar Orçamento */}
        {showDeclineModal && (
          <div className="manage-booking__modal-backdrop animate-fade-in">
            <div className="manage-booking__modal animate-fade-in-up">
              <AlertTriangle size={42} className="manage-booking__modal-icon" />
              <h3>Decline this Cleaning Quote?</h3>
              <p>
                Are you sure you wish to decline the <strong>${currentPrice}</strong> quote for <strong>{booking?.service} on {booking?.date}</strong>?
              </p>
              
              <div style={{ margin: '14px 0', textAlign: 'left' }}>
                <label style={{ fontSize: '12px', color: 'var(--color-gray-400)', display: 'block', marginBottom: '4px' }}>
                  Optional: Tell us why (price, schedule change, etc.)
                </label>
                <textarea
                  className="form-textarea form-textarea-dark"
                  rows={2}
                  placeholder="Reason (optional)"
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                />
              </div>

              <div className="manage-booking__modal-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isDeclining}
                  onClick={handleDeclineQuote}
                >
                  {isDeclining ? 'Declining...' : 'Yes, Decline Quote'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-gold"
                  disabled={isDeclining}
                  onClick={() => setShowDeclineModal(false)}
                >
                  Keep Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Cancelar Agendamento */}
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
