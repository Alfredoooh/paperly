export const AVAILABLE_LANGUAGES = [
  { code: 'pt',    name: 'Português',            native: 'Português (Portugal)' },
  { code: 'pt-BR', name: 'Português (Brasil)',    native: 'Português (Brasil)' },
  { code: 'en',    name: 'Inglês',                native: 'English' },
  { code: 'es',    name: 'Espanhol',              native: 'Español' },
  { code: 'fr',    name: 'Francês',               native: 'Français' },
  { code: 'de',    name: 'Alemão',                native: 'Deutsch' },
  { code: 'it',    name: 'Italiano',              native: 'Italiano' },
  { code: 'nl',    name: 'Neerlandês',            native: 'Nederlands' },
  { code: 'ru',    name: 'Russo',                 native: 'Русский' },
  { code: 'zh',    name: 'Chinês (simplificado)', native: '中文（简体）' },
  { code: 'ja',    name: 'Japonês',               native: '日本語' },
  { code: 'ko',    name: 'Coreano',               native: '한국어' },
  { code: 'ar',    name: 'Árabe',                 native: 'العربية' },
  { code: 'hi',    name: 'Hindi',                 native: 'हिन्दी' },
  { code: 'tr',    name: 'Turco',                 native: 'Türkçe' },
  { code: 'pl',    name: 'Polaco',                native: 'Polski' },
  { code: 'sv',    name: 'Sueco',                 native: 'Svenska' },
  { code: 'uk',    name: 'Ucraniano',             native: 'Українська' },
];

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Rápido e equilibrado' },
  { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   description: 'Mais capaz para tarefas complexas' },
];

export const OCCUPATION_OPTIONS = [
  { id: 'student',       label: 'Estudante' },
  { id: 'professional',  label: 'Profissional' },
  { id: 'other',         label: 'Outro' },
];

// Ícones do grid do tab "Criar" (CreateTab) usam agora exclusivamente
// SVGs mascarados a partir de /icons/svg/apps/{id}.svg — herdam a cor
// do tema automaticamente (var(--icon-strong)), tal como no resto da app.
export const ALL_APPS = [
  { id: 'home', label: 'Início', icon: '/icons/png/logo.png', path: '/home/' },
  { id: 'ai', label: 'IA', icon: '/icons/svg/apps/ai.svg', path: '/ai/' },
  { id: 'analytics', label: 'Analytics', icon: '/icons/svg/apps/analytics.svg', path: '/analytics/' },
  { id: 'calendar', label: 'Calendar', icon: '/icons/svg/apps/calendar.svg', path: '/calendar/' },
  { id: 'docs', label: 'Docs', icon: '/icons/svg/apps/docs.svg', path: '/docs/' },
  { id: 'draw', label: 'Draw', icon: '/icons/svg/apps/draw.svg', path: '/draw/' },
  { id: 'drive', label: 'Drive', icon: '/icons/svg/apps/drive.svg', path: '/drive/' },
  { id: 'forms', label: 'Forms', icon: '/icons/svg/apps/forms.svg', path: '/forms/' },
  { id: 'image', label: 'Image', icon: '/icons/svg/apps/image.svg', path: '/image/' },
  { id: 'mail', label: 'Mail', icon: '/icons/svg/apps/mail.svg', path: '/mail/' },
  { id: 'notes', label: 'Notes', icon: '/icons/svg/apps/notes.svg', path: '/notes/' },
  { id: 'profilelens', label: 'ProfileLens', icon: '/icons/svg/apps/profilelens.svg', path: '/profilelens/' },
  { id: 'sheets', label: 'Sheets', icon: '/icons/svg/apps/sheets.svg', path: '/sheets/' },
  { id: 'slides', label: 'Slides', icon: '/icons/svg/apps/slides.svg', path: '/slides/' },
  { id: 'whiteboard', label: 'Whiteboard', icon: '/icons/svg/apps/whiteboard.svg', path: '/whiteboard/' },
  { id: 'wiki', label: 'Wiki', icon: '/icons/svg/apps/wiki.svg', path: '/wiki/' },
];


export const PLANS_DATA = {
  basic: {
    title: 'Básico', badge: 'Para começar', price: '2.500 Kz', accent: '#2F7BF6',
    trial: '0,00 US$', monthlyText: '30,00 US$/mês',
    features: ['Mais conversas e tempo de uso','Acesso rápido à IA','Uso ideal para o dia a dia','Upgrade simples quando precisares'],
  },
  premium: {
    title: 'Premium', badge: 'Mais completo', price: '7.500 Kz', accent: '#10B981',
    trial: '0,00 US$', monthlyText: '30,00 US$/mês',
    features: ['Mais velocidade e prioridade','Mais limites de uso','Experiência premium','Ideal para trabalho pesado'],
  },
};