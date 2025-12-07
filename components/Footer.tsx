import * as React from 'react';
import { Instagram, Linkedin, Twitter, Github } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import BrandLogo from './BrandLogo';
import { LegalPageKey } from '../data/legalContent';
import { useWebsiteCopy } from '../context/WebsiteCopyContext';

interface FooterProps {
  onNavigateLegal?: (page: LegalPageKey) => void;
}

const legalLinkMap: Record<LegalPageKey, string> = {
  impressum: 'https://dripfy.de/pages/impressum',
  privacy: 'https://dripfy.de/pages/datenschutz-gemass-dsgvo',
  terms: 'https://dripfy.de/pages/website-terms-conditions',
};

const Footer: React.FC<FooterProps> = ({ onNavigateLegal }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { copy } = useWebsiteCopy();
  const footer = copy.footer;

  const renderLegalLink = (label: string, key: LegalPageKey) => {
    const linkClass = "text-sm font-medium text-gray-500 hover:text-blue-500 transition-colors duration-300";

    if (!onNavigateLegal) {
      return (
        <a
          href={legalLinkMap[key]}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {label}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onNavigateLegal(key)}
        className={linkClass}
      >
        {label}
      </button>
    );
  };

  return (
    <footer className="mt-16 pb-10 px-4">
      <div className="max-w-5xl mx-auto ios-glass rounded-3xl p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand & Contact */}
          <div className="space-y-4">
            <BrandLogo className="h-8 w-auto opacity-90" />
            <div className="space-y-2 text-sm text-gray-500">
              <p className="font-medium text-gray-900 dark:text-white">{footer.companyName}</p>
              {footer.addressLines.map((line, idx) => (
                <p key={`footer-line-${idx}`}>{line}</p>
              ))}
              <div className="pt-2 flex flex-col gap-1">
                <a href={`mailto:${footer.email}`} className="hover:text-blue-500 transition-colors">
                  {footer.email}
                </a>
                <a href={`tel:${footer.phone.replace(/\s+/g, '')}`} className="hover:text-blue-500 transition-colors">
                  {footer.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('footer.links')}</h4>
            <ul className="space-y-3 flex flex-col items-start">
              <li>{renderLegalLink(t('footer.imprint'), 'impressum')}</li>
              <li>{renderLegalLink(t('footer.privacy'), 'privacy')}</li>
              <li>{renderLegalLink(t('footer.terms'), 'terms')}</li>
            </ul>
          </div>

          {/* Social & Copyright */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">{t('footer.followUs')}</h4>
            <div className="flex gap-4">
              {[
                { icon: <Instagram size={18} />, href: 'https://www.instagram.com/dripfy.de/' },
                { icon: <Linkedin size={18} />, href: 'https://www.linkedin.com/company/dripfy/' },
                { icon: <Twitter size={18} />, href: '#' }, // Placeholder href
                { icon: <Github size={18} />, href: '#' }, // Placeholder href
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    p-2 rounded-full transition-all duration-300 hover:-translate-y-1
                    ${theme === 'light'
                      ? 'bg-[var(--drip-surface)] text-[var(--drip-muted)] hover:bg-[var(--drip-primary)] hover:text-white hover:shadow-lg'
                      : 'bg-white/5 text-neutral-400 hover:bg-[var(--drip-primary)] hover:text-white hover:shadow-lg'}
                  `}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-6"> {/* Added mt-6 for spacing */}
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
