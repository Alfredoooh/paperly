export const API_BASE = 'https://ipc.alfredopjonas.workers.dev';

export const AuthApiService = {
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao iniciar sessão');
    return data;
  },
  async register(name, email, password, extra) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ name, email, password }, extra || {}))
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
    return data;
  },
  async loginWithGoogle(idToken) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro Google');
    return data;
  },
  async logout(token) {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) {}
  },
  async logoutAll(token) {
    try {
      const res = await fetch(`${API_BASE}/auth/logout-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      return res.ok;
    } catch (e) { return false; }
  },
  async listConversations(token) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json();
      return data.conversations || [];
    } catch (e) { return []; }
  },
  async createConversation(token, title, messages) {
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, messages })
      });
      if (!res.ok) return null;
      const data = await res.json(); return data.id || null;
    } catch (e) { return null; }
  },
  async updateConversation(token, id, title, messages) {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, messages })
      });
    } catch (e) {}
  },
  async deleteConversation(token, id) {
    try { await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); } catch (e) {}
  },
  async pinConversation(token, id, pinned) {
    try {
      await fetch(`${API_BASE}/conversations/${id}/pin`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ pinned })
      });
    } catch (e) {}
  },
};

export const CreditsApiService = {
  async getBalance(token) {
    try {
      const res = await fetch(`${API_BASE}/credits/balance`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) return null; return await res.json();
    } catch (e) { return null; }
  },
  async checkout(token, packageId) {
    const res = await fetch(`${API_BASE}/credits/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ package: packageId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro checkout');
    return data;
  },
};

export const ProfileApiService = {
  async getMe(token) {
    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar perfil');
    return data;
  },
  async updateAccount(token, { name, password, preferences }) {
    const body = {};
    if (name !== undefined) body.name = name;
    if (password !== undefined) body.password = password;
    if (preferences !== undefined) body.preferences = preferences;
    const res = await fetch(`${API_BASE}/user/me`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar conta');
    return data;
  },
  async updateProfile(token, profileFields) {
    const res = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(profileFields)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar perfil');
    return data;
  },
  async updateAvatar(token, avatarBase64) {
    const res = await fetch(`${API_BASE}/user/avatar`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ avatar: avatarBase64 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar avatar');
    return data;
  },
};

export const AdminApiService = {
  async getStats(token) {
    const res = await fetch(`${API_BASE}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar estatísticas');
    return data;
  },
  async listUsers(token, cursor) {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const res = await fetch(`${API_BASE}/admin/users${qs}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao listar utilizadores');
    return data;
  },
  async getUser(token, id) {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar utilizador');
    return data;
  },
  async deleteUser(token, id) {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao eliminar utilizador');
    return data;
  },
  async setBlocked(token, id, blocked) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/block`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ blocked })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao bloquear/desbloquear');
    return data;
  },
  async setCredits(token, id, credits) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/credits`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ credits })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao atualizar créditos');
    return data;
  },
  async getUserConversations(token, id) {
    const res = await fetch(`${API_BASE}/admin/users/${id}/conversations`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar conversas');
    return data;
  },
  async notify(token, { userIds, email, subject, message }) {
    const body = { subject, message };
    if (userIds) body.userIds = userIds;
    if (email) body.email = email;
    const res = await fetch(`${API_BASE}/admin/notify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar notificação');
    return data;
  },
};

const LANG_NATIVE = {
  pt:'português europeu','pt-BR':'português do Brasil',en:'English',es:'español',
  fr:'français',de:'Deutsch',it:'italiano',nl:'Nederlands',ru:'русский',
  zh:'中文（简体）',ja:'日本語',ko:'한국어',ar:'العربية',hi:'हिन्दी',
  tr:'Türkçe',pl:'polski',sv:'svenska',uk:'українська',
};

// ── Instruções por app "conectada" (toggle Apps do chat) ────────────
// Cada bloco ensina ao modelo o formato JSON EXATO que os ficheiros
// reais (docs/App, sheets/App, whiteboard/App) sabem interpretar.
// Isto tem de ficar 100% sincronizado com o parser em
// ai/pages/ChatPage.svelte (renderNativeAppContent) e com o formato
// de dados nativo de cada app (docs/components/DocPage.svelte
// getContent/setContent, sheets/lib/sheet-store.js,
// whiteboard/pages/MainPage.svelte handleApplyTemplate).
function buildAppInstructions(tick, appId) {
  if (appId === 'docs') {
    return `\n\n── MODO DOCUMENTO (app "docs" ligada) ──\nSempre que o pedido envolver criar, redigir ou reescrever um documento (currículo, carta, relatório, proposta, contrato, fatura, ata, ensaio, artigo, etc.), gera o documento REAL num bloco especial ${tick}docs_content, além de qualquer explicação breve que quiras dar em texto normal. NÃO escrevas o documento em markdown normal quando este modo está ativo — usa sempre o bloco especial, porque é ele que permite ao utilizador aplicar o conteúdo diretamente no editor de documentos.\n\nFormato EXATO (JSON dentro do bloco):\n${tick}docs_content\n{\n  "title": "Nome do documento",\n  "html": "<h1>Título Principal</h1><p>Parágrafo introdutório bem escrito, com <strong>negrito</strong> e <em>itálico</em> onde fizer sentido.</p><h2>Secção</h2><p>Mais conteúdo...</p><ul><li>Item 1</li><li>Item 2</li></ul>"\n}\n${tick}\n\nRegras de formatação do campo "html" (obrigatórias para ficar profissional e bem estilizado):\n- Usa <h1> APENAS uma vez para o título principal do documento; <h2> para secções; <h3> para subsecções.\n- Usa <p> para todos os parágrafos de texto corrido — nunca deixes texto solto fora de uma tag.\n- Usa <strong> para negrito e <em> para itálico com critério, para destacar nomes, datas, valores e termos-chave.\n- Usa <ul>/<li> para listas simples e <ol>/<li> para listas numeradas/passos.\n- Para tabelas (ex: currículo com competências, fatura com itens, comparação de preços), usa exatamente este formato de tabela HTML nativo do editor:\n  <div class="doc-table-wrap" contenteditable="false"><table class="doc-table"><tbody><tr><td contenteditable="true"><strong>Cabeçalho 1</strong></td><td contenteditable="true"><strong>Cabeçalho 2</strong></td></tr><tr><td contenteditable="true">Valor 1</td><td contenteditable="true">Valor 2</td></tr></tbody></table></div><p><br></p>\n- Para separar o documento em várias páginas A4 (ex: relatórios longos, propostas com capa separada), usa exatamente este separador entre o HTML de cada página: <div class="page-break-marker"></div>\n- Estrutura sempre o documento como alguém profissional o faria: título/cabeçalho claro, introdução, corpo bem dividido por secções, conclusão ou assinatura quando aplicável. Nunca devolvas texto simples sem qualquer tag HTML.\n- O campo "title" deve ser um nome curto e descritivo (aparece como nome do ficheiro no editor).\n- Podes emitir vários blocos ${tick}docs_content na mesma resposta se o utilizador pedir documentos diferentes de uma vez; cada um vira um cartão "Aplicar" separado.`;
  }
  if (appId === 'sheets') {
    return `\n\n── MODO FOLHA DE CÁLCULO (app "sheets" ligada) ──\nSempre que o pedido envolver criar uma folha de cálculo, orçamento, tabela de dados, plano financeiro, cronograma, controlo de gastos, ou qualquer análise tabular com números, gera a folha REAL num bloco especial ${tick}sheets_content, além de qualquer explicação breve em texto normal. NÃO uses ${tick}widget_table nem markdown normal para isto quando este modo está ativo — usa sempre o bloco especial, porque é ele que aplica os dados diretamente na app de folha de cálculo, com fórmulas funcionais e formatação real.\n\nFormato EXATO (JSON dentro do bloco):\n${tick}sheets_content\n{\n  "name": "Nome da pasta de cálculo",\n  "sheets": [\n    {\n      "name": "Folha1",\n      "cells": {\n        "A1": {"raw": "Produto", "bold": true, "fill": "#EEF2FF"},\n        "B1": {"raw": "Quantidade", "bold": true, "fill": "#EEF2FF"},\n        "C1": {"raw": "Preço Unit.", "bold": true, "fill": "#EEF2FF"},\n        "D1": {"raw": "Total", "bold": true, "fill": "#EEF2FF"},\n        "A2": {"raw": "Produto A"},\n        "B2": {"raw": "10"},\n        "C2": {"raw": "5.5"},\n        "D2": {"raw": "=B2*C2"},\n        "D5": {"raw": "=SUM(D2:D4)", "bold": true}\n      },\n      "colWidths": {"0": 140}\n    }\n  ]\n}\n${tick}\n\nRegras obrigatórias:\n- Endereços de célula no formato "A1", "B2", etc. (coluna+linha, tal como no Excel), dentro do objeto "cells".\n- Cada célula é um objeto com pelo menos "raw" (o valor ou fórmula). Campos opcionais por célula: "bold" (true/false), "italic" (true/false), "align" ("left"/"center"/"right"), "color" (hex do texto), "fill" (hex do fundo), "format" ("general"/"integer"/"decimal2"/"currency"/"percent").\n- Fórmulas começam sempre por "=" e usam sintaxe Excel-like: =SUM(A1:A10), =AVERAGE(...), =A1*B1, =A1+B1-C1, =IF(A1>10,"Alto","Baixo"), =COUNT(...), =MAX(...), =MIN(...). Usa fórmulas reais sempre que houver totais, médias, percentagens ou cálculos — nunca escrevas o número já calculado à mão quando podes calcular por fórmula.\n- Cabeçalhos de tabela devem ter "bold": true e idealmente um "fill" suave (ex: "#EEF2FF", "#F0FDF4") para se destacarem visualmente, tal como uma folha de cálculo profissional.\n- Podes criar múltiplas abas dentro do array "sheets" (ex: uma aba "Resumo" e outra "Detalhe").\n- "colWidths" é opcional, no formato {"índice_da_coluna_a_partir_de_0": largura_em_px}; usa para dar mais espaço a colunas com texto mais longo (ex. nomes de produtos).\n- Nunca deixes uma coluna de totais sem fórmula: usa sempre =SUM(...) ou o cálculo em fórmula relativa à linha (ex: "=B2*C2").`;
  }
  if (appId === 'whiteboard') {
    return `\n\n── MODO QUADRO BRANCO / DESIGN (app "whiteboard" ligada) ──\nSempre que o pedido envolver criar um design visual — flyer, cartaz, post para redes sociais, story, banner, convite, capa, apresentação visual de uma ideia, mapa mental visual, mockup simples — gera o design REAL num bloco especial ${tick}whiteboard_content, além de qualquer explicação breve em texto normal. NÃO tentes descrever o design apenas em texto quando este modo está ativo — usa sempre o bloco especial, porque é ele que desenha o design diretamente no quadro branco com elementos reais, editáveis e bem posicionados.\n\nFormato EXATO (JSON dentro do bloco):\n${tick}whiteboard_content\n{\n  "name": "Nome do design",\n  "w": 1080,\n  "h": 1080,\n  "background": {"type": "color", "color": "#0F6CBD", "opacity": 1},\n  "elements": [\n    {"type": "text", "x": 90, "y": 380, "w": 900, "h": 200, "deg": 0, "text": "GRANDE\\nPROMOÇÃO", "fontSize": 96, "color": "#FFFFFF", "align": "left", "weight": "800", "fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", "opacity": 1},\n    {"type": "shape", "x": 780, "y": 70, "w": 220, "h": 220, "deg": 0, "shape": "circle_24_filled", "fill": "#FFB900", "border": "transparent", "borderWidth": 0, "radius": 0, "opacity": 1, "shadow": false}\n  ]\n}\n${tick}\n\nRegras obrigatórias sobre dimensões (escolhe consoante o pedido):\n- Post quadrado (Instagram feed): w=1080, h=1080.\n- Story/Reel vertical (Instagram/TikTok): w=1080, h=1920.\n- Flyer/cartaz A4 para imprimir: w=794, h=1123.\n- Banner horizontal largo: w=1200, h=628.\n- Se o utilizador pedir outra proporção específica, respeita-a.\n\nRegras sobre "background": {"type":"color","color":"#hex","opacity":1} para cor sólida (mais comum e mais seguro). Escolhe uma cor de fundo coerente com o tema do design (ex: vibrante para promoções, escura e elegante para stories minimalistas, clara para convites formais).\n\nRegras sobre elementos de texto ("type":"shape" NÃO se aplica a texto):\n- Campos obrigatórios: type, x, y, w, h, deg (normalmente 0), text, fontSize, color, align ("left"/"center"/"right"), weight ("400" a "800"), fontFamily, opacity (normalmente 1).\n- Usa "\\n" dentro de "text" para quebras de linha propositadas em títulos grandes.\n- Hierarquia tipográfica: título principal fontSize 60–100 e weight "800"; subtítulo fontSize 28–40 e weight "500"/"600"; texto de apoio fontSize 18–24 e weight "400". Cria sempre contraste de tamanho entre título e o resto.\n- As coordenadas x/y são o canto superior esquerdo da caixa de texto em píxeis dentro da tela w×h; garante que nada fica fora dos limites e que os elementos não se sobrepõem de forma ilegível.\n\nRegras sobre elementos de forma ("type":"shape"):\n- Campos obrigatórios: type, x, y, w, h, deg, shape, fill, border ("transparent" se sem contorno), borderWidth (0 se sem contorno), radius (cantos arredondados em px, só relevante para "square_24_filled"), opacity, shadow (true/false).\n- Valores válidos para "shape": square_24_filled, circle_24_filled, triangle_24_filled, pentagon_24_filled, hexagon_24_filled, octagon_24_filled, star_24_filled, heart_24_filled, diamond_24_filled, oval_24_filled, rhombus_24_filled, line_24_regular, arrow_right_24_filled, bookmark_24_filled, cloud_24_filled, flag_24_filled. Não inventes outros valores.\n- Usa formas como blocos de cor decorativos, faixas de destaque (ex: um square_24_filled largo e baixo no topo como faixa colorida), círculos decorativos, ou divisores (line_24_regular fino).\n\nComposição geral (para ficar com aspeto de template profissional, tipo Canva):\n- Cria sempre pelo menos um elemento de forma decorativo além do texto, para o design não parecer só "texto em cima de fundo".\n- Usa uma paleta coerente: 1 cor de fundo, 1 cor de destaque para formas, branco ou cor de alto contraste para o texto principal.\n- Ordena os elementos no array "elements" da camada mais ao fundo para a mais à frente (ex: faixas/formas de fundo primeiro, texto por cima).\n- Podes gerar vários blocos ${tick}whiteboard_content na mesma resposta se o utilizador pedir vários designs/variações de uma vez; cada um vira um cartão "Aplicar" separado.`;
  }
  return '';
}

export const GeminiApiService = {
  // connectedApps: array de ids ligados no popup "Apps" do chat, ex.
  // ['sheets'] ou ['docs','whiteboard']. Mantém compatibilidade com
  // chamadas antigas que passavam um boolean (sheetsEnabled).
  buildSystemPrompt(lang, connectedApps) {
    const tick = '```'; const langName = LANG_NATIVE[lang] || LANG_NATIVE.pt;
    const apps = connectedApps === true ? ['sheets'] : (Array.isArray(connectedApps) ? connectedApps : []);
    const base = `És um assistente de IA integrado na app Nexa. Responde sempre em ${langName}, seja qual for a língua usada pelo utilizador, a menos que ele peça explicitamente outra língua.\n\nNão tens limite artificial de tamanho de resposta. Quando o pedido exigir um texto longo — uma história, um conto, um artigo extenso, um relatório, um guião, código extenso, ou qualquer conteúdo narrativo ou técnico de grande dimensão — escreve o texto completo, do início ao fim, sem o resumir, sem o encurtar e sem dizer que "não é capaz" de produzir textos longos. Gerar textos longos e detalhados É uma das tuas capacidades centrais.\n\nAdapta o tamanho da resposta ao que for pedido. Usa formatação rica sempre que isso ajudar a clareza: títulos, listas, **negrito**, tabelas markdown, e notação matemática em LaTeX (com $...$ para expressões em linha e $$...$$ para fórmulas em destaque).\n\nPara tabelas widget:\n${tick}widget_table\n{"headers":["Col1","Col2"],"rows":[["v1","v2"]]}\n${tick}\n\nPara código widget:\n${tick}widget_code\n{"language":"javascript","code":"// código"}\n${tick}\n\nPara mapa widget:\n${tick}widget_map\n{"lat":38.7169,"lng":-9.1399,"zoom":13}\n${tick}`;
    const sheetsWidgets = apps.includes('sheets') ? `\n\n${tick}widget_bar\n{"data":[{"label":"Jan","value":35}]}\n${tick}\n\n${tick}widget_pie\n{"data":[{"label":"A","value":40}]}\n${tick}\n\n${tick}widget_sheet\n{"lines":[{"text":"Título","title":true}]}\n${tick}\n\n${tick}widget_market\n{"type":"crypto","symbol":"BTC","name":"Bitcoin"}\n${tick}\n\n${tick}widget_calendar\n{"events":[{"date":"2025-06-20","name":"Reunião","time":"14:00","color":"#6F5AF6"}]}\n${tick}\n\n${tick}widget_timer\n{"seconds":300,"label":"Foco"}\n${tick}\n\n${tick}widget_mindmap\n{"title":"Projeto","tree":{"id":"root","label":"Projeto","color":"#6F5AF6","children":[]}}\n${tick}\n\n${tick}widget_graph\n{"expression":"sin(x)","xMin":-10,"xMax":10}\n${tick}` : '';
    const appBlocks = ['docs', 'sheets', 'whiteboard']
      .filter(id => apps.includes(id))
      .map(id => buildAppInstructions(tick, id))
      .join('');
    const appsHeader = appBlocks
      ? `\n\n═══════════════════════════════════════════\nMODOS DE CRIAÇÃO DIRETA ATIVOS\nO utilizador ligou o(s) seguinte(s) toggle(s) de app no chat: ${apps.filter(a=>['docs','sheets','whiteboard'].includes(a)).join(', ')}. Isto significa que, para pedidos relacionados, deves gerar conteúdo REAL e aplicável nessa(s) app(s) usando os blocos especiais descritos abaixo, em vez de apenas descrever o conteúdo em prosa. O utilizador vai ver um cartão de pré-visualização com um botão para aplicar o conteúdo diretamente na app correspondente.\n═══════════════════════════════════════════${appBlocks}`
      : '';
    return base + sheetsWidgets + appsHeader;
  },
  async * streamChat({ messages, systemPrompt, token, think, language }) {
    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages, stream: true, systemPrompt, think, language: language || 'pt' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 || data.error === 'credits_exhausted') { yield { type: 'credits_exhausted' }; return; }
        yield { type: 'error', message: `Erro ${res.status}` }; return;
      }
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let buffer = ''; let fullText = '';
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') { yield { type: 'done', fullText }; return; }
          try {
            const json = JSON.parse(raw); const candidates = json.candidates;
            if (!candidates?.length) continue;
            const parts = candidates[0].content?.parts || [];
            for (const part of parts) {
              const text = part.text || ''; if (!text) continue;
              if (part.thought) { yield { type: 'think', text }; }
              else { fullText += text; yield { type: 'token', text }; }
            }
            const fin = candidates[0].finishReason;
            if (fin === 'STOP' || fin === 'MAX_TOKENS') { yield { type: 'done', fullText }; return; }
          } catch (e) {}
        }
      }
      yield { type: 'done', fullText };
    } catch (e) { yield { type: 'error', message: 'Erro de rede: ' + e.message }; }
  },
  async generateTitle(message, token, language) {
    try {
      const res = await fetch(`${API_BASE}/ai/title`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message, language: language || 'pt' })
      });
      if (res.ok) { const data = await res.json(); return data.title || message.trim().split(/\s+/).slice(0,4).join(' ').substring(0,40); }
    } catch (e) {}
    return message.trim().split(/\s+/).slice(0,4).join(' ').substring(0,40);
  },
};