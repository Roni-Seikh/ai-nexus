# AI Nexus — Production-Ready AI SaaS Platform

A full-stack AI SaaS application with GPT-4o, Claude 3.5, Gemini 1.5, image generation, web search, AI agents, voice features, and Stripe subscriptions.

## Tech Stack

**Frontend:** React 18 · Vite · Tailwind CSS · Redux Toolkit · Framer Motion · Socket.io Client  
**Backend:** Node.js · Express · MongoDB · Mongoose · JWT · Socket.io · Multer  
**AI:** OpenAI · Anthropic · Google Gemini · OpenRouter  
**Payments:** Stripe  
**DevOps:** Docker · Docker Compose · GitHub Actions · Vercel · Render

---

## Project Structure

```
ai-nexus/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # Auth, Chat, Image, Payment, Upload
│   ├── middleware/      # Auth guard, validation
│   ├── models/          # User, Chat, Message, Image, Agent, Payment, Document
│   ├── routes/          # All API routes
│   ├── services/        # AI, Email, Search, Socket
│   ├── utils/           # Logger
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/  # Sidebar, Chat, Auth, Shared
│       ├── pages/       # All 12 pages
│       ├── store/       # Redux slices
│       └── services/    # Axios API client
├── docker-compose.yml
└── .github/workflows/
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- API keys: OpenAI, Anthropic, Google Gemini (at least one)

### 1. Clone and install

```bash
git clone https://github.com/youruser/ai-nexus.git
cd ai-nexus

# Backend
cd backend
cp .env.example .env
# Edit .env with your keys
npm install

# Frontend
cd ../frontend
cp .env.example .env.local
# Edit .env.local if needed
npm install
```

### 2. Configure environment

**backend/.env** — required fields:
```
MONGODB_URI=mongodb://localhost:27017/ai-nexus
JWT_SECRET=your-long-random-secret
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GEMINI_API_KEY=AIza...
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=you@gmail.com
EMAIL_PASS=your-app-password
CLIENT_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Docker (Recommended for Production)

```bash
# Copy and fill in env
cp backend/.env.example backend/.env
# Edit backend/.env

docker-compose up -d
```

Frontend → http://localhost:80  
Backend API → http://localhost:5000

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Set environment variable in Vercel dashboard:
```
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Backend → Render

1. Create a new **Web Service** on render.com
2. Connect your GitHub repo, set root to `backend/`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all environment variables from `.env.example`

### Database → MongoDB Atlas

1. Create a free cluster at mongodb.com/atlas
2. Whitelist `0.0.0.0/0` for Render's dynamic IPs
3. Copy the connection string to `MONGODB_URI`

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh-token | Refresh JWT |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password |
| GET  | /api/auth/verify-email/:token | Verify email |
| GET  | /api/auth/me | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chats | List all chats |
| POST | /api/chats | Create chat |
| GET | /api/chats/:id | Get chat |
| PUT | /api/chats/:id | Update (pin/archive/title) |
| DELETE | /api/chats/:id | Delete chat |
| GET | /api/chats/:id/messages | Get messages |
| POST | /api/chats/:id/messages | Send message (SSE stream) |
| POST | /api/chats/:id/share | Share chat |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/images/generate | Generate image |
| GET | /api/images | Image history |
| DELETE | /api/images/:id | Delete image |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/checkout | Create Stripe session |
| POST | /api/payments/webhook | Stripe webhook |
| GET  | /api/payments/subscription | Get subscription |
| POST | /api/payments/cancel | Cancel subscription |

### AI Models Available
| Model ID | Provider | Plan |
|----------|----------|------|
| gpt-4o | OpenAI | Free |
| gpt-4o-mini | OpenAI | Free |
| gpt-4-turbo | OpenAI | Pro |
| claude-3-5-sonnet-20241022 | Anthropic | Pro |
| claude-3-opus-20240229 | Anthropic | Pro |
| claude-3-haiku-20240307 | Anthropic | Free |
| gemini-1.5-pro | Google | Pro |
| gemini-1.5-flash | Google | Free |
| deepseek-chat | OpenRouter | Free |
| meta-llama/llama-3.1-70b-instruct | Meta/OR | Free |

---

## Features

- ✅ JWT + Refresh Token authentication
- ✅ Email verification & password reset
- ✅ Google & GitHub OAuth
- ✅ Real-time streaming AI responses (SSE)
- ✅ Multi-model support (GPT-4, Claude, Gemini, Llama)
- ✅ AI image generation (DALL-E 3)
- ✅ Web search via Tavily/Serper with citations
- ✅ File upload & document analysis (PDF, DOCX, TXT)
- ✅ Pinned, archived, and shared chats
- ✅ Built-in AI agents (Research, Coding, Writing, Marketing)
- ✅ Stripe subscription (Free / Pro / Enterprise)
- ✅ Admin dashboard
- ✅ Rate limiting, helmet, mongo-sanitize security
- ✅ Winston logging
- ✅ Socket.io real-time events
- ✅ Docker + docker-compose
- ✅ GitHub Actions CI/CD
- ✅ Glassmorphism dark UI with Framer Motion animations

---

## GitHub Actions Secrets Required

```
RENDER_DEPLOY_HOOK_URL   # From Render dashboard → Manual Deploy → Deploy Hook
VERCEL_TOKEN             # vercel.com/account/tokens
VERCEL_ORG_ID            # .vercel/project.json after first deploy
VERCEL_PROJECT_ID        # .vercel/project.json after first deploy
```

---

## License

MIT © AI Nexus
