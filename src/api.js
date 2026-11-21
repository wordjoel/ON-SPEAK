import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { LANGUAGES, demoReply } from './data.js';

const CFG_KEY = 'lv_config_v1';
const DATA_KEY = 'lv_data_v1';

const DEFAULT_CFG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  lang: 'en',
  name: 'Amigo',
  voiceRate: 0.95,
  theme: 'light'
};

const DEFAULT_DATA = {
  onboarded: false,
  streak: 1,
  lastDay: '',
  xp: 0,
  minutes: 0,
  lessons: 0,
  week: [0, 0, 0, 0, 0, 0, 0],
  chats: {}
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

export function getConfig() { return read(CFG_KEY, DEFAULT_CFG); }
export function saveConfig(patch) {
  const next = { ...getConfig(), ...patch };
  localStorage.setItem(CFG_KEY, JSON.stringify(next));
  return next;
}

export function getData() { return read(DATA_KEY, DEFAULT_DATA); }
export function saveData(patch) {
  const next = { ...getData(), ...patch };
  localStorage.setItem(DATA_KEY, JSON.stringify(next));
  return next;
}
export function resetData() {
  localStorage.removeItem(DATA_KEY);
  localStorage.removeItem(CFG_KEY);
  return { ...DEFAULT_DATA };
}

export function registerDay() {
  const d = getData();
  const today = new Date().toISOString().slice(0, 10);
  if (d.lastDay === today) return d;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = d.lastDay === yesterday ? d.streak + 1 : 1;
  const wd = (new Date().getDay() + 6) % 7;
  const week = [...d.week];
  week[wd] = (week[wd] || 0) + 1;
  return saveData({ lastDay: today, streak, week });
}

function systemPrompt(lang) {
  const L = LANGUAGES[lang] || LANGUAGES.en;
  return `Você é a Libi, uma tutora simpática e paciente de ${L.name} (${L.native}).
REGRAS:
- Responda SEMPRE em ${L.native}, com frases curtas (2 a 4 frases).
- Seja encorajadora, use no máximo 1 emoji por resposta.
- Se o aluno escrever em português, responda em ${L.native} mesmo assim, mas com uma dica curta em português entre parênteses.
- Corrija erros de forma gentil: elogue primeiro, depois mostre a forma natural.
- Termine SEMPRE com uma pergunta curta para manter a conversa andando.
- Não use markdown, listas longas nem tabelas. Texto corrido apenas.`;
}

export async function sendChat(messages, lang) {
  const cfg = getConfig();
  const last = [...messages].reverse().find(m => m.role === 'user');
  const userText = last?.content || '';

  if (!cfg.apiKey || !cfg.apiKey.trim()) {
    return { text: demoReply(userText, lang), demo: true };
  }

  const url = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions';
  const body = {
    model: cfg.model || 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt(lang) }, ...messages.slice(-12)],
    temperature: 0.75,
    max_tokens: 260
  };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + cfg.apiKey.trim()
  };

  try {
    let data;
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({ url, headers, data: body, responseType: 'json', connectTimeout: 20000, readTimeout: 30000 });
      data = res.data;
    } else {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    }
    const text = (data?.choices?.[0]?.message?.content || '').trim();
    if (!text) throw new Error('Resposta vazia da API');
    return { text, demo: false };
  } catch (err) {
    const msg = String(err?.message || err);
    return {
      text: `⚠️ Não consegui falar com a API (${msg}).\n\nEnquanto isso, vamos praticar:\n\n${demoReply(userText, lang)}`,
      demo: true,
      error: true
    };
  }
}

export async function testConnection() {
  const cfg = getConfig();
  if (!cfg.apiKey) return { ok: false, msg: 'Informe uma chave de API primeiro.' };
  const url = (cfg.baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
  const body = { model: cfg.model || 'gpt-4o-mini', messages: [{ role: 'user', content: 'Reply with the single word: OK' }], max_tokens: 8 };
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey.trim() };
  try {
    let data;
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({ url, headers, data: body, responseType: 'json', connectTimeout: 15000, readTimeout: 20000 });
      data = res.data;
    } else {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    }
    return { ok: true, msg: 'Conexão OK · ' + (data?.choices?.[0]?.message?.content || '').trim().slice(0, 40) };
  } catch (e) {
    return { ok: false, msg: 'Falhou: ' + String(e?.message || e) };
  }
}
