import { Shield, Award, Heart, Clock } from 'lucide-react';
import { useRevealOnScroll } from '../../hooks/useUtils';
import './About.css';

const TRUST_ITEMS = [
  { icon: Shield, label: '100% Guaranteed', desc: 'Your complete satisfaction is our priority' },
  { icon: Award, label: 'Premium Quality', desc: 'Meticulous attention to every detail' },
  { icon: Heart, label: 'Trusted by Hundreds', desc: '5-star rated by our clients' },
  { icon: Clock, label: 'Reliable & Punctual', desc: 'Always on time, every time' },
];

export default function About() {
  const ref = useRevealOnScroll();

  return (
    <section className="about section section-light" id="about">
      <div className="container">
        <div className="about__grid" ref={ref}>
          {/* Image side */}
          <div className="about__image-wrapper reveal">
            <div className="about__image-frame">
              <img
                src="/img/dona.png"
                alt="Ana Paula — Owner of LUXE A&P Cleaning"
                className="about__image"
              />
              <div className="about__image-accent" />
            </div>
            <div className="about__experience">
              <span className="about__experience-number">5+</span>
              <span className="about__experience-text">Years of<br />Experience</span>
            </div>
          </div>

          {/* Text side */}
          <div className="about__content">
            <span className="section-label" style={{ color: 'var(--color-gold-dark)' }}>About Us</span>
            <h2 className="section-title" style={{ color: 'var(--color-black)' }}>
              A Passion for
              <br />
              <em>Pristine Spaces</em>
            </h2>
            <hr className="gold-line" style={{ margin: 'var(--space-4) 0' }} />

            <p className="about__text">
              Hi, I'm Ana Paula — the founder of LUXE A&amp;P Cleaning. I started this
              business with a simple belief: everyone deserves to come home to a
              space that feels truly clean, fresh, and welcoming.
            </p>
            <p className="about__text">
              What sets us apart is our commitment to quality over quantity. Every
              home we service receives the same meticulous care and attention to
              detail — from baseboards to ceiling fans, no corner is overlooked.
            </p>
            <p className="about__text">
              We use professional-grade, eco-friendly products that are safe for
              your family and pets. Your trust is everything to us, which is why
              we treat every home with the highest level of care, respect, and dedication.
            </p>

            <div className="about__trust-grid">
              {TRUST_ITEMS.map(item => (
                <div key={item.label} className="about__trust-item">
                  <div className="about__trust-icon">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <strong className="about__trust-label">{item.label}</strong>
                    <span className="about__trust-desc">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
