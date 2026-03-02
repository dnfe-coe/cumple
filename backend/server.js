import express from "express";
import webpush from "web-push";
import fs from "fs";
import path from "path";
import cron from "node-cron";

const app = express();
app.use(express.json());

const __dirname = path.resolve();

// Servir archivos estáticos desde frontend
app.use(express.static(path.join(__dirname, "..")));

// Claves VAPID (para notificaciones push)
const vapidKeys = {
  publicKey:
    "BP0C6k0Kg06tPvv-oBlhk5D1XGGc7tb0F4XTgwQlG3AOXtrMzvel9Nox6CucGJdcEZyM7VVY9kc_wuzexkQrFJk",
  privateKey: "dWun2O0HLJShOsq6YMRcvVr54wxp_jeHymgacAOuGzw",
};

webpush.setVapidDetails(
  "mailto:admin@tigres-coe.hn",
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

const subsFile = path.join(__dirname, "/subscribers.json");
const dataFile = path.join(__dirname, "/data/funcionarios.json");

// Guardar suscripción
app.post("/subscribe", (req, res) => {
  const sub = req.body;
  let subs = [];

  if (fs.existsSync(subsFile)) {
    subs = JSON.parse(fs.readFileSync(subsFile));
  }

  subs.push(sub);
  fs.writeFileSync(subsFile, JSON.stringify(subs, null, 2));

  res.json({ success: true });
});

// Servir JSON de funcionarios públicamente
app.get("/data/funcionarios.json", (req, res) => {
  if (fs.existsSync(dataFile)) {
    const data = fs.readFileSync(dataFile, "utf-8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } else {
    res.status(404).json({ error: "Archivo no encontrado" });
  }
});

// Parse seguro de fechas
function parseLocalDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// Ruta de prueba para enviar notificación manualmente
app.get("/test", async (req, res) => {
  await sendPush("🔔 Prueba de notificación local exitosa");
  res.send("Notificación enviada");
});

// Enviar notificación push
async function sendPush(message) {
  if (!fs.existsSync(subsFile)) return;

  const fileContent = fs.readFileSync(subsFile, "utf-8").trim();
  if (!fileContent) return; // evita parsear JSON vacío

  let subs = [];
  try {
    subs = JSON.parse(fileContent);
  } catch (err) {
    console.error("Error parseando subscribers.json:", err.message);
    return;
  }

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({
          title: "🎂 Alerta de Cumpleaños",
          body: message,
        }),
      );
    } catch (err) {
      console.error("Error enviando push:", err.message);
    }
  }
}

// Verificación diaria automática (cada 10 minutos)
cron.schedule("*/10 * * * *", async () => {
  console.log("⏰ Verificando cumpleaños...");

  if (!fs.existsSync(dataFile)) return;

  const data = JSON.parse(fs.readFileSync(dataFile));
  const funcionarios = data.funcionarios;

  const today = new Date();

  const cumple = funcionarios.filter((f) => {
    const b = parseLocalDate(f.fecha_cumple);
    return b.getDate() === today.getDate() && b.getMonth() === today.getMonth();
  });

  if (cumple.length > 0) {
    const nombres = cumple.map((f) => `${f.rango} ${f.nombre}`).join(", ");
    const msg = `Hoy cumple años: ${nombres}`;
    await sendPush(msg);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));
