# ON SPEAK

Tutor de idiomas com IA — projeto **original**, criado do zero com Vite + Capacitor.
Não é cópia, fork ou distribuição de nenhum produto de terceiros (inclusive do site consultado no início). Não usa código, marca, assets ou APIs proprietárias de ninguém.

## O que o app faz

O **ON SPEAK** reúne o melhor de dois mundos em um só app original:

- **💬 Modo Conversação** — converse livre com a Libi (tutora IA) em inglês ou espanhol, com correção gentil e perguntas de continuidade.
- **🔁 Modo Repetição** — exercícios rápidos e gamificados (múltipla escolha, tradução, lacuna, escuta e fala) com corações, XP e feedback imediato. É o "melhor do Duolingo" com identidade própria.
- **6 temas de aula**: conversa do dia, viagens, comida, trabalho, saúde e cultura.
- **Entrada de voz**: reconhecimento nativo no Android (`RecognizerIntent`) e Web Speech API no navegador.
- **Síntese de voz aprimorada**: escolha automática de vozes naturais/neurais do aparelho, seleção manual da voz, controle de tom e velocidade — ou **voz neural pela API** (OpenAI-compatible, ex.: `gpt-4o-mini-tts`) para soar ainda mais humano.
- **Modo demo offline**: funciona sem chave de API, com respostas locais e dicas de vocabulário.
- **API compatível com OpenAI**: configure OpenAI, Groq, Gemini (endpoint compatível) ou URL customizada. A chave fica só no dispositivo.
- **Progresso**: aulas concluídas, minutos, XP, sequência diária, gráfico semanal e conquistas — somado tanto pela conversa quanto pelos exercícios.
- **Feedback rico**: sons, vibração e animações de acerto/erro nos exercícios.
- **Tema claro/escuro**, onboarding e persistência local.

## Instalar

Copie `OnSpeak-debug.apk` para o celular e abra o arquivo (é um build de depuração; o Android pode pedir permissão para instalar fontes desconhecidas).

```powershell
adb install -r OnSpeak-debug.apk
```

## Usar com IA real

1. Abra **Ajustes**.
2. Escolha o provedor (OpenAI / Groq / Gemini / personalizado).
3. Cole sua chave de API, confira o modelo e toque em **Salvar configuração**.
4. Opcional: toque em **Testar conexão**.

Sem chave, o app continua funcionando no **modo demo** (badge “demo” na tela de conversa).

## Estrutura

```
src/main.js       interface e interações (conversação + repetição)
src/api.js        configuração, chamadas de API, voz neural e modo demo
src/data.js       idiomas, tópicos e respostas do modo demo
src/practice.js   banco original de exercícios do Modo Repetição
src/style.css     design original
android/          projeto nativo gerado pelo Capacitor
  .../SpeechPlugin.java   reconhecimento de voz nativo
OnSpeak-debug.apk           APK pronto
```

Identidade do app: nome **ON SPEAK**, pacote `com.original.onspeak`.

## Repositório oficial

🔗 **https://github.com/wordjoel/ON-SPEAK** (branch `main`)

```powershell
git clone https://github.com/wordjoel/ON-SPEAK.git
```

O repositório `wordjoel/lingua-viva` permanece apenas como backup histórico.

## Recompilar

O Capacitor 7 precisa de **JDK 21**. O ambiente tinha só JDK 17, então o build usa um JDK 21 portátil em `%TEMP%\opencode\jdk21\jdk-21.0.13.1+2`. Se ele não existir, baixe um JDK 21 e ajuste o caminho em `build-apk.ps1` (ou defina `JAVA_HOME` antes de rodar).

```powershell
.\build-apk.ps1
```

Ou manualmente:

```powershell
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug --no-daemon
```

O APK sai em `android/app/build/outputs/apk/debug/app-debug.apk` e é copiado para a raiz como `OnSpeak-debug.apk`.

## Observações

- Build de **debug**: assinado com a chave padrão do Android SDK. Para publicar na Play Store, gere uma chave própria e use `assembleRelease` com seu `signingConfig`.
- A geração de voz depende dos motores TTS/ASR instalados no aparelho. Se não houver motor de reconhecimento disponível, o app avisa e você pode digitar.
