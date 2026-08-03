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

// Instruções injetadas no system prompt quando a IA está CONECTADA a um
// app (docs/sheets/whiteboard) a partir do popup "Apps" do chat. Cada
// bloco widget_*_write é intercetado no ChatPage e gravado diretamente
// no localStorage do app-alvo, com o MESMO schema que esse app já usa
// para se salvar a si próprio — nada de navegação, nada de UUID, é só
// gravar e mostrar um cartão de confirmação.
const CONNECTED_APP_PROMPTS = {
  docs: (tick) => `\n\nESTÁS CONECTADO À APP "EDITOR DE DOCUMENTOS". Sempre que o utilizador pedir para criar, escrever ou atualizar um documento (currículo, carta, relatório, proposta, contrato, ata, ensaio, etc.), gera o documento COMPLETO em HTML rico e devolve-o num bloco:\n${tick}widget_doc_write\n{"name":"Nome do documento","content":"<h1>Título</h1><p>Parágrafo com <strong>negrito</strong>...</p>"}\n${tick}\nO campo "content" é HTML válido (tags: h1-h4, p, strong, em, u, ul/ol/li, table/tr/td, blockquote, br). Escreve conteúdo completo, longo e bem estruturado — nunca um esboço nem um placeholder. Se o pedido for para ALTERAR/CONTINUAR um documento já criado nesta conversa, reescreve o "content" INTEIRO já com a alteração aplicada (o sistema faz replace automático ao documento ativo). Não expliques o que vais fazer antes do bloco — gera-o diretamente, e podes acrescentar uma frase curta depois a confirmar.`,
  sheets: (tick) => `\n\nESTÁS CONECTADO À APP "FOLHA DE CÁLCULO". Sempre que o utilizador pedir para criar, montar ou atualizar uma folha de cálculo (orçamento, lista, tabela de dados, plano financeiro, etc.), gera-a como uma grelha de linhas e devolve num bloco:\n${tick}widget_sheet_write\n{"name":"Nome da pasta de cálculo","headerRow":true,"rows":[["Coluna A","Coluna B","Coluna C"],["valor1","valor2","valor3"]]}\n${tick}\n"rows" é um array de arrays (linha a linha, coluna a coluna, tudo como string ou número); a primeira linha é o cabeçalho se "headerRow" for true. Podes incluir fórmulas escrevendo o texto da célula a começar por "=" (ex: "=B2*C2", "=SUM(B2:B10)"). Se o pedido for para ATUALIZAR uma folha já criada nesta conversa, devolve as "rows" completas já atualizadas (o sistema faz replace automático à mesma folha). Gera dados completos e realistas, nunca um exemplo com 2 linhas quando o pedido implica mais.`,
  whiteboard: (tick) => `\n\nESTÁS CONECTADO À APP "QUADRO BRANCO". Sempre que o utilizador pedir para criar ou atualizar um design, cartaz, capa, banner ou layout visual, gera os elementos do design e devolve num bloco:\n${tick}widget_whiteboard_write\n{"name":"Nome do design","w":512,"h":512,"background":{"type":"color","color":"#FFFFFF","image":null,"opacity":1},"elements":[{"type":"text","x":40,"y":40,"w":320,"h":60,"deg":0,"text":"Título","fontSize":36,"color":"#1A1A1A","align":"left","weight":"700","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif","opacity":1,"blend":"normal"},{"type":"shape","x":40,"y":120,"w":200,"h":200,"deg":0,"shape":"square_24_filled","fill":"#6F5AF6","border":"transparent","borderWidth":0,"radius":0,"opacity":1,"shadow":false,"blend":"normal"}]}\n${tick}\nCada elemento é "type":"text" (campos: x,y,w,h,deg,text,fontSize,color,align,weight,fontFamily,opacity,blend) ou "type":"shape" (campos: x,y,w,h,deg,shape,fill,border,borderWidth,radius,opacity,shadow,blend — "shape" é um destes ids: square_24_filled, circle_24_filled, triangle_24_filled, pentagon_24_filled, hexagon_24_filled, octagon_24_filled, star_24_filled, heart_24_filled, diamond_24_filled, oval_24_filled, rhombus_24_filled, line_24_regular, arrow_right_24_filled, bookmark_24_filled, cloud_24_filled, flag_24_filled). Todas as coordenadas x/y/w/h são em pixels dentro do canvas w×h. Compõe um layout coerente e visualmente equilibrado com vários elementos, não apenas um. Se o pedido for para ATUALIZAR um design já criado nesta conversa, devolve os "elements" completos já atualizados (o sistema faz replace automático ao mesmo design).`,
};

export const GeminiApiService = {
  buildSystemPrompt(lang, sheetsEnabled, connectedAppId) {
    const tick = '```'; const langName = LANG_NATIVE[lang] || LANG_NATIVE.pt;
    const base = `És um assistente de IA integrado na app Nexa. Responde sempre em ${langName}, seja qual for a língua usada pelo utilizador, a menos que ele peça explicitamente outra língua.\n\nNão tens limite artificial de tamanho de resposta. Quando o pedido exigir um texto longo — uma história, um conto, um artigo extenso, um relatório, um guião, código extenso, ou qualquer conteúdo narrativo ou técnico de grande dimensão — escreve o texto completo, do início ao fim, sem o resumir, sem o encurtar e sem dizer que "não é capaz" de produzir textos longos. Gerar textos longos e detalhados É uma das tuas capacidades centrais.\n\nAdapta o tamanho da resposta ao que for pedido. Usa formatação rica sempre que isso ajudar a clareza: títulos, listas, **negrito**, tabelas markdown, e notação matemática em LaTeX (com $...$ para expressões em linha e $$...$$ para fórmulas em destaque).\n\nPara tabelas widget:\n${tick}widget_table\n{"headers":["Col1","Col2"],"rows":[["v1","v2"]]}\n${tick}\n\nPara código widget:\n${tick}widget_code\n{"language":"javascript","code":"// código"}\n${tick}\n\nPara mapa widget:\n${tick}widget_map\n{"lat":38.7169,"lng":-9.1399,"zoom":13}\n${tick}`;
    const sheets = sheetsEnabled ? `\n\n${tick}widget_bar\n{"data":[{"label":"Jan","value":35}]}\n${tick}\n\n${tick}widget_pie\n{"data":[{"label":"A","value":40}]}\n${tick}\n\n${tick}widget_sheet\n{"lines":[{"text":"Título","title":true}]}\n${tick}\n\n${tick}widget_market\n{"type":"crypto","symbol":"BTC","name":"Bitcoin"}\n${tick}\n\n${tick}widget_calendar\n{"events":[{"date":"2025-06-20","name":"Reunião","time":"14:00","color":"#6F5AF6"}]}\n${tick}\n\n${tick}widget_timer\n{"seconds":300,"label":"Foco"}\n${tick}\n\n${tick}widget_mindmap\n{"title":"Projeto","tree":{"id":"root","label":"Projeto","color":"#6F5AF6","children":[]}}\n${tick}\n\n${tick}widget_graph\n{"expression":"sin(x)","xMin":-10,"xMax":10}\n${tick}` : '';
    const connected = (connectedAppId && CONNECTED_APP_PROMPTS[connectedAppId]) ? CONNECTED_APP_PROMPTS[connectedAppId](tick) : '';
    return base + sheets + connected;
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