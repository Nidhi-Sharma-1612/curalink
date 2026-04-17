# Curalink — AI Medical Research Assistant

A full-stack MERN application that accepts a medical query, retrieves real research from PubMed, OpenAlex, and ClinicalTrials.gov, re-ranks results, and synthesizes a structured, source-attributed response using an LLM.

**Live demo:** [curalink-flax.vercel.app](https://curalink-flax.vercel.app)

---

## Features

- Multi-source retrieval — PubMed, OpenAlex, ClinicalTrials.gov queried in parallel
- Query expansion via LLM — 3 search variants generated from the user's input
- Composite re-ranking — relevance + recency + citation count
- Structured LLM response — Condition Overview, Research Insights, Clinical Trials, Source Attribution, Disclaimer
- Multi-turn conversation — session history stored in MongoDB Atlas, persists across page refreshes
- Two input modes — Natural Language and Structured (patient name, disease, location)
- 3-tier LLM fallback — Ollama (local) → Groq (Llama 3) → static structured response

---

## Tech Stack

| Layer            | Technology                                                 |
| ---------------- | ---------------------------------------------------------- |
| Frontend         | React 19, Vite 8, react-markdown, axios                    |
| Backend          | Node.js, Express 5, Mongoose                               |
| Database         | MongoDB Atlas                                              |
| LLM (local)      | Ollama — llama3 / mistral                                  |
| LLM (production) | Groq — Llama 3 8B (free, fast inference)                   |
| Research APIs    | PubMed (NCBI E-utilities), OpenAlex, ClinicalTrials.gov v2 |

---

## Project Structure

```
curalink/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── chat.js                   # POST /api/chat, GET /api/sessions/:id
│   │   ├── services/
│   │   │   ├── queryExpansion.js         # LLM-based query expansion (3 variants)
│   │   │   ├── pubmedService.js          # PubMed esearch + efetch (XML parse)
│   │   │   ├── openalexService.js        # OpenAlex /works with pagination
│   │   │   ├── clinicalTrialsService.js  # ClinicalTrials.gov v2 API
│   │   │   ├── rankingService.js         # Composite score re-ranking
│   │   │   └── llmService.js             # Ollama → Groq → static fallback
│   │   ├── models/
│   │   │   └── Session.js                # Mongoose model — sessionId, messages[]
│   │   └── app.js                        # Express setup, CORS, MongoDB connect
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx            # Scrollable message list
│   │   │   ├── InputPanel.jsx            # Query form (natural + structured mode)
│   │   │   ├── MessageBubble.jsx         # Message renderer with collapsible cards
│   │   │   ├── ResearchCard.jsx          # Publication card
│   │   │   └── TrialCard.jsx             # Clinical trial card
│   │   ├── services/
│   │   │   └── api.js                    # Axios wrapper for backend
│   │   ├── App.jsx                       # Root — session management, layout
│   │   └── index.css                     # Global CSS variables (dark theme)
│   └── package.json
├── .gitignore
└── README.md
```

---

## AI Pipeline

```
User Input
    │
    ▼
[1] Query Expansion (LLM)
    → 3 expanded search strings from the disease + query
    │
    ▼
[2] Parallel Data Retrieval
    ├── PubMed         → up to 100 articles  (esearch → efetch XML)
    ├── OpenAlex       → up to 100 papers    (relevance_score:desc)
    └── ClinicalTrials → up to 50 trials
    │
    ▼
[3] Merge + Deduplicate
    │
    ▼
[4] Re-Ranking
    Score = 0.5 × keyword_relevance + 0.3 × recency + 0.2 × citations
    → Top 8 publications + Top 6 trials
    │
    ▼
[5] LLM Synthesis
    Tier 1: Ollama (local)
    Tier 2: Groq — Llama 3 8B (free, fast)
    Tier 3: Static structured fallback
    │
    ▼
[6] Store in MongoDB (session history)
    │
    ▼
[7] Return to React Frontend
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Ollama installed locally (optional — only needed for local LLM)

### 1. Clone & install

```bash
git clone https://github.com/your-username/curalink.git
cd curalink

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/curalink

# Ollama (local LLM — optional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3

# NCBI / PubMed (mandatory per NCBI policy)
NCBI_EMAIL=your_email@example.com
NCBI_API_KEY=your_ncbi_api_key_here

# Groq (production LLM — Tier 2)
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama3-8b-8192

```

### 3. Run locally

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

The Vite dev server proxies `/api` → `localhost:5000` automatically — no CORS issues in development.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Required | Description                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------------ |
| `MONGODB_URI`       | Yes      | MongoDB Atlas connection string                                                |
| `PORT`              | No       | Server port (default: 5000)                                                    |
| `OLLAMA_URL`        | No       | Ollama base URL (default: `http://localhost:11434`)                            |
| `OLLAMA_MODEL`      | No       | Ollama model name (default: `llama3`)                                          |
| `NCBI_EMAIL`        | Yes      | Email for NCBI API identification (mandatory per NCBI policy)                  |
| `NCBI_API_KEY`      | No       | Raises PubMed rate limit from 3 to 10 req/s (free at ncbi.nlm.nih.gov/account) |
| `GROQ_API_KEY`      | Yes\*    | Groq API key — production LLM (free at console.groq.com)                       |
| `GROQ_MODEL`        | No       | Groq model (default: `llama3-8b-8192`)                                         |

\*Required if Ollama is not running (i.e., in any hosted environment).

### Frontend (`frontend/.env.local`)

| Variable       | Required        | Description                                                |
| -------------- | --------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | Production only | Full backend URL, e.g. `https://your-app.onrender.com/api` |

Not needed in development — Vite's proxy handles it.

---

## API Reference

| Method   | Path                | Description                                     |
| -------- | ------------------- | ----------------------------------------------- |
| `GET`    | `/health`           | Health check                                    |
| `POST`   | `/api/chat`         | Send a message, receive LLM response + research |
| `GET`    | `/api/sessions/:id` | Retrieve full conversation history              |
| `DELETE` | `/api/sessions/:id` | Delete a session                                |

### POST `/api/chat`

Request:

```json
{
  "sessionId": "uuid-string",
  "message": "Latest treatments for lung cancer",
  "disease": "lung cancer",
  "patientName": "Jane Doe",
  "location": "New York"
}
```

Response:

```json
{
  "sessionId": "uuid-string",
  "message": "## Condition Overview\n...",
  "research": {
    "publications": [...],
    "trials": [...],
    "retrievalStats": {
      "pubmedFetched": 100,
      "openalexFetched": 100,
      "trialsFetched": 50
    }
  }
}
```

---

## Frontend Components

| Component       | Description                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InputPanel`    | Toggle between Natural Language and Structured mode (patient name, disease, location). Includes example query chips.                             |
| `ChatWindow`    | Scrollable message list with auto-scroll and loading indicator.                                                                                  |
| `MessageBubble` | Renders user bubbles and assistant cards. Assistant cards include retrieval stats, collapsible Publications panel, and collapsible Trials panel. |
| `ResearchCard`  | Publication card — title, source badge, year, authors, abstract snippet, external link (opens in new tab).                                       |
| `TrialCard`     | Trial card — title, NCT ID, color-coded status badge, phase, summary, locations, external link.                                                  |

Session ID is stored in `localStorage` and survives page refreshes. Click **+ New Chat** to start a fresh session.

---

## Example Queries

- `Latest treatment for lung cancer`
- `Clinical trials for diabetes`
- `Top researchers in Alzheimer's disease`
- `Recent studies on heart disease`
- `Deep brain stimulation for Parkinson's`

---

## Disclaimer

Curalink is for research and educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.
