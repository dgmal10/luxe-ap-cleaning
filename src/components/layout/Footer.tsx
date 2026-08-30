import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Lock } from 'lucide-react';
import { NAV_ITEMS, BUSINESS } from '../../lib/constants';
import { useScrollTo } from '../../hooks/useUtils';
import './Footer.css';

export default function Footer() {
  const scrollTo = useScrollTo();

  return (
    <footer className="footer" id="footer">
      <div className="container">
        {/* Top section */}
        <div className="footer__top">
          <div className="footer__brand">
            <img
              src="/img/logo.jpg"
              alt="LUXE A&P Cleaning"
              className="footer__logo"
            />
            <p className="footer__desc">
              Premium residential cleaning services with meticulous attention to detail.
              Dedicated to making your home shine with elegance and care.
            </p>
          </div>

          <div className="footer__links">
            <h4 className="footer__heading">Quick Links</h4>
            {NAV_ITEMS.map(item => (
              <button key={item.href} className="footer__link" onClick={() => scrollTo(item.href)}>
                {item.label}
              </button>
            ))}
            <Link to="/manage-booking" className="footer__link footer__link--privacy">
              Manage Appointment
            </Link>
            <Link to="/privacy-policy" className="footer__link footer__link--privacy">
              Privacy Policy
            </Link>
          </div>

          <div className="footer__contact">
            <h4 className="footer__heading">Contact</h4>
            <div className="footer__contact-item">
              <Phone size={16} />
              <span>{BUSINESS.phone}</span>
            </div>
            <div className="footer__contact-item">
              <Mail size={16} />
              <span>{BUSINESS.email}</span>
            </div>
            <div className="footer__contact-item">
              <MapPin size={16} />
              <span>{BUSINESS.city}, {BUSINESS.state}</span>
            </div>
          </div>

          <div className="footer__trust">
            <h4 className="footer__heading">Our Promise</h4>
            <div className="footer__badges">
              <span className="footer__badge">✓ 100% Satisfaction</span>
              <span className="footer__badge">✓ Eco-Friendly Products</span>
              <span className="footer__badge">✓ Detailed & Reliable</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="footer__divider" />

        {/* Bottom */}
        <div className="footer__bottom">
          <div className="footer__bottom-left">
            <p className="footer__copy">
              © {new Date().getFullYear()} LUXE A&amp;P Cleaning. All rights reserved.
            </p>
            <span className="footer__dot">•</span>
            <Link to="/privacy-policy" className="footer__privacy-link">
              Privacy Policy
            </Link>
          </div>
          <div className="footer__bottom-right">
            <p className="footer__sub">
              Designed &amp; Developed by Diego Araújo
            </p>
            <Link to="/admin" className="footer__admin-badge" title="Painel Administrativo">
              <Lock size={12} />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
