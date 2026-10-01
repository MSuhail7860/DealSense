import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Cpu,
  BrainCircuit,
  BarChart3,
  BookOpen,
  Info,
  Menu,
  X,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import Button from './Button';
import { useHealth } from '../hooks/useHealth';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { mlStatus, backendStatus } = useHealth();

  const closeMenu = () => setMobileMenuOpen(false);

  const navLinks = [
    { to: '/', label: 'Home', icon: TrendingUp },
    { to: '/analyze', label: 'Analyze', icon: Cpu },
    { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
    { to: '/results', label: 'Results', icon: BarChart3 },
    { to: '/how-it-works', label: 'How It Works', icon: BookOpen },
    { to: '/about', label: 'About', icon: Info },
  ];

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <div className="brand-logo-mark">
            <BrainCircuit size={22} className="brand-icon" />
          </div>
          <div className="brand-text-group">
            <span className="brand-name">DealSense</span>
            <span className="brand-pill">AI CRM</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="navbar-nav desktop-nav" aria-label="Main Navigation">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active-nav-link' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right Status & Actions */}
        <div className="navbar-actions desktop-actions">
          {/* Service Health Indicator */}
          <div
            className={`service-status-pill ${
              mlStatus.ok ? 'status-online' : 'status-demo'
            }`}
            title={
              mlStatus.ok
                ? `ML Service Connected (${mlStatus.version || 'xgb-v0.1'})`
                : 'Running in Calibrated Simulation Mode (Start Python services for live sync)'
            }
          >
            <span className="status-ping"></span>
            <span className="status-label">
              {mlStatus.ok ? 'ML Live' : 'Calibrated Mode'}
            </span>
          </div>

          <Link to="/analyze">
            <Button size="sm" variant="primary" icon={Zap}>
              Try DealSense
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={closeMenu}>
          <div
            className="mobile-menu-drawer glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-menu-links">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? 'active-mobile-link' : ''}`
                  }
                  onClick={closeMenu}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mobile-menu-footer">
              <div
                className={`service-status-pill ${
                  mlStatus.ok ? 'status-online' : 'status-demo'
                }`}
              >
                <span className="status-ping"></span>
                <span className="status-label">
                  {mlStatus.ok ? 'Live ML Connected' : 'Calibrated ML Model'}
                </span>
              </div>

              <Link to="/analyze" onClick={closeMenu} style={{ width: '100%' }}>
                <Button variant="primary" style={{ width: '100%' }} icon={Zap}>
                  Try DealSense
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
