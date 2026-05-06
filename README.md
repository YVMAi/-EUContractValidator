# ContractGuard

AI-powered construction contract supplement review system. Protects General Contractors against inflated, duplicated, or unauthorised contractor claims using a three-pass automated review workflow powered by Google Gemini.

---

## What It Does

Upload your base contract and BOQ once. Then submit contractor supplement/claim PDFs one at a time. ContractGuard runs them through a three-pass review:

| Pass | Who | What |
|------|-----|-------|
| **Pass 1** | Python (no AI cost) | Formality checks — signature, dates, instruction reference, sequential number, contract reference, countersignature block |
| **Pass 2** | Gemini 2.5 Flash | Full commercial & technical analysis against 11-section universal checklist |
| **Pass 3** | Project Manager | Manual payment gate sign-off |

Pass 1 failure → document returned immediately, Gemini never called.

---

## Universal Checklist (Sections A–K)

| Section | Name |
|---------|------|
| A | Document Completeness & Formality |
| B | Prior Written Authorization |
| C | Scope Verification |
| D | Quantity Verification |
| E | Rates Verification |
| F | Duplicate Claim Check |
| G | Arithmetic Verification |
| H | Extension of Time |
| I | Third-Party & Specialist Costs |
| J | Red Flag Triggers (10 triggers) |
| K | Provisional Daywork (10 individual checks) |

---

## Key Features

- **Auto contract extraction** — Gemini reads uploaded contract/BOQ PDFs and extracts project name, contract number, value, standard (SIA 118/FIDIC/NRM), dates, retention %, liquidated damages
- **Pass 1 bypass** — PM can override formality gate and proceed to full analysis with warning banner
- **Section K Daywork** — Detects daywork claims, checks 10 compliance rules, tracks allowance consumption with progress bar
- **Arithmetic verifier** — Post-Gemini Python check: line totals, financial breakdown, net payable
- **JSON sanitiser** — Coerces Gemini N/A/null responses to valid PASS/FAIL/FLAG before Pydantic validation
- **Query letter** — Auto-generated formal letter PM can copy/download and send to contractor
- **Cumulative register** — Tracks quantity increases across all supplements, flags >25% BOQ exceedance
- **Session reset** — Change Contract clears all session data and returns to setup
- **All amounts in CHF** — Formatted throughout

---

## Tech Stack

**Backend**
- Python 3.11+
- FastAPI + Uvicorn (port 8001)
- PyMuPDF — PDF text extraction
- Google Gemini 2.5 Flash — temperature 0
- Pydantic v2 — schema validation
- python-dotenv

**Frontend**
- React 18 + TypeScript
- Vite (port 5174, proxies `/api` → `http://127.0.0.1:8001`)
- Tailwind CSS v4
- Axios

---

## Project Structure

```
contract-guard/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, router registration
│   ├── models/
│   │   └── schemas.py             # All Pydantic models
│   ├── routers/
│   │   ├── documents.py           # Upload, session status, reset
│   │   └── supplements.py         # Analyse supplement, history, decisions
│   ├── services/
│   │   ├── gemini_client.py       # Gemini API calls (analyse + extract)
│   │   ├── pass_one_checker.py    # Regex-based Pass 1 checks
│   │   ├── arithmetic_verifier.py # Post-Gemini arithmetic validation
│   │   ├── json_validator.py      # JSON sanitiser + Pydantic validation
│   │   └── pdf_parser.py          # PyMuPDF text extraction
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── SetupScreen.tsx
        │   ├── HistorySidebar.tsx
        │   ├── ReviewScreen.tsx
        │   ├── ReportDisplay.tsx
        │   ├── ChecksGrid.tsx
        │   ├── DayworkReviewPanel.tsx
        │   ├── LineItemsTable.tsx
        │   ├── FinancialSummary.tsx
        │   ├── RedFlagCard.tsx
        │   ├── PassOneGate.tsx
        │   ├── PaymentGate.tsx
        │   ├── CumulativeRegister.tsx
        │   └── UploadBox.tsx
        ├── types/supplement.ts    # All TypeScript interfaces
        └── utils/
            ├── apiClient.ts
            └── arithmeticVerifier.ts
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/YVMAi/-EUContractValidator.git
cd -EUContractValidator
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=your_key_here
```

Get key at [aistudio.google.com](https://aistudio.google.com).

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Run

Terminal 1 — backend (from project root):
```bash
python -m uvicorn backend.main:app --reload --port 8001
```

Terminal 2 — frontend:
```bash
cd frontend
npm run dev
```

Open `http://localhost:5174`

> **Windows note:** Vite proxy target must be `http://127.0.0.1:8001` not `localhost:8001` — already set correctly in `vite.config.ts`.

---

## Usage

1. Upload base contract PDF + BOQ PDF → ContractGuard extracts project details automatically
2. Upload contractor supplement PDF → click **Analyse Supplement**
3. Review results across tabs: Analysis · Daywork Review · Line Items · Financial · Query Letter · Payment Gate
4. Copy/download query letter to send to contractor
5. Record PM decision in Payment Gate tab
6. Use **Change Contract** in sidebar to start a new project

---

## Security Notes

- `backend/.env` is gitignored — API key never committed
- All document content processed in-memory, never written to disk
- No localStorage usage for any sensitive data
- Gemini API key never exposed to frontend

---

## License

MIT
