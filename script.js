const url = "https://yrmzpdbszroiuhyicnwo.supabase.co/rest/v1/mensajes?select=id,nombre,texto,link,color,created_at&order=id.asc";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybXpwZGJzenJvaXVoeWljbndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTc4OTUsImV4cCI6MjA5MTc5Mzg5NX0.XC4iOw3VhVHYiUtLEXGYVbKBtWzslfHSZaaaCvB3D88";

const TOTAL_PUNTOS = 400;
let margenTop = 140;
const margenBottom = 20;
const margenLateral = 50;
const VELOCIDAD_MAX = 0.08;
const REFRESH_MS = 5000;
const ROTACION_MS = 9000;
const PROFUNDIDAD_MIN = 0.8;
const PROFUNDIDAD_MAX = 1.2;

const puntos = [];
let mensajes = [];
let offsetLote = 0;
let popupActual = null;
let puntoActivo = null;
let fetchEnCurso = false;
let ultimoFetchMs = 0;
let ultimaRotacionMs = 0;

function actualizarMargenTop() {
  const header = document.querySelector(".header");
  const altoHeader = header ? header.offsetHeight : 10;
  margenTop = altoHeader + 20;
}

function obtenerPosicionAleatoria() {
  const anchoUtil = Math.max(window.innerWidth - margenLateral * 2, 1);
  const altoUtil = Math.max(window.innerHeight - margenTop - margenBottom, 1);

  let x = Math.random() * anchoUtil + margenLateral;
  let y = Math.random() * altoUtil + margenTop;

  return { x, y };
}

function resetPuntoAnimacion(punto, desdeBorde = false) {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;

  if (desdeBorde) {
    const salePorLado = Math.random() > 0.5;
    if (salePorLado) {
      punto.x = Math.random() > 0.5 ? -20 : ancho + 20;
      punto.y = Math.random() * (alto - margenTop - margenBottom) + margenTop;
    } else {
      punto.x = Math.random() * (ancho - margenLateral * 2) + margenLateral;
      punto.y = Math.random() > 0.5 ? margenTop - 20 : alto + 20;
    }
  } else {
    const pos = obtenerPosicionAleatoria();
    punto.x = pos.x;
    punto.y = pos.y;
  }

  punto.z = 0;
  punto.scale = 1;
  punto.opacity = 1;
  punto.entrada = 0;
  punto.saliendoAtras = false;
}

function crearPuntosVacios() {
  for (let i = 0; i < TOTAL_PUNTOS; i++) {
    const punto = document.createElement("div");
    punto.className = "punto vacio";

    const { x, y } = obtenerPosicionAleatoria();

    document.body.appendChild(punto);

    const puntoAnimado = {
      el: punto,
      x,
      y,
      vx: (Math.random() * 2 - 1) * VELOCIDAD_MAX,
      vy: (Math.random() * 2 - 1) * VELOCIDAD_MAX,
      pausado: false,
      profundidad: Math.random() * (PROFUNDIDAD_MAX - PROFUNDIDAD_MIN) + PROFUNDIDAD_MIN,
      fase: Math.random() * Math.PI * 2,
      z: 0,
      scale: 1,
      opacity: 1,
      entrada: 0,
      saliendoAtras: false
    };

    resetPuntoAnimacion(puntoAnimado, false);

    punto.addEventListener("mouseenter", () => {
      if (!punto.classList.contains("ocupado")) return;
      puntoAnimado.pausado = true;
    });

    punto.addEventListener("mouseleave", () => {
      puntoAnimado.pausado = false;
    });

    puntos.push(puntoAnimado);
  }
}

function animarPuntos() {
  const ahora = performance.now();
  if (!animarPuntos.ultimo) animarPuntos.ultimo = ahora;
  const delta = Math.min((ahora - animarPuntos.ultimo) / 1000, 0.05);
  animarPuntos.ultimo = ahora;

  const minX = -28;
  const maxX = window.innerWidth + 28;
  const minY = margenTop - 28;
  const maxY = window.innerHeight + 28;

  puntos.forEach((punto) => {
    if (!punto.pausado) {
      if (punto.saliendoAtras) {
        punto.z = Math.min(1, punto.z + delta * 0.45);
        punto.scale = 1 - punto.z * 0.7;     // 1 -> 0.3
        punto.opacity = 1 - punto.z;         // 1 -> 0

        if (punto.opacity <= 0.04) {
          resetPuntoAnimacion(punto, false);
        }
      } else {
        const factorProfundidad = Math.max(0.35, 1 - punto.z * 0.6);
        punto.x += punto.vx * delta * 60 * punto.profundidad * factorProfundidad;
        punto.y += punto.vy * delta * 60 * punto.profundidad * factorProfundidad;

        if (Math.random() < 0.0007) {
          punto.saliendoAtras = true;
          punto.z = 0;
        }

        const fueraX = punto.x < minX || punto.x > maxX;
        const fueraY = punto.y < minY || punto.y > maxY;
        if (fueraX || fueraY) {
          resetPuntoAnimacion(punto, true);
        }
      }

      punto.entrada = Math.min(1, punto.entrada + delta * 2);
    }

    const easingEntrada = 1 - Math.pow(1 - punto.entrada, 2);
    const scaleEntrada = 0.6 + easingEntrada * 0.4; // 0.6 -> 1
    const opacityEntrada = easingEntrada;
    const scaleFinal = punto.scale * scaleEntrada;
    const opacityFinal = Math.max(0, Math.min(1, punto.opacity * opacityEntrada));

    punto.el.style.transform = `translate(${punto.x}px, ${punto.y}px) scale(${scaleFinal})`;
    punto.el.style.opacity = opacityFinal;
  });

  if (!ultimoFetchMs) ultimoFetchMs = ahora;
  if (!ultimaRotacionMs) ultimaRotacionMs = ahora;

  if (ahora - ultimoFetchMs >= REFRESH_MS) {
    ultimoFetchMs = ahora;
    cargarMensajes();
  }

  if (ahora - ultimaRotacionMs >= ROTACION_MS) {
    ultimaRotacionMs = ahora;
    rotarLote();
  }

  requestAnimationFrame(animarPuntos);
}

function mostrarPopup(punto, item) {
  if (popupActual) popupActual.remove();
  if (puntoActivo) puntoActivo.pausado = false;

  const popup = document.createElement("div");
  popup.className = "popup";
  const bloques = [];

  if (item.nombre) bloques.push(`<strong>${item.nombre}</strong>`);
  if (item.texto) bloques.push(`<span>${item.texto}</span>`);
  if (item.link) bloques.push(`<a href="${item.link}" target="_blank" style="color:white;">ver link</a>`);
  if (bloques.length === 0) {
    return;
  }

  popup.innerHTML = bloques.join("<br>");
  popup.addEventListener("click", (event) => event.stopPropagation());

  popup.style.left = (punto.x + 10) + "px";
  popup.style.top = (punto.y + 10) + "px";
  document.body.appendChild(popup);
  popupActual = popup;
  puntoActivo = punto;
  puntoActivo.pausado = true;
}

function normalizarColor(color) {
  if (typeof color !== "string") return "#000000";

  const valor = color.trim();
  const esHexValido = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(valor);

  return esHexValido ? valor : "#000000";
}

function limpiarPunto(punto) {
  punto.el.classList.remove("ocupado");
  punto.el.classList.add("vacio");
  punto.el.style.background = "";
  punto.el.textContent = "";
  punto.el.onclick = null;
}

function aplicarItemAPunto(punto, item) {
  if (!item) {
    limpiarPunto(punto);
    return;
  }

  punto.el.classList.remove("vacio");
  punto.el.classList.add("ocupado");
  punto.el.style.background = normalizarColor(item.color);
  punto.el.textContent = item.id ? String(item.id) : "";
  punto.el.onclick = (event) => {
    event.stopPropagation();
    mostrarPopup(punto, item);
  };
}

function obtenerLoteActual() {
  if (mensajes.length === 0) return [];

  const lote = [];
  for (let i = 0; i < TOTAL_PUNTOS; i++) {
    const index = (offsetLote + i) % mensajes.length;
    lote.push(mensajes[index]);
    if (mensajes.length < TOTAL_PUNTOS && i >= mensajes.length - 1) break;
  }
  return lote;
}

function sincronizarPuntos(data) {
  puntos.forEach((punto, index) => {
    const item = data[index];
    aplicarItemAPunto(punto, item);
  });
}

function rotarLote() {
  if (mensajes.length <= TOTAL_PUNTOS) return;

  offsetLote = (offsetLote + TOTAL_PUNTOS) % mensajes.length;
  const lote = obtenerLoteActual();

  puntos.forEach((punto, index) => {
    const item = lote[index];
    aplicarItemAPunto(punto, item);
  });
}

function cargarMensajes() {
  if (fetchEnCurso) return;
  fetchEnCurso = true;

  fetch(url, {
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer " + apiKey
    }
  })
  .then(res => {
    if (!res.ok) {
      throw new Error("Supabase respondió " + res.status + " " + res.statusText);
    }

    return res.json();
  })
  .then(data => {
    mensajes = Array.isArray(data) ? data : [];
    if (offsetLote >= mensajes.length) offsetLote = 0;
    sincronizarPuntos(obtenerLoteActual());
  })
  .catch(error => {
    console.error("Error cargando mensajes:", error.message);
    mensajes = [];
    offsetLote = 0;
    sincronizarPuntos([]);
  })
  .finally(() => {
    fetchEnCurso = false;
  });
}

actualizarMargenTop();
crearPuntosVacios();
animarPuntos();
cargarMensajes();

window.addEventListener("resize", actualizarMargenTop);

document.addEventListener("click", () => {
  if (popupActual) popupActual.remove();
  popupActual = null;

  if (puntoActivo) {
    puntoActivo.pausado = false;
    puntoActivo = null;
  }
});
