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

  // Reduzido ao mínimo viável: contexto pequeno = menos KV cache = menos RAM.
  // Em 512MB, cada token de contexto extra custa caro.
  context = await model.createContext({
    contextSize: 256,
    batchSize: 128,
  });

  console.log("Modelo carregado e pronto.");
  logMemoryUsage("após carregar modelo");
}

function logMemoryUsage(label) {
  const mem = process.memoryUsage();
  console.log(
    `[memória ${label}] rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB ` +
      `heapUsed=${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB ` +
      `external=${(mem.external / 1024 / 1024).toFixed(1)}MB`
  );
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  logMemoryUsage("health check");
  res.json({
    status: "ok",
    modelLoaded: model !== null,
    busy: isBusy,
    memory: process.memoryUsage(),
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

  if (isBusy) {
    return res
      .status(429)
      .json({ error: "Servidor ocupado processando outra mensagem. Tente novamente em instantes." });
  }

  isBusy = true;
  logMemoryUsage("antes da geração");

  let session = null;
  let sequence = null;

  try {
    // Cria uma sequência nova a cada request e libera no final,
    // em vez de reusar uma sessão de longa duração que acumula estado.
    sequence = context.getSequence();

    session = new LlamaChatSession({
      contextSequence: sequence,
      systemPrompt:
        "Você é um assistente virtual direto e objetivo. Responda em português de forma breve.",
    });

    const response = await session.prompt(message, {
      maxTokens: 100,
      temperature: 0.7,
    });

    logMemoryUsage("depois da geração");
    res.json({ response });
  } catch (err) {
    console.error("Erro na geração - detalhes completos:");
    console.error("Nome:", err.name);
    console.error("Mensagem:", err.message);
    console.error("Stack:", err.stack);
    logMemoryUsage("no momento do erro");

    res.status(500).json({
      error: "Erro ao gerar resposta.",
      details: err.message,
      name: err.name,
    });
  } finally {
    // Libera a sequência explicitamente pra tentar recuperar memória
    try {
      if (sequence) {
        sequence.dispose();
      }
    } catch (disposeErr) {
      console.error("Erro ao liberar sequência:", disposeErr.message);
    }
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