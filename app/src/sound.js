// Sonidos tipo campana generados con Web Audio API — no dependen de archivos de audio.
// El navegador exige que el audio se "desbloquee" con una interacción del usuario primero
// (por eso cada pantalla llama a unlockAudio() en el primer clic/tap).

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c.state === 'suspended') c.resume();
}

// Un "golpe de campana": varios tonos superpuestos (armónicos ligeramente desafinados,
// como una campana real) con ataque rápido y caída lenta. Mucho más fuerte y notorio que
// un pitido simple.
function bell(freq, startTime, duration, volume = 0.35) {
  const c = getCtx();
  const partials = [1, 2.01, 2.99, 4.2];
  partials.forEach((mult, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    const peak = volume / (i * 0.7 + 1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// Campanada triple — "te llegó un pedido nuevo" (para cocina/barra).
export function playNewOrderSound() {
  try {
    unlockAudio();
    const c = getCtx();
    const t = c.currentTime;
    bell(880, t, 0.5);
    bell(880, t + 0.2, 0.5);
    bell(880, t + 0.4, 0.6);
  } catch (e) { /* el navegador puede bloquear audio hasta que haya interacción */ }
}

// Campanada triple ascendente — "tu pedido ya está listo" (para el mesero).
export function playReadySound() {
  try {
    unlockAudio();
    const c = getCtx();
    const t = c.currentTime;
    bell(660, t, 0.5);
    bell(880, t + 0.18, 0.5);
    bell(1100, t + 0.36, 0.8);
  } catch (e) { /* el navegador puede bloquear audio hasta que haya interacción */ }
}
