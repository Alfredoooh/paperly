import fs from "fs";
import path from "path";
import https from "https";

const MODEL_DIR = path.join(process.cwd(), "models");
const MODEL_FILE = path.join(MODEL_DIR, "qwen2.5-0.5b-instruct-q4_k_m.gguf");
const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";

function download(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Muitos redirecionamentos ao baixar o modelo"));
      return;
    }
    
    const file = fs.createWriteStream(dest);
    
    https
      .get(url, (response) => {
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
          reject(new Error(`Falha ao baixar modelo: HTTP ${response.statusCode}`));
          return;
        }
        
        const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
        let downloadedBytes = 0;
        let lastPercent = -1;
        
        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.floor((downloadedBytes / totalBytes) * 100);
            if (percent !== lastPercent && percent % 10 === 0) {
              lastPercent = percent;
              console.log(`Download do modelo: ${percent}%`);
            }
          }
        });
        
        response.pipe(file);
        
        file.on("finish", () => {
          file.close(() => resolve());
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
    console.log("Modelo já existe, pulando download.");
    return;
  }
  
  console.log("Baixando modelo Qwen2.5-0.5B-Instruct (Q4_K_M, ~400MB)...");
  console.log(`URL: ${MODEL_URL}`);
  
  try {
    await download(MODEL_URL, MODEL_FILE);
    console.log("Download concluído:", MODEL_FILE);
  } catch (err) {
    console.error("Erro ao baixar o modelo:", err.message);
    process.exit(1);
  }
}

main();