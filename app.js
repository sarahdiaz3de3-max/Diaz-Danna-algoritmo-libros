// =====================
// 1) Datos
// =====================

const libros = [
  "Cien años de soledad",
  "Harry Potter y la piedra filosofal",
  "El señor de los anillos",
  "1984",
  "El principito",
  "Los juegos del hambre",
  "Orgullo y prejuicio",
  "Sapiens",
  "Don Quijote de la Mancha",
  "Hábitos atómicos",
];

const segmentos = {
  "J": "Jóvenes (13–18)",
  "A": "Adultos (19–35)",
  "M": "Mayores (36+)",
  "F": "Fans de fantasía",
  "C": "Fans de clásicos",
  "N": "No ficción / desarrollo personal",
};

const contextos = {
  "G": "¿Cuál libro es más popular globalmente?",
  "R": "¿Cuál libro ves más recomendado en redes?",
  "V": "¿Cuál libro ha vendido más históricamente?",
};

const RATING_INICIAL = 1000;
const K = 32;

const STORAGE_KEY = "bookmash_state_v1";

function defaultState(){
  const buckets = {};
  for (const seg of Object.keys(segmentos)){
    for (const ctx of Object.keys(contextos)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      libros.forEach(l => buckets[key][l] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, libroA, libroB, winner){
  const ra = bucket[libroA], rb = bucket[libroB];
  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[libroA] = ra + K * (sa - ea);
  bucket[libroB] = rb + K * (sb - eb);
}

function randomPair(){
  const a = libros[Math.floor(Math.random() * libros.length)];
  let b = a;
  while (b === a){
    b = libros[Math.floor(Math.random() * libros.length)];
  }
  return [a, b];
}

function bucketKey(seg, ctx){ return `${seg}__${ctx}`; }

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([libro, rating]) => ({libro, rating}));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} — ${v}`;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

segmentSelect.value = "J";
contextSelect.value = "G";

function refreshQuestion(){
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop(){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const bucket = state.buckets[bucketKey(seg, ctx)];

  const rows = topN(bucket, 10);
  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.libro}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner){
  const seg = segmentSelect.value;
  const ctx = contextSelect.value;
  const key = bucketKey(seg, ctx);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[seg],
    contexto: contextos[ctx],
    A: currentA,
    B: currentB,
    ganador: (winner === "A") ? currentA : currentB
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.addEventListener("click", () => vote("A"));
btnB.addEventListener("click", () => vote("B"));
btnNewPair.addEventListener("click", () => newDuel());
btnShowTop.addEventListener("click", () => renderTop());

segmentSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });
contextSelect.addEventListener("change", () => { renderTop(); refreshQuestion(); });

btnReset.addEventListener("click", () => {
  if (!confirm("Se borrarán votos y rankings. ¿Continuar?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

newDuel();
renderTop();
refreshQuestion();
