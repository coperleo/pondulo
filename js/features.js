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

  const DEFAULT_PRICES = [18.90, 11.50, 13.40, 22.80];
  const PRODUCTS = [
    { name: 'Manzo', nameEn: 'Beef', price: 18.90, emoji: '🥩' },
    { name: 'Pollo', nameEn: 'Chicken', price: 11.50, emoji: '🍗' },
    { name: 'Maiale', nameEn: 'Pork', price: 13.40, emoji: '🥓' },
    { name: 'Agnello', nameEn: 'Lamb', price: 22.80, emoji: '🍖' },
  ];

  const sim = {
    view: 'home',        // 'home' | 'food_select' | 'scale' | 'clinical' | 'anamnesi'
    prodIdx: 0,
    weightG: 342.5,
    tareOffset: 0,
    cartCount: 0,
    cartTotal: 0,
    cartItems: [],
    receiptSeq: 0,
    cx: 0.5,
    cy: 0.5,
    targetX: 0.5,
    targetY: 0.5,
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
      const wNet = getNetWeight();
      const total = (wNet / 1000) * p.price;
      sim.cartCount += 1;
      sim.cartTotal += total;
      sim.cartItems.push({
        name: p.name,
        nameEn: p.nameEn,
        emoji: p.emoji,
        weightG: wNet,
        priceKg: p.price,
        subtotal: total,
      });
      playTone(880, 0.09, 'sine', 1180);
      showToast(isEn ? `Added ${p.nameEn} (+${total.toFixed(2)} €) to cart` : `Aggiunto ${p.name} (+${total.toFixed(2)} €) al carrello`);
    } else if (act === 'print') {
      emitThermalReceipt();
    }
    sync3DModel(true);
    renderScreen();
  }

  // ── ANIMATED 58mm THERMAL RECEIPT (SILENT, ZERO OVERLAP) ──
  const receiptEl = document.getElementById('thermal-receipt');
  const receiptHintEl = document.getElementById('receipt-empty-hint');
  const btnPrintNow = document.getElementById('sim-btn-print-now');

  function emitThermalReceipt() {
    const isEn = window.ponduloLang === 'en';
    const p = PRODUCTS[sim.prodIdx];
    const wNet = getNetWeight();
    const lines = sim.cartItems.length > 0
      ? [...sim.cartItems]
      : [{
          name: p.name,
          nameEn: p.nameEn,
          emoji: p.emoji,
          weightG: wNet,
          priceKg: p.price,
          subtotal: (wNet / 1000) * p.price,
        }];

    const totalEur = lines.reduce((s, r) => s + r.subtotal, 0);
    const totalG = lines.reduce((s, r) => s + r.weightG, 0);
    sim.receiptSeq += 1;
    const seqStr = String(sim.receiptSeq).padStart(3, '0');
    const now = new Date();
    const dateStr = now.toLocaleDateString(isEn ? 'en-GB' : 'it-IT') + ' ' + now.toTimeString().slice(0, 5);

    if (receiptEl) {
      const rowsHtml = lines.map((r) => {
        const lbl = isEn ? r.nameEn : r.name;
        return `
          <div class="rcp-item">
            <div class="rcp-item-top">
              <strong>${lbl.toUpperCase()}</strong>
              <strong>${r.subtotal.toFixed(2)} €</strong>
            </div>
            <div class="rcp-item-sub">${r.weightG.toFixed(1)} g × ${r.priceKg.toFixed(2)} €/kg</div>
          </div>
        `;
      }).join('');

      // Deterministic crisp barcode bars
      const bars = [3,1,2,2,1,3,1,1,2,3,1,2,1,2,3,1,1,2,2,1,3,2,1,1,3];
      let bx = 6;
      const svgBars = bars.map((w, idx) => {
        const x = bx;
        bx += w * 3.1;
        return idx % 2 === 0 ? `<rect x="${x.toFixed(1)}" y="2" width="${(w * 2.6).toFixed(1)}" height="28" fill="#18181b"/>` : '';
      }).join('');

      receiptEl.hidden = false;
      receiptEl.classList.remove('feeding');
      // Force reflow so consecutive prints replay the smooth paper-feed animation!
      void receiptEl.offsetWidth;
      receiptEl.innerHTML = `
        <div class="rcp-head">
          <strong>PONDULO SMART SCALE</strong>
          <span>NISC 2026 · TEAM 6 · STMicroelectronics</span>
          <span>#${seqStr} · ${dateStr}</span>
        </div>
        <div class="rcp-divider"></div>
        <div class="rcp-items">${rowsHtml}</div>
        <div class="rcp-divider"></div>
        <div class="rcp-summary">
          <div><span>${isEn ? 'NET WEIGHT' : 'PESO NETTO'}</span><span>${totalG.toFixed(1)} g</span></div>
          <div class="rcp-grand"><span>${isEn ? 'TOTAL' : 'TOTALE'}</span><span>${totalEur.toFixed(2)} EUR</span></div>
        </div>
        <div class="rcp-footer">
          <span>100% TOUCHLESS · VL53L7CX 8×8</span>
          <svg class="rcp-barcode" viewBox="0 0 ${Math.ceil(bx + 6)} 32" aria-hidden="true">${svgBars}</svg>
          <button type="button" class="rcp-tear-btn" id="rcp-tear-btn">${isEn ? '✂ Tear off receipt' : '✂ Strappa scontrino'}</button>
        </div>
      `;
      receiptEl.classList.add('feeding');
      if (receiptHintEl) receiptHintEl.style.display = 'none';

      document.getElementById('rcp-tear-btn')?.addEventListener('click', () => {
        receiptEl.classList.remove('feeding');
        receiptEl.hidden = true;
        if (receiptHintEl) receiptHintEl.style.display = '';
      });
    }

    showToast(isEn ? `Receipt #${seqStr} printed: ${totalEur.toFixed(2)} EUR` : `Scontrino #${seqStr} stampato: ${totalEur.toFixed(2)} EUR`);
    sim.cartCount = 0;
    sim.cartTotal = 0;
    sim.cartItems = [];
  }

  btnPrintNow?.addEventListener('click', () => {
    emitThermalReceipt();
    sync3DModel(true);
    renderScreen();
  });

  // ── ESP8266 WI-FI PRICE WEB APP (http://192.168.4.1 -> LittleFS -> UART1 38400) ──
  const espListEl = document.getElementById('esp-price-list');
  const espSaveBtn = document.getElementById('esp-btn-save');
  const espResetBtn = document.getElementById('esp-btn-reset');
  const espLogEl = document.getElementById('esp-uart-log');
  const draftPrices = PRODUCTS.map((p) => p.price);

  function renderEspWebApp() {
    if (!espListEl) return;
    const isEn = window.ponduloLang === 'en';
    espListEl.innerHTML = PRODUCTS.map((item, idx) => {
      const lbl = isEn ? item.nameEn : item.name;
      return `
        <div class="esp-row">
          <span class="esp-cut-name">${item.emoji} <strong>${lbl}</strong></span>
          <div class="esp-stepper-wrap">
            <button type="button" class="esp-step-btn" data-esp-step="-0.5" data-idx="${idx}" aria-label="-0.50 €">−</button>
            <input type="number" class="esp-price-input" data-idx="${idx}" min="1" max="99.9" step="0.1" value="${draftPrices[idx].toFixed(2)}" aria-label="${lbl} €/kg" />
            <span class="esp-unit">€/kg</span>
            <button type="button" class="esp-step-btn" data-esp-step="0.5" data-idx="${idx}" aria-label="+0.50 €">+</button>
          </div>
        </div>
      `;
    }).join('');

    espListEl.querySelectorAll('.esp-step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const delta = Number(btn.dataset.espStep);
        draftPrices[idx] = Math.max(1.0, Math.min(99.9, Math.round((draftPrices[idx] + delta) * 100) / 100));
        const inp = espListEl.querySelector(`.esp-price-input[data-idx="${idx}"]`);
        if (inp) inp.value = draftPrices[idx].toFixed(2);
      });
    });

    espListEl.querySelectorAll('.esp-price-input').forEach((inp) => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const val = parseFloat(inp.value);
        if (!Number.isNaN(val)) {
          draftPrices[idx] = Math.max(1.0, Math.min(99.9, Math.round(val * 100) / 100));
        }
        inp.value = draftPrices[idx].toFixed(2);
      });
    });
  }

  function pushPricesOverUart1(isReset = false) {
    const isEn = window.ponduloLang === 'en';
    PRODUCTS.forEach((p, i) => {
      p.price = draftPrices[i];
    });
    const cur = PRODUCTS[sim.prodIdx];
    const centInt = Math.round(cur.price * 100);
    if (espLogEl) {
      espLogEl.classList.add('flashing');
      espLogEl.innerHTML = isReset
        ? `<code>LittleFS default ripristinato → TX UART1: PRODUCT_SYNC OK</code>`
        : `<code>write("/prices.tmp") → verify OK → rename("/prices.dat") → TX UART1: PRODUCT_UPD:${sim.prodIdx}:${centInt}</code>`;
      setTimeout(() => espLogEl.classList.remove('flashing'), 650);
    }
    showToast(isEn ? 'Prices updated via ESP8266 UART1!' : 'Listino aggiornato su STM32 via ESP8266 UART1!');
    sync3DModel(true);
    renderScreen();
  }

  espSaveBtn?.addEventListener('click', () => pushPricesOverUart1(false));
  espResetBtn?.addEventListener('click', () => {
    DEFAULT_PRICES.forEach((v, i) => { draftPrices[i] = v; });
    renderEspWebApp();
    pushPricesOverUart1(true);
  });
  renderEspWebApp();

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
    const sw = screen.clientWidth || 320;
    const sh = screen.clientHeight || 280;
    const px = sim.cx * sw;
    const py = sim.cy * sh;
    cur.style.transform = `translate3d(${(px - 7.5).toFixed(1)}px, ${(py - 7.5).toFixed(1)}px, 0)`;
    cur.style.opacity = sim.handActive ? '1' : '0.45';
  }

  // Smooth EMA glide loop (mirrors PONDULO's real 100 Hz EMA cursor filter; auto-pauses when tab is hidden)
  let lastGlideT = performance.now();
  function glideLoop(now) {
    if (!document.hidden) {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastGlideT) / 1000));
      const alpha = 1 - Math.exp(-dt * 8.0);
      const dx = sim.targetX - sim.cx;
      const dy = sim.targetY - sim.cy;
      if (Math.abs(dx) > 0.00035 || Math.abs(dy) > 0.00035) {
        sim.cx += dx * alpha;
        sim.cy += dy * alpha;
        updateCursorDOM();
        if (sim.handActive) {
          updateHeatmap(sim.cx, sim.cy);
          sync3DModel(true);
        }
      }
    }
    lastGlideT = now;
    requestAnimationFrame(glideLoop);
  }
  requestAnimationFrame(glideLoop);

  function handlePadMove(clientX, clientY) {
    const rect = pad.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
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

    sim.targetX = u;
    sim.targetY = v;
    sim.handActive = true;
    updateHeatmap(sim.cx, sim.cy);
    updateCursorDOM();
    sync3DModel(true);
  }

  function clearHand() {
    sim.handActive = false;
    sim.hoverBtnId = null;
    sim.dwellPct = 0;
    sim.lastSwipeX = null;
    cells.forEach((c) => { c.style.background = 'rgba(255,255,255,0.03)'; c.textContent = ''; });
    screen.querySelectorAll('.stft-btn').forEach((b) => {
      b.classList.remove('dwell-focus');
      const bar = b.querySelector('.stft-dwell');
      if (bar) bar.style.width = '0%';
    });
    updateCursorDOM();
  }

  pad.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') {
      try { pad.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    handlePadMove(e.clientX, e.clientY);
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' && !sim.handActive) return;
    handlePadMove(e.clientX, e.clientY);
  });
  pad.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') clearHand();
  });
  pad.addEventListener('pointercancel', clearHand);
  pad.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') clearHand();
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
  window.ponduloRefreshSimulator = () => {
    renderScreen();
    renderEspWebApp();
  };
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
  const countEl = document.getElementById('bom-count-est');
  if (!tbody) return;

  let activeCat = 'all';

  function render() {
    const isEn = window.ponduloLang === 'en';
    const filtered = activeCat === 'all' ? BOM_ITEMS : BOM_ITEMS.filter((i) => i.cat === activeCat);
    let totalPieces = 0;
    tbody.innerHTML = filtered.map((item) => {
      totalPieces += item.qty;
      const ext = item.dsUrl.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `
        <tr>
          <td><strong>${item.name}</strong></td>
          <td class="bom-num">${item.qty}×</td>
          <td>${isEn ? item.roleEn : item.roleIt}</td>
          <td><code>${item.bus}</code></td>
          <td><a href="${item.dsUrl}" class="bom-ds-link"${ext}>${item.dsLabel} ↗</a></td>
        </tr>
      `;
    }).join('');
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. INTERACTIVE BENCH OSCILLOSCOPE & LOGIC ANALYZER (4 REAL STM32 BUSES)
// ─────────────────────────────────────────────────────────────────────────────

function initArchOscilloscope() {
  const canvas = document.getElementById('arch-scope-canvas');
  const readoutsEl = document.getElementById('scope-readouts');
  const descEl = document.getElementById('scope-desc');
  const dacCtrlEl = document.getElementById('scope-dac-ctrl');
  const weightSlider = document.getElementById('scope-weight-slider');
  const weightVal = document.getElementById('scope-weight-val');
  const btnPwm = document.getElementById('scope-btn-pwm');
  const btnHold = document.getElementById('scope-btn-hold');
  const scopeCard = document.getElementById('arch-scope');
  if (!canvas || !scopeCard) return;

  const ctx = canvas.getContext('2d');
  let activeBus = 'dac'; // 'dac' | 'usart3' | 'i2c1' | 'spi1'
  let testWeightG = 685;
  let showDiscardedPwm = false;
  let hold = false;
  let scopeVisible = false;
  let phase = 0;
  let lastT = performance.now();

  const BUS_INFO = {
    dac: {
      descIt: 'Tensione continua pura generata da DAC1_OUT1 (PA4 su Scheda C) e campionata da ADC2_IN17 (PA4 su Scheda B): 0,00 V = 0 g → 3,30 V = 1000 g. Attiva il confronto per vedere il ripple/jitter del vecchio segnale PWM scartato in laboratorio.',
      descEn: 'Pure DC voltage output by DAC1_OUT1 (PA4 on Board C) and sampled by ADC2_IN17 (PA4 on Board B): 0.00 V = 0 g → 3.30 V = 1000 g. Toggle comparison to see the noisy PWM ripple we discarded in the lab.',
    },
    usart3: {
      descIt: 'Flusso seriale ad alta velocità (921.600 baud, 1,08 µs/bit, PC10 → PC11): Scheda A invia stringhe ASCII leggere ($XY x,y e $GS dir) calcolate in virgola fissa Q16 verso Scheda B.',
      descEn: 'High-speed UART link (921,600 baud, 1.08 µs/bit, PC10 → PC11): Board A streams lightweight ASCII frames ($XY x,y and $GS dir) computed in Q16 fixed-point to Board B.',
    },
    i2c1: {
      descIt: 'Acquisizione event-driven del sensore ToF VL53L7CX: appena una scansione 8×8 è pronta, il pin INT (PA4) scende attivo-basso svegliando il thread ChibiOS che legge le 64 distanze su I²C1 Fast Mode+ a 1 MHz (addr 0x52).',
      descEn: 'Event-driven VL53L7CX ToF readout: when an 8×8 frame is ready, INT (PA4) pulls active-low, waking the ChibiOS thread to burst-read all 64 zones over 1 MHz I²C1 Fast Mode+ (addr 0x52).',
    },
    spi1: {
      descIt: 'Pilotaggio dei due shift register 74HC595 in cascata (SPI1 @ 83 Hz): PB5 (DIO) e PB3 (SCK) caricano 16 bit (segmenti + cifra ruotata {4,5,6,7,0,1,2,3}), poi l’impulso su PC0 (RCK) aggiorna i LED in un solo colpo.',
      descEn: 'Driving the two cascaded 74HC595 shift registers (SPI1 @ 83 Hz): PB5 (DIO) and PB3 (SCK) shift 16 bits (segments + rotated digit mask), then a clean latch pulse on PC0 (RCK) updates the LEDs.',
    },
  };

  function resizeScopeCanvas() {
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(300, Math.floor(rect.width));
    const h = window.innerWidth < 680 ? 220 : 250;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function updateMetaUI() {
    const isEn = window.ponduloLang === 'en';
    const info = BUS_INFO[activeBus] || BUS_INFO.dac;
    if (descEl) descEl.textContent = isEn ? info.descEn : info.descIt;
    if (dacCtrlEl) dacCtrlEl.style.display = activeBus === 'dac' ? 'flex' : 'none';

    if (!readoutsEl) return;
    if (activeBus === 'dac') {
      const volts = (testWeightG / 1000) * 3.3;
      const adc12 = Math.round((testWeightG / 1000) * 4095);
      readoutsEl.innerHTML = `
        <span>CH1 DC: <strong>${volts.toFixed(3)} V</strong></span>
        <span>ADC2 12-bit: <strong>${adc12} / 4095</strong></span>
        <span>${isEn ? 'Scale' : 'Scala'}: <strong>3.3 mV/g</strong></span>
        <span>${showDiscardedPwm ? '<em style="color:#f87171">PWM Jitter: ±2.6 g</em>' : 'Ripple: <strong>&lt; 2 mV</strong>'}</span>
      `;
    } else if (activeBus === 'usart3') {
      readoutsEl.innerHTML = `
        <span>BAUD: <strong>921.600 bps</strong></span>
        <span>T_bit: <strong>1.085 µs</strong></span>
        <span>FRAME: <strong>8N1 · ASCII</strong></span>
        <span>DECODE: <strong>"$XY 160,120\\n"</strong></span>
      `;
    } else if (activeBus === 'i2c1') {
      readoutsEl.innerHTML = `
        <span>SCL: <strong>1.0 MHz (FM+)</strong></span>
        <span>EXTI: <strong>PA4 Active-Low</strong></span>
        <span>SLAVE: <strong>0x52 (VL53L7CX)</strong></span>
        <span>RATE: <strong>15 Hz (8×8)</strong></span>
      `;
    } else {
      readoutsEl.innerHTML = `
        <span>BUS: <strong>SPI1 · 16-bit</strong></span>
        <span>MUX: <strong>83 Hz (8 digit)</strong></span>
        <span>LATCH: <strong>PC0 (RCK ↑)</strong></span>
        <span>MAP: <strong>{4,5,6,7,0,1,2,3}</strong></span>
      `;
    }
  }

  function drawGrid(W, H) {
    ctx.fillStyle = '#05080d';
    ctx.fillRect(0, 0, W, H);

    const cols = 10;
    const rows = 6;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) {
      const x = (W / cols) * i;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let j = 1; j < rows; j++) {
      const y = (H / rows) * j;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Center crosshair ticks
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.stroke();
  }

  function drawDigitalTrace(points, yHigh, yLow, color, label, W) {
    ctx.fillStyle = color;
    ctx.font = '600 11px JetBrains Mono, monospace';
    ctx.fillText(label, 12, yHigh - 6);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let prevY = points[0][1] ? yHigh : yLow;
    ctx.moveTo(0, prevY);
    for (let i = 0; i < points.length; i++) {
      const x = points[i][0] * W;
      const ny = points[i][1] ? yHigh : yLow;
      ctx.lineTo(x, prevY);
      ctx.lineTo(x, ny);
      prevY = ny;
    }
    ctx.lineTo(W, prevY);
    ctx.stroke();
  }

  function drawFrame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    if (!W || !H) return;

    drawGrid(W, H);

    const padTop = 30;
    const padBot = H - 26;

    if (activeBus === 'dac') {
      // Scale 0.0V (bottom) to 3.3V (top)
      const v = (testWeightG / 1000) * 3.3;
      const y33 = padTop + 12;
      const y00 = padBot - 8;
      const ySig = y00 - (v / 3.3) * (y00 - y33);

      // Reference dashed rails (3.30 V and 0.00 V GND)
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.beginPath();
      ctx.moveTo(0, y33); ctx.lineTo(W, y33);
      ctx.moveTo(0, y00); ctx.lineTo(W, y00);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px JetBrains Mono, monospace';
      ctx.fillText('3.30 V (1000 g)', 12, y33 - 5);
      ctx.fillText('0.00 V (GND comune)', 12, y00 + 14);

      // Optional discarded noisy PWM ripple comparison
      if (showDiscardedPwm) {
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const t = x * 0.08 + phase * 9.0;
          const ripple = Math.sin(t) * 11 + Math.sin(t * 2.7) * 6 + ((x % 26 < 13) ? 5 : -5);
          const py = Math.max(y33 - 8, Math.min(y00 + 6, ySig + ripple));
          if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f87171';
        ctx.fillText('✗ Vecchio filtro RC su PWM (jitter ±2.6 g)', W - 265, y33 + 15);
      }

      // Pure DAC DC golden trace (micro sub-mV thermal noise for realism)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.6;
      ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const micro = Math.sin(x * 0.13 + phase * 4.0) * 0.65;
        const py = ySig + micro;
        if (x === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#facc15';
      ctx.font = '700 12px JetBrains Mono, monospace';
      const labelY = ySig > y33 + 22 ? ySig - 9 : ySig + 18;
      ctx.fillText(`PA4 DAC_OUT = ${v.toFixed(2)} V (${testWeightG} g)`, 14, labelY);
    } else if (activeBus === 'usart3') {
      // Decode ASCII bytes '$', 'X', 'Y', ' ', '1', '6', '0'
      const chars = ['$', 'X', 'Y', ' ', '1', '6', '0'];
      const pts = [[0, 1]];
      const totalSlots = chars.length * 10 + 6;
      const shift = (phase * 0.55) % 1.0;
      let slot = 2;

      // Draw byte decode pills at top
      ctx.font = '600 11px JetBrains Mono, monospace';
      chars.forEach((ch) => {
        const code = ch.charCodeAt(0);
        const xStart = (slot / totalSlots) * W;
        const xEnd = ((slot + 9.5) / totalSlots) * W;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(xStart + 1, 22, Math.max(18, xEnd - xStart - 3), 22, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e0f2fe';
        ctx.fillText(`'${ch === ' ' ? '␣' : ch}' 0x${code.toString(16).toUpperCase()}`, xStart + 6, 37);

        // Start bit (0)
        pts.push([slot / totalSlots, 0]);
        slot += 1;
        // 8 data bits LSB-first
        for (let b = 0; b < 8; b++) {
          pts.push([slot / totalSlots, (code >> b) & 1]);
          slot += 1;
        }
        // Stop bit (1)
        pts.push([slot / totalSlots, 1]);
        slot += 1;
      });
      pts.push([1, 1]);

      drawDigitalTrace(pts, 86, 168, '#38bdf8', 'PC10 → PC11 · USART3 TX (3.3V TTL · 921.6 kbaud)', W);

      // Animated sampling cursor
      const sx = shift * W;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.beginPath(); ctx.moveTo(sx, 52); ctx.lineTo(sx, H - 16); ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Frame: "$XY 160,120\\n" · Latenza < 0.15 ms · Zero float (Q16)', 12, H - 12);
    } else if (activeBus === 'i2c1') {
      // 3 stacked logic analyzer channels: PA4 EXTI INT, PB8 SCL, PB9 SDA
      const intPts = [[0, 1], [0.09, 0], [0.86, 1]];
      const sclPts = [[0, 1], [0.13, 1]];
      const sdaPts = [[0, 1], [0.12, 0]]; // START condition: SDA drops while SCL high!
      const pattern = [0,1,0,1,0,0,1,0, 0, 1,0,1,1,0,1,0,0, 0, 0,1,1,0,1,0,1,1, 0];
      for (let i = 0; i < 27; i++) {
        const u0 = 0.14 + (i / 27) * 0.70;
        const uMid = u0 + (0.35 / 27);
        sclPts.push([u0, 0], [uMid, 1]);
        sdaPts.push([u0, pattern[i]]);
      }
      sclPts.push([0.86, 1]);
      sdaPts.push([0.85, 0], [0.87, 1]); // STOP condition

      drawDigitalTrace(intPts, 38, 66, '#facc15', 'PA4 · VL53L7CX INT (EXTI4 Active-Low)', W);
      drawDigitalTrace(sclPts, 102, 132, '#38bdf8', 'PB8 · I²C1 SCL (1.0 MHz Fast Mode+)', W);
      drawDigitalTrace(sdaPts, 168, 200, '#4ade80', 'PB9 · I²C1 SDA (Addr 0x52 + 64× Dist mm)', W);

      const sweepX = ((phase * 0.42) % 1.0) * W;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.moveTo(sweepX, 18); ctx.lineTo(sweepX, H - 10); ctx.stroke();
    } else {
      // SPI1 -> 2x 74HC595: SCK, DIO (16 bits), RCK Latch pulse at the end!
      const sckPts = [[0, 0]];
      const dioPts = [[0, 0]];
      const bits16 = [1,0,1,1,0,1,1,0, 0,0,1,0,0,0,0,0]; // Seg pattern + rotated digit select
      for (let i = 0; i < 16; i++) {
        const u0 = 0.08 + (i / 16) * 0.68;
        const uHalf = u0 + (0.34 / 16);
        dioPts.push([u0 - 0.008, bits16[i]]);
        sckPts.push([u0, 1], [uHalf, 0]);
      }
      sckPts.push([0.78, 0]);
      dioPts.push([0.78, 0]);
      const rckPts = [[0, 0], [0.81, 1], [0.86, 0], [1, 0]];

      drawDigitalTrace(sckPts, 38, 68, '#38bdf8', 'PB3 · SPI1 SCK (Shift Clock)', W);
      drawDigitalTrace(dioPts, 104, 136, '#facc15', 'PB5 · SPI1 DIO (8-bit Segmenti + 8-bit Digit Ruotato)', W);
      drawDigitalTrace(rckPts, 172, 204, '#ef3b2d', 'PC0 · 74HC595 RCK LATCH (Aggiorna i LED insieme)', W);

      const sweepX = ((phase * 0.48) % 1.0) * W;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.moveTo(sweepX, 18); ctx.lineTo(sweepX, H - 10); ctx.stroke();
    }
  }

  function setBus(bus, scrollIntoView = false) {
    if (!BUS_INFO[bus]) return;
    activeBus = bus;
    scopeCard.querySelectorAll('.scope-probe-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.bus === bus);
    });
    updateMetaUI();
    drawFrame();
    if (scrollIntoView) {
      scopeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  scopeCard.querySelectorAll('.scope-probe-btn').forEach((btn) => {
    btn.addEventListener('click', () => setBus(btn.dataset.bus, false));
  });

  document.querySelectorAll('.arch-link-interactive').forEach((el) => {
    el.addEventListener('click', () => setBus(el.dataset.scopeBus, true));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setBus(el.dataset.scopeBus, true);
      }
    });
  });

  weightSlider?.addEventListener('input', () => {
    testWeightG = Number(weightSlider.value);
    if (weightVal) weightVal.textContent = `${testWeightG} g`;
    updateMetaUI();
    drawFrame();
  });

  btnPwm?.addEventListener('click', () => {
    showDiscardedPwm = !showDiscardedPwm;
    btnPwm.classList.toggle('active', showDiscardedPwm);
    updateMetaUI();
    drawFrame();
  });

  btnHold?.addEventListener('click', () => {
    hold = !hold;
    btnHold.classList.toggle('active', hold);
    btnHold.textContent = hold ? '▶ Run' : '⏸ Hold';
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      scopeVisible = entries[0]?.isIntersecting ?? false;
      if (scopeVisible) {
        resizeScopeCanvas();
        drawFrame();
      }
    }, { rootMargin: '120px 0px' });
    io.observe(scopeCard);
  } else {
    scopeVisible = true;
  }

  window.addEventListener('resize', () => {
    resizeScopeCanvas();
    drawFrame();
  });

  function scopeLoop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    if (scopeVisible && !document.hidden && !hold) {
      phase += dt;
      drawFrame();
    }
    requestAnimationFrame(scopeLoop);
  }

  resizeScopeCanvas();
  updateMetaUI();
  drawFrame();
  requestAnimationFrame(scopeLoop);
  window.ponduloRefreshScope = () => {
    updateMetaUI();
    drawFrame();
  };
}

document.addEventListener('DOMContentLoaded', () => {
  initPonduloSimulator();
  initBomTable();
  initArchOscilloscope();

  // Portrait smartphone advisory banner dismiss (persisted for current session)
  const tip = document.getElementById('landscape-tip');
  const btnDismiss = document.getElementById('btn-dismiss-landscape');
  if (tip) {
    try {
      if (sessionStorage.getItem('pondulo_landscape_tip_dismissed') === '1') {
        tip.classList.add('dismissed');
      }
    } catch { /* ignore */ }
    btnDismiss?.addEventListener('click', () => {
      tip.classList.add('dismissed');
      try { sessionStorage.setItem('pondulo_landscape_tip_dismissed', '1'); } catch { /* ignore */ }
    });
  }
});
