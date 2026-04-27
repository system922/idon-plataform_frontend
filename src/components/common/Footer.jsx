import { useNavigate } from 'react-router-dom';
import '../../styles/Footer.css';

export default function Footer() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="idon-footer-global">
      <div className="footer-wrapper">
        {/* Left - Copyright */}
        <div className="footer-left">
          <span className="footer-copyright">
            © {currentYear} IDON. All rights reserved.
          </span>
        </div>

        {/* Right - Links */}
        <div className="footer-right">
          <button
            className="footer-link"
            onClick={() => navigate('/privacy-policy')}
            type="button"
            title="Ver Política de Privacidad"
          >
            Privacy Policy
          </button>
          <span className="footer-separator">•</span>
          <button
            className="footer-link"
            onClick={() => navigate('/terms-and-conditions')}
            type="button"
            title="Ver Términos y Condiciones"
          >
            Terms & Conditions
          </button>
        </div>
      </div>
    </footer>
  );
}
