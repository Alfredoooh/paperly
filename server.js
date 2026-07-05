const express = require("express");
const multer = require("multer");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const upload = multer({ dest: os.tmpdir() });

const PORT = process.env.PORT || 10000;

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

app.get("/", (req, res) => {
  res.json({ status: "ok", uso: "POST /convert com form-data campo 'file' (PNG)" });
});

app.post("/convert", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Envie um arquivo PNG no campo 'file'" });
  }
  
  const cores = parseInt(req.query.cores || req.body.cores || "4", 10);
  const opttolerance = req.query.opttolerance || req.body.opttolerance || "0.5";
  const turdsize = req.query.turdsize || req.body.turdsize || "5";
  
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const bmpPath = path.join(os.tmpdir(), `${id}.bmp`);
  const pbmPath = path.join(os.tmpdir(), `${id}.pbm`);
  const svgPath = path.join(os.tmpdir(), `${id}.svg`);
  
  try {
    await run("convert", [inputPath, "-colors", String(cores), "-normalize", bmpPath]);
    await run("convert", [bmpPath, "-threshold", "50%", pbmPath]);
    await run("potrace", [
      pbmPath,
      "-s",
      "-o", svgPath,
      "--flat",
      "--opttolerance", String(opttolerance),
      "--turdsize", String(turdsize),
      "--alphamax", "1"
    ]);
    
    const svgContent = fs.readFileSync(svgPath, "utf8");
    const sizeBytes = Buffer.byteLength(svgContent, "utf8");
    
    res.json({
      sucesso: true,
      tamanho_bytes: sizeBytes,
      svg: svgContent
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  } finally {
    [inputPath, bmpPath, pbmPath, svgPath].forEach((p) => {
      fs.unlink(p, () => {});
    });
  }
});

app.post("/convert-download", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Envie um arquivo PNG no campo 'file'" });
  }
  
  const cores = parseInt(req.query.cores || req.body.cores || "4", 10);
  const opttolerance = req.query.opttolerance || req.body.opttolerance || "0.5";
  const turdsize = req.query.turdsize || req.body.turdsize || "5";
  
  const id = path.parse(req.file.filename).name;
  const inputPath = req.file.path;
  const bmpPath = path.join(os.tmpdir(), `${id}.bmp`);
  const pbmPath = path.join(os.tmpdir(), `${id}.pbm`);
  const svgPath = path.join(os.tmpdir(), `${id}.svg`);
  
  try {
    await run("convert", [inputPath, "-colors", String(cores), "-normalize", bmpPath]);
    await run("convert", [bmpPath, "-threshold", "50%", pbmPath]);
    await run("potrace", [
      pbmPath,
      "-s",
      "-o", svgPath,
      "--flat",
      "--opttolerance", String(opttolerance),
      "--turdsize", String(turdsize),
      "--alphamax", "1"
    ]);
    
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", "attachment; filename=convertido.svg");
    fs.createReadStream(svgPath).pipe(res).on("close", () => {
      [inputPath, bmpPath, pbmPath, svgPath].forEach((p) => fs.unlink(p, () => {}));
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
    [inputPath, bmpPath, pbmPath, svgPath].forEach((p) => fs.unlink(p, () => {}));
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});