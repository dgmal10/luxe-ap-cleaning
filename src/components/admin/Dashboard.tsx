/**
 * Admin Dashboard — today's bookings overview with quick actions.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  User,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { getBookingsByDate, updateBookingStatus, getMessages } from '../../lib/firestore';
import type { Booking, ContactMessage } from '../../types';
import './Dashboard.css';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'var(--color-warning)', icon: <AlertCircle size={14} /> },
  confirmed: { label: 'Confirmed', color: 'var(--color-info)', icon: <Clock size={14} /> },
  completed: { label: 'Completed', color: 'var(--color-success)', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Cancelled', color: 'var(--color-error)', icon: <XCircle size={14} /> },
};

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, m] = await Promise.all([
        getBookingsByDate(selectedDate),
        getMessages(),
      ]);
      setBookings(b);
      setMessages(m);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: Booking['status']) => {
    try {
      await updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      console.error('Failed to update booking:', err);
    }
  };

  const unreadMessages = messages.filter(m => !m.read).length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <div className="dashboard">
      {/* Page title */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__date">{formatDisplayDate(new Date(selectedDate + 'T12:00:00'))}</p>
        </div>
        <div className="dashboard__actions">
          <input
            type="date"
            className="dashboard__date-picker"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button className="dashboard__refresh" onClick={fetchData} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="dashboard__metrics">
        <div className="dashboard__metric-card">
          <div className="dashboard__metric-icon dashboard__metric-icon--gold">
            <CalendarCheck size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{bookings.length}</p>
            <p className="dashboard__metric-label">Today's Bookings</p>
          </div>
        </div>

        <div className="dashboard__metric-card">
          <div className="dashboard__metric-icon dashboard__metric-icon--warning">
            <AlertCircle size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{pendingBookings}</p>
            <p className="dashboard__metric-label">Pending</p>
          </div>
        </div>

        <div className="dashboard__metric-card">
          <div className="dashboard__metric-icon dashboard__metric-icon--info">
            <Clock size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{confirmedBookings}</p>
            <p className="dashboard__metric-label">Confirmed</p>
          </div>
        </div>

        <div className="dashboard__metric-card">
          <div className="dashboard__metric-icon dashboard__metric-icon--success">
            <MessageSquare size={22} />
          </div>
          <div>
            <p className="dashboard__metric-value">{unreadMessages}</p>
            <p className="dashboard__metric-label">Unread Messages</p>
          </div>
        </div>
      </div>

      {/* Bookings list */}
      <div className="dashboard__section">
        <h2 className="dashboard__section-title">
          <CalendarCheck size={20} />
          Bookings for {selectedDate}
        </h2>

        {loading ? (
          <div className="dashboard__loading">
            <div className="spinner" style={{ color: 'var(--color-gold)' }} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="dashboard__empty">
            <CalendarCheck size={40} />
            <p>No bookings for this date.</p>
          </div>
        ) : (
          <div className="dashboard__bookings">
            {bookings.map(booking => {
              const statusCfg = STATUS_CONFIG[booking.status];
              const isExpanded = expandedBooking === booking.id;

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
                      {booking.time}
                    </div>
                    <div className="dashboard__booking-info">
                      <strong>{booking.name}</strong>
                      <span>{booking.service}</span>
                    </div>
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
                      <div className="dashboard__booking-detail">
                        <User size={14} />
                        <span>{booking.name}</span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <Mail size={14} />
                        <span>{booking.email}</span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <Phone size={14} />
                        <span>{booking.phone}</span>
                      </div>
                      <div className="dashboard__booking-detail">
                        <MapPin size={14} />
                        <span>{booking.address}</span>
                      </div>
                      {booking.notes && (
                        <div className="dashboard__booking-notes">
                          <strong>Notes:</strong> {booking.notes}
                        </div>
                      )}

                      <div className="dashboard__booking-actions">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-info)', color: '#fff' }}
                              onClick={() => handleStatusChange(booking.id, 'confirmed')}
                            >
                              <CheckCircle size={14} />
                              Confirm
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--color-error)', color: '#fff' }}
                              onClick={() => handleStatusChange(booking.id, 'cancelled')}
                            >
                              <XCircle size={14} />
                              Cancel
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
                            Mark Completed
                          </button>
                        )}
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
