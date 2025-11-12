import websiteCopy from './websiteContent.json';
import { Language } from '../i18n/LanguageContext';

export type LegalPageKey = 'impressum' | 'privacy' | 'terms';

export const LEGAL_LANGUAGES: Language[] = ['tr', 'en', 'de', 'ru', 'ar'];
export const LEGAL_DEFAULT_LANGUAGE: Language = 'tr';

const { legalContent: rawContent } = websiteCopy;

export const legalContent: Record<LegalPageKey, Record<Language, string>> = {
  impressum: rawContent.impressum as Record<Language, string>,
  privacy: rawContent.privacy as Record<Language, string>,
  terms: rawContent.terms as Record<Language, string>,
};
