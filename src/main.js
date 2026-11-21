import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';
import { LANGUAGES, TOPICS } from './data.js';
import { SPEAK_SAMPLE, buildSession, checkAnswer } from './practice.js';
import { getConfig, saveConfig, getData, saveData, resetData, registerDay, sendChat, testConnection, speakWithApi } from './api.js';

/* ---------------- helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

let toastTimer;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; $('#app').appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function mascotSVG() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Libi">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2FC4AC"/><stop offset="1" stop-color="#0F9D8C"/>
    </linearGradient></defs>
    <ellipse cx="50" cy="89" rx="26" ry="4" fill="rgba(0,0,0,.07)"/>
    <path d="M18 58 Q7 66 14 76 Q23 78 28 69Z" fill="#0B8B7C"/>
    <path d="M82 58 Q93 66 86 76 Q77 78 72 69Z" fill="#0B8B7C"/>
    <path d="M50 12 C72 12 84 30 84 54 C84 76 69 86 50 86 C31 86 16 76 16 54 C16 30 28 12 50 12Z" fill="url(#lg)"/>
    <path d="M43 14 Q41 3 50 1 Q55 9 58 14Z" fill="#F5A524"/>
    <ellipse cx="50" cy="66" rx="22" ry="16" fill="rgba(255,255,255,.15)"/>
    <circle cx="39" cy="46" r="11" fill="#fff"/><circle cx="61" cy="46" r="11" fill="#fff"/>
    <circle cx="40" cy="47" r="5" fill="#12303A"/><circle cx="60" cy="47" r="5" fill="#12303A"/>
    <circle cx="42" cy="45" r="1.8" fill="#fff"/><circle cx="62" cy="45" r="1.8" fill="#fff"/>
    <ellipse cx="28" cy="60" rx="5" ry="3" fill="#FF9E9E" opacity=".55"/>
    <ellipse cx="72" cy="60" rx="5" ry="3" fill="#FF9E9E" opacity=".55"/>
    <path class="beak" d="M44 58 L56 58 L50 67 Z" fill="#F5A524"/>
  </svg>`;
}

/* ---------------- state ---------------- */
const S = {
  screen: 'home',
  step: 0,
  cfg: getConfig(),
  data: getData(),
  topic: null,
  messages: [],
  typing: false,
  recording: false,
  awarded: false,
  provider: 'openai',
  practiceTopic: 'all',
  pz: {
    session: [], idx: 0, hearts: 3, correct: 0, selected: null,
    input: '', transcript: '', checked: false, ok: false, finished: false,
    start: 0, topic: null, earned: 0
  }
};

if (!S.cfg.onboarded && !getData().onboarded) S.screen = 'onboarding';
document.documentElement.dataset.theme = S.cfg.theme === 'dark' ? 'dark' : 'light';

function persistCfg(patch) { S.cfg = saveConfig(patch); }
function persistData(patch) { S.data = saveData(patch); }

/* ---------------- speech ---------------- */
async function ensureMic() {
  try {
    const p = Capacitor.Plugins?.Speech;
    if (p) {
      await p.requestPermissions();
      const state = await p.checkPermissions();
      if (state && state.microphone && state.microphone !== 'granted') {
        toast('Permissão de microfone negada.');
        return false;
      }
    }
  } catch (e) { console.warn('plugin mic', e); }
  return true;
}

function setTalking(on) {
  const m = $('.mascot');
  if (m) m.classList.toggle('talking', !!on);
}

function setRec(on) {
  S.recording = !!on;
  setTalking(on);
  const mic = $('#micBtn');
  if (mic) { mic.classList.toggle('rec', on); mic.textContent = on ? '⏹' : '🎤'; }
}

let cachedVoices = [];
function loadVoices() {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve([]);
    const now = window.speechSynthesis.getVoices() || [];
    if (now.length) { cachedVoices = now; return resolve(now); }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('voiceschanged', finish);
      cachedVoices = window.speechSynthesis.getVoices() || [];
      resolve(cachedVoices);
    };
    window.addEventListener('voiceschanged', finish);
    setTimeout(finish, 1800);
  });
}

/** Prefere vozes naturais/neurais em vez das sintéticas antigas. */
function pickVoice(voices, lang, uri) {
  if (uri) {
    const exact = voices.find(v => v.voiceURI === uri);
    if (exact) return exact;
  }
  const base = lang.slice(0, 2).toLowerCase();
  const list = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(base));
  if (!list.length) return null;
  const score = v => {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (/natural|neural|premium|online/.test(n)) s += 100;
    if (/google|aria|jenny|sonia|libby|amber|ava|emma/.test(n)) s += 55;
    if (v.localService === false) s += 20;
    if (/david|zira|hazel|mark|george|samantha/.test(n)) s -= 45;
    return s;
  };
  return list.sort((a, b) => score(b) - score(a))[0];
}

function cleanForSpeech(text) {
  return String(text || '')
    .replace(/[💡⚠️✨👏🎯🌱🚀🦜🎉👌📊]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function speak(text, btn) {
  const clean = cleanForSpeech(text);
  if (!clean) return;
  const onStart = () => { setTalking(true); if (btn) btn.textContent = '🔊'; };
  const onEnd = () => { setTalking(false); if (btn) btn.textContent = '🔈'; };
  window.speechSynthesis?.cancel();

  if (S.cfg.ttsMode === 'api' && S.cfg.apiKey) {
    onStart();
    const ok = await speakWithApi(clean, { onEnd });
    if (ok) return;
    onEnd();
    toast('Voz neural indisponível — usando a voz do aparelho.');
  }

  if (!('speechSynthesis' in window)) { toast('Síntese de voz indisponível neste dispositivo.'); return; }
  const voices = await loadVoices();
  const lang = S.cfg.lang === 'es' ? 'es-ES' : 'en-US';
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  u.rate = Number(S.cfg.voiceRate) || 0.95;
  u.pitch = Number(S.cfg.pitch) || 1.05;
  const v = pickVoice(voices, lang, S.cfg.voiceURI);
  if (v) { u.voice = v; u.lang = v.lang; }
  u.onstart = onStart;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

function fillInput(txt) {
  const input = $('#msgInput');
  if (input) { input.value = txt; input.focus(); }
}

async function startListening() {
  const native = Capacitor.isNativePlatform() && Capacitor.Plugins?.Speech;
  if (native) {
    setRec(true);
    try {
      const r = await Capacitor.Plugins.Speech.recognize({ lang: S.cfg.lang === 'es' ? 'es-ES' : 'en-US' });
      const txt = (r?.text || '').trim();
      if (txt) fillInput(txt);
    } catch (e) {
      toast('Voz: ' + (String(e?.message || e).includes('cancelado') ? 'cancelado' : 'erro no reconhecimento'));
    }
    setRec(false);
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Reconhecimento de voz indisponível. Digite sua resposta.'); return; }
  const ok = await ensureMic();
  if (!ok) return;
  let rec;
  try { rec = new SR(); } catch { toast('Não foi possível iniciar a voz.'); return; }
  rec.lang = S.cfg.lang === 'es' ? 'es-ES' : 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  setRec(true);
  rec.onresult = e => fillInput(e.results[0][0].transcript);
  rec.onerror = e => toast('Voz: ' + (e.error || 'erro'));
  rec.onend = () => setRec(false);
  try { rec.start(); } catch { setRec(false); }
}

/* ---------------- chat ---------------- */
function appendMsg(role, text) {
  S.messages.push({ role, content: text, time: hhmm() });
  if (S.topic) {
    const chats = { ...(S.data.chats || {}), [S.topic.id]: S.messages.filter(m => m.role !== 'system') };
    persistData({ chats });
  }
  renderChatOnly();
}

async function sendText(raw) {
  const text = (raw ?? $('#msgInput')?.value ?? '').trim();
  if (!text || S.typing) return;
  const input = $('#msgInput');
  if (input) input.value = '';
  appendMsg('user', text);
  S.typing = true;
  renderChatOnly();

  const history = S.messages.filter(m => m.role !== 'system').slice(-12).map(m => ({ role: m.role, content: m.content }));
  const res = await sendChat(history, S.cfg.lang);
  S.typing = false;

  const userCount = S.messages.filter(m => m.role === 'user').length;
  if (userCount >= 5 && !S.awarded) {
    S.awarded = true;
    registerDay();
    persistData({ lessons: (S.data.lessons || 0) + 1, xp: (S.data.xp || 0) + 15, minutes: (S.data.minutes || 0) + 3 });
    setTimeout(() => toast('🎉 Aula concluída! +15 XP'), 400);
  }
  appendMsg('assistant', res.text);
  speak(res.text);
}

function renderChatOnly() {
  const box = $('#chat');
  if (!box) return;
  const goal = 5;
  const n = S.messages.filter(m => m.role === 'user').length;
  const fill = $('#progressFill');
  if (fill) fill.style.width = Math.min(100, (n / goal) * 100) + '%';
  const cnt = $('#msgCount');
  if (cnt) cnt.textContent = `${Math.min(n, goal)}/${goal}`;

  box.innerHTML = `
    <div class="stage">
      <div class="mascot">${mascotSVG()}</div>
      <div class="name">Libi · tutora ${LANGUAGES[S.cfg.lang]?.name || ''}</div>
    </div>
    ${S.messages.map(m => `
      <div class="msg ${m.role === 'user' ? 'me' : 'bot'}">
        <div>
          <div class="who">${m.role === 'user' ? esc(S.cfg.name || 'Você') : 'Libi'}</div>
          <div class="bubble">${esc(m.content)}</div>
          <div class="time">${esc(m.time || '')}</div>
        </div>
        ${m.role === 'assistant' ? `<button class="speak" data-speak="${esc(m.content)}" aria-label="Ouvir">🔈</button>` : ''}
      </div>`).join('')}
    ${S.typing ? `<div class="msg bot typing"><div><div class="who">Libi</div><div class="bubble">Libi está pensando</div></div></div>` : ''}
  `;
  box.scrollTop = box.scrollHeight;
  $$('[data-speak]', box).forEach(b => b.addEventListener('click', () => speak(b.dataset.speak, b)));
}

/* ---------------- screens ---------------- */
const NAV = `<div class="bottom-nav">
  <button class="nav-item" data-nav="home"><span class="ico">🏠</span>Início</button>
  <button class="nav-item" data-nav="lesson"><span class="ico">💬</span>Conversar</button>
  <button class="nav-item" data-nav="practice"><span class="ico">🔁</span>Praticar</button>
  <button class="nav-item" data-nav="progress"><span class="ico">📊</span>Progresso</button>
  <button class="nav-item" data-nav="settings"><span class="ico">⚙️</span>Ajustes</button>
</div>`;

function screenOnboarding() {
  const slides = [
    { t: 'Aprenda conversando', p: 'Pratique um idioma de verdade com a Libi, uma tutora por IA que conversa com você quando quiser.', art: '🦜' },
    { t: 'Correção gentil', p: 'Ela elogia seus acertos e mostra formas mais naturais — sem medo de errar, sem julgamento.', art: '✨' },
    { t: 'No seu ritmo', p: 'Escolha o tema, fale ou digite, e acompanhe sua evolução. Seu bolso, sua aula.', art: '🚀' }
  ];
  const s = slides[S.step];
  return `<div class="screen onboard">
    <div class="onboard-art" style="font-size:76px">${s.art}</div>
    <h2>${s.t}</h2>
    <p>${s.p}</p>
    <div class="dots">${slides.map((_, i) => `<div class="dot ${i === S.step ? 'on' : ''}"></div>`).join('')}</div>
    <div class="onboard-actions">
      ${S.step < 2 ? `<button class="btn ghost" id="skip">Pular</button><button class="btn" id="next">Próximo</button>`
        : `<button class="btn block" id="finish">Começar a aprender</button>`}
    </div>
  </div>`;
}

function screenHome() {
  const d = S.data;
  const L = LANGUAGES[S.cfg.lang] || LANGUAGES.en;
  return `<div class="screen">
    <div class="topbar">
      <div class="brand"><span class="brand-mark">ON</span>ON SPEAK</div>
      <div class="spacer"></div>
      <div class="pill">🔥 ${d.streak || 1}</div>
    </div>
    <div class="scroll">
      <div class="hero">
        <small>${L.flag} ${L.name} · hoje</small>
        <h1>Olá, ${esc(S.cfg.name || 'amigo')}! 👋</h1>
        <p>Converse com a Libi ou repita até fixar. Você escolhe.</p>
        <button class="btn btn-light sm" id="continueBtn">Conversar →</button>
        <div class="hero-avatar">${mascotSVG()}</div>
      </div>
      <div class="section-title">Como quer aprender?</div>
      <div class="mode-grid">
        <button class="mode-card mode-chat" data-mode="chat">
          <span class="mode-ic">💬</span>
          <strong>Conversação</strong>
          <small>Converse livre com a Libi e receba dicas na hora.</small>
          <span class="mode-go">Abrir →</span>
        </button>
        <button class="mode-card mode-repeat" data-mode="practice">
          <span class="mode-ic">🔁</span>
          <strong>Repetição</strong>
          <small>Exercícios rápidos, corações e XP para fixar.</small>
          <span class="mode-go">Praticar →</span>
        </button>
      </div>
      <div class="section-title">Temas <span>· ${TOPICS.length} disponíveis</span></div>
      ${TOPICS.map(t => `<button class="topic" data-topic="${t.id}">
        <span class="emoji">${t.emoji}</span>
        <span class="meta"><strong>${t.title}</strong><small>${t.desc}</small></span>
        <span class="lvl">${t.level}</span>
        <span class="arrow">›</span>
      </button>`).join('')}
      <div class="foot-note">Feito com carinho · seu progresso fica só no seu aparelho.</div>
    </div>
    ${NAV}
  </div>`;
}

function screenLesson() {
  const t = S.topic || TOPICS[0];
  const demo = !S.cfg.apiKey;
  return `<div class="screen">
    <div class="lesson-head">
      <div class="row">
        <button class="icon-btn" id="backBtn" style="box-shadow:none">‹</button>
        <div class="title">${t.emoji} ${t.title}<small>Prática de conversação</small></div>
        ${demo ? `<span class="badge-demo">demo</span>` : ''}
        <span id="msgCount" style="font-size:11px;color:var(--muted);font-weight:800">0/5</span>
      </div>
      <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
    </div>
    <div class="chat" id="chat"></div>
    <div class="chips">${t.prompts.map(p => `<button class="chip" data-chip="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    <div class="composer">
      <button class="round" id="micBtn" title="Falar">🎤</button>
      <input id="msgInput" placeholder="Escreva ou fale…" autocomplete="off" enterkeyhint="send" />
      <button class="round send" id="sendBtn" title="Enviar">➤</button>
    </div>
  </div>`;
}

/* ---------------- modo repetição ---------------- */
let audioCtx;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [523.25, 659.25, 783.99] : [233.08, 174.61];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      const t = audioCtx.currentTime + i * 0.09;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.2);
    });
  } catch { /* áudio não disponível */ }
}

function screenPracticeIntro() {
  return `<div class="screen">
    <div class="lesson-head">
      <div class="row">
        <button class="icon-btn" id="backBtn" style="box-shadow:none">‹</button>
        <div class="title">🔁 Modo Repetição<small>Exercícios rápidos para fixar</small></div>
      </div>
    </div>
    <div class="scroll">
      <div class="intro-hero">
        <div class="intro-emoji">🎯</div>
        <h2>Repita até virar nativo</h2>
        <p>6 perguntas curtas, 3 corações e XP a cada acerto. Escolha um tema e comece.</p>
      </div>
      <div class="section-title">Escolha o tema</div>
      <div class="topic-chips">
        <button class="tchip ${S.practiceTopic === 'all' ? 'on' : ''}" data-ptopic="all">🌐 Todos</button>
        ${TOPICS.map(t => `<button class="tchip ${S.practiceTopic === t.id ? 'on' : ''}" data-ptopic="${t.id}">${t.emoji} ${t.title}</button>`).join('')}
      </div>
      <button class="btn block" id="startPractice" style="margin-top:18px">Começar prática →</button>
      <div class="hint" style="text-align:center;margin-top:10px">Use fones nos exercícios de escuta e fala. 🎧</div>
    </div>
    ${NAV}
  </div>`;
}

function screenPracticeRun() {
  return `<div class="screen practice">
    <div class="practice-head">
      <button class="icon-btn" id="quitPractice" style="box-shadow:none">✕</button>
      <div class="hearts" id="hearts">❤️ ❤️ ❤️</div>
      <div class="step-count" id="stepCount">1/6</div>
    </div>
    <div class="progress-track" style="margin:0 16px 8px"><div class="progress-fill" id="pzFill" style="width:0%"></div></div>
    <div class="scroll practice-body" id="practiceBody"></div>
    <div class="practice-footer" id="practiceFooter"></div>
  </div>`;
}

function renderPracticeOnly() {
  const p = S.pz;
  const body = $('#practiceBody'), footer = $('#practiceFooter');
  if (!body || !footer) return;
  const q = p.session[p.idx];
  if (!q) return;
  const total = p.session.length;

  const hearts = $('#hearts');
  if (hearts) hearts.innerHTML = Array.from({ length: 3 }, (_, i) => i < p.hearts ? '❤️' : '🖤').join(' ');
  const step = $('#stepCount'); if (step) step.textContent = `${Math.min(p.idx + 1, total)}/${total}`;
  const fill = $('#pzFill'); if (fill) fill.style.width = (p.idx / total) * 100 + '%';

  let answerHtml;
  if (['choice', 'blank', 'listen'].includes(q.type)) {
    answerHtml = `<div class="answer-options">${q.options.map((o, i) => {
      const chosen = p.selected === o;
      const cls = p.checked ? (o === q.answer ? 'correct' : (chosen ? 'wrong' : '')) : (chosen ? 'selected' : '');
      return `<button class="answer-opt ${cls}" data-opt="${esc(o)}" ${p.checked ? 'disabled' : ''}>
        <span class="opt-key">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span>
      </button>`;
    }).join('')}</div>`;
  } else if (q.type === 'translate') {
    answerHtml = `<div class="field"><label>Sua resposta</label>
      <input id="pzInput" value="${esc(p.input)}" placeholder="Escreva em ${esc(LANGUAGES[S.cfg.lang]?.name || '')}" ${p.checked ? 'disabled' : ''} autocomplete="off" />
    </div>`;
  } else {
    answerHtml = `<div class="speak-answer">
      <button class="speak-big" id="pzMic">🎤 Toque e fale</button>
      <div class="transcript">${p.transcript ? esc(p.transcript) : 'Sua fala aparecerá aqui…'}</div>
    </div>`;
  }

  const promptHtml = q.type === 'listen'
    ? `<button class="listen-btn" id="pzListen">🔊 Ouvir novamente</button><div class="listen-hint">Toque para escutar a frase</div>`
    : `<div class="q-prompt ${q.type === 'speak' ? 'pt' : ''}">${esc(q.prompt)}</div>`;

  const feedback = p.checked ? `<div class="feedback ${p.ok ? 'ok' : 'no'} ${p.ok ? 'pop' : 'shake'}">
    <div class="fb-title">${p.ok ? '✅ Mandou bem!' : '❌ Quase!'}</div>
    ${p.ok ? '' : `<div class="fb-answer">Resposta: <strong>${esc(q.answer)}</strong></div>`}
    <div class="fb-tip">💡 ${esc(q.tip || '')}</div>
  </div>` : '';

  body.innerHTML = `<div class="q-instruction">${esc(q.sub || '')}</div>${promptHtml}${answerHtml}${feedback}`;

  const canCheck = q.type === 'translate' ? !!p.input.trim() : q.type === 'speak' ? !!p.transcript : p.selected !== null;
  footer.innerHTML = p.checked
    ? `<button class="btn block" id="pzNext">${p.idx + 1 >= total ? 'Finalizar' : 'Continuar'} →</button>`
    : `<button class="btn block" id="pzCheck" ${canCheck ? '' : 'disabled'}>Verificar</button>`;

  $$('[data-opt]', body).forEach(b => b.addEventListener('click', () => {
    if (p.checked) return;
    p.selected = b.dataset.opt;
    renderPracticeOnly();
  }));
  $('#pzInput')?.addEventListener('input', e => {
    p.input = e.target.value;
    const chk = $('#pzCheck'); if (chk) chk.disabled = !p.input.trim();
  });
  $('#pzListen')?.addEventListener('click', () => speak(q.prompt));
  $('#pzMic')?.addEventListener('click', startPracticeSpeech);
  $('#pzCheck')?.addEventListener('click', checkPractice);
  $('#pzNext')?.addEventListener('click', nextPractice);
  if (q.type === 'listen') setTimeout(() => speak(q.prompt), 250);
}

async function startPracticeSpeech() {
  const p = S.pz;
  if (p.checked) return;
  const lang = S.cfg.lang === 'es' ? 'es-ES' : 'en-US';
  const btn = $('#pzMic');
  if (btn) { btn.textContent = '🎙️ Ouvindo…'; btn.classList.add('rec'); }
  try {
    let text = '';
    if (Capacitor.isNativePlatform() && Capacitor.Plugins?.Speech) {
      const r = await Capacitor.Plugins.Speech.recognize({ lang });
      text = r?.text || '';
    } else {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) throw new Error('indisponível');
      text = await new Promise((res, rej) => {
        const rec = new SR();
        rec.lang = lang; rec.interimResults = false; rec.maxAlternatives = 1;
        rec.onresult = e => res(e.results[0][0].transcript);
        rec.onerror = e => rej(new Error(e.error || 'erro'));
        rec.start();
      });
    }
    p.transcript = String(text).trim();
    renderPracticeOnly();
  } catch {
    toast('Não entendi a fala. Tente de novo.');
    if (btn) { btn.textContent = '🎤 Toque e fale'; btn.classList.remove('rec'); }
  }
}

function checkPractice() {
  const p = S.pz, q = p.session[p.idx];
  if (!q || p.checked) return;
  const value = q.type === 'translate' ? p.input : q.type === 'speak' ? p.transcript : p.selected;
  p.ok = checkAnswer(q, value);
  p.checked = true;
  if (p.ok) p.correct++; else p.hearts--;
  beep(p.ok);
  navigator.vibrate?.(p.ok ? 35 : [60, 40, 60]);
  renderPracticeOnly();
}

function nextPractice() {
  const p = S.pz;
  if (p.hearts <= 0 || p.idx + 1 >= p.session.length) { finishPractice(); return; }
  p.idx++;
  p.selected = null; p.input = ''; p.transcript = ''; p.checked = false; p.ok = false;
  renderPracticeOnly();
}

function startPractice(topicId) {
  S.practiceTopic = topicId || 'all';
  S.pz = {
    session: buildSession(S.cfg.lang, topicId === 'all' ? null : topicId, 6),
    idx: 0, hearts: 3, correct: 0, selected: null, input: '', transcript: '',
    checked: false, ok: false, finished: false, start: Date.now(), topic: topicId, earned: 0
  };
  go('practiceRun');
}

function finishPractice() {
  const p = S.pz;
  const perfect = p.correct === p.session.length && p.hearts > 0;
  p.finished = true;
  p.earned = p.correct * 5 + (perfect ? 10 : 0);
  S.data = registerDay();
  persistData({
    lessons: (S.data.lessons || 0) + 1,
    xp: (S.data.xp || 0) + p.earned,
    minutes: (S.data.minutes || 0) + 2
  });
  beep(true);
  go('practiceResult');
}

function screenPracticeResult() {
  const p = S.pz, total = p.session.length;
  const pct = Math.round((p.correct / total) * 100);
  const perfect = p.correct === total && p.hearts > 0;
  return `<div class="screen result">
    <div class="result-hero">
      <div class="confetti">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
      <div class="result-emoji">${perfect ? '🏆' : p.hearts > 0 ? '🎉' : '💪'}</div>
      <h2>${perfect ? 'Perfeito!' : p.hearts > 0 ? 'Lição concluída!' : 'Sem corações…'}</h2>
      <p>${perfect ? 'Você acertou tudo. Imbatível!' : p.hearts > 0 ? 'Mais um passo na sua fluência.' : 'Não desanime — tente de novo!'}</p>
    </div>
    <div class="scroll">
      <div class="stats-grid">
        <div class="stat"><div class="v">${p.correct}/${total}</div><div class="k">acertos</div></div>
        <div class="stat"><div class="v">${pct}%</div><div class="k">aproveitamento</div></div>
        <div class="stat"><div class="v">+${p.earned}</div><div class="k">XP ganho</div></div>
        <div class="stat"><div class="v">${p.hearts}❤️</div><div class="k">corações restantes</div></div>
      </div>
      <button class="btn block" id="againPractice">Praticar de novo</button>
      <button class="btn ghost block" id="resultHome" style="margin-top:10px">Voltar ao início</button>
    </div>
  </div>`;
}

function screenProgress() {
  const d = S.data;
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const week = d.week || [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...week);
  const today = (new Date().getDay() + 6) % 7;
  const badges = [
    { ic: '🌱', k: 'Primeira aula', got: (d.lessons || 0) >= 1 },
    { ic: '🔥', k: '3 dias seguidos', got: (d.streak || 0) >= 3 },
    { ic: '⭐', k: '100 XP', got: (d.xp || 0) >= 100 },
    { ic: '🎯', k: '10 aulas', got: (d.lessons || 0) >= 10 }
  ];
  return `<div class="screen">
    <div class="topbar"><div class="brand"><span class="brand-mark">ON</span>Seu progresso</div><div class="spacer"></div><div class="pill">🔥 ${d.streak || 1}</div></div>
    <div class="scroll">
      <div class="stats-grid">
        <div class="stat"><div class="v">${d.lessons || 0}</div><div class="k">aulas concluídas</div></div>
        <div class="stat"><div class="v">${d.minutes || 0}<small style="font-size:13px"> min</small></div><div class="k">tempo praticado</div></div>
        <div class="stat"><div class="v">${d.xp || 0}</div><div class="k">XP conquistados</div></div>
        <div class="stat"><div class="v">${d.streak || 1}</div><div class="k">dias de sequência</div></div>
      </div>
      <div class="card"><h3>Atividade da semana</h3><p>Cada barra é uma aula concluída.</p>
        <div class="chart">${days.map((day, i) => `<div class="bar-wrap"><div class="bar ${i === today ? 'today' : ''}" style="height:${Math.max(4, (week[i] / max) * 78)}px"></div><span>${day}</span></div>`).join('')}</div>
      </div>
      <div class="section-title">Conquistas</div>
      <div class="badges">${badges.map(b => `<div class="badge ${b.got ? 'got' : ''}"><div class="ic">${b.ic}</div><small>${b.k}</small></div>`).join('')}</div>
      <div class="foot-note">Continue assim — 5 minutos por dia já fazem diferença.</div>
    </div>
    ${NAV}
  </div>`;
}

function screenSettings() {
  const c = S.cfg;
  const presets = {
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    custom: { baseUrl: c.baseUrl, model: c.model }
  };
  return `<div class="screen">
    <div class="topbar"><div class="brand"><span class="brand-mark">ON</span>Ajustes</div></div>
    <div class="scroll">
      <div class="card">
        <h3>Tutor IA</h3><p>Sem chave, o app funciona no modo demo (offline). Com chave, a Libi usa uma API compatível com OpenAI.</p>
        <div class="field" style="margin-top:14px"><label>Provedor</label>
          <select id="provider">
            <option value="openai" ${S.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
            <option value="groq" ${S.provider === 'groq' ? 'selected' : ''}>Groq</option>
            <option value="gemini" ${S.provider === 'gemini' ? 'selected' : ''}>Gemini (compatível)</option>
            <option value="custom" ${S.provider === 'custom' ? 'selected' : ''}>Personalizado</option>
          </select>
        </div>
        <div class="field"><label>URL base</label><input id="baseUrl" value="${esc(c.baseUrl)}" placeholder="https://api.openai.com/v1" /></div>
        <div class="field"><label>Modelo</label><input id="model" value="${esc(c.model)}" placeholder="gpt-4o-mini" /></div>
        <div class="field"><label>Chave de API</label><input id="apiKey" type="password" value="${esc(c.apiKey)}" placeholder="sk-…" /></div>
        <button class="btn block sm" id="saveApi">Salvar configuração</button>
        <button class="btn ghost block sm" id="testApi" style="margin-top:8px">Testar conexão</button>
        <div class="hint">Sua chave fica salva apenas neste dispositivo. Ela é enviada diretamente ao provedor escolhido.</div>
      </div>
      <div class="card">
        <h3>Idioma & voz</h3><p>Escolha como a Libi deve soar.</p>
        <div class="field" style="margin-top:14px"><label>Idioma alvo</label>
          <select id="lang">
            ${Object.entries(LANGUAGES).map(([k, v]) => `<option value="${k}" ${c.lang === k ? 'selected' : ''}>${v.flag} ${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Tipo de voz</label>
          <select id="ttsMode">
            <option value="device" ${c.ttsMode !== 'api' ? 'selected' : ''}>Voz do aparelho (grátis)</option>
            <option value="api" ${c.ttsMode === 'api' ? 'selected' : ''}>Voz neural pela API ✨</option>
          </select>
        </div>
        <div id="apiVoiceFields" style="${c.ttsMode === 'api' ? '' : 'display:none'}">
          <div class="field"><label>Voz neural</label>
            <select id="ttsVoice">
              ${['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'].map(v => `<option value="${v}" ${c.ttsVoice === v ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Modelo de áudio</label><input id="ttsModel" value="${esc(c.ttsModel)}" placeholder="gpt-4o-mini-tts" /></div>
          <div class="hint">Áudio gerado na nuvem. Requer chave de API compatível com OpenAI (OpenAI ou personalizado).</div>
        </div>
        <div id="deviceVoiceFields" style="${c.ttsMode === 'api' ? 'display:none' : ''}">
          <div class="field"><label>Voz do aparelho</label>
            <select id="voiceURI"><option value="">Automática (melhor disponível)</option></select>
          </div>
          <div class="hint">Vozes “Natural / Neural / Online” soam mais humanas. ✨ = recomendada.</div>
        </div>
        <div class="field"><label>Tom da voz</label><input id="pitch" type="number" min="0.7" max="1.4" step="0.05" value="${c.pitch}" /></div>
        <div class="field"><label>Velocidade</label><input id="voiceRate" type="number" min="0.6" max="1.3" step="0.05" value="${c.voiceRate}" /></div>
        <div class="field"><label>Como devo te chamar?</label><input id="name" value="${esc(c.name || '')}" placeholder="Seu nome" /></div>
        <button class="btn ghost block sm" id="previewVoice">🔊 Ouvir amostra</button>
      </div>
      <div class="card">
        <h3>Aparência</h3>
        <div class="seg" style="margin-top:12px">
          <button data-theme-set="light" class="${c.theme !== 'dark' ? 'on' : ''}">☀️ Claro</button>
          <button data-theme-set="dark" class="${c.theme === 'dark' ? 'on' : ''}">🌙 Escuro</button>
        </div>
      </div>
      <div class="card">
        <h3>Dados</h3><p>Apaga progresso, conversas e configurações salvas neste aparelho.</p>
        <button class="btn ghost block sm" id="resetBtn" style="margin-top:12px;color:#D64545">Limpar todos os dados</button>
      </div>
      <div class="foot-note">ON SPEAK v1.0 · projeto independente e original.<br/>Não afiliado a nenhum serviço de terceiros.</div>
    </div>
    ${NAV}
  </div>`;
}

function render() {
  const app = $('#app');
  let html;
  switch (S.screen) {
    case 'onboarding': html = screenOnboarding(); break;
    case 'lesson': html = screenLesson(); break;
    case 'practice': html = screenPracticeIntro(); break;
    case 'practiceRun': html = screenPracticeRun(); break;
    case 'practiceResult': html = screenPracticeResult(); break;
    case 'progress': html = screenProgress(); break;
    case 'settings': html = screenSettings(); break;
    default: html = screenHome();
  }
  app.innerHTML = html + `<div class="toast" id="toast"></div>`;
  bind();
  if (S.screen === 'lesson') renderChatOnly();
  if (S.screen === 'practiceRun') renderPracticeOnly();
  $$('.nav-item', app).forEach(b => b.classList.toggle('active', b.dataset.nav === S.screen));
  mountInstallBanner();
}

function go(screen) {
  window.speechSynthesis?.cancel();
  setTalking(false);
  S.screen = screen;
  render();
}

function openTopic(id) {
  const t = TOPICS.find(x => x.id === id) || TOPICS[0];
  S.topic = t;
  S.awarded = false;
  S.messages = (S.data.chats?.[t.id] || []).map(m => ({ ...m }));
  go('lesson');
}

/* ---------------- events ---------------- */
function bind() {
  const app = $('#app');

  // onboarding
  $('#next')?.addEventListener('click', () => { S.step++; render(); });
  $('#skip')?.addEventListener('click', () => finishOnboarding());
  $('#finish')?.addEventListener('click', () => finishOnboarding());

  // nav
  $$('[data-nav]', app).forEach(b => b.addEventListener('click', () => {
    const n = b.dataset.nav;
    if (n === 'lesson' && !S.topic) S.topic = TOPICS[0];
    if (n === 'lesson') openTopic(S.topic.id); else go(n);
  }));

  // home
  $('#continueBtn')?.addEventListener('click', () => openTopic(S.topic?.id || TOPICS[0].id));
  $$('[data-topic]', app).forEach(b => b.addEventListener('click', () => openTopic(b.dataset.topic)));
  $$('[data-mode]', app).forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode === 'practice') go('practice');
    else openTopic(S.topic?.id || TOPICS[0].id);
  }));

  // practice
  $$('[data-ptopic]', app).forEach(b => b.addEventListener('click', () => {
    S.practiceTopic = b.dataset.ptopic;
    $$('[data-ptopic]', app).forEach(x => x.classList.toggle('on', x === b));
  }));
  $('#startPractice')?.addEventListener('click', () => startPractice(S.practiceTopic));
  $('#quitPractice')?.addEventListener('click', () => go('practice'));
  $('#againPractice')?.addEventListener('click', () => startPractice(S.pz.topic || 'all'));
  $('#resultHome')?.addEventListener('click', () => go('home'));

  // lesson
  $('#backBtn')?.addEventListener('click', () => go('home'));
  $('#sendBtn')?.addEventListener('click', () => sendText());
  $('#micBtn')?.addEventListener('click', startListening);
  $('#msgInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendText(); } });
  $$('[data-chip]', app).forEach(b => b.addEventListener('click', () => sendText(b.dataset.chip)));

  // settings
  $('#provider')?.addEventListener('change', e => {
    S.provider = e.target.value;
    const presets = {
      openai: ['https://api.openai.com/v1', 'gpt-4o-mini'],
      groq: ['https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile'],
      gemini: ['https://generativelanguage.googleapis.com/v1beta/openai', 'gemini-2.0-flash']
    };
    if (presets[S.provider]) {
      $('#baseUrl').value = presets[S.provider][0];
      $('#model').value = presets[S.provider][1];
    }
  });
  $('#saveApi')?.addEventListener('click', () => {
    persistCfg({
      baseUrl: $('#baseUrl').value.trim(),
      model: $('#model').value.trim(),
      apiKey: $('#apiKey').value.trim()
    });
    toast(S.cfg.apiKey ? 'Configuração salva ✓' : 'Modo demo ativado ✓');
  });
  $('#testApi')?.addEventListener('click', async e => {
    persistCfg({ baseUrl: $('#baseUrl').value.trim(), model: $('#model').value.trim(), apiKey: $('#apiKey').value.trim() });
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Testando…';
    const r = await testConnection();
    b.disabled = false; b.textContent = 'Testar conexão';
    toast(r.msg);
  });
  const saveVoice = () => {
    if (!$('#voiceRate')) return;
    persistCfg({
      lang: $('#lang')?.value || S.cfg.lang,
      name: ($('#name')?.value || '').trim(),
      ttsMode: $('#ttsMode')?.value || 'device',
      ttsVoice: $('#ttsVoice')?.value || S.cfg.ttsVoice,
      ttsModel: ($('#ttsModel')?.value || '').trim(),
      voiceURI: $('#voiceURI')?.value || '',
      pitch: Number($('#pitch')?.value) || 1.05,
      voiceRate: Number($('#voiceRate')?.value) || 0.95
    });
  };
  ['#lang', '#name', '#ttsMode', '#ttsVoice', '#ttsModel', '#voiceURI', '#pitch', '#voiceRate'].forEach(sel => {
    $(sel)?.addEventListener('change', () => {
      saveVoice();
      if (sel === '#ttsMode') {
        $('#apiVoiceFields').style.display = S.cfg.ttsMode === 'api' ? '' : 'none';
        $('#deviceVoiceFields').style.display = S.cfg.ttsMode === 'api' ? 'none' : '';
      }
    });
  });
  $('#previewVoice')?.addEventListener('click', () => {
    saveVoice();
    speak(SPEAK_SAMPLE[S.cfg.lang] || SPEAK_SAMPLE.en, $('#previewVoice'));
  });

  if (S.screen === 'settings') {
    loadVoices().then(voices => {
      const sel = $('#voiceURI');
      if (!sel) return;
      const cur = S.cfg.voiceURI || '';
      sel.innerHTML = `<option value="">Automática (melhor disponível)</option>` + voices.map(v =>
        `<option value="${esc(v.voiceURI)}" ${cur === v.voiceURI ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}${/natural|neural|premium|online/i.test(v.name) ? ' ✨' : ''}</option>`
      ).join('');
    });
  }
  $$('[data-theme-set]', app).forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.themeSet;
    persistCfg({ theme: t });
    document.documentElement.dataset.theme = t;
    render();
  }));
  $('#resetBtn')?.addEventListener('click', () => {
    if (!confirm('Tem certeza que deseja apagar tudo?')) return;
    resetData();
    S.data = getData();
    S.cfg = getConfig();
    S.messages = [];
    toast('Dados apagados.');
    go('home');
  });
}

function finishOnboarding() {
  persistData({ onboarded: true, lastDay: new Date().toISOString().slice(0, 10) });
  registerDay();
  S.step = 0;
  go('home');
}

/* ---------------- PWA ---------------- */
let deferredPrompt = null;
let installDismissed = sessionStorage.getItem('onspeak_install_dismissed') === '1';

function handleShortcut() {
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'practice') S.screen = 'practice';
  else if (mode === 'chat') {
    S.topic = S.topic || TOPICS[0];
    S.messages = (S.data.chats?.[S.topic.id] || []).map(m => ({ ...m }));
    S.screen = 'lesson';
  }
}

function installBanner() {
  if (Capacitor.isNativePlatform() || !deferredPrompt || installDismissed) return '';
  if (S.screen !== 'home') return '';
  return `<div class="install-banner" id="installBanner">
    <span class="ib-ic">📲</span>
    <span class="ib-txt"><strong>Instale o ON SPEAK</strong><small>Use como app, direto na tela inicial</small></span>
    <button id="installBtn">Instalar</button>
    <button class="ib-close" id="installClose" aria-label="Fechar">✕</button>
  </div>`;
}

if (!Capacitor.isNativePlatform()) {
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() { console.info('[ON SPEAK] Pronto para uso offline ✓'); },
    onNeedRefresh() { updateSW(true); }
  });
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (S.screen === 'home') render();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    toast('🎉 ON SPEAK instalado!');
  });
}

handleShortcut();
render();

// Insere o banner de instalação na home quando disponível
function mountInstallBanner() {
  const host = $('#app .screen .scroll');
  if (!host || $('#installBanner')) return;
  const html = installBanner();
  if (!html) return;
  host.insertAdjacentHTML('afterbegin', html);
  $('#installBtn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('#installBanner')?.remove();
  });
  $('#installClose')?.addEventListener('click', () => {
    installDismissed = true;
    sessionStorage.setItem('onspeak_install_dismissed', '1');
    $('#installBanner')?.remove();
  });
}

// Detecta mudança de conexão para avisar o usuário
window.addEventListener('online', () => toast('🌐 Conectado — IA disponível'));
window.addEventListener('offline', () => toast('📴 Offline — modo demo ativo'));
