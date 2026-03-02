let funcionarios = [];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

// Registrar Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then(() => console.log("Service Worker registrado correctamente"))
    .catch((err) => console.error("Error registrando SW:", err));
}

// Suscripción push
async function subscribePush() {
  const registration = await navigator.serviceWorker.ready;

  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey:
      "BMESwKatNB901QBa8PZnG_ZgLwQjA7VauYd0eC2AN6dsWi0aLHwhzeQhQSEQn4AotXjxFc3voGXTJJ8Lw_ypGJU",
  });

  await fetch("/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });

  console.log("Dispositivo suscrito");
}

//fecha segura para comparar cumpleaños
function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}
// Cargar funcionarios desde JSON
async function loadFuncionarios() {
  try {
    const response = await fetch("/data/funcionarios.json");
    const data = await response.json();
    funcionarios = data.funcionarios;
  } catch (error) {
    console.error("Error cargando funcionarios:", error);
  }
}

// Verificar cumpleaños de mañana y mostrar notificación
function checkTomorrowBirthdays() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const tomorrowBirthdays = funcionarios.filter((f) => {
    const birthDate = parseLocalDate(f.fecha_cumple);
    return (
      birthDate.getDate() === tomorrow.getDate() &&
      birthDate.getMonth() === tomorrow.getMonth()
    );
  });

  if (tomorrowBirthdays.length > 0) {
    const names = tomorrowBirthdays.map((f) => f.nombre).join(", ");
    const message = `Recordatorio: El día de mañana ${tomorrow.toLocaleDateString()} está cumpliendo años el funcionario policial: ${names}`;

    // Mostrar notificación visual en la app
    showNotification(message);

    // Mostrar notificación del navegador
    if (Notification.permission === "granted") {
      new Notification("Recordatorio de Cumpleaños", {
        body: message,
        icon: "/favicon.ico",
      });
    }
  }
}

// Mostrar notificación en la UI
function showNotification(message) {
  const notificationArea = document.getElementById("notificationArea");
  const notificationMessage = document.getElementById("notificationMessage");

  notificationMessage.textContent = message;
  notificationArea.style.display = "flex";
}

// Cerrar notificación
function closeNotification() {
  document.getElementById("notificationArea").style.display = "none";
}

// Renderizar calendario
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const monthYearDisplay = document.getElementById("currentMonthYear");

  // Mes y año actual
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  // Días de la semana
  const dayHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  let calendarHTML = "";

  dayHeaders.forEach((day) => {
    calendarHTML += `<div class="calendar-day-header">${day}</div>`;
  });

  // Primer día del mes
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Días vacíos antes del primer día
  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const birthdayCount = funcionarios.filter((f) => {
      const birthDate = parseLocalDate(f.fecha_cumple);
      return (
        birthDate.getDate() === day && birthDate.getMonth() === currentMonth
      );
    }).length;

    const isToday =
      day === currentDate.getDate() &&
      currentMonth === currentDate.getMonth() &&
      currentYear === currentDate.getFullYear();

    const dayClass = `calendar-day ${birthdayCount > 0 ? "birthday" : ""} ${isToday ? "today" : ""}`;

    calendarHTML += `<div class="${dayClass}" onclick="handleDayClick(${day})">${day}`;

    if (birthdayCount > 0) {
      calendarHTML += `<span class="birthday-count">${birthdayCount}</span>`;
    }

    calendarHTML += "</div>";
  }

  calendar.innerHTML = calendarHTML;
}
// Manejar clic en un día del calendario
function handleDayClick(day) {
  const selectedBirthdays = funcionarios.filter((f) => {
    const birthDate = parseLocalDate(f.fecha_cumple);
    return birthDate.getDate() === day && birthDate.getMonth() === currentMonth;
  });

  if (selectedBirthdays.length === 0) return;

  let message = `🎂 CUMPLEAÑOS DEL DÍA\n\n`;

  selectedBirthdays.forEach((f, index) => {
    const birthDate = parseLocalDate(f.fecha_cumple);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    message += `${index + 1}. ${f.rango} ${f.nombre}\n`;
    message += `   Cumple: ${age + 1} años\n\n`;
  });

  showNotification(message);
}
// Renderizar tabla
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sortedFuncionarios = [...funcionarios].sort((a, b) => {
    const dateA = parseLocalDate(a.fecha_cumple);
    const dateB = parseLocalDate(b.fecha_cumple);

    // Ordenar por mes y día
    if (dateA.getMonth() !== dateB.getMonth()) {
      return dateA.getMonth() - dateB.getMonth();
    }
    return dateA.getDate() - dateB.getDate();
  });

  let tableHTML = "";

  sortedFuncionarios.forEach((f) => {
    const birthDate = parseLocalDate(f.fecha_cumple);
    const birthDay = birthDate.getDate();
    const birthMonth = birthDate.getMonth();

    // Verificar si es hoy o mañana
    const isToday =
      birthDay === today.getDate() && birthMonth === today.getMonth();
    const isTomorrow =
      birthDay === tomorrow.getDate() && birthMonth === tomorrow.getMonth();

    // Calcular edad
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Calcular próximo cumpleaños
    const nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

    const rowClass = isToday
      ? "birthday-today"
      : isTomorrow
        ? "birthday-tomorrow"
        : "";

    tableHTML += `<tr class="${rowClass}">
            <td>${f.rango}</td>
            <td>${f.nombre}</td>
            <td>${birthDate.toLocaleDateString()}</td>
            <td>${age} años</td>
            <td>${daysUntil} días</td>
        </tr>`;
  });

  tbody.innerHTML = tableHTML;
}

// Filtrar tabla
function filterTable() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#tableBody tr");

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? "" : "none";
  });
}

// Navegación del calendario
function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", async () => {
  await loadFuncionarios(); // Cargar los datos
  renderCalendar(); // Dibujar el calendario
  renderTable(); // Dibujar la tabla
  checkTomorrowBirthdays(); // Verificar cumpleaños de mañana (opcional)
});
