# Squat Monster

Squat Monster measures barbell speed, bar path, and force production from side-on camera footage of a barbell back squat set. 

- **Spec:** `spec.md`
- **Plan:** `plan.md` (Phases 0–8, all Q1–Q41 answered)
- **Status:** Phase 0 complete, Phase 1 implemented (UI testable in browser)

## Quick Start (Test Phase 1 UI)

1. Install dependencies and run the Expo app:
```bash
cd app
npm install
npx expo start --web
```
2. Open the URL shown (usually http://localhost:8081). Navigate: Landing (Upload primary / Record secondary) → Upload/Select → Load Inputs (plate diameter + total weight kg/lb) → Preview → Mock Analyze → Mock Report.

## Project Structure
- `app/` - Expo Router app (React Native + Web), MGS-inspired HUD theme
- `packages/shared/` - Shared constants/types (plate diameters, load units, limits)
- `server/` - FastAPI backend (Phase 3)
- `cv/` - Python/OpenCV pipeline (Phase 4–5)
- `samples/` - Test videos
- `docs/` - Camera setup, metrics, retention policy, decision log

## Notes
- Server/CV not implemented yet; analysis and report are mocked in Phase 1.
- Upload is primary flow, recording secondary. Total load (including bar) required for force.
- Source videos deleted after 30 days; no accounts/history/export in V1.
- Use only original assets (MGS-inspired style).

