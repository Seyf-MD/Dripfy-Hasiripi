import * as React from 'react';
import { Instagram, Linkedin } from 'lucide-react';
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
  const { copy } = useWebsiteCopy();
  const footer = copy.footer;

  const renderLegalLink = (label: string, key: LegalPageKey) => {
    if (!onNavigateLegal) {
      return (
        <a
          href={legalLinkMap[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--drip-text)] dark:hover:text-white transition-colors"
        >
          {label}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onNavigateLegal(key)}
        className="text-left w-full hover:text-[var(--drip-text)] dark:hover:text-white transition-colors"
      >
        {label}
      </button>
    );
  };

  return (
    <footer className="mt-12 py-8 border-t border-neutral-200 dark:border-neutral-800 text-[var(--drip-muted)] dark:text-neutral-500 text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <BrandLogo className="h-8 w-auto mb-3" />
          <p className="mt-2">{footer.companyName}</p>
          {footer.addressLines.map((line, idx) => (
            <p key={`footer-line-${idx}`}>{line}</p>
          ))}
          <p className="mt-2">
            <a href={`mailto:${footer.email}`} className="hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
              {footer.email}
            </a>
          </p>
          <p>
            <a href={`tel:${footer.phone.replace(/\s+/g, '')}`} className="hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
              {footer.phone}
            </a>
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-[var(--drip-text)] dark:text-neutral-300 mb-2">{t('footer.links')}</h4>
          <ul className="space-y-2">
            <li>{renderLegalLink(t('footer.imprint'), 'impressum')}</li>
            <li>{renderLegalLink(t('footer.privacy'), 'privacy')}</li>
            <li>{renderLegalLink(t('footer.terms'), 'terms')}</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-[var(--drip-text)] dark:text-neutral-300 mb-2">{t('footer.followUs')}</h4>
          <div className="flex items-center space-x-4">
            <a
              href="https://www.instagram.com/dripfy.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--drip-text)] dark:hover:text-white transition-colors"
            >
              <Instagram size={24} />
            </a>
            <a
              href="https://www.linkedin.com/company/dripfy/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--drip-text)] dark:hover:text-white transition-colors"
            >
              <Linkedin size={24} />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
};

export default Footer;
