# Curalink — AI Medical Research Assistant

A full-stack MERN application that acts as a health research companion. It understands user context, retrieves high-quality medical research from multiple sources, reasons over it using a local open-source LLM, and delivers structured, personalized, source-backed answers.

---

## Features

- **Structured + Natural Language Input** — toggle between a form (patient name, disease, location, query) and free-text chat
- **Multi-source Retrieval** — fetches from PubMed, OpenAlex, and ClinicalTrials.gov in parallel
- **Query Expansion** — Ollama LLM generates 3 diverse search variants from every query for broader coverage
- **Intelligent Re-ranking** — composite scoring: `0.5 × keyword relevance + 0.3 × recency + 0.2 × citations`
- **LLM Synthesis** — structured response with Condition Overview, Research Insights, Clinical Trials, Source Attribution
- **Multi-turn Context** — conversation history and patient context persist across follow-up questions
- **Fallback Mode** — if Ollama is offline, a structured response is built directly from ranked results

---

## Tech Stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | React 19 + Vite                              |
| Backend  | Node.js + Express 5                          |
| Database | MongoDB Atlas (Mongoose)                     |
| LLM      | Ollama (llama3) — local, open-source         |
| APIs     | PubMed NCBI, OpenAlex, ClinicalTrials.gov v2 |

---

## Project Structure

```
curalink/
├── backend/
│   ├── src/
│   │   ├── routes/chat.js              # POST /api/chat, GET/DELETE /api/sessions/:id
│   │   ├── services/
│   │   │   ├── queryExpansion.js       # Ollama-based query expansion (3 variants)
│   │   │   ├── pubmedService.js        # PubMed esearch + efetch pipeline
│   │   │   ├── openalexService.js      # OpenAlex /works with abstract reconstruction
│   │   │   ├── clinicalTrialsService.js# ClinicalTrials.gov v2 API
│   │   │   ├── rankingService.js       # Composite re-ranking + deduplication
│   │   │   └── llmService.js           # Ollama synthesis + fallback response
│   │   ├── models/Session.js           # Mongoose session schema
│   │   └── app.js                      # Express setup + MongoDB connect
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatWindow.jsx
    │   │   ├── InputPanel.jsx
    │   │   ├── MessageBubble.jsx
    │   │   ├── ResearchCard.jsx
    │   │   └── TrialCard.jsx
    │   ├── services/api.js
    │   ├── App.jsx
    │   └── index.css
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.com) installed and running locally
- MongoDB Atlas account (free tier is enough)

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/curalink.git
cd curalink
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and fill in your MONGODB_URI
```

Pull the LLM model (one-time):

```bash
ollama pull llama3
```

Start the backend:

```bash
npm run dev   # development (node --watch)
# or
npm start     # production
```

Backend runs on `http://localhost:5000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. The Vite dev proxy forwards `/api` → `localhost:5000` automatically.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable       | Description                                       |
| -------------- | ------------------------------------------------- |
| `PORT`         | Express server port (default: 5000)               |
| `MONGODB_URI`  | MongoDB Atlas connection string                   |
| `OLLAMA_URL`   | Ollama base URL (default: http://localhost:11434) |
| `OLLAMA_MODEL` | Ollama model name (default: llama3)               |

For the frontend in production, set `VITE_API_URL` to your deployed backend URL.

---

## API Endpoints

| Method   | Path                | Description                                    |
| -------- | ------------------- | ---------------------------------------------- |
| `POST`   | `/api/chat`         | Send a message, get a research-backed response |
| `GET`    | `/api/sessions/:id` | Retrieve full conversation history             |
| `DELETE` | `/api/sessions/:id` | Clear a session                                |
| `GET`    | `/health`           | Health check                                   |

### POST /api/chat — Request body

```json
{
  "sessionId": "optional-existing-session-id",
  "message": "Latest treatment for lung cancer",
  "disease": "lung cancer",
  "patientName": "John Smith",
  "location": "Toronto, Canada"
}
```

---

## AI Pipeline

```
User Input
    │
    ▼
[1] Query Expansion (Ollama)
    Generates 3 diverse search strings from the user query + disease context
    │
    ▼
[2] Parallel Retrieval (Promise.allSettled)
    ├── PubMed    → up to 100 results × 3 queries = 300 candidates
    ├── OpenAlex  → up to 100 results × 3 queries = 300 candidates
    └── ClinicalTrials.gov → up to 50 trials × 2 queries = 100 candidates
    │
    ▼
[3] Merge + Deduplicate
    Title-based dedup for publications, nctId-based for trials
    │
    ▼
[4] Re-Ranking
    score = 0.5 × keyword_relevance + 0.3 × recency + 0.2 × citations
    → Top 8 publications + Top 6 trials
    │
    ▼
[5] LLM Synthesis (Ollama llama3)
    Structured response with citations, or fallback if Ollama offline
    │
    ▼
[6] Persist to MongoDB (session history)
    │
    ▼
[7] Return to React frontend
```

---

## Example Queries

- "Latest treatment for lung cancer"
- "Clinical trials for diabetes"
- "Top researchers in Alzheimer's disease"
- "Recent studies on heart disease"
- "Deep brain stimulation for Parkinson's"

---

## Deployment

- **Backend** → [Render](https://render.com) or [Railway](https://railway.app) (set env vars in dashboard)
- **Frontend** → [Vercel](https://vercel.com) (set `VITE_API_URL` to backend URL)
- **Ollama** → Runs locally; for production use a VPS with Ollama or add a Hugging Face Inference API fallback
