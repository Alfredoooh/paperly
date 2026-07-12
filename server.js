const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 8 * 1024 * 1024 } });
const uploadMulti = multer({ dest: os.tmpdir(), limits: { fileSize: 8 * 1024 * 1024 } });

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
    const raio = Math.min(6, Math.abs(nivel)); // limite de segurança pro kernel
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

// ─── ROTAS ───────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    utils: [
      "POST /convert",
      "POST /convert-download",
      "POST /webp",
      "POST /avif",
      "POST /compress-png",
      "POST /resize",
      "POST /auto-orient",
      "POST /trim",
      "POST /watermark-text",
      "POST /exif",
      "POST /favicon",
      "POST /sprite",
      "POST /qrcode",
      "POST /colorspace",
      "POST /palette",
      "POST /pdf-to-png",
      "POST /images-to-pdf",
      "POST /pdf-to-text",
      "POST /pdf-merge",
      "POST /pdf-split",
      "POST /pdf-compress",
      "POST /heic-to-jpg"
    ]
  });
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

// PNG → SVG (download direto)
app.post("/convert-download", upload.single("file"), async (req, res) => {
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
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", "attachment; filename=convertido.svg");
    res.send(svgFinal);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, pbmPath, svgPath]);
  }
});

// Imagem → WebP
app.post("/webp", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const qualidade = parseInt(req.body.qualidade || req.query.qualidade || "80", 10);
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}.webp`);

  try {
    await run("cwebp", ["-q", String(qualidade), inputPath, "-o", outputPath]);
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Content-Disposition", "attachment; filename=convertido.webp");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Imagem → AVIF
app.post("/avif", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}.avif`);

  try {
    await run("convert", [inputPath, outputPath]);
    res.setHeader("Content-Type", "image/avif");
    res.setHeader("Content-Disposition", "attachment; filename=convertido.avif");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Comprimir PNG
app.post("/compress-png", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PNG no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}_c.png`);

  try {
    await run("convert", [inputPath, "-strip", "-quality", "90", "-define", "png:compression-level=9", outputPath]);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=comprimido.png");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Redimensionar
app.post("/resize", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const largura = parseInt(req.body.largura || req.query.largura || "300", 10);
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const ext = path.extname(req.file.originalname) || ".png";
  const outputPath = path.join(os.tmpdir(), `${id}_r${ext}`);

  try {
    await run("convert", [inputPath, "-resize", `${largura}x`, outputPath]);
    res.setHeader("Content-Disposition", `attachment; filename=redimensionado${ext}`);
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Corrigir orientação EXIF
app.post("/auto-orient", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}_o.jpg`);

  try {
    await run("convert", [inputPath, "-auto-orient", outputPath]);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "attachment; filename=corrigido.jpg");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Recortar bordas brancas/transparentes
app.post("/trim", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}_t.png`);

  try {
    await run("convert", [inputPath, "-trim", "+repage", outputPath]);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=recortado.png");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Marca d'água em texto
app.post("/watermark-text", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const texto = req.body.texto || req.query.texto || "© 2026";
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}_wm.png`);

  try {
    await run("convert", [
      inputPath,
      "-gravity", "southeast",
      "-pointsize", "24",
      "-fill", "white",
      "-undercolor", "#00000080",
      "-annotate", "+20+20", texto,
      outputPath
    ]);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=marcado.png");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Extrair metadados EXIF
app.post("/exif", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const inputPath = req.file.path;

  try {
    const metadados = await run("exiftool", [inputPath]);
    res.json({ sucesso: true, metadados });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath]);
  }
});

// Gerar favicon.ico
app.post("/favicon", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}.ico`);

  try {
    await run("convert", [
      inputPath,
      "-define", "icon:auto-resize=16,32,48,64",
      outputPath
    ]);
    res.setHeader("Content-Type", "image/x-icon");
    res.setHeader("Content-Disposition", "attachment; filename=favicon.ico");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Sprite sheet horizontal
app.post("/sprite", uploadMulti.array("files", 30), async (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ erro: "Envie pelo menos 2 imagens no campo 'files'" });
  }

  const id = Date.now().toString();
  const outputPath = path.join(os.tmpdir(), `${id}_sprite.png`);
  const inputPaths = req.files.map((f) => f.path);

  try {
    await run("convert", [...inputPaths, "+append", outputPath]);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=sprite.png");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([...inputPaths, outputPath]);
  }
});

// Gerar QR Code
app.post("/qrcode", (req, res) => {
  const texto = req.body.texto;
  if (!texto) return res.status(400).json({ erro: "Envie 'texto' no corpo do pedido" });

  const id = Date.now().toString();
  const outputPath = path.join(os.tmpdir(), `${id}_qr.png`);

  (async () => {
    try {
      await run("qrencode", ["-o", outputPath, "-s", "8", texto]);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", "attachment; filename=qrcode.png");
      res.send(fs.readFileSync(outputPath));
    } catch (err) {
      res.status(500).json({ erro: err.message });
    } finally {
      limparArquivos([outputPath]);
    }
  })();
});

// Converter espaço de cor
app.post("/colorspace", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const espaco = req.body.espaco || req.query.espaco || "Gray";
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const ext = path.extname(req.file.originalname) || ".png";
  const outputPath = path.join(os.tmpdir(), `${id}_cs${ext}`);

  try {
    await run("convert", [inputPath, "-colorspace", espaco, outputPath]);
    res.setHeader("Content-Disposition", `attachment; filename=colorspace${ext}`);
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// Extrair paleta de cores dominantes
app.post("/palette", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie uma imagem no campo 'file'" });

  const cores = parseInt(req.body.cores || req.query.cores || "6", 10);
  const inputPath = req.file.path;

  try {
    const saida = await run("convert", [
      inputPath,
      "-resize", "100x100>",
      "-colors", String(cores),
      "-unique-colors",
      "txt:-"
    ]);

    const hexCores = [];
    const linhas = saida.split("\n");
    for (const linha of linhas) {
      const match = linha.match(/#([0-9A-Fa-f]{6,8})/);
      if (match) hexCores.push("#" + match[1].substring(0, 6).toUpperCase());
    }

    res.json({ sucesso: true, cores: hexCores });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath]);
  }
});

// PDF → PNG (por página)
app.post("/pdf-to-png", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PDF no campo 'file'" });

  const dpi = parseInt(req.body.dpi || req.query.dpi || "150", 10);
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputBase = path.join(os.tmpdir(), `${id}_page`);

  try {
    await run("convert", [
      "-density", String(dpi),
      inputPath,
      "-quality", "90",
      `${outputBase}-%03d.png`
    ]);

    const arquivos = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(`${id}_page`));
    arquivos.sort();

    const paginas = arquivos.map((nome) => {
      const fullPath = path.join(os.tmpdir(), nome);
      const data = fs.readFileSync(fullPath).toString("base64");
      fs.unlink(fullPath, () => {});
      return { nome, base64: data };
    });

    res.json({ sucesso: true, total: paginas.length, paginas });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath]);
  }
});

// Imagens → PDF
app.post("/images-to-pdf", uploadMulti.array("files", 30), async (req, res) => {
  if (!req.files || req.files.length < 1) {
    return res.status(400).json({ erro: "Envie pelo menos 1 imagem no campo 'files'" });
  }

  const id = Date.now().toString();
  const outputPath = path.join(os.tmpdir(), `${id}.pdf`);
  const inputPaths = req.files.map((f) => f.path);

  try {
    await run("convert", [...inputPaths, outputPath]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resultado.pdf");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([...inputPaths, outputPath]);
  }
});

// PDF → Texto
app.post("/pdf-to-text", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PDF no campo 'file'" });

  const inputPath = req.file.path;

  try {
    const texto = await run("pdftotext", [inputPath, "-"]);
    res.json({ sucesso: true, texto });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath]);
  }
});

// Juntar PDFs
app.post("/pdf-merge", uploadMulti.array("files", 20), async (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ erro: "Envie pelo menos 2 PDFs no campo 'files'" });
  }

  const id = Date.now().toString();
  const outputPath = path.join(os.tmpdir(), `${id}_merged.pdf`);
  const inputPaths = req.files.map((f) => f.path);

  try {
    await run("qpdf", ["--empty", "--pages", ...inputPaths.flatMap((p) => [p, "1-z"]), "--", outputPath]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=merged.pdf");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([...inputPaths, outputPath]);
  }
});

// Separar páginas de PDF
app.post("/pdf-split", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PDF no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputBase = path.join(os.tmpdir(), `${id}_p`);

  try {
    await run("qpdf", ["--split-pages", inputPath, `${outputBase}-%d.pdf`]);

    const arquivos = fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith(`${id}_p`));
    arquivos.sort();

    const paginas = arquivos.map((nome) => {
      const fullPath = path.join(os.tmpdir(), nome);
      const data = fs.readFileSync(fullPath).toString("base64");
      fs.unlink(fullPath, () => {});
      return { nome, base64: data };
    });

    res.json({ sucesso: true, total: paginas.length, paginas });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath]);
  }
});

// Comprimir PDF
app.post("/pdf-compress", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um PDF no campo 'file'" });

  const nivel = req.body.nivel || req.query.nivel || "screen";
  const niveisValidos = ["screen", "ebook", "printer", "prepress"];
  const nivelFinal = niveisValidos.includes(nivel) ? nivel : "screen";

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}_compressed.pdf`);

  try {
    await run("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      `-dPDFSETTINGS=/${nivelFinal}`,
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${outputPath}`,
      inputPath
    ]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=comprimido.pdf");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

// HEIC → JPG
app.post("/heic-to-jpg", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Envie um ficheiro HEIC no campo 'file'" });

  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const outputPath = path.join(os.tmpdir(), `${id}.jpg`);

  try {
    await run("heif-convert", [inputPath, outputPath]);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Content-Disposition", "attachment; filename=convertido.jpg");
    res.send(fs.readFileSync(outputPath));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    limparArquivos([inputPath, outputPath]);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});