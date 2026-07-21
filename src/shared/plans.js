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
  { id: 'home', label: 'Início', icon: '/icons/png/logo.png', path: '/home/', color: '#D9D9D9' },
  { id: 'ai', label: 'Assistente de IA', icon: '/icons/svg/apps/ai.svg', path: '/ai/', color: '#862CD4' },
  { id: 'analytics', label: 'Análises', icon: '/icons/svg/apps/analytics.svg', path: '/analytics/', color: '#015CF1' },
  { id: 'calendar', label: 'Calendário', icon: '/icons/svg/apps/calendar.svg', path: '/calendar/', color: '#F86202' },
  { id: 'docs', label: 'Editor de Documentos', icon: '/icons/svg/apps/docs.svg', path: '/docs/', color: '#D9D9D9' },
  { id: 'draw', label: 'Desenho', icon: '/icons/svg/apps/draw.svg', path: '/draw/', color: '#F23263' },
  { id: 'drive', label: 'Armazenamento', icon: '/icons/svg/apps/drive.svg', path: '/drive/', color: '#D9D9D9' },
  { id: 'forms', label: 'Formulários', icon: '/icons/svg/apps/forms.svg', path: '/forms/', color: '#7C32CA' },
  { id: 'image', label: 'Editor de Imagem', icon: '/icons/svg/apps/image.svg', path: '/image/', color: '#0662EF' },
  { id: 'mail', label: 'Interface de Email', icon: '/icons/svg/apps/mail.svg', path: '/mail/', color: '#EF3053' },
  { id: 'notes', label: 'Notas', icon: '/icons/svg/apps/notes.svg', path: '/notes/', color: '#FBAD05' },
  { id: 'profilelens', label: 'Análise de Perfil Social', icon: '/icons/svg/apps/profilelens.svg', path: '/profilelens/', color: '#02929E' },
  { id: 'sheets', label: 'Folha de Cálculo', icon: '/icons/svg/apps/sheets.svg', path: '/sheets/', color: '#23A63F' },
  { id: 'slides', label: 'Apresentações', icon: '/icons/svg/apps/slides.svg', path: '/slides/', color: '#FB6704' },
  { id: 'whiteboard', label: 'Quadro Branco', icon: '/icons/svg/apps/whiteboard.svg', path: '/whiteboard/', color: '#7630CA' },
  { id: 'wiki', label: 'Wiki', icon: '/icons/svg/apps/wiki.svg', path: '/wiki/', color: '#035EEE' },
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