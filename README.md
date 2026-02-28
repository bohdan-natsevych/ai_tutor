# AI Tutor

A voice-first language learning app — practice speaking with an AI tutor and get real-time feedback on grammar, vocabulary, and fluency.

## Features

- 🎙️ **Voice Conversations** — speak naturally, get AI responses in real-time
- 🔊 **Listen-First Mode** — hides AI text until audio finishes for immersive practice
- 📊 **Instant Feedback** — detailed analysis of grammar, vocabulary, and fluency
- 🎭 **Roleplay Scenarios** — practise real-world situations (café, job interview, etc.)
- 📚 **Topic Discussions** — guided conversations on various topics
- 🌍 **Translation** — instant translations powered by DeepL
- 🔧 **Customizable** — choose AI model, voice, and learning preferences

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite (dev) / PostgreSQL (prod) via Drizzle ORM |
| State | Zustand (localStorage persistence) |
| TTS | Kokoro TTS (WebGPU) / Piper TTS / OpenAI TTS / Web Speech API |
| STT | OpenAI Whisper / Web Speech Recognition |
| AI | OpenAI Chat & Assistants API (`gpt-4o-audio-preview`) |
| Translation | DeepL API |
| Hosting | Vercel + Neon PostgreSQL |

## Getting Started

### Prerequisites

- **Node.js 18+**
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com/)
- **DeepL API key** *(optional)* — [deepl.com/pro-api](https://www.deepl.com/pro-api)

### Clone & Install

```bash
git clone https://github.com/bohdan-natsevych/ai_tutor.git
cd ai_tutor
npm install
```

### Configure Environment

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```dotenv
OPENAI_API_KEY=sk-...
DEEPL_API_KEY=...          # optional
DATABASE_URL=./data/ai-tutor.db
```

### Run Locally

```bash
npm run dev
```

Open **http://localhost:3000**.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit push` | Push schema changes to the database |

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `DEEPL_API_KEY` | — | DeepL API key (translation features) |
| `DATABASE_URL` | — | DB connection string. SQLite path for dev (default `./data/ai-tutor.db`), Neon Postgres URL for prod |
| `NEXT_PUBLIC_WORD_HIGHLIGHT_BIAS_MS` | — | Word-highlight timing offset in ms (default `100`) |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               #   API routes (chat, analyze, translate, stt, tts)
│   ├── chat/[id]/         #   Conversation page
│   ├── settings/          #   Settings page
│   └── page.tsx           #   Home / topic picker
├── components/
│   ├── chat/              #   ChatMessage, VoiceRecorder, SuggestionBubble …
│   ├── settings/          #   Settings panel components
│   └── ui/                #   shadcn/ui primitives
├── lib/
│   ├── ai/                #   AI providers, context builder, manager
│   ├── db/                #   Drizzle schema & queries (SQLite + Postgres)
│   ├── i18n/              #   Translations (EN / UK)
│   ├── stt/               #   Speech-to-text providers
│   ├── translation/       #   DeepL integration
│   └── tts/               #   TTS providers (Kokoro, OpenAI, WebSpeech)
├── stores/                #   Zustand stores
└── types/                 #   Shared TypeScript types
```

## Deployment

This app is configured for **Vercel + Neon PostgreSQL**.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full step-by-step instructions.

Highlights:
- Free-tier hosting on Vercel
- Free PostgreSQL on Neon (512 MB, always-on)
- Auto-deploy on `git push`
- ~15 min setup

## Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 89+ | Recommended — supports WebGPU for Kokoro TTS |
| Edge | 89+ | Full support |
| Firefox | 89+ | Web Speech fallback for TTS |
| Safari | 15.4+ | Web Speech fallback for TTS |

## License

MIT
