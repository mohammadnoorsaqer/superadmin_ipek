import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';

const stored = localStorage.getItem('ipek-admin-lang') || 'en';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: stored,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function applyDir(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

applyDir(stored);

export default i18n;
