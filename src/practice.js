// Banco de exercícios original do ON SPEAK — Modo Repetição.
// Tipos: choice (múltipla escolha), translate (digitar), blank (lacuna),
// listen (ouvir e escolher), speak (falar e ser comparado).

export const EXERCISES = {
  en: [
    { id: 'en1', topic: 'daily', type: 'choice', prompt: 'How are you?', sub: 'O que significa?',
      options: ['Como você está?', 'Onde você está?', 'Quanto custa?'], answer: 'Como você está?',
      tip: '“How are you?” é a saudação mais comum em inglês.' },
    { id: 'en2', topic: 'daily', type: 'translate', prompt: 'Meu nome é Ana.', sub: 'Escreva em inglês',
      answer: 'My name is Ana', accept: ["I'm Ana", 'I am Ana', 'My names Ana'],
      tip: '“My name is …” é a forma mais comum de se apresentar.' },
    { id: 'en3', topic: 'daily', type: 'blank', prompt: 'Nice to ___ you!', sub: 'Complete a frase',
      options: ['meet', 'eat', 'see'], answer: 'meet',
      tip: '“Nice to meet you” é dito quando você conhece alguém.' },
    { id: 'en4', topic: 'daily', type: 'listen', prompt: 'See you tomorrow!', sub: 'Ouça e escolha o significado',
      options: ['Até amanhã!', 'Boa noite!', 'Até logo!'], answer: 'Até amanhã!',
      tip: '“See you” é uma despedida casual e muito usada.' },
    { id: 'en5', topic: 'travel', type: 'choice', prompt: "I'd like to book a room.", sub: 'O que significa?',
      options: ['Quero reservar um quarto.', 'Quero comprar um carro.', 'Onde fica o hotel?'],
      answer: 'Quero reservar um quarto.',
      tip: '“I’d like to …” é uma forma educada de pedir algo.' },
    { id: 'en6', topic: 'travel', type: 'listen', prompt: 'Where is the station?', sub: 'Ouça e escolha',
      options: ['Onde fica a estação?', 'Quanto custa o bilhete?', 'Qual é o horário?'],
      answer: 'Onde fica a estação?', tip: '“Station” pode ser estação de trem ou de ônibus.' },
    { id: 'en7', topic: 'travel', type: 'speak', prompt: 'Onde fica o aeroporto?', sub: 'Fale em inglês',
      answer: 'Where is the airport', accept: ["Where's the airport", 'Where is the airport please'],
      tip: '“Airport” = aeroporto. Tente dizer devagar e com clareza.' },
    { id: 'en8', topic: 'food', type: 'translate', prompt: 'Eu gostaria de pedir um café.', sub: 'Escreva em inglês',
      answer: "I'd like to order a coffee", accept: ['I would like to order a coffee', 'I want a coffee'],
      tip: 'Em restaurantes, “I’d like to order …” soa mais gentil que “I want”.' },
    { id: 'en9', topic: 'food', type: 'choice', prompt: "It's delicious!", sub: 'O que significa?',
      options: ['Está delicioso!', 'Está caro!', 'Está quente!'], answer: 'Está delicioso!',
      tip: 'Você também pode dizer “It’s amazing!” para elogiar a comida.' },
    { id: 'en10', topic: 'work', type: 'blank', prompt: 'Could you send me the ___ by Friday?', sub: 'Complete a frase',
      options: ['file', 'chair', 'water'], answer: 'file',
      tip: '“File” = arquivo. “Could you …?” é um pedido educado.' },
    { id: 'en11', topic: 'health', type: 'choice', prompt: 'I have a headache.', sub: 'O que significa?',
      options: ['Estou com dor de cabeça.', 'Estou com fome.', 'Estou cansado.'],
      answer: 'Estou com dor de cabeça.', tip: '“I have a …” é usado para descrever sintomas.' },
    { id: 'en12', topic: 'culture', type: 'speak', prompt: 'Eu amo esta música.', sub: 'Fale em inglês',
      answer: 'I love this song', accept: ["I love this song so much", "I'm loving this song"],
      tip: '“I love …” é simples e natural para falar de preferências.' }
  ],
  es: [
    { id: 'es1', topic: 'daily', type: 'choice', prompt: '¿Cómo estás?', sub: 'O que significa?',
      options: ['Como você está?', 'Onde você está?', 'Qual é seu nome?'], answer: 'Como você está?',
      tip: '“¿Cómo estás?” é a saudação mais comum em espanhol.' },
    { id: 'es2', topic: 'daily', type: 'translate', prompt: 'Meu nome é Ana.', sub: 'Escreva em espanhol',
      answer: 'Me llamo Ana', accept: ['Mi nombre es Ana', 'Soy Ana'],
      tip: '“Me llamo …” é a forma mais natural de dizer seu nome.' },
    { id: 'es3', topic: 'daily', type: 'blank', prompt: '¡Mucho ___!', sub: 'Complete a frase',
      options: ['gusto', 'gracias', 'tarde'], answer: 'gusto',
      tip: '“Mucho gusto” é dito ao conhecer alguém.' },
    { id: 'es4', topic: 'daily', type: 'listen', prompt: '¡Hasta mañana!', sub: 'Ouça e escolha',
      options: ['Até amanhã!', 'Boa noite!', 'Até logo!'], answer: 'Até amanhã!',
      tip: '“Hasta” significa “até” em português.' },
    { id: 'es5', topic: 'travel', type: 'choice', prompt: 'Quisiera reservar una habitación.', sub: 'O que significa?',
      options: ['Quero reservar um quarto.', 'Quero comprar um carro.', 'Onde fica a estação?'],
      answer: 'Quero reservar um quarto.',
      tip: '“Quisiera …” é uma forma educada de fazer pedidos.' },
    { id: 'es6', topic: 'travel', type: 'listen', prompt: '¿Dónde está la estación?', sub: 'Ouça e escolha',
      options: ['Onde fica a estação?', 'Quanto custa o bilhete?', 'Qual é o horário?'],
      answer: 'Onde fica a estação?', tip: '“Estación” = estação.' },
    { id: 'es7', topic: 'travel', type: 'speak', prompt: 'Onde fica o aeroporto?', sub: 'Fale em espanhol',
      answer: 'Dónde está el aeropuerto', accept: ['Dónde está el aeropuerto por favor'],
      tip: '“Aeropuerto” = aeroporto. Cuidado com o “p” duplo.' },
    { id: 'es8', topic: 'food', type: 'translate', prompt: 'Eu gostaria de pedir um café.', sub: 'Escreva em espanhol',
      answer: 'Quisiera pedir un café', accept: ['Quiero pedir un café', 'Un café por favor'],
      tip: '“Quisiera pedir …” é a forma mais gentil de pedir.' },
    { id: 'es9', topic: 'food', type: 'choice', prompt: '¡Está delicioso!', sub: 'O que significa?',
      options: ['Está delicioso!', 'Está caro!', 'Está frio!'], answer: 'Está delicioso!',
      tip: '“¡Qué rico!” também é muito usado para elogiar comida.' },
    { id: 'es10', topic: 'work', type: 'blank', prompt: '¿Podrías enviarme el ___ antes del viernes?', sub: 'Complete a frase',
      options: ['archivo', 'silla', 'agua'], answer: 'archivo',
      tip: '“Archivo” = arquivo. “¿Podrías …?” é um pedido educado.' },
    { id: 'es11', topic: 'health', type: 'choice', prompt: 'Me duele la cabeza.', sub: 'O que significa?',
      options: ['Estou com dor de cabeça.', 'Estou com fome.', 'Estou cansado.'],
      answer: 'Estou com dor de cabeça.', tip: '“Me duele …” = “me dói …”.' },
    { id: 'es12', topic: 'culture', type: 'speak', prompt: 'Eu amo esta música.', sub: 'Fale em espanhol',
      answer: 'Me encanta esta canción', accept: ['Me encanta esta musica', 'Amo esta canción'],
      tip: '“Me encanta …” é ótimo para falar que você ama algo.' }
  ]
};

export const SPEAK_SAMPLE = {
  en: "Hi! I'm Libi, your language tutor. Let's practice together. How was your day?",
  es: '¡Hola! Soy Libi, tu tutora de idiomas. ¿Cómo estuvo tu día?'
};

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkAnswer(q, value) {
  const v = normalize(value);
  const options = [q.answer, ...(q.accept || [])].map(normalize);
  return options.some(o => o === v || (v.length > 6 && (o.includes(v) || v.includes(o))));
}

export function buildSession(lang, topicId, count = 6) {
  const all = EXERCISES[lang] || EXERCISES.en;
  const filtered = all.filter(e => !topicId || e.topic === topicId);
  const pool = (filtered.length >= count ? filtered : all).slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
