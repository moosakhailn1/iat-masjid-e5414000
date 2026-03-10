import { useState, useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const Navbar = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { navbar } = useSiteSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className={`iat-header-stack${scrolled ? ' scrolled' : ''}`}>
        {/* Top bar */}
        <div className="iat-top-bar">
          <div className="iat-top-inner">
            <div className="iat-top-item">
              <svg className="iat-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
              {navbar.address}
            </div>
            <div className="iat-top-item">
              <svg className="iat-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z"/></svg>
              {navbar.phone}
            </div>
            <div className="iat-top-right">
              <a href={`mailto:${navbar.email}`}>
                <svg className="iat-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.104 0-2 .896-2 2v12c0 1.104.896 2 2 2h16c1.104 0 2-.896 2-2V6c0-1.104-.896-2-2-2zm0 2l-8 5-8-5v-0.001L20 6zm0 12H4V8l8 5 8-5v10z"/></svg>
                <span>{navbar.email}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="iat-nav-inner">
          <a href="/" className="iat-brand">
            {navbar.logoUrl && (
              <img src={navbar.logoUrl} alt="Logo" className="iat-logo" />
            )}
            <div>
              <span className="iat-site-name">{navbar.siteName}</span>
              <span className="iat-site-tag">{navbar.siteTagline}</span>
            </div>
          </a>

          <div className="iat-nav-links">
            {navbar.links.map(({ label, href, isDonate }) => (
              <a key={label} href={href} className={isDonate ? 'iat-donate' : ''}>
                {label}
              </a>
            ))}
          </div>

          <button className="iat-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            ☰
          </button>
        </nav>
      </div>

      {/* Ribbon */}
      {navbar.ribbonText && (
        <div className="iat-ribbon-banner">
          <div className="iat-ribbon-text">{navbar.ribbonText}</div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`iat-mobile-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="iat-mobile-top">
          {navbar.logoUrl && (
            <img src={navbar.logoUrl} alt="Logo" className="iat-mobile-logo" />
          )}
          <span className="iat-mobile-title">{navbar.siteName}</span>
          <button className="iat-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <div className="iat-mobile-nav">
          {navbar.links.map(({ label, href, isDonate }) => (
            <a key={label} href={href} className={isDonate ? 'iat-donate' : ''} onClick={() => setSidebarOpen(false)}>
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
