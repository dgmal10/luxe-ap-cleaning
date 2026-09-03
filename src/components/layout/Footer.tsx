import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { NAV_ITEMS } from '../../lib/constants';
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
              src="/img/logo-transparent.png"
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
            <Link to="/manage-booking" className="footer__link">
              Manage Appointment
            </Link>
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
            <div className="footer__dev">
              <p className="footer__sub">Designed &amp; Developed by Diego Araújo</p>
              <div className="footer__dev-contacts">
                <a href="tel:+5533988813228" className="footer__dev-link">📞 +55 (33) 98881-3228</a>
                <a href="mailto:diego01araujo@gmail.com" className="footer__dev-link">✉️ diego01araujo@gmail.com</a>
              </div>
            </div>
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
