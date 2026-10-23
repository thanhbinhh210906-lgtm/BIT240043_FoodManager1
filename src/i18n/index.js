import en from './en.json';
import vi from './vi.json';

export const translations = { en, vi };

// Hàm t được export đúng cách
export const t = (key, lang = 'en') => {
  return translations[lang][key] || key;
};