import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getLlama, LlamaChatSession } from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(
  __dirname,
  "models",
  "qwen2.5-0.5b-instruct-q4_k_m.gguf"
);

const PORT = process.env.PORT || 3000;

let llama = null;
let model = null;
let context = null;
let isBusy = false;

async function initModel() {
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(
      `Modelo não encontrado em ${MODEL_PATH}. Rode "npm run download-model" primeiro.`
    );
  }

  console.log("Carregando modelo na memória...");
  llama = await getLlama();

  model = await llama.loadModel({
    modelPath: MODEL_PATH,
  });

  // contextSize baixo de propósito: cada token de contexto consome RAM.
  // 512MB é MUITO pouco, então mantemos o contexto pequeno.
  context = await model.createContext({
    contextSize: 512,
  });

  console.log("Modelo carregado e pronto.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    modelLoaded: model !== null,
    busy: isBusy,
  });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Campo 'message' é obrigatório." });
  }

  if (!model || !context) {
    return res.status(503).json({ error: "Modelo ainda não carregado." });
  }

  // Só processa uma requisição por vez: em 512MB não há margem
  // para geração concorrente.
  if (isBusy) {
    return res
      .status(429)
      .json({ error: "Servidor ocupado processando outra mensagem. Tente novamente em instantes." });
  }

  isBusy = true;

  try {
    const session = new LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt:
        "Você é um assistente virtual direto e objetivo. Responda em português de forma breve.",
    });

    const response = await session.prompt(message, {
      maxTokens: 200,
      temperature: 0.7,
    });

    res.json({ response });
  } catch (err) {
    console.error("Erro na geração:", err);
    res.status(500).json({ error: "Erro ao gerar resposta.", details: err.message });
  } finally {
    isBusy = false;
  }
});

async function start() {
  try {
    await initModel();
  } catch (err) {
    console.error("Falha ao inicializar modelo:", err.message);
    console.error("O servidor vai subir, mas /chat retornará erro 503 até o modelo carregar.");
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

start();