 url = "https://yrmzpdbszroiuhyicnwo.supabase.co/rest/v1/mensajes?select=id,nombre,texto,link,color,created_at&order=id.asc";
 apiKey = "TeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybXpwZGJzenJvaXVoeWljbndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMTc4OTUsImV4cCI6MjA5MTc5Mzg5NX0.XC4iOw3VhVHYiUtLEXGYVbKBtWzslfHSZaaaCvB3D88";

 TOTAL_PUNTOS = 400;
 margenTop = 140;
 margenBottom = 20;
 margenLateral = 50;
 VELOCIDAD_MAX = 0.08;
 REFRESH_MS = 5000;
 ROTACION_MS = 9000;
 PROFUNDIDAD_MIN = 0.8;
 PROFUNDIDAD_MAX = 1.2;

 puntos = [];
 mensajes = [];
 offsetLote = 0;
 popupActual = null;
 puntoActivo = null;
 fetchEnCurso = false;
 ultimoFetchMs = 0;
 ultimaRotacionMs = 0;

 actualizarMargenTop() {
   header = document.querySelector(".header");
   altoHeader = header ? header.offsetHeight : 120;
  margenTop = altoHeader + 20;
}

 obtenerPosicionAleatoria() {
   anchoUtil = Math.max(window.innerWidth - margenLateral * 2, 1);
   altoUtil = Math.max(window.innerHeight - margenTop - margenBottom, 1);

  return {
    x: Math.random() * anchoUtil + margenLateral,
    y: Math.random() * altoUtil + margenTop
  };
}

 resetPuntoAnimacion(punto, desdeBorde = false) {
   ancho = window.innerWidth;
   alto = window.innerHeight;

  if (desdeBorde) {
    if (Math.random() > 0.5) {
      punto.x = Math.random() > 0.5 ? -20 : ancho + 20;
      punto.y = Math.random() * (alto - margenTop - margenBottom) + margenTop;
    } else {
      punto.x = Math.random() * (ancho - margenLateral * 2) + margenLateral;
      punto.y = Math.random() > 0.5 ? margenTop - 20 : alto + 20;
    }
  } else {
     pos = obtenerPosicionAleatoria();
    punto.x = pos.x;
    punto.y = pos.y;
  }

  punto.z = 0;
  punto.scale = 1;
  punto.opacity = 1;
  punto.entrada = 0;
  punto.saliendoAtras = false;
}

 crearPuntosVacios() {
  for ( i = 0; i < TOTAL_PUNTOS; i++) {
     punto = document.createElement("div");
    punto.className = "punto vacio";

    document.body.appendChild(punto);

     { x, y } = obtenerPosicionAleatoria();

     puntoAnimado = {
      el: punto,
      x,
      y,
      vx: (Math.random() * 2 - 1) * VELOCIDAD_MAX,
      vy: (Math.random() * 2 - 1) * VELOCIDAD_MAX,
      pausado: false,
      profundidad: Math.random() * (PROFUNDIDAD_MAX - PROFUNDIDAD_MIN) + PROFUNDIDAD_MIN,
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

 animarPuntos() {
   ahora = performance.now();
  if (!animarPuntos.ultimo) animarPuntos.ultimo = ahora;
   delta = Math.min((ahora - animarPuntos.ultimo) / 1000, 0.05);
  animarPuntos.ultimo = ahora;

   minX = -28;
   maxX = window.innerWidth + 28;
   minY = margenTop - 28;
   maxY = window.innerHeight + 28;

  puntos.forEach((punto) => {
    if (!punto.pausado) {
      if (punto.saliendoAtras) {
        punto.z += delta * 0.45;
        punto.scale = 1 - punto.z * 0.7;
        punto.opacity = 1 - punto.z;

        if (punto.opacity <= 0.05) {
          resetPuntoAnimacion(punto);
        }
      } else {
        punto.x += punto.vx * delta * 60 * punto.profundidad;
        punto.y += punto.vy * delta * 60 * punto.profundidad;

        if (Math.random() < 0.0007) {
          punto.saliendoAtras = true;
          punto.z = 0;
        }

        if (punto.x < minX || punto.x > maxX || punto.y < minY || punto.y > maxY) {
          resetPuntoAnimacion(punto, true);
        }
      }

      punto.entrada = Math.min(1, punto.entrada + delta * 2);
    }

     easing = 1 - Math.pow(1 - punto.entrada, 2);
     scale = punto.scale * (0.6 + easing * 0.4);
     opacity = punto.opacity * easing;

    punto.el.style.transform = `translate(${punto.x}px, ${punto.y}px) scale(${scale})`;
    punto.el.style.opacity = opacity;
  });

  if (!ultimoFetchMs) ultimoFetchMs = ahora;
  if (!ultimaRotacionMs) ultimaRotacionMs = ahora;

  if (ahora - ultimoFetchMs > REFRESH_MS) {
    ultimoFetchMs = ahora;
    cargarMensajes();
  }

  if (ahora - ultimaRotacionMs > ROTACION_MS) {
    ultimaRotacionMs = ahora;
    rotarLote();
  }

  requestAnimationFrame(animarPuntos);
}

 mostrarPopup(punto, item) {
  if (popupActual) popupActual.remove();

   popup = document.createElement("div");
  popup.className = "popup";

  popup.innerHTML = `
    <strong>${item.nombre || ""}</strong><br>
    ${item.texto || ""}<br>
    ${item.link ? `<a href="${item.link}" target="_blank">ver link</a>` : ""}
  `;

  popup.style.left = punto.x + 10 + "px";
  popup.style.top = punto.y + 10 + "px";

  document.body.appendChild(popup);
  popupActual = popup;
}

 normalizarColor(color) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color) ? color : "#000";
}

 aplicarItemAPunto(punto, item) {
  if (!item) return;

  punto.el.classList.remove("vacio");
  punto.el.classList.add("ocupado");

  punto.el.style.background = normalizarColor(item.color);
  punto.el.textContent = `#${item.id}`;

  punto.el.onclick = () => mostrarPopup(punto, item);
}

 obtenerLoteActual() {
  return mensajes.slice(offsetLote, offsetLote + TOTAL_PUNTOS);
}

 sincronizarPuntos(data) {
  puntos.forEach((punto, i) => {
    aplicarItemAPunto(punto, data[i]);
  });
}

 rotarLote() {
  if (mensajes.length <= TOTAL_PUNTOS) return;

  offsetLote = (offsetLote + TOTAL_PUNTOS) % mensajes.length;
  sincronizarPuntos(obtenerLoteActual());
}

 cargarMensajes() {
  if (fetchEnCurso) return;
  fetchEnCurso = true;

  fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    }
  })
    .then(r => r.json())
    .then(data => {
      mensajes = data || [];
      offsetLote = 0;
      sincronizarPuntos(obtenerLoteActual());
    })
    .catch(console.error)
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
});