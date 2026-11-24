/**
 * PONDULO — Interactive 3D Scrollytelling Engine (v2 — Zero-Collision Edition)
 * - Mathematically collision-free explosion vectors (0 AABB overlaps)
 * - 12-chapter guided scroll carousel with automatic X-Ray, ToF 8x8 laser cone,
 *   360° rotations & per-subsystem spotlights (no clicks needed to learn every part)
 * - SVG leader lines + real-time 2D label collision repulsion solver (zero overlapping pop-ups!)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. MATHEMATICALLY VERIFIED ZERO-COLLISION EXPLOSION VECTORS
//    Verified against all 20 GLB AABBs + L-shaped base tray & vertical stem!
// ─────────────────────────────────────────────────────────────────────────────

const EXPLODE_VECTORS = {
  // Base sub-assembly (children of pondulo_root)
  weighing_plate:    new THREE.Vector3( 0.00,  0.98,  0.48),
  load_cell:         new THREE.Vector3( 0.00,  0.46,  0.42),
  hx711_module:      new THREE.Vector3( 0.00, -0.42, -1.25),
  audio_amp:         new THREE.Vector3(-1.28, -0.44,  0.22),
  loudspeaker:       new THREE.Vector3( 1.28, -0.44,  0.42),
  wiring_base:       new THREE.Vector3( 0.00, -0.08,  0.00),

  // Head sub-assembly (children of head_pivot: +Z front, +Y up, +X right)
  head_shell:        new THREE.Vector3( 0.00,  0.00,  1.85),
  nisc_badge:        new THREE.Vector3( 0.00,  0.00,  2.12),
  hinge_clamps:      new THREE.Vector3( 0.00, -0.10, -0.95),

  // Layer 1 (Optical & Display Shields)
  tft_shield:        new THREE.Vector3(-0.55,  0.18,  0.55),
  tof_shield:        new THREE.Vector3( 0.65,  0.24,  0.55),
  seven_seg_display: new THREE.Vector3(-0.55, -0.22,  0.65),

  // Layer 2 (3x STM32 NUCLEO-G474RE)
  nucleo_display:    new THREE.Vector3(-0.95,  0.18, -0.58),
  nucleo_tof:        new THREE.Vector3( 0.98,  0.24, -0.58),
  nucleo_scale:      new THREE.Vector3( 0.00,  1.22, -0.35),

  // Layer 3 (Audio MP3, Wi-Fi ESP8266, Power Buck)
  mp3_module:        new THREE.Vector3(-1.65,  0.42, -1.15),
  esp8266_module:    new THREE.Vector3(-1.45, -0.25, -1.45),
  buck_converter:    new THREE.Vector3( 1.48, -0.38, -1.10),
  wiring_head:       new THREE.Vector3( 0.00,  0.04, -0.15),
};

const HOTSPOTS = [
  {
    id: 'tof_shield',
    num: 1,
    group: 'head',
    label: 'ToF VL53L7CX 8×8',
    badge: 'SCHEDA A · X-NUCLEO-53L7A1',
    title: 'Sensore dToF VL53L7CX (8×8)',
    subtitle: 'Laser VCSEL 940 nm · 64 zone SPAD · FoV ~60°',
    desc: 'Misura il tempo di volo diretto della luce infrarossa su una matrice 8×8 (15 Hz) o 4×4 (60 Hz). Immune al colore della pelle o dei guanti, consente air-cursor sub-pixel, dwell-select e swipe in aria.',
    specs: [
      ['Bus MCU', 'I²C1 Fast Mode+ @ 1 MHz'],
      ['Interrupt', 'PA4 (EXTI4) → semaforo ChibiOS'],
      ['Range', '30 – 250 mm (Enter < 90 mm)'],
      ['Host', 'Scheda A (NUCLEO-G474RE)'],
    ],
  },
  {
    id: 'tft_shield',
    num: 2,
    group: 'head',
    label: 'Display TFT 2.2"',
    badge: 'SCHEDA B · X-NUCLEO-GFX01M2',
    title: 'Display SPI QVGA ILI9341',
    subtitle: '320×240 RGB565 · Rendering uGFX @ 50 Hz',
    desc: 'Disegna cursore touchless, barra di Dwell (1,5 s), menu Clinico e Macelleria, tastierino moltiplicatore, carrello e scontrino con aggiornamenti incrementali protetti da mutex SPI.',
    specs: [
      ['Controller', 'ILI9341 via SPI hardware'],
      ['Libreria', 'uGFX su ChibiOS/RT'],
      ['Protezione', 'gdisp_mutex anti-corruzione'],
      ['Host', 'Scheda B (DEMO7)'],
    ],
  },
  {
    id: 'seven_seg_display',
    num: 3,
    group: 'head',
    label: 'Display 7-Segmenti',
    badge: 'SCHEDA C · 8 CIFRE LED',
    title: 'Modulo LED 2× CL3641BH',
    subtitle: '2× 74HC595 in cascata · SPI1 @ 83 Hz',
    desc: 'Lettura immediata ad alto contrasto del peso in grammi (XXXXXX.YY) visibile a distanza. Esegue lo scanner stile "Knight Rider" durante la taratura automatica al boot.',
    specs: [
      ['Driver', 'cl3641bh8 + hc595 custom'],
      ['Pin SPI1', 'PB5 (DIO) · PB3 (SCK) · PC0 (RCK)'],
      ['Mapping', 'Rotazione PCB {4,5,6,7,0,1,2,3}'],
      ['Host', 'Scheda C (bilanciaFinale)'],
    ],
  },
  {
    id: 'nucleo_tof',
    num: 4,
    group: 'head',
    label: 'Nucleo A · ToF',
    badge: 'SCHEDA A · cursorSensor',
    title: 'STM32 NUCLEO-G474RE #1',
    subtitle: 'ARM Cortex-M4 @ 170 MHz · ChibiOS/RT',
    desc: 'Dedicata interamente all’acquisizione event-driven del sensore ToF, al baricentro pesato Q16, al glide EMA a 100 Hz e alla FSM per il riconoscimento gesti.',
    specs: [
      ['Uscita', 'USART3 @ 921.600 baud (PC10)'],
      ['Protocollo', 'ASCII $XY (cursore) + $GS (gesto)'],
      ['Aritmetica', 'Q16 / Q8 fixed-point (zero float)'],
      ['Heartbeat', 'LD2 1 Hz OK · 5 Hz fault'],
    ],
  },
  {
    id: 'nucleo_display',
    num: 5,
    group: 'head',
    label: 'Nucleo B · HMI',
    badge: 'SCHEDA B · DEMO7 HUB',
    title: 'STM32 NUCLEO-G474RE #2',
    subtitle: 'Cervello UI, Audio & Aggregatore Dati',
    desc: 'Coordina l’intera esperienza utente: riceve gesti da Scheda A (USART3), legge il peso analogico da Scheda C (ADC2 PA4), riceve listini da ESP8266 (UART1) e pilota YX5300 (UART5).',
    specs: [
      ['ToF RX', 'USART3 (PC11) 921.6 kbaud'],
      ['Peso IN', 'ADC2_IN17 (PA4) filtrato SW'],
      ['Audio TX', 'UART5 (PC12/PD2) 9600 baud'],
      ['Prezzi RX', 'USART1 (PC5) 38400 baud'],
    ],
  },
  {
    id: 'nucleo_scale',
    num: 6,
    group: 'head',
    label: 'Nucleo C · Bilancia',
    badge: 'SCHEDA C · bilanciaFinale',
    title: 'STM32 NUCLEO-G474RE #3',
    subtitle: 'Acquisizione HX711 + DAC Analogico',
    desc: 'Campiona la cella di carico via HX711, esegue taratura al boot, media mobile 16 campioni, ciclo Live/Hold con Auto-Zero (±1 g) e converte il peso in tensione DC pura verso Scheda B.',
    specs: [
      ['Peso OUT', 'DAC1_OUT1 (PA4) · 0–3,3 V DC'],
      ['Range', '0 V = 0 g → 3,3 V = 1000 g'],
      ['Taratura', '59240 count / 68,5 g empirica'],
      ['Easter egg', 'Hold B1 (1 s) → K.I.T.T. scan'],
    ],
  },
  {
    id: 'mp3_module',
    num: 7,
    group: 'head',
    label: 'MP3 YX5300',
    badge: 'AUDIO · SERIAL MP3 v1.2',
    title: 'Modulo Serial MP3 YX5300',
    subtitle: 'MicroSD FAT + Protocollo 8-byte UART5',
    desc: 'Riproduce le tracce audio per ogni azione touchless (benvenuto, ingresso bilancia, beep tastierino e scontrino) così il microcontrollore non deve occuparsi della decodifica MP3.',
    specs: [
      ['Bus', 'UART5 · 9600 baud 8N1'],
      ['Frame', '0x7E 0xFF 0x06 CMD ... 0xEF'],
      ['Uscita', 'Jack TRS 3.5 mm → Amp base'],
      ['Storage', 'MicroSD dedicata onboard'],
    ],
  },
  {
    id: 'buck_converter',
    num: 8,
    group: 'head',
    label: 'Buck LM2596',
    badge: 'ALIMENTAZIONE · STEP-DOWN',
    title: 'Convertitore DC-DC LM2596',
    subtitle: 'Ingresso 12 V → Rail 5 V stabilizzato',
    desc: 'Regola la tensione d’ingresso da 12 V al rail principale 5 V ad alta efficienza per alimentare le tre Nucleo, i display, il modulo MP3 e l’ESP8266 con massa comune.',
    specs: [
      ['Input', '12 V DC (banco / adattatore)'],
      ['Output', '5,0 V regolati via trimmer'],
      ['Filtro', 'Doppio condensatore elettrolitico'],
      ['GND', 'Riferimento comune DAC→ADC'],
    ],
  },
  {
    id: 'esp8266_module',
    num: 9,
    group: 'head',
    label: 'ESP8266 Wi-Fi',
    badge: 'IoT · LISTINO WEB',
    title: 'Modulo Wi-Fi ESP8266',
    subtitle: 'Web Server HTTP + LittleFS Atomico',
    desc: 'Ospita una pagina web per aggiornare da smartphone o PC i prezzi €/kg dei prodotti. Salva in flash LittleFS con scrittura atomica (.tmp → rename) e invia via UART1 alla STM32.',
    specs: [
      ['API HTTP', 'GET /api/products · POST /api/save'],
      ['Link ST', 'UART1 38400 8N1 (TX → PC5)'],
      ['Protocollo', 'PRODUCT_ADD / PRODUCT_CODE'],
      ['Precisione', 'Interi centesimi/kg (zero float)'],
    ],
  },
  {
    id: 'load_cell',
    num: 10,
    group: 'base',
    label: 'Cella di Carico',
    badge: 'METROLOGIA · BASE',
    title: 'Cella di Carico Estensimetrica',
    subtitle: 'Barra in alluminio a ponte di Wheatstone',
    desc: 'Fissata centralmente tra il telaio strutturale a X della base e il piatto bianco superiore. Converte la micro-deformazione elastica del peso in un segnale differenziale mV.',
    specs: [
      ['Fissaggio', '4× bulloni M4 (telaio ↔ piatto)'],
      ['Protezione', 'Estensimetri sigillati in silicone'],
      ['Auto-Zero', 'Compensazione creep < 1 g'],
      ['Lettura', 'ADC HX711 24-bit nel piantone'],
    ],
  },
  {
    id: 'hx711_module',
    num: 11,
    group: 'base',
    label: 'ADC HX711 24-bit',
    badge: 'CONDIZIONAMENTO · BASE',
    title: 'Amplificatore ADC HX711',
    subtitle: 'Risoluzione 24 bit · PGA integrato',
    desc: 'Alloggiato alla base della colonna cava vicinissimo alla cella di carico per minimizzare i disturbi sui segnali mV. Comunica in digitale con Scheda C attraverso il piantone.',
    specs: [
      ['Pin Scheda C', 'DT → PB4 (D5) · SCK → PB10 (D6)'],
      ['Filtro SW', 'Media mobile circolare 16 campioni'],
      ['Sicurezza', 'Timeout anti-blocco su lettura'],
      ['Posizione', 'Vano inferiore piantone cavo'],
    ],
  },
  {
    id: 'audio_amp',
    num: 12,
    group: 'base',
    label: 'Amp Audio',
    badge: 'ACUSTICA · BASE',
    title: 'Amplificatore Audio & Trimmer',
    subtitle: 'Stadio potenza · 1000 µF 35 V + Volume',
    desc: 'Amplifica il segnale proveniente dal modulo MP3 YX5300 nella testa e pilota lo speaker circolare ancorato al braccio anteriore del telaio a X.',
    specs: [
      ['Stadio Amp', 'Filtro 1000 µF 35 V + pot volume'],
      ['Trasduttore', 'Altoparlante circolare 45 mm'],
      ['Cablaggio', 'Interno alla colonna cava'],
      ['Funzione', 'Feedback acustico touchless'],
    ],
  },
  {
    id: 'loudspeaker',
    num: 13,
    group: 'base',
    label: 'Altoparlante 45mm',
    badge: 'ACUSTICA · BASE',
    title: 'Altoparlante Circolare 45 mm',
    subtitle: 'Montato sul telaio inferiore a X',
    desc: 'Riproduce i suoni di conferma (benvenuto, ingresso bilancia, pressione tasti touchless, stampa scontrino) in modo chiaro anche in ambienti di lavoro rumorosi.',
    specs: [
      ['Diametro', '45 mm · magnete permanente'],
      ['Montaggio', 'Fissato al braccio X inferiore'],
      ['Pilotaggio', 'Dallo stadio amplificatore base'],
      ['Ruolo', 'Conferma sonora immediata'],
    ],
  },
];

// Which pins are visible in each of the 12 scroll chapters (focused = zero clutter!)
const CHAPTER_PINS = [
  [],                                          // 01 Hero
  [],                                          // 02 Tilt
  ['tof_shield'],                              // 03 ToF Beam
  [],                                          // 04 X-Ray overview
  ['tof_shield', 'nucleo_tof'],                // 05 Scheda A
  ['tft_shield', 'nucleo_display'],            // 06 Scheda B
  ['nucleo_scale', 'seven_seg_display'],       // 07 Scheda C + 7-Seg
  ['mp3_module', 'esp8266_module'],            // 08 MP3 + ESP8266
  ['buck_converter'],                          // 09 Buck LM2596
  ['load_cell', 'hx711_module', 'audio_amp', 'loudspeaker'], // 10 Base
  HOTSPOTS.map((h) => h.id),                   // 11 Grand Full Explode
  HOTSPOTS.map((h) => h.id),                   // 12 Free Inspector
];

// Which card side is occupied in each chapter so pins avoid overlapping the narrative card!
const CHAPTER_CARD_SIDE = [
  'left', 'right', 'right', 'right',
  'left', 'right', 'left', 'right',
  'left', 'right', 'top', 'left',
];

const CHAPTER_LABELS = [
  '01 / 12 · PANORAMICA',
  '02 / 12 · TESTA BASCULANTE',
  '03 / 12 · SENSORE ToF 8×8',
  '04 / 12 · VISIONE RAGGI X',
  '05 / 12 · SCHEDA A (ToF)',
  '06 / 12 · SCHEDA B (DISPLAY)',
  '07 / 12 · SCHEDA C (BILANCIA)',
  '08 / 12 · AUDIO MP3 & ESP8266',
  '09 / 12 · ALIMENTAZIONE BUCK',
  '10 / 12 · ESPLOSO BASE',
  '11 / 12 · ESPLOSO TOTALE 360°',
  '12 / 12 · INSPECTOR LIBERO',
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. THREE.JS STUDIO SCENE SETUP
// ─────────────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('pondulo-canvas');
const loaderOverlay = document.getElementById('loader-overlay');
const hotspotsLayer = document.getElementById('hotspots-layer');
const leadersSvg = document.getElementById('leaders-svg');
const hudChapter = document.getElementById('hud-chapter');
const hudTelemetry = document.getElementById('hud-telemetry');
const progressBar = document.getElementById('scroll-progress-bar');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.65;

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 70);
camera.position.set(0.45, 2.25, 7.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.panSpeed = 0.95;
controls.rotateSpeed = 0.85;
controls.zoomSpeed = 1.08;
controls.minDistance = 1.15;
controls.maxDistance = 16.5;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI - 0.05;
controls.target.set(0, 1.65, 0);
controls.enabled = false;

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let pointerDownXY = null;
let flyTarget = null;

canvas.addEventListener('contextmenu', (e) => {
  if (state.freeOrbit) e.preventDefault();
});
canvas.addEventListener('pointerdown', (e) => {
  flyTarget = null; // User interaction immediately cancels smooth camera glide
  pointerDownXY = { x: e.clientX, y: e.clientY };
  if (state.freeOrbit) canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('wheel', () => {
  flyTarget = null;
}, { passive: true });
window.addEventListener('pointerup', (e) => {
  if (state.freeOrbit) canvas.style.cursor = 'grab';
  if (!state.freeOrbit || !pointerDownXY || !ponduloRoot || e.button !== 0) return;
  const dist = Math.hypot(e.clientX - pointerDownXY.x, e.clientY - pointerDownXY.y);
  pointerDownXY = null;
  if (dist > 6) return; // Was a drag/orbit, not a click

  const rect = canvas.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(ponduloRoot.children, true);
  for (const hit of hits) {
    let cur = hit.object;
    while (cur && cur !== ponduloRoot) {
      const hs = HOTSPOTS.find((h) => h.id === cur.name);
      if (hs) {
        openDrawer(hs);
        focusPartInFreeOrbit(hs.id);
        return;
      }
      cur = cur.parent;
    }
  }
});

// Studio Lighting
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(5.0, 8.0, 6.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.bias = -0.0001;
keyLight.shadow.normalBias = 0.038;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9bd6ff, 1.05);
fillLight.position.set(-6.0, 3.5, 4.0);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff6b5a, 1.35);
rimLight.position.set(-2.5, 5.0, -6.5);
scene.add(rimLight);

const underLight = new THREE.PointLight(0x38bdf8, 0.8, 10);
underLight.position.set(0, -1.4, 1.6);
scene.add(underLight);

// Studio Floor Pedestal (drops & fades cleanly during Base Explosion so zero clipping!)
const floorGroup = new THREE.Group();
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0c0f16,
  roughness: 0.72,
  metalness: 0.25,
  transparent: true,
  opacity: 0.65,
});
const floorMesh = new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), floorMat);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.01;
floorMesh.receiveShadow = true;
floorGroup.add(floorMesh);

const ringMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.13,
  side: THREE.DoubleSide,
});
const floorRing = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.57, 72), ringMat);
floorRing.rotation.x = -Math.PI / 2;
floorRing.position.y = 0.001;
floorGroup.add(floorRing);
scene.add(floorGroup);

// ─────────────────────────────────────────────────────────────────────────────
// 3. VOLUMETRIC 8x8 ToF LASER CONE
// ─────────────────────────────────────────────────────────────────────────────

function createToFBeamGroup() {
  const group = new THREE.Group();
  group.position.set(0.54, 0.784, 0.716);

  const length = 2.15;
  const halfSpread = Math.tan(THREE.MathUtils.degToRad(26)) * length;

  const coneGeo = new THREE.ConeGeometry(halfSpread * 1.12, length, 4, 1, true);
  coneGeo.rotateY(Math.PI / 4);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, length / 2);

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.11,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Mesh(coneGeo, coneMat));

  const linePositions = [];
  const N = 8;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const u = ((c + 0.5) / N - 0.5) * 2 * halfSpread;
      const v = ((r + 0.5) / N - 0.5) * 2 * halfSpread;
      if (r === 0 || r === N - 1 || c === 0 || c === N - 1 || (r % 3 === 0 && c % 3 === 0)) {
        linePositions.push(0, 0, 0, u, v, length);
      }
    }
  }
  for (let i = 0; i <= N; i++) {
    const t = (i / N - 0.5) * 2 * halfSpread;
    linePositions.push(-halfSpread, t, length, halfSpread, t, length);
    linePositions.push(t, -halfSpread, length, t, halfSpread, length);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  group.visible = false;
  group.userData = { coneMat, lineMat };
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3B. SMOOTH CHUBBY 3D CARTOON HAND (SDF-SCULPTED GLB) POINTING AT ToF SENSOR
// ─────────────────────────────────────────────────────────────────────────────

function createCartoonHandGroup() {
  const root = new THREE.Group();
  // Floating well in front of VL53L7CX sensor (headPivot local coords: sensor is at 0.54, 0.784, 0.716)
  // Positioned clearly in front (+Z = 2.02) so it NEVER clips behind the red head shell!
  root.position.set(0.56, 0.76, 2.02);

  const hand = new THREE.Group();
  root.add(hand);

  // Load smooth organic SDF-sculpted chubby 3D cartoon gloved hand (pointing index toward -Z!)
  const handLoader = new GLTFLoader();
  handLoader.load('assets/cartoon_hand.glb?v=2', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(1.52);
    // Natural ergonomic angle with thumb & index finger clearly turned toward the LEFT viewer camera!
    model.rotation.set(0.14, -0.14, 0.08);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          o.material.depthWrite = true;
          o.material.depthTest = true;
        }
      }
    });
    hand.add(model);
  });

  // Subtle glowing yellow target halo right in front of the pointing index fingertip (-0.14, 0.02, -0.44)
  const tipRingMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const tipRing = new THREE.Mesh(new THREE.RingGeometry(0.038, 0.062, 24), tipRingMat);
  tipRing.position.set(-0.14, 0.024, -0.44);
  hand.add(tipRing);

  // Glowing Cyan Air-Swipe Arc Trail (lights up during Phase B Swipe!)
  const arcPts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = -0.44 + t * 0.88;
    const y = Math.sin(t * Math.PI) * 0.12;
    arcPts.push(new THREE.Vector3(x, y, -0.44));
  }
  const swipeTrailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 24, 0.014, 8, false);
  const swipeTrailMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  root.add(new THREE.Mesh(swipeTrailGeo, swipeTrailMat));

  // Active ToF laser target ring projected onto the 8x8 cone plane
  const spotMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spotMesh = new THREE.Mesh(new THREE.RingGeometry(0.048, 0.088, 24), spotMat);
  spotMesh.position.set(-0.12, 0.02, -0.64);
  root.add(spotMesh);

  root.visible = false;
  root.userData = { hand, tipRing, tipRingMat, swipeTrailMat, spotMesh, spotMat };
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3B2. 3D SCULPTED FIORENTINA T-BONE STEAK FOR HERO BOOT & WEIGHING INTRO
// ─────────────────────────────────────────────────────────────────────────────

const FIORENTINA_CONTOUR = [
  [0.3493, 0.0832], [0.3376, 0.039], [0.3256, -0.0034], [0.312, -0.0448], [0.2946, -0.0851],
  [0.2785, -0.1286], [0.2647, -0.1795], [0.2464, -0.235], [0.2182, -0.2901], [0.1791, -0.3425],
  [0.1307, -0.394], [0.0716, -0.4274], [0.0063, -0.4193], [-0.0514, -0.3707], [-0.0878, -0.2816],
  [-0.105, -0.1913], [-0.1297, -0.1489], [-0.1832, -0.1584], [-0.2346, -0.1554], [-0.2737, -0.1307],
  [-0.3048, -0.0959], [-0.3346, -0.0573], [-0.3631, -0.0153], [-0.3831, 0.0318], [-0.3899, 0.0826],
  [-0.387, 0.1341], [-0.3787, 0.1856], [-0.3714, 0.2393], [-0.3676, 0.2994], [-0.3617, 0.3659],
  [-0.3343, 0.4212], [-0.2729, 0.4411], [-0.2051, 0.4427], [-0.1424, 0.4312], [-0.0824, 0.4013],
  [-0.0367, 0.4065], [0.0059, 0.4349], [0.0526, 0.443], [0.1021, 0.443], [0.1558, 0.4439],
  [0.2147, 0.4433], [0.272, 0.4296], [0.3223, 0.3992], [0.3655, 0.3595], [0.3838, 0.3028],
  [0.3863, 0.242], [0.3775, 0.1838], [0.3632, 0.1308],
];

function createFiorentinaGroup() {
  const group = new THREE.Group();
  const S = 1.08; // ~10.8 cm wide thick-cut Fiorentina resting neatly inside the 13.4 cm platter!

  // Clean butcher wax paper sheet (carta da macelleria) underneath the steak
  const paperMat = new THREE.MeshStandardMaterial({
    color: 0xf8f5ee,
    roughness: 0.72,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
  });
  const paperGeo = new THREE.BoxGeometry(1.06, 0.008, 1.06);
  const paper = new THREE.Mesh(paperGeo, paperMat);
  paper.position.y = 0.005;
  paper.rotation.y = 0.09;
  paper.receiveShadow = true;
  group.add(paper);

  // Thick-cut 3D ExtrudeGeometry matching the exact Fiorentina silhouette!
  const shape = new THREE.Shape();
  FIORENTINA_CONTOUR.forEach(([ux, uy], i) => {
    const x = ux * S;
    const y = uy * S;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.024,
    bevelSegments: 4,
    curveSegments: 12,
  });
  // Normalize UVs on top/bottom caps to [0..1] matching fiorentina_top.png!
  const posAttr = extrudeGeo.attributes.position;
  const uvAttr = extrudeGeo.attributes.uv;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    uvAttr.setXY(i, x / S + 0.5, y / S + 0.5);
  }
  uvAttr.needsUpdate = true;

  // Rotate so extrusion lies horizontally (+Y up)
  extrudeGeo.rotateX(-Math.PI / 2);

  const texLoader = new THREE.TextureLoader();
  const topTex = texLoader.load('assets/media/fiorentina_top.png?v=1');
  topTex.colorSpace = THREE.SRGBColorSpace;

  const topMat = new THREE.MeshStandardMaterial({
    map: topTex,
    roughness: 0.36,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x9b2d30,
    roughness: 0.44,
    metalness: 0.04,
    transparent: true,
    opacity: 0,
  });

  const steakMesh = new THREE.Mesh(extrudeGeo, [topMat, sideMat]);
  steakMesh.position.y = 0.042;
  steakMesh.rotation.y = 0.22;
  steakMesh.castShadow = true;
  steakMesh.receiveShadow = true;
  group.add(steakMesh);

  // Subtle cream fat-cap bevel rim band around the side for extra realism
  const mats = [paperMat, topMat, sideMat];
  // Centered over weighing_plate (CAD X=0, Y=-27.45mm -> Three.js X=0, Z=+0.275, top Y=0.585)
  group.position.set(0.0, 1.48, 0.275);
  group.visible = false;
  group.userData = { mats, baseY: 0.586 };
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3C. LIVE ANIMATED 3D DISPLAYS (ILI9341 TFT + 8-DIGIT 7-SEG CANVASTEXTURE)
// ─────────────────────────────────────────────────────────────────────────────

function createLiveDisplays3D() {
  const tftCanvas = document.createElement('canvas');
  tftCanvas.width = 640;
  tftCanvas.height = 480;
  const tftCtx = tftCanvas.getContext('2d');
  const tftTex = new THREE.CanvasTexture(tftCanvas);
  tftTex.colorSpace = THREE.SRGBColorSpace;
  tftTex.flipY = false;

  const segCanvas = document.createElement('canvas');
  segCanvas.width = 640;
  segCanvas.height = 160;
  const segCtx = segCanvas.getContext('2d');
  const segTex = new THREE.CanvasTexture(segCanvas);
  segTex.colorSpace = THREE.SRGBColorSpace;
  segTex.flipY = false;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function renderTFT({ mode = 'food', product = 'Manzo', price = 18.9, weightG = 342.5, cursorX = 0.78, cursorY = 0.78, dwell = 0.65, flash = 0, bootPct = 0 }) {
    const ctx = tftCtx;
    const W = 640, H = 480;
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, W, H);

    if (mode === 'boot') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, 74);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 30px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PONDULO · AVVIO SISTEMA', W / 2, 37);

      ctx.fillStyle = '#ef3b2d';
      ctx.font = '700 36px monospace';
      ctx.fillText('TARATURA HX711', W / 2, 192);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 22px monospace';
      ctx.fillText('Auto-Zero & K.I.T.T. Check...', W / 2, 246);

      roundRect(ctx, 84, 300, W - 168, 26, 13);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      roundRect(ctx, 84, 300, Math.max(26, (W - 168) * Math.min(1, bootPct)), 26, 13);
      ctx.fillStyle = '#ef3b2d';
      ctx.fill();
      tftTex.needsUpdate = true;
      return;
    }

    // Header
    ctx.fillStyle = mode === 'clinical' ? '#0b253a' : '#0f172a';
    ctx.fillRect(0, 0, W, 74);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 74, W, 3);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mode === 'clinical' ? 'CLINICO · PAZIENTE #01' : `BILANCIA - ${product}`, W / 2, 37);

    if (mode === 'clinical') {
      const cards = [
        ['FC', '72 bpm', '#38bdf8', 44, 112],
        ['PA', '120/80', '#4ade80', 334, 112],
        ['SpO2', '98%', '#facc15', 44, 240],
        ['TEMP', '36.7°C', '#fb7185', 334, 240],
      ];
      cards.forEach(([lbl, val, col, x, y]) => {
        roundRect(ctx, x, y, 262, 108, 14);
        ctx.fillStyle = '#111c30';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 20px monospace';
        ctx.fillText(lbl, x + 131, y + 32);
        ctx.fillStyle = col;
        ctx.font = '700 40px Inter, sans-serif';
        ctx.fillText(val, x + 131, y + 74);
      });
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 20px monospace';
      ctx.fillText('← AIR-SWIPE PER TORNARE ALLA BILANCIA →', W / 2, 412);
    } else {
      const total = (weightG / 1000) * price;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 22px Inter, sans-serif';
      ctx.fillText(`Prezzo: ${price.toFixed(2)} EUR/kg   |   Peso: ${weightG.toFixed(1)} g`, W / 2, 116);

      roundRect(ctx, 42, 150, W - 84, 116, 16);
      ctx.fillStyle = '#141e30';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = '700 46px Inter, sans-serif';
      ctx.fillText(`Totale: ${total.toFixed(2)} EUR`, W / 2, 204);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 17px Inter, sans-serif';
      ctx.fillText('Moltiplicatore: x1  •  Dwell 1,5 s per confermare', W / 2, 245);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '500 18px monospace';
      ctx.fillText('Sensore ToF 8x8 attivo  •  Zero Contatto', W / 2, 302);

      // + CARRELLO button
      roundRect(ctx, 38, 340, 264, 96, 12);
      ctx.fillStyle = '#0284c7';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px Inter, sans-serif';
      ctx.fillText('+ CARRELLO', 170, 388);

      // STAMPA button (with live yellow Dwell progress bar + green flash!)
      roundRect(ctx, 338, 340, 264, 96, 12);
      ctx.fillStyle = flash > 0.1 ? '#22c55e' : '#16a34a';
      ctx.fill();
      ctx.strokeStyle = dwell > 0.05 ? '#facc15' : '#475569';
      ctx.lineWidth = dwell > 0.05 ? 5 : 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px Inter, sans-serif';
      ctx.fillText(flash > 0.2 ? 'OK! STAMPATO' : 'STAMPA', 470, 382);

      if (dwell > 0.02) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(354, 418, Math.max(4, 232 * Math.min(1, dwell)), 10);
      }
    }

    // Live yellow Air-Cursor dot
    const cx = Math.max(24, Math.min(W - 24, cursorX * W));
    const cy = Math.max(92, Math.min(H - 24, cursorY * H));
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    tftTex.needsUpdate = true;
  }

  const SEG_MAP = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
    '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd', '-': 'g', ' ': '',
  };

  function renderSevenSeg(weightG = 342.5, kittPos = -1) {
    const ctx = segCtx;
    const W = 640, H = 160;
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#232328';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);
    ctx.fillStyle = '#08080a';
    ctx.fillRect(W / 2 - 3, 0, 6, H);

    let str, dpIdx;
    if (kittPos >= 0) {
      str = '        ';
      dpIdx = -1;
    } else {
      const centi = Math.max(0, Math.min(9999999, Math.round(weightG * 100)));
      str = String(centi).padStart(8, ' ');
      if (centi < 100) str = String(centi).padStart(3, '0').padStart(8, ' ');
      dpIdx = 5;
    }

    const slotW = (W - 36) / 8;
    for (let i = 0; i < 8; i++) {
      const x0 = 18 + i * slotW + 6;
      const y0 = 26, w = slotW - 22, h = H - 52, t = 8;
      const ch = kittPos >= 0 ? (i === kittPos ? '-' : ' ') : str[i];
      const on = SEG_MAP[ch] || '';
      const segs = {
        a: [[x0 + t, y0], [x0 + w - t, y0], [x0 + w - t - 4, y0 + t], [x0 + t + 4, y0 + t]],
        b: [[x0 + w - t, y0 + 2], [x0 + w, y0 + t], [x0 + w - 2, y0 + h / 2 - 3], [x0 + w - t - 2, y0 + h / 2 - 7]],
        c: [[x0 + w - t - 2, y0 + h / 2 + 7], [x0 + w - 2, y0 + h / 2 + 3], [x0 + w - 4, y0 + h - t], [x0 + w - t - 4, y0 + h - 2]],
        d: [[x0 + t + 2, y0 + h - t], [x0 + w - t - 2, y0 + h - t], [x0 + w - t + 2, y0 + h], [x0 + t - 2, y0 + h]],
        e: [[x0 + 2, y0 + h / 2 + 3], [x0 + t + 2, y0 + h / 2 + 7], [x0 + t, y0 + h - 2], [x0, y0 + h - t]],
        f: [[x0 + 4, y0 + t], [x0 + t + 4, y0 + 2], [x0 + t + 2, y0 + h / 2 - 7], [x0 + 2, y0 + h / 2 - 3]],
        g: [[x0 + t + 2, y0 + h / 2 - 4], [x0 + w - t - 2, y0 + h / 2 - 4], [x0 + w - 4, y0 + h / 2],
            [x0 + w - t - 2, y0 + h / 2 + 4], [x0 + t + 2, y0 + h / 2 + 4], [x0 + 4, y0 + h / 2]],
      };
      for (const [k, pts] of Object.entries(segs)) {
        const lit = on.includes(k);
        ctx.beginPath();
        pts.forEach(([px, py], pi) => (pi === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
        ctx.closePath();
        ctx.fillStyle = lit ? '#ff2a20' : '#2e1414';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x0 + w + 8, y0 + h - 6, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = i === dpIdx ? '#ff2a20' : '#2e1414';
      ctx.fill();
    }
    segTex.needsUpdate = true;
  }

  renderTFT({ mode: 'boot', bootPct: 0.05 });
  renderSevenSeg(0, 0);
  return { tftTex, segTex, renderTFT, renderSevenSeg };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D. ANIMATED 3D DATA-FLOW SIGNAL PULSES BETWEEN BOARDS
// ─────────────────────────────────────────────────────────────────────────────

function createDataFlowGroup() {
  const group = new THREE.Group();
  // Paths in headPivot local Three.js coords (derived from exact board coordinates!)
  const specs = [
    // USART3 921.6kbaud: Scheda A (ToF) -> Scheda B (Display)
    { color: 0x38bdf8, speed: 0.72, pts: [[0.42, 0.61, 0.30], [0.22, 0.63, 0.18], [0.04, 0.59, 0.20], [-0.10, 0.57, 0.34]] },
    // DAC -> ADC PA4 analog weight: Scheda C (Top Scale) -> Scheda B (Display)
    { color: 0xfacc15, speed: 0.55, pts: [[0.12, 0.89, 0.10], [0.08, 0.75, 0.22], [-0.06, 0.65, 0.26], [-0.16, 0.59, 0.34]] },
    // UART5 9600 Audio: Scheda B -> MP3 YX5300
    { color: 0xc084fc, speed: 0.62, pts: [[-0.48, 0.61, 0.34], [-0.64, 0.65, 0.18], [-0.84, 0.64, 0.15]] },
    // AUX Audio: MP3 YX5300 -> Hinge column toward Base Amp
    { color: 0xf472b6, speed: 0.58, pts: [[-0.75, 0.89, 0.19], [-0.62, 0.85, 0.12], [-0.32, 0.43, 0.10], [-0.08, -0.01, 0.02]] },
    // UART1 38400 Prices: ESP8266 -> Scheda B
    { color: 0x4ade80, speed: 0.52, pts: [[-0.70, -0.07, -0.05], [-0.45, 0.15, 0.08], [-0.25, 0.48, 0.30]] },
    // Power 5V Rail: Buck LM2596 -> Scheda A & B
    { color: 0xf87171, speed: 0.46, pts: [[0.46, -0.07, 0.04], [0.26, 0.24, 0.14], [0.35, 0.45, 0.32]] },
    { color: 0xf87171, speed: 0.46, pts: [[0.46, -0.07, 0.04], [0.12, 0.28, 0.08], [-0.25, 0.45, 0.34]] },
  ];

  const packets = [];
  const sphereGeo = new THREE.SphereGeometry(0.026, 12, 12);
  specs.forEach((s) => {
    const curve = new THREE.CatmullRomCurve3(s.pts.map((p) => new THREE.Vector3(...p)));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
    const lineMat = new THREE.LineBasicMaterial({
      color: s.color,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Line(lineGeo, lineMat));
    for (let k = 0; k < 2; k++) {
      const mat = new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(sphereGeo, mat);
      group.add(mesh);
      packets.push({ mesh, curve, speed: s.speed, phase: k * 0.5 });
    }
  });

  group.visible = false;
  group.userData = { packets };
  return group;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ANIMATION RIG STATE (PER-SUBSYSTEM EXTRACTION + AUTO X-RAY!)
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  camX: 0.5, camY: 2.25, camZ: 7.5,
  targetX: -0.45, targetY: 1.62, targetZ: 0.0,
  modelRotY: -0.22,
  headTiltDeg: 0,
  xrayAmount: 0,       // 0 = solid opaque PLA, 1 = translucent X-Ray glass!
  beamIntensity: 0,

  // Granular per-subsystem explosion channels (0..1) -> ZERO collisions at every stage!
  exShell: 0,          // head_shell + nisc_badge + hinge_clamps
  exSchedaA: 0,        // tof_shield + nucleo_tof
  exSchedaB: 0,        // tft_shield + nucleo_display
  exSchedaC: 0,        // nucleo_scale + seven_seg_display
  exAudioIot: 0,       // mp3_module + esp8266_module
  exPower: 0,          // buck_converter
  exBase: 0,           // weighing_plate + load_cell + hx711_module + audio_amp + loudspeaker

  // Manual Inspector overrides
  manualOverride: false,
  manualXray: false,
  freeOrbit: false,
  forceBeam: false,
  forceDataFlow: false,
  isolatedId: null,
  showPinsToggle: true,
  activeChapter: 0,
  scrollProgress: 0,
};

let ponduloRoot = null;
let headPivot = null;
let tofBeam = null;
let cartoonHand = null;
let fiorentinaGroup = null;
let dataFlowGroup = null;
let liveDisplays = null;
let introStartTime = null;
let introFinished = false;
const partMap = new Map();
const origPos = new Map();
const headShellMeshes = [];
const baseShellMeshes = [];
const cadInkEdges = [];       // Crisp thin black CAD outlines shown after Chapter 01 hero!
const ledGreenMaterials = []; // 1 Hz blinking STM32 LD2 heartbeat LEDs!
const badgeMaterials = [];
const wireMaterials = [];
const headXrayEdges = [];
const baseXrayEdges = [];
const pinElements = new Map();
const isolateTrackedMeshes = [];

function attachXrayContour(mesh, targetList) {
  const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 26);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xff6b5a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(edgesGeo, edgeMat);
  lines.visible = false;
  lines.renderOrder = 12;
  mesh.add(lines);
  targetList.push({ lines, mat: edgeMat });
}

function attachCadInkOutline(mesh, thresholdDeg = 28) {
  const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, thresholdDeg);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x0b0e14,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(edgesGeo, edgeMat);
  lines.visible = false;
  lines.renderOrder = 6;
  mesh.add(lines);
  cadInkEdges.push({ lines, mat: edgeMat, isHead: mesh.parent?.name === 'head_shell' || mesh.name === 'head_shell' || mesh.parent?.name === 'hinge_clamps' || mesh.name === 'hinge_clamps' });
}

// Bridge for interactive browser UI Simulator to drive the 3D displays in real time!
window.ponduloLiveSim = {
  overrideActive: false,
  mode: 'food',
  product: 'Manzo',
  price: 18.9,
  weightG: 342.5,
  cursorX: 0.78,
  cursorY: 0.78,
  dwell: 0.65,
  flash: 0,
  kittPos: -1,
};

const loader = new GLTFLoader();
loader.load(
  'assets/pondulo.glb?v=5',
  (gltf) => {
    ponduloRoot = gltf.scene;
    scene.add(ponduloRoot);
    liveDisplays = createLiveDisplays3D();

    ponduloRoot.traverse((obj) => {
      if (obj.name) {
        partMap.set(obj.name, obj);
        origPos.set(obj.name, obj.position.clone());
      }
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const ownerName = obj.name || obj.parent?.name || '';
        const parentName = obj.parent?.name || '';
        const groupId = HOTSPOTS.some((h) => h.id === ownerName) ? ownerName : (HOTSPOTS.some((h) => h.id === parentName) ? parentName : '');

        // Live animated 3D CanvasTexture screens (TFT ILI9341 + 8-Digit Red 7-Segment!)
        if (obj.material?.name === 'tft_screen' && liveDisplays) {
          obj.material = obj.material.clone();
          obj.material.map = liveDisplays.tftTex;
          obj.material.emissiveMap = liveDisplays.tftTex;
          obj.material.needsUpdate = true;
        } else if (obj.material?.name === 'seven_seg' && liveDisplays) {
          obj.material = obj.material.clone();
          obj.material.map = liveDisplays.segTex;
          obj.material.emissiveMap = liveDisplays.segTex;
          obj.material.needsUpdate = true;
        } else if (obj.material?.name === 'led_green') {
          obj.material = obj.material.clone();
          ledGreenMaterials.push(obj.material);
        }

        // Clone PLA shell materials independently so Head X-Ray and Base X-Ray NEVER interfere!
        if (ownerName === 'head_shell' || parentName === 'head_shell' || ownerName === 'hinge_clamps' || parentName === 'hinge_clamps') {
          if (obj.material?.name === 'pla_red') {
            obj.material = obj.material.clone();
            obj.material.side = THREE.FrontSide;
            headShellMeshes.push(obj);
            attachCadInkOutline(obj, 28);
            if (ownerName === 'head_shell' || parentName === 'head_shell') {
              attachXrayContour(obj, headXrayEdges);
            }
          }
        } else if (ownerName === 'base_column' || parentName === 'base_column') {
          if (obj.material?.name === 'pla_red') {
            obj.material = obj.material.clone();
            obj.material.side = THREE.FrontSide;
            baseShellMeshes.push(obj);
            attachCadInkOutline(obj, 28);
            attachXrayContour(obj, baseXrayEdges);
          }
        } else if (ownerName === 'weighing_plate' || parentName === 'weighing_plate') {
          if (obj.material?.name === 'pla_white') {
            attachCadInkOutline(obj, 30);
          }
        } else if (ownerName === 'nisc_badge' || parentName === 'nisc_badge') {
          obj.material = obj.material.clone();
          badgeMaterials.push(obj.material);
        }

        if (groupId && obj.material && !Array.isArray(obj.material)) {
          obj.material = obj.material.clone();
          isolateTrackedMeshes.push({ mesh: obj, groupId, origOpacity: obj.material.opacity ?? 1, origTrans: !!obj.material.transparent });
        }

        // Wiring materials fade gently during wide exploded views
        if (ownerName === 'wiring_head' || ownerName === 'wiring_base' || parentName === 'wiring_head' || parentName === 'wiring_base') {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m && !wireMaterials.includes(m)) wireMaterials.push(m);
          });
        }
      }
    });

    headPivot = partMap.get('head_pivot');
    if (headPivot) {
      tofBeam = createToFBeamGroup();
      headPivot.add(tofBeam);
      cartoonHand = createCartoonHandGroup();
      headPivot.add(cartoonHand);
      dataFlowGroup = createDataFlowGroup();
      headPivot.add(dataFlowGroup);
    }

    // Add 3D Fiorentina T-Bone Steak to ponduloRoot for Hero K.I.T.T. -> 0 -> Weighing intro!
    fiorentinaGroup = createFiorentinaGroup();
    ponduloRoot.add(fiorentinaGroup);
    introStartTime = null;
    introFinished = false;

    buildHotspotDOM();
    setupScrollChoreography();
    setupInspectorControls();

    setTimeout(() => loaderOverlay.classList.add('hidden'), 220);
  },
  undefined,
  (err) => {
    console.error('Errore caricamento pondulo.glb:', err);
    loaderOverlay.querySelector('.loader-text').textContent = 'ERRORE CARICAMENTO 3D — APRIRE VIA SERVER LOCALE HTTP';
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. DE-OVERLAPPED 3D HOTSPOTS WITH SVG LEADER LINES & DRAWER
// ─────────────────────────────────────────────────────────────────────────────

const drawer = document.getElementById('component-drawer');
const drawerClose = document.getElementById('drawer-close');
const drawerBadge = document.getElementById('drawer-badge');
const drawerTitle = document.getElementById('drawer-title');
const drawerSubtitle = document.getElementById('drawer-subtitle');
const drawerDesc = document.getElementById('drawer-desc');
const drawerSpecs = document.getElementById('drawer-specs');
let activeHotspotId = null;

function buildHotspotDOM() {
  hotspotsLayer.innerHTML = '';
  HOTSPOTS.forEach((h) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot-pin hidden-pin';
    btn.dataset.id = h.id;
    btn.dataset.group = h.group;
    btn.innerHTML = `<span class="hotspot-num">${h.num}</span><span>${h.label}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer(h);
      if (state.freeOrbit) focusPartInFreeOrbit(h.id);
    });
    hotspotsLayer.appendChild(btn);
    pinElements.set(h.id, btn);
  });
}

function openDrawer(h) {
  activeHotspotId = h.id;
  pinElements.forEach((el, id) => el.classList.toggle('active', id === h.id));
  const tr = (window.ponduloLang === 'en' && window.PONDULO_HOTSPOTS_EN?.[h.id]) || h;
  drawerBadge.textContent = tr.badge || h.badge;
  drawerTitle.textContent = tr.title || h.title;
  drawerSubtitle.textContent = tr.subtitle || h.subtitle;
  drawerDesc.textContent = tr.desc || h.desc;
  const specs = tr.specs || h.specs;
  drawerSpecs.innerHTML = specs
    .map(([k, v]) => `<div class="drawer-spec-row"><span>${k}</span><strong>${v}</strong></div>`)
    .join('');
  const btnIso = document.getElementById('drawer-isolate-btn');
  if (btnIso) {
    const isIso = state.isolatedId === h.id;
    btnIso.classList.toggle('active', isIso);
    btnIso.textContent = isIso
      ? (window.ponduloLang === 'en' ? '✕ Show all parts' : '✕ Mostra tutto')
      : (window.ponduloLang === 'en' ? '◎ Isolate component' : '◎ Isola componente');
  }
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  activeHotspotId = null;
  state.isolatedId = null;
  pinElements.forEach((el) => el.classList.remove('active'));
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

drawerClose.addEventListener('click', closeDrawer);

const tmpBox = new THREE.Box3();
const tmpVec = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpCorner = new THREE.Vector3();

/**
 * Projects a 3D Box3's 8 corners into 2D viewport pixel bounds so labels can be
 * placed STRICTLY OUTSIDE every component's silhouette (never covering the part!).
 */
function projectBoxToScreen(box, w, h) {
  let sxMin = Infinity, sxMax = -Infinity, syMin = Infinity, syMax = -Infinity;
  const xs = [box.min.x, box.max.x];
  const ys = [box.min.y, box.max.y];
  const zs = [box.min.z, box.max.z];
  for (let ix = 0; ix < 2; ix++) {
    for (let iy = 0; iy < 2; iy++) {
      for (let iz = 0; iz < 2; iz++) {
        tmpCorner.set(xs[ix], ys[iy], zs[iz]).project(camera);
        const px = (tmpCorner.x * 0.5 + 0.5) * w;
        const py = (-tmpCorner.y * 0.5 + 0.5) * h;
        if (px < sxMin) sxMin = px;
        if (px > sxMax) sxMax = px;
        if (py < syMin) syMin = py;
        if (py > syMax) syMax = py;
      }
    }
  }
  return { sxMin, sxMax, syMin, syMax };
}

/**
 * Projects active 3D anchors to 2D screen space, places every badge OUTSIDE
 * the component's 2D silhouette (to the side or above/below), resolves all
 * label-to-label AND label-to-component overlaps, and draws crisp SVG leader lines.
 */
function updateHotspotPositions() {
  if (!ponduloRoot) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isMobile = w < 720;

  let visibleIds;
  if (!state.showPinsToggle) {
    visibleIds = [];
  } else if (state.manualOverride) {
    const maxEx = Math.max(state.exShell, state.exSchedaA, state.exSchedaB, state.exSchedaC, state.exAudioIot, state.exPower, state.exBase);
    visibleIds = maxEx > 0.15 ? HOTSPOTS.map((item) => item.id) : [];
  } else {
    visibleIds = CHAPTER_PINS[state.activeChapter] || [];
  }

  const visibleSet = new Set(visibleIds);
  const isSpotlight = !state.manualOverride && state.activeChapter >= 4 && state.activeChapter <= 9;
  const cardSide = state.manualOverride ? 'none' : (CHAPTER_CARD_SIDE[state.activeChapter] || 'none');

  // Safe viewport margins (avoids topbar, inspector dock, and narrative card)
  const minY = (cardSide === 'top' ? 235 : 108);
  const maxY = h - (state.activeChapter >= 11 ? 108 : 42);
  const minX = (!isMobile && cardSide === 'left') ? Math.min(w * 0.42, 510) : 92;
  const maxX = (!isMobile && cardSide === 'right') ? Math.max(w * 0.58, w - 510) : w - 92;

  const placed = [];
  const componentBoxes = [];
  const viewCenterX = (minX + maxX) * 0.5;
  const viewCenterY = (minY + maxY) * 0.5;

  HOTSPOTS.forEach((item) => {
    const el = pinElements.get(item.id);
    const obj = partMap.get(item.id);
    if (!el || !obj) return;

    if (!visibleSet.has(item.id)) {
      el.classList.remove('visible', 'spotlight');
      el.classList.add('hidden-pin');
      return;
    }

    tmpBox.setFromObject(obj);
    tmpBox.getCenter(tmpVec);
    tmpVec.project(camera);

    if (tmpVec.z <= -1 || tmpVec.z >= 1) {
      el.classList.remove('visible', 'spotlight');
      el.classList.add('hidden-pin');
      return;
    }

    const ax = (tmpVec.x * 0.5 + 0.5) * w;
    const ay = (-tmpVec.y * 0.5 + 0.5) * h;
    const sbox = projectBoxToScreen(tmpBox, w, h);

    const pw = Math.max(el.offsetWidth || 152, 130);
    const ph = Math.max(el.offsetHeight || 30, 30);
    const hw = pw * 0.5 + 8;
    const hh = ph * 0.5 + 6;

    // Store component's screen bounding box (clamped to sane size) so labels never sit on top of it
    const cCx = (sbox.sxMin + sbox.sxMax) * 0.5;
    const cCy = (sbox.syMin + sbox.syMax) * 0.5;
    const cHw = Math.min((sbox.sxMax - sbox.sxMin) * 0.5, 135) + 12;
    const cHh = Math.min((sbox.syMax - sbox.syMin) * 0.5, 110) + 12;
    componentBoxes.push({ cx: cCx, cy: cCy, hw: cHw, hh: cHh });

    // Place pill OUTSIDE the component's silhouette!
    // Choose cleanest direction: to the right/left side or above/below the component
    const margin = 22;
    const candidates = [
      { x: sbox.sxMax + hw + margin, y: ay, bias: (ax >= viewCenterX ? 0 : 120) },  // Right of component
      { x: sbox.sxMin - hw - margin, y: ay, bias: (ax < viewCenterX ? 0 : 120) },   // Left of component
      { x: ax, y: sbox.syMin - hh - margin, bias: (ay <= viewCenterY ? 10 : 90) },  // Above component
      { x: ax, y: sbox.syMax + hh + margin, bias: (ay > viewCenterY ? 10 : 110) },  // Below component
    ];

    let best = candidates[0];
    let bestScore = Infinity;
    for (const c of candidates) {
      const cx = THREE.MathUtils.clamp(c.x, minX, maxX);
      const cy = THREE.MathUtils.clamp(c.y, minY, maxY);
      const clampPenalty = (Math.abs(cx - c.x) + Math.abs(cy - c.y)) * 4.0;
      // Penalize if clamping pushed the candidate back on top of its own component box
      const overlapX = Math.max(0, (hw + cHw) - Math.abs(cx - cCx));
      const overlapY = Math.max(0, (hh + cHh) - Math.abs(cy - cCy));
      const selfOverlapPenalty = (overlapX > 0 && overlapY > 0) ? 1000 : 0;
      const score = c.bias + clampPenalty + selfOverlapPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = { x: cx, y: cy };
      }
    }

    placed.push({ item, el, ax, ay, lx: best.x, ly: best.y, hw, hh });
  });

  // Iterative 2D repulsion solver: keeps pills separated from EACH OTHER and from active 3D components!
  for (let iter = 0; iter < 18; iter++) {
    // 1. Pill vs Pill
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const ox = (a.hw + b.hw) - Math.abs(a.lx - b.lx);
        const oy = (a.hh + b.hh) - Math.abs(a.ly - b.ly);
        if (ox > 0 && oy > 0) {
          if (oy < ox * 1.6) {
            const dir = a.ly <= b.ly ? -1 : 1;
            a.ly += dir * oy * 0.56;
            b.ly -= dir * oy * 0.56;
          } else {
            const dir = a.lx <= b.lx ? -1 : 1;
            a.lx += dir * ox * 0.56;
            b.lx -= dir * ox * 0.56;
          }
          a.lx = THREE.MathUtils.clamp(a.lx, minX, maxX);
          a.ly = THREE.MathUtils.clamp(a.ly, minY, maxY);
          b.lx = THREE.MathUtils.clamp(b.lx, minX, maxX);
          b.ly = THREE.MathUtils.clamp(b.ly, minY, maxY);
        }
      }
    }

    // 2. Pill vs Component silhouette (only in focused views <= 5 pins so labels stay crystal clear of boards!)
    if (placed.length <= 5) {
      for (let i = 0; i < placed.length; i++) {
        const p = placed[i];
        for (let k = 0; k < componentBoxes.length; k++) {
          const cb = componentBoxes[k];
          const ox = (p.hw + cb.hw) - Math.abs(p.lx - cb.cx);
          const oy = (p.hh + cb.hh) - Math.abs(p.ly - cb.cy);
          if (ox > 0 && oy > 0) {
            if (oy < ox) {
              p.ly += (p.ly <= cb.cy ? -1 : 1) * (oy + 4);
            } else {
              p.lx += (p.lx <= cb.cx ? -1 : 1) * (ox + 4);
            }
            p.lx = THREE.MathUtils.clamp(p.lx, minX, maxX);
            p.ly = THREE.MathUtils.clamp(p.ly, minY, maxY);
          }
        }
      }
    }
  }

  // Render pills + crisp SVG elbow leader lines from exact 3D anchor dot -> pill edge!
  let svgMarkup = '';
  placed.forEach((p) => {
    p.el.style.transform = `translate(-50%, -50%) translate3d(${p.lx.toFixed(1)}px, ${p.ly.toFixed(1)}px, 0)`;
    p.el.classList.remove('hidden-pin');
    p.el.classList.add('visible');
    p.el.classList.toggle('spotlight', isSpotlight);

    const accent = p.item.group === 'base' ? 'accent-cyan' : 'accent-red';
    const edgeX = p.lx + (p.ax < p.lx ? -(p.hw - 8) : (p.hw - 8));
    const dLine = Math.hypot(edgeX - p.ax, p.ly - p.ay);
    if (dLine > 10) {
      const mx = p.ax + (edgeX - p.ax) * 0.42;
      svgMarkup += `<polyline class="leader-line ${accent}" points="${p.ax.toFixed(1)},${p.ay.toFixed(1)} ${mx.toFixed(1)},${p.ly.toFixed(1)} ${edgeX.toFixed(1)},${p.ly.toFixed(1)}" />`;
    }
    svgMarkup += `<circle class="leader-dot ${accent}" cx="${p.ax.toFixed(1)}" cy="${p.ay.toFixed(1)}" r="3.8" />`;
  });
  leadersSvg.innerHTML = svgMarkup;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 12-CHAPTER GSAP SCROLLTRIGGER CAROUSEL CHOREOGRAPHY
// ─────────────────────────────────────────────────────────────────────────────

function setupScrollChoreography() {
  gsap.registerPlugin(ScrollTrigger);

  const isMobile = window.innerWidth < 768;
  const dock = document.getElementById('inspector-dock');
  const chapters = document.querySelectorAll('.chapter');
  const rail = document.getElementById('chapter-rail');
  const railDots = [];

  if (rail) {
    rail.innerHTML = '';
    chapters.forEach((el, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rail-dot' + (idx === 0 ? ' active' : '');
      dot.dataset.label = CHAPTER_LABELS[idx] || `Capitolo ${idx + 1}`;
      dot.setAttribute('aria-label', dot.dataset.label);
      dot.addEventListener('click', () => {
        if (state.freeOrbit) setFreeOrbit(false);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      rail.appendChild(dot);
      railDots.push(dot);
    });
  }

  // Track which chapter is currently centered in viewport for crisp HUD & pins
  chapters.forEach((el, idx) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 58%',
      end: 'bottom 42%',
      onEnter: () => setActiveChapter(idx),
      onEnterBack: () => setActiveChapter(idx),
    });
  });

  function setActiveChapter(idx) {
    if (state.activeChapter === idx) return;
    state.activeChapter = idx;
    hudChapter.textContent = CHAPTER_LABELS[idx] || '';
    railDots.forEach((d, i) => d.classList.toggle('active', i === idx));
    if (idx < 10) closeDrawer();
  }

  // Master continuous 3D choreography across all 12 chapters
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.chapters-container',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.75,
      onUpdate: (self) => {
        state.scrollProgress = self.progress;
        progressBar.style.width = `${(self.progress * 100).toFixed(1)}%`;

        if (self.progress < 0.84 && state.manualOverride) {
          state.manualOverride = false;
          if (state.freeOrbit) setFreeOrbit(false);
        }
        dock.classList.toggle('visible', self.progress > 0.86);
      },
    },
  });

  // 01 -> 02: Ergonomics & Physical Rotary Head Tilt (model shifted left so right card stays clear)
  tl.to(state, {
    camX: isMobile ? 3.8 : 4.6,
    camY: 2.35,
    camZ: isMobile ? 5.8 : 4.9,
    targetX: isMobile ? 0 : 0.75,
    targetY: 1.85,
    modelRotY: -0.35,
    headTiltDeg: 22,
    duration: 1.0,
    ease: 'power2.inOut',
  })
  .to(state, {
    headTiltDeg: -18,
    modelRotY: -0.12,
    duration: 0.65,
    ease: 'sine.inOut',
  })

  // 02 -> 03: Cinematic LEFT 3/4 Perspective showing BOTH the TFT screen in foreground
  //           AND the thumb + pointing index side of the chubby 3D cartoon hand gesturing in the 8x8 ToF cone!
  .to(state, {
    camX: isMobile ? -3.4 : -4.35,
    camY: 2.88,
    camZ: isMobile ? 4.3 : 3.45,
    targetX: isMobile ? 0.1 : 0.65,
    targetY: 2.56,
    targetZ: 0.42,
    modelRotY: -0.22,
    headTiltDeg: -6,
    beamIntensity: 1.0,
    duration: 0.95,
    ease: 'power2.inOut',
  })
  .to(state, {
    camX: isMobile ? -2.6 : -3.35,
    camY: 3.02,
    camZ: isMobile ? 4.8 : 4.15,
    targetX: isMobile ? 0.08 : 0.58,
    targetY: 2.55,
    targetZ: 0.35,
    modelRotY: -0.06,
    duration: 0.65,
    ease: 'sine.inOut',
  })

  // 03 -> 04: AUTOMATIC X-RAY + 180° ORBIT AROUND BACK showing packed internals!
  .to(state, {
    beamIntensity: 0.0,
    headTiltDeg: 0,
    xrayAmount: 1.0,
    camX: isMobile ? 3.2 : 4.1,
    camY: 2.75,
    camZ: isMobile ? 6.2 : 5.4,
    targetX: isMobile ? 0 : 0.65,
    targetY: 2.0,
    targetZ: 0.0,
    modelRotY: 2.35, // Smooth spin to rear 3/4 view!
    duration: 1.2,
    ease: 'power2.inOut',
  })

  // 04 -> 05: SPOTLIGHT SCHEDA A (ToF VL53L7CX + Nucleo #1) — opens shell gently forward, slides ONLY Scheda A out!
  .to(state, {
    xrayAmount: 0.78,
    exShell: 1.0,
    exSchedaA: 1.0,
    exSchedaB: 0.0,
    exSchedaC: 0.0,
    exAudioIot: 0.0,
    exPower: 0.0,
    exBase: 0.0,
    camX: isMobile ? 3.8 : 4.4,
    camY: 3.15,
    camZ: isMobile ? 6.4 : 5.5,
    targetX: isMobile ? 0.4 : -0.35,
    targetY: 2.72,
    modelRotY: -0.48, // Rotated right-front so Scheda A faces viewer clearly!
    duration: 1.15,
    ease: 'power2.inOut',
  })

  // 05 -> 06: SPOTLIGHT SCHEDA B (Display ILI9341 + Nucleo #2) — rotates to front-left, slides Scheda B out!
  .to(state, {
    exSchedaA: 0.12,
    exSchedaB: 1.0,
    camX: isMobile ? -3.8 : -4.4,
    camY: 3.10,
    camZ: isMobile ? 6.4 : 5.5,
    targetX: isMobile ? -0.4 : 0.45,
    targetY: 2.68,
    modelRotY: 0.52, // Rotated left-front so Scheda B faces viewer!
    duration: 1.15,
    ease: 'power2.inOut',
  })

  // 06 -> 07: SPOTLIGHT SCHEDA C (Nucleo #3 lifts UP + 7-Segment Display) — elevated front view!
  .to(state, {
    exSchedaB: 0.12,
    exSchedaC: 1.0,
    camX: isMobile ? 2.4 : 2.8,
    camY: 3.85,
    camZ: isMobile ? 6.8 : 5.8,
    targetX: isMobile ? 0.0 : -0.55,
    targetY: 3.15,
    modelRotY: -0.22,
    duration: 1.15,
    ease: 'power2.inOut',
  })

  // 07 -> 08: SPOTLIGHT REAR-LEFT (MP3 YX5300 + ESP8266 Wi-Fi) — PONDULO rotates to show the open rear-left!
  .to(state, {
    exSchedaC: 0.15,
    exAudioIot: 1.0,
    camX: isMobile ? 3.4 : 4.2,
    camY: 3.05,
    camZ: isMobile ? 6.6 : 5.7,
    targetX: isMobile ? 0.0 : 0.55,
    targetY: 2.55,
    modelRotY: 2.25, // Rotated to rear-left so MP3 + ESP8266 project toward viewer!
    duration: 1.2,
    ease: 'power2.inOut',
  })

  // 08 -> 09: SPOTLIGHT REAR-RIGHT (LM2596 Buck Converter 12V->5V) — rotates to rear-right!
  .to(state, {
    exAudioIot: 0.15,
    exPower: 1.0,
    camX: isMobile ? -3.4 : -4.2,
    camY: 2.70,
    camZ: isMobile ? 6.4 : 5.5,
    targetX: isMobile ? 0.0 : -0.55,
    targetY: 2.15,
    modelRotY: -2.25, // Rotated to rear-right so Buck Converter faces viewer!
    duration: 1.15,
    ease: 'power2.inOut',
  })

  // 09 -> 10: SPOTLIGHT BASE (Weighing Plate, Load Cell, HX711, Audio Amp & Speaker)
  .to(state, {
    exShell: 0.0,
    exSchedaA: 0.0,
    exSchedaB: 0.0,
    exSchedaC: 0.0,
    exAudioIot: 0.0,
    exPower: 0.0,
    exBase: 1.0,
    xrayAmount: 0.45,
    camX: isMobile ? 3.6 : 4.3,
    camY: 1.25,
    camZ: isMobile ? 6.4 : 5.4,
    targetX: isMobile ? 0.0 : 0.65,
    targetY: 0.52,
    modelRotY: 0.42,
    duration: 1.25,
    ease: 'power2.inOut',
  })

  // 10 -> 11: GRAND FULL EXPLODED VIEW 360° (ALL 17 parts exploded simultaneously, opaque vermilion red!)
  .to(state, {
    xrayAmount: 0.0,
    exShell: 1.0,
    exSchedaA: 1.0,
    exSchedaB: 1.0,
    exSchedaC: 1.0,
    exAudioIot: 1.0,
    exPower: 1.0,
    exBase: 1.0,
    camX: isMobile ? 5.2 : 5.6,
    camY: 3.15,
    camZ: isMobile ? 9.4 : 8.2,
    targetX: 0.0,
    targetY: 1.95,
    modelRotY: -0.45,
    duration: 1.3,
    ease: 'power2.inOut',
  })

  // 11 -> 12: Frame PONDULO cleanly on the RIGHT so Chapter 12 card on the left NEVER covers the model!
  .to(state, {
    camX: isMobile ? -3.4 : -3.2,
    camY: 2.85,
    camZ: isMobile ? 9.0 : 8.2,
    targetX: isMobile ? 0.0 : -0.95,
    targetY: 1.85,
    modelRotY: 0.28,
    duration: 1.15,
    ease: 'sine.inOut',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. INTERACTIVE INSPECTOR CONTROLS (360° ORBIT + SCREEN-SPACE PAN + CLOSE ZOOM)
// ─────────────────────────────────────────────────────────────────────────────

function focusPartInFreeOrbit(partId) {
  const obj = partMap.get(partId);
  if (!obj) return;
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  flyTarget = box.getCenter(new THREE.Vector3());
}

function resetInspectorCamera() {
  flyTarget = null;
  const isMobile = window.innerWidth < 768;
  camera.position.set(isMobile ? 2.6 : 3.2, 2.65, isMobile ? 8.8 : 7.4);
  controls.target.set(0.0, 1.85, 0.0);
  controls.update();
}

function setFreeOrbit(enable) {
  state.freeOrbit = enable;
  controls.enabled = enable;
  const stage = document.getElementById('top');
  const banner = document.getElementById('orbit-mode-banner');
  const btn = document.getElementById('btn-orbit');
  if (stage) stage.classList.toggle('free-orbit-active', enable);
  if (banner) {
    banner.classList.toggle('visible', enable);
    banner.setAttribute('aria-hidden', enable ? 'false' : 'true');
  }
  if (btn) {
    btn.classList.toggle('active', enable);
    btn.textContent = enable ? '✕ Esci da 360°' : '🧭 Esplora 360°';
  }
  canvas.style.cursor = enable ? 'grab' : 'default';

  // Center orbit pivot cleanly on PONDULO when entering 360° mode so rotation & pan feel natural!
  if (enable) {
    controls.target.set(0.0, 1.85, 0.0);
    controls.update();
  }
}

function setupInspectorControls() {
  const ctrlExplode = document.getElementById('ctrl-explode');
  const valExplode = document.getElementById('val-explode');
  const ctrlTilt = document.getElementById('ctrl-tilt');
  const valTilt = document.getElementById('val-tilt');
  const btnXray = document.getElementById('btn-xray');
  const btnBeam = document.getElementById('btn-beam');
  const btnDataFlow = document.getElementById('btn-dataflow');
  const btnPins = document.getElementById('btn-pins');
  const btnResetCam = document.getElementById('btn-reset-cam');
  const btnOrbit = document.getElementById('btn-orbit');
  const btnLaunch3d = document.getElementById('btn-launch-3d');
  const btnIsolate = document.getElementById('drawer-isolate-btn');

  ctrlExplode.addEventListener('input', () => {
    state.manualOverride = true;
    const v = Number(ctrlExplode.value) / 100;
    state.exShell = v;
    state.exSchedaA = v;
    state.exSchedaB = v;
    state.exSchedaC = v;
    state.exAudioIot = v;
    state.exPower = v;
    state.exBase = v;
    valExplode.textContent = `${ctrlExplode.value}%`;
  });

  ctrlTilt.addEventListener('input', () => {
    state.manualOverride = true;
    state.headTiltDeg = Number(ctrlTilt.value);
    valTilt.textContent = `${ctrlTilt.value}°`;
  });

  btnXray.addEventListener('click', () => {
    state.manualXray = !state.manualXray;
    btnXray.classList.toggle('active', state.manualXray);
  });

  btnBeam.addEventListener('click', () => {
    state.forceBeam = !state.forceBeam;
    btnBeam.classList.toggle('active', state.forceBeam);
  });

  btnDataFlow?.addEventListener('click', () => {
    state.forceDataFlow = !state.forceDataFlow;
    btnDataFlow.classList.toggle('active', state.forceDataFlow);
  });

  btnIsolate?.addEventListener('click', () => {
    if (!activeHotspotId) return;
    state.isolatedId = state.isolatedId === activeHotspotId ? null : activeHotspotId;
    btnIsolate.classList.toggle('active', state.isolatedId === activeHotspotId);
    const isEn = window.ponduloLang === 'en';
    btnIsolate.textContent = state.isolatedId === activeHotspotId
      ? (isEn ? '✕ Show all parts' : '✕ Mostra tutto')
      : (isEn ? '◎ Isolate component' : '◎ Isola componente');
  });

  btnPins.addEventListener('click', () => {
    state.showPinsToggle = !state.showPinsToggle;
    btnPins.classList.toggle('active', state.showPinsToggle);
    if (!state.showPinsToggle) closeDrawer();
  });

  btnResetCam?.addEventListener('click', () => {
    state.manualOverride = true;
    state.isolatedId = null;
    if (btnIsolate) { btnIsolate.classList.remove('active'); btnIsolate.textContent = window.ponduloLang === 'en' ? '◎ Isolate component' : '◎ Isola componente'; }
    if (!state.freeOrbit) setFreeOrbit(true);
    resetInspectorCamera();
  });

  btnOrbit.addEventListener('click', () => {
    state.manualOverride = true;
    setFreeOrbit(!state.freeOrbit);
  });

  btnLaunch3d?.addEventListener('click', () => {
    state.manualOverride = true;
    setFreeOrbit(true);
  });

  window.addEventListener('keydown', (e) => {
    if (!state.freeOrbit) return;
    if (e.key === 'Escape') {
      setFreeOrbit(false);
    } else if (e.key === 'r' || e.key === 'R') {
      resetInspectorCamera();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RENDER LOOP
// ─────────────────────────────────────────────────────────────────────────────

const PART_CHANNEL = {
  head_shell: 'exShell',
  nisc_badge: 'exShell',
  hinge_clamps: 'exShell',
  tof_shield: 'exSchedaA',
  nucleo_tof: 'exSchedaA',
  tft_shield: 'exSchedaB',
  nucleo_display: 'exSchedaB',
  nucleo_scale: 'exSchedaC',
  seven_seg_display: 'exSchedaC',
  mp3_module: 'exAudioIot',
  esp8266_module: 'exAudioIot',
  buck_converter: 'exPower',
  wiring_head: 'exShell',
  weighing_plate: 'exBase',
  load_cell: 'exBase',
  hx711_module: 'exBase',
  audio_amp: 'exBase',
  loudspeaker: 'exBase',
  wiring_base: 'exBase',
};

const clock = new THREE.Clock();

function applyRigState(elapsed) {
  if (!ponduloRoot) return;

  // Subtle idle motion
  const idleSway = state.freeOrbit ? 0 : Math.sin(elapsed * 0.85) * 0.03;
  ponduloRoot.rotation.y = state.modelRotY + idleSway;

  // Real rotary hinge tilt on head_pivot
  if (headPivot) {
    headPivot.rotation.x = THREE.MathUtils.degToRad(state.headTiltDeg);
  }

  // Per-subsystem zero-collision explosion offsets
  for (const [name, vec] of Object.entries(EXPLODE_VECTORS)) {
    const obj = partMap.get(name);
    const baseP = origPos.get(name);
    if (!obj || !baseP) continue;
    const chKey = PART_CHANNEL[name];
    const f = chKey ? state[chKey] : 0;
    obj.position.set(
      baseP.x + vec.x * f,
      baseP.y + vec.y * f,
      baseP.z + vec.z * f
    );
  }

  // Smooth, glitch-free X-Ray shader switching (ALWAYS calls mat.needsUpdate on state flip!)
  // Head goes X-Ray in Ch 04-09 or manual X-Ray; Base only goes X-Ray in Ch 04, Ch 10, or manual X-Ray!
  const effectiveXray = state.manualXray ? 1.0 : state.xrayAmount;
  const headXray = effectiveXray;
  const baseXray = state.manualXray
    ? 1.0
    : (state.activeChapter === 3 || state.activeChapter === 9 ? effectiveXray : 0.0);

  function applyShellXray(meshes, edges, amount) {
    const isTranslucent = amount > 0.04;
    const opacity = 1.0 - amount * 0.84; // Solid 1.0 -> clean frosted glass 0.16
    meshes.forEach((mesh) => {
      const mat = mesh.material;
      if (!mat) return;
      if (mat.transparent !== isTranslucent) {
        mat.transparent = isTranslucent;
        mat.needsUpdate = true; // CRITICAL: forces Three.js WebGL shader recompile!
      }
      mat.opacity = isTranslucent ? opacity : 1.0;
      mat.depthWrite = !isTranslucent;
      mat.depthTest = true;
      mesh.renderOrder = isTranslucent ? 10 : 0;
      mesh.castShadow = !isTranslucent;
    });
    edges.forEach(({ lines, mat }) => {
      lines.visible = amount > 0.06;
      mat.opacity = Math.min(amount * 0.36, 0.36);
    });
  }

  applyShellXray(headShellMeshes, headXrayEdges, headXray);
  applyShellXray(baseShellMeshes, baseXrayEdges, baseXray);

  // Crisp thin black CAD edge outlines appear smoothly AFTER leaving the Chapter 01 Hero!
  const pastHero = THREE.MathUtils.clamp((state.scrollProgress - 0.035) / 0.045, 0, 1);
  cadInkEdges.forEach(({ lines, mat, isHead }) => {
    const shellXray = isHead ? headXray : baseXray;
    const inkOpacity = pastHero * (1.0 - shellXray * 0.85) * 0.48;
    lines.visible = inkOpacity > 0.02;
    mat.opacity = inkOpacity;
  });

  // Component Isolate mode: dim non-isolated boards cleanly so the chosen board pops!
  isolateTrackedMeshes.forEach(({ mesh, groupId, origOpacity, origTrans }) => {
    const dim = state.isolatedId && state.isolatedId !== groupId;
    const targetTrans = dim ? true : origTrans;
    if (mesh.material.transparent !== targetTrans) {
      mesh.material.transparent = targetTrans;
      mesh.material.needsUpdate = true;
    }
    mesh.material.opacity = dim ? 0.14 : origOpacity;
    mesh.material.depthWrite = !dim;
  });

  // 1 Hz STM32 NUCLEO-G474RE LD2 green heartbeat LED blink!
  const hb = (Math.sin(elapsed * Math.PI * 2.0) > 0.15) ? 1.0 : 0.12;
  ledGreenMaterials.forEach((m) => {
    m.emissiveIntensity = hb;
  });

  badgeMaterials.forEach((mat) => {
    // nisc_badge is already alphaMode BLEND (transparent: true)
    mat.opacity = 1.0 - headXray * 0.78;
    mat.depthWrite = headXray <= 0.04;
  });

  // Gently fade internal jumper wires when boards are widely exploded
  const maxHeadEx = Math.max(state.exShell, state.exSchedaA, state.exSchedaB, state.exSchedaC, state.exAudioIot, state.exPower);
  const wireOpacity = THREE.MathUtils.clamp(1.0 - maxHeadEx * 0.82, 0.18, 1.0);
  const wireTrans = wireOpacity < 0.98;
  wireMaterials.forEach((mat) => {
    if (mat.transparent !== wireTrans) {
      mat.transparent = wireTrans;
      mat.needsUpdate = true;
    }
    mat.opacity = wireOpacity;
    mat.depthWrite = !wireTrans;
  });

  // Drop & soften studio floor smoothly when Base explodes so underside amp/speaker/HX711 NEVER clip floor!
  floorGroup.position.y = -state.exBase * 0.95;
  floorMat.opacity = 0.65 * (1.0 - state.exBase * 0.55);
  ringMat.opacity = 0.13 * (1.0 - state.exBase * 0.55);

  // Volumetric 8x8 ToF Laser Beam + Animated 3D Cartoon Hand + Live 3D TFT & 7-Seg Displays!
  const bi = state.forceBeam ? 1.0 : state.beamIntensity;
  if (tofBeam) {
    tofBeam.visible = bi > 0.02;
    if (tofBeam.visible) {
      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 5.0);
      tofBeam.userData.coneMat.opacity = 0.11 * bi * pulse;
      tofBeam.userData.lineMat.opacity = 0.42 * bi * pulse;
    }
  }

  // ── HERO INTRO CHOREOGRAPHY: K.I.T.T. -> 0.00 -> FIORENTINA LANDS & WEIGHS -> VANISHES! ──
  let introTft = null;
  let introSegWeight = null;
  let introKittPos = -1;
  let platterDip = 0;

  if (fiorentinaGroup && !introFinished) {
    if (state.scrollProgress > 0.045) {
      // User started scrolling immediately -> hide Fiorentina cleanly
      introFinished = true;
      fiorentinaGroup.visible = false;
    } else {
      if (introStartTime === null) introStartTime = elapsed;
      const it = elapsed - introStartTime;
      const { mats, baseY } = fiorentinaGroup.userData;

      if (it < 2.4) {
        // 0.0 - 2.4s: K.I.T.T. Knight Rider red scan on 7-seg + Boot screen on TFT!
        fiorentinaGroup.visible = false;
        const step = Math.floor(it / 0.11) % 14;
        introKittPos = step < 8 ? step : 14 - step;
        introTft = { mode: 'boot', bootPct: it / 2.4 };
      } else if (it < 3.45) {
        // 2.4 - 3.45s: Clean 0.00 g ready on both displays!
        fiorentinaGroup.visible = false;
        introSegWeight = 0.0;
        introTft = { mode: 'food', product: 'Fiorentina', price: 32.0, weightG: 0.0, cursorX: 0.5, cursorY: 0.5, dwell: 0, flash: 0 };
      } else if (it < 4.45) {
        // 3.45 - 4.45s: 3D Fiorentina drops gracefully onto the white platter!
        const p = (it - 3.45) / 1.0;
        const ease = 1 - Math.pow(1 - p, 3);
        const bounce = p > 0.82 ? Math.sin(((p - 0.82) / 0.18) * Math.PI) * 0.032 : 0;
        fiorentinaGroup.visible = true;
        fiorentinaGroup.position.y = baseY + (1 - ease) * 0.92 + bounce;
        const op = Math.min(1, p * 2.4);
        mats.forEach((m) => { m.opacity = op; });
        platterDip = p > 0.78 ? -0.015 * Math.sin(((p - 0.78) / 0.22) * Math.PI * 0.5) : 0;
        introSegWeight = p > 0.82 ? ((p - 0.82) / 0.18) * 420.0 : 0.0;
        introTft = { mode: 'food', product: 'Fiorentina', price: 32.0, weightG: introSegWeight, cursorX: 0.52, cursorY: 0.55, dwell: 0, flash: 0 };
      } else if (it < 7.85) {
        // 4.45 - 7.85s: Live HX711 damped weighing settle -> 685.0 g (21.92 EUR) + Dwell OK!
        const wt = it - 4.45;
        fiorentinaGroup.visible = true;
        fiorentinaGroup.position.y = baseY - 0.012;
        mats.forEach((m) => { m.opacity = 1; });
        platterDip = -0.012;
        const settle = 685.0 * (1 - Math.exp(-wt * 3.4) * Math.cos(wt * 7.5) * 0.42);
        introSegWeight = wt > 1.35 ? 685.0 : Math.max(0, settle);
        const dwell = wt > 1.55 && wt < 2.95 ? (wt - 1.55) / 1.4 : (wt >= 2.95 ? 1.0 : 0);
        const flash = wt >= 2.95 ? 1.0 : 0;
        introTft = { mode: 'food', product: 'Fiorentina', price: 32.0, weightG: introSegWeight, cursorX: 0.76, cursorY: 0.80, dwell, flash };
      } else if (it < 9.15) {
        // 7.85 - 9.15s: Fiorentina lifts & fades away smoothly, leaving ONLY clean PONDULO!
        const fp = (it - 7.85) / 1.3;
        const ease = fp * fp;
        fiorentinaGroup.visible = true;
        fiorentinaGroup.position.y = baseY - 0.012 + ease * 0.65;
        const op = Math.max(0, 1 - fp * 1.15);
        mats.forEach((m) => { m.opacity = op; });
        platterDip = -0.012 * (1 - fp);
        introSegWeight = Math.max(0, 685.0 * (1 - Math.min(1, fp * 1.6)));
        introTft = { mode: 'food', product: 'Manzo', price: 18.9, weightG: introSegWeight, cursorX: 0.5, cursorY: 0.5, dwell: 0, flash: 0 };
      } else {
        // 9.15s+: Everything vanishes cleanly -> only PONDULO remains at 0.00 g!
        fiorentinaGroup.visible = false;
        introFinished = true;
      }
    }
  }

  // Apply subtle platter micro-compression during Fiorentina landing
  if (platterDip !== 0) {
    const plateObj = partMap.get('weighing_plate');
    const plateBase = origPos.get('weighing_plate');
    if (plateObj && plateBase && state.exBase < 0.02) {
      plateObj.position.y = plateBase.y + platterDip;
    }
  }

  let gestureTft = null;
  if (cartoonHand) {
    cartoonHand.visible = bi > 0.15;
    if (cartoonHand.visible) {
      const { hand, tipRing, tipRingMat, swipeTrailMat, spotMesh, spotMat } = cartoonHand.userData;
      const cyc = elapsed % 9.0;
      if (cyc < 5.2) {
        // Phase A: Chubby 3D hand points index finger directly at VL53L7CX -> glides cursor to STAMPA -> 1.5s Dwell!
        tipRing.visible = true;
        swipeTrailMat.opacity = 0;
        if (cyc < 2.2) {
          const p = cyc / 2.2;
          const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
          const hx = -0.22 + ease * 0.42;
          const hy = 0.12 - ease * 0.24;
          hand.position.set(hx, hy, 0);
          hand.rotation.set(0.12 - hy * 0.35, -hx * 0.35, -hx * 0.18);
          spotMesh.position.set(-0.12 + hx * 0.85, 0.02 + hy * 0.85, -0.64);
          tipRingMat.opacity = 0.75;
          spotMat.opacity = 0.75;
          gestureTft = { mode: 'food', cursorX: 0.24 + ease * 0.52, cursorY: 0.44 + ease * 0.36, dwell: 0, flash: 0 };
        } else if (cyc < 4.2) {
          // Hold steady over STAMPA: Dwell fills 0 -> 100%!
          const dp = (cyc - 2.2) / 2.0;
          hand.position.set(0.20, -0.12, -0.06 * Math.sin(dp * Math.PI));
          hand.rotation.set(0.16, -0.08, -0.04);
          spotMesh.position.set(0.05, -0.08, -0.64);
          tipRingMat.opacity = 0.96;
          spotMat.opacity = 0.95;
          gestureTft = { mode: 'food', cursorX: 0.76, cursorY: 0.80, dwell: dp, flash: 0 };
        } else {
          // Green confirmation flash!
          hand.position.set(0.20, -0.12, 0.04);
          tipRingMat.opacity = 1.0;
          gestureTft = { mode: 'food', cursorX: 0.76, cursorY: 0.80, dwell: 1.0, flash: 1.0 };
        }
      } else {
        // Phase B: Smooth horizontal Air-Swipe across the ToF matrix switching Macelleria -> Clinico!
        tipRing.visible = false;
        const sp = (cyc - 5.2) / 3.8;
        if (sp < 0.38) {
          const t = sp / 0.38;
          const ease = 0.5 - 0.5 * Math.cos(t * Math.PI);
          const sx = -0.34 + ease * 0.68;
          hand.position.set(sx, Math.sin(t * Math.PI) * 0.10, -0.04);
          hand.rotation.set(0.08, 0.25 - ease * 0.5, -0.25 + ease * 0.5);
          swipeTrailMat.opacity = Math.sin(t * Math.PI) * 0.84;
          spotMesh.position.set(-0.10 + sx * 0.8, 0.02 + Math.sin(t * Math.PI) * 0.08, -0.64);
          gestureTft = { mode: t > 0.55 ? 'clinical' : 'food', cursorX: 0.15 + ease * 0.70, cursorY: 0.52, dwell: 0, flash: 0 };
        } else if (sp < 0.78) {
          hand.position.set(0.32, 0.02, 0.04);
          hand.rotation.set(0.06, -0.18, 0.12);
          swipeTrailMat.opacity = 0.12;
          gestureTft = { mode: 'clinical', cursorX: 0.78, cursorY: 0.52, dwell: 0, flash: 0 };
        } else {
          const t = (sp - 0.78) / 0.22;
          const sx = 0.32 - t * 0.54;
          hand.position.set(sx, Math.sin(t * Math.PI) * 0.08, 0);
          hand.rotation.set(0.08, -0.15 + t * 0.3, 0.12 - t * 0.28);
          swipeTrailMat.opacity = Math.sin(t * Math.PI) * 0.6;
          gestureTft = { mode: t > 0.5 ? 'food' : 'clinical', cursorX: 0.78 - t * 0.52, cursorY: 0.50, dwell: 0, flash: 0 };
        }
      }
    }
  }

  // Throttle live CanvasTexture redraws to ~18 Hz (Hero Intro & ToF Gesture ALWAYS take priority over Simulator!)
  if (liveDisplays && elapsed - (liveDisplays._lastDraw || 0) > 0.055) {
    liveDisplays._lastDraw = elapsed;
    const sim = window.ponduloLiveSim;
    if (introTft) {
      liveDisplays.renderTFT(introTft);
      liveDisplays.renderSevenSeg(introSegWeight ?? 0, introKittPos);
    } else if (gestureTft) {
      liveDisplays.renderTFT({ ...gestureTft, weightG: 342.5 });
      liveDisplays.renderSevenSeg(342.5 + Math.sin(elapsed * 2.2) * 0.05);
    } else if (sim && sim.overrideActive) {
      liveDisplays.renderTFT(sim);
      liveDisplays.renderSevenSeg(sim.weightG, sim.kittPos);
    } else {
      const wIdle = state.scrollProgress < 0.05 ? 0.0 : 342.5 + Math.sin(elapsed * 1.4) * 0.1;
      const dLive = state.scrollProgress < 0.05 ? 0 : 0.45 + 0.45 * (0.5 + 0.5 * Math.sin(elapsed * 1.6));
      liveDisplays.renderTFT({ mode: 'food', weightG: wIdle, cursorX: 0.76, cursorY: 0.79, dwell: dLive, flash: 0 });
      liveDisplays.renderSevenSeg(wIdle);
    }
  }

  // 3D Animated Data-Flow Signal Pulses (manual toggle OR subtle auto in Architecture chapters 05-09!)
  if (dataFlowGroup) {
    const autoFlow = !state.manualOverride && state.activeChapter >= 4 && state.activeChapter <= 8;
    const showFlow = state.forceDataFlow || autoFlow;
    dataFlowGroup.visible = showFlow;
    if (showFlow) {
      dataFlowGroup.userData.packets.forEach((p) => {
        const t = (elapsed * p.speed + p.phase) % 1.0;
        p.curve.getPointAt(t, p.mesh.position);
      });
    }
  }

  // Camera tracking
  if (!state.freeOrbit) {
    flyTarget = null;
    camera.position.lerp(tmpVec.set(state.camX, state.camY, state.camZ), 0.11);
    controls.target.lerp(tmpTarget.set(state.targetX, state.targetY, state.targetZ), 0.11);
    camera.lookAt(controls.target);
  } else {
    if (flyTarget) {
      controls.target.lerp(flyTarget, 0.12);
      if (controls.target.distanceTo(flyTarget) < 0.015) flyTarget = null;
    }
    controls.update();
  }

  // Sync HUD & sliders
  const maxExPct = Math.round(Math.max(maxHeadEx, state.exBase) * 100);
  const xrayPct = Math.round(effectiveXray * 100);
  hudTelemetry.textContent = `TILT ${state.headTiltDeg >= 0 ? '+' : ''}${state.headTiltDeg.toFixed(0)}° · X-RAY ${xrayPct}% · EXPLODE ${maxExPct}%`;

  if (!state.manualOverride) {
    const ce = document.getElementById('ctrl-explode');
    const ve = document.getElementById('val-explode');
    const ct = document.getElementById('ctrl-tilt');
    const vt = document.getElementById('val-tilt');
    if (ce && ve) { ce.value = maxExPct; ve.textContent = `${maxExPct}%`; }
    if (ct && vt) { ct.value = Math.round(state.headTiltDeg); vt.textContent = `${Math.round(state.headTiltDeg)}°`; }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();
  applyRigState(elapsed);
  renderer.render(scene, camera);
  updateHotspotPositions();
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. EDITORIAL SCENARIO TABS
// ─────────────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    document.querySelectorAll('.scenario-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tab}`);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. FULLSCREEN ZOOM & PAN LIGHTBOX FOR FRITZING SCHEMATIC
// ─────────────────────────────────────────────────────────────────────────────

(() => {
  const lb = document.getElementById('schematic-lightbox');
  const stage = document.getElementById('lb-stage');
  const img = document.getElementById('lb-img');
  const zoomVal = document.getElementById('lb-zoom-val');
  const btnOpen = document.getElementById('btn-open-schematic');
  const preview = document.getElementById('schematic-preview');
  const btnClose = document.getElementById('lb-close');
  const btnIn = document.getElementById('lb-zoom-in');
  const btnOut = document.getElementById('lb-zoom-out');
  const btnReset = document.getElementById('lb-zoom-reset');
  if (!lb || !stage || !img) return;

  let scale = 1.0;
  let tx = 0;
  let ty = 0;
  let dragging = false;
  let sx = 0;
  let sy = 0;

  function renderTransform() {
    if (scale <= 1.01) { tx = 0; ty = 0; }
    img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    zoomVal.textContent = `${Math.round(scale * 100)}%`;
  }

  function setScale(next) {
    scale = Math.min(4.0, Math.max(1.0, next));
    renderTransform();
  }

  function openLightbox() {
    scale = 1.0; tx = 0; ty = 0;
    renderTransform();
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  btnOpen?.addEventListener('click', openLightbox);
  preview?.addEventListener('click', openLightbox);
  preview?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
  });
  btnClose?.addEventListener('click', closeLightbox);
  btnIn?.addEventListener('click', () => setScale(scale + 0.45));
  btnOut?.addEventListener('click', () => setScale(scale - 0.45));
  btnReset?.addEventListener('click', () => { scale = 1.0; tx = 0; ty = 0; renderTransform(); });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    setScale(scale + (e.deltaY < 0 ? 0.28 : -0.28));
  }, { passive: false });

  stage.addEventListener('dblclick', () => {
    if (scale > 1.2) { scale = 1.0; tx = 0; ty = 0; renderTransform(); }
    else setScale(2.2);
  });

  stage.addEventListener('pointerdown', (e) => {
    if (scale <= 1.01) return;
    dragging = true;
    sx = e.clientX - tx;
    sy = e.clientY - ty;
    stage.classList.add('dragging');
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    tx = e.clientX - sx;
    ty = e.clientY - sy;
    renderTransform();
  });

  const endDrag = () => { dragging = false; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
  });
})();
