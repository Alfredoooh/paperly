// src/shared/doc-models.js
// Modelos de documentos (formato A4) exibidos na tab "Documentos".
// Cada thumbnail deve ser colocado em: static/images/docs_models/
// Tamanho recomendado do thumbnail: 794 x 1123 px (proporção A4 a 96dpi) ou 1240 x 1754 px (150dpi, mais nítido em ecrãs retina).

export const DOC_MODELS = [
  {
    id: 'curriculo-simples',
    name: 'Currículo Simples',
    thumb: '/images/docs_models/curriculo-simples.png',
  },
  {
    id: 'carta-apresentacao',
    name: 'Carta de Apresentação',
    thumb: '/images/docs_models/carta-apresentacao.png',
  },
  {
    id: 'relatorio-academico',
    name: 'Relatório Académico',
    thumb: '/images/docs_models/relatorio-academico.png',
  },
  {
    id: 'proposta-negocio',
    name: 'Proposta de Negócio',
    thumb: '/images/docs_models/proposta-negocio.png',
  },
  {
    id: 'fatura-simples',
    name: 'Fatura Simples',
    thumb: '/images/docs_models/fatura-simples.png',
  },
  {
    id: 'certificado',
    name: 'Certificado',
    thumb: '/images/docs_models/certificado.png',
  },
];