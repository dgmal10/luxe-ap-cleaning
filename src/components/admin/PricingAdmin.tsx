/**
 * PricingAdmin — manage base service rates, room multipliers, and add-on prices.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  Tag,
  BedDouble,
  Bath,
} from 'lucide-react';
import { getPricingConfig, updatePricingConfig, DEFAULT_PRICING } from '../../lib/firestore';
import type { PricingConfig } from '../../types';
import './PricingAdmin.css';

const SERVICE_NAMES: Record<string, { name: string; desc: string }> = {
  'standard': { name: 'Standard Cleaning', desc: 'Manutenção regular e periódica' },
  'deep': { name: 'Deep Cleaning', desc: 'Limpeza pesada completa e detalhada' },
  'move': { name: 'Move In / Move Out', desc: 'Entrada ou saída de imóveis / Vistoria' },
  'post-construction': { name: 'Post-Construction', desc: 'Pós-obra, poeira pesada e resíduos' },
};

export default function PricingAdmin() {
  const [config, setConfig] = useState<PricingConfig>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');
  const [newExtraDesc, setNewExtraDesc] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPricingConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch pricing config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updatePricingConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save pricing config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBasePriceChange = async (serviceKey: string, val: string) => {
    const num = Number(val) || 0;
    const updated: PricingConfig = {
      ...config,
      basePrices: {
        ...config.basePrices,
        [serviceKey]: num,
      },
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await updatePricingConfig(updated);
  };

  const handleRoomPriceChange = async (field: 'pricePerBedroom' | 'pricePerBathroom', val: string) => {
    const num = Number(val) || 0;
    const updated: PricingConfig = {
      ...config,
      [field]: num,
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await updatePricingConfig(updated);
  };

  const handleExtraPriceChange = async (extraId: string, val: string) => {
    const num = Number(val) || 0;
    const updated: PricingConfig = {
      ...config,
      extras: config.extras.map(e => (e.id === extraId ? { ...e, price: num } : e)),
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await updatePricingConfig(updated);
  };

  const handleAddExtra = async () => {
    if (!newExtraName.trim() || !newExtraPrice) return;
    const newId = newExtraName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newExtra = {
      id: newId,
      name: newExtraName.trim(),
      price: Number(newExtraPrice) || 30,
      description: newExtraDesc.trim() || 'Serviço adicional sob demanda',
    };
    const updated: PricingConfig = {
      ...config,
      extras: [...config.extras, newExtra],
    };
    setConfig(updated);
    setNewExtraName('');
    setNewExtraPrice('');
    setNewExtraDesc('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await updatePricingConfig(updated);
  };

  const handleRemoveExtra = async (extraId: string) => {
    const updated: PricingConfig = {
      ...config,
      extras: config.extras.filter(e => e.id !== extraId),
    };
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await updatePricingConfig(updated);
  };

  const handleRestoreDefaults = async () => {
    if (confirm('Deseja restaurar todos os valores para o padrão original?')) {
      setConfig(DEFAULT_PRICING);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await updatePricingConfig(DEFAULT_PRICING);
    }
  };

  // Live Simulator state for testing room pricing combinations
  const [simService, setSimService] = useState('deep');
  const [simBeds, setSimBeds] = useState(2);
  const [simBaths, setSimBaths] = useState(2);
  const [simExtras, setSimExtras] = useState<string[]>([]);

  const simBase = config.basePrices?.[simService] ?? DEFAULT_PRICING.basePrices[simService] ?? 150;
  const simBedAdd = Math.max(0, simBeds - 1) * (config.pricePerBedroom ?? 25);
  const simBathAdd = Math.max(0, simBaths - 1) * (config.pricePerBathroom ?? 30);
  const simExtrasTotal = simExtras.reduce((sum, eId) => {
    const ex = config.extras.find(e => e.id === eId);
    return sum + (ex ? ex.price : 0);
  }, 0);
  const simTotal = simBase + simBedAdd + simBathAdd + simExtrasTotal;

  if (loading) {
    return (
      <div className="pricing-admin">
        <div className="pricing-admin__loading">
          <div className="spinner" style={{ color: 'var(--color-gold)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-admin">
      {/* Header */}
      <div className="pricing-admin__header">
        <div>
          <h1 className="pricing-admin__title">Preços e Serviços</h1>
          <p className="pricing-admin__subtitle">
            Configure os valores base que aparecem no site e na calculadora de agendamentos
          </p>
        </div>
        <div className="pricing-admin__header-actions">
          <button className="pricing-admin__refresh" onClick={fetchConfig} aria-label="Atualizar">
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
                Salvo com Sucesso!
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

      <div className="pricing-admin__grid">
        {/* Base Service Prices */}
        <div className="pricing-admin__card">
          <h2 className="pricing-admin__card-title">
            <Tag size={20} />
            Preços Base por Serviço (1 Quarto / 1 Banheiro)
          </h2>
          <p className="pricing-admin__card-desc">
            Estes valores aparecem no site como o valor inicial ("A partir de $...") e na calculadora.
          </p>

          <div className="pricing-admin__services-list">
            {Object.keys(SERVICE_NAMES).map(key => {
              const info = SERVICE_NAMES[key];
              const currentPrice = config.basePrices[key] ?? DEFAULT_PRICING.basePrices[key] ?? 150;
              return (
                <div key={key} className="pricing-admin__service-row">
                  <div className="pricing-admin__service-info">
                    <strong>{info.name}</strong>
                    <span>{info.desc}</span>
                  </div>
                  <div className="pricing-admin__input-group">
                    <span className="pricing-admin__currency">$</span>
                    <input
                      type="number"
                      className="pricing-admin__input"
                      value={currentPrice}
                      onChange={e => handleBasePriceChange(key, e.target.value)}
                      min="0"
                      step="5"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room multipliers */}
        <div className="pricing-admin__card">
          <h2 className="pricing-admin__card-title">
            <BedDouble size={20} />
            Acréscimo por Cômodos Extras
          </h2>
          <p className="pricing-admin__card-desc">
            Valor cobrado a mais por cada quarto ou banheiro acima de 1 no formulário.
          </p>

          <div className="pricing-admin__rooms-list">
            <div className="pricing-admin__room-row">
              <div className="pricing-admin__room-label">
                <BedDouble size={18} />
                <div>
                  <strong>Por Quarto Adicional (+1)</strong>
                  <span>Cobrado para 2, 3, 4 ou 5+ quartos</span>
                </div>
              </div>
              <div className="pricing-admin__input-group">
                <span className="pricing-admin__currency">$</span>
                <input
                  type="number"
                  className="pricing-admin__input"
                  value={config.pricePerBedroom}
                  onChange={e => handleRoomPriceChange('pricePerBedroom', e.target.value)}
                  min="0"
                  step="5"
                />
              </div>
            </div>

            <div className="pricing-admin__room-row">
              <div className="pricing-admin__room-label">
                <Bath size={18} />
                <div>
                  <strong>Por Banheiro Adicional (+1)</strong>
                  <span>Cobrado para 1.5, 2, 2.5, 3 ou 4+ banheiros</span>
                </div>
              </div>
              <div className="pricing-admin__input-group">
                <span className="pricing-admin__currency">$</span>
                <input
                  type="number"
                  className="pricing-admin__input"
                  value={config.pricePerBathroom}
                  onChange={e => handleRoomPriceChange('pricePerBathroom', e.target.value)}
                  min="0"
                  step="5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulator Card */}
        <div className="pricing-admin__card pricing-admin__card--full" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.06) 0%, rgba(20, 20, 20, 0.8) 100%)', borderColor: 'rgba(212, 175, 55, 0.3)' }}>
          <h2 className="pricing-admin__card-title">
            <Sparkles size={20} />
            Simulador de Orçamento (Sugestão de Base)
          </h2>
          <p className="pricing-admin__card-desc">
            Teste como o sistema calcula a sugestão de valor para cada imóvel com base nos cômodos e adicionais configurados acima. No Painel de Agendamentos, você sempre pode ajustar o valor final antes de enviar para o cliente.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', margin: 'var(--space-4) 0', padding: 'var(--space-4)', background: 'rgba(0,0,0,0.25)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: '4px' }}>Tipo de Serviço</label>
              <select
                className="pricing-admin__input"
                style={{ width: '100%', textAlign: 'left', padding: '6px 10px', height: '38px' }}
                value={simService}
                onChange={e => setSimService(e.target.value)}
              >
                {Object.keys(SERVICE_NAMES).map(k => (
                  <option key={k} value={k}>{SERVICE_NAMES[k].name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: '4px' }}>Quartos ({simBeds})</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map(b => (
                  <button
                    key={b}
                    type="button"
                    style={{ flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 600, background: simBeds === b ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)', color: simBeds === b ? '#000' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => setSimBeds(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: '4px' }}>Banheiros ({simBaths})</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4].map(b => (
                  <button
                    key={b}
                    type="button"
                    style={{ flex: 1, padding: '6px 0', fontSize: '12px', fontWeight: 600, background: simBaths === b ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)', color: simBaths === b ? '#000' : '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => setSimBaths(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'var(--color-gold-muted)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gold)', fontWeight: 600 }}>Sugestão Calculada</span>
              <strong style={{ fontSize: '28px', color: 'var(--color-gold)', fontFamily: 'var(--font-heading)' }}>${simTotal}</strong>
              <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
                (${simBase} base + ${simBedAdd} quartos + ${simBathAdd} banheiros{simExtrasTotal > 0 ? ` + $${simExtrasTotal} extras` : ''})
              </span>
            </div>
          </div>

          {/* Extras toggle in simulator */}
          {config.extras && config.extras.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginBottom: '6px' }}>Incluir Extras no Teste:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {config.extras.map(ex => {
                  const active = simExtras.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: active ? 'var(--color-gold)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#000' : 'var(--color-gray-300)',
                        border: `1px solid ${active ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSimExtras(prev => active ? prev.filter(id => id !== ex.id) : [...prev, ex.id]);
                      }}
                    >
                      {ex.name} (+${ex.price})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Extras / Add-ons */}
        <div className="pricing-admin__card pricing-admin__card--full">
          <h2 className="pricing-admin__card-title">
            <Sparkles size={20} />
            Serviços Extras / Opcionais (Add-ons)
          </h2>
          <p className="pricing-admin__card-desc">
            Itens adicionais que o cliente pode marcar no momento do agendamento (sem valores exibidos ao cliente).
          </p>

          <div className="pricing-admin__extras-table">
            <div className="pricing-admin__extras-grid">
              {config.extras.map(extra => (
                <div key={extra.id} className="pricing-admin__extra-item">
                  <div className="pricing-admin__extra-info">
                    <strong>{extra.name}</strong>
                    <span>{extra.description}</span>
                  </div>
                  <div className="pricing-admin__extra-right">
                    <div className="pricing-admin__input-group">
                      <span className="pricing-admin__currency">$</span>
                      <input
                        type="number"
                        className="pricing-admin__input"
                        value={extra.price}
                        onChange={e => handleExtraPriceChange(extra.id, e.target.value)}
                        min="0"
                        step="5"
                      />
                    </div>
                    <button
                      type="button"
                      className="pricing-admin__btn-remove"
                      onClick={() => handleRemoveExtra(extra.id)}
                      title="Remover este extra"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Extra Form */}
          <div className="pricing-admin__new-extra">
            <h3 className="pricing-admin__subheading">
              <Plus size={16} />
              Adicionar Novo Serviço Extra
            </h3>
            <div className="pricing-admin__new-extra-grid">
              <input
                type="text"
                placeholder="Nome do Extra (ex: Interior de Geladeira)"
                className="pricing-admin__text-input"
                value={newExtraName}
                onChange={e => setNewExtraName(e.target.value)}
              />
              <div className="pricing-admin__input-group">
                <span className="pricing-admin__currency">$</span>
                <input
                  type="number"
                  placeholder="Valor ($)"
                  className="pricing-admin__input"
                  value={newExtraPrice}
                  onChange={e => setNewExtraPrice(e.target.value)}
                  min="0"
                  step="5"
                />
              </div>
              <input
                type="text"
                placeholder="Descrição curta (opcional)"
                className="pricing-admin__text-input"
                value={newExtraDesc}
                onChange={e => setNewExtraDesc(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddExtra}
                disabled={!newExtraName.trim() || !newExtraPrice}
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pricing-admin__footer">
            <button
              type="button"
              className="btn btn-outline-gold btn-sm"
              onClick={handleRestoreDefaults}
            >
              <RefreshCw size={13} />
              Restaurar Valores Padrão
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
