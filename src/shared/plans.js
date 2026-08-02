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

// Ícones do grid do tab "Criar" (CreateTab): docs, sheets, slides e
// whiteboard usam agora PNGs diretos (sem mask-image, sem cor de
// fundo aplicada ao ícone) a partir de /icons/png/{id}.png — os
// ficheiros já foram colocados manualmente em static/icons/png/.
// O Assistente de IA e o Início mantêm os caminhos anteriores
// (svg/logo), pois não fazem parte desta troca.
export const ALL_APPS = [
  { id: 'home', label: 'Início', icon: '/icons/png/logo.png', path: '/home/', color: 'var(--accent-primary)' },
  { id: 'ai', label: 'Assistente de IA', icon: '/icons/svg/apps/ai.svg', path: '/ai/', color: 'var(--accent-primary)' },
  { id: 'docs', label: 'Editor de Documentos', icon: '/icons/png/docs.png', path: '/docs/', color: 'var(--accent-primary)' },
  { id: 'sheets', label: 'Folha de Cálculo', icon: '/icons/png/sheets.png', path: '/sheets/', color: 'var(--accent-primary)' },
  { id: 'slides', label: 'Apresentações', icon: '/icons/png/slides.png', path: '/slides/', color: 'var(--accent-primary)' },
  { id: 'whiteboard', label: 'Quadro Branco', icon: '/icons/png/whiteboard.png', path: '/whiteboard/', color: 'var(--accent-primary)' },
];


export const PLANS_DATA = {
  basic: {
    title: 'Básico', badge: 'Para começar', price: '2.500 Kz', accent: 'var(--accent-primary)',
    trial: '0,00 US$', monthlyText: '30,00 US$/mês',
    features: ['Mais conversas e tempo de uso','Acesso rápido à IA','Uso ideal para o dia a dia','Upgrade simples quando precisares'],
  },
  premium: {
    title: 'Premium', badge: 'Mais completo', price: '7.500 Kz', accent: 'var(--accent-primary)',
    trial: '0,00 US$', monthlyText: '30,00 US$/mês',
    features: ['Mais velocidade e prioridade','Mais limites de uso','Experiência premium','Ideal para trabalho pesado'],
  },
};