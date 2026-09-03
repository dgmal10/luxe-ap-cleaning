import { useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV_ITEMS } from '../../lib/constants';
import { useScrolled, useScrollTo } from '../../hooks/useUtils';
import './Header.css';

export default function Header() {
  const scrolled = useScrolled(50);
  const scrollTo = useScrollTo();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = useCallback(
    (href: string) => {
      scrollTo(href);
      setMenuOpen(false);
    },
    [scrollTo]
  );

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''} ${menuOpen ? 'header--menu-open' : ''}`} id="header">
      <div className="container header__inner">
        {/* Logo */}
        <button className="header__logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <img src="/img/logo-transparent.png" alt="LUXE A&P Cleaning" className="header__logo-img" />
        </button>

        {/* Desktop Navigation */}
        <nav className="header__nav" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <button
              key={item.href}
              className={`header__link ${item.href === 'booking' ? 'header__link--cta' : ''}`}
              onClick={() => handleNav(item.href)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="header__toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <div className={`header__drawer ${menuOpen ? 'header__drawer--open' : ''}`}>
        <nav className="header__drawer-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.href}
              className="header__drawer-link"
              onClick={() => handleNav(item.href)}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Drawer backdrop */}
      {menuOpen && (
        <div className="header__backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
    </header>
  );
}
