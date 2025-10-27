import React from 'react';
import { Instagram, Linkedin } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="mt-12 pt-8 border-t border-neutral-800 text-neutral-500 text-sm">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Company Info */}
        <div>
          <h3 className="font-bold text-base text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h3>
          <p className="mt-2">Dripfy GmbH</p>
          <p>Leipziger Pl. 15, 90491 Nürnberg</p>
          <p className="mt-2">
            <a href="mailto:info@dripfy.de" className="hover:text-white transition-colors">info@dripfy.de</a>
          </p>
          <p>
            <a href="tel:+491742433558" className="hover:text-white transition-colors">+49 174 2433558</a>
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="font-semibold text-neutral-300 mb-2">{t('footer.links')}</h4>
          <ul className="space-y-2">
            <li><a href="https://dripfy.de/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('footer.imprint')}</a></li>
            <li><a href="https://dripfy.de/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('footer.privacy')}</a></li>
            <li><a href="https://dripfy.de/agb" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('footer.terms')}</a></li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="font-semibold text-neutral-300 mb-2">{t('footer.followUs')}</h4>
          <div className="flex items-center space-x-4">
            <a href="https://www.instagram.com/dripfy.de/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Instagram size={24} />
            </a>
            <a href="https://www.linkedin.com/company/dripfy/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Linkedin size={24} />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
        <p>{t('footer.copyright')}</p>
      </div>
    </footer>
  );
};

export default Footer;