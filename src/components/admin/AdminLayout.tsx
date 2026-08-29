/**
 * Admin Layout — sidebar + header shell for all admin pages.
 */
import { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  CalendarCog,
  ImagePlus,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './AdminLayout.css';

const NAV_ITEMS = [
  { label: 'Painel', path: '/admin', icon: <LayoutDashboard size={20} />, end: true },
  { label: 'Mensagens', path: '/admin/messages', icon: <MessageSquare size={20} /> },
  { label: 'Agenda', path: '/admin/schedule', icon: <CalendarCog size={20} /> },
  { label: 'Galeria', path: '/admin/gallery', icon: <ImagePlus size={20} /> },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="admin">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin__sidebar ${sidebarOpen ? 'admin__sidebar--open' : ''}`}>
        <div className="admin__sidebar-header">
          <div className="admin__logo">
            <span className="admin__logo-text">LUXE A&P</span>
            <span className="admin__logo-sub">Admin</span>
          </div>
          <button
            className="admin__sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu lateral"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin__nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `admin__nav-item ${isActive ? 'admin__nav-item--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
              <ChevronRight size={16} className="admin__nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="admin__sidebar-footer">
          <Link to="/" className="admin__nav-item" style={{ textDecoration: 'none', marginBottom: '8px' }}>
            <Globe size={18} />
            <span>Ver Site</span>
          </Link>
          <button className="admin__logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin__main">
        {/* Top bar */}
        <header className="admin__topbar">
          <button
            className="admin__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>

          <div className="admin__topbar-right">
            <Link
              to="/"
              className="btn btn-sm btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <Globe size={14} />
              <span>Ver Site</span>
            </Link>
            <div className="admin__user">
              <div className="admin__avatar">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="admin__user-email">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page content (rendered by nested routes) */}
        <div className="admin__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
