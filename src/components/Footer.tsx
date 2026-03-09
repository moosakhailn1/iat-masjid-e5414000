const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>Islamic Association of Texas</h3>
          <p>
            Serving the Richardson community with prayer, education,
            and unity — grounded in the Qur'an and Sunnah.
          </p>
        </div>

        <div className="footer-column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/donate/">Donate</a></li>
            <li><a href="/events/">Events</a></li>
            <li><a href="/contact/">Community Services</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Resources</h4>
          <ul>
            <li><a href="/quran/">Digital Qur'an</a></li>
            <li><a href="/">AI Memorization Tool</a></li>
            <li><a href="/islam/">Islam</a></li>
            <li><a href="#">Terms of Use</a></li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>Contact</h4>
          <ul className="footer-contact">
            <li>
              <svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
              132 N Glenville Dr, Richardson, TX 75081
            </li>
            <li>
              <svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z"/></svg>
              (972) 863-9696
            </li>
            <li>
              <svg className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.104 0-2 .896-2 2v12c0 1.104.896 2 2 2h16c1.104 0 2-.896 2-2V6c0-1.104-.896-2-2-2zm0 2l-8 5-8-5v-0.001L20 6zm0 12H4V8l8 5 8-5v10z"/></svg>
              <a href="mailto:abuhanifahiat@gmail.com">abuhanifahiat@gmail.com</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Islamic Association of Texas. All rights reserved.</span>
        <span>
          Developed by{' '}
          <a href="https://numanullah.com" className="developer-credit" target="_blank" rel="noopener noreferrer">
            Numanullah Moosakhail
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
