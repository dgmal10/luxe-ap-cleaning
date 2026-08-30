import { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Home, Hammer, ArrowRight } from 'lucide-react';
import { SERVICES, BASE_PRICING } from '../../lib/constants';
import { getPricingConfig } from '../../lib/firestore';
import { useRevealOnScroll, useScrollTo } from '../../hooks/useUtils';
import './Services.css';

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={28} />,
  'shield-check': <ShieldCheck size={28} />,
  home: <Home size={28} />,
  hammer: <Hammer size={28} />,
};

export default function Services() {
  const ref = useRevealOnScroll();
  const scrollTo = useScrollTo();
  const [pricing, setPricing] = useState<Record<string, number>>(BASE_PRICING);

  useEffect(() => {
    getPricingConfig()
      .then(cfg => {
        if (cfg?.basePrices) {
          setPricing(cfg.basePrices);
        }
      })
      .catch(() => { /* use default */ });
  }, []);

  return (
    <section className="services section section-dark" id="services">
      <div className="container" ref={ref}>
        <div className="section-header reveal">
          <span className="section-label">Our Services</span>
          <h2 className="section-title">What We Offer</h2>
          <hr className="gold-line" />
          <p className="section-subtitle">
            From routine maintenance to specialized deep cleaning — every service
            is delivered with the same uncompromising standard of excellence.
          </p>
        </div>

        <div className="services__grid">
          {SERVICES.map((service, i) => {
            const basePrice = pricing[service.id] || BASE_PRICING[service.id] || 140;
            return (
              <div
                key={service.id}
                className={`services__card reveal delay-${i + 1}`}
              >
                <div className="services__card-header-row">
                  <div className="services__card-icon">
                    {ICON_MAP[service.icon]}
                  </div>
                  <span className="services__card-price">
                    From <strong>${basePrice}</strong>
                  </span>
                </div>

                <h3 className="services__card-title">{service.name}</h3>
                <p className="services__card-desc">{service.description}</p>

                <ul className="services__card-features">
                  {service.features.map(f => (
                    <li key={f} className="services__card-feature">
                      <span className="services__card-check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="services__card-footer">
                  <button
                    className="btn btn-outline-gold btn-sm"
                    onClick={() => scrollTo('booking')}
                  >
                    Book This
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
