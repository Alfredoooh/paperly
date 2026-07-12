const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 8 * 1024 * 1024 } });

const PORT = process.env.PORT || 10000;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "2mb" }));

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} falhou: ${stderr || err.message}`));
        return;
      }
      resolve(stdout);
    });
  });
}

function limparArquivos(lista) {
  lista.forEach((p) => {
    if (p) fs.unlink(p, () => {});
  });
}

function converterPtParaPx(svgContent) {
  let resultado = svgContent;
  
  resultado = resultado.replace(/width="([\d.]+)pt"/, (match, valor) => {
    return `width="${Math.round(parseFloat(valor))}px"`;
  });
  
  resultado = resultado.replace(/height="([\d.]+)pt"/, (match, valor) => {
    return `height="${Math.round(parseFloat(valor))}px"`;
  });
  
  if (!/viewBox=/.test(resultado)) {
    const wMatch = resultado.match(/width="([\d.]+)px"/);
    const hMatch = resultado.match(/height="([\d.]+)px"/);
    if (wMatch && hMatch) {
      resultado = resultado.replace(
        "<svg",
        `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`
      );
    }
  }
  
  return resultado;
}

function svgTemConteudo(svgContent) {
  return /<path/.test(svgContent);
}

// Ajusta a espessura da linha via morfologia binária, antes do potrace.
// espessura > 0 engrossa (Dilate), < 0 afina (Erode), 0 não altera.
async function prepararBitmap(inputPath, pbmPath, cores, thresholdPercent, espessura) {
  const flatPath = pbmPath.replace(".pbm", "_flat.png");
  const bmpPath = pbmPath.replace(".pbm", ".bmp");
  const morphPath = pbmPath.replace(".pbm", "_morph.bmp");
  
  await run("convert", [
    inputPath,
    "-background", "white",
    "-alpha", "remove",
    "-alpha", "off",
    "-colors", String(cores),
    "-normalize",
    flatPath
  ]);
  
  await run("convert", [flatPath, "-colorspace", "Gray", bmpPath]);
  await run("convert", [bmpPath, "-threshold", `${thresholdPercent}%`, morphPath]);
  
  const nivel = Math.max(-10, Math.min(10, parseInt(espessura, 10) || 0));
  if (nivel !== 0) {
    const raio = Math.min(6, Math.abs(nivel));
    const operacao = nivel > 0 ? "Dilate" : "Erode";
    await run("convert", [morphPath, "-morphology", operacao, `Disk:${raio}`, pbmPath]);
  } else {
    await run("convert", [morphPath, pbmPath]);
  }
  
  fs.unlink(flatPath, () => {});
  fs.unlink(bmpPath, () => {});
  fs.unlink(morphPath, () => {});
}

async function converterComFallback(inputPath, pbmPath, svgPath, opts) {
  const tentativas = [
    { cores: opts.cores, threshold: 50, opttolerance: opts.opttolerance, turdsize: opts.turdsize, alphamax: 1 },
    { cores: opts.cores, threshold: 35, opttolerance: opts.opttolerance, turdsize: opts.turdsize, alphamax: 1 },
    { cores: opts.cores, threshold: 65, opttolerance: opts.opttolerance, turdsize: 2, alphamax: 1 },
    { cores: Math.max(opts.cores, 8), threshold: 50, opttolerance: 0.2, turdsize: 0, alphamax: 1 }
  ];
  
  let ultimoErro = null;
  
  for (const tentativa of tentativas) {
    try {
      await prepararBitmap(inputPath, pbmPath, tentativa.cores, tentativa.threshold, opts.espessura);
      
      await run("potrace", [
        pbmPath,
        "-s",
        "-o", svgPath,
        "--flat",
        "--opttolerance", String(tentativa.opttolerance),
        "--turdsize", String(tentativa.turdsize),
        "--alphamax", String(tentativa.alphamax)
      ]);
      
      const conteudo = fs.readFileSync(svgPath, "utf8");
      if (svgTemConteudo(conteudo)) {
        return conteudo;
      }
      ultimoErro = new Error("SVG gerado sem paths (imagem resultou em bitmap vazio)");
    } catch (err) {
      ultimoErro = err;
    }
  }
  
  throw ultimoErro || new Error("Não foi possível vetorizar a imagem após várias tentativas");
}

app.get("/", (req, res) => {
  res.json({ status: "ok", utils: ["POST /convert"] });
});

// PNG → SVG (JSON)
app.post("/convert", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PNG no campo 'file'" });
  
  const cores = parseInt(req.body.cores || req.query.cores || "4", 10);
  const opttolerance = parseFloat(req.body.opttolerance || req.query.opttolerance || "0.5");
  const turdsize = parseInt(req.body.turdsize || req.query.turdsize || "5", 10);
  const espessura = parseInt(req.body.espessura || req.query.espessura || "0", 10);
  
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const pbmPath = path.join(os.tmpdir(), `${id}.pbm`);
  const svgPath = path.join(os.tmpdir(), `${id}.svg`);
  
  try {
    const svgBruto = await converterComFallback(inputPath, pbmPath, svgPath, { cores, opttolerance, turdsize, espessura });
    const svgFinal = converterPtParaPx(svgBruto);
    res.json({ sucesso: true, tamanho_bytes: Buffer.byteLength(svgFinal, "utf8"), svg: svgFinal });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, pbmPath, svgPath]);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});