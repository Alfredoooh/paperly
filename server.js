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
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "2mb" }));

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 1024 * 1024 * 50 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd} falhou: ${stderr || err.message}`));
      resolve(stdout);
    });
  });
}

function limparArquivos(lista) {
  lista.forEach((p) => { if (p) fs.unlink(p, () => {}); });
}

function converterPtParaPx(svgContent) {
  let resultado = svgContent;
  resultado = resultado.replace(/width="([\d.]+)pt"/, (_, v) => `width="${Math.round(parseFloat(v))}px"`);
  resultado = resultado.replace(/height="([\d.]+)pt"/, (_, v) => `height="${Math.round(parseFloat(v))}px"`);
  if (!/viewBox=/.test(resultado)) {
    const wMatch = resultado.match(/width="([\d.]+)px"/);
    const hMatch = resultado.match(/height="([\d.]+)px"/);
    if (wMatch && hMatch) {
      resultado = resultado.replace("<svg", `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
    }
  }
  return resultado;
}

function svgTemConteudo(svgContent) {
  return /<path/.test(svgContent);
}

async function extrairPaleta(inputPath, paletaPath, cores) {
  await run("convert", [
    inputPath,
    "-background", "white",
    "-alpha", "remove",
    "-alpha", "off",
    "-dither", "None",
    "-colors", String(cores),
    paletaPath
  ]);
  const saida = await run("convert", [paletaPath, "-unique-colors", "txt:-"]);
  const linhas = saida.split("\n").filter((l) => l.includes("srgb") || l.includes("#"));
  const hexes = [];
  for (const linha of linhas) {
    const m = linha.match(/#([0-9A-Fa-f]{6})/);
    if (m) hexes.push(`#${m[1]}`);
  }
  return { paletaPath, hexes: [...new Set(hexes)] };
}

async function isolarCorEmMascara(paletaPath, hex, mascaraPath) {
  await run("convert", [
    paletaPath,
    "-fuzz", "8%",
    "-fill", "white",
    "+opaque", hex,
    "-fill", "black",
    "-opaque", hex,
    mascaraPath
  ]);
}

async function vetorizarMascara(mascaraPath, svgPath, opttolerance, turdsize) {
  await run("potrace", [
    mascaraPath,
    "-s",
    "-o", svgPath,
    "--flat",
    "--opttolerance", String(opttolerance),
    "--turdsize", String(turdsize),
    "--alphamax", "1"
  ]);
  return fs.readFileSync(svgPath, "utf8");
}

function extrairPathsDoSvg(svgContent) {
  const matches = svgContent.match(/<path[^>]*\/>/g) || [];
  return matches;
}

function extrairDimensoes(svgContent) {
  const w = svgContent.match(/width="([\d.]+)pt"/);
  const h = svgContent.match(/height="([\d.]+)pt"/);
  return {
    width: w ? Math.round(parseFloat(w[1])) : null,
    height: h ? Math.round(parseFloat(h[1])) : null
  };
}

async function converterColoridoComFallback(inputPath, id, opts) {
  const paletaPath = path.join(os.tmpdir(), `${id}_paleta.png`);
  const arquivosTemp = [paletaPath];
  
  const tentativasCores = [opts.cores, Math.max(4, opts.cores - 2), Math.min(16, opts.cores + 4), 4, 2];
  const tentativasTurdsize = [opts.turdsize, 2, 0];
  let ultimoErro = null;
  
  for (const numCores of tentativasCores) {
    try {
      const { hexes } = await extrairPaleta(inputPath, paletaPath, numCores);
      if (hexes.length === 0) throw new Error("Não foi possível extrair paleta de cores");
      
      let dimensoes = null;
      const camadas = [];
      
      for (const hex of hexes) {
        const mascaraPath = path.join(os.tmpdir(), `${id}_${hex.replace("#", "")}.png`);
        const svgTempPath = path.join(os.tmpdir(), `${id}_${hex.replace("#", "")}.svg`);
        arquivosTemp.push(mascaraPath, svgTempPath);
        
        await isolarCorEmMascara(paletaPath, hex, mascaraPath);
        
        let svgCamada = null;
        for (const t of tentativasTurdsize) {
          try {
            const tentativa = await vetorizarMascara(mascaraPath, svgTempPath, opts.opttolerance, t);
            if (svgTemConteudo(tentativa)) {
              svgCamada = tentativa;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!svgCamada) continue;
        
        if (!dimensoes) dimensoes = extrairDimensoes(svgCamada);
        
        const paths = extrairPathsDoSvg(svgCamada);
        for (const p of paths) {
          const pathComCor = p.replace("<path", `<path fill="${hex}"`);
          camadas.push(pathComCor);
        }
      }
      
      if (camadas.length === 0 || !dimensoes) {
        ultimoErro = new Error("Nenhuma camada de cor gerou conteúdo vetorizável");
        continue;
      }
      
      const svgFinal = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${dimensoes.width}px" height="${dimensoes.height}px" viewBox="0 0 ${dimensoes.width} ${dimensoes.height}">\n${camadas.join("\n")}\n</svg>\n`;
      
      limparArquivos(arquivosTemp);
      return svgFinal;
    } catch (err) {
      ultimoErro = err;
    }
  }
  
  limparArquivos(arquivosTemp);
  throw ultimoErro || new Error("Não foi possível vetorizar a imagem colorida após várias tentativas");
}

async function prepararBitmap(inputPath, pbmPath, cores, thresholdPercent, espessura) {
  const flatPath = pbmPath.replace(".pbm", "_flat.png");
  const bmpPath = pbmPath.replace(".pbm", ".bmp");
  const morphPath = pbmPath.replace(".pbm", "_morph.bmp");
  
  await run("convert", [inputPath, "-background", "white", "-alpha", "remove", "-alpha", "off", "-colors", String(cores), "-normalize", flatPath]);
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
    { cores: opts.cores, threshold: 50, opttolerance: opts.opttolerance, turdsize: opts.turdsize },
    { cores: opts.cores, threshold: 35, opttolerance: opts.opttolerance, turdsize: opts.turdsize },
    { cores: opts.cores, threshold: 65, opttolerance: opts.opttolerance, turdsize: 2 },
    { cores: Math.max(opts.cores, 8), threshold: 50, opttolerance: 0.2, turdsize: 0 }
  ];
  
  let ultimoErro = null;
  for (const t of tentativas) {
    try {
      await prepararBitmap(inputPath, pbmPath, t.cores, t.threshold, opts.espessura);
      await run("potrace", [pbmPath, "-s", "-o", svgPath, "--flat", "--opttolerance", String(t.opttolerance), "--turdsize", String(t.turdsize), "--alphamax", "1"]);
      const conteudo = fs.readFileSync(svgPath, "utf8");
      if (svgTemConteudo(conteudo)) return conteudo;
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

app.post("/convert", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PNG no campo 'file'" });
  
  const cores = parseInt(req.body.cores || req.query.cores || "6", 10);
  const opttolerance = parseFloat(req.body.opttolerance || req.query.opttolerance || "0.5");
  const turdsize = parseInt(req.body.turdsize || req.query.turdsize || "5", 10);
  const espessura = parseInt(req.body.espessura || req.query.espessura || "0", 10);
  const modo = (req.body.modo || req.query.modo || "cor").toLowerCase();
  
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const pbmPath = path.join(os.tmpdir(), `${id}.pbm`);
  const svgPath = path.join(os.tmpdir(), `${id}.svg`);
  
  try {
    let svgFinal;
    if (modo === "pb") {
      const svgBruto = await converterComFallback(inputPath, pbmPath, svgPath, { cores, opttolerance, turdsize, espessura });
      svgFinal = converterPtParaPx(svgBruto);
    } else {
      svgFinal = await converterColoridoComFallback(inputPath, id, { cores, opttolerance, turdsize });
    }
    res.json({ sucesso: true, modo, tamanho_bytes: Buffer.byteLength(svgFinal, "utf8"), svg: svgFinal });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, pbmPath, svgPath]);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});