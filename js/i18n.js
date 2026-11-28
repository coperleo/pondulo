/**
 * PONDULO — Bilingual IT / EN Switcher (Feature 5)
 * Translates topbar, all 12 scroll chapters, Inspector Dock, Simulator, Compare Slider,
 * Architecture, BOM, Scenarios, Roadmap, Team/Tutor & 3D Hotspots without page reload.
 */

const I18N_DICT = {
  en: {
    nav_xray: 'X-Ray',
    nav_explode: '3D Explode',
    nav_inspector: '360°',
    nav_demo: 'Demo',
    nav_sim: 'Simulator',
    nav_arch: 'Architecture',
    nav_bom: 'BOM',
    nav_team: 'Team 6',
    nav_code: 'Code',
    nav_prize: '1st Prize · Pepite',
    dock_explode: 'Explode',
    dock_tilt: 'Tilt',
    dock_xray: 'X-Ray',
    dock_beam: 'ToF Beam',
    dock_flow: '⚡ Data Flow',
    dock_dims: '📏 CAD Dims',
    dock_pins: 'Labels',
    sim_kicker: 'TRY IT LIVE IN YOUR BROWSER',
    sim_title: 'PONDULO Touchless UI Simulator.',
    sim_intro: 'Move your mouse (or finger) over the <strong>8×8 VL53L7CX</strong> laser grid on the left as if it were your hand in front of the sensor: dwell 1.5 seconds on any button to confirm, swipe fast left/right to change screen, and drag the weight slider to update both TFT and 7-segment displays live.',
    sim_dwell_hint: 'Dwell 1.5s or click',
    sim_weight_lbl: 'Simulate platter weight (0 – 1000 g)',
    sim_tare: 'Tare (0 g)',
    esp_helper: 'Edit €/kg prices just like on the ESP8266 Wi-Fi web page and send them to the STM32: both the simulated TFT and the 3D model update live.',
    esp_btn_save: '📡 Save (.tmp → LittleFS) & Send via UART1',
    esp_btn_reset: '↺ Default',
    printer_btn_now: '🖨 Print now',
    receipt_hint: 'Confirm <strong>✓ RECEIPT</strong> on the TFT screen (or click <em>Print now</em>) to feed out the thermal receipt.',
    scope_title: 'BENCH OSCILLOSCOPE & LOGIC ANALYZER',
    scope_weight_lbl: 'Test weight:',
    scope_btn_pwm: 'Compare discarded noisy PWM',
    btn_clear_showcase: '🔍 Fullscreen model & clickable labels ↓',
    bom_kicker: 'VERIFIED BILL OF MATERIALS · HARDWARE & FIRMWARE',
    bom_title: 'Full BOM & Official Datasheets',
    bom_f_all: 'All',
    bom_f_mcu: 'ST MCUs & Shields',
    bom_f_sensor: 'Sensors & Metrology',
    bom_f_audio: 'Audio & IoT',
    bom_f_power: 'Power & Mechanics',
    bom_th_comp: 'Component',
    bom_th_qty: 'Qty',
    bom_th_role: 'System Role',
    bom_th_bus: 'Bus / Pinout',
    bom_th_ds: 'Docs',
    bom_pack_lbl: 'Quick Tech Pack:',
    mobile_tip_title: 'Best viewed in landscape',
    mobile_tip_desc: 'For the best 3D interactive experience, rotate your phone horizontally or view on a wider screen.',
    mobile_tip_ok: 'Got it',
  },
};

// Full English translations for the 12 scroll chapters & key headings
const SECTION_TRANSLATIONS_EN = [
  ['#chapter-hero .hero-lead', 'A <strong>100% touchless</strong> smart scale built for food counters, clinics and labs. No physical buttons or shared touchscreens: everything is controlled mid-air via an <strong>8×8 ToF laser sensor</strong> and three <strong>STM32G474RE</strong> microcontrollers.'],
  ['#chapter-hero .scroll-hint', '<span class="scroll-mouse"></span>Scroll down to explore PONDULO from the outer shell down to every single internal board'],
  ['#chapter-tilt .step-num', '02 / 12 · ERGONOMICS & ROTARY HINGE'],
  ['#chapter-tilt h2', 'Tilting head for any workstation.'],
  ['#chapter-tof .step-num', '03 / 12 · LASER SPATIAL INTERACTION'],
  ['#chapter-tof h2', '64 infrared beams. Zero touch.'],
  ['#chapter-xray .step-num', '04 / 12 · X-RAY VIEW'],
  ['#chapter-xray h2', 'Under the shell: custom-fitted engineering.'],
  ['#chapter-scheda-a .step-num', '05 / 12 · BOARD A · OPTICAL SENSING'],
  ['#chapter-scheda-b .step-num', '06 / 12 · BOARD B · HMI & AUDIO HUB'],
  ['#chapter-scheda-c .step-num', '07 / 12 · BOARD C · METROLOGY & LED'],
  ['#chapter-audio-iot .step-num', '08 / 12 · REAR LEFT · AUDIO & IoT'],
  ['#chapter-power .step-num', '09 / 12 · REAR RIGHT · POWER SUPPLY'],
  ['#chapter-explode-base .step-num', '10 / 12 · BASE EXPLODED · METROLOGY & AUDIO'],
  ['#chapter-explode-base h2', 'Load cell, HX711, Amp and Speaker.'],
  ['#chapter-full-explode .step-num', '11 / 12 · FULL OVERVIEW'],
  ['#chapter-full-explode h2', 'Complete architecture at a glance.'],
  ['#inspector-anchor .step-num', '12 / 12 · FREE 3D INSPECTOR'],
  ['#inspector-anchor h2', 'Explore PONDULO freely in 3D.'],
  ['#btn-launch-3d', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> Enter Free 3D Mode (360° · Pan · Zoom)'],
  ['#demo-live .section-kicker', 'REAL PROTOTYPE · NISC 2026'],
  ['#demo-live h2', 'From Fusion 360 CAD to live bench demo.'],
  ['#architettura .section-kicker', 'EMBEDDED ENGINEERING · CHIBIOS/RT'],
  ['#architettura h2', 'Distributed 3-MCU + Wi-Fi architecture.'],
  ['#scenari .section-kicker', 'WHERE IT MAKES SENSE'],
  ['#scenari h2', 'One prototype, three real-world settings.'],
  ['#roadmap .section-kicker', 'NEXT STEPS · TOWARD PONDULO 2.0'],
  ['#roadmap h2', 'What we would improve in the next version.'],
  ['#team .section-kicker', 'STMICROELECTRONICS COLLABORATION · AUG–SEP 2026'],
  ['#team h2', 'Born at NISC 2026 — Team 6'],
  ['.tutor-badge', 'TEAM 6 TUTOR · SPECIAL THANKS'],
  ['.tutor-info p', 'A special thank you to our tutor, who guided, advised and supported us throughout every stage of building PONDULO at NISC 2026.'],
];

window.PONDULO_HOTSPOTS_EN = {
  tof_shield: { badge: 'BOARD A · X-NUCLEO-53L7A1', title: 'VL53L7CX 8×8 dToF Sensor', subtitle: '940 nm VCSEL · 64 SPAD zones · ~60° FoV', desc: 'Measures direct infrared Time-of-Flight across an 8×8 matrix (15 Hz) or 4×4 (60 Hz). Immune to skin or glove color, enabling sub-pixel air-cursor, dwell-select and mid-air swipes.' },
  tft_shield: { badge: 'BOARD B · X-NUCLEO-GFX01M2', title: '2.2" SPI QVGA ILI9341 Display', subtitle: '320×240 RGB565 · uGFX @ 50 Hz', desc: 'Renders the touchless cursor, 1.5s Dwell progress bars, Retail and Clinical menus, multiplier keypad, cart and receipt with mutex-protected incremental SPI updates.' },
  seven_seg_display: { badge: 'BOARD C · 8-DIGIT LED', title: '2× CL3641BH LED Display', subtitle: '2× 74HC595 cascade · SPI1 @ 83 Hz', desc: 'High-contrast live weight readout in grams (XXXXXX.YY) readable from across the counter, featuring a Knight Rider startup calibration scan.' },
  nucleo_tof: { badge: 'BOARD A · cursorSensor', title: 'STM32 NUCLEO-G474RE #1', subtitle: 'ARM Cortex-M4 @ 170 MHz · ChibiOS/RT', desc: 'Dedicated to event-driven ToF acquisition, Q16 weighted hand centroid, 100 Hz EMA glide smoothing and the gesture state machine.' },
  nucleo_display: { badge: 'BOARD B · DEMO7 HUB', title: 'STM32 NUCLEO-G474RE #2', subtitle: 'UI, Audio & Data Aggregator', desc: 'Coordinates the entire UX: receives gestures from Board A (USART3), reads analog weight from Board C (ADC2 PA4), prices from ESP8266 (UART1) and drives YX5300 audio (UART5).' },
  nucleo_scale: { badge: 'BOARD C · bilanciaFinale', title: 'STM32 NUCLEO-G474RE #3', subtitle: 'HX711 Acquisition + Analog DAC', desc: 'Samples the 24-bit load cell via HX711, runs startup tare, 16-sample moving average, Live/Hold with ±1 g Auto-Zero and outputs pure DC weight voltage to Board B.' },
  mp3_module: { badge: 'AUDIO · SERIAL MP3 v1.2', title: 'YX5300 Serial MP3 Module', subtitle: 'MicroSD FAT + 8-byte UART5 frames', desc: 'Plays dedicated audio feedback for every touchless action (welcome, scale chime, keypad beep, receipt sound) offloading MP3 decoding from the MCU.' },
  buck_converter: { badge: 'POWER · STEP-DOWN', title: 'LM2596 DC-DC Buck Converter', subtitle: '12 V Input → Regulated 5 V Rail', desc: 'Steps down external 12 V supply to a clean 5 V rail powering all three Nucleo boards, displays, MP3 module and ESP8266 with shared star GND.' },
  esp8266_module: { badge: 'IoT · WEB PRICE LIST', title: 'ESP8266 Wi-Fi Module', subtitle: 'HTTP Web Server + Atomic LittleFS', desc: 'Hosts a local web UI to update €/kg product prices from phone or PC, saving atomically (.tmp → rename) in LittleFS flash and transmitting via UART1.' },
  load_cell: { badge: 'METROLOGY · BASE', title: 'Strain-Gauge Load Cell', subtitle: 'Aluminum Wheatstone Bridge Bar', desc: 'Mounted centrally between the base X-frame and white weighing platter, converting elastic micro-deflection into a differential mV signal.' },
  hx711_module: { badge: 'CONDITIONING · BASE', title: 'HX711 24-bit ADC Amplifier', subtitle: '24-bit Resolution · Integrated PGA', desc: 'Tucked inside the lower column cavity centimeters from the load cell to minimize mV noise, sending digital data up to Board C.' },
  audio_amp: { badge: 'ACOUSTICS · BASE', title: 'Audio Amplifier & Volume Pot', subtitle: 'Power Stage · 1000 µF 35 V + Knob', desc: 'Amplifies the 3.5 mm AUX audio signal from the YX5300 MP3 board in the head to drive the 45 mm speaker mounted on the base X-arm.' },
  loudspeaker: { badge: 'ACOUSTICS · BASE', title: '45 mm Circular Loudspeaker', subtitle: 'Mounted on Lower X-Frame', desc: 'Delivers clear acoustic confirmations (welcome, button click, receipt chime) even in noisy retail or clinical environments.' },
};

function initLanguageSwitcher() {
  const btn = document.getElementById('btn-lang');
  if (!btn) return;

  // Snapshot original Italian HTML so toggling EN -> IT restores 100% faithfully!
  const itDataMap = new Map();
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    itDataMap.set(el, el.innerHTML);
  });
  const itSelMap = new Map();
  SECTION_TRANSLATIONS_EN.forEach(([sel]) => {
    const el = document.querySelector(sel);
    if (el) itSelMap.set(sel, el.innerHTML);
  });

  function applyLang(lang) {
    window.ponduloLang = lang;
    document.documentElement.lang = lang;
    try { localStorage.setItem('pondulo_lang', lang); } catch { /* private mode */ }
    btn.textContent = lang === 'en' ? '🇬🇧 EN' : '🇮🇹 IT';

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (lang === 'en' && I18N_DICT.en[key]) {
        el.innerHTML = I18N_DICT.en[key];
      } else if (itDataMap.has(el)) {
        el.innerHTML = itDataMap.get(el);
      }
    });

    SECTION_TRANSLATIONS_EN.forEach(([sel, enHtml]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.innerHTML = lang === 'en' ? enHtml : (itSelMap.get(sel) || el.innerHTML);
    });

    if (window.ponduloRefreshSimulator) window.ponduloRefreshSimulator();
    if (window.ponduloRefreshBom) window.ponduloRefreshBom();
    if (window.ponduloRefreshScope) window.ponduloRefreshScope();
  }

  btn.addEventListener('click', () => {
    applyLang(window.ponduloLang === 'en' ? 'it' : 'en');
  });

  let saved = null;
  try { saved = localStorage.getItem('pondulo_lang'); } catch { /* private mode */ }
  if (saved === 'en') applyLang('en');
  else window.ponduloLang = 'it';
}

document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
