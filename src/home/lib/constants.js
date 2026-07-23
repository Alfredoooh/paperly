// src/home/lib/constants.js

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

// Ícones do grid do tab "Criar" (CreateTab) usam SVGs mascarados a
// partir de /icons/svg/apps/{id}.svg. Cada app tem a SUA PRÓPRIA cor
// de container (campo `color`, hex fornecido) — o container usa
// `app.color` como background e o ícone dentro fica sempre BRANCO
// puro (#FFFFFF), nos dois temas.
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

export const THEME_OPTIONS = [
  { id: 'dark', label: 'Escuro' },
  { id: 'light', label: 'Claro' },
  { id: 'system', label: 'Predefinição do sistema' },
];

export const DRAWER_ITEMS = [];

// Tabs da bottom bar nativa
export const TABS = [
  {
    id: 'create',
    label: 'Criar',
    title: 'Criar',
    icon: '/icons/svg/regular/add_circle.svg',
    iconFilled: '/icons/svg/filled/add_circle.svg',
  },
  {
    id: 'projects',
    label: 'Projetos',
    title: 'Projetos',
    icon: '/icons/svg/regular/folder.svg',
    iconFilled: '/icons/svg/filled/folder.svg',
  },
  {
    id: 'templates',
    label: 'Templates',
    title: 'Templates',
    icon: '/icons/svg/regular/board.svg',
    iconFilled: '/icons/svg/filled/board.svg',
  },
  {
    id: 'me',
    label: 'Eu',
    title: 'Eu',
    isAvatar: true,
  },
];

// Toggle usado no appbar do tab "Templates"
export const TEMPLATE_VIEWS = [
  { id: 'images', label: 'Imagens' },
  { id: 'documents', label: 'Documentos' },
];

// Modelos de documentos apresentados no toggle "Documentos" do tab Templates.
export const DOC_MODELS = [
  { id: 'doc-cv', label: 'Currículo', icon: '/icons/svg/regular/document.svg', prompt: 'Cria um currículo profissional para ' },
  { id: 'doc-carta', label: 'Carta de Apresentação', icon: '/icons/svg/regular/document.svg', prompt: 'Escreve uma carta de apresentação para ' },
  { id: 'doc-relatorio', label: 'Relatório', icon: '/icons/svg/regular/document.svg', prompt: 'Cria um relatório sobre ' },
  { id: 'doc-contrato', label: 'Contrato', icon: '/icons/svg/regular/document.svg', prompt: 'Redige um modelo de contrato de ' },
  { id: 'doc-ata', label: 'Ata de Reunião', icon: '/icons/svg/regular/document.svg', prompt: 'Cria uma ata de reunião sobre ' },
];

// Modelos de imagem apresentados no toggle "Imagens" do tab Templates.
export const IMAGE_MODELS = [
  { id: 'img-1', label: 'Retrato Realista', thumb: '/images/img_models/img1.jpg', prompt: 'Cria uma imagem em estilo retrato realista de ' },
  { id: 'img-2', label: 'Anime', thumb: '/images/img_models/img2.jpg', prompt: 'Cria uma imagem em estilo anime de ' },
  { id: 'img-3', label: '3D Render', thumb: '/images/img_models/img3.jpg', prompt: 'Cria uma imagem em render 3D de ' },
  { id: 'img-4', label: 'Aguarela', thumb: '/images/img_models/img4.jpg', prompt: 'Cria uma imagem em estilo aguarela de ' },
  { id: 'img-5', label: 'Cyberpunk', thumb: '/images/img_models/img5.jpg', prompt: 'Cria uma imagem em estilo cyberpunk de ' },
  { id: 'img-6', label: 'Minimalista', thumb: '/images/img_models/img6.jpg', prompt: 'Cria uma imagem em estilo minimalista de ' },
];

export const AVATAR_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#007AFF', '#5856D6', '#AF52DE'];

export function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}