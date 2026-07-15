import fs from "fs";
import path from "path";
import https from "https";

const MODEL_DIR = path.join(process.cwd(), "models");
const MODEL_FILE = path.join(MODEL_DIR, "qwen2.5-0.5b-instruct-q4_k_m.gguf");
const MODEL_URL =
  "https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf?download=true";
const MIN_EXPECTED_BYTES = 300 * 1024 * 1024; // 300MB - abaixo disso é erro/lixo

function download(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) {
      reject(new Error("Muitos redirecionamentos ao baixar o modelo"));
      return;
    }
    
    const file = fs.createWriteStream(dest);
    
    https
      .get(url, { headers: { "User-Agent": "node-download-script" } }, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlinkSync(dest);
          download(response.headers.location, dest, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(
            new Error(
              `Falha ao baixar modelo: HTTP ${response.statusCode} - ${response.statusMessage}`
            )
          );
          return;
        }
        
        const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
        console.log(`Content-Length informado pelo servidor: ${totalBytes} bytes`);
        
        let downloadedBytes = 0;
        let lastPercent = -1;
        
        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.floor((downloadedBytes / totalBytes) * 100);
            if (percent !== lastPercent && percent % 10 === 0) {
              lastPercent = percent;
              console.log(`Download do modelo: ${percent}% (${downloadedBytes} bytes)`);
            }
          }
        });
        
        response.pipe(file);
        
        file.on("finish", () => {
          file.close(() => resolve(downloadedBytes));
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function main() {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }
  
  if (fs.existsSync(MODEL_FILE)) {
    const stats = fs.statSync(MODEL_FILE);
    if (stats.size >= MIN_EXPECTED_BYTES) {
      console.log(`Modelo já existe e parece válido (${stats.size} bytes). Pulando download.`);
      return;
    } else {
      console.log(`Arquivo existente é muito pequeno (${stats.size} bytes). Baixando novamente.`);
      fs.unlinkSync(MODEL_FILE);
    }
  }
  
  console.log("Baixando modelo Qwen2.5-0.5B-Instruct (Q4_K_M, ~400MB)...");
  console.log(`URL: ${MODEL_URL}`);
  
  try {
    await download(MODEL_URL, MODEL_FILE);
    
    const stats = fs.statSync(MODEL_FILE);
    if (stats.size < MIN_EXPECTED_BYTES) {
      console.error(
        `ERRO: arquivo baixado tem apenas ${stats.size} bytes, esperado pelo menos ${MIN_EXPECTED_BYTES} bytes.`
      );
      const preview = fs.readFileSync(MODEL_FILE, "utf-8").slice(0, 500);
      console.error("Conteúdo recebido (preview):", preview);
      fs.unlinkSync(MODEL_FILE);
      process.exit(1);
    }
    
    console.log("Download concluído e validado:", MODEL_FILE, `(${stats.size} bytes)`);
  } catch (err) {
    console.error("Erro ao baixar o modelo:", err.message);
    process.exit(1);
  }
}

main();