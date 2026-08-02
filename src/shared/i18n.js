import { writable, get } from 'svelte/store';

const STORAGE_KEY = 'nexa_lang';

const DEFAULT_LANG = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'pt';
  } catch (e) {
    return 'pt';
  }
})();

export const availableLanguages = [
  'pt', 'pt-BR', 'en', 'es', 'fr', 'de', 'it', 'nl', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'tr', 'pl', 'sv', 'uk'
];

export const language = writable(DEFAULT_LANG);

const dict = {
  pt: {
    home: {
      create: 'Criar',
      projects: 'Projetos',
      templates: 'Templates',
      me: 'Eu',
      drawer: {
        settings: 'Definições',
        help: 'Ajuda',
        profile: 'Perfil',
        logout: 'Terminar sessão',
      },
    },
  },
  en: {
    home: {
      create: 'Create',
      projects: 'Projects',
      templates: 'Templates',
      me: 'Me',
      drawer: {
        settings: 'Settings',
        help: 'Help',
        profile: 'Profile',
        logout: 'Log out',
      },
    },
  },
};

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function t(key, fallback = key) {
  const lang = get(language);
  const chain = [lang, lang.split('-')[0], 'en', 'pt'];
  for (const code of chain) {
    const d = dict[code];
    if (!d) continue;
    const val = resolvePath(d, key);
    if (typeof val === 'string') return val;
  }
  return fallback;
}

export function setLanguage(code) {
  const next = availableLanguages.includes(code) ? code : 'pt';
  language.set(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
}

export function initLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) language.set(stored);
  } catch (e) {}
  return language;
}