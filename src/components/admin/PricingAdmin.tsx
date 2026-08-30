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

  const handleBasePriceChange = (serviceKey: string, val: string) => {
    const num = Number(val) || 0;
    setConfig(prev => ({
      ...prev,
      basePrices: {
        ...prev.basePrices,
        [serviceKey]: num,
      },
    }));
    setSaved(false);
  };

  const handleExtraPriceChange = (extraId: string, val: string) => {
    const num = Number(val) || 0;
    setConfig(prev => ({
      ...prev,
      extras: prev.extras.map(e => (e.id === extraId ? { ...e, price: num } : e)),
    }));
    setSaved(false);
  };

  const handleAddExtra = () => {
    if (!newExtraName.trim() || !newExtraPrice) return;
    const newId = newExtraName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newExtra = {
      id: newId,
      name: newExtraName.trim(),
      price: Number(newExtraPrice) || 30,
      description: newExtraDesc.trim() || 'Serviço adicional sob demanda',
    };
    setConfig(prev => ({
      ...prev,
      extras: [...prev.extras, newExtra],
    }));
    setNewExtraName('');
    setNewExtraPrice('');
    setNewExtraDesc('');
    setSaved(false);
  };

  const handleRemoveExtra = (extraId: string) => {
    setConfig(prev => ({
      ...prev,
      extras: prev.extras.filter(e => e.id !== extraId),
    }));
    setSaved(false);
  };

  const handleRestoreDefaults = () => {
    if (confirm('Deseja restaurar todos os valores para o padrão original?')) {
      setConfig(DEFAULT_PRICING);
      setSaved(false);
    }
  };

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
                  onChange={e => {
                    setConfig({ ...config, pricePerBedroom: Number(e.target.value) || 0 });
                    setSaved(false);
                  }}
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
                  onChange={e => {
                    setConfig({ ...config, pricePerBathroom: Number(e.target.value) || 0 });
                    setSaved(false);
                  }}
                  min="0"
                  step="5"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extras / Add-ons */}
        <div className="pricing-admin__card pricing-admin__card--full">
          <h2 className="pricing-admin__card-title">
            <Sparkles size={20} />
            Serviços Extras / Opcionais (Add-ons)
          </h2>
          <p className="pricing-admin__card-desc">
            Itens adicionais que o cliente pode marcar no momento do agendamento.
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
