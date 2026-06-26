## 🛠️ Tech Stack Strategy
- **Core:** Python 3.12 (via `uv`), Git
- **Cloud:** Vertex AI (Gemini 3.1 Pro/3.5 Flash) globally pinned.
- **Data:** Firestore for state; Cloud SQL for relational.
- **Front-end:** Angular (Material Design) or Streamlit

## 📂 Architecture Heuristics
- **The Pluck Test:** Modules must be extractable with zero refactoring.
- **Readability > Performance:** If a function > 20 lines, it's a candidate for refactoring.
ss

