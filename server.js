/**
 * ᙃᴀ̷𝖿ᴢᴢ Coffe — Express server
 * Menyimpan rating/komentar ke data/ratings.json dan foto ke uploads/.
 * Tidak menggunakan database atau layanan email SMTP.
 */
"use strict";

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const RATINGS_FILE = path.join(DATA_DIR, "ratings.json");
const MAX_PHOTO_SIZE = 3 * 1024 * 1024;
const MAX_RATINGS = 5000;
const menuNames = [
  "Kopi Kapal Api", "Kopi Luwak", "Kopi Matcha",
  "Kopi Gula Aren", "Kopi Pahit", "Kopi (Original)"
];
const clean = value => String(value ?? "").trim();

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(RATINGS_FILE)) {
  fs.writeFileSync(RATINGS_FILE, "[]\n", "utf8");
}

app.disable("x-powered-by");
app.use(express.json({ limit: "30kb" }));
app.use(express.urlencoded({ extended: false, limit: "30kb" }));
app.use(express.static(ROOT, {
  index: "index.html",
  dotfiles: "ignore",
  setHeaders(res, filePath) {
    if (filePath.endsWith(".json")) res.setHeader("Cache-Control", "no-store");
  }
}));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const ext = file.mimetype === "image/png" ? ".png"
      : file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const token = `${Date.now().toString(36)}-${require("crypto").randomBytes(8).toString("hex")}`;
    callback(null, `${token}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      const error = new Error("Format foto harus JPG, PNG, atau WEBP.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  }
});

let writeQueue = Promise.resolve();
async function readRatings() {
  try {
    const raw = await fs.promises.readFile(RATINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    console.error("Gagal membaca ratings.json:", error.message);
    throw new Error("Data ulasan di server tidak dapat dibaca.");
  }
}
function addRating(data) {
  const operation = writeQueue.then(async () => {
    const comments = await readRatings();
    const entry = {
      id: `${Date.now().toString(36)}-${require("crypto").randomBytes(4).toString("hex")}`,
      name: data.name,
      menu: data.menu,
      rating: data.rating,
      comment: data.comment,
      photo: data.photo || null,
      date: new Date().toLocaleDateString("id-ID", {
        day: "2-digit", month: "short", year: "numeric"
      }).toUpperCase(),
      createdAt: new Date().toISOString()
    };
    comments.unshift(entry);
    if (comments.length > MAX_RATINGS) comments.length = MAX_RATINGS;
    const tempFile = `${RATINGS_FILE}.tmp`;
    await fs.promises.writeFile(tempFile, JSON.stringify(comments, null, 2) + "\n", "utf8");
    await fs.promises.rename(tempFile, RATINGS_FILE);
    return entry;
  });
  // Keep the queue usable even if one write fails, while returning this operation's error.
  writeQueue = operation.catch(() => {});
  return operation;
}
async function removeUploadedFile(file) {
  if (!file) return;
  try { await fs.promises.unlink(file.path); } catch {}
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "dafzz-coffe", storage: "json-file" });
});

app.get("/api/rating", async (_req, res) => {
  try {
    const comments = await readRatings();
    res.setHeader("Cache-Control", "no-store");
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/rating", (req, res) => {
  upload.single("photo")(req, res, async error => {
    if (error) {
      const status = error.status || (error.code === "LIMIT_FILE_SIZE" ? 413 : 400);
      return res.status(status).json({
        error: error.code === "LIMIT_FILE_SIZE"
          ? "Ukuran foto maksimal 3 MB."
          : error.message || "Foto tidak dapat diunggah."
      });
    }

    const name = clean(req.body.name);
    const menu = clean(req.body.menu);
    const comment = clean(req.body.comment);
    const rating = Number(req.body.rating);

    if (name.length < 1 || name.length > 50) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ error: "Nama harus 1–50 karakter." });
    }
    if (!menuNames.includes(menu)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ error: "Menu tidak valid." });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ error: "Rating harus 1–5 bintang." });
    }
    if (comment.length < 3 || comment.length > 500) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ error: "Komentar harus 3–500 karakter." });
    }

    try {
      const entry = await addRating({
        name, menu, rating, comment,
        photo: req.file ? `/uploads/${req.file.filename}` : null
      });
      res.status(201).json({ ok: true, comment: entry });
    } catch (saveError) {
      await removeUploadedFile(req.file);
      console.error("Gagal menyimpan ulasan:", saveError.message);
      res.status(500).json({ error: "Ulasan gagal disimpan ke server. Coba lagi." });
    }
  });
});

// API khusus agar error upload/JSON tetap dikirim sebagai JSON.
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(error.status || 500).json({ error: "Terjadi kesalahan pada server." });
});

app.get("*", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));

app.listen(PORT, () => {
  console.log(`ᙃᴀ̷𝖿ᴢᴢ Coffe berjalan di http://localhost:${PORT}`);
});
