/**
 * Admin Dashboard — Real-time bookings with home size, instant quote calculator, SMS/WhatsApp/Email 1-click actions, and sound notifications.
 */
import { useState, useEffect, useRef } from 'react';
import {
  CalendarCheck,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  User,
  MapPin,
  Phone,
  Mail,
  Bell,
  Calendar,
  Filter,
  DollarSign,
  MessageCircle,
  MessageSquare as SmsIcon,
  Sparkles,
  BedDouble,
  Bath,
  Save,
} from 'lucide-react';
import {
  subscribeToAllBookings,
  subscribeToAllMessages,
  updateBookingStatus,
  updateBookingPrice,
  deleteBooking,
} from '../../lib/firestore';
import type { Booking, ContactMessage } from '../../types';
import { sendClientConfirmationEmail, sendClientCancellationEmail } from '../../lib/email';
import './Dashboard.css';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Play subtle luxury notification chime via Web Audio API */
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.5);

    // Second tone (B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.7);
  } catch {
    // Ignore audio autoplay policy restrictions
  }
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'var(--color-warning)', icon: <AlertCircle size={14} /> },
  confirmed: { label: 'Confirmado', color: 'var(--color-info)', icon: <Clock size={14} /> },
  completed: { label: 'Concluído', color: 'var(--color-success)', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelado', color: 'var(--color-error)', icon: <XCircle size={14} /> },
};

type FilterTab = 'all' | 'pending' | 'confirmed' | 'date';

export default function Dashboard() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  
  const isInitialLoad = useRef(true);
  const prevBookingsCount = useRef(0);

  const requestNotificationAccess = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === 'granted') {
          playNotificationChime();
          new Notification('🎉 Notificações Ativadas!', {
            body: 'Você receberá alertas aqui sempre que um novo agendamento for realizado.',
            icon: '/img/logo.jpg',
          });
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  // Subscribe to real-time bookings
  useEffect(() => {
    const unsubBookings = subscribeToAllBookings((bookings) => {
      setAllBookings(bookings);
      setLoading(false);

      if (!isInitialLoad.current && bookings.length > prevBookingsCount.current) {
        const newest = bookings[0];
        const clientName = newest?.name || 'Cliente';
        
        // 1. Play audio chime
        playNotificationChime();
        
        // 2. Vibrate phone if mobile
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }

        // 3. Trigger system push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 Novo Agendamento LUXE A&P!', {
              body: `${clientName} • ${newest.service} para ${newest.date} às ${newest.time}`,
              icon: '/img/logo.jpg',
              badge: '/img/logo.jpg',
              tag: `booking-${newest.id}`,
            });
          } catch (e) {
            console.info('Notification failed:', e);
          }
        }

        // 4. In-app toast banner
        setNotification(`🔔 Novo agendamento recebido de ${clientName}!`);
        setTimeout(() => setNotification(null), 7000);
      }

      prevBookingsCount.current = bookings.length;
      isInitialLoad.current = false;
    });

    const unsubMessages = subscribeToAllMessages((msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubBookings();
      unsubMessages();
    };
  }, []);

  const handleStatusChange = async (id: string, status: Booking['status']) => {
    try {
      await updateBookingStatus(id, status);
      const targetBooking = allBookings.find(b => b.id === id);
      if (targetBooking) {
        const updatedBooking = { ...targetBooking, status };
        if (status === 'confirmed') {
          sendClientConfirmationEmail(updatedBooking).catch(() => {});
          setNotification(`✅ Agendamento de ${targetBooking.name} confirmado! E-mail enviado.`);
          setTimeout(() => setNotification(null), 4000);
        } else if (status === 'cancelled') {
          sendClientCancellationEmail(updatedBooking).catch(() => {});
          setNotification(`❌ Agendamento de ${targetBooking.name} cancelado.`);
          setTimeout(() => setNotification(null), 4000);
        }
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o agendamento de "${name}"?`)) return;
    try {
      await deleteBooking(id);
    } catch (err) {
      console.error('Failed to delete booking:', err);
    }
  };

  // Helper to format clean phone digits for WhatsApp / SMS
  const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

  const getQuotePrice = (booking: Booking) => {
    const custom = editingPrice[booking.id];
    if (custom !== undefined && custom !== '') return Number(custom);
    return booking.finalPrice || booking.estimatedPrice || 160;
  };

  const [savedPriceId, setSavedPriceId] = useState<string | null>(null);

  const handleSavePrice = async (bookingId: string) => {
    const priceToSave = editingPrice[bookingId];
    if (priceToSave !== undefined && priceToSave !== '') {
      const num = Number(priceToSave);
      if (!isNaN(num) && num >= 0) {
        await updateBookingPrice(bookingId, num);
        setSavedPriceId(bookingId);
        setTimeout(() => setSavedPriceId(null), 2500);
      }
    }
  };

  // Quick SMS Link (iMessage)
  const getSmsLink = (booking: Booking) => {
    const price = getQuotePrice(booking);
    const specs = [
      booking.bedrooms ? `${booking.bedrooms} Bed` : null,
      booking.bathrooms ? `${booking.bathrooms} Bath` : null,
      booking.extras && booking.extras.length > 0 ? `Extras: ${booking.extras.join(', ')}` : null,
    ].filter(Boolean).join(', ');
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const text = `Hello ${booking.name}! ✨ LUXE A&P Cleaning here. Your personalized quote for ${booking.service} (${specs}) on ${booking.date} at ${booking.time} is $${price}.\n\nPlease reply YES to confirm. You can also view/manage your reservation here: ${manageUrl}\nHave a wonderful day!`;
    let digits = cleanPhone(booking.phone);
    if (digits.length === 10) digits = '1' + digits;
    return `sms:+${digits}?&body=${encodeURIComponent(text)}`;
  };

  // Quick WhatsApp Link
  const getWhatsAppLink = (booking: Booking) => {
    const price = getQuotePrice(booking);
    const extrasLine = booking.extras && booking.extras.length > 0 ? `\n• *Add-ons:* ${booking.extras.join(', ')}` : '';
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const text = `Hello ${booking.name}! ✨\n\nThank you for requesting your cleaning with *LUXE A&P Cleaning*.\n\nHere are your customized booking & quote details:\n• *Service:* ${booking.service}\n• *Home Size:* ${booking.bedrooms || 1} Bed, ${booking.bathrooms || 1} Bath${extrasLine}\n• *Date & Time:* ${booking.date} at ${booking.time}\n• *Address:* ${booking.address}\n• *Total Quote Price:* $${price}\n\n🔗 *Manage or Cancel Appointment:* ${manageUrl}\n\nPlease reply to this message to confirm your appointment! 🧹✨`;
    let digits = cleanPhone(booking.phone);
    if (digits.length === 10) digits = '1' + digits; // US country code
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  // Quick Email Link
  const getEmailLink = (booking: Booking) => {
    const price = getQuotePrice(booking);
    const subject = `LUXE A&P Cleaning — Appointment Confirmation & Quote ($${price})`;
    const extrasLine = booking.extras && booking.extras.length > 0 ? `\n- Optional Add-ons: ${booking.extras.join(', ')}` : '';
    const manageUrl = `${window.location.origin}/manage-booking?id=${booking.id}`;

    const body = `Hello ${booking.name},\n\nThank you for requesting a cleaning service with LUXE A&P Cleaning.\n\nCustomized Appointment Summary:\n- Service: ${booking.service}\n- Property Details: ${booking.bedrooms || 1} Bedroom(s), ${booking.bathrooms || 1} Bathroom(s)${extrasLine}\n- Scheduled: ${booking.date} at ${booking.time}\n- Address: ${booking.address}\n- Total Price Quote: $${price}\n\nYou can manage or cancel your appointment at any time using this link:\n${manageUrl}\n\nPlease reply to this email or text us at +1 (774) 360-4824 to confirm your appointment.\n\nWarm regards,\nLUXE A&P Cleaning Team`;
    return `mailto:${booking.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Metrics
  const todayStr = formatDate(new Date());
  const todayBookingsCount = allBookings.filter(b => b.date === todayStr).length;
  const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
  const unreadMessages = messages.filter(m => !m.read).length;

  // Filtered bookings
  let displayedBookings = allBookings;
  if (activeTab === 'pending') {
    displayedBookings = allBookings.filter(b => b.status === 'pending');
  } else if (activeTab === 'confirmed') {
    displayedBookings = allBookings.filter(b => b.status === 'confirmed');
  } else if (activeTab === 'date') {
    displayedBookings = allBookings.filter(b => b.date === selectedDate);
  }

  return (
    <div className="dashboard">
      {/* Real-time Notification Toast */}
      {notification && (
        <div className="dashboard__toast animate-fade-in-up">
          <Bell size={18} className="dashboard__toast-icon" />
          <span>{notification}</span>
          <button className="dashboard__toast-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Push Notification Enable Banner */}
      {notifPermission === 'default' && (
        <div className="dashboard__notif-banner animate-fade-in">
          <div className="dashboard__notif-banner-left">
            <Bell size={20} className="dashboard__notif-banner-icon" />
            <div>
              <strong>Ativar Alertas no Celular e Computador</strong>
              <p>Receba notificações com som e vibração no celular/PC sempre que um novo cliente agendar.</p>
            </div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={requestNotificationAccess}>
            Ativar Notificações
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Painel de Controle</h1>
          <p className="dashboard__date">
            Acompanhamento em tempo real, orçamentos e mensagens
          </p>
        </div>
        <div className="dashboard__live-indicator">
          <span className="dashboard__live-dot" />
          <span>Ao Vivo</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="dashboard__metrics">
        <div
          className={`dashboard__metric-card ${activeTab === 'all' ? 'dashboard__metric-card--selected' : ''}`}
          onClick={() => setActiveTab('all')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard__metric-icon dashboard__metric-icon--gold">
            <CalendarCheck size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{allBookings.length}</p>
            <p className="dashboard__metric-label">Total de Agendamentos</p>
          </div>
        </div>

        <div
          className={`dashboard__metric-card ${activeTab === 'pending' ? 'dashboard__metric-card--selected' : ''}`}
          onClick={() => setActiveTab('pending')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard__metric-icon dashboard__metric-icon--warning">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{pendingBookings}</p>
            <p className="dashboard__metric-label">Pendentes</p>
          </div>
        </div>

        <div
          className={`dashboard__metric-card ${activeTab === 'confirmed' ? 'dashboard__metric-card--selected' : ''}`}
          onClick={() => setActiveTab('confirmed')}
          style={{ cursor: 'pointer' }}
        >
          <div className="dashboard__metric-icon dashboard__metric-icon--info">
            <Clock size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{confirmedBookings}</p>
            <p className="dashboard__metric-label">Confirmados</p>
          </div>
        </div>

        <div className="dashboard__metric-card">
          <div className="dashboard__metric-icon dashboard__metric-icon--success">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{unreadMessages}</p>
            <p className="dashboard__metric-label">Mensagens Não Lidas</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Date Picker */}
      <div className="dashboard__filters-bar">
        <div className="dashboard__tabs">
          <button
            className={`dashboard__tab ${activeTab === 'all' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Filter size={15} />
            Todos ({allBookings.length})
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'pending' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <AlertCircle size={15} />
            Pendentes ({pendingBookings})
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'confirmed' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('confirmed')}
          >
            <CheckCircle size={15} />
            Confirmados ({confirmedBookings})
          </button>
          <button
            className={`dashboard__tab ${activeTab === 'date' ? 'dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('date')}
          >
            <Calendar size={15} />
            Por Data {todayBookingsCount > 0 && `(Hoje: ${todayBookingsCount})`}
          </button>
        </div>

        {activeTab === 'date' && (
          <div className="dashboard__date-picker-wrap animate-fade-in">
            <input
              type="date"
              className="dashboard__date-picker"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Bookings list */}
      <div className="dashboard__section">
        <h2 className="dashboard__section-title">
          <CalendarCheck size={20} />
          {activeTab === 'all' && 'Todos os Agendamentos'}
          {activeTab === 'pending' && 'Agendamentos Pendentes de Confirmação'}
          {activeTab === 'confirmed' && 'Agendamentos Confirmados'}
          {activeTab === 'date' && `Agendamentos para ${formatDisplayDate(selectedDate)}`}
        </h2>

        {loading ? (
          <div className="dashboard__loading">
            <div className="spinner" style={{ color: 'var(--color-gold)' }} />
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="dashboard__empty">
            <CalendarCheck size={40} />
            <p>
              {activeTab === 'date'
                ? `Nenhum agendamento encontrado para ${formatDisplayDate(selectedDate)}.`
                : 'Nenhum agendamento encontrado nesta categoria.'}
            </p>
          </div>
        ) : (
          <div className="dashboard__bookings">
            {displayedBookings.map(booking => {
              const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              const isExpanded = expandedBooking === booking.id;
              const currentPrice = getQuotePrice(booking);

              return (
                <div
                  key={booking.id}
                  className={`dashboard__booking ${isExpanded ? 'dashboard__booking--expanded' : ''}`}
                >
                  <button
                    className="dashboard__booking-header"
                    onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                  >
                    <div className="dashboard__booking-time">
                      <Clock size={14} />
                      <span>{booking.time || 'A definir'}</span>
                    </div>
                    <div className="dashboard__booking-info">
                      <strong>{booking.name}</strong>
                      <span>
                        {booking.service} &bull; <em style={{ fontStyle: 'normal', color: 'var(--color-gold)' }}>{formatDisplayDate(booking.date)}</em>
                      </span>
                    </div>

                    {/* Price tag badge */}
                    {(booking.estimatedPrice || booking.finalPrice) && (
                      <span className="dashboard__price-badge">
                        ${currentPrice}
                      </span>
                    )}

                    <span
                      className="dashboard__booking-status"
                      style={{
                        color: statusCfg.color,
                        background: `${statusCfg.color}15`,
                        border: `1px solid ${statusCfg.color}30`,
                      }}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="dashboard__booking-details animate-fade-in">
                      {/* House Specifications */}
                      <div className="dashboard__house-specs">
                        {booking.bedrooms && (
                          <div className="dashboard__spec-item">
                            <BedDouble size={15} />
                            <span>{booking.bedrooms} Quartos</span>
                          </div>
                        )}
                        {booking.bathrooms && (
                          <div className="dashboard__spec-item">
                            <Bath size={15} />
                            <span>{booking.bathrooms} Banheiros</span>
                          </div>
                        )}
                        {booking.extras && booking.extras.length > 0 && (
                          <div className="dashboard__spec-item dashboard__spec-item--extras">
                            <Sparkles size={15} />
                            <span>Extras: <strong>{booking.extras.join(', ')}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Contact & Location Info */}
                      <div className="dashboard__booking-detail">
                        <User size={14} />
                        <span><strong>Cliente:</strong> {booking.name}</span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <Mail size={14} />
                        <span><strong>E-mail:</strong> <a href={`mailto:${booking.email}`}>{booking.email}</a></span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <Phone size={14} />
                        <span><strong>Telefone:</strong> <a href={`tel:${booking.phone}`}>{booking.phone}</a></span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <MapPin size={14} />
                        <span><strong>Endereço:</strong> {booking.address}</span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <Calendar size={14} />
                        <span><strong>Data do Serviço:</strong> {formatDisplayDate(booking.date)} às {booking.time}</span>
                      </div>

                      {booking.notes && (
                        <div className="dashboard__booking-notes">
                          <strong>Observações do Cliente:</strong> {booking.notes}
                        </div>
                      )}

                      {/* Quote Pricing Box & 1-Click Send Quote */}
                      <div className="dashboard__quote-box">
                        <div className="dashboard__quote-header">
                          <div className="dashboard__quote-price-input">
                            <DollarSign size={16} />
                            <span>Valor do Orçamento:</span>
                            <input
                              type="number"
                              className="dashboard__price-field"
                              value={editingPrice[booking.id] !== undefined ? editingPrice[booking.id] : (booking.finalPrice || booking.estimatedPrice || '')}
                              onChange={e => setEditingPrice({ ...editingPrice, [booking.id]: e.target.value })}
                              placeholder="180"
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-gold"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleSavePrice(booking.id)}
                              title="Salvar valor no banco de dados"
                            >
                              {savedPriceId === booking.id ? (
                                <>
                                  <CheckCircle size={13} />
                                  Salvo!
                                </>
                              ) : (
                                <>
                                  <Save size={13} />
                                  Salvar
                                </>
                              )}
                            </button>
                          </div>
                          <span className="dashboard__quote-hint">
                            (Base sugerida: ${booking.estimatedPrice || currentPrice})
                          </span>
                        </div>

                        {/* Quick Price Presets and Stepper */}
                        <div className="dashboard__quick-prices">
                          <span className="dashboard__quick-prices-label">Valores Rápidos:</span>
                          <div className="dashboard__chips-wrapper">
                            {['130', '160', '190', '220', '250', '280', '320', '360', '400'].map(p => {
                              const isSelected = currentPrice === Number(p);
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  className={`dashboard__price-chip ${isSelected ? 'dashboard__price-chip--active' : ''}`}
                                  onClick={() => {
                                    setEditingPrice(prev => ({ ...prev, [booking.id]: p }));
                                    updateBookingPrice(booking.id, Number(p));
                                    setSavedPriceId(booking.id);
                                    setTimeout(() => setSavedPriceId(null), 2000);
                                  }}
                                >
                                  ${p}
                                </button>
                              );
                            })}
                            <div className="dashboard__steppers">
                              <button
                                type="button"
                                className="dashboard__stepper-btn"
                                onClick={() => {
                                  const nextP = Math.max(50, currentPrice - 10);
                                  setEditingPrice(prev => ({ ...prev, [booking.id]: String(nextP) }));
                                  updateBookingPrice(booking.id, nextP);
                                }}
                                title="Diminuir $10"
                              >
                                -$10
                              </button>
                              <button
                                type="button"
                                className="dashboard__stepper-btn"
                                onClick={() => {
                                  const nextP = currentPrice + 10;
                                  setEditingPrice(prev => ({ ...prev, [booking.id]: String(nextP) }));
                                  updateBookingPrice(booking.id, nextP);
                                }}
                                title="Aumentar $10"
                              >
                                +$10
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="dashboard__quote-buttons">
                          <a
                            href={getSmsLink(booking)}
                            className="btn btn-sm btn-quote btn-sms"
                            title="Enviar SMS em inglês"
                          >
                            <SmsIcon size={14} />
                            📱 Enviar SMS (iMessage)
                          </a>
                          <a
                            href={getWhatsAppLink(booking)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-quote btn-whatsapp"
                            title="Enviar no WhatsApp"
                          >
                            <MessageCircle size={14} />
                            💬 Enviar WhatsApp
                          </a>
                          <a
                            href={getEmailLink(booking)}
                            className="btn btn-sm btn-quote btn-email"
                            title="Enviar E-mail"
                          >
                            <Mail size={14} />
                            ✉️ Enviar E-mail
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="dashboard__booking-actions">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-info)', color: '#fff' }}
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            >
                              <CheckCircle size={14} />
                              Confirmar Agendamento
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'rgba(231,76,60,0.15)', color: 'var(--color-error)' }}
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                            >
                              <XCircle size={14} />
                              Cancelar
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--color-success)', color: '#fff' }}
                            onClick={() => handleStatusChange(booking.id, 'completed')}
                          >
                            <CheckCircle size={14} />
                            Marcar como Concluído
                          </button>
                        )}

                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(231,76,60,0.3)',
                            color: 'var(--color-error)',
                            marginLeft: 'auto',
                          }}
                          onClick={() => handleDelete(booking.id, booking.name)}
                          title="Excluir agendamento"
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
