// src/home/lib/constants.js

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
    icon: '/icons/svg/create.svg',
    iconFilled: '/icons/svg/create_filled.svg',
  },
  {
    id: 'projects',
    label: 'Projetos',
    title: 'Projetos',
    icon: '/icons/svg/projects.svg',
    iconFilled: '/icons/svg/projects_filled.svg',
  },
  {
    id: 'templates',
    label: 'Templates',
    title: 'Templates',
    icon: '/icons/svg/templates.svg',
    iconFilled: '/icons/svg/templates_filled.svg',
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    title: 'Ferramentas',
    icon: '/icons/svg/tools.svg',
    iconFilled: '/icons/svg/tools_filled.svg',
  },
];

// Toggle usado no appbar do tab "Templates"
export const TEMPLATE_VIEWS = [
  { id: 'images', label: 'Imagens' },
  { id: 'documents', label: 'Documentos' },
];

// Modelos de documentos apresentados no toggle "Documentos" do tab Templates.
export const DOC_MODELS = [
  { id: 'doc-cv', label: 'Currículo', icon: '/icons/svg/pdf.svg', prompt: 'Cria um currículo profissional para ' },
  { id: 'doc-carta', label: 'Carta de Apresentação', icon: '/icons/svg/pdf.svg', prompt: 'Escreve uma carta de apresentação para ' },
  { id: 'doc-relatorio', label: 'Relatório', icon: '/icons/svg/pdf.svg', prompt: 'Cria um relatório sobre ' },
  { id: 'doc-contrato', label: 'Contrato', icon: '/icons/svg/pdf.svg', prompt: 'Redige um modelo de contrato de ' },
  { id: 'doc-ata', label: 'Ata de Reunião', icon: '/icons/svg/pdf.svg', prompt: 'Cria uma ata de reunião sobre ' },
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