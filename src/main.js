import './style.css';
import { Capacitor } from '@capacitor/core';
import { LANGUAGES, TOPICS } from './data.js';
import { getConfig, saveConfig, getData, saveData, resetData, registerDay, sendChat, testConnection } from './api.js';

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
  provider: 'openai'
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

function speak(text, btn) {
  if (!('speechSynthesis' in window)) { toast('Síntese de voz indisponível neste dispositivo.'); return; }
  const clean = String(text).replace(/[💡⚠️✨👏🎯🌱]/g, '').replace(/\(.*?\)/g, '').trim();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const lang = S.cfg.lang === 'es' ? 'es-ES' : 'en-US';
  u.lang = lang;
  u.rate = Number(S.cfg.voiceRate) || 0.95;
  const voices = window.speechSynthesis.getVoices() || [];
  const v = voices.find(x => x.lang?.toLowerCase() === lang.toLowerCase()) || voices.find(x => x.lang?.toLowerCase().startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  u.onstart = () => { setTalking(true); if (btn) btn.textContent = '🔊'; };
  u.onend = u.onerror = () => { setTalking(false); if (btn) btn.textContent = '🔈'; };
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
      <div class="brand"><span class="brand-mark">L</span>Lingua Viva</div>
      <div class="spacer"></div>
      <div class="pill">🔥 ${d.streak || 1}</div>
    </div>
    <div class="scroll">
      <div class="hero">
        <small>${L.flag} ${L.name} · hoje</small>
        <h1>Olá, ${esc(S.cfg.name || 'amigo')}! 👋</h1>
        <p>Pronto para mais uma conversa? São só 5 minutinhos.</p>
        <button class="btn btn-light sm" id="continueBtn">Continuar aprendendo →</button>
        <div class="hero-avatar">${mascotSVG()}</div>
      </div>
      <div class="section-title">Escolha uma aula <span>· ${TOPICS.length} temas</span></div>
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
    <div class="topbar"><div class="brand"><span class="brand-mark">L</span>Seu progresso</div><div class="spacer"></div><div class="pill">🔥 ${d.streak || 1}</div></div>
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
    <div class="topbar"><div class="brand"><span class="brand-mark">L</span>Ajustes</div></div>
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
        <h3>Idioma & voz</h3><p>Idioma que a Libi vai praticar com você.</p>
        <div class="field" style="margin-top:14px"><label>Idioma alvo</label>
          <select id="lang">
            ${Object.entries(LANGUAGES).map(([k, v]) => `<option value="${k}" ${c.lang === k ? 'selected' : ''}>${v.flag} ${v.name}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Como devo te chamar?</label><input id="name" value="${esc(c.name || '')}" placeholder="Seu nome" /></div>
        <div class="field"><label>Velocidade da voz</label><input id="voiceRate" type="number" min="0.6" max="1.3" step="0.05" value="${c.voiceRate}" /></div>
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
      <div class="foot-note">Lingua Viva v1.0 · projeto independente e original.<br/>Não afiliado a nenhum serviço de terceiros.</div>
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
    case 'progress': html = screenProgress(); break;
    case 'settings': html = screenSettings(); break;
    default: html = screenHome();
  }
  app.innerHTML = html + `<div class="toast" id="toast"></div>`;
  bind();
  if (S.screen === 'lesson') renderChatOnly();
  $$('.nav-item', app).forEach(b => b.classList.toggle('active', b.dataset.nav === S.screen));
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
  $('#lang')?.addEventListener('change', e => persistCfg({ lang: e.target.value }));
  $('#name')?.addEventListener('change', e => persistCfg({ name: e.target.value.trim() }));
  $('#voiceRate')?.addEventListener('change', e => persistCfg({ voiceRate: Number(e.target.value) }));
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

render();
