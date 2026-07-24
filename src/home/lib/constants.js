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

// Ícones do grid do tab "Criar" (CreateTab): usam agora PNGs diretos
// (sem mask-image, sem círculo/fundo colorido) para whiteboard, docs,
// sheets e slides, servidos a partir de /icons/png/{nome}.png — igual
// ao estilo do card "Comece a criar com" (Microsoft 365). O ícone do
// Assistente de IA e do Início mantêm o caminho anterior (svg/logo),
// já que não fazem parte deste pedido.
// O campo `color` deixou de ser usado no CreateTab (ícones já não têm
// círculo de fundo), mas é mantido caso outros ecrãs ainda dependam
// dele.
export const ALL_APPS = [
  { id: 'home', label: 'Início', icon: '/icons/png/logo.png', path: '/home/', color: '#D9D9D9' },
  { id: 'ai', label: 'Assistente de IA', icon: '/icons/svg/apps/ai.svg', path: '/ai/', color: '#862CD4' },
  { id: 'docs', label: 'Editor de Documentos', icon: '/icons/png/docs.png', path: '/docs/', color: '#D9D9D9' },
  { id: 'sheets', label: 'Folha de Cálculo', icon: '/icons/png/sheets.png', path: '/sheets/', color: '#23A63F' },
  { id: 'slides', label: 'Apresentações', icon: '/icons/png/slides.png', path: '/slides/', color: '#FB6704' },
  { id: 'whiteboard', label: 'Quadro Branco', icon: '/icons/png/whiteboard.png', path: '/whiteboard/', color: '#7630CA' },
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

// Botão central da bottom bar: NUNCA é um tab normal (não entra no
// router, não muda activeTab). Abre sempre o chat da Nexa IA como
// bottom-sheet modal por cima de tudo — é o único "app" da plataforma
// que se comporta assim; todos os outros (ver ALL_APPS) navegam para
// uma rota própria.
export const AI_FAB = {
  id: 'ai-modal',
  label: 'Assistente de IA',
  icon: '/icons/svg/apps/ai.svg',
};

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