/**
 * Admin Messages — view and manage contact form submissions.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mail,
  User,
  Clock,
  Trash2,
  RefreshCw,
  X,
  Inbox,
} from 'lucide-react';
import { getMessages, markMessageAsRead, deleteMessage } from '../../lib/firestore';
import type { ContactMessage } from '../../types';
import './Messages.css';

function formatTimestamp(ts: unknown): string {
  if (!ts) return '';
  const t = ts as { seconds?: number; toDate?: () => Date };
  const date = t.toDate ? t.toDate() : new Date((t.seconds || 0) * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMessages();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSelect = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.read) {
      try {
        await markMessageAsRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = filter === 'unread' ? messages.filter(m => !m.read) : messages;
  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="messages">
      {/* Header */}
      <div className="messages__header">
        <div>
          <h1 className="messages__title">Messages</h1>
          <p className="messages__count">
            {unreadCount} unread · {messages.length} total
          </p>
        </div>
        <div className="messages__actions">
          <div className="messages__filter">
            <button
              className={`messages__filter-btn ${filter === 'all' ? 'messages__filter-btn--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`messages__filter-btn ${filter === 'unread' ? 'messages__filter-btn--active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <button className="messages__refresh" onClick={fetchMessages} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="messages__content">
        {/* Message list */}
        <div className="messages__list-panel">
          {loading ? (
            <div className="messages__loading">
              <div className="spinner" style={{ color: 'var(--color-gold)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="messages__empty">
              <Inbox size={40} />
              <p>{filter === 'unread' ? 'No unread messages' : 'No messages yet'}</p>
            </div>
          ) : (
            <div className="messages__list">
              {filtered.map(msg => (
                <button
                  key={msg.id}
                  className={`messages__item ${!msg.read ? 'messages__item--unread' : ''} ${selected?.id === msg.id ? 'messages__item--selected' : ''}`}
                  onClick={() => handleSelect(msg)}
                >
                  <div className="messages__item-avatar">
                    <User size={16} />
                  </div>
                  <div className="messages__item-content">
                    <div className="messages__item-top">
                      <strong className="messages__item-name">{msg.name}</strong>
                      <span className="messages__item-date">{formatTimestamp(msg.createdAt)}</span>
                    </div>
                    <p className="messages__item-email">{msg.email}</p>
                    <p className="messages__item-preview">
                      {msg.message.length > 80 ? msg.message.slice(0, 80) + '…' : msg.message}
                    </p>
                  </div>
                  {!msg.read && <div className="messages__item-dot" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message detail */}
        <div className={`messages__detail-panel ${selected ? 'messages__detail-panel--open' : ''}`}>
          {selected ? (
            <div className="messages__detail">
              <div className="messages__detail-header">
                <button
                  className="messages__detail-close"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
                <h3 className="messages__detail-name">{selected.name}</h3>
                <div className="messages__detail-meta">
                  <span>
                    <Mail size={14} />
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  </span>
                  <span>
                    <Clock size={14} />
                    {formatTimestamp(selected.createdAt)}
                  </span>
                </div>
              </div>

              <div className="messages__detail-body">
                <p>{selected.message}</p>
              </div>

              <div className="messages__detail-actions">
                <a
                  href={`mailto:${selected.email}?subject=Re: Your message to LUXE A%26P`}
                  className="btn btn-primary btn-sm"
                >
                  <Mail size={14} />
                  Reply
                </a>
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(231,76,60,0.15)', color: 'var(--color-error)' }}
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting === selected.id}
                >
                  {deleting === selected.id ? (
                    <span className="spinner spinner-sm" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="messages__detail-empty">
              <MessageSquare size={40} />
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
