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
        setError('Agendamento não encontrado. Verifique o código e tente novamente.');
        setBooking(null);
      }
    } catch (err) {
      console.error('Error loading booking:', err);
      setError('Ocorreu um erro ao carregar os dados do agendamento.');
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

      // Disparar e-mails de cancelamento em segundo plano
      sendClientCancellationEmail(booking).catch(() => {});
      sendAdminCancellationAlert(booking).catch(() => {});
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Não foi possível cancelar o agendamento no momento. Por favor, entre em contato direto conosco.');
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
          <h1 className="manage-booking__title">Gerenciar Agendamento</h1>
          <p className="manage-booking__subtitle">
            Consulte os detalhes da sua reserva ou solicite o cancelamento a qualquer momento.
          </p>
        </div>

        {/* Search / Lookup Box */}
        {!booking && !loading && (
          <div className="manage-booking__card manage-booking__card--search animate-fade-in-up">
            <h3>Localizar seu Agendamento</h3>
            <p>Informe o código do agendamento que você recebeu por e-mail ou mensagem:</p>
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
                placeholder="Ex: abc123XYZ ou código do e-mail"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={!searchId.trim()}>
                Buscar Agendamento
              </button>
            </form>
            {error && <p className="manage-booking__error">{error}</p>}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="manage-booking__loading">
            <div className="spinner spinner-lg" style={{ color: 'var(--color-gold)' }} />
            <p>Localizando agendamento...</p>
          </div>
        )}

        {/* Booking Details Card */}
        {booking && (
          <div className="manage-booking__card animate-fade-in-up">
            {/* Status Header */}
            <div className="manage-booking__status-bar">
              <div>
                <span className="manage-booking__ref">Reserva #{booking.id.slice(0, 8).toUpperCase()}</span>
                <h2 className="manage-booking__service-name">{booking.service}</h2>
              </div>
              <span className={`manage-booking__badge manage-booking__badge--${booking.status}`}>
                {booking.status === 'confirmed' && '✅ Confirmado'}
                {booking.status === 'pending' && '⏳ Aguardando Confirmação'}
                {booking.status === 'cancelled' && '❌ Cancelado'}
                {booking.status === 'completed' && '✨ Concluído'}
              </span>
            </div>

            {/* Cancel Success Alert */}
            {cancelSuccess && (
              <div className="manage-booking__alert-success animate-fade-in">
                <CheckCircle size={24} />
                <div>
                  <strong>Agendamento Cancelado com Sucesso!</strong>
                  <p>Sua reserva foi cancelada e o horário foi liberado. Um e-mail de confirmação foi enviado para você.</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="manage-booking__grid">
              <div className="manage-booking__item">
                <CalendarCheck size={18} className="manage-booking__icon" />
                <div>
                  <strong>Data e Horário</strong>
                  <span>{booking.date} às {booking.time}</span>
                </div>
              </div>

              <div className="manage-booking__item">
                <MapPin size={18} className="manage-booking__icon" />
                <div>
                  <strong>Endereço do Serviço</strong>
                  <span>{booking.address}</span>
                </div>
              </div>

              <div className="manage-booking__item">
                <BedDouble size={18} className="manage-booking__icon" />
                <div>
                  <strong>Especificações do Imóvel</strong>
                  <span>{booking.bedrooms || 1} Quarto(s) • {booking.bathrooms || 1} Banheiro(s)</span>
                </div>
              </div>

              {booking.extras && booking.extras.length > 0 && (
                <div className="manage-booking__item">
                  <Sparkles size={18} className="manage-booking__icon" />
                  <div>
                    <strong>Serviços Opcionais</strong>
                    <span>{booking.extras.join(', ')}</span>
                  </div>
                </div>
              )}

              {booking.finalPrice ? (
                <div className="manage-booking__item manage-booking__item--highlight">
                  <span className="manage-booking__price-label">Valor do Orçamento:</span>
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
                  Cancelar este Agendamento
                </button>
              )}

              <a
                href={BUSINESS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <MessageCircle size={16} />
                Falar com a Equipe no WhatsApp
              </a>

              <Link to="/" className="btn btn-outline-gold">
                <ArrowLeft size={16} />
                Voltar à Página Principal
              </Link>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="manage-booking__modal-backdrop animate-fade-in">
            <div className="manage-booking__modal animate-fade-in-up">
              <AlertTriangle size={42} className="manage-booking__modal-icon" />
              <h3>Deseja realmente cancelar?</h3>
              <p>
                Ao confirmar, seu horário reservado para <strong>{booking?.date} às {booking?.time}</strong> será liberado no calendário.
              </p>
              <div className="manage-booking__modal-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={isCancelling}
                  onClick={handleCancelBooking}
                >
                  {isCancelling ? 'Cancelando...' : 'Sim, Cancelar Agendamento'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-gold"
                  disabled={isCancelling}
                  onClick={() => setShowConfirmModal(false)}
                >
                  Não, manter reserva
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
