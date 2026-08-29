import { ArrowRight, Sparkles } from 'lucide-react';
import { useScrollTo } from '../../hooks/useUtils';
import './Hero.css';

export default function Hero() {
  const scrollTo = useScrollTo();

  return (
    <section className="hero" id="hero">
      {/* Background layers */}
      <div className="hero__bg">
        <img src="/img/hero-bg.png" alt="" className="hero__bg-img" aria-hidden="true" />
        <div className="hero__overlay" />
      </div>

      {/* Content */}
      <div className="container hero__content">
        <div className="hero__badge animate-fade-in-up">
          <Sparkles size={14} />
          <span>Licensed & Insured</span>
        </div>

        <h1 className="hero__title animate-fade-in-up delay-1">
          LUXE A&amp;P
          <br />
          <span className="hero__title-accent">Cleaning</span>
        </h1>

        <p className="hero__tagline animate-fade-in-up delay-2">
          Premium Residential Services
        </p>

        <p className="hero__subtitle animate-fade-in-up delay-2">
          Meticulous attention to detail. Impeccable results.
          <br />
          Your home deserves the luxury treatment.
        </p>

        <div className="hero__actions animate-fade-in-up delay-3">
          <button className="btn btn-primary btn-lg" onClick={() => scrollTo('booking')}>
            Book Your Cleaning
            <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => scrollTo('services')}>
            Our Services
          </button>
        </div>

        {/* Stats bar */}
        <div className="hero__stats animate-fade-in-up delay-5">
          <div className="hero__stat">
            <span className="hero__stat-number">500+</span>
            <span className="hero__stat-label">Homes Cleaned</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">5.0</span>
            <span className="hero__stat-label">Average Rating</span>
          </div>
          <div className="hero__stat-divider" />
          <div className="hero__stat">
            <span className="hero__stat-number">100%</span>
            <span className="hero__stat-label">Satisfaction</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hero__scroll">
        <div className="hero__scroll-line" />
      </div>
    </section>
  );
}
