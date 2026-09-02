import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PieChart,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import type { Booking } from '../../types';
import './RevenueStats.css';

interface RevenueStatsProps {
  bookings: Booking[];
}

/** Formata número como moeda em Dólares ($ 1,250.00) */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Retorna o preço real ou estimado de um agendamento */
function getBookingAmount(booking: Booking, includeEstimates: boolean): number {
  if (booking.status === 'cancelled') return 0;
  
  if (booking.finalPrice !== undefined && booking.finalPrice > 0) {
    return booking.finalPrice;
  }
  
  if (includeEstimates && booking.estimatedPrice !== undefined && booking.estimatedPrice > 0) {
    return booking.estimatedPrice;
  }
  
  // Se confirmado/concluído mas sem finalPrice, usa estimatedPrice como fallback
  if ((booking.status === 'confirmed' || booking.status === 'completed') && booking.estimatedPrice) {
    return booking.estimatedPrice;
  }

  return 0;
}

/** Retorna o início e fim da semana (Segunda a Domingo) de uma determinada data */
function getWeekRange(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  // Ajuste para Segunda = início da semana (0=Dom -> 6 dias atrás, 1=Seg -> 0 dias)
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(date.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function dateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const RevenueStats: React.FC<RevenueStatsProps> = ({ bookings }) => {
  const [includePending, setIncludePending] = useState(false);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = mês atual, -1 = mês anterior, etc.
  const [viewMode, setViewMode] = useState<'bars' | 'services'>('bars');

  // Mês selecionado para visualização detalhada
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); // evitar pulos em meses com menos dias
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const currentYear = targetDate.getFullYear();
  const currentMonthIdx = targetDate.getMonth();
  const currentMonthPrefix = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  // Semana Atual Real (Hoje)
  const today = useMemo(() => new Date(), []);
  const { monday: curWeekMon, sunday: curWeekSun } = useMemo(() => getWeekRange(today), [today]);
  const curWeekMonStr = dateToYMD(curWeekMon);
  const curWeekSunStr = dateToYMD(curWeekSun);

  // Semana Passada Real
  const prevWeekMon = useMemo(() => {
    const d = new Date(curWeekMon);
    d.setDate(d.getDate() - 7);
    return d;
  }, [curWeekMon]);
  const prevWeekSun = useMemo(() => {
    const d = new Date(curWeekSun);
    d.setDate(d.getDate() - 7);
    return d;
  }, [curWeekSun]);
  const prevWeekMonStr = dateToYMD(prevWeekMon);
  const prevWeekSunStr = dateToYMD(prevWeekSun);

  // Mês Atual Real (Hoje)
  const thisMonthRealPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // Mês Passado Real
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthRealPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Métricas Calculadas
  const stats = useMemo(() => {
    // 1. Semana Atual
    let weeklyConfirmedRevenue = 0;
    let weeklyProjectedRevenue = 0;
    let weeklyConfirmedCount = 0;

    // 2. Semana Passada
    let prevWeekConfirmedRevenue = 0;

    // 3. Mês Atual Real
    let thisMonthConfirmedRevenue = 0;
    let thisMonthProjectedRevenue = 0;
    let thisMonthConfirmedCount = 0;

    // 4. Mês Passado Real
    let prevMonthConfirmedRevenue = 0;

    // 5. Mês Selecionado (no seletor interativo)
    let selectedMonthConfirmedRevenue = 0;
    let selectedMonthProjectedRevenue = 0;
    let selectedMonthConfirmedCount = 0;
    let selectedMonthTotalCount = 0;

    // 6. Projeção Geral em Aberto (Todos os orçamentos pendentes/enviados)
    let totalPendingRevenue = 0;
    let totalPendingCount = 0;

    // 7. Faturamento Total Histórico (Confirmado + Concluído)
    let totalHistoricalRevenue = 0;
    let totalHistoricalCount = 0;

    // Distribuição por semanas do mês selecionado (Semanas 1 a 5)
    const weeksInSelectedMonth: { label: string; range: string; confirmed: number; projected: number; count: number }[] = [
      { label: 'Semana 1 (1-7)', range: '01 a 07', confirmed: 0, projected: 0, count: 0 },
      { label: 'Semana 2 (8-14)', range: '08 a 14', confirmed: 0, projected: 0, count: 0 },
      { label: 'Semana 3 (15-21)', range: '15 a 21', confirmed: 0, projected: 0, count: 0 },
      { label: 'Semana 4 (22-28)', range: '22 a 28', confirmed: 0, projected: 0, count: 0 },
      { label: 'Semana 5 (29+)', range: '29 ao fim', confirmed: 0, projected: 0, count: 0 },
    ];

    // Distribuição por serviço no mês selecionado
    const serviceRevenueMap: Record<string, { confirmed: number; count: number }> = {};

    bookings.forEach(b => {
      if (b.status === 'cancelled') return;

      const valConfirmed = (b.status === 'confirmed' || b.status === 'completed')
        ? getBookingAmount(b, false)
        : 0;

      const valProjected = (b.status === 'pending' || b.status === 'quote_sent')
        ? (b.finalPrice || b.estimatedPrice || 0)
        : 0;

      const isConfirmed = b.status === 'confirmed' || b.status === 'completed';
      const isPending = b.status === 'pending' || b.status === 'quote_sent';

      // Histórico geral
      if (isConfirmed) {
        totalHistoricalRevenue += valConfirmed;
        totalHistoricalCount += 1;
      }
      if (isPending) {
        totalPendingRevenue += valProjected;
        totalPendingCount += 1;
      }

      // Semana Atual
      if (b.date >= curWeekMonStr && b.date <= curWeekSunStr) {
        if (isConfirmed) {
          weeklyConfirmedRevenue += valConfirmed;
          weeklyConfirmedCount += 1;
        }
        if (isPending) {
          weeklyProjectedRevenue += valProjected;
        }
      }

      // Semana Passada
      if (b.date >= prevWeekMonStr && b.date <= prevWeekSunStr) {
        if (isConfirmed) {
          prevWeekConfirmedRevenue += valConfirmed;
        }
      }

      // Mês Atual Real
      if (b.date.startsWith(thisMonthRealPrefix)) {
        if (isConfirmed) {
          thisMonthConfirmedRevenue += valConfirmed;
          thisMonthConfirmedCount += 1;
        }
        if (isPending) {
          thisMonthProjectedRevenue += valProjected;
        }
      }

      // Mês Passado Real
      if (b.date.startsWith(prevMonthRealPrefix)) {
        if (isConfirmed) {
          prevMonthConfirmedRevenue += valConfirmed;
        }
      }

      // Mês Selecionado (Interativo)
      if (b.date.startsWith(currentMonthPrefix)) {
        selectedMonthTotalCount += 1;
        if (isConfirmed) {
          selectedMonthConfirmedRevenue += valConfirmed;
          selectedMonthConfirmedCount += 1;
        }
        if (isPending) {
          selectedMonthProjectedRevenue += valProjected;
        }

        // Determinar semana do mês (1 a 5)
        const dayOfMonth = parseInt(b.date.split('-')[2], 10) || 1;
        const weekIdx = Math.min(Math.floor((dayOfMonth - 1) / 7), 4);
        if (weeksInSelectedMonth[weekIdx]) {
          if (isConfirmed) {
            weeksInSelectedMonth[weekIdx].confirmed += valConfirmed;
            weeksInSelectedMonth[weekIdx].count += 1;
          }
          if (isPending) {
            weeksInSelectedMonth[weekIdx].projected += valProjected;
          }
        }

        // Agrupar por serviço
        const sName = b.service || 'Limpeza Residencial';
        if (!serviceRevenueMap[sName]) {
          serviceRevenueMap[sName] = { confirmed: 0, count: 0 };
        }
        if (isConfirmed) {
          serviceRevenueMap[sName].confirmed += valConfirmed;
          serviceRevenueMap[sName].count += 1;
        } else if (includePending && isPending) {
          serviceRevenueMap[sName].confirmed += valProjected;
          serviceRevenueMap[sName].count += 1;
        }
      }
    });

    // Calcular percentuais de crescimento
    const weeklyGrowth = prevWeekConfirmedRevenue > 0
      ? Math.round(((weeklyConfirmedRevenue - prevWeekConfirmedRevenue) / prevWeekConfirmedRevenue) * 100)
      : null;

    const monthlyGrowth = prevMonthConfirmedRevenue > 0
      ? Math.round(((thisMonthConfirmedRevenue - prevMonthConfirmedRevenue) / prevMonthConfirmedRevenue) * 100)
      : null;

    const avgTicketMonthly = selectedMonthConfirmedCount > 0
      ? Math.round(selectedMonthConfirmedRevenue / selectedMonthConfirmedCount)
      : 0;

    return {
      weeklyConfirmedRevenue,
      weeklyProjectedRevenue,
      weeklyConfirmedCount,
      weeklyGrowth,
      thisMonthConfirmedRevenue,
      thisMonthProjectedRevenue,
      thisMonthConfirmedCount,
      monthlyGrowth,
      selectedMonthConfirmedRevenue,
      selectedMonthProjectedRevenue,
      selectedMonthConfirmedCount,
      selectedMonthTotalCount,
      avgTicketMonthly,
      totalPendingRevenue,
      totalPendingCount,
      totalHistoricalRevenue,
      totalHistoricalCount,
      weeksInSelectedMonth,
      serviceRevenueList: Object.entries(serviceRevenueMap).map(([name, data]) => ({
        name,
        revenue: data.confirmed,
        count: data.count,
      })).sort((a, b) => b.revenue - a.revenue),
    };
  }, [
    bookings,
    curWeekMonStr,
    curWeekSunStr,
    prevWeekMonStr,
    prevWeekSunStr,
    thisMonthRealPrefix,
    prevMonthRealPrefix,
    currentMonthPrefix,
    includePending,
  ]);

  // Encontrar valor máximo para escala do gráfico de barras
  const maxBarValue = useMemo(() => {
    let max = 100;
    stats.weeksInSelectedMonth.forEach(w => {
      const val = includePending ? (w.confirmed + w.projected) : w.confirmed;
      if (val > max) max = val;
    });
    return max;
  }, [stats.weeksInSelectedMonth, includePending]);

  return (
    <section className="revenue-section animate-fade-in" aria-label="Faturamento Financeiro">
      {/* Header do Faturamento com Controles */}
      <div className="revenue-section__header">
        <div className="revenue-section__title-group">
          <div className="revenue-section__icon-badge">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="revenue-section__title">Faturamento & Desempenho Financeiro</h2>
            <p className="revenue-section__subtitle">
              Acompanhe a receita semanal, mensal e orçamentos em negociação
            </p>
          </div>
        </div>

        <div className="revenue-section__actions">
          {/* Toggle para incluir estimativas / pendentes */}
          <button
            type="button"
            className={`revenue-toggle-btn ${includePending ? 'revenue-toggle-btn--active' : ''}`}
            onClick={() => setIncludePending(!includePending)}
            title="Alternar entre apenas confirmado e projeção total"
          >
            <Sparkles size={14} />
            <span>{includePending ? 'Exibindo: Faturamento + Projeção' : 'Exibindo: Apenas Confirmados'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Cartões de Faturamento (Semanal, Mensal, Projeção, Total) */}
      <div className="revenue-cards-grid">
        {/* 1. FATURAMENTO SEMANAL */}
        <div className="revenue-card revenue-card--gold">
          <div className="revenue-card__header">
            <span className="revenue-card__tag">Esta Semana</span>
            <div className="revenue-card__icon">
              <TrendingUp size={18} />
            </div>
          </div>

          <div className="revenue-card__body">
            <div className="revenue-card__amount">
              {formatCurrency(includePending ? (stats.weeklyConfirmedRevenue + stats.weeklyProjectedRevenue) : stats.weeklyConfirmedRevenue)}
            </div>
            
            <div className="revenue-card__details">
              <span className="revenue-card__count">
                <CheckCircle2 size={13} />
                <strong>{stats.weeklyConfirmedCount}</strong> {stats.weeklyConfirmedCount === 1 ? 'limpeza confirmada' : 'limpezas confirmadas'}
              </span>

              {includePending && stats.weeklyProjectedRevenue > 0 && (
                <span className="revenue-card__pending-hint">
                  + {formatCurrency(stats.weeklyProjectedRevenue)} pendente
                </span>
              )}

              {stats.weeklyGrowth !== null && !includePending && (
                <span className={`revenue-card__growth ${stats.weeklyGrowth >= 0 ? 'growth--positive' : 'growth--negative'}`}>
                  <ArrowUpRight size={13} style={{ transform: stats.weeklyGrowth < 0 ? 'rotate(90deg)' : 'none' }} />
                  {stats.weeklyGrowth >= 0 ? `+${stats.weeklyGrowth}%` : `${stats.weeklyGrowth}%`} vs sem. anterior
                </span>
              )}
            </div>
          </div>
          
          <div className="revenue-card__footer">
            <span>Período: Seg a Dom ({curWeekMon.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {curWeekSun.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
          </div>
        </div>

        {/* 2. FATURAMENTO MENSAL */}
        <div className="revenue-card revenue-card--primary">
          <div className="revenue-card__header">
            <span className="revenue-card__tag">Este Mês ({MONTH_NAMES[today.getMonth()]})</span>
            <div className="revenue-card__icon">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="revenue-card__body">
            <div className="revenue-card__amount">
              {formatCurrency(includePending ? (stats.thisMonthConfirmedRevenue + stats.thisMonthProjectedRevenue) : stats.thisMonthConfirmedRevenue)}
            </div>

            <div className="revenue-card__details">
              <span className="revenue-card__count">
                <CheckCircle2 size={13} />
                <strong>{stats.thisMonthConfirmedCount}</strong> {stats.thisMonthConfirmedCount === 1 ? 'serviço no mês' : 'serviços no mês'}
              </span>

              {includePending && stats.thisMonthProjectedRevenue > 0 && (
                <span className="revenue-card__pending-hint">
                  + {formatCurrency(stats.thisMonthProjectedRevenue)} em cotação
                </span>
              )}

              {stats.monthlyGrowth !== null && !includePending && (
                <span className={`revenue-card__growth ${stats.monthlyGrowth >= 0 ? 'growth--positive' : 'growth--negative'}`}>
                  <ArrowUpRight size={13} style={{ transform: stats.monthlyGrowth < 0 ? 'rotate(90deg)' : 'none' }} />
                  {stats.monthlyGrowth >= 0 ? `+${stats.monthlyGrowth}%` : `${stats.monthlyGrowth}%`} vs mês anterior
                </span>
              )}
            </div>
          </div>

          <div className="revenue-card__footer">
            <span>Ticket Médio: <strong>{formatCurrency(stats.avgTicketMonthly)}</strong> por serviço</span>
          </div>
        </div>

        {/* 3. ORÇAMENTOS EM NEGOCIAÇÃO / PIPELINE */}
        <div className="revenue-card revenue-card--pending">
          <div className="revenue-card__header">
            <span className="revenue-card__tag">Aguardando / Pipeline</span>
            <div className="revenue-card__icon">
              <Clock size={18} />
            </div>
          </div>

          <div className="revenue-card__body">
            <div className="revenue-card__amount">
              {formatCurrency(stats.totalPendingRevenue)}
            </div>

            <div className="revenue-card__details">
              <span className="revenue-card__count">
                <strong>{stats.totalPendingCount}</strong> {stats.totalPendingCount === 1 ? 'proposta pendente' : 'propostas pendentes'}
              </span>
              <span className="revenue-card__hint-text">
                Orçamentos enviados e novos pedidos do site
              </span>
            </div>
          </div>

          <div className="revenue-card__footer">
            <span>Potencial de conversão imediata</span>
          </div>
        </div>

        {/* 4. TOTAL HISTÓRICO ACUMULADO */}
        <div className="revenue-card revenue-card--dark">
          <div className="revenue-card__header">
            <span className="revenue-card__tag">Total Geral Acumulado</span>
            <div className="revenue-card__icon">
              <BarChart3 size={18} />
            </div>
          </div>

          <div className="revenue-card__body">
            <div className="revenue-card__amount">
              {formatCurrency(stats.totalHistoricalRevenue)}
            </div>

            <div className="revenue-card__details">
              <span className="revenue-card__count">
                <strong>{stats.totalHistoricalCount}</strong> limpezas no histórico
              </span>
              <span className="revenue-card__hint-text">
                Receita confirmada desde o início
              </span>
            </div>
          </div>

          <div className="revenue-card__footer">
            <span>Todos os agendamentos aprovados</span>
          </div>
        </div>
      </div>

      {/* DETALHAMENTO MENSAL / GRÁFICO INTERATIVO */}
      <div className="revenue-details-box">
        <div className="revenue-details-box__header">
          <div className="revenue-month-selector">
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setSelectedMonthOffset(prev => prev - 1)}
              title="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="month-display">
              <Calendar size={15} />
              <span>{MONTH_NAMES[currentMonthIdx]} {currentYear}</span>
            </div>
            <button
              type="button"
              className="month-nav-btn"
              onClick={() => setSelectedMonthOffset(prev => prev + 1)}
              title="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
            {selectedMonthOffset !== 0 && (
              <button
                type="button"
                className="month-today-btn"
                onClick={() => setSelectedMonthOffset(0)}
              >
                Voltar ao Mês Atual
              </button>
            )}
          </div>

          {/* Abas de Visualização (Gráfico de Semanas vs Serviços) */}
          <div className="revenue-view-tabs">
            <button
              type="button"
              className={`revenue-view-tab ${viewMode === 'bars' ? 'revenue-view-tab--active' : ''}`}
              onClick={() => setViewMode('bars')}
            >
              <BarChart3 size={14} />
              Semanas do Mês
            </button>
            <button
              type="button"
              className={`revenue-view-tab ${viewMode === 'services' ? 'revenue-view-tab--active' : ''}`}
              onClick={() => setViewMode('services')}
            >
              <PieChart size={14} />
              Por Tipo de Serviço
            </button>
          </div>
        </div>

        {/* Conteúdo do Detalhamento */}
        <div className="revenue-details-content">
          {viewMode === 'bars' ? (
            /* Mini Gráfico de Barras por Semana */
            <div className="weekly-bars-container">
              <div className="weekly-bars-header">
                <span className="weekly-bars-title">
                  Distribuição de Faturamento por Semana de {MONTH_NAMES[currentMonthIdx]}
                </span>
                <span className="weekly-bars-total">
                  Total do Mês: <strong>{formatCurrency(includePending ? (stats.selectedMonthConfirmedRevenue + stats.selectedMonthProjectedRevenue) : stats.selectedMonthConfirmedRevenue)}</strong>
                </span>
              </div>

              <div className="weekly-bars-chart">
                {stats.weeksInSelectedMonth.map((week, idx) => {
                  const currentVal = includePending ? (week.confirmed + week.projected) : week.confirmed;
                  const heightPercent = maxBarValue > 0 ? Math.max(6, Math.round((currentVal / maxBarValue) * 100)) : 6;

                  return (
                    <div key={idx} className="weekly-bar-column">
                      <div className="weekly-bar-value">
                        {currentVal > 0 ? formatCurrency(currentVal) : '$0'}
                      </div>
                      <div className="weekly-bar-track">
                        <div
                          className={`weekly-bar-fill ${currentVal > 0 ? 'weekly-bar-fill--active' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {week.projected > 0 && includePending && (
                            <div
                              className="weekly-bar-fill--projected"
                              style={{ height: `${Math.round((week.projected / (week.confirmed + week.projected)) * 100)}%` }}
                              title={`Pendente: ${formatCurrency(week.projected)}`}
                            />
                          )}
                        </div>
                      </div>
                      <div className="weekly-bar-label">
                        <strong>Sem {idx + 1}</strong>
                        <span>({week.range})</span>
                      </div>
                      <div className="weekly-bar-count">
                        {week.count > 0 ? `${week.count} ${week.count === 1 ? 'serviço' : 'serviços'}` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Distribuição por Tipo de Serviço */
            <div className="services-breakdown-container">
              <div className="services-breakdown-header">
                <span className="services-breakdown-title">
                  Receita por Categoria de Serviço em {MONTH_NAMES[currentMonthIdx]}
                </span>
              </div>

              {stats.serviceRevenueList.length === 0 ? (
                <div className="services-breakdown-empty">
                  Nenhum faturamento registrado para este mês até o momento.
                </div>
              ) : (
                <div className="services-breakdown-list">
                  {stats.serviceRevenueList.map((srv, idx) => {
                    const totalMonth = includePending
                      ? (stats.selectedMonthConfirmedRevenue + stats.selectedMonthProjectedRevenue)
                      : stats.selectedMonthConfirmedRevenue;
                    const percent = totalMonth > 0 ? Math.round((srv.revenue / totalMonth) * 100) : 0;

                    return (
                      <div key={idx} className="service-breakdown-item">
                        <div className="service-breakdown-info">
                          <div className="service-breakdown-name-row">
                            <span className="service-breakdown-name">{srv.name}</span>
                            <span className="service-breakdown-count">({srv.count} {srv.count === 1 ? 'agendamento' : 'agendamentos'})</span>
                          </div>
                          <div className="service-breakdown-value-row">
                            <strong>{formatCurrency(srv.revenue)}</strong>
                            <span className="service-breakdown-percent">{percent}%</span>
                          </div>
                        </div>
                        <div className="service-breakdown-bar-track">
                          <div
                            className="service-breakdown-bar-fill"
                            style={{ width: `${Math.max(percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RevenueStats;
