/**
 * Aura-Check — main.js v3.0 (Enhanced Edition)
 * ─────────────────────────────────────────────────────────────
 * Lógica frontend lista para producción.
 * Incorpora: Toasts, Historial Local, Modo Full Audit,
 * Skeleton Loaders, Waveform inactivo, y animaciones.
 */

"use strict";

const API_VERIFY = "/api/verify";

// ═══════════════════════════════════════════════
//  DOM REFS
// ═══════════════════════════════════════════════
const $ = (id) => document.getElementById(id);
const scannerStatus = $("scanner-status");

// Toasts & History
const toastContainer = $("toast-container");
const historySidebar = $("history-sidebar");
const historyList = $("history-list");
const btnToggleHistory = $("btn-toggle-history");
const btnCloseHistory = $("btn-close-history");
const btnClearHistory = $("btn-clear-history");

// Global Action
const btnFullAudit = $("btn-full-audit");
const globalProgressBar = $("global-progress-bar");
const globalProgressContainer = $("global-progress");

// Card 1
const cardBiometric = $("card-biometric");
const btnBiometric = $("btn-biometric");
const bioStatus = $("bio-status");
const bioAttempts = $("bio-attempts");

// Card 2
const cardCamera = $("card-camera");
const btnCamera = $("btn-camera");
const videoFeed = $("video-feed");
const camPlaceholder = $("camera-placeholder");
const camId = $("cam-id");
const camRes = $("cam-res");

// Card 3
const cardAudio = $("card-audio");
const btnAudio = $("btn-audio");
const waveformCanvas = $("waveform");
const audioHz = $("audio-hz");

// Card 4
const cardSystem = $("card-system");
const btnSystem = $("btn-system");
const sysBattery = $("sys-battery");
const sysCpu = $("sys-cpu");
const sysRam = $("sys-ram");
const sysAura = $("sys-aura");
const auraRing = $("aura-ring");


// ═══════════════════════════════════════════════
//  UTILITIES & UI ENHANCEMENTS
// ═══════════════════════════════════════════════

function setScannerStatus(text) {
  if (scannerStatus) scannerStatus.textContent = text;
}

// ── Toasts ──
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "";
  if (type === "success") icon = `<svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>`;
  else if (type === "warning") icon = `<svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  else if (type === "threat") icon = `<svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  else icon = `<svg class="w-4 h-4 text-cobalt" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── Skeleton Loader ──
function toggleSkeleton(cardElement, isScanning) {
    const container = cardElement.querySelector('.metric-container');
    if(container) {
        if(isScanning) container.classList.add('skeleton');
        else container.classList.remove('skeleton');
    }
}

function updateAuraRing(index) {
    const deg = Math.max(0, Math.min(360, index * 360));
    auraRing.style.background = `conic-gradient(#2D5BFF ${deg}deg, #27272A ${deg}deg)`;
}


// ── Storage & History ──
const HISTORY_KEY = "aura_audit_history";

function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function saveToHistory(record) {
  const h = getHistory();
  h.unshift(record);
  if (h.length > 20) h.pop(); // Keep last 20
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  renderHistory();
}

function renderHistory() {
  const h = getHistory();
  if (h.length === 0) {
      historyList.innerHTML = `<p class="text-zinc-600 text-xs font-mono text-center mt-4">Sin registros aún.</p>`;
      return;
  }
  
  historyList.innerHTML = h.map(item => {
      const colorCls = item.status === "CLEAR" ? "text-cobalt" : item.status === "WARNING" ? "text-amber-500" : "text-red-500";
      const date = new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
      return `
      <div class="history-item text-[0.65rem]">
          <div class="flex justify-between items-center mb-1">
              <span class="text-zinc-400">${date}</span>
              <span class="${colorCls} font-bold">${item.status}</span>
          </div>
          <div class="text-white truncate" title="${item.module.toUpperCase()}">${item.module.toUpperCase()}: ${(item.confidence * 100).toFixed(1)}% CF</div>
      </div>`;
  }).join("");
}

// Sidebar toggle
btnToggleHistory?.addEventListener("click", () => {
    renderHistory();
    historySidebar.classList.add("open");
});
btnCloseHistory?.addEventListener("click", () => historySidebar.classList.remove("open"));
btnClearHistory?.addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("Historial borrado", "info");
});


// ═══════════════════════════════════════════════
//  API & RUNNER CORE
// ═══════════════════════════════════════════════
function getSessionId() {
  let sid = sessionStorage.getItem("aura_session");
  if (!sid) {
    sid = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("aura_session", sid);
  }
  return sid;
}

async function callVerifyAPI(module) {
  const response = await fetch(API_VERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module, session_id: getSessionId() }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${response.status}`);
  }
  const data = await response.json();
  
  // Save to history automatically
  saveToHistory({
      timestamp: Date.now(),
      module: data.module,
      status: data.status,
      confidence: data.confidence_score
  });
  
  return data;
}

async function withLoading(btn, card, loadingText, action) {
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  const loadingIcon = `<svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`;
  btn.innerHTML = `${loadingIcon} <span class="btn-text opacity-75">${loadingText}</span>`;
  toggleSkeleton(card, true);
  
  try {
    await action();
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
    toggleSkeleton(card, false);
  }
}

// ═══════════════════════════════════════════════
//  CARD IMPLEMENTATIONS
// ═══════════════════════════════════════════════

// ── 1. Biometría ──
async function isBiometricSupported() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

let bioAttemptCount = 0;
const MAX_ATTEMPTS = 3;

async function runBiometricAudit() {
  if (bioAttemptCount >= MAX_ATTEMPTS) {
    setScannerStatus("BLOQUEADO");
    bioStatus.textContent = "BLOQ.";
    showToast("Módulo biométrico bloqueado. Se requieren privilegios admin.", "warning");
    throw new Error("Bloqueado");
  }

  cardBiometric.classList.add('scanning'); // Start CSS scanline
  setScannerStatus("VERIFICANDO...");
  
  try {
    const supported = await isBiometricSupported();
    const data = await callVerifyAPI("biometric");
    bioAttemptCount++;
    
    bioStatus.textContent = data.status;
    bioAttempts.textContent = `${bioAttemptCount} / ${MAX_ATTEMPTS}`;
    
    const webauthnNote = supported ? "WA ✓" : "WA ✗";
    setScannerStatus(data.status === "CLEAR" ? `ID OK · ${webauthnNote}` : `${data.status} · ${webauthnNote}`);
    handleToastOutcome(data, "Biometría");
    return data;
  } finally {
    cardBiometric.classList.remove('scanning');
  }
}

btnBiometric?.addEventListener("click", async () => {
    try { await withLoading(btnBiometric, cardBiometric, "Analizando...", runBiometricAudit); } catch(e){}
});

// ── 2. Cámara ──
let cameraStream = null;

async function runCameraAudit() {
  setScannerStatus("INICIANDO SENSOR...");
  try {
    if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        });
        videoFeed.srcObject = cameraStream;
        await videoFeed.play();
        camPlaceholder.style.display = "none";
        videoFeed.style.display = "block";
    }

    const track = cameraStream.getVideoTracks()[0];
    const settings = track.getSettings();
    camId.textContent = `CAM_${String(settings.deviceId ?? "00").slice(-6).toUpperCase()}`;
    camRes.textContent = settings.width ? `${settings.width}×${settings.height}` : "—";
    
    // Update button text locally to allow toggle off later
    btnCamera.querySelector('.btn-text').textContent = "Detener Visor";

    const data = await callVerifyAPI("camera");
    setScannerStatus(`SENSOR ACTIVO · ${data.status}`);
    handleToastOutcome(data, "Cámara");
    return data;
  } catch (err) {
    setScannerStatus(err.name === "NotAllowedError" ? "PERMISO DENEGADO" : "ERROR SENSOR");
    showToast("Fallo al acceder a la cámara", "threat");
    throw err;
  }
}

btnCamera?.addEventListener("click", async () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
    videoFeed.srcObject = null;
    videoFeed.style.display = "none";
    camPlaceholder.style.display = "block";
    camId.textContent = "CAM_00";
    camRes.textContent = "—";
    btnCamera.querySelector('.btn-text').textContent = "Activar Visor";
    setScannerStatus("SISTEMA LISTO");
    return;
  }
  try { await withLoading(btnCamera, cardCamera, "Iniciando...", runCameraAudit); } catch(e){}
});

// ── 3. Audio ──
let audioCtx = null, analyser = null, micStream = null, rafId = null;

function renderIdleWaveform(ctx, w, h) {
    const t = Date.now() / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(45,91,255,0.3)";
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
        // Very subtle sine wave for idle state
        const y = h/2 + Math.sin(x * 0.05 + t * 2) * 2;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    rafId = requestAnimationFrame(() => renderIdleWaveform(ctx, w, h));
}

function startIdleWaveform() {
    if(!waveformCanvas) return;
    const ctx = waveformCanvas.getContext("2d");
    waveformCanvas.width = waveformCanvas.offsetWidth || 280;
    waveformCanvas.height = waveformCanvas.offsetHeight || 52;
    if(rafId) cancelAnimationFrame(rafId);
    renderIdleWaveform(ctx, waveformCanvas.width, waveformCanvas.height);
}

function drawActiveWaveform() {
  if (!analyser || !waveformCanvas) return;
  const ctx = waveformCanvas.getContext("2d");
  const W = waveformCanvas.width;
  const H = waveformCanvas.height;
  const buffer = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(buffer);
  
  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#2D5BFF";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "rgba(45,91,255,0.5)";
  ctx.beginPath();
  
  const sliceW = W / buffer.length;
  let x = 0;
  for (let i = 0; i < buffer.length; i++) {
    const y = ((buffer[i] / 128.0) * H) / 2;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    x += sliceW;
  }
  ctx.stroke();
  rafId = requestAnimationFrame(drawActiveWaveform);
}

async function runAudioAudit() {
   setScannerStatus("INICIANDO MIC...");
   try {
       if(!micStream) {
           micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
           audioCtx = new (window.AudioContext || window.webkitAudioContext)();
           analyser = audioCtx.createAnalyser();
           analyser.fftSize = 512;
           audioCtx.createMediaStreamSource(micStream).connect(analyser);
       }
       
       audioHz.textContent = `${(audioCtx.sampleRate/1000).toFixed(1)}k Hz`;
       
       if(rafId) cancelAnimationFrame(rafId);
       drawActiveWaveform();
       btnAudio.querySelector('.btn-text').textContent = "Detener Onda";

       const data = await callVerifyAPI("audio");
       setScannerStatus(`ONDA CAPTURADA · ${data.status}`);
       handleToastOutcome(data, "Audio");
       return data;
   } catch (err) {
       setScannerStatus(err.name === "NotAllowedError" ? "MIC DENEGADO" : "ERROR AUDIO");
       showToast("Fallo al acceder al micrófono", "threat");
       throw err;
   }
}

btnAudio?.addEventListener("click", async () => {
    if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
        if(rafId) cancelAnimationFrame(rafId);
        audioHz.textContent = "— Hz";
        btnAudio.querySelector('.btn-text').textContent = "Capturar Onda";
        startIdleWaveform();
        setScannerStatus("SISTEMA LISTO");
        return;
    }
    try { await withLoading(btnAudio, cardAudio, "Iniciando...", runAudioAudit); } catch(e){}
});

// ── 4. Sistema ──
async function runSystemAudit() {
   setScannerStatus("DIAGNOSTICANDO...");
   try {
        if ("getBattery" in navigator) {
            const bat = await navigator.getBattery();
            sysBattery.textContent = `${Math.round(bat.level * 100)}%`;
        } else sysBattery.textContent = "N/A";

        if (performance.memory) {
            const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            sysRam.textContent = `${usedMB} MB`;
        } else sysRam.textContent = "N/A";

        sysCpu.textContent = `${navigator.hardwareConcurrency ?? "?"} Cores`;

        const data = await callVerifyAPI("system");
        sysAura.textContent = `${(data.aura_index * 100).toFixed(0)}%`;
        updateAuraRing(data.aura_index);
        
        setScannerStatus(`AURA ${(data.aura_index * 100).toFixed(0)}% · ${data.status}`);
        handleToastOutcome(data, "Sistema");
        return data;
   } catch(err) {
       sysAura.textContent = "ERR";
       showToast("Error en módulo de sistema", "threat");
       throw err;
   }
}

btnSystem?.addEventListener("click", async () => {
    try { await withLoading(btnSystem, cardSystem, "Escaneando...", runSystemAudit); } catch(e){}
});

// Helper for toasts
function handleToastOutcome(data, modName) {
    if(data.status === "CLEAR") showToast(`${modName}: Todo en orden.`, "success");
    else if(data.status === "WARNING") showToast(`${modName}: Advertencia detectada.`, "warning");
    else showToast(`${modName}: Amenaza activa interceptada.`, "threat");
}

// ═══════════════════════════════════════════════
//  FULL AUDIT SEQUENCER
// ═══════════════════════════════════════════════
btnFullAudit?.addEventListener("click", async () => {
    if(btnFullAudit.disabled) return;
    btnFullAudit.disabled = true;
    
    const oriText = btnFullAudit.innerHTML;
    globalProgressContainer.classList.remove('hidden');
    globalProgressBar.style.width = '0%';
    
    let currentStep = 0;
    const totalSteps = 4;
    const updateProg = () => {
        currentStep++;
        globalProgressBar.style.width = `${(currentStep/totalSteps)*100}%`;
    };

    try {
        btnFullAudit.innerHTML = `<span class="opacity-80">1/4: Biometría...</span>`;
        await runBiometricAudit();
        updateProg();
        await new Promise(r => setTimeout(r, 600)); // Pause between runs for UX

        btnFullAudit.innerHTML = `<span class="opacity-80">2/4: Cámara...</span>`;
        await runCameraAudit();
        updateProg();
        await new Promise(r => setTimeout(r, 600));

        btnFullAudit.innerHTML = `<span class="opacity-80">3/4: Audio...</span>`;
        await runAudioAudit();
        updateProg();
        await new Promise(r => setTimeout(r, 600));

        btnFullAudit.innerHTML = `<span class="opacity-80">4/4: Sistema...</span>`;
        await runSystemAudit();
        updateProg();
        
        btnFullAudit.innerHTML = `<span>✓ Auditoría Completada</span>`;
        showToast("Auditoría Total Finalizada", "success");
        
    } catch(e) {
        btnFullAudit.innerHTML = `<span>✗ Auditoría Interrumpida</span>`;
        showToast("Secuencia abortada por un error o denegación de acceso.", "threat");
    } finally {
        setTimeout(() => {
            globalProgressContainer.classList.add('hidden');
            btnFullAudit.disabled = false;
            btnFullAudit.innerHTML = oriText;
        }, 3000);
    }
});


// ═══════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════
(async () => {
  const biometricOk = await isBiometricSupported();
  if (bioStatus && bioStatus.textContent === "ESPERA") {
      bioStatus.textContent = biometricOk ? "LISTO" : "N/A";
  }
  startIdleWaveform();
})();
