# ContractGuard — AI-Powered Construction Contract Review System

## Project Overview
ContractGuard is a production-ready web application for construction Project Managers to review contractor supplement/claim documents against a memorised base contract and BOQ (Bill of Quantities).

## Architecture
- **Backend**: Python 3.11+, FastAPI, PyMuPDF, Google Gemini API (gemini-1.5-pro, temperature=0), Pydantic v2, Uvicorn port 8000
- **Frontend**: React 18 + TypeScript, Vite (port 5173, proxy /api → 8000), Tailwind CSS, Axios

## Hard Rules (Never Violate)
1. Gemini temperature MUST be 0 on every single call — no exceptions
2. GEMINI_API_KEY from .env only — never hardcoded, never in frontend
3. Pass 1 MUST run before Gemini is called — never skip it
4. Pass 1 failure MUST NOT trigger a Gemini API call — saves cost
5. Every FastAPI endpoint has proper HTTP error codes
6. Every Pydantic model validated before any response sent
7. Every React async call wrapped in try/catch with user-facing error
8. All monetary values displayed as CHF X,XXX.XX
9. JSON from Gemini always stripped of markdown fences before parsing
10. Arithmetic verification always runs after every Gemini response
11. Section J triggers always shown in a separate highlighted banner
12. Cumulative register updated after every supplement analysis
13. 10% contract value threshold always tracked and shown
14. Query letter always generated and available for download
15. Payment gate (Pass 3) cannot be reached with open Pass 2 queries
16. Mobile responsive — works on tablet minimum
17. No localStorage for any document content or API keys

## Three-Pass Review Workflow

### Pass 1 — On Receipt (automatic, no Gemini call)
Checks: contractor signature + date, written instruction reference, sequential reference number, project name + contract number, countersignature block.
Failure: Return to Contractor immediately, generate Return Notice, do NOT call Gemini.

### Pass 2 — Commercial & Technical Analysis (Gemini)
Covers Sections C-G of the Universal Checklist. Failures generate a formal query letter.

### Pass 3 — Payment Gate (manual PM sign-off)
Section K checklist. Only after all Pass 2 queries resolved.

## Universal 11-Section Checklist
- Section A: Document Completeness & Formality
- Section B: Prior Written Authorization
- Section C: Scope Verification
- Section D: Quantity Verification
- Section E: Rates Verification
- Section F: Duplicate Claim Check
- Section G: Arithmetic Verification
- Section H: Extension of Time
- Section I: Third-Party & Specialist Costs
- Section J: Red Flag Triggers
- Section K: Payment Gate

## Key Thresholds
- Quantity increase > 25% above original BOQ = HIGH severity flag + independent measurement
- Cumulative supplements approaching 10-15% of contract value = Section J trigger
- Admin surcharge must NOT be applied to third-party costs, transport, or landfill
- Any daywork rate not in signed schedule = HIGH severity rejection

## Design Tokens
- Navy: #1e3a5f | Success: #16a34a | Warning: #d97706 | Danger: #dc2626
- Hold: #ea580c | Partial: #ca8a04 | Info: #0369a1
- Background: #f8fafc | Card: #ffffff | Border: #e2e8f0 | Text: #0f172a
