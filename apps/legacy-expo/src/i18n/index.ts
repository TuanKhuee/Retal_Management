import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './vi.json';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    vi: { translation: vi },
  },
  lng: 'vi',
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
