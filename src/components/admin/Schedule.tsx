/**
 * Admin Schedule — control work days, hours, and blocked dates.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCog,
  Clock,
  CalendarOff,
  Save,
  Plus,
  X,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { getScheduleConfig, updateScheduleConfig, generateTimeSlots } from '../../lib/firestore';
import type { ScheduleConfig } from '../../types';
import './Schedule.css';

const DAYS: { key: keyof ScheduleConfig['workDays']; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const SLOT_OPTIONS = [30, 60, 90, 120];

export default function Schedule() {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScheduleConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateScheduleConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: keyof ScheduleConfig['workDays']) => {
    if (!config) return;
    setConfig({
      ...config,
      workDays: { ...config.workDays, [day]: !config.workDays[day] },
    });
    setSaved(false);
  };

  const addBlockedDate = () => {
    if (!config || !newBlockedDate) return;
    if (config.blockedDates.includes(newBlockedDate)) return;
    setConfig({
      ...config,
      blockedDates: [...config.blockedDates, newBlockedDate].sort(),
    });
    setNewBlockedDate('');
    setSaved(false);
  };

  const removeBlockedDate = (date: string) => {
    if (!config) return;
    setConfig({
      ...config,
      blockedDates: config.blockedDates.filter(d => d !== date),
    });
    setSaved(false);
  };

  if (loading || !config) {
    return (
      <div className="schedule">
        <div className="schedule__loading">
          <div className="spinner" style={{ color: 'var(--color-gold)' }} />
        </div>
      </div>
    );
  }

  const previewSlots = generateTimeSlots(config);

  return (
    <div className="schedule">
      {/* Header */}
      <div className="schedule__header">
        <div>
          <h1 className="schedule__title">Schedule Settings</h1>
          <p className="schedule__subtitle">Control your availability and working hours</p>
        </div>
        <div className="schedule__header-actions">
          <button className="schedule__refresh" onClick={fetchConfig} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button
            className={`btn btn-primary ${saved ? 'btn--saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner spinner-sm" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle size={16} />
                Saved!
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="schedule__grid">
        {/* Work Days */}
        <div className="schedule__card">
          <h2 className="schedule__card-title">
            <CalendarCog size={20} />
            Work Days
          </h2>
          <p className="schedule__card-desc">
            Toggle which days you're available for bookings.
          </p>
          <div className="schedule__days">
            {DAYS.map(day => (
              <button
                key={day.key}
                className={`schedule__day ${config.workDays[day.key] ? 'schedule__day--active' : ''}`}
                onClick={() => toggleDay(day.key)}
              >
                <span className="schedule__day-short">{day.short}</span>
                <span className="schedule__day-full">{day.label}</span>
                <div className={`schedule__toggle ${config.workDays[day.key] ? 'schedule__toggle--on' : ''}`}>
                  <div className="schedule__toggle-knob" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Work Hours */}
        <div className="schedule__card">
          <h2 className="schedule__card-title">
            <Clock size={20} />
            Work Hours
          </h2>
          <p className="schedule__card-desc">
            Set your start time, end time, and appointment duration.
          </p>
          <div className="schedule__hours">
            <div className="schedule__hour-field">
              <label className="schedule__label">Start Time</label>
              <input
                type="time"
                className="schedule__input"
                value={config.startTime}
                onChange={e => { setConfig({ ...config, startTime: e.target.value }); setSaved(false); }}
              />
            </div>
            <div className="schedule__hour-field">
              <label className="schedule__label">End Time</label>
              <input
                type="time"
                className="schedule__input"
                value={config.endTime}
                onChange={e => { setConfig({ ...config, endTime: e.target.value }); setSaved(false); }}
              />
            </div>
            <div className="schedule__hour-field">
              <label className="schedule__label">Slot Duration</label>
              <select
                className="schedule__input schedule__select"
                value={config.slotDuration}
                onChange={e => { setConfig({ ...config, slotDuration: Number(e.target.value) }); setSaved(false); }}
              >
                {SLOT_OPTIONS.map(m => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="schedule__preview">
            <label className="schedule__label">Preview — Available Slots</label>
            <div className="schedule__slots-preview">
              {previewSlots.length > 0 ? (
                previewSlots.map(slot => (
                  <span key={slot} className="schedule__slot-chip">{slot}</span>
                ))
              ) : (
                <span className="schedule__no-slots">No slots available with current settings</span>
              )}
            </div>
          </div>
        </div>

        {/* Blocked Dates */}
        <div className="schedule__card schedule__card--full">
          <h2 className="schedule__card-title">
            <CalendarOff size={20} />
            Blocked Dates
          </h2>
          <p className="schedule__card-desc">
            Block specific dates for vacations, holidays, or days off.
          </p>

          <div className="schedule__blocked-add">
            <input
              type="date"
              className="schedule__input"
              value={newBlockedDate}
              onChange={e => setNewBlockedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={addBlockedDate}
              disabled={!newBlockedDate}
            >
              <Plus size={14} />
              Block Date
            </button>
          </div>

          {config.blockedDates.length > 0 ? (
            <div className="schedule__blocked-list">
              {config.blockedDates.map(date => (
                <div key={date} className="schedule__blocked-item">
                  <CalendarOff size={14} />
                  <span>
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    className="schedule__blocked-remove"
                    onClick={() => removeBlockedDate(date)}
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="schedule__no-blocked">No dates blocked yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
