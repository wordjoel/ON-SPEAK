// Conteúdo original do ON SPEAK — idiomas, tópicos e modo demo offline.

export const LANGUAGES = {
  en: { name: 'Inglês', code: 'en-US', flag: '🇺🇸', native: 'English' },
  es: { name: 'Espanhol', code: 'es-ES', flag: '🇪🇸', native: 'Español' }
};

export const TOPICS = [
  {
    id: 'daily',
    title: 'Conversa do dia',
    emoji: '💬',
    level: 'Iniciante',
    desc: 'Saudações, rotina e conversas cotidianas',
    prompts: ['Hello! How are you?', 'My name is…', 'What did you do today?'],
    vocab: ['How are you?', 'I’m fine, thanks', 'See you later', 'Take care']
  },
  {
    id: 'travel',
    title: 'Viagens',
    emoji: '✈️',
    level: 'Iniciante',
    desc: 'Aeroporto, hotel, direções e reservas',
    prompts: ['I’d like to book a room', 'Where is the station?', 'How much does it cost?'],
    vocab: ['book a flight', 'check-in', 'boarding pass', 'round trip']
  },
  {
    id: 'food',
    title: 'Comida & Bebida',
    emoji: '🍜',
    level: 'Iniciante',
    desc: 'Pedir comida, sabores e preferências',
    prompts: ['I’d like to order…', 'It’s delicious!', 'Do you have vegetarian options?'],
    vocab: ['menu', 'order', 'delicious', 'the bill, please']
  },
  {
    id: 'work',
    title: 'Trabalho',
    emoji: '💼',
    level: 'Intermediário',
    desc: 'Reuniões, e-mails e apresentações',
    prompts: ['Let’s schedule a meeting', 'Could you send me the file?', 'I’m working on a project'],
    vocab: ['deadline', 'meeting', 'follow up', 'team']
  },
  {
    id: 'health',
    title: 'Saúde',
    emoji: '🩺',
    level: 'Intermediário',
    desc: 'Descrever sintomas e ir ao médico',
    prompts: ['I don’t feel well', 'I have a headache', 'Where does it hurt?'],
    vocab: ['appointment', 'symptom', 'pain', 'rest']
  },
  {
    id: 'culture',
    title: 'Cultura & Lazer',
    emoji: '🎬',
    level: 'Intermediário',
    desc: 'Filmes, música, hobbies e opiniões',
    prompts: ['What do you do for fun?', 'I love this song', 'Have you seen this movie?'],
    vocab: ['hobby', 'recommend', 'awesome', 'weekend']
  }
];

const RULES = {
  en: [
    { re: /\b(oi|olá|ola|hello|hi|hey|bom dia|good morning|boa tarde)\b/i,
      reply: 'Hey! 😊 Que bom te ver por aqui.\n\nDica: “Hey, how’s it going?” soa bem natural.\n\nWhat did you do today?' },
    { re: /\b(name|me chamo|meu nome|sou o|a)\b/i,
      reply: 'Nice to meet you! 👋\n\nDica: “I’m Ana” é curto e natural — ou “My name is Ana” se quiser ser mais formal.\n\nWhere are you from?' },
    { re: /\b(how are you|como vai|tudo bem|bem, obrigado|fine|good thanks)\b/i,
      reply: 'I’m doing great, thanks! 🌟\n\nDica: “Pretty good!” e “I’m good, thanks!” são respostas casuais bem comuns.\n\nHow was your weekend?' },
    { re: /\b(thank|obrigad|thanks|valeu)\b/i,
      reply: 'You’re welcome! 🎉\n\nDica: “Thanks a lot” e “Thank you so much” são ótimas opções.\n\nWant to practice asking for something?' },
    { re: /\b(bye|tchau|see you|goodbye|até|later)\b/i,
      reply: 'See you soon! 👋\n\nDica: “Take care” é uma forma carinhosa de dizer adeus.\n\nLet’s chat again tomorrow!' },
    { re: /\b(book|reserv|hotel|room|flight|viagem|travel|airport)\b/i,
      reply: 'Great topic! ✈️\n\nDica: “I’d like to book a room for two nights, please.” é educado e claro.\n\nWhere would you like to go?' },
    { re: /\b(order|comida|food|menu|delicious|restaurant|pedir)\b/i,
      reply: 'Yum! 🍜\n\nDica: comece com “I’d like to order…” — muito mais gentil que “I want”.\n\nWhat’s your favorite dish?' },
    { re: /\b(work|trabalho|meeting|reunião|deadline|project)\b/i,
      reply: 'Let’s practice! 💼\n\nDica: “Could you send me the file by Friday?” soa profissional e direto.\n\nWhat do you do for a living?' },
    { re: /\b(hurt|dor|sick|headache|médico|doctor|well)\b/i,
      reply: 'Oh no, take care! 🩺\n\nDica: “I have a headache” e “I don’t feel well” ajudam muito no consultório.\n\nHow long have you felt like this?' },
    { re: /\b(movie|filme|music|música|song|hobby|weekend|fun)\b/i,
      reply: 'Cool! 🎬\n\nDica: “I’m really into…” é ótimo para falar de interesses: “I’m really into jazz.”\n\nWhat do you like to do on weekends?' },
    { re: /\b(yes|sim|no|não|maybe|talvez|ok|okay)\b/i,
      reply: 'Got it! 👌\n\nDica: para concordar com entusiasmo, tente “Absolutely!” ou “For sure!”.\n\nCan you tell me a little more?' }
  ],
  es: [
    { re: /\b(oi|olá|hola|hey|buenos días|bom dia)\b/i,
      reply: '¡Hola! 😊 Qué gusto verte por aquí.\n\nTip: “¿Qué tal?” es una forma súper natural de saludar.\n\n¿Qué hiciste hoy?' },
    { re: /\b(name|me chamo|mi nombre|me llamo|sou)\b/i,
      reply: '¡Mucho gusto! 👋\n\nTip: “Me llamo Ana” es lo más común. También puedes decir “Soy Ana”.\n\n¿De dónde eres?' },
    { re: /\b(how are you|como vai|cómo estás|bien|todo bien|bien gracias)\b/i,
      reply: '¡Estoy muy bien, gracias! 🌟\n\nTip: “Bien, gracias” y “Muy bien” son respuestas naturales y cortas.\n\n¿Cómo estuvo tu fin de semana?' },
    { re: /\b(thank|obrigad|gracias|valeu)\b/i,
      reply: '¡De nada! 🎉\n\nTip: “Muchas gracias” para agradecer con más fuerza.\n\n¿Quieres practicar pedir algo?' },
    { re: /\b(bye|tchau|adiós|hasta luego|nos vemos)\b/i,
      reply: '¡Hasta pronto! 👋\n\nTip: “Cuídate” es una forma linda de despedirse.\n\n¡Charlamos mañana!' },
    { re: /\b(book|reserv|hotel|habitación|vuelo|viaje|travel|airport)\b/i,
      reply: '¡Buen tema! ✈️\n\nTip: “Quisiera reservar una habitación para dos noches, por favor.”\n\n¿A dónde te gustaría ir?' },
    { re: /\b(order|comida|food|menú|delicioso|restaurante|pedir)\b/i,
      reply: '¡Qué rico! 🍜\n\nTip: empieza con “Quisiera pedir…” — mucho más amable que “Quiero”.\n\n¿Cuál es tu plato favorito?' },
    { re: /\b(work|trabajo|reunión|meeting|proyecto)\b/i,
      reply: '¡A practicar! 💼\n\nTip: “¿Podrías enviarme el archivo antes del viernes?” suena profesional.\n\n¿A qué te dedicas?' },
    { re: /\b(hurt|dor|sick|dolor|médico|doctor|mal)\b/i,
      reply: 'Ay, cuídate! 🩺\n\nTip: “Me duele la cabeza” y “No me siento bien” te ayudan mucho.\n\n¿Cuánto tiempo tienes así?' },
    { re: /\b(movie|película|music|música|song|canción|hobby|fin de semana)\b/i,
      reply: '¡Genial! 🎬\n\nTip: “Me encanta…” es perfecto para hablar de gustos: “Me encanta el jazz.”\n\n¿Qué haces los fines de semana?' },
    { re: /\b(yes|sim|sí|no|não|maybe|quizá|ok|vale)\b/i,
      reply: '¡Entendido! 👌\n\nTip: para mostrar entusiasmo, prueba “¡Claro!” o “¡Por supuesto!”.\n\n¿Puedes contarme un poco más?' }
  ]
};

const FALLBACKS = {
  en: [
    'Nice! 👏 Try adding one detail: “I went to the park yesterday”. Can you try?',
    'Good try! 💡 Remember: “I” is always capital in English. Tell me more!',
    'Interesting! 🌱 A natural follow-up would be “What about you?” — want to try it?',
    'Great! ✨ Tip: use “because” to link ideas: “I like it because it’s fun.” Why do you like it?',
    'Well done! 🎯 Try a longer sentence this time. What happened next?'
  ],
  es: [
    '¡Muy bien! 👏 Prueba añadir un detalle: “Fui al parque ayer”. ¿Puedes intentarlo?',
    '¡Buen intento! 💡 Recuerda: en español los sustantivos tienen género: “el parque”, “la casa”.',
    '¡Interesante! 🌱 Una respuesta natural sería “¿Y tú?” — ¿quieres probarla?',
    '¡Genial! ✨ Usa “porque” para unir ideas: “Me gusta porque es divertido.” ¿Por qué te gusta?',
    '¡Bien hecho! 🎯 Intenta una frase más larga esta vez. ¿Qué pasó después?'
  ]
};

export function demoReply(text, lang) {
  const rules = RULES[lang] || RULES.en;
  const found = rules.find(r => r.re.test(text || ''));
  if (found) return found.reply;
  const pool = FALLBACKS[lang] || FALLBACKS.en;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
