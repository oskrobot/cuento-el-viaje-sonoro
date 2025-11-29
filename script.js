const spreads = Array.from(document.querySelectorAll(".spread"));
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const startStoryBtn = document.getElementById("startStoryBtn");
const toggleMusicBtn = document.getElementById("toggleMusicBtn");
const controlsBottom = document.getElementById("controlsBottom");

const bgMusic = document.getElementById("bg-music");
const pageAudio = document.getElementById("page-audio");
const audioControls = Array.from(
  document.querySelectorAll(".page-audio-control")
);

// Páginas de texto del cuento
const textPages = Array.from(
  document.querySelectorAll(".spread-story .page--text")
);

// Marca como "scrollable" solo las páginas cuyo contenido no cabe en el alto disponible
function updateScrollablePages() {
  textPages.forEach((page) => {
    page.classList.remove("scrollable");

    // Si el contenido interno es más alto que la propia página (con un pequeño margen), activamos scroll
    const extra = page.scrollHeight - page.clientHeight;
    if (extra > 5) {
      page.classList.add("scrollable");
    }
  });
}

// ---- Narración por página ----
// Audio actual y control asociado
let currentPageAudioSrc = "";
let currentAudioControl = null;
const audioProgressMap = new Map();

// Mapa control → barra de progreso
audioControls.forEach((control) => {
  const fill = control.querySelector(".audio-progress-fill");
  if (fill) {
    audioProgressMap.set(control, fill);
  }
});

function setControlPlaying(control, isPlaying) {
  if (!control) return;
  const playBtn = control.querySelector('.btn-audio[data-action="play"]');
  if (!playBtn) return;

  if (isPlaying) {
    document
      .querySelectorAll(".btn-audio.is-playing")
      .forEach((btn) => btn.classList.remove("is-playing"));
    playBtn.classList.add("is-playing");
  } else {
    playBtn.classList.remove("is-playing");
  }
}

function stopPageNarration() {
  pageAudio.pause();
  pageAudio.currentTime = 0;

  if (currentAudioControl) {
    setControlPlaying(currentAudioControl, false);
    const fill = audioProgressMap.get(currentAudioControl);
    if (fill) {
      fill.style.width = "0%";
    }
  }

  currentPageAudioSrc = "";
  currentAudioControl = null;
}

// Volumen de la música de fondo más bajo
bgMusic.volume = 0.1;

let currentSpread = 0;
let musicEnabled = true;
let isTurning = false; // para evitar doble clic durante la animación

// ---- Botones de navegación ----
function updateButtons() {
  prevBtn.disabled = currentSpread === 0;
  nextBtn.disabled = currentSpread === spreads.length - 1;

  // Ocultar controles de navegación en la portada
  if (currentSpread === 0) {
    controlsBottom.classList.add("hidden");
  } else {
    controlsBottom.classList.remove("hidden");
  }
}

function showSpread(newIndex, direction = "next") {
  if (newIndex < 0 || newIndex >= spreads.length) return;
  if (newIndex === currentSpread) return;
  if (isTurning) return; // ya se está pasando página

  const current = spreads[currentSpread];
  const target = spreads[newIndex];

  // Detener narración al cambiar de página
  stopPageNarration();

  isTurning = true;

  // Mostrar sólo el spread actual y el nuevo
  spreads.forEach((spread, index) => {
    if (index === currentSpread || index === newIndex) {
      spread.style.display = "flex";
      spread.classList.add("active");
    } else {
      spread.style.display = "none";
      spread.classList.remove("active");
    }
    spread.style.zIndex = "0";
  });

  // El spread nuevo va encima (la hoja que entra pertenece al nuevo)
  if (target) target.style.zIndex = "2";
  if (current) current.style.zIndex = "1";

  let turningPage = null;
  let animationClass = "";

  if (direction === "next") {
    // Vamos hacia adelante: entra la página izquierda del spread nuevo
    turningPage = target ? target.querySelector(".page:first-child") : null;
    animationClass = "page-turn-next";
  } else {
    // Vamos hacia atrás: entra la página derecha del spread nuevo
    turningPage = target ? target.querySelector(".page:last-child") : null;
    animationClass = "page-turn-prev";
  }

  // Si no hay página que animar, hacemos el cambio simple
  if (!turningPage) {
    spreads.forEach((spread, index) => {
      const isTarget = index === newIndex;
      spread.style.display = isTarget ? "flex" : "none";
      spread.classList.toggle("active", isTarget);
    });
    currentSpread = newIndex;
    updateButtons();
    isTurning = false;
    // Recalcular si la nueva página de texto necesita scroll
    updateScrollablePages();
    return;
  }

  // Limpiar animaciones anteriores
  turningPage.classList.remove("page-turn-next", "page-turn-prev");

  // Pequeño truco para reiniciar la animación
  setTimeout(() => {
    turningPage.classList.add(animationClass);
  }, 0);

  function onAnimationEnd() {
    turningPage.classList.remove(animationClass);
    turningPage.removeEventListener("animationend", onAnimationEnd);

    // Al terminar, dejamos sólo el spread nuevo visible
    spreads.forEach((spread, index) => {
      const isTarget = index === newIndex;
      spread.style.display = isTarget ? "flex" : "none";
      spread.classList.toggle("active", isTarget);
      spread.style.zIndex = "0";
    });

    currentSpread = newIndex;
    updateButtons();
    // Recalcular si la nueva página de texto necesita scroll
    updateScrollablePages();
    isTurning = false;
  }

  turningPage.addEventListener("animationend", onAnimationEnd);
}

// Navegación
prevBtn.addEventListener("click", () => {
  showSpread(currentSpread - 1, "prev");
});

nextBtn.addEventListener("click", () => {
  showSpread(currentSpread + 1, "next");
});

// Botón de la portada → primera doble página
startStoryBtn.addEventListener("click", () => {
  showSpread(1, "next");
});

// Reproducir / pausar / detener narración de cada página con iconos
audioControls.forEach((control) => {
  const audioSrc = control.dataset.audio;
  if (!audioSrc) return;

  const playBtn = control.querySelector('.btn-audio[data-action="play"]');
  const pauseBtn = control.querySelector('.btn-audio[data-action="pause"]');
  const stopBtn = control.querySelector('.btn-audio[data-action="stop"]');

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      // Si es otro audio diferente al actual, lo cargamos
      if (currentPageAudioSrc !== audioSrc || !currentAudioControl) {
        stopPageNarration();
        currentPageAudioSrc = audioSrc;
        currentAudioControl = control;
        pageAudio.src = audioSrc;
      }

      pageAudio
        .play()
        .then(() => {
          setControlPlaying(control, true);
        })
        .catch(() => {});
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      if (currentAudioControl !== control) return;
      if (!pageAudio.paused) {
        pageAudio.pause();
      }
      setControlPlaying(control, false);
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      if (currentAudioControl !== control) return;
      stopPageNarration();
    });
  }
});

// Iniciar la música al primer clic en cualquier parte (políticas de autoplay)
document.addEventListener("click", function startBgMusic() {
  if (musicEnabled && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }
  document.removeEventListener("click", startBgMusic);
});

// Botón para encender/apagar la música de fondo
toggleMusicBtn.addEventListener("click", () => {
  if (bgMusic.paused) {
    musicEnabled = true;
    bgMusic.play().catch(() => {});
    toggleMusicBtn.textContent = "🔊 Música: ON";
  } else {
    musicEnabled = false;
    bgMusic.pause();
    toggleMusicBtn.textContent = "🔈 Música: OFF";
  }
});

// Actualizar la barra de progreso
pageAudio.addEventListener("timeupdate", () => {
  if (!currentAudioControl) return;
  const fill = audioProgressMap.get(currentAudioControl);
  if (!fill) return;

  if (pageAudio.duration && !isNaN(pageAudio.duration)) {
    const percent = (pageAudio.currentTime / pageAudio.duration) * 100;
    fill.style.width = `${percent}%`;
  }
});

// Cuando termina la narración
pageAudio.addEventListener("ended", () => {
  if (!currentAudioControl) return;

  const fill = audioProgressMap.get(currentAudioControl);
  if (fill) {
    fill.style.width = "100%"; // si prefieres que vuelva a cero, pon "0%"
  }

  setControlPlaying(currentAudioControl, false);
  currentPageAudioSrc = "";
  currentAudioControl = null;
});

// Estado inicial
updateButtons();

// Estado inicial de páginas desplazables
updateScrollablePages();

// Recalcular scroll cuando cambie el tamaño de la ventana
window.addEventListener("resize", updateScrollablePages);

// Y también cuando termine de cargar todo (por si cambian alturas de fuentes/imágenes)
window.addEventListener("load", updateScrollablePages);
