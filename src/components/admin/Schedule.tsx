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
  { key: 'monday', label: 'Segunda-feira', short: 'Seg' },
  { key: 'tuesday', label: 'Terça-feira', short: 'Ter' },
  { key: 'wednesday', label: 'Quarta-feira', short: 'Qua' },
  { key: 'thursday', label: 'Quinta-feira', short: 'Qui' },
  { key: 'friday', label: 'Sexta-feira', short: 'Sex' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

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

  const toggleDay = async (day: keyof ScheduleConfig['workDays']) => {
    if (!config) return;
    const updated: ScheduleConfig = {
      ...config,
      workDays: { ...config.workDays, [day]: !config.workDays[day] },
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
  };

  const addBlockedDate = async () => {
    if (!config || !newBlockedDate) return;
    if (config.blockedDates.includes(newBlockedDate)) return;
    const updated: ScheduleConfig = {
      ...config,
      blockedDates: [...config.blockedDates, newBlockedDate].sort(),
    };
    setConfig(updated);
    setNewBlockedDate('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
  };

  const removeBlockedDate = async (date: string) => {
    if (!config) return;
    const updated: ScheduleConfig = {
      ...config,
      blockedDates: config.blockedDates.filter(d => d !== date),
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
  };

  const [newSlotTime, setNewSlotTime] = useState('');

  const formatTimeToAmPm = (time24: string) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // '0' should be '12'
    return `${h}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const addCustomSlot = async () => {
    if (!config || !newSlotTime) return;
    const formatted = formatTimeToAmPm(newSlotTime);
    const current = config.customSlots || generateTimeSlots(config);
    if (current.includes(formatted)) return;
    
    const updated: ScheduleConfig = {
      ...config,
      customSlots: [...current, formatted],
    };
    setConfig(updated);
    setNewSlotTime('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
  };

  const removeCustomSlot = async (slotToRemove: string) => {
    if (!config) return;
    const current = config.customSlots || generateTimeSlots(config);
    const updated: ScheduleConfig = {
      ...config,
      customSlots: current.filter(s => s !== slotToRemove),
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
  };

  const restoreDefaultSlots = async () => {
    if (!config) return;
    const defaults = [
      '8:00 AM',
      '9:00 AM',
      '10:00 AM',
      '11:00 AM',
      '12:00 PM',
      '1:00 PM',
      '2:00 PM',
      '3:00 PM',
      '4:00 PM',
    ];
    const updated: ScheduleConfig = {
      ...config,
      customSlots: defaults,
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await updateScheduleConfig(updated);
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

  const activeSlots = config.customSlots || generateTimeSlots(config);

  return (
    <div className="schedule">
      {/* Header */}
      <div className="schedule__header">
        <div>
          <h1 className="schedule__title">Configurações de Agenda</h1>
          <p className="schedule__subtitle">Gerencie sua disponibilidade, dias e horários de agendamento</p>
        </div>
        <div className="schedule__header-actions">
          <button className="schedule__refresh" onClick={fetchConfig} aria-label="Atualizar">
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
                Salvando...
              </>
            ) : saved ? (
              <>
                <CheckCircle size={16} />
                Salvo!
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Alterações
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
            Dias de Atendimento
          </h2>
          <p className="schedule__card-desc">
            Ative ou desative os dias em que você aceita agendamentos.
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

        {/* Custom Time Slots Manager */}
        <div className="schedule__card">
          <h2 className="schedule__card-title">
            <Clock size={20} />
            Horários Disponíveis ({activeSlots.length})
          </h2>
          <p className="schedule__card-desc">
            Adicione ou remova os horários exatos que aparecem para os clientes agendarem.
          </p>

          <div className="schedule__slot-add-bar">
            <input
              type="time"
              className="schedule__input"
              value={newSlotTime}
              onChange={e => setNewSlotTime(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={addCustomSlot}
              disabled={!newSlotTime}
            >
              <Plus size={14} />
              Adicionar Horário
            </button>
          </div>

          <div className="schedule__slots-manage-list">
            {activeSlots.map(slot => (
              <div key={slot} className="schedule__slot-manage-chip">
                <span>{slot}</span>
                <button
                  type="button"
                  className="schedule__slot-remove-btn"
                  onClick={() => removeCustomSlot(slot)}
                  title={`Remover horário ${slot}`}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="schedule__slot-footer">
            <button
              type="button"
              className="btn btn-outline-gold btn-sm"
              onClick={restoreDefaultSlots}
            >
              <RefreshCw size={13} />
              Restaurar Horários Padrão
            </button>
          </div>
        </div>

        {/* Blocked Dates */}
        <div className="schedule__card schedule__card--full">
          <h2 className="schedule__card-title">
            <CalendarOff size={20} />
            Datas Bloqueadas / Folgas
          </h2>
          <p className="schedule__card-desc">
            Bloqueie datas específicas para férias, feriados ou indisponibilidade.
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
              Bloquear Data
            </button>
          </div>

          {config.blockedDates.length > 0 ? (
            <div className="schedule__blocked-list">
              {config.blockedDates.map(date => (
                <div key={date} className="schedule__blocked-item">
                  <CalendarOff size={14} />
                  <span>
                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <button
                    className="schedule__blocked-remove"
                    onClick={() => removeBlockedDate(date)}
                    aria-label="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="schedule__no-blocked">Nenhuma data bloqueada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
