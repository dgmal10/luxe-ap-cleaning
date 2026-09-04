import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle, Mail, Phone, MapPin } from 'lucide-react';
import { BUSINESS } from '../../lib/constants';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="privacy-page">
      {/* Header Bar */}
      <header className="privacy-header">
        <div className="container privacy-header__inner">
          <Link to="/" className="privacy-header__back">
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
          <img src="/img/logo-transparent.png" alt="LUXE A&P Cleaning" className="privacy-header__logo" />
        </div>
      </header>

      {/* Hero Banner */}
      <section className="privacy-hero">
        <div className="container">
          <div className="privacy-hero__badge">
            <Shield size={14} />
            <span>Legal & Privacy</span>
          </div>
          <h1 className="privacy-hero__title">Privacy Policy</h1>
          <p className="privacy-hero__subtitle">
            How LUXE A&amp;P Cleaning collects, protects, and handles your personal information.
          </p>
          <p className="privacy-hero__date">Last Updated: August 29, 2026</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="privacy-content">
        <div className="container privacy-content__grid">
          {/* Main Document */}
          <div className="privacy-doc">
            <div className="privacy-section">
              <h2>1. Introduction &amp; Commitment</h2>
              <p>
                At <strong>{BUSINESS.name}</strong> ("we," "our," or "us"), your privacy and the security
                of your personal information are of paramount importance. This Privacy Policy outlines
                our practices concerning the collection, use, protection, and disclosure of your personal
                data when you visit our website (<strong>luxeaepcleaning.com</strong>), request a quote,
                book a cleaning service, or contact us.
              </p>
              <p>
                We comply with applicable United States federal laws and Massachusetts state privacy
                regulations, including the <em>Massachusetts Data Privacy Law (201 CMR 17.00 Standards for the
                Protection of Personal Information of Residents of the Commonwealth)</em>.
              </p>
            </div>

            <div className="privacy-section">
              <h2>2. Information We Collect</h2>
              <p>We only collect personal information that you voluntarily provide to us when using our services:</p>
              <div className="privacy-cards">
                <div className="privacy-card">
                  <div className="privacy-card__header">
                    <FileText size={18} />
                    <strong>Booking Information</strong>
                  </div>
                  <p>Full name, email address, phone number, residential service address, preferred date/time, selected cleaning package, and specific house notes.</p>
                </div>
                <div className="privacy-card">
                  <div className="privacy-card__header">
                    <Mail size={18} />
                    <strong>Contact Messages</strong>
                  </div>
                  <p>Your name, email address, and any inquiries or special instructions submitted through our contact form or WhatsApp integration.</p>
                </div>
              </div>
            </div>

            <div className="privacy-section">
              <h2>3. How We Use Your Information</h2>
              <p>We use the information we collect solely for legitimate business purposes:</p>
              <ul className="privacy-list">
                <li><CheckCircle size={16} /> <span><strong>Service Fulfillment:</strong> To schedule, confirm, perform, and follow up on your residential cleaning appointments.</span></li>
                <li><CheckCircle size={16} /> <span><strong>Customer Communication:</strong> To send appointment reminders, respond to questions, and provide customer support.</span></li>
                <li><CheckCircle size={16} /> <span><strong>Service Customization:</strong> To accommodate specific property requirements and customized cleaning instructions.</span></li>
                <li><CheckCircle size={16} /> <span><strong>Legal Compliance:</strong> To maintain accurate business, invoicing, and tax records as required by Massachusetts law.</span></li>
              </ul>
            </div>

            <div className="privacy-section">
              <h2>4. Zero Sale of Personal Data</h2>
              <div className="privacy-highlight">
                <Lock size={20} />
                <div>
                  <strong>We Never Sell Your Data</strong>
                  <p>
                    {BUSINESS.name} does <strong>NOT</strong> sell, rent, lease, monetize, or trade your personal
                    information, phone numbers, or email addresses to third-party marketers, advertisers, or data brokers.
                  </p>
                </div>
              </div>
            </div>

            <div className="privacy-section">
              <h2>5. Data Security &amp; Storage (201 CMR 17.00 Compliance)</h2>
              <p>
                We implement comprehensive administrative, technical, and physical safeguards to protect
                your personal data against unauthorized access, destruction, loss, or disclosure:
              </p>
              <ul className="privacy-list">
                <li><Lock size={16} /> <span><strong>Encryption in Transit:</strong> All web traffic is encrypted using modern TLS 1.3 / HTTPS protocols.</span></li>
                <li><Lock size={16} /> <span><strong>Secure Cloud Infrastructure:</strong> Data is stored within Google Cloud / Firebase enterprise-grade databases protected by role-based access control.</span></li>
                <li><Lock size={16} /> <span><strong>Restricted Administrative Access:</strong> Only authorized personnel with authenticated credentials can access client booking records and contact messages.</span></li>
              </ul>
            </div>

            <div className="privacy-section">
              <h2>6. Your Privacy Rights</h2>
              <p>Under Massachusetts and US privacy standards, you hold the following rights regarding your data:</p>
              <ul className="privacy-list">
                <li><Eye size={16} /> <span><strong>Right to Know &amp; Access:</strong> You can request a copy of the personal information we maintain about you.</span></li>
                <li><Eye size={16} /> <span><strong>Right to Correction:</strong> You may request correction of any inaccurate or outdated information.</span></li>
                <li><Eye size={16} /> <span><strong>Right to Deletion:</strong> You can request the deletion of your contact and appointment history at any time.</span></li>
              </ul>
              <p>
                To exercise any of these rights, simply email us at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
                We process all requests within 30 days free of charge.
              </p>
            </div>

            <div className="privacy-section">
              <h2>7. Children's Privacy</h2>
              <p>
                Our services are directed to adults and homeowners. We do not knowingly collect personal
                information from children under the age of 13 in compliance with the Children's Online Privacy
                Protection Act (COPPA).
              </p>
            </div>

            <div className="privacy-section">
              <h2>8. Changes to This Privacy Policy</h2>
              <p>
                We may periodically update this policy to reflect improvements in our practices or legal obligations.
                Any updates will be posted on this page with a revised "Last Updated" date.
              </p>
            </div>

            <div className="privacy-section privacy-contact-card">
              <h2>9. Contact Us &amp; Privacy Officer</h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us directly:</p>
              <div className="privacy-contact-details">
                <div className="privacy-contact-row">
                  <Shield size={16} />
                  <span><strong>{BUSINESS.name}</strong></span>
                </div>
                <div className="privacy-contact-row">
                  <MapPin size={16} />
                  <span>{BUSINESS.city}, {BUSINESS.state} {BUSINESS.zip}</span>
                </div>
                <div className="privacy-contact-row">
                  <Phone size={16} />
                  <span><a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phone}</a></span>
                </div>
                <div className="privacy-contact-row">
                  <Mail size={16} />
                  <span><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="privacy-footer">
        <div className="container privacy-footer__inner">
          <p>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</p>
          <Link to="/" className="privacy-footer__link">Return to Home</Link>
        </div>
      </footer>
    </div>
  );
}
