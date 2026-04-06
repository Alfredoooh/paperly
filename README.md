# Editor — SvelteKit

Editor de texto rico convertido de HTML puro para SvelteKit.

## Tecnologias

- **SvelteKit** — framework principal
- **@sveltejs/adapter-static** — gera output estático (pasta `build/`)
- **Vite** — bundler

## Desenvolvimento local

```bash
npm install
npm run dev
```

Acede em `http://localhost:5173`

## Build de produção

```bash
npm install
npm run build
```

O output fica na pasta `build/`.

---

## Deploy no Render (Static Site)

1. Faz push do projecto para um repositório GitHub
2. No Render, cria um novo **Static Site**
3. Liga ao teu repositório
4. Preenche os campos:

| Campo | Valor |
|---|---|
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `build` |

5. Clica em **Create Static Site**

O Render faz build automático a cada push para a branch principal.

---

## Estrutura do projecto

```
editor-svelte/
├── src/
│   ├── app.css          ← estilos globais
│   ├── app.html         ← template HTML base
│   └── routes/
│       ├── +layout.js   ← prerender = true
│       ├── +layout.svelte
│       └── +page.svelte ← editor principal
├── static/
│   └── favicon.png
├── svelte.config.js     ← adapter-static
├── vite.config.js
└── package.json
```

## Funcionalidades

- Editor de texto rico (contenteditable)
- Toolbar flutuante em pill com scroll horizontal
- Modo IA integrado (Claude API)
- Seleção de fonte (60+ fontes Google)
- Seleção de tamanho com stepper e presets
- Estilos de parágrafo (H1–H4, citação, código)
- Alinhamento, listas, indentação
- Inserir: link, imagem, tabela, linha, data, caixas de destaque
- Formatar: maiúsculas, sobrescrito, subscrito, espaçamento
- Menu de selecção contextual
- Redimensionamento e flutuação de imagens
- Drawer lateral com modo A4 e toggle IA
- Zoom adaptativo ao ecrã
