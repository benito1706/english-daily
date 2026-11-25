"use strict";

/* =========================================================
   Datum
   ========================================================= */
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const today = () => dateKey(new Date());
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); }
function daysBetween(a, b) { return Math.round((parseKey(b) - parseKey(a)) / 86400000); }
function weekStart(k) { const d = parseKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); }

/* =========================================================
   Inhalte vorbereiten
   ========================================================= */
function hid(s) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }
const firstAlt = (en) => en.split("|")[0];
const allAlts = (en) => en.split("|");
const SENT_ITEMS = Object.entries(SENTENCES).flatMap(([cat, list]) =>
  list.map(([en, de]) => ({ id: "s" + hid(firstAlt(en)), kind: "sentence", cat, en, de })));
const GRAM_ITEMS = GRAMMAR.flatMap((g, gi) =>
  g.items.map(([de, en, hint]) => ({ id: "g" + hid(firstAlt(en)), kind: "grammar", gi, cat: g.title, en, de, hint })));
const ALL_ITEMS = [...SENT_ITEMS, ...GRAM_ITEMS];
const ITEM = Object.fromEntries(ALL_ITEMS.map((i) => [i.id, i]));

/* =========================================================
   Speicher
   ========================================================= */
const STORE_KEY = "english-daily-v2";
const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // Tage bis zur nächsten Wiederholung je Stufe
const MASTERED = 3; // ab dieser Stufe gilt etwas als „sitzt“

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function newCard(wrong, right, why, source) {
  return { id: uid(), wrong, right, why: why || "", box: 0, due: today(), added: today(), source: source || "eigene" };
}
function defaultSettings() {
  return { voiceURI: "", rate: 0.95, recLang: "en-US", cue: "", time: "08:00", company: "", role: "" };
}
function defaultState() {
  return {
    version: 2, onboarded: false, startDate: today(), settings: defaultSettings(),
    items: {},      // Fortschritt je Satz: { box, due, seen, right }
    cards: STARTER_CARDS.map(([w, r, y]) => newCard(w, r, y, "start")),
    days: {},       // "YYYY-MM-DD": { done, practiced, firstTry, correct, tutor }
    weeks: {},      // "3": { human, check }
    confidence: {}, // "3": 1–5
    topicOffset: {}, hideInstallHint: false,
  };
}
function merge(s) {
  const d = defaultState();
  return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
}
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) return merge(JSON.parse(raw)); } catch (e) {}
  try { // Übernahme aus der ersten Version
    const old = JSON.parse(localStorage.getItem("englisch-app-v1") || "null");
    if (old && Array.isArray(old.cards)) {
      const s = defaultState();
      s.cards = old.cards; s.startDate = old.startDate || s.startDate;
      s.settings = { ...s.settings, ...(old.settings || {}) };
      return s;
    }
  } catch (e) {}
  return defaultState();
}
let state = load();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast("Speichern fehlgeschlagen"); } }
save();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

const dayRec = (k = today()) => (state.days[k] ||= { done: false, practiced: 0, firstTry: 0, correct: 0, tutor: false });
const weekRec = (w) => (state.weeks[w] ||= {});
const itemRec = (id) => (state.items[id] ||= { box: 0, due: today(), seen: 0, right: 0 });

/* =========================================================
   Hilfen
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const view = $("#view");
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (_) {}
    ta.remove(); return ok;
  }
}
function downloadBlob(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const appUrl = () => location.href.split("#")[0];

/* =========================================================
   Plan-Position
   ========================================================= */
const weekNo = () => Math.max(1, Math.floor(daysBetween(state.startDate, today()) / 7) + 1);
const phaseFor = (w) => PHASES.find((p) => w >= p.weeks[0] && w <= p.weeks[1]) || PHASES[PHASES.length - 1];
const grammarIndex = (w) => Math.min(w, GRAMMAR.length) - 1;
function topicToday() {
  const p = phaseFor(weekNo());
  const idx = Math.max(0, daysBetween(state.startDate, today())) + (state.topicOffset[today()] || 0);
  return p.topics[idx % p.topics.length];
}
const dueCards = () => state.cards.filter((c) => c.due <= today());
const dayDone = (k) => !!(state.days[k] && state.days[k].done);

// Serie mit Joker: pro Kalenderwoche wird eine einzelne Lücke überbrückt
function streakInfo(assumeToday = false) {
  const done = (k) => dayDone(k) || (assumeToday && k === today());
  let k = today(); if (!done(k)) k = addDays(k, -1);
  let n = 0; const used = new Set();
  for (let g = 0; g < 2000; g++) {
    if (done(k)) { n++; k = addDays(k, -1); continue; }
    const wk = weekStart(k);
    if (n > 0 && !used.has(wk) && done(addDays(k, -1))) { used.add(wk); k = addDays(k, -1); continue; }
    break;
  }
  return { n, jokerThisWeek: used.has(weekStart(today())) };
}
function masteredCount() {
  const items = Object.entries(state.items).filter(([id, r]) => ITEM[id] && r.box >= MASTERED).length;
  const cards = state.cards.filter((c) => c.box >= MASTERED).length;
  return { items, cards, total: items + cards, of: ALL_ITEMS.length + state.cards.length };
}

/* =========================================================
   Sprachausgabe
   ========================================================= */
const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Hysterical|Deranged|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/;
let voices = [];
function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  voices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith("en") && !NOVELTY.test(v.name));
  if (location.hash === "#einstellungen" && booted) render();
}
let booted = false;
if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
function pickVoice() {
  if (state.settings.voiceURI) { const v = voices.find((x) => x.voiceURI === state.settings.voiceURI); if (v) return v; }
  for (const name of ["Samantha", "Daniel", "Google US English", "Google UK English Female", "Karen", "Moira"]) {
    const v = voices.find((x) => x.name.includes(name)); if (v) return v;
  }
  return voices.find((x) => x.lang === "en-US") || voices[0] || null;
}
function speak(text, rate) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
  u.rate = rate || state.settings.rate;
  speechSynthesis.speak(u);
}
// iOS spielt Sprache erst nach einer Berührung ab: beim ersten Tippen freischalten
let ttsUnlocked = false;
document.addEventListener("pointerdown", () => {
  if (ttsUnlocked || !("speechSynthesis" in window)) return;
  ttsUnlocked = true; const u = new SpeechSynthesisUtterance(" "); u.volume = 0; speechSynthesis.speak(u);
}, { passive: true });

/* =========================================================
   Spracherkennung
   ========================================================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let activeRec = null;
const SR_ERRORS = {
  "not-allowed": "Mikrofon ist nicht erlaubt. Bitte in den Einstellungen freigeben. Bis dahin: Tippen.",
  "service-not-allowed": isIOS ? "Spracherkennung blockiert. Auf dem iPhone muss „Diktierfunktion“ aktiviert sein (Einstellungen → Allgemein → Tastatur). Bis dahin: Tippen." : "Spracherkennung ist blockiert. Bis dahin: Tippen.",
  "no-speech": "Nichts gehört. Nochmal versuchen.",
  "audio-capture": "Kein Mikrofon gefunden.",
  "network": "Keine Verbindung zum Erkennungsdienst. Internet nötig, sonst: Tippen.",
  "aborted": "",
};
function listen(onInterim) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("unsupported"));
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const r = new SR();
    r.lang = state.settings.recLang || "en-US";
    r.interimResults = true; r.maxAlternatives = 3; r.continuous = false;
    const finals = []; let interim = ""; let settled = false;
    r.onresult = (e) => {
      interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals.push(Array.from(res).map((a) => a.transcript.trim()));
        else interim += res[0].transcript;
      }
      onInterim && onInterim((finals.map((f) => f[0]).join(" ") + " " + interim).trim());
    };
    r.onerror = (e) => { if (settled) return; settled = true; activeRec = null; reject(new Error(e.error)); };
    r.onend = () => {
      if (settled) return; settled = true; activeRec = null;
      // Safari liefert manchmal kein „final“: dann das Zwischenergebnis nehmen
      if (!finals.length && interim.trim()) finals.push([interim.trim()]);
      resolve(finals);
    };
    activeRec = r;
    try { r.start(); } catch (e) { settled = true; activeRec = null; reject(e); }
  });
}
function candidates(finals) {
  if (!finals.length) return [];
  if (finals.length === 1) return finals[0];
  return [finals.map((f) => f[0]).join(" ")];
}
function stopListening() { if (activeRec) { try { activeRec.abort(); } catch (_) {} activeRec = null; } }

/* =========================================================
   Vergleich gesagt ↔ Ziel
   ========================================================= */
const CONTRACTIONS = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are", "he's": "he is", "she's": "she is",
  "it's": "it is", "that's": "that is", "what's": "what is", "there's": "there is", "here's": "here is", "let's": "let us",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "i will", "you'll": "you will", "we'll": "we will", "they'll": "they will", "it'll": "it will", "he'll": "he will", "she'll": "she will",
  "i'd": "i would", "you'd": "you would", "we'd": "we would", "they'd": "they would", "she'd": "she would", "he'd": "he would",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "can not", "cannot": "can not", "won't": "will not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not",
  "hadn't": "had not", "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not", "mustn't": "must not",
  "ok": "okay", "o'clock": "oclock",
};
const NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
const TENS = { thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
function normWord(w) {
  w = w.toLowerCase().replace(/[’‘`´]/g, "'").replace(/e-mail/g, "email").replace(/-/g, " ").replace(/[^a-z0-9' ]/g, " ");
  const out = [];
  for (let t of w.split(/\s+/).filter(Boolean)) {
    if (CONTRACTIONS[t]) { out.push(...CONTRACTIONS[t].split(" ")); continue; }
    t = t.replace(/'s$/, "").replace(/'/g, "");
    if (!t) continue;
    const n = NUMBERS.indexOf(t);
    if (n >= 0) t = String(n); else if (TENS[t]) t = String(TENS[t]);
    out.push(t);
  }
  return out;
}
function tokenize(text) {
  const display = text.trim().split(/\s+/).filter(Boolean);
  const tokens = [];
  display.forEach((d, i) => normWord(d).forEach((t) => tokens.push({ t, i })));
  return { display, tokens };
}
function lcsMatch(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i].t === b[j].t ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ma = new Set(), mb = new Set(); let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i].t === b[j].t) { ma.add(i); mb.add(j); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { ma, mb, count: ma.size };
}
function compare(target, spoken) {
  const T = tokenize(target), S = tokenize(spoken);
  const { ma, mb, count } = lcsMatch(T.tokens, S.tokens);
  const total = T.tokens.length + S.tokens.length;
  const score = total ? Math.round((200 * count) / total) : 0;
  const okFor = (X, set) => X.display.map((_, i) => X.tokens.every((x, idx) => x.i !== i || set.has(idx)));
  return { score, T, S, tOk: okFor(T, ma), sOk: okFor(S, mb), target, spoken };
}
// Bestes Paar aus allen Zielvarianten und allen Erkennungs-Alternativen
function bestCompare(targets, cands) {
  let best = null;
  for (const t of targets) for (const c of cands) {
    const r = compare(t, c);
    if (!best || r.score > best.score) best = r;
  }
  return best;
}
function resultHTML(r, { showTarget = true } = {}) {
  const cls = r.score >= 90 ? "good" : r.score >= 70 ? "ok" : "bad";
  const label = r.score >= 90 ? "Sitzt!" : r.score >= 70 ? "Fast. Schau dir die roten Wörter an." : "Noch nicht. Genau dafür übst du.";
  const target = r.T.display.map((w, i) => `<span class="${r.tOk[i] ? "w-ok" : "w-miss"}">${esc(w)}</span>`).join(" ");
  const heard = r.S.display.length
    ? r.S.display.map((w, i) => (r.sOk[i] ? esc(w) : `<span class="w-extra">${esc(w)}</span>`)).join(" ")
    : "<i>nichts</i>";
  return `<div class="result ${cls}">
    <div class="head"><span class="score">${r.score} %</span><span class="muted small">${label}</span></div>
    ${showTarget ? `<div class="diff">${target}</div>` : ""}
    <div class="heard">Du: ${heard}</div>
  </div>`;
}

/* =========================================================
   Aufnahmen (Wochen-Check) in IndexedDB
   ========================================================= */
const idb = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open("english-daily", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("rec", { keyPath: "id" });
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction("rec", mode); const store = t.objectStore("rec"); const out = fn(store);
      t.oncomplete = () => res(out && "result" in out ? out.result : undefined); t.onerror = () => rej(t.error);
    });
  },
  put(o) { return this.tx("readwrite", (s) => { s.put(o); }); },
  all() { return this.tx("readonly", (s) => s.getAll()); },
  del(id) { return this.tx("readwrite", (s) => { s.delete(id); }); },
};
async function startRecorder() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.start();
  return {
    stop: () => new Promise((res) => {
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); res(new Blob(chunks, { type: mr.mimeType || mime || "audio/mp4" })); };
      mr.stop();
    }),
    cancel: () => { try { mr.stop(); } catch (_) {} stream.getTracks().forEach((t) => t.stop()); },
  };
}

/* =========================================================
   Eingabe-Baustein: Mikrofon oder Tippen
   ========================================================= */
let preferTyping = false;
function answerInput(host, { label, onResult }) {
  host.innerHTML = `
    <div class="live" id="live"></div>
    <div id="typeWrap" class="type-wrap" hidden>
      <input type="text" id="typeIn" placeholder="Antwort tippen oder diktieren" autocomplete="off" autocapitalize="sentences" enterkeyhint="done">
      <button class="primary" id="typeGo" aria-label="Prüfen">OK</button>
    </div>
    <button class="mic primary" id="micBtn">${micIcon()}<span>${esc(label)}</span></button>
    <button class="link" id="toggleType">${SR ? "⌨︎ Lieber tippen" : ""}</button>`;
  const live = $("#live", host), mic = $("#micBtn", host), tw = $("#typeWrap", host), tin = $("#typeIn", host), tog = $("#toggleType", host);
  const showTyping = (on) => {
    tw.hidden = !on; mic.hidden = on;
    tog.textContent = on ? (SR ? "🎤 Lieber sprechen" : "") : "⌨︎ Lieber tippen";
    if (on) setTimeout(() => tin.focus(), 50);
  };
  if (!SR || preferTyping) showTyping(true);
  tog.onclick = () => { preferTyping = tw.hidden; showTyping(preferTyping); };
  const submitTyped = () => { const v = tin.value.trim(); if (v) { tin.blur(); onResult([v]); } };
  $("#typeGo", host).onclick = submitTyped;
  tin.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); submitTyped(); } });
  mic.onclick = async () => {
    if (activeRec) { activeRec.stop(); return; }
    mic.classList.add("listening"); mic.querySelector("span").textContent = "Hört zu … (tippen = fertig)";
    live.textContent = "";
    try {
      const finals = await listen((t) => { live.textContent = t; });
      live.textContent = "";
      const c = candidates(finals);
      if (!c.length) live.textContent = "Nichts erkannt. Nochmal versuchen.";
      else onResult(c);
    } catch (e) {
      const msg = SR_ERRORS[e.message] ?? ("Spracherkennung: " + e.message);
      live.textContent = msg;
      if (e.message === "not-allowed" || e.message === "service-not-allowed") { preferTyping = true; showTyping(true); }
    } finally {
      mic.classList.remove("listening"); mic.querySelector("span").textContent = label;
    }
  };
}
const micIcon = () => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>`;

/* =========================================================
   Trainings-Runde (Session)
   ========================================================= */
let S = null; // laufende Runde

function pickShadow(n, exclude = []) {
  const ex = new Set(exclude.map((x) => x.id));
  const seen = SENT_ITEMS.filter((i) => state.items[i.id] && !ex.has(i.id));
  const pool = seen.length >= n ? seen : SENT_ITEMS.filter((i) => !ex.has(i.id));
  return shuffle(pool).slice(0, n);
}
function pickFrom(pool, n, newMax) {
  const t = today();
  const due = shuffle(pool.filter((i) => state.items[i.id] && state.items[i.id].due <= t))
    .sort((a, b) => state.items[a.id].due.localeCompare(state.items[b.id].due));
  const out = due.slice(0, n);
  const fresh = pool.filter((i) => !state.items[i.id]);
  out.push(...fresh.slice(0, Math.min(newMax, n - out.length)));
  if (out.length < n) {
    const rest = shuffle(pool.filter((i) => !out.includes(i) && state.items[i.id])).sort((a, b) => state.items[a.id].box - state.items[b.id].box);
    out.push(...rest.slice(0, n - out.length));
  }
  return out;
}
function buildDaily(short) {
  const w = weekNo(), gi = grammarIndex(w);
  const steps = [];
  const tag = (t) => (s) => ({ ...s, tag: t });
  // 1. Aufwärmen: leicht einsteigen
  const warm = pickShadow(short ? 1 : 2);
  warm.forEach((it) => steps.push(tag("Aufwärmen")({ type: "shadow", item: it })));
  // 2. Eigene Fehler (fällig)
  const cards = shuffle(dueCards()).slice(0, short ? 3 : 8);
  // 3. Grammatik der Woche (+ fällige aus früheren Wochen)
  const thisWeek = GRAM_ITEMS.filter((i) => i.gi === gi);
  const earlier = GRAM_ITEMS.filter((i) => i.gi < gi);
  const gN = short ? 2 : 4;
  let gram = pickFrom(thisWeek, gN, gN);
  const earlierDue = earlier.filter((i) => state.items[i.id] && state.items[i.id].due <= today());
  gram = [...gram, ...shuffle(earlierDue).slice(0, short ? 0 : 2)];
  // 4. Job-Sätze übersetzen
  const tN = (short ? 2 : 5) + (cards.length < 3 && !short ? 2 : 0);
  const trans = pickFrom(SENT_ITEMS, tN, short ? 1 : 3);
  // Gemischt anordnen: Regel zuerst, dann Grammatik, Fehler und Sätze im Wechsel
  // Regel nur in den ersten beiden Runden der Woche zeigen (danach reicht der Tipp)
  if ((weekRec(w).ruleSeen || 0) < 2) steps.push(tag("Grammatik der Woche")({ type: "rule", gi, countSeen: true }));
  const mixed = interleave([
    gram.map((it) => ({ type: "translate", item: it, tag: "Grammatik" })),
    cards.map((c) => ({ type: "card", card: c, tag: "Deine Fehler" })),
    trans.map((it) => ({ type: "translate", item: it, tag: "Job-Englisch" })),
  ]);
  steps.push(...mixed);
  // 5. Nachsprechen
  if (!short) pickShadow(3, warm).forEach((it) => steps.push({ type: "shadow", item: it, tag: "Nachsprechen" }));
  return newSession(steps, short ? "short" : "full", true);
}
function interleave(lists) {
  const out = []; const ls = lists.map((l) => l.slice());
  while (ls.some((l) => l.length)) for (const l of ls) if (l.length) out.push(l.shift());
  return out;
}
function newSession(steps, mode, daily, title) {
  return { steps, i: 0, mode, daily, title: title || "", results: [], newlyMastered: 0, finale: false, phase: "ask", last: null };
}
function startSession(sess) {
  if (!sess.steps.length) { toast("Gerade nichts zu üben"); return; }
  S = sess; location.hash = "runde"; render();
}

function stepTarget(step) { return step.type === "card" ? [step.card.right] : allAlts(step.item.en); }
function stepShown(step) { return step.type === "card" ? step.card.right : firstAlt(step.item.en); }

function renderSession() {
  if (!S) { location.hash = "heute"; return; }
  if (S.i >= S.steps.length) {
    if (!S.finale) { addFinale(); }
    if (S.i >= S.steps.length) return renderSessionEnd();
  }
  const step = S.steps[S.i];
  const pct = Math.round((S.i / S.steps.length) * 100);
  view.innerHTML = `
    <div class="session">
      <div class="s-top">
        <button class="icon-btn" id="quit" aria-label="Runde beenden">✕</button>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <span class="s-count">${S.i + 1}/${S.steps.length}</span>
      </div>
      <div class="s-tag">${esc(step.tag || "")}${step.retry ? " · nochmal" : ""}</div>
      <div class="s-body" id="sBody"></div>
      <div class="s-actions" id="sActions"></div>
    </div>`;
  $("#quit").onclick = () => {
    if (S.results.length && !confirm("Runde beenden? Was du schon geübt hast, ist gespeichert.")) return;
    stopListening(); S = null; location.hash = "heute";
  };
  ({ rule: stepRule, shadow: stepShadow, translate: stepAsk, card: stepAsk })[step.type](step);
}

function stepRule(step) {
  const g = GRAMMAR[step.gi];
  $("#sBody").innerHTML = `
    <div class="s-kicker">Woche ${step.gi + 1}</div>
    <h2 class="s-title">${esc(g.title)}</h2>
    <p class="rule">${esc(g.rule)}</p>
    ${g.examples.map(([en, note]) => `<div class="example"><button class="icon-btn play" data-say="${esc(en)}" aria-label="Anhören">▶</button><div><b>${esc(en)}</b><span>${esc(note)}</span></div></div>`).join("")}`;
  $("#sActions").innerHTML = `<button class="primary big" id="primaryAction">Verstanden, los</button>`;
  view.querySelectorAll("[data-say]").forEach((b) => (b.onclick = () => speak(b.dataset.say)));
  $("#primaryAction").onclick = () => {
    if (step.countSeen) { const wr = weekRec(weekNo()); wr.ruleSeen = (wr.ruleSeen || 0) + 1; save(); }
    S.i++; render();
  };
}

function stepShadow(step) {
  const en = firstAlt(step.item.en);
  $("#sBody").innerHTML = `
    <div class="s-kicker">Anhören und genauso nachsprechen</div>
    <div class="s-sentence">${esc(en)}</div>
    <div class="s-de">${esc(step.item.de)}</div>
    <div class="row center" style="margin-top:14px">
      <button id="play">▶ Anhören</button><button id="slow">🐢 Langsam</button>
    </div>
    <div id="res"></div>`;
  $("#play").onclick = () => speak(en);
  $("#slow").onclick = () => speak(en, 0.7);
  speak(en);
  const act = $("#sActions");
  const ask = () => answerInput(act, {
    label: "Nachsprechen",
    onResult: (c) => {
      const r = bestCompare([en], c);
      if (!step.counted) { step.counted = true; logResult(step, r.score >= 80, true, r.score); }
      $("#res").innerHTML = resultHTML(r);
      act.innerHTML = `<div class="row two"><button id="again">Nochmal</button><button class="primary" id="primaryAction">Weiter</button></div>`;
      $("#again").onclick = () => { $("#res").innerHTML = ""; speak(en); ask(); };
      $("#primaryAction").onclick = () => { S.i++; render(); };
    },
  });
  ask();
}

function stepAsk(step) {
  const isCard = step.type === "card";
  const targets = stepTarget(step), shown = stepShown(step);
  $("#sBody").innerHTML = isCard
    ? `<div class="s-kicker">Dieser Satz ist falsch. Sag ihn richtig.</div>
       <div class="s-wrong">${esc(step.card.wrong)}</div>
       <div id="sol"></div><div id="res"></div>`
    : `<div class="s-kicker">Sag es auf Englisch</div>
       <div class="s-sentence de">${esc(step.item.de)}</div>
       ${step.item.hint ? `<button class="hint" id="hintBtn">💡 Tipp</button>` : ""}
       <div id="sol"></div><div id="res"></div>`;
  const hb = $("#hintBtn");
  if (hb) hb.onclick = () => { hb.outerHTML = `<div class="hint-text">💡 ${esc(step.item.hint)}</div>`; };
  const act = $("#sActions");
  const reveal = (r) => {
    stopListening();
    const suggestRight = !!(r && r.score >= 85);
    if (r) $("#res").innerHTML = resultHTML(r);
    $("#sol").innerHTML = `
      <div class="solution">
        <div class="row"><b class="s-answer">${esc(shown)}</b><button class="icon-btn play" id="playSol" aria-label="Anhören">▶</button></div>
        ${isCard && step.card.why ? `<div class="s-why">${esc(step.card.why)}</div>` : ""}
        ${!isCard && step.item.kind === "grammar" ? `<div class="s-why">${esc(GRAMMAR[step.item.gi].title)}${step.item.hint ? " · " + esc(step.item.hint) : ""}</div>` : ""}
        ${!isCard && targets.length > 1 ? `<div class="s-why">Auch richtig: ${targets.slice(1).map(esc).join(" · ")}</div>` : ""}
      </div>`;
    $("#playSol").onclick = () => speak(shown);
    speak(shown);
    act.innerHTML = `
      ${r && r.score < 85 && !isCard ? `<button class="link" id="toCard">Als Fehler ins Fehlerheft</button>` : ""}
      <div class="row two">
        <button class="${suggestRight ? "" : "primary"}" id="wrongBtn" ${suggestRight ? "" : "data-primary"}>Nicht gewusst</button>
        <button class="${suggestRight ? "primary" : ""}" id="rightBtn" ${suggestRight ? "data-primary" : ""}>Gewusst</button>
      </div>
      <p class="muted tiny center">${r ? "Die Erkennung kann sich irren. Du entscheidest." : "Ehrlich sein lohnt sich: Nicht Gewusstes kommt öfter dran."}</p>`;
    $("#rightBtn").onclick = () => grade(step, true, r);
    $("#wrongBtn").onclick = () => grade(step, false, r);
    const tc = $("#toCard");
    if (tc) tc.onclick = () => {
      state.cards.push(newCard(r.spoken, shown, "Übersetzung von: " + step.item.de, "übersetzen")); save();
      tc.disabled = true; tc.textContent = "✓ Im Fehlerheft";
    };
  };
  answerInput(act, { label: isCard ? "Richtig sagen" : "Auf Englisch sagen", onResult: (c) => reveal(bestCompare(targets, c)) });
  const skip = document.createElement("button");
  skip.className = "link"; skip.textContent = "Weiß ich nicht – Lösung zeigen"; skip.id = "skipBtn";
  skip.onclick = () => reveal(null);
  act.appendChild(skip);
}

function grade(step, correct, r) {
  const first = !step.retry;
  if (first) {
    let rec;
    if (step.type === "card") rec = step.card; else { rec = itemRec(step.item.id); rec.seen++; if (correct) rec.right++; }
    const before = rec.box || 0;
    if (correct) { rec.box = Math.min(before + 1, INTERVALS.length - 1); rec.due = addDays(today(), INTERVALS[rec.box]); }
    else { rec.box = 1; rec.due = addDays(today(), 1); }
    rec.last = today();
    if (before < MASTERED && rec.box >= MASTERED) S.newlyMastered++;
  }
  logResult(step, correct, first, r ? r.score : null);
  // Falsch: einige Übungen später nochmal (höchstens zweimal)
  if (!correct && (step.retry || 0) < 2) {
    const again = { ...step, retry: (step.retry || 0) + 1 };
    const pos = Math.min(S.i + 4, S.steps.length);
    S.steps.splice(pos, 0, again);
  }
  S.i++; save(); render();
}
function logResult(step, correct, first, score) {
  const d = dayRec();
  d.practiced++;
  if (correct) d.correct++;
  if (first && correct) d.firstTry++;
  S.results.push({ type: step.type, correct, first, score, step });
  save();
}
function addFinale() {
  S.finale = true;
  const good = S.results.filter((r) => r.correct && r.first && r.step.item && r.step.type === "translate");
  const item = good.length ? good[Math.floor(Math.random() * good.length)].step.item
    : SENT_ITEMS.slice().sort((a, b) => firstAlt(a.en).length - firstAlt(b.en).length)[Math.floor(Math.random() * 8)];
  S.steps.push({ type: "shadow", item, tag: "Zum Abschluss: einmal flüssig" });
}
function renderSessionEnd() {
  const spoken = S.results.length;
  const firsts = S.results.filter((r) => r.first && r.type !== "shadow");
  const firstRight = firsts.filter((r) => r.correct).length;
  const wasDone = dayDone(today());
  if (S.daily || spoken >= 8) { const d = dayRec(); d.done = true; if (S.mode === "short") d.short = true; }
  save();
  const st = streakInfo();
  const tomorrow = addDays(today(), 1);
  const dueTomorrow = state.cards.filter((c) => c.due <= tomorrow).length + Object.values(state.items).filter((r) => r.due <= tomorrow).length;
  view.innerHTML = `
    <div class="session end">
      <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <div class="end-emoji">🎉</div>
      <h1 class="end-title">Runde geschafft</h1>
      <p class="muted center">${!wasDone && dayDone(today()) ? `Tag ${st.n} deiner Serie.` : "Extra-Runde. Stark."}</p>
      <div class="end-stats">
        <div class="stat"><b>${spoken}</b><span>Sätze gesprochen</span></div>
        <div class="stat"><b>${firsts.length ? firstRight + "/" + firsts.length : "–"}</b><span>beim 1. Versuch</span></div>
        <div class="stat"><b>${S.newlyMastered}</b><span>neu „sitzt“</span></div>
      </div>
      <p class="muted small center">Morgen warten ${dueTomorrow} Wiederholungen. ${firstRight < firsts.length ? "Was heute nicht saß, kommt morgen wieder." : ""}</p>
      ${S.daily ? tutorCard() : ""}
      <button class="primary big" id="primaryAction">Fertig</button>
    </div>`;
  bindTutorCard();
  $("#primaryAction").onclick = () => { S = null; location.hash = "heute"; };
}

/* =========================================================
   Bausteine für Startseite
   ========================================================= */
function tutorCard() {
  const d = dayRec();
  return `<section class="card tutor">
    <h2>Tutor-Gespräch <span class="pill">15 Min · freies Sprechen</span></h2>
    <div class="topic">${esc(topicToday())}</div>
    <div class="row">
      <button class="primary" id="copyPrompt">Prompt kopieren</button>
      <button id="nextTopic">Anderes Thema</button>
    </div>
    <ol class="steps small">
      <li>Prompt kopieren, Claude- oder ChatGPT-App öffnen, einfügen</li>
      <li>Sprachmodus starten und reden</li>
      <li>„end session“ sagen, Fehlerliste kopieren, im <a href="#fehler">Fehlerheft</a> importieren</li>
    </ol>
    <label class="check"><input type="checkbox" id="tutorDone" ${d.tutor ? "checked" : ""}> Heute erledigt</label>
  </section>`;
}
function bindTutorCard() {
  const cp = $("#copyPrompt"); if (!cp) return;
  cp.onclick = async () => toast((await copyText(TUTOR_PROMPT(topicToday(), state.settings))) ? "Prompt kopiert" : "Kopieren fehlgeschlagen");
  $("#nextTopic").onclick = () => { state.topicOffset = { [today()]: (state.topicOffset[today()] || 0) + 1 }; save(); $(".tutor .topic").textContent = topicToday(); };
  $("#tutorDone").onchange = (e) => { dayRec().tutor = e.target.checked; save(); };
}

/* =========================================================
   Ansicht: Einführung (erster Start)
   ========================================================= */
let obStep = 0;
function renderOnboarding() {
  document.body.classList.add("focus");
  const s = state.settings;
  const cues = ["nach dem Frühstück", "in der Bahn", "in der Mittagspause", "nach Feierabend"];
  const pages = [
    () => `
      <div class="ob-emoji">🗣️</div>
      <h1>15 Minuten am Tag.<br>Vor allem: sprechen.</h1>
      <p>Du sagst jeden Satz zuerst selbst, dann siehst du die Lösung. Was nicht sitzt, kommt wieder, bis es sitzt. Deine eigenen Fehler werden zu Übungen.</p>
      <label class="field">Arbeitgeber (optional)<input type="text" id="obCompany" value="${esc(s.company)}" placeholder="z. B. Name der Firma"></label>
      <label class="field">Deine Rolle (optional)<input type="text" id="obRole" value="${esc(s.role)}" placeholder="z. B. Marketing Manager"></label>
      <p class="muted tiny">Bleibt nur auf diesem Gerät. Wird für den Tutor-Prompt verwendet.</p>`,
    () => `
      <div class="ob-emoji">⏰</div>
      <h1>Wann übst du?</h1>
      <p>Wer vorher festlegt, wann und wo, hält deutlich öfter durch. Such dir etwas aus, das du sowieso jeden Tag machst.</p>
      <div class="chips">${cues.map((c) => `<button class="chip ${s.cue === c ? "on" : ""}" data-cue="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <label class="field">Oder eigenes<input type="text" id="obCue" value="${esc(cues.includes(s.cue) ? "" : s.cue)}" placeholder="z. B. nach dem Zähneputzen"></label>
      <label class="field">Uhrzeit für die Erinnerung<input type="time" id="obTime" value="${esc(s.time)}"></label>
      <button id="obIcs">📅 Tägliche Erinnerung in den Kalender</button>`,
    () => `
      <div class="ob-emoji">🎤</div>
      <h1>Mikrofon testen</h1>
      <p>Tippe auf den Knopf und sag: <b>„Hello, nice to meet you.“</b></p>
      <div id="obTest"></div>
      <div id="obRes"></div>
      ${isIOS ? `<p class="muted tiny">Falls es nicht klappt: Auf dem iPhone muss die Diktierfunktion an sein (Einstellungen → Allgemein → Tastatur). Tippen geht immer, auch per Diktier-Taste der Tastatur.</p>` : ""}`,
  ];
  view.innerHTML = `
    <div class="onboarding">
      <div class="dots">${pages.map((_, i) => `<i class="${i === obStep ? "on" : ""}"></i>`).join("")}</div>
      <div class="ob-body">${pages[obStep]()}</div>
      <div class="ob-actions">
        ${obStep > 0 ? `<button id="obBack">Zurück</button>` : `<button class="link" id="obSkip">Überspringen</button>`}
        <button class="primary" id="primaryAction">${obStep < pages.length - 1 ? "Weiter" : "Los geht's"}</button>
      </div>
    </div>`;
  const persist = () => {
    if ($("#obCompany")) { s.company = $("#obCompany").value.trim(); s.role = $("#obRole").value.trim(); }
    if ($("#obTime")) { const own = $("#obCue").value.trim(); if (own) s.cue = own; s.time = $("#obTime").value || s.time; }
    save();
  };
  view.querySelectorAll("[data-cue]").forEach((b) => (b.onclick = () => { s.cue = b.dataset.cue; $("#obCue").value = ""; save(); view.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b)); }));
  const ics = $("#obIcs"); if (ics) ics.onclick = () => { persist(); downloadICS(); };
  if (obStep === 2) answerInput($("#obTest"), { label: "Test starten", onResult: (c) => {
    const r = bestCompare(["Hello, nice to meet you."], c);
    $("#obRes").innerHTML = resultHTML(r) + `<p class="small center">${r.score >= 70 ? "Klappt. 👍" : "Erkannt wurde etwas. Für den Anfang reicht das."}</p>`;
  } });
  const finish = () => { persist(); state.onboarded = true; save(); document.body.classList.remove("focus"); location.hash = "heute"; render(); };
  const sk = $("#obSkip"); if (sk) sk.onclick = finish;
  const bk = $("#obBack"); if (bk) bk.onclick = () => { persist(); obStep--; render(); };
  $("#primaryAction").onclick = () => { persist(); if (obStep < pages.length - 1) { obStep++; render(); } else finish(); };
}
function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }
function downloadICS() {
  const s = state.settings;
  const [h, m] = (s.time || "08:00").split(":");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const desc = (s.cue ? `Dein Moment: ${s.cue}. ` : "") + appUrl();
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//English Daily//DE", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${uid()}@english-daily`, `DTSTAMP:${stamp}`,
    `DTSTART:${today().replace(/-/g, "")}T${h}${m}00`, "DURATION:PT15M", "RRULE:FREQ=DAILY",
    `SUMMARY:${icsEsc("English Daily: 15 Min sprechen")}`, `DESCRIPTION:${icsEsc(desc)}`, `URL:${appUrl()}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc("English Daily")}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  downloadBlob(new Blob([ics], { type: "text/calendar" }), "english-daily.ics");
}

/* =========================================================
   Ansicht: Heute
   ========================================================= */
function renderHeute() {
  const w = weekNo(), p = phaseFor(w), d = dayRec(), wr = weekRec(w);
  const st = streakInfo(), potential = streakInfo(true);
  const yesterdayMissed = !dayDone(addDays(today(), -1)) && st.n === 0 && potential.n > 1;
  const due = dueCards().length + Object.values(state.items).filter((r) => r.due <= today()).length;
  const m = masteredCount();
  const hour = new Date().getHours();
  const hello = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";
  const g = GRAMMAR[grammarIndex(w)];
  const showInstall = isIOS && !isStandalone && !state.hideInstallHint;

  view.innerHTML = `
    ${showInstall ? `<section class="card install">
      <b>Als App auf den Home-Bildschirm</b>
      <p class="small">In Safari unten auf <b>Teilen</b> <span class="share-ico">⬆︎</span> tippen, dann <b>„Zum Home-Bildschirm“</b>. Dann startet sie wie eine App, und deine Daten bleiben zuverlässiger gespeichert.</p>
      <button class="link" id="hideInstall">Ausblenden</button>
    </section>` : ""}

    <section class="hero ${d.done ? "done" : ""}">
      <div class="hello">${hello}${state.settings.cue && !d.done ? ` · <span>Dein Moment: ${esc(state.settings.cue)}</span>` : ""}</div>
      ${d.done ? `
        <h1>Heute geschafft ✓</h1>
        <p>${d.practiced} Sätze gesprochen. Morgen geht's weiter.</p>
        <div class="row"><button id="extra">Extra-Runde</button></div>`
      : `
        <h1>Dein Training</h1>
        <p>ca. 15 Minuten · ${due ? `${due} Wiederholungen fällig` : "neue Sätze und Grammatik"}</p>
        <button class="primary big" id="startFull">${micIcon()} Training starten</button>
        <button class="link light" id="startShort">Wenig Zeit? Kurz-Training (5 Min)</button>`}
    </section>

    ${yesterdayMissed ? `<div class="notice">Gestern ausgelassen. Kein Problem: Wenn du heute übst, rettet der Joker deine Serie von ${potential.n - 1} Tagen.</div>` : ""}

    <section class="card stats-row">
      <div class="stat"><b>🔥 ${st.n}</b><span>Tage in Folge</span></div>
      <div class="stat"><b>${m.total}</b><span>Sätze sitzen</span></div>
      <div class="stat"><b>${st.jokerThisWeek ? "0" : "1"}</b><span>Joker diese Woche</span></div>
    </section>

    ${tutorCard()}

    <section class="card">
      <h2>Woche ${Math.min(w, 12)} von 12 · ${esc(p.name)}</h2>
      <div class="progress">${Array.from({ length: 12 }, (_, i) => `<i class="${i + 1 < w ? "done" : i + 1 === w ? "now" : ""}"></i>`).join("")}</div>
      <p class="small" style="margin:0 0 6px"><b>Grammatik:</b> ${esc(g.title)}</p>
      <p class="muted small" style="margin:0">Ziel: ${esc(p.goal)}</p>
      ${MILESTONES[w] ? `<div class="notice" style="margin:12px 0 0">${esc(MILESTONES[w])}</div>` : ""}
    </section>

    <section class="card">
      <h2>Diese Woche</h2>
      <ul class="checklist">
        <li class="${wr.check ? "done" : ""}">
          <span class="ck">${wr.check ? "✓" : ""}</span>
          <div class="label"><b>Wochen-Check</b><span>1 Minute aufnehmen + kurz einschätzen. So hörst du deinen Fortschritt.</span></div>
          ${wr.check ? "" : `<button id="goCheck">Los</button>`}
        </li>
        <li class="${wr.human ? "done" : ""}">
          <input type="checkbox" id="human" ${wr.human ? "checked" : ""} aria-label="Gespräch mit echtem Menschen">
          <div class="label"><b>Mit einem echten Menschen sprechen</b><span>Tandem-App (Tandem, HelloTalk) oder English-Meetup, 30–60 Min</span></div>
        </li>
      </ul>
    </section>`;

  const sf = $("#startFull"); if (sf) sf.onclick = () => startSession(buildDaily(false));
  const ss = $("#startShort"); if (ss) ss.onclick = () => startSession(buildDaily(true));
  const ex = $("#extra"); if (ex) ex.onclick = () => startSession(buildDaily(false));
  const hi = $("#hideInstall"); if (hi) hi.onclick = () => { state.hideInstallHint = true; save(); render(); };
  const gc = $("#goCheck"); if (gc) gc.onclick = () => { location.hash = "check"; };
  $("#human").onchange = (e) => { weekRec(w).human = e.target.checked; save(); render(); };
  bindTutorCard();
}

/* =========================================================
   Ansicht: Wochen-Check (Aufnahme + Selbsteinschätzung)
   ========================================================= */
let recorder = null, recBlob = null, recTimer = null;
function renderCheck() {
  document.body.classList.add("focus");
  const w = weekNo();
  const conf = state.confidence[w] || 0;
  view.innerHTML = `
    <div class="session">
      <div class="s-top"><button class="icon-btn" id="quit" aria-label="Schließen">✕</button><div class="s-tag" style="margin:0">Wochen-Check · Woche ${w}</div></div>
      <div class="s-body">
        <div class="s-kicker">1. Sprich eine Minute frei</div>
        <div class="s-sentence" style="font-size:20px">${esc(RECORDING_PROMPT)}</div>
        <p class="muted small">Jede Woche dieselbe Aufgabe. So kannst du später Woche 1 mit heute vergleichen.</p>
        <div class="rec-box">
          <div class="rec-time" id="recTime">0:00</div>
          <button class="mic primary" id="recBtn">${micIcon()}<span>Aufnahme starten</span></button>
          <audio id="recAudio" controls hidden></audio>
        </div>
        <div class="s-kicker" style="margin-top:22px">2. Wie sicher fühlst du dich gerade beim Englischsprechen?</div>
        <div class="scale">${[1, 2, 3, 4, 5].map((n) => `<button class="${conf === n ? "on" : ""}" data-conf="${n}">${n}</button>`).join("")}</div>
        <div class="scale-l muted tiny"><span>sehr unsicher</span><span>sehr sicher</span></div>
      </div>
      <div class="s-actions"><button class="primary big" id="primaryAction">Speichern</button></div>
    </div>`;
  let chosen = conf;
  view.querySelectorAll("[data-conf]").forEach((b) => (b.onclick = () => { chosen = +b.dataset.conf; view.querySelectorAll("[data-conf]").forEach((x) => x.classList.toggle("on", x === b)); }));
  const btn = $("#recBtn"), time = $("#recTime"), audio = $("#recAudio");
  btn.onclick = async () => {
    if (recorder) {
      clearInterval(recTimer);
      recBlob = await recorder.stop(); recorder = null;
      btn.classList.remove("listening"); btn.querySelector("span").textContent = "Neu aufnehmen";
      audio.src = URL.createObjectURL(recBlob); audio.hidden = false;
      return;
    }
    try {
      recorder = await startRecorder(); recBlob = null; audio.hidden = true;
      const t0 = Date.now();
      btn.classList.add("listening"); btn.querySelector("span").textContent = "Stopp";
      recTimer = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        time.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        if (s >= 180) btn.click();
      }, 250);
    } catch (e) { toast("Mikrofon nicht verfügbar"); recorder = null; }
  };
  const close = () => { if (recorder) { recorder.cancel(); recorder = null; } clearInterval(recTimer); location.hash = "heute"; };
  $("#quit").onclick = close;
  $("#primaryAction").onclick = async () => {
    if (recorder) { toast("Erst die Aufnahme stoppen"); return; }
    if (!recBlob && !chosen) { toast("Nimm etwas auf oder wähle eine Zahl"); return; }
    if (recBlob) { try { await idb.put({ id: uid(), week: w, date: today(), blob: recBlob, type: recBlob.type }); } catch (e) { toast("Aufnahme konnte nicht gespeichert werden"); return; } }
    if (chosen) state.confidence[w] = chosen;
    weekRec(w).check = true; save(); recBlob = null;
    toast("Gespeichert"); location.hash = "heute";
  };
}

/* =========================================================
   Ansicht: Üben (freie Auswahl)
   ========================================================= */
function renderUeben() {
  const cats = Object.keys(SENTENCES);
  const gi = grammarIndex(weekNo());
  view.innerHTML = `
    <h1 class="page-title">Frei üben</h1>
    <p class="muted small" style="margin-top:-6px">Runden mit 10 Sätzen. Zählt auch für deine Serie.</p>
    <section class="card">
      <h2>🎧 Nachsprechen</h2>
      <p class="small muted">Aussprache und Satzmelodie. Hören, nachsprechen, vergleichen.</p>
      <div class="row"><select id="shCat"><option value="">Alle Themen</option>${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select><button class="primary" id="goShadow">Start</button></div>
    </section>
    <section class="card">
      <h2>🗣️ Übersetzen</h2>
      <p class="small muted">Deutscher Satz, du sagst ihn auf Englisch. Die wichtigste Übung.</p>
      <div class="row"><select id="trCat"><option value="">Alle Themen</option>${cats.map((c) => `<option>${esc(c)}</option>`).join("")}</select><button class="primary" id="goTrans">Start</button></div>
    </section>
    <section class="card">
      <h2>🧩 Grammatik</h2>
      <p class="small muted">Eine Regel, acht Sätze. Diese Woche dran: ${esc(GRAMMAR[gi].title)}.</p>
      <div class="row"><select id="grCat">${GRAMMAR.map((g, i) => `<option value="${i}" ${i === gi ? "selected" : ""}>${i + 1}. ${esc(g.title)}</option>`).join("")}</select><button class="primary" id="goGram">Start</button></div>
    </section>`;
  const pool = (cat) => (cat ? SENT_ITEMS.filter((i) => i.cat === cat) : SENT_ITEMS);
  $("#goShadow").onclick = () => startSession(newSession(shuffle(pool($("#shCat").value)).slice(0, 10).map((it) => ({ type: "shadow", item: it, tag: "Nachsprechen" })), "free", false));
  $("#goTrans").onclick = () => startSession(newSession(pickFrom(pool($("#trCat").value), 10, 6).map((it) => ({ type: "translate", item: it, tag: "Übersetzen" })), "free", false));
  $("#goGram").onclick = () => {
    const g = +$("#grCat").value;
    const items = shuffle(GRAM_ITEMS.filter((i) => i.gi === g));
    startSession(newSession([{ type: "rule", gi: g, tag: "Regel" }, ...items.map((it) => ({ type: "translate", item: it, tag: "Grammatik" }))], "free", false));
  };
}

/* =========================================================
   Ansicht: Fehlerheft
   ========================================================= */
const fh = { editId: null, search: "", importText: "" };
function renderFehler() {
  const due = dueCards();
  const editing = fh.editId ? state.cards.find((c) => c.id === fh.editId) : null;
  view.innerHTML = `
    <h1 class="page-title">Fehlerheft</h1>
    <section class="card">
      <div class="stats-row inner">
        <div class="stat"><b>${due.length}</b><span>fällig</span></div>
        <div class="stat"><b>${state.cards.filter((c) => c.box >= MASTERED).length}</b><span>sitzen</span></div>
        <div class="stat"><b>${state.cards.length}</b><span>gesamt</span></div>
      </div>
      <button class="primary big" id="drill" ${state.cards.length ? "" : "disabled"}>${due.length ? `${due.length} fällige Fehler üben` : "Alle Fehler üben (Extra)"}</button>
    </section>

    <section class="card">
      <h2>Aus dem Tutor-Gespräch importieren</h2>
      <p class="muted small" style="margin-top:0">Liste nach „end session“ einfügen. Pro Zeile: <b>Falsch → Richtig — Erklärung</b></p>
      <textarea id="importText" placeholder="I work here since 2020. → I have been working here since 2020. — Dauer bis jetzt">${esc(fh.importText)}</textarea>
      <div class="row" style="margin-top:8px"><button id="pasteBtn">Einfügen</button><button class="primary" id="parseBtn">Prüfen</button></div>
      <div id="preview" class="preview"></div>
    </section>

    <section class="card">
      <h2>${editing ? "Karte bearbeiten" : "Fehler selbst eintragen"}</h2>
      <label class="field">Falsch<input type="text" id="fWrong" value="${esc(editing ? editing.wrong : "")}"></label>
      <label class="field">Richtig<input type="text" id="fRight" value="${esc(editing ? editing.right : "")}"></label>
      <label class="field">Warum (optional)<input type="text" id="fWhy" value="${esc(editing ? editing.why : "")}"></label>
      <div class="row"><button class="primary" id="saveCard">${editing ? "Speichern" : "Hinzufügen"}</button>${editing ? `<button id="cancelEdit">Abbrechen</button>` : ""}</div>
    </section>

    <section class="card">
      <h2>Alle Karten</h2>
      <input type="text" id="search" placeholder="Suchen …" value="${esc(fh.search)}">
      <ul class="cardlist" id="cardlist"></ul>
    </section>`;

  $("#drill").onclick = () => {
    const list = due.length ? shuffle(due).slice(0, 20) : shuffle(state.cards).slice(0, 10);
    startSession(newSession(list.map((c) => ({ type: "card", card: c, tag: "Deine Fehler" })), "free", false));
  };
  $("#pasteBtn").onclick = async () => {
    try { const t = await navigator.clipboard.readText(); $("#importText").value = t; fh.importText = t; $("#parseBtn").click(); }
    catch (e) { toast("Einfügen nicht erlaubt. Lang ins Feld tippen → Einfügen"); }
  };
  $("#parseBtn").onclick = () => {
    fh.importText = $("#importText").value;
    const items = parseImport(fh.importText);
    const box = $("#preview");
    if (!items.length) { box.innerHTML = `<p class="muted small">Keine Zeile mit „→“ gefunden.</p>`; return; }
    box.innerHTML = items.map((it, i) => `<label><input type="checkbox" data-i="${i}" checked><span><s class="muted">${esc(it.wrong)}</s> → <b>${esc(it.right)}</b>${it.why ? ` <span class="muted">— ${esc(it.why)}</span>` : ""}</span></label>`).join("")
      + `<div class="row" style="margin-top:10px"><button class="primary" id="doImport">Ausgewählte importieren</button></div>`;
    $("#doImport").onclick = () => {
      let added = 0;
      box.querySelectorAll("input[data-i]").forEach((el) => {
        if (!el.checked) return;
        const it = items[+el.dataset.i];
        if (state.cards.some((c) => c.wrong === it.wrong && c.right === it.right)) return;
        state.cards.push(newCard(it.wrong, it.right, it.why, "tutor")); added++;
      });
      fh.importText = "";
      if (added) dayRec().tutor = true;
      save(); toast(`${added} Fehler importiert`); render();
    };
  };
  $("#saveCard").onclick = () => {
    const w = $("#fWrong").value.trim(), r = $("#fRight").value.trim(), y = $("#fWhy").value.trim();
    if (!w || !r) { toast("Falsch und Richtig ausfüllen"); return; }
    if (editing) { Object.assign(editing, { wrong: w, right: r, why: y }); fh.editId = null; toast("Gespeichert"); }
    else { state.cards.push(newCard(w, r, y, "eigene")); toast("Hinzugefügt"); }
    save(); render();
  };
  if (editing) $("#cancelEdit").onclick = () => { fh.editId = null; render(); };
  const renderList = () => {
    const q = fh.search.toLowerCase();
    const list = state.cards.filter((c) => !q || (c.wrong + " " + c.right + " " + c.why).toLowerCase().includes(q)).slice().reverse();
    $("#cardlist").innerHTML = list.map((c) => `<li>
      <div class="txt"><div class="w">${esc(c.wrong)}</div><div class="r">${esc(c.right)}</div>${c.why ? `<div class="y">${esc(c.why)}</div>` : ""}
        <div class="y"><span class="boxes">${[1, 2, 3, 4, 5, 6].map((b) => `<i class="${c.box >= b ? "on" : ""}"></i>`).join("")}</span> ${c.box >= MASTERED ? "sitzt · " : ""}${c.due <= today() ? "heute fällig" : "wieder am " + esc(parseKey(c.due).toLocaleDateString("de-DE", { day: "numeric", month: "short" }))}</div></div>
      <div class="col"><button class="icon-btn" data-edit="${c.id}" aria-label="Bearbeiten">✎</button><button class="icon-btn" data-del="${c.id}" aria-label="Löschen">✕</button></div></li>`).join("")
      || `<li class="muted">Keine Karten gefunden.</li>`;
    $("#cardlist").querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      const c = state.cards.find((x) => x.id === b.dataset.del);
      if (!c || !confirm(`Karte löschen?\n\n${c.right}`)) return;
      state.cards = state.cards.filter((x) => x.id !== c.id); save(); render();
    }));
    $("#cardlist").querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { fh.editId = b.dataset.edit; render(); $("#fWrong").scrollIntoView({ behavior: "smooth", block: "center" }); }));
  };
  renderList();
  $("#search").oninput = (e) => { fh.search = e.target.value; renderList(); };
}
function parseImport(text) {
  const out = []; let lastWasCard = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/\*\*/g, "").replace(/^(\d+[.)]|[-*•])\s*/, "").trim();
    if (!line) { lastWasCard = false; continue; }
    const parts = line.split(/\s*(?:→|->|=>)\s*/);
    if (parts.length >= 2) {
      let wrong = parts[0], rest = parts.slice(1).join(" "), right = rest, why = "";
      const w = rest.split(/\s+[—–]\s+|\s+-\s+|\s*\|\s*/);
      if (w.length >= 2) { right = w[0]; why = w.slice(1).join(" – "); }
      wrong = clean(wrong.replace(/^(wrong|falsch|mistake|fehler)\s*:\s*/i, ""));
      right = clean(right.replace(/^(right|correct|richtig|korrekt)\s*:\s*/i, ""));
      if (wrong && right) { out.push({ wrong, right, why: why.trim() }); lastWasCard = true; }
    } else if (lastWasCard && !line.endsWith(":") && line.length < 160) {
      const prev = out[out.length - 1];
      prev.why = (prev.why ? prev.why + " " : "") + line.replace(/^[(（]|[)）]$/g, "");
      lastWasCard = false;
    } else lastWasCard = false;
  }
  return out;
}
function clean(s) { return s.trim().replace(/^["“„'‘]+|["”“'’]+$/g, "").trim(); }

/* =========================================================
   Ansicht: Fortschritt
   ========================================================= */
async function renderFortschritt() {
  const m = masteredCount();
  const st = streakInfo();
  const sentM = SENT_ITEMS.filter((i) => (state.items[i.id]?.box || 0) >= MASTERED).length;
  const gramM = GRAM_ITEMS.filter((i) => (state.items[i.id]?.box || 0) >= MASTERED).length;
  const cardM = state.cards.filter((c) => c.box >= MASTERED).length;
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const maxP = Math.max(10, ...days.map((k) => state.days[k]?.practiced || 0));
  const weeks = Array.from({ length: Math.min(weekNo(), 12) }, (_, i) => i + 1);
  const bar = (label, n, of) => `<div class="mbar"><div class="row"><span>${esc(label)}</span><span class="spacer"></span><b>${n}</b><span class="muted">/ ${of}</span></div><div class="track"><i style="width:${of ? Math.round((100 * n) / of) : 0}%"></i></div></div>`;
  view.innerHTML = `
    <h1 class="page-title">Fortschritt</h1>
    <section class="card">
      <h2>Was sitzt</h2>
      <p class="muted small" style="margin-top:0">„Sitzt“ = dreimal mit Abstand richtig gesagt.</p>
      ${bar("Job-Sätze", sentM, SENT_ITEMS.length)}
      ${bar("Grammatik", gramM, GRAM_ITEMS.length)}
      ${bar("Deine Fehler", cardM, state.cards.length)}
    </section>
    <section class="card">
      <h2>Letzte 14 Tage</h2>
      <div class="chart">${days.map((k) => { const p = state.days[k]?.practiced || 0; const done = state.days[k]?.done; return `<div class="col" title="${k}: ${p}"><i class="${done ? "done" : ""}" style="height:${Math.round((100 * p) / maxP)}%"></i><span>${parseKey(k).getDate()}</span></div>`; }).join("")}</div>
      <p class="muted small" style="margin-bottom:0">Gesprochene Sätze pro Tag · Serie: ${st.n} ${st.n === 1 ? "Tag" : "Tage"}</p>
    </section>
    <section class="card">
      <h2>Wie sicher fühlst du dich?</h2>
      ${Object.keys(state.confidence).length
        ? `<div class="chart conf">${weeks.map((w) => { const c = state.confidence[w] || 0; return `<div class="col"><i class="done" style="height:${c * 20}%"></i><span>W${w}</span></div>`; }).join("")}</div>`
        : `<p class="muted small">Noch keine Einschätzung. Kommt mit dem Wochen-Check.</p>`}
    </section>
    <section class="card">
      <h2>Deine Aufnahmen</h2>
      <div id="recs" class="muted small">Lädt …</div>
    </section>
    <section class="card">
      <h2>Warum ist die App so aufgebaut?</h2>
      ${WHY.map(([t, d]) => `<details><summary>${esc(t)}</summary><p class="small">${esc(d)}</p></details>`).join("")}
    </section>
    <p class="center"><a href="#einstellungen" class="btn">⚙︎ Einstellungen</a></p>`;
  try {
    const recs = (await idb.all()).sort((a, b) => a.date.localeCompare(b.date));
    const box = $("#recs"); if (!box) return;
    if (!recs.length) { box.textContent = "Noch keine. Der Wochen-Check auf der Startseite nimmt eine Minute auf."; return; }
    box.classList.remove("muted", "small");
    box.innerHTML = recs.map((r) => `<div class="rec-item"><div><b>Woche ${r.week}</b> <span class="muted small">${esc(parseKey(r.date).toLocaleDateString("de-DE"))}</span></div><audio controls preload="none" data-id="${r.id}"></audio><button class="icon-btn" data-delrec="${r.id}" aria-label="Löschen">✕</button></div>`).join("")
      + (recs.length > 1 ? `<p class="muted small">Tipp: Hör dir die erste und die letzte direkt nacheinander an.</p>` : "");
    recs.forEach((r) => { const a = box.querySelector(`audio[data-id="${r.id}"]`); if (a) a.src = URL.createObjectURL(r.blob); });
    box.querySelectorAll("[data-delrec]").forEach((b) => (b.onclick = async () => { if (!confirm("Aufnahme löschen?")) return; await idb.del(b.dataset.delrec); render(); }));
  } catch (e) { const box = $("#recs"); if (box) box.textContent = "Aufnahmen konnten nicht geladen werden."; }
}

/* =========================================================
   Ansicht: Einstellungen
   ========================================================= */
function renderEinstellungen() {
  const s = state.settings, cur = pickVoice();
  view.innerHTML = `
    <h1 class="page-title">Einstellungen</h1>
    <section class="card">
      <h2>Stimme</h2>
      ${voices.length ? `
        <label class="field">Englische Stimme<select id="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${cur && v.voiceURI === cur.voiceURI ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}</select></label>
        <label class="field">Tempo: <b id="rateVal">${s.rate.toFixed(2)}</b><input type="range" id="rate" min="0.6" max="1.2" step="0.05" value="${s.rate}"></label>
        <button id="testVoice">▶ Testen</button>` : `<p class="muted">Keine englische Stimme gefunden.</p>`}
    </section>
    <section class="card">
      <h2>Spracherkennung</h2>
      <p style="margin-top:0">${SR ? "✓ Verfügbar." : "✗ In diesem Browser nicht verfügbar. Du kannst tippen oder die Diktier-Taste der Tastatur nutzen."}</p>
      <label class="field">Erkennen als<select id="recLang"><option value="en-US" ${s.recLang === "en-US" ? "selected" : ""}>Amerikanisches Englisch</option><option value="en-GB" ${s.recLang === "en-GB" ? "selected" : ""}>Britisches Englisch</option></select></label>
      <p class="muted small">Die Erkennung läuft über den Dienst des Browsers (Apple bzw. Google). Sie ist kein Grammatik-Prüfer und „verbessert“ manchmal, was du gesagt hast. Rote Wörter heißen oft: undeutlich ausgesprochen.</p>
    </section>
    <section class="card">
      <h2>Gewohnheit</h2>
      <label class="field">Wann übst du? („Wenn ich … “)<input type="text" id="cue" value="${esc(s.cue)}" placeholder="z. B. nach dem Frühstück"></label>
      <label class="field">Uhrzeit<input type="time" id="time" value="${esc(s.time)}"></label>
      <button id="ics">📅 Tägliche Erinnerung in den Kalender</button>
    </section>
    <section class="card">
      <h2>Für den Tutor-Prompt</h2>
      <label class="field">Arbeitgeber<input type="text" id="company" value="${esc(s.company)}"></label>
      <label class="field">Rolle<input type="text" id="role" value="${esc(s.role)}"></label>
      <p class="muted tiny">Bleibt nur auf diesem Gerät.</p>
    </section>
    <section class="card">
      <h2>Plan</h2>
      <label class="field">Startdatum (Woche 1)<input type="date" id="start" value="${esc(state.startDate)}"></label>
    </section>
    <section class="card">
      <h2>Sicherung</h2>
      <p class="muted small" style="margin-top:0">Alles liegt nur auf diesem Gerät. Ab und zu sichern (ohne Aufnahmen).</p>
      <div class="row">
        <button id="export">Sicherung speichern</button>
        <label class="btn">Sicherung laden<input type="file" id="importFile" accept="application/json,.json" hidden></label>
      </div>
      <div class="row" style="margin-top:14px"><button class="bad" id="reset">Alles zurücksetzen</button><button class="link" id="reOnboard">Einführung nochmal</button></div>
    </section>`;
  if (voices.length) {
    $("#voice").onchange = (e) => { s.voiceURI = e.target.value; save(); speak("Hello, this is my voice."); };
    $("#rate").oninput = (e) => { s.rate = +e.target.value; $("#rateVal").textContent = s.rate.toFixed(2); save(); };
    $("#testVoice").onclick = () => speak("I've been working in this field for about five years.");
  }
  const bind = (id, key) => ($("#" + id).onchange = (e) => { s[key] = e.target.value.trim(); save(); });
  bind("recLang", "recLang"); bind("cue", "cue"); bind("time", "time"); bind("company", "company"); bind("role", "role");
  $("#ics").onclick = downloadICS;
  $("#start").onchange = (e) => { if (e.target.value) { state.startDate = e.target.value; save(); toast("Startdatum gespeichert"); } };
  $("#export").onclick = () => downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), `english-daily-${today()}.json`);
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.cards)) throw new Error("kein Fehlerheft");
      if (!confirm(`Sicherung mit ${data.cards.length} Fehlerkarten laden? Der aktuelle Stand wird ersetzt.`)) return;
      state = merge(data); state.version = 2; save(); toast("Sicherung geladen"); render();
    } catch (err) { toast("Datei konnte nicht gelesen werden"); }
  };
  $("#reset").onclick = () => {
    if (!confirm("Wirklich alles löschen? Fortschritt und eigene Fehlerkarten sind danach weg.")) return;
    state = defaultState(); save(); obStep = 0; location.hash = "heute"; render();
  };
  $("#reOnboard").onclick = () => { state.onboarded = false; obStep = 0; save(); location.hash = "heute"; render(); };
}

/* =========================================================
   Router & Tastatur
   ========================================================= */
const ROUTES = {
  heute: renderHeute, ueben: renderUeben, fehler: renderFehler, fortschritt: renderFortschritt,
  einstellungen: renderEinstellungen, runde: renderSession, check: renderCheck,
};
function currentRoute() { const h = location.hash.slice(1); return ROUTES[h] ? h : "heute"; }
function render() {
  stopListening();
  let r = currentRoute();
  if (!state.onboarded && r !== "einstellungen") { renderOnboarding(); setNav(""); return; }
  if (r === "runde" && !S) { r = "heute"; history.replaceState(null, "", "#heute"); }
  const focus = r === "runde" || r === "check";
  document.body.classList.toggle("focus", focus);
  setNav(r);
  ROUTES[r]();
}
function setNav(r) {
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.tab === r || (r === "einstellungen" && a.dataset.tab === "fortschritt")));
}
window.addEventListener("hashchange", () => { if ("speechSynthesis" in window) speechSynthesis.cancel(); window.scrollTo(0, 0); render(); });
document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (["input", "textarea", "select"].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
  const click = (id) => { const el = document.getElementById(id); if (el && !el.disabled && !el.hidden) { e.preventDefault(); el.click(); return true; } return false; };
  if (e.key === " ") click("micBtn");
  if (e.key === "Enter" && !click("primaryAction")) { const p = document.querySelector("[data-primary]"); if (p) { e.preventDefault(); p.click(); } }
  if (e.key === "p" || e.key === "P") click("play");
});

// Offline-Unterstützung
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
booted = true;
render();
