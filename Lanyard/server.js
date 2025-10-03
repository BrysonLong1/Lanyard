// server.js
import express from "express";
import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = String(process.env.NODE_ENV).toLowerCase() === "production";

// ---------- Middleware ----------
app.use(express.json({ limit: "1mb" }));

// In development, disable caching so your CSS/HTML changes show immediately
if (!isProd) {
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");
    next();
  });
}

// Serve static files (cache in prod, no cache in dev)
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: isProd,
    lastModified: isProd,
    maxAge: isProd ? "7d" : 0,
    index: false, // we serve index.html manually below
  })
);

console.log(`NODE_ENV=${process.env.NODE_ENV || "development"}`);
console.log("Serving static from:", path.join(__dirname, "public"));

// Health check
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// ---------- Routes ----------
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, reason, trap } = req.body || {};

    // Simple bot honeypot
    if (trap) return res.json({ ok: true });

    // Basic validation
    if (!name || !email || !reason) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing required fields: name, email, and reason are required." });
    }

    // SMTP transport (works with SendGrid, Mailgun, Gmail App Password, etc.)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,                 // e.g. smtp.sendgrid.net
      port: Number(process.env.SMTP_PORT || 587),  // 587 recommended
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true", // usually false for 587
      auth: {
        user: process.env.SMTP_USER,               // SendGrid: "apikey"
        pass: process.env.SMTP_PASS,               // SendGrid: your API key
      },
    });

    const fromAddress =
      process.env.MAIL_FROM ||
      process.env.CONTACT_FROM ||
      process.env.SMTP_USER ||
      "no-reply@localhost";

    const toAddress = process.env.CONTACT_TO || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from: { name: "Lanyard Website", address: fromAddress },
      to: toAddress,
      replyTo: email,
      subject: `New contact — ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nReason:\n${reason}`,
      html: `
        <h2>New Contact Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || "—"}</p>
        <p><b>Reason:</b><br>${String(reason).replace(/\n/g, "<br>")}</p>
      `,
    });

    return res.json({ ok: true, id: info.messageId });
  } catch (err) {
    console.error("Email error:", err);
    // Hide internals from client
    return res.status(500).json({ ok: false, message: "Could not send email." });
  }
});

// Serve index.html for all other GET requests (so direct links work)
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`Lanyard running at http://localhost:${PORT}`);
});


