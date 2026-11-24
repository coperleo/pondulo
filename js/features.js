/**
 * PONDULO — Interactive Product Features Module
 * 1. Live Touchless UI Simulator (8x8 VL53L7CX ToF Heatmap + 320x240 ILI9341 Dwell/Swipe + 8-Digit 7-Seg + K.I.T.T. + WebAudio)
 * 2. Before/After Interactive Comparison Slider (Fusion 360 CAD Blueprint vs Real Prototype Internals)
 * 3. Filterable Engineering BOM Table cross-verified with EmanuelChirico/Pondulo firmware repo
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIVE PONDULO TOUCHLESS SIMULATOR (8x8 ToF + ILI9341 + 7-SEG + WEBAUDIO)
// ─────────────────────────────────────────────────────────────────────────────

function initPonduloSimulator() {
  const pad = document.getElementById('sim-tof-pad');
  const screen = document.getElementById('sim-tft-screen');
  const segWrap = document.getElementById('sim-seven-seg');
  const weightSlider = document.getElementById('sim-weight-slider');
  const weightVal = document.getElementById('sim-weight-val');
  const telEl = document.getElementById('sim-tof-telemetry');
  const btnTare = document.getElementById('sim-btn-tare');
  const btnKitt = document.getElementById('sim-btn-kitt');
  const btnAudio = document.getElementById('sim-btn-audio');
  const btnSwipeL = document.getElementById('sim-swipe-left');
  const btnSwipeR = document.getElementById('sim-swipe-right');
  const toastEl = document.getElementById('sim-toast');
  if (!pad || !screen || !segWrap) return;

  // Build 64 VL53L7CX 8x8 SPAD cells
  const cells = [];
  pad.innerHTML = '';
  for (let i = 0; i < 64; i++) {
    const c = document.createElement('div');
    c.className = 'tof-cell';
    pad.appendChild(c);
    cells.push(c);
  }

  // Optional gentle WebAudio synthesizer mimicking YX5300 acoustic cues
  let audioCtx = null;
  let audioOn = false;
  function playTone(freq = 880, dur = 0.08, type = 'sine', freq2 = null) {
    if (!audioOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, audioCtx.currentTime + dur);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch { /* ignore */ }
  }

  btnAudio?.addEventListener('click', () => {
    audioOn = !audioOn;
    btnAudio.classList.toggle('active', audioOn);
    btnAudio.textContent = audioOn ? '🔊 Audio YX5300 ON' : '🔇 Audio YX5300 OFF';
    if (audioOn) playTone(660, 0.12, 'triangle', 990);
  });

  const PRODUCTS = [
    { name: 'Manzo', price: 18.90, emoji: '🥩' },
    { name: 'Pollo', price: 11.50, emoji: '🍗' },
    { name: 'Maiale', price: 13.40, emoji: '🥓' },
    { name: 'Agnello', price: 22.80, emoji: '🍖' },
  ];

  const sim = {
    view: 'home',        // 'home' | 'food_select' | 'scale' | 'clinical' | 'anamnesi'
    prodIdx: 0,
    weightG: 342.5,
    tareOffset: 0,
    cartCount: 0,
    cartTotal: 0,
    cx: 0.5,
    cy: 0.5,
    handActive: false,
    hoverBtnId: null,
    dwellStart: 0,
    dwellPct: 0,
    kittActive: false,
    kittPos: 0,
    kittDir: 1,
    lastSwipeX: null,
    lastSwipeT: 0,
  };

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function getNetWeight() {
    return Math.max(0, sim.weightG - sim.tareOffset);
  }

  function sync3DModel(userInteracted = false) {
    if (!window.ponduloLiveSim) return;
    if (!userInteracted && !window.ponduloLiveSim.overrideActive) return;
    const p = PRODUCTS[sim.prodIdx];
    window.ponduloLiveSim.overrideActive = true;
    window.ponduloLiveSim.mode = (sim.view === 'clinical' || sim.view === 'anamnesi') ? 'clinical' : 'food';
    window.ponduloLiveSim.product = p.name;
    window.ponduloLiveSim.price = p.price;
    window.ponduloLiveSim.weightG = getNetWeight();
    window.ponduloLiveSim.cursorX = sim.cx;
    window.ponduloLiveSim.cursorY = sim.cy;
    window.ponduloLiveSim.dwell = sim.dwellPct;
    window.ponduloLiveSim.kittPos = sim.kittActive ? sim.kittPos : -1;
  }

  function renderSevenSegDOM() {
    const net = getNetWeight();
    if (sim.kittActive) {
      let html = '';
      for (let i = 0; i < 8; i++) {
        html += `<span class="seg-digit ${i === sim.kittPos ? 'kitt-on' : 'seg-off'}">${i === sim.kittPos ? '—' : '8'}</span>`;
      }
      segWrap.innerHTML = html;
      return;
    }
    const centi = Math.max(0, Math.min(9999999, Math.round(net * 100)));
    let str = String(centi);
    if (str.length < 3) str = str.padStart(3, '0');
    str = str.padStart(8, ' ');
    let html = '';
    for (let i = 0; i < 8; i++) {
      const ch = str[i];
      const dp = i === 5 ? '<i class="seg-dp on"></i>' : '<i class="seg-dp"></i>';
      html += `<span class="seg-digit ${ch === ' ' ? 'seg-off' : ''}">${ch === ' ' ? '8' : ch}${dp}</span>`;
    }
    segWrap.innerHTML = html;
  }

  function renderScreen() {
    const p = PRODUCTS[sim.prodIdx];
    const net = getNetWeight();
    const total = (net / 1000) * p.price;
    const isEn = window.ponduloLang === 'en';

    let body = '';
    let header = 'PONDULO · HOME';
    if (sim.view === 'home') {
      header = isEn ? 'PONDULO · SELECT MODE' : 'PONDULO · SCEGLI MODALITÀ';
      body = `
        <div class="stft-grid-2">
          <button type="button" class="stft-btn stft-red" data-act="go-food">🥩 ${isEn ? 'RETAIL / SCALE' : 'MACELLERIA'}<i class="stft-dwell"></i></button>
          <button type="button" class="stft-btn stft-cyan" data-act="go-clinical">🏥 ${isEn ? 'CLINICAL' : 'CLINICO'}<i class="stft-dwell"></i></button>
        </div>
        <div class="stft-note">${isEn ? 'Hover 1.5s (Dwell) on a button or Swipe L/R' : 'Sosta 1,5 s (Dwell) su un tasto o fai Swipe SX/DX'}</div>
      `;
    } else if (sim.view === 'food_select') {
      header = isEn ? 'RETAIL · SELECT CUT' : 'MACELLERIA · SCEGLI TAGLIO';
      body = `<div class="stft-grid-2">` + PRODUCTS.map((item, idx) =>
        `<button type="button" class="stft-btn stft-slate" data-act="pick-${idx}">${item.emoji} ${item.name} <small>${item.price.toFixed(2)}€/kg</small><i class="stft-dwell"></i></button>`
      ).join('') + `</div>`;
    } else if (sim.view === 'scale') {
      header = `${isEn ? 'SCALE' : 'BILANCIA'} · ${p.name.toUpperCase()}`;
      body = `
        <div class="stft-meta">${p.price.toFixed(2)} €/kg · ${isEn ? 'Weight' : 'Peso'}: <strong>${net.toFixed(1)} g</strong></div>
        <div class="stft-total">${total.toFixed(2)} EUR</div>
        <div class="stft-meta">${isEn ? 'Cart' : 'Carrello'}: ${sim.cartCount} · ${sim.cartTotal.toFixed(2)} €</div>
        <div class="stft-grid-3">
          <button type="button" class="stft-btn stft-slate" data-act="go-food">← ${isEn ? 'Cuts' : 'Tagli'}<i class="stft-dwell"></i></button>
          <button type="button" class="stft-btn stft-blue" data-act="add-cart">+ ${isEn ? 'CART' : 'CARRELLO'}<i class="stft-dwell"></i></button>
          <button type="button" class="stft-btn stft-green" data-act="print">✓ ${isEn ? 'RECEIPT' : 'STAMPA'}<i class="stft-dwell"></i></button>
        </div>
      `;
    } else if (sim.view === 'clinical') {
      header = isEn ? 'CLINICAL · PATIENT #01' : 'CLINICO · PAZIENTE #01';
      body = `
        <div class="stft-vitals">
          <div><small>FC</small><strong>72 bpm</strong></div>
          <div><small>PA</small><strong>120/80</strong></div>
          <div><small>SpO₂</small><strong>98%</strong></div>
          <div><small>TEMP</small><strong>36.7°C</strong></div>
        </div>
        <div class="stft-grid-2">
          <button type="button" class="stft-btn stft-slate" data-act="go-home">← Home<i class="stft-dwell"></i></button>
          <button type="button" class="stft-btn stft-cyan" data-act="go-anamnesi">${isEn ? 'History →' : 'Anamnesi →'}<i class="stft-dwell"></i></button>
        </div>
      `;
    } else {
      header = isEn ? 'CLINICAL · HISTORY' : 'CLINICO · ANAMNESI';
      body = `
        <div class="stft-anamnesi">
          <div><strong>${isEn ? 'Blood:' : 'Gruppo:'}</strong> 0 Rh+ · <strong>${isEn ? 'Age:' : 'Età:'}</strong> 44</div>
          <div><strong>${isEn ? 'Allergies:' : 'Allergie:'}</strong> ${isEn ? 'Penicillin' : 'Penicillina'}</div>
          <div><strong>${isEn ? 'Ward:' : 'Reparto:'}</strong> ${isEn ? 'Sterile Surgery B' : 'Chirurgia Sterile B'}</div>
        </div>
        <div class="stft-grid-2">
          <button type="button" class="stft-btn stft-slate" data-act="go-clinical">← ${isEn ? 'Vitals' : 'Parametri'}<i class="stft-dwell"></i></button>
          <button type="button" class="stft-btn stft-red" data-act="go-home">⌂ Home<i class="stft-dwell"></i></button>
        </div>
      `;
    }

    screen.innerHTML = `
      <div class="stft-bar"><span>${header}</span><span>ToF 8×8</span></div>
      <div class="stft-body">${body}</div>
      <div class="stft-cursor" id="stft-cursor"></div>
    `;

    // Allow direct clicks on simulated TFT buttons too
    screen.querySelectorAll('.stft-btn').forEach((b) => {
      b.addEventListener('click', () => triggerAction(b.dataset.act));
    });
    updateCursorDOM();
    sync3DModel(false);
  }

  function triggerAction(act) {
    if (!act) return;
    sim.hoverBtnId = null;
    sim.dwellPct = 0;
    const isEn = window.ponduloLang === 'en';
    if (act === 'go-home') {
      sim.view = 'home';
      playTone(540, 0.08);
    } else if (act === 'go-food') {
      sim.view = 'food_select';
      playTone(680, 0.09);
    } else if (act === 'go-clinical') {
      sim.view = 'clinical';
      playTone(760, 0.09);
    } else if (act === 'go-anamnesi') {
      sim.view = 'anamnesi';
      playTone(820, 0.09);
    } else if (act.startsWith('pick-')) {
      sim.prodIdx = Number(act.split('-')[1]) || 0;
      sim.view = 'scale';
      playTone(720, 0.1, 'triangle', 980);
    } else if (act === 'add-cart') {
      const p = PRODUCTS[sim.prodIdx];
      const total = (getNetWeight() / 1000) * p.price;
      sim.cartCount += 1;
      sim.cartTotal += total;
      playTone(880, 0.09, 'sine', 1180);
      showToast(isEn ? `Added ${p.name} (+${total.toFixed(2)} €) to cart` : `Aggiunto ${p.name} (+${total.toFixed(2)} €) al carrello`);
    } else if (act === 'print') {
      const p = PRODUCTS[sim.prodIdx];
      const finalTot = sim.cartTotal > 0 ? sim.cartTotal : (getNetWeight() / 1000) * p.price;
      playTone(660, 0.12, 'triangle', 1320);
      showToast(isEn ? `Receipt printed: ${finalTot.toFixed(2)} EUR (YX5300 chime)` : `Scontrino emesso: ${finalTot.toFixed(2)} EUR (suono YX5300)`);
      sim.cartCount = 0;
      sim.cartTotal = 0;
    }
    sync3DModel(true);
    renderScreen();
  }

  function triggerSwipe(dir) {
    playTone(dir > 0 ? 520 : 780, 0.12, 'sine', dir > 0 ? 880 : 480);
    const order = ['home', 'food_select', 'scale', 'clinical', 'anamnesi'];
    const idx = order.indexOf(sim.view);
    const next = (idx + (dir > 0 ? 1 : -1) + order.length) % order.length;
    sim.view = order[next];
    showToast(dir > 0 ? 'Air-Swipe DX → ($GS 2)' : '← Air-Swipe SX ($GS 1)');
    sync3DModel(true);
    renderScreen();
  }

  function updateHeatmap(u, v) {
    const gx = u * 7;
    const gy = v * 7;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const d = Math.hypot(c - gx, r - gy);
        const val = Math.max(0, 1 - d / 2.65);
        const el = cells[r * 8 + c];
        if (val > 0.05) {
          const distMm = Math.round(75 + (1 - val) * 165);
          el.style.background = `rgba(${Math.round(56 + val * 194)}, ${Math.round(189 + val * 30)}, ${Math.round(248 - val * 200)}, ${(0.18 + val * 0.78).toFixed(2)})`;
          el.textContent = val > 0.52 ? distMm : '';
        } else {
          el.style.background = 'rgba(255,255,255,0.03)';
          el.textContent = '';
        }
      }
    }
    if (telEl) {
      const qx = Math.round(u * 320);
      const qy = Math.round(v * 240);
      telEl.textContent = `$XY ${qx},${qy} · Z 92mm · 15 Hz`;
    }
  }

  function updateCursorDOM() {
    const cur = document.getElementById('stft-cursor');
    if (!cur) return;
    cur.style.left = `${(sim.cx * 100).toFixed(1)}%`;
    cur.style.top = `${(sim.cy * 100).toFixed(1)}%`;
    cur.style.opacity = sim.handActive ? '1' : '0.45';
  }

  function handlePadMove(clientX, clientY) {
    const rect = pad.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const now = performance.now();
    // Detect crisp fast horizontal Air-Swipe across ToF pad
    if (sim.lastSwipeX !== null && now - sim.lastSwipeT < 220) {
      const dx = u - sim.lastSwipeX;
      if (Math.abs(dx) > 0.52) {
        sim.lastSwipeX = null;
        sim.lastSwipeT = now + 500;
        triggerSwipe(dx > 0 ? 1 : -1);
      }
    } else if (now > sim.lastSwipeT) {
      sim.lastSwipeX = u;
      sim.lastSwipeT = now;
    }

    sim.cx = u;
    sim.cy = v;
    sim.handActive = true;
    updateHeatmap(u, v);
    updateCursorDOM();
    sync3DModel(true);
  }

  pad.addEventListener('pointermove', (e) => handlePadMove(e.clientX, e.clientY));
  pad.addEventListener('pointerdown', (e) => handlePadMove(e.clientX, e.clientY));
  pad.addEventListener('pointerleave', () => {
    sim.handActive = false;
    sim.hoverBtnId = null;
    sim.dwellPct = 0;
    sim.lastSwipeX = null;
    cells.forEach((c) => { c.style.background = 'rgba(255,255,255,0.03)'; c.textContent = ''; });
    updateCursorDOM();
  });

  // Dwell 1.5s loop checking if Air-Cursor hovers over any TFT button
  setInterval(() => {
    if (!sim.handActive) return;
    const sRect = screen.getBoundingClientRect();
    const px = sRect.left + sim.cx * sRect.width;
    const py = sRect.top + sim.cy * sRect.height;
    let found = null;
    screen.querySelectorAll('.stft-btn').forEach((b) => {
      const br = b.getBoundingClientRect();
      const inside = px >= br.left && px <= br.right && py >= br.top && py <= br.bottom;
      b.classList.toggle('dwell-focus', inside);
      if (inside) found = b;
      else {
        const bar = b.querySelector('.stft-dwell');
        if (bar) bar.style.width = '0%';
      }
    });
    if (found) {
      const act = found.dataset.act;
      if (sim.hoverBtnId !== act) {
        sim.hoverBtnId = act;
        sim.dwellStart = performance.now();
        sim.dwellPct = 0;
      } else {
        sim.dwellPct = Math.min(1, (performance.now() - sim.dwellStart) / 1450);
        const bar = found.querySelector('.stft-dwell');
        if (bar) bar.style.width = `${(sim.dwellPct * 100).toFixed(0)}%`;
        if (sim.dwellPct >= 1) {
          triggerAction(act);
        }
      }
      sync3DModel();
    } else {
      sim.hoverBtnId = null;
      sim.dwellPct = 0;
    }
  }, 50);

  // Weight slider + presets + Tare + K.I.T.T. Easter Egg
  function setWeight(g) {
    sim.weightG = g;
    if (weightSlider) weightSlider.value = String(g);
    if (weightVal) weightVal.textContent = `${getNetWeight().toFixed(1)} g`;
    renderSevenSegDOM();
    sync3DModel(true);
    if (sim.view === 'scale') renderScreen();
  }

  weightSlider?.addEventListener('input', () => setWeight(Number(weightSlider.value)));
  document.querySelectorAll('[data-sim-weight]').forEach((b) => {
    b.addEventListener('click', () => {
      sim.tareOffset = 0;
      setWeight(Number(b.dataset.simWeight));
      playTone(620, 0.06);
    });
  });

  btnTare?.addEventListener('click', () => {
    sim.tareOffset = sim.weightG;
    if (weightVal) weightVal.textContent = '0.0 g';
    playTone(500, 0.08, 'sine', 750);
    renderSevenSegDOM();
    sync3DModel(true);
    if (sim.view === 'scale') renderScreen();
  });

  let kittTimer = null;
  btnKitt?.addEventListener('click', () => {
    sim.kittActive = !sim.kittActive;
    btnKitt.classList.toggle('active', sim.kittActive);
    clearInterval(kittTimer);
    if (sim.kittActive) {
      sim.kittPos = 0;
      sim.kittDir = 1;
      kittTimer = setInterval(() => {
        renderSevenSegDOM();
        sync3DModel(true);
        sim.kittPos += sim.kittDir;
        if (sim.kittPos >= 7 || sim.kittPos <= 0) sim.kittDir *= -1;
      }, 95);
    } else {
      renderSevenSegDOM();
      sync3DModel(true);
    }
  });

  btnSwipeL?.addEventListener('click', () => triggerSwipe(-1));
  btnSwipeR?.addEventListener('click', () => triggerSwipe(1));

  renderScreen();
  renderSevenSegDOM();
  window.ponduloRefreshSimulator = () => renderScreen();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERACTIVE FILTERABLE BOM TABLE (CROSS-VERIFIED WITH EmanuelChirico/Pondulo)
// ─────────────────────────────────────────────────────────────────────────────

const BOM_ITEMS = [
  {
    cat: 'mcu',
    name: 'STM32 NUCLEO-G474RE (MB1367)',
    qty: 3,
    roleIt: 'Scheda A (sensor-node), Scheda B (display-node), Scheda C (scale-node) · ChibiOS/RT 21.11',
    roleEn: 'Board A (sensor-node), Board B (display-node), Board C (scale-node) · ChibiOS/RT 21.11',
    bus: 'USART3 921.6k · I²C1 · SPI1 · DAC1/ADC2',
    unitEur: 14.5,
    dsLabel: 'ST Datasheet',
    dsUrl: 'https://www.st.com/en/evaluation-tools/nucleo-g474re.html',
  },
  {
    cat: 'sensor',
    name: 'X-NUCLEO-53L7A1 + VL53L7CX',
    qty: 1,
    roleIt: 'Sensore laser dToF 8×8 (64 zone SPAD, 940 nm VCSEL) per air-cursor e gesti',
    roleEn: '8×8 dToF laser sensor (64 SPAD zones, 940 nm VCSEL) for air-cursor & gestures',
    bus: 'I²C1 FM+ 1 MHz · PA4 EXTI4',
    unitEur: 36.0,
    dsLabel: 'ST Datasheet',
    dsUrl: 'https://www.st.com/en/imaging-and-photonics-solutions/vl53l7cx.html',
  },
  {
    cat: 'mcu',
    name: 'X-NUCLEO-GFX01M2 (ILI9341 2.2")',
    qty: 1,
    roleIt: 'Display TFT QVGA 320×240 RGB565 pilotato con uGFX a 50 Hz protetto da mutex',
    roleEn: '2.2" QVGA 320×240 RGB565 TFT display driven via mutex-guarded uGFX @ 50 Hz',
    bus: 'SPI Hardware (Scheda B)',
    unitEur: 28.0,
    dsLabel: 'ST Datasheet',
    dsUrl: 'https://www.st.com/en/evaluation-tools/x-nucleo-gfx01m2.html',
  },
  {
    cat: 'sensor',
    name: 'Cella di Carico Estensimetrica (1 kg)',
    qty: 1,
    roleIt: 'Barra in alluminio a ponte di Wheatstone tra telaio a X e piatto bianco',
    roleEn: 'Wheatstone-bridge aluminum bar between X-frame and white weighing platter',
    bus: '4 fili differenziali mV → HX711',
    unitEur: 6.5,
    dsLabel: 'Spec',
    dsUrl: 'https://github.com/EmanuelChirico/Pondulo/blob/main/docs/legacy/SCALE.md',
  },
  {
    cat: 'sensor',
    name: 'Modulo ADC 24-bit HX711',
    qty: 1,
    roleIt: 'Amplificatore PGA e conversione 24-bit nel piantone (driver bit-banged hx711.c)',
    roleEn: '24-bit PGA amplifier tucked in column cavity (bit-banged hx711.c driver)',
    bus: 'PB4 (DT) · PB10 (SCK) → Scheda C',
    unitEur: 2.5,
    dsLabel: 'Datasheet PDF',
    dsUrl: 'https://cdn.sparkfun.com/datasheets/Sensors/ForceFlex/hx711_english.pdf',
  },
  {
    cat: 'sensor',
    name: 'RobotDyn 8-Digit LED (2× CL3641BH + 2× 74HC595)',
    qty: 1,
    roleIt: 'Display locale 7-segmenti 8 cifre ad alto contrasto (cl3641bh8 + hc595)',
    roleEn: 'High-contrast local 8-digit 7-segment LED module (cl3641bh8 + hc595)',
    bus: 'SPI1: PB5 DIO · PB3 SCK · PC0 RCK',
    unitEur: 4.5,
    dsLabel: '74HC595 DS',
    dsUrl: 'https://www.ti.com/lit/ds/symlink/sn74hc595.pdf',
  },
  {
    cat: 'audio',
    name: 'Serial MP3 Player v1.2 (YX5300 + MicroSD)',
    qty: 1,
    roleIt: 'Riproduzione feedback vocali e suoni UI tramite frame seriali a 8 byte',
    roleEn: 'Plays UI audio cues from MicroSD via 8-byte serial command frames',
    bus: 'UART5 9600 baud (PC12/PD2) + AUX 3.5 mm',
    unitEur: 5.0,
    dsLabel: 'YX5300 Info',
    dsUrl: 'https://github.com/EmanuelChirico/Pondulo/blob/main/docs/HARDWARE.md',
  },
  {
    cat: 'audio',
    name: 'Amplificatore Audio + Altoparlante 45 mm',
    qty: 1,
    roleIt: 'Stadio potenza (cap 1000 µF 35 V + trimmer volume) e speaker fissato al telaio a X',
    roleEn: 'Power amp stage (1000 µF 35 V cap + volume pot) driving 45 mm speaker on X-arm',
    bus: 'Ingresso AUX 3.5 mm · 12 V DC',
    unitEur: 7.5,
    dsLabel: 'Schema',
    dsUrl: 'assets/media/pondulo_schema_fritzing.png',
  },
  {
    cat: 'audio',
    name: 'Modulo Wi-Fi ESP8266 (NodeMCU ESP-12F)',
    qty: 1,
    roleIt: 'Web UI HTTP + salvataggio atomico LittleFS per aggiornamento prezzi €/kg (banco test)',
    roleEn: 'HTTP Web UI + atomic LittleFS storage for remote €/kg price updates (test bench)',
    bus: 'UART1 38400 baud (TX → PC5)',
    unitEur: 6.0,
    dsLabel: 'Espressif DS',
    dsUrl: 'https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf',
  },
  {
    cat: 'power',
    name: 'Convertitore Buck DC-DC LM2596S',
    qty: 1,
    roleIt: 'Regolazione step-down 12 V → 5,0 V stabilizzati con massa stella comune',
    roleEn: 'Step-down regulation 12 V → stable 5.0 V rail with shared star GND',
    bus: 'IN 12 V DC → OUT 5 V (3 A max)',
    unitEur: 3.0,
    dsLabel: 'TI Datasheet',
    dsUrl: 'https://www.ti.com/lit/ds/symlink/lm2596.pdf',
  },
  {
    cat: 'power',
    name: 'Scocca 3D Fusion 360 (PLA Rosso + Bianco)',
    qty: 1,
    roleIt: 'Testa basculante 200×130 mm, colonna cava, base a X, piatto 134×134 mm (~420 g PLA)',
    roleEn: 'Tilting head 200×130 mm, hollow stem, X-frame base, 134×134 mm platter (~420 g PLA)',
    bus: 'Stampa FDM ~14 h · 4× viti M4',
    unitEur: 11.0,
    dsLabel: 'Modello 3D',
    dsUrl: '#top',
  },
];

function initBomTable() {
  const tbody = document.getElementById('bom-tbody');
  const totalEl = document.getElementById('bom-total-est');
  const countEl = document.getElementById('bom-count-est');
  if (!tbody) return;

  let activeCat = 'all';

  function render() {
    const isEn = window.ponduloLang === 'en';
    const filtered = activeCat === 'all' ? BOM_ITEMS : BOM_ITEMS.filter((i) => i.cat === activeCat);
    let totalCost = 0;
    let totalPieces = 0;
    tbody.innerHTML = filtered.map((item) => {
      const sub = item.qty * item.unitEur;
      totalCost += sub;
      totalPieces += item.qty;
      const ext = item.dsUrl.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td class="bom-num">${item.qty}×</td>
          <td>${isEn ? item.roleEn : item.roleIt}</td>
          <td><code>${item.bus}</code></td>
          <td class="bom-num">~€${sub.toFixed(0)}</td>
          <td><a href="${item.dsUrl}" class="bom-ds-link"${ext}>${item.dsLabel} ↗</a></td>
        </tr>
      `;
    }).join('');
    if (totalEl) totalEl.textContent = `~€${totalCost.toFixed(0)}`;
    if (countEl) countEl.textContent = `${totalPieces} ${isEn ? 'pcs' : 'pz'}`;
  }

  document.querySelectorAll('.bom-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bom-filter').forEach((b) => b.classList.toggle('active', b === btn));
      activeCat = btn.dataset.cat;
      render();
    });
  });

  render();
  window.ponduloRefreshBom = render;
}

document.addEventListener('DOMContentLoaded', () => {
  initPonduloSimulator();
  initBomTable();
});
