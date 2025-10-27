import React from 'react';
import { UserPlus } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC = () => {
  const { t } = useLanguage();

  return (
    <header className="flex justify-between items-center animate-slide-in-up" style={{ animationDelay: '100ms' }}>
      <div>
        <h1 className="text-3xl font-bold text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
        <p className="text-neutral-500 mt-1">{t('header.subtitle')}</p>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-sm text-sm font-medium text-neutral-200 hover:bg-neutral-700 hover:border-[#32ff84] transition-all duration-300 transform hover:-translate-y-0.5">
          <UserPlus size={16} />
          {t('header.inviteButton')}
        </button>
      </div>
    </header>
  );
};

export default Header;