const nodemailer = require("nodemailer");
const fs = require("fs").promises;
const path = require("path");

export default async function handler(req, res) {
  // Verificar que sea una petición GET (Cron Job)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    // Leer archivo de funcionarios
    const dataPath = path.join(process.cwd(), "data", "funcionarios.json");
    const data = await fs.readFile(dataPath, "utf8");
    const { funcionarios } = JSON.parse(data);

    // Obtener fecha actual
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Buscar funcionarios que cumplen años hoy
    const birthdayPeople = funcionarios.filter((f) => {
      const birthDate = parseLocalDate(f.fecha_cumple);
      return (
        birthDate.getDate() === today.getDate() &&
        birthDate.getMonth() === today.getMonth()
      );
    });

    if (birthdayPeople.length === 0) {
      return res.status(200).json({ message: "No hay cumpleaños hoy" });
    }

    // Enviar notificaciones para cada cumpleañero
    const results = await Promise.allSettled(
      birthdayPeople.map(async (funcionario) => {
        await Promise.all([sendEmail(funcionario), sendWhatsApp(funcionario)]);
      }),
    );

    // Verificar resultados
    const failed = results.filter((r) => r.status === "rejected");

    if (failed.length > 0) {
      console.error("Fallos en envíos:", failed);
      return res.status(207).json({
        message: "Algunas notificaciones fallaron",
        successCount: birthdayPeople.length - failed.length,
        failedCount: failed.length,
      });
    }

    return res.status(200).json({
      message: "Notificaciones enviadas exitosamente",
      count: birthdayPeople.length,
      funcionarios: birthdayPeople.map((f) => f.nombre),
    });
  } catch (error) {
    console.error("Error en birthday-check:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// Función para parsear fecha local (sin zona horaria)
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}
