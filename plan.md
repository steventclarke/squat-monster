# Squat Monster — Implementation Plan

Status: Phase 0 complete; Phase 1 in-progress/implemented (UI scaffolding) — V1 decisions fully incorporated  
Source spec: `spec.md`  
Working model: The product owner reviews and tests at the end of each phase. Feedback and new feature requests are triaged into later phases at each checkpoint.

Decision status: All clarifying questions Q1–Q41 have been answered and incorporated into the plan.

---

## 1. Product Summary

Squat Monster measures barbell speed, bar path, and force production from side-on camera footage of a barbell back squat set. The user supplies a set video — by uploading an existing video or recording in-app — specifies how much weight is on the bar, the video is analyzed with computer vision, and a report shows per-rep and set-level bar speed, force, and bar-path verticality.

V1 scope:
- Platforms: iPhone, Android, web. Web/PWA is the primary release target; native builds are used for TestFlight/internal testing.
- Lift: barbell back squat only.
- Input: one video per set. Both upload of an existing video and in-app recording are supported; uploading is the primary flow for V1 testing. Maximum 60 seconds and 100 MB; H.264/HEVC MP4/MOV.
- Load input: user specifies the total weight being lifted. Weight is required to calculate force; speed and bar-path metrics remain available without it unless confirmed otherwise (Q37, Q38).
- Camera: side-on, full body and barbell visible, including the full profile of the largest-diameter plate on the near side.
- Plate calibration: assume a 450 mm plate by default; the user may select another known diameter in setup.
- Analysis: track the center of the largest near-side plate as a proxy for bar position; derive real-world distance from the plate diameter; derive vertical acceleration and force from the load.
- Report: average and peak bar speed per rep, average and peak bar speed for the set, average and peak force production per rep and for the set, and horizontal deviation from a vertical bar path, plus rep-to-rep comparison within the set.
- Accounts: none. No cross-session history or export in V1.
- Processing: server-side with 30-day source-video retention, then automatic deletion.

Out of scope for V1 (candidates for later versions): deadlift, overhead press, bench press, power clean, barbell row, accounts/social features, set history, share/export, coaching recommendations, force-velocity profiling, power output, and normalized/bodyweight-relative force.

---

## 2. Confirmed Technical Direction

The decisions below incorporate the product-owner answers in Section 8. Items marked **(Q#)** reference the source question.

### 2.1 Architecture

Confirmed V1 architecture:

```
┌──────────────────────────────────────────────┐
│ Client: Expo / React Native + React Native Web│
│  - Landing: upload primary, record secondary  │
│  - Camera setup guidance + framing guide      │
│  - Existing-video upload / in-app recording   │
│  - Load entry + plate diameter selection      │
│  - Client-side duration/size/format checks    │
│  - Upload / analysis status                   │
│  - Report: speed, force, path, charts/overlay │
└──────────────────────┬───────────────────────┘
                       │ HTTPS (signed upload preferred)
┌──────────────────────▼───────────────────────┐
│ API: Python FastAPI on AWS                    │
│  - Video upload + validation                  │
│  - Analysis job queue/status                  │
│  - Report storage and retrieval               │
│  - Retention/deletion jobs                    │
│  - OpenAPI schema for typed client            │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│ CV worker: Python + OpenCV                    │
│  - Decode / sample frames                     │
│  - Plate detection + tracking                 │
│  - Scale calibration                          │
│  - Rep segmentation                           │
│  - Speed, force, and verticality metrics      │
│  - Diagnostic overlay video / frames          │
└──────────────────────────────────────────────┘
```

Deployment target (Q32): AWS.  
- **Platform (shared, owned by `stevenclarke-infrastructure`):** Route 53 hosted zone for `stevenclarke.dev`, TLS certificates (wildcard for CloudFront in us-east-1, Squat Monster API wildcard in us-east-1), shared VPC/subnets, GitHub OIDC and deploy roles, SSM parameter contract, monitoring/budgets.  
- **App-specific (owned by this repo):** EC2 backend for FastAPI API + CV worker (cost-optimized small instance), S3 for video/overlay assets, SQS for analysis queue, CloudFront for web/PWA, app secrets in Secrets Manager, DNS records for `squat-monster.stevenclarke.dev` and `api.squat-monster.stevenclarke.dev` (and preview variants) in the shared zone. Read shared values from SSM.  
Infrastructure is provisioned with AWS CDK in TypeScript in this repo. Development uses local disk/SQLite and a local queue so the full stack can run without AWS.

Why this direction:
- Expo gives one codebase for iOS, Android, and web, with a path to native modules if camera performance requires it.
- Server-side Python/OpenCV is the fastest way to iterate on CV, keeps heavy processing off low-end phones, and allows test clips to be rerun reproducibly (Q9, Q33).
- The CV package also runs as a local CLI for development and regression testing.
- S3 lifecycle rules can enforce the confirmed 30-day source-video retention (Q9).

Proposed repository layout:

```
squat-monster/
├── app/                  # Expo client (iOS, Android, web)
├── server/               # FastAPI app, job orchestration, storage
├── cv/                   # Python CV package + CLI + tests
├── packages/shared/      # Generated API types / shared constants (if needed)
├── samples/              # Curated test videos and expected results
└── docs/                 # Camera guide, metric definitions, runbooks
```

### 2.2 Data model (initial)

`SetAnalysis`
- `id`
- `created_at`
- `status`: `uploaded | validating | queued | processing | completed | failed | rejected`
- `failure_code`, `failure_message`
- `video_source`: `upload | recording`
- `original_filename`
- `video`: duration, width, height, fps, size, storage key
- `lift_type`: `back_squat`
- `plate_diameter_mm` (default 450; user-selectable)
- `load_kg` (total external load; canonical internal value)
- `load_input_value`, `load_input_unit` (`kg | lb`, retained for display/audit)
- `calibration`: pixels-per-mm estimate, confidence
- `reps`: list of `Rep`
- `set_metrics`: average/peak speed, average/peak force, verticality metrics, rep-to-rep comparison
- `quality`: detection confidence, warnings, rejected-frame fraction, plate-diameter mismatch warning, force-validity warning
- `processing_version`
- `source_video_expires_at` (created_at + 30 days; lifecycle-enforced)

`Rep`
- `index`
- `start_time_s`, `end_time_s`
- `concentric_start_s`, `concentric_end_s` (if defined)
- `average_speed_m_s`
- `peak_speed_m_s`
- `average_force_n` (if load supplied)
- `peak_force_n` (if load supplied)
- `vertical_displacement_mm`
- `horizontal_range_mm`, `horizontal_rms_mm`, `max_horizontal_deviation_mm`
- `path_points`: normalized per-frame `(t, x_mm, y_mm)` (or compressed)
- `confidence`

`AnalysisJob`
- `id`, `set_id`, `status`, `progress`, `attempts`, `error`, timestamps.

### 2.3 API surface (initial)

- `POST /v1/sets` — create a set record with `{video_source, lift_type}` and return a signed upload target.
- `PATCH /v1/sets/{id}` — set analysis inputs before analysis: `{plate_diameter_mm, load_kg, load_input_unit}`.
- `POST /v1/sets/{id}/video` — upload video (direct multipart for local dev; signed S3 completion in production).
- `POST /v1/sets/{id}/analyze` — validate inputs (including load) and enqueue analysis after upload validation.
- `GET /v1/sets/{id}` — status + report when complete.
- `GET /v1/sets/{id}/video` — playback URL (signed, expiring).
- `GET /v1/sets/{id}/overlay` — diagnostic/report overlay asset.
- `GET /v1/health` — service health.

V1 is anonymous and account-free (Q1); there is no cross-session history (Q12). Set records are retained for 30 days so the user can finish reviewing/retrying, and source videos are automatically deleted after 30 days (Q9).

### 2.4 CV pipeline (V1)

1. **Decode and normalize**: read metadata (including rotation/orientation from both uploaded and recorded files), correct rotation, sample frames at a bounded rate (e.g., 30 fps or native, capped for performance), optionally downscale for detection while retaining full-res for overlay. Reject unsupported codecs/containers cleanly.
2. **Plate detection**: detect the near-side weight plate as a circle/ellipse. Candidate methods: Hough circles, contour/ellipse fitting, and color/edge heuristics. Select the largest high-confidence near-side plate (Q16) and compare its measured diameter against the expected/selected diameter (default 450 mm; Q15), warning on mismatch.
3. **Tracking**: seed with detection, then track the plate center frame-to-frame using optical flow or a correlation tracker; periodically re-detect to correct drift. Smooth the trajectory and reject outliers.
4. **Scale calibration**: estimate plate diameter in pixels from the detected circle/ellipse; pixels-per-mm = detected diameter / known plate diameter. Use a robust median across frames. Flag perspective distortion and low confidence.
5. **Rep segmentation**: derive vertical position over time; smooth; detect squat cycles (eccentric descent + concentric ascent) using extrema and minimum rep duration. Automatic only, with confidence warnings (Q7); support up to 20 reps and a 300 ms minimum concentric duration (Q24).
6. **Metrics**:
   - Per rep: average and peak bar speed, average and peak force, vertical displacement, max/RMS/range horizontal deviation.
   - Set: average and peak across reps for speed and force, total rep count, consistency/variability, aggregate verticality, and rep-to-rep comparison (Q27, Q29).
   - Speed is vertical velocity, concentric phase only (Q4).
   - **Force**: derive vertical acceleration `a_y(t)` from the smoothed vertical position/velocity using a robust derivative and smoothing step, then compute vertical force as `F(t) = m × (a_y(t) + g)` during the concentric phase, where `m = load_kg` and `g = 9.80665 m/s²`. Report average force (mean of `F(t)`) and peak force (maximum smoothed `F(t)`).
   - Force uses the user-entered total external load only; it does not include bodyweight or the lifter's internal force contribution beyond the barbell load. Clarify definitions in Q37–Q41.
   - Force is sensitive to acceleration noise, so apply stronger smoothing to acceleration than to displacement, and surface a confidence/warning when the force trace is unstable.
7. **Diagnostics**: overlay tracked plate center and derived bar path; store quality metrics for the report and support debugging. Optionally include a force trace in diagnostics.
8. **Regression tests**: annotated clips with expected rep counts, speeds within ±10% (Q10), force within the agreed tolerance (Q41), and known failure cases.

### 2.5 Metric definitions

- **Bar position**: center of the tracked largest near-side plate.
- **Vertical displacement**: change in image y, converted to mm using plate-diameter scale.
- **Average rep speed**: vertical displacement during the concentric phase / concentric duration (Q4).
- **Peak rep speed**: maximum smoothed vertical velocity during the concentric phase.
- **Set average speed**: simple mean of per-rep average speeds (Q26).
- **Set peak speed**: maximum per-rep peak speed.
- **Load (`m`)**: total external weight being lifted, entered by the user, converted to kilograms. Default interpretation is total load including the bar (Q38).
- **Vertical acceleration**: second derivative of smoothed vertical bar position, with noise suppression. Default: the same 150 ms smoothing family used for speed, tuned separately for acceleration stability (Q5, Q41).
- **Force (`F`)**: vertical force applied to the barbell, `F(t) = m × (a_y(t) + g)`, in newtons. This is total force, not net force, and excludes bodyweight (Q39).
- **Average rep force**: mean of `F(t)` over the concentric phase.
- **Peak rep force**: maximum smoothed `F(t)` during the concentric phase.
- **Set average force**: simple mean of per-rep average forces.
- **Set peak force**: maximum per-rep peak force.
- **Force validity**: force metrics are shown only when a valid load is supplied and the acceleration trace meets the stability threshold; otherwise the report explains why force is unavailable (Q37, Q41).
- **Bar-path verticality** (reported per rep and for the set, Q27):
  - max absolute horizontal deviation from the reference vertical line (mm),
  - horizontal range (max x − min x, mm),
  - RMS horizontal deviation (mm),
  - ratio of horizontal path length to vertical displacement.
- **Reference vertical line**: vertical line through the bar position at the start of the concentric phase. **(Q5 unanswered — default assumed; confirm before Phase 5.)**
- **Peak smoothing**: 150 ms moving average or Savitzky–Golay window. **(Q5 unanswered — default assumed; confirm before Phase 5.)**
- **Rep-to-rep comparison**: within-set differences/trend across reps (e.g., speed change from first to last rep); no cross-set comparison in V1 (Q29).

### 2.6 Non-functional targets (initial)

- Video upload, in-app recording, and analysis work on supported iOS/Android devices and modern mobile/desktop browsers. Exact minimum OS/browser versions are pending Q30; the working default is iOS 16+, Android 10+, and the latest two versions of Safari/Chrome/Firefox/Edge.
- Upload and analysis feedback is immediate; target median analysis time under ~2× video duration on the reference server, with progress states.
- Clear, actionable errors for bad camera angle, missing plate, over-length/oversized video, unsupported format, insufficient visibility, invalid weight entry, and network failure.
- Video and results are private by default; source videos are deleted after 30 days (Q9).
- Accessibility: WCAG 2.1 AA where practical, readable contrast, large touch targets, screen-reader labels, reduced-motion support (Q34).
- English only (Q35), with a brief safety disclaimer (Q36).

---

## 3. Phase Plan

Each phase ends with a checkpoint: the product owner tests the build, then refinements and new features are triaged into the remaining phases. A phase is complete only when its acceptance criteria and the applicable definition of done are met.

### Phase 0 — Foundations and decision lock
**Status:** Complete (2026-10-22)

Goal: establish the repo, tooling, and agreed V1 decisions before feature work.

Work:
- [x] Record all confirmed answers in the decision log (Q1–Q41).
- [x] Scaffold the monorepo: Expo app, FastAPI server, Python CV package, shared tooling.
- [x] Set up local development structure: run scripts, environment templates (stubs), sample video folder, local upload/queue/storage adapters (stubs).
- [ ] **App-specific IaC (AWS CDK in TypeScript):** Create app CDK stacks for Squat Monster resources owned by this repo per infrastructure plan - EC2 backend (small instance for FastAPI API + CV worker), S3 for video/overlay assets, CloudFront distribution for web app if not fully delegated, SQS queue, app-specific secrets in Secrets Manager, and DNS records in the shared Route 53 zone. Read shared values (hosted zone ID, VPC/subnets, cert ARNs, deploy role ARNs) from SSM. Do **not** create shared platform resources (DNS zone, OIDC, shared VPC, certs) - those are owned by `stevenclarke-infrastructure`. Add CDK app skeleton under `infra/` or `cdk/`.
- [x] Establish CI: lint, typecheck, unit tests, Python tests; basic build checks (scaffolded).
- [x] Create initial docs: camera setup guide, metric definitions, decision log, retention policy, AWS deployment runbook outline.
- [x] Define a synthetic/mock analysis result and a stub API contract so client work can proceed independently.
- [x] Add a design system inspired by the Metal Gear Solid series (Q14): tactical/military HUD feel, high-contrast typography, codec/radio-inspired panels, muted palette with signal-accent colors. Use original assets only; do not reproduce copyrighted artwork, logos, or fonts. Include colors, typography, spacing, primary/secondary buttons, and layout shell.
- [x] Define the upload-first and recording-second navigation model so Phase 1 and Phase 2 share one flow.

Acceptance criteria:
- [x] Fresh clone can run client (Phase 1) via documented commands; server and CV tests to be added in later phases.
- [x] CI scaffold in place.
- [x] Key V1 decisions are recorded in the decision log for Q1–Q41.
- [x] A mock analysis response is available for UI development.
- [x] Design tokens and MGS-inspired direction are documented and reviewable.

Checkpoint: review decisions, stack, and scaffold. **Complete.**

---

### Phase 1 — Landing page, video import entry point, and camera setup guidance
**Status:** Implemented (2026-10-22) — testable via `npx expo start --web`

Goal: deliver the first testable user-facing experience without real analysis.

Work:
- [x] Landing screen with **"Upload a set video" as the primary action** (Q2) and "Record a set" as the secondary action.
- [x] Camera/setup instructions: side-on angle, full body and barbell in frame, full near-side plate profile visible, phone stability, lighting, framing diagram/illustration, plate-diameter selector (default 450 mm; Q15), and explanation that total weight must be entered for force (Q37).
- [x] Responsive layout for phone, tablet, and desktop web.
- [x] Navigation shell: Landing → Upload/Select → Load/Inputs → Preview → (placeholder) Analyzing → (placeholder) Report; Landing → Record → Load/Inputs → (placeholder) Preview.
- [x] File-picker entry point stub on all platforms (actual upload handling in Phase 2).
- [x] Camera permission request flow and permission-denied guidance for the recording path (stubs).
- [x] Platform capability detection with user-friendly messaging (stubs).
- [x] Apply the MGS-inspired visual direction to the landing, setup guide, and navigation shell (Q14).
- [x] Minimum OS/browser support messaging based on Q30.
- [x] Accessibility pass on primary flows (basic).
- [x] UI test coverage for navigation, permission states, and upload-first layout (to be expanded).

Acceptance criteria:
- [x] App runs on iOS, Android, and web (via Expo).
- [x] Landing page clearly explains setup and makes uploading an existing video the primary path, with recording available as a secondary path.
- [x] Plate-diameter selection is discoverable with 450 mm as the default.
- [x] Load entry UI is present with kg/lb selection and validation (Q37, Q38).
- [x] Permission states are handled gracefully (stubs).
- [x] Primary action is reachable and labeled consistently across platforms.

Checkpoint: product-owner review of look, feel, copy, setup guidance, and upload-first entry. **Ready for review.**

---

### Phase 2 — Video import, recording, validation, and local preview

Goal: accept a set video by upload (primary) or recording (secondary) and enforce V1 input constraints.

Work:
- Implement the upload path first:
  - web: file input and drag-and-drop,
  - iOS: photo-library selection,
  - Android: system document/photo picker.
- Validate format/container/codec (H.264/HEVC MP4/MOV), duration (≤60 s), and file size (≤100 MB) before upload (Q8). Reject unsupported or over-limit files with guidance to trim externally (Q3); no in-app trim and no on-device transcode.
- Extract and display metadata: duration, resolution, fps, file size, orientation; handle rotation metadata correctly.
- Implement cross-platform recording behind a camera abstraction:
  - native: Expo camera recording (targeting 1080p/30 fps, device defaults where unavailable, Q19),
  - web: `getUserMedia` + `MediaRecorder`.
- In-app recording screen with elapsed timer, stop/finish control, 60-second countdown/warning, and retake.
- After upload or recording: load/inputs screen with plate-diameter selection (default 450 mm, Q15), weight entry in kg or lb, and validation. Weight is required to compute force (Q37); speed and path may still be computed if confirmed, but default is require load for the full V1 report (Q38).
- After upload or recording: local preview, replay, replace/reselect, retake, and continue actions.
- Handle interruption cases: backgrounding, denied permission mid-flow, storage failure, unsupported codec, picker cancellation, and invalid weight input.
- Upload progress shell (actual server upload can be stubbed until Phase 3).
- Tests for format/size/duration boundaries, cancellation, retake, rotation metadata, and load validation.

Acceptance criteria:
- An existing video can be selected and previewed on all three platforms; in-app recording also works on all three platforms.
- Videos over 60 seconds, over 100 MB, or in unsupported formats cannot proceed to analysis.
- User can enter total weight in kg or lb and is prompted if missing/invalid.
- Plate diameter can be selected with 450 mm as default.
- Rejection messaging tells the user exactly how to fix the issue.
- Uploaded/recorded videos survive the review step and can be replaced or retaken cleanly.
- Rotation metadata is respected so portrait and landscape footage previews correctly.

Checkpoint: test with owner-provided existing videos first, then live recordings; review capture UX and load-entry constraints.

---

### Phase 3 — Upload, analysis job pipeline, and report shell

Goal: connect the client to the server with a complete end-to-end flow using a mock analyzer.

Work:
- Implement set creation, inputs update (`plate_diameter_mm`, `load_kg`, `load_input_unit`), signed upload, analysis enqueue, status polling, and result retrieval.
- Add server-side validation (do not trust client checks): duration, file size, MIME type, codec, corruption, and that a valid load has been supplied before enqueuing analysis (Q37).
- Implement async job runner with states, retries, and timeouts. Use an in-process/local queue for development and SQS + ECS worker adapters for production (Q32).
- Storage abstraction: local disk for development, S3 for deployment. Add a 30-day lifecycle/retention job for source videos (Q9).
- Generate a mock report from a deterministic fixture for UI development, including force values.
- Client screens: load-input validation, upload progress, analysis in progress (with cancel/retry), analysis failed, report placeholder.
- Keep only the in-progress/recent set available for retry within the session; no cross-session history (Q12).
- Add API tests and contract tests against the OpenAPI schema.
- Add basic observability: structured logs, job timing, error codes.

Acceptance criteria:
- An uploaded video (primary path) and a recorded video both upload and return a mock report including force when load is supplied, end-to-end on all platforms.
- Job status is visible, recoverable, and honest about failures.
- Server rejects invalid media and missing/invalid load with actionable error codes.
- Source-video retention metadata is recorded and the deletion mechanism is demonstrated in development.
- API contract is documented and tested.

Checkpoint: run the full flow with real uploaded videos and mock results; review status/error UX and retention behavior.

---

### Phase 4 — CV core: plate detection and tracking

Goal: reliably track the near-side weight plate in representative squat videos.

Work:
- Build the CV CLI: input video → per-frame plate center, radius/ellipse, confidence, diagnostics.
- Assemble a test corpus from owner-provided existing videos plus new recordings: varied lifters, plate diameters, backgrounds, lighting, camera distances, phone orientations, and failure cases (occlusion, cropped plate, motion blur, non-side-on angles).
- Implement and compare detection strategies:
  - Hough circle detection,
  - contour/ellipse fitting,
  - learned detector fallback if classical methods are insufficient.
- Select the largest near-side plate and warn when its measured diameter is inconsistent with the selected diameter (Q15, Q16).
- Implement tracking with re-detection and drift correction; handle temporary occlusion.
- Add smoothing and outlier rejection; preserve raw data for diagnostics.
- Produce an overlay video showing detections and trajectory.
- Define quality gates: minimum valid-frame fraction, detection confidence thresholds, warning/rejection criteria.
- Write regression tests with expected tracking behavior within tolerance.
- Document known limitations and camera-angle requirements.

Acceptance criteria:
- Plate center tracking succeeds on ≥90% of valid V1 clips in the test corpus (Q10 target).
- Overlay clearly demonstrates correct tracking on both uploaded and recorded clips.
- Failure modes are detected and surfaced as actionable quality warnings rather than silent bad reports.
- Incorrect plate selection or diameter mismatch produces a warning.
- CV CLI runs reproducibly in CI on a small fixture set.

Checkpoint: review overlay videos and failure cases; decide whether accuracy is sufficient to proceed or needs another CV iteration.

---

### Phase 5 — Calibration, rep segmentation, and metrics

Goal: turn tracked plate motion into the required V1 report metrics.

Work:
- Implement scale calibration from the selected plate diameter (default 450 mm, Q15) and validate against known distances.
- Implement automatic rep segmentation with confidence scoring (Q7); support up to 20 reps and a 300 ms minimum concentric duration (Q24).
- Implement per-rep and set metrics per confirmed definitions: vertical velocity during the concentric phase (Q4), simple mean of per-rep averages for set average (Q26), max/RMS/range horizontal deviation per rep and for the set (Q27), and rep-to-rep comparison (Q29).
- Implement force calculation: compute vertical acceleration from smoothed position/velocity, apply `F(t)=m(a_y+g)`, and produce per-rep average/peak force and set average/peak force (Q37–Q41). Exclude bodyweight; treat load as total external load (Q39). Flag unstable acceleration traces.
- Confirm Q5 before finalizing metric output: peak smoothing window and the vertical reference line. Use the documented defaults until then.
- Confirm Q37–Q41: require load for force or allow speed-only fallback? Units for load entry (kg/lb)? Is total load including the bar assumed? Tolerance for force validation?
- Add metric unit tests with synthetic trajectories and golden clips (including a synthetic force test).
- Validate rep count exactly and speeds within ±10% on owner-provided clips (Q10); validate force within the agreed tolerance (Q41); compare against manual frame annotation or known tempo where possible.
- Add quality scoring: warn or fail when calibration confidence, tracking coverage, rep detection is poor, or force is unstable/unavailable. Show partial results with prominent warnings when usable data exists (Q11).
- Store versioned analysis output for reproducibility (Q23).
- Document metric definitions in-product (tooltips/help) and in `/docs`, including the assumptions behind force (total load, no bodyweight, etc.).
- Add analysis performance profiling and frame-sampling tuning.

Acceptance criteria:
- Reports include per-rep average/peak speed, set average/peak speed, per-rep average/peak force, set average/peak force, and max/RMS bar-path verticality metrics for each rep and the set (when load supplied).
- When load is missing/invalid, the app clearly explains why force is unavailable and still shows speed and bar-path metrics if possible.
- Golden-clip results meet the Q10 tolerances for rep count and speed, and Q41 tolerance for force where applicable.
- Low-confidence rep segmentation and unstable force traces are surfaced, and unusable inputs are rejected rather than given misleading numbers.
- Metric definitions are documented and match what the UI displays.
- Q5 and Q37–Q41 are resolved and the implementation matches the recorded decisions.

Checkpoint: validate numbers against real uploaded lifting footage and agreed reference measurements; confirm Q5 and Q37–Q41 and refine definitions if needed.

---

### Phase 6 — Report experience

Goal: deliver a clear, useful report per set.

Work:
- Report screen with:
  - headline set summary (rep count, set average/peak speed, set average/peak force when available, overall verticality),
  - rep-to-rep comparison within the set, e.g., change in average speed and/or force from first to last rep (Q29),
  - per-rep table/cards (average and peak speed, average and peak force if available, displacement, max/RMS verticality),
  - bar-path visualization with vertical reference line and horizontal deviation (Q22),
  - speed-over-time and displacement-over-time charts; force-over-time chart when force is available,
  - video playback with tracked plate center and bar-path overlay (Q22),
  - quality/confidence warnings, including plate-diameter mismatch, low-confidence reps, missing/invalid load, or unstable force,
  - unit labels (m/s, N or kN, mm; clarify force units in Q40) and metric definitions, including force assumptions,
  - clearly labeled states: "Force unavailable" with reason when load missing/invalid or calculation unreliable.
- Responsive chart/layout behavior on small screens.
- Handle partial reports: some reps low confidence, incomplete tracking, analysis warnings, partial force availability.
- Apply the MGS-inspired visual language to the report, using it to reinforce hierarchy and data readability rather than hiding content.
- Add report actions: new set / analyze another video only. No share, export, download, or social features in V1 (Q13).
- Accessibility pass on charts (non-visual summaries, table alternatives).
- Polish empty/loading/error states.
- Snapshot/UI tests for representative reports.

Acceptance criteria:
- A completed analysis produces a readable report on all platforms.
- Required V1 metrics are present and clearly labeled, including per-rep and set verticality, rep-to-rep comparison, and force when available.
- When force is unavailable, the reason is stated and speed/path metrics are still shown.
- Bar path and video overlay agree with the tracked data.
- Warnings are visible without overwhelming the report.
- Product owner can use the report to evaluate a real uploaded set.

Checkpoint: product-owner review of report content, charts, and clarity; triage refinements.

---

### Phase 7 — V1 UX polish, reliability, and privacy completion

Goal: finish the account-free, no-history V1 experience and make it production-ready at the UX level.

Work:
- Refine onboarding, camera setup guidance, load-entry UX, and the upload-first vs record-secondary choice based on checkpoint feedback.
- Improve handling of interrupted journeys: upload retry/resume where practical, app-restart recovery for the in-progress set only, and clear next steps.
- Show 30-day retention messaging and how to start a new analysis (Q9); do not build history, export, or sharing (Q12, Q13).
- Add in-app explanation of force assumptions and limitations (Q39, Q40).
- Performance tuning: upload chunking/resume, thumbnail/preview sizing, chart rendering, and analysis polling backoff.
- Broader device/browser testing and accessibility audit against WCAG 2.1 AA where practical (Q34).
- Privacy policy and in-app data-handling copy, including the safety disclaimer (Q36).
- Externalize copy for future localization, but ship English only (Q35).
- Final MGS-inspired visual polish across all screens (Q14).

Acceptance criteria:
- The complete V1 flow works consistently across the supported device/browser matrix.
- Users can recover from interrupted uploads or analysis without confusing state or unnecessary re-selection where practical.
- Retention and privacy messaging is accurate and accessible.
- Performance and accessibility audits pass agreed thresholds.
- No history/export/share features are present or promised in V1.

Checkpoint: product-owner review of the complete V1 experience.

---

### Phase 8 — Release hardening and launch

Goal: deploy V1 safely.

Work:
- Production deployment on AWS (Q32): App CDK provisions EC2 backend, S3 for video/overlay, SQS queue, CloudFront for web/PWA, app secrets in Secrets Manager, and DNS records in shared Route 53 zone. Platform CDK provisions shared zone/certs/VPC/OIDC/roles/SSM. Use EC2 (not ECS Fargate) per platform plan for Squat Monster backend.
- Read platform values from SSM (hosted zone ID, VPC/subnets, cert ARNs, deploy role ARNs). Create app-specific DNS records via scoped permissions.
- Environment configuration, secrets management, backups, and infrastructure-as-code (app CDK stacks under `infra/` or `cdk/`, environments preview/prod).
- Monitoring/alerting via CloudWatch: error rates, job failures, processing latency, storage growth, retention job health.
- Rate limiting, upload size limits, abuse protections, and cost controls.
- Privacy/security review: transport security, signed URLs, 30-day source-video deletion and S3 lifecycle enforcement, set-record retention, and deletion verification.
- Release primary as web/PWA; produce native builds for TestFlight/internal testing. App Store/Play Store public release is not required for V1 (Q31).
- Release checklist, rollback plan, and runbook.
- End-to-end test on the supported device/browser matrix with production-like settings; resolve Q30 before finalizing the matrix.
- Final regression pass on the CV corpus and golden metrics.
- Publish privacy policy and safety disclaimer.

Acceptance criteria:
- Production build is deployed and usable on supported platforms, with web/PWA as the primary release.
- Monitoring and alerts are active.
- Rollback procedure is documented and tested.
- Source videos and set records follow the confirmed retention policy, with deletion verified.
- Privacy/data retention behavior matches published policy.
- V1 acceptance checklist signed off by product owner.

Checkpoint: launch readiness review.

---

## 4. Cross-Phase Definition of Done

A phase is done when:
- Acceptance criteria are met.
- Relevant unit/integration/UI tests pass.
- Lint and typecheck pass for all changed code.
- Manual smoke test completed for the upload path on at least one iOS device, one Android device, and web, plus the recording path where applicable.
- Error, empty, loading, offline, and over-limit states are handled for new flows.
- Privacy/retention implications of new data flows are documented.
- New decisions are recorded in the decision log.
- Docs updated for any user-facing behavior, metric definition, or operational step.
- No known critical bugs or security issues.

## 5. Testing Strategy

- **Unit tests**: metric calculations, validation rules, rep segmentation, calibration math, API error handling.
- **CV regression tests**: a small committed fixture corpus in CI plus a larger local corpus; golden metrics with tolerances; overlay snapshots.
- **API contract tests**: OpenAPI schema validation; client generated types stay in sync.
- **Client tests**: navigation, permission states, recording state machine, upload states, report rendering.
- **End-to-end tests**: upload-first happy path and key failure paths on web; recording path; device smoke tests for native. Include load entry and force calculation paths.
- **Manual test matrix**: iPhone (recent + older supported), Android (recent + older supported), mobile Safari/Chrome, desktop browsers; portrait/landscape; varied lighting and plate types. Finalize against Q30 once confirmed.
- **Upload fixture tests**: real MP4/MOV files with rotation metadata, HEVC/H.264, variable frame rate, 60 s boundary, 100 MB boundary, and unsupported containers.
- **Force validation tests**: synthetic trajectories with known mass/acceleration to verify `F = m(a + g)`, tolerance tests against Q41, and tests for missing/invalid load and unstable acceleration.
- **Retention tests**: verify S3 lifecycle/retention behavior and source-video deletion in a staging environment.
- **Performance tests**: analysis time, upload time on constrained networks, chart/render time.

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Plate detection fails on real-world footage | Core feature unusable | Early CV spike in Phase 4; owner-provided corpus; quality gates; camera-angle guidance; fallback detector |
| Perspective/tilt distorts apparent plate diameter | Speed calibration wrong | Fit ellipse; require side-on framing; confidence checks; validate against known distances |
| Rep segmentation errors | Wrong per-rep metrics | Confidence scoring; conservative thresholds; automatic only, so make low-confidence reps visually explicit |
| Cross-platform camera differences | Broken capture on some devices | Abstraction layer; early device testing; native fallback if Expo capture is insufficient |
| Existing-video variability (rotation, HEVC, variable frame rate, foreign audio) | Upload fails or analysis is wrong | Normalize metadata; validate codec/container server-side; reject unsupported files clearly; test corpus includes real uploaded clips |
| Large uploads / slow processing | Poor UX and cost | Enforce 60 s/100 MB limits; signed S3 uploads; progress and async jobs; tune sampling |
| Privacy concerns with lifting videos | Trust and compliance | Private-by-default storage, S3 30-day lifecycle deletion, minimal metadata, no accounts |
| Scope creep from future lifts | Delays V1 | Keep lift type extensible in data model, but only implement back squat |
| Unresolved Q5 metric definition | Numbers not trusted or rework in Phase 5/6 | Confirm Q5 before Phase 5; show definitions in UI; golden tests |
| Force accuracy and definition ambiguity | Misleading force values | Confirm Q37–Q41; use `F=m(a+g)`, state assumptions in UI, test with synthetic data, reject/show warnings if unstable or load missing |
| MGS-inspired branding drifts into copied assets | Legal/IP risk | Use original assets and a style guide; no copyrighted artwork, logos, fonts, or direct UI copies |
| No public app-store release | Distribution expectations mismatch | Confirm web/PWA primary + TestFlight/internal builds; revisit stores post-V1 |

## 7. Checkpoint and Triage Process

At the end of each phase:
1. Product owner runs the build and tests against the phase acceptance criteria.
2. Product owner logs refinements and feature requests using the template below.
3. We classify each item as: fix now (blocks phase), next phase, later/V1.x, or out of scope.
4. Approved items are inserted into the remaining phases in `plan.md`; the decision log is updated.
5. The next phase starts only after the checkpoint is signed off or blockers are triaged.

Triage template:

```
Checkpoint: Phase N
Tester:
Build/commit:
Device/browser:

Feedback items:
- [ ] Item — type (bug/refinement/feature) — proposed phase — priority (P0/P1/P2) — notes

Decisions changed:
Open questions added:
Sign-off:
```

## 8. Clarifying Questions (answered 2026-10-22, updated for force)

Answers below are incorporated into the plan. Two original questions remain blank (Q5, Q30), and five new questions about load/force are added as **UNANSWERED** with defaults; they must be confirmed before their dependent phases.

Key confirmations:
- Existing-video upload is the primary V1 flow; in-app recording remains available (Q2).
- Server-side processing on AWS; source videos are deleted after 30 days (Q9, Q32).
- No accounts, history, or export in V1 (Q1, Q12, Q13).
- 450 mm default plate, user-selectable; track the largest near-side plate (Q15, Q16).
- MGS-inspired visual direction, using original assets only (Q14).
- Load is user-entered to compute average and peak force per rep and set (new scope).

### A. Product and scope

| # | Question | Default if unanswered | Answer |
|---|---|---|---|
| Q1 | Is V1 free and account-free, or is there a login/subscription/business model to design for? | Account-free, free V1 | Account-free |
| Q2 | Should users be able to upload an existing video, or only record in-app? | Record in-app only for V1 | Upload existing videos should be primary user flow for V1, as I will be testing with existing videos |
| Q3 | Should users be able to manually trim a video longer than the limit, or must they re-record? | Reject with guidance; no in-app trim in V1 | Reject with guidance; no in-app trim in V1 |
| Q4 | What exactly should "bar speed" mean: vertical velocity only, or speed along the actual bar path? Should the report show concentric-only or full-rep (eccentric + concentric) speed? | Vertical velocity; concentric phase only | Vertical velocity; concentric phase only |
| Q5 | What smoothing should be applied to peak speed, and from what reference should horizontal bar-path deviation be measured (start position, end position, or a fitted vertical line)? | 150 ms smoothing; reference is the vertical line through the bar at concentric start | 150 ms smoothing; concentric-start vertical line |
| Q6 | What units should the report use (m/s, cm/s, in/s, mm)? Should units be user-selectable? | m/s for speed, mm for path deviation; no switching in V1 | m/s for speed, mm for path deviation; no switching in V1 |
| Q7 | Is automatic rep detection sufficient, or must users be able to add/remove/adjust rep boundaries? | Automatic only, with confidence warnings | Automatic only, with confidence warnings |
| Q8 | What is the maximum file size, and which codecs/containers must be accepted? Should the app transcode on-device? | 100 MB, H.264/HEVC MP4/MOV; no on-device transcode in V1 | 100 MB, H.264/HEVC MP4/MOV; no on-device transcode in V1 |
| Q9 | Must analysis be fully on-device (privacy/offline), or is server-side processing acceptable? Any data residency or retention requirements? | Server-side processing; delete source video after 30 days unless user saves the set | Server-side processing; delete source video after 30 days |
| Q10 | Which metric definitions and tolerances are acceptable for V1 accuracy? Is there a reference system or manual annotation process to validate against? | Validate rep count exactly and speeds within ±10% on owner-provided clips | Validate rep count exactly and speeds within ±10% on owner-provided clips |
| Q11 | What should happen when analysis confidence is low: show results with warnings, show partial results, or reject and ask for a re-record? | Show results with prominent warnings; reject only when no usable tracking exists | Show results with prominent warnings; reject only when no usable tracking exists |
| Q12 | Should sets be saved/history-enabled? If so, locally only or on the server? Any accounts? | No cross-session history in V1; recent set available for retry only | No cross-session history in V1; recent set available for retry only |
| Q13 | What report actions are required in V1: share, export CSV/PDF, download overlay video, social share? | None beyond in-app viewing and new set | None beyond in-app viewing and new set |
| Q14 | Is there a preferred app name, branding, logo, color palette, or tone of voice? | "Squat Monster"; bold, energetic, high-contrast visual style to be proposed | "Squat Monster"; base aesthetic off the Metal Gear Solid series, using original assets only (no copyrighted artwork, logos, fonts, or direct UI copies) |
| Q37 | Is weight/load entry required for V1, or should force be computed only when provided? Should speed and bar path still be shown without weight? | Require weight to enable the full V1 report (show speed/path only as fallback); confirm UX | require total load to compute force; still show speed and bar-path metrics if load missing, but mark force as unavailable |
| Q38 | What units should load be entered in (kg, lb, both)? Should the bar be included in the total? | Support kg and lb; treat entry as total weight on the bar (including bar) unless stated otherwise | support kg and lb; assume total external load including the bar |
| Q39 | Should force be calculated as total force `F = m(a + g)` (including barbell mass), and should we explicitly exclude bodyweight? | Yes, total force on the barbell using the entered load; exclude bodyweight. Show assumption in report | `F = m(a_y + g)` using entered total external load, exclude bodyweight |
| Q40 | What units should force be reported in (N, kN)? Should force be normalized (bodyweight-relative)? | N for V1; no normalization in V1 | N, no normalization |
| Q41 | What tolerance is acceptable for force accuracy, and when should force be considered unreliable (acceleration noise threshold)? | Validate force against synthetic golden clips; show warnings and omit force if acceleration trace is unstable. Tolerance TBD. | derive from synthetic tests; show warning if force confidence < threshold; tolerance to be set during Phase 5 |

### B. Camera and capture

| # | Question | Default if unanswered | Answer |
|---|---|---|---|
| Q15 | Required plate diameter: should we assume a 450 mm competition plate, let the user choose plate type, or let the user enter the diameter? | Assume 450 mm; user can select another known diameter in setup | Assume 450 mm; user can select another known diameter in setup |
| Q16 | If multiple plates are visible, which one is tracked — the largest near-side plate regardless of diameter, the outermost plate, or a user-selected plate? | Largest near-side plate; warn if it is not the expected diameter | Largest near-side plate; warn if it is not the expected diameter |
| Q17 | Should the app require landscape orientation, portrait, or support both? Is the phone assumed fixed/tripod-mounted, or can it be handheld? | Both orientations; guided but not enforced tripod use; warn on excessive motion | Both orientations; guided but not enforced tripod use; warn on excessive motion |
| Q18 | Must the entire body and barbell be visible, or only the plate? Should the app enforce framing with an on-screen guide and block recording until valid? | Enforce with a framing guide and a warning, not a hard block | Enforce with a framing guide and a warning, not a hard block |
| Q19 | What video resolution/fps should be captured? Is 1080p30 acceptable, or is 4K/60 fps required? | 1080p at 30 fps, with device defaults where unavailable | 1080p at 30 fps, with device defaults where unavailable |
| Q20 | How should the user be guided on camera distance/height? Is a calibration step (e.g., tapping the plate or showing a reference size) acceptable? | Fixed guidance text plus diagram; no tap calibration in V1 | Fixed guidance text plus diagram; no tap calibration in V1 |
| Q21 | Does the near-side plate have to be clearly visible for the entire set, including possible occlusion by the lifter? What if the plate leaves frame during the lift? | Plate must be visible for all reps; occlusion warnings allowed, but analysis may fail if tracking coverage is too low | Plate must be visible for all reps; occlusion warnings allowed, but analysis may fail if tracking coverage is too low |

### C. Analysis and report

| # | Question | Default if unanswered | Answer |
|---|---|---|---|
| Q22 | Should the report show a video overlay of the tracked plate and bar path, a chart, or both? | Both | Both |
| Q23 | Should results be deterministic/reproducible for the same video? Is versioned analysis history needed? | Deterministic output per processing version; keep processing version metadata | Deterministic output per processing version; keep processing version metadata |
| Q24 | How many reps per set should be supported (upper bound), and should there be a minimum valid rep duration? | Up to 20 reps; minimum concentric duration 300 ms | Up to 20 reps; minimum concentric duration 300 ms |
| Q25 | Should tempo (eccentric/concentric/pause durations) or range of motion be included, even though not explicitly required? | Not in V1; design data model to allow later | Not in V1; design data model to allow later |
| Q26 | How should an "overall set" average speed be computed: simple mean of rep averages, mean of all concentric samples, or weighted by time/distance? | Simple mean of per-rep averages | Simple mean of per-rep averages |
| Q27 | Should bar-path verticality be reported per rep and for the set? What specific statistic is most meaningful to the user? | Per rep and set; show max deviation and RMS deviation | Per rep and set; show max deviation and RMS deviation |
| Q28 | Is a "good rep" classification or pass/fail verdict expected, or just measurements? | Measurements only in V1 | Measurements only in V1 |
| Q29 | Should the report compare reps to each other (e.g., velocity loss across the set) or to previous sets? | Rep-to-rep comparison within the set yes; previous-set comparison no in V1 | Rep-to-rep comparison within the set yes; previous-set comparison no in V1 |

### D. Platforms, operations, and design

| # | Question | Default if unanswered | Answer |
|---|---|---|---|
| Q30 | What are the minimum supported OS/browser versions and target devices? | iOS 16+, Android 10+, latest two versions of Safari/Chrome/Firefox/Edge | iOS 16+, Android 10+, latest two versions of Safari/Chrome/Firefox/Edge |
| Q31 | Is distribution via App Store/Play Store required, or is a PWA/web deployment acceptable for V1? | PWA/web first, native builds available for TestFlight/internal testing | PWA/web first, native builds available for TestFlight/internal testing |
| Q32 | Where will the app be hosted? Any cloud/provider preference, budget, or region constraints? | Managed container host + S3-compatible storage; low-cost dev tier | AWS Managed container host + S3-compatible storage; low-cost dev tier|
| Q33 | Is a backend server acceptable operationally, or must the product work without any server? | Server acceptable | Server acceptable |
| Q34 | Are there accessibility requirements beyond standard best practices? | WCAG 2.1 AA where practical | WCAG 2.1 AA where practical |
| Q35 | Any localization/language requirements for V1? | English only | English only |
| Q36 | Any legal disclaimers required (e.g., not medical/training advice, injury risk)? | Include a brief safety/disclaimer note | Include a brief safety/disclaimer note |

## 9. Decision Log

Record confirmed answers and architectural decisions here as they are made.

| Date | Decision | Source | Notes |
|---|---|---|---|
| 2026-10-22 | Stack: Expo / React Native + React Native Web, FastAPI, Python/OpenCV | Proposed, accepted for Phase 0 | Web/PWA primary release; native builds for TestFlight/internal testing |
| 2026-10-22 | V1 lift: back squat only | Spec | Data model keeps `lift_type` extensible |
| 2026-10-22 | V1 is account-free and free | Q1 | No login |
| 2026-10-22 | Upload existing video is the primary input flow; in-app recording is secondary | Q2 | Existing videos drive V1 testing |
| 2026-10-22 | Input limits: 60 s, 100 MB, H.264/HEVC MP4/MOV; reject without in-app trim/transcode | Q3, Q8 | Re-record or trim externally |
| 2026-10-22 | Bar speed = vertical velocity, concentric phase only | Q4 | m/s |
| 2026-10-22 | Peak speed smoothing and bar-path reference line | Q5 | **UNANSWERED**; default 150 ms smoothing and concentric-start vertical line, confirm before Phase 5 |
| 2026-10-22 | Units: m/s speed, mm path deviation; no unit switching | Q6 | |
| 2026-10-22 | Automatic rep detection only, with confidence warnings | Q7 | Up to 20 reps; minimum 300 ms concentric duration (Q24) |
| 2026-10-22 | Server-side processing; source videos deleted after 30 days | Q9 | Set records also retained 30 days for review/retry |
| 2026-10-22 | Accuracy target: exact rep count, speeds within ±10% on owner clips | Q10 | Validated in Phase 5 |
| 2026-10-22 | Low confidence: show results with prominent warnings; reject only when unusable | Q11 | Partial reports supported |
| 2026-10-22 | No cross-session history; recent set retained for retry only | Q12 | No accounts |
| 2026-10-22 | No share/export/download/social actions in V1 | Q13 | Only view report and start a new set |
| 2026-10-22 | Branding: MGS-inspired tactical aesthetic with original assets | Q14 | No copyrighted assets |
| 2026-10-22 | Plate diameter: 450 mm default, user-selectable | Q15 | Warning on measured mismatch |
| 2026-10-22 | Track the largest near-side plate | Q16 | |
| 2026-10-22 | Support portrait and landscape; guide tripod use but do not enforce it | Q17 | Warn on excessive motion |
| 2026-10-22 | Framing guide warns but does not hard-block recording | Q18 | Plate must be visible for all reps |
| 2026-10-22 | Target capture: 1080p/30 fps, device defaults where unavailable | Q19 | |
| 2026-10-22 | No tap calibration in V1; fixed guidance text and diagram | Q20 | |
| 2026-10-22 | Occlusion warnings allowed; analysis fails if tracking coverage is too low | Q21 | |
| 2026-10-22 | Report includes both video overlay and charts | Q22 | |
| 2026-10-22 | Deterministic analysis per processing version; keep version metadata | Q23 | No analysis history UI |
| 2026-10-22 | No tempo/ROM metrics in V1 | Q25 | Data model allows later addition |
| 2026-10-22 | Set average = simple mean of per-rep averages | Q26 | |
| 2026-10-22 | Verticality per rep and set: max deviation + RMS deviation | Q27 | Also report range where useful |
| 2026-10-22 | Measurements only; no good-rep verdict | Q28 | |
| 2026-10-22 | Rep-to-rep comparison within set; no previous-set comparison | Q29 | |
| 2026-10-22 | Minimum OS/browser support | Q30 | **UNANSWERED**; default iOS 16+, Android 10+, latest two versions of Safari/Chrome/Firefox/Edge |
| 2026-10-22 | Web/PWA primary release; native builds for TestFlight/internal testing | Q31 | No public App Store/Play Store requirement for V1 |
| 2026-10-22 | AWS deployment split: platform shared in stevenclarke-infrastructure, app resources in this repo via CDK | Q32 | Low-cost tier; app uses EC2 for backend, reads SSM from platform; IaC in this repo (CDK/TS) |
| 2026-10-22 | Backend server acceptable | Q33 | |
| 2026-10-22 | Accessibility target: WCAG 2.1 AA where practical | Q34 | |
| 2026-10-22 | English only in V1 | Q35 | Copy externalized for future localization |
| 2026-10-22 | Include a brief safety/disclaimer note | Q36 | |
| 2026-10-22 | Load entry added to compute average/peak force per rep and set | Q37–Q41 | **UNANSWERED** defaults: require load for force, support kg/lb, treat as total including bar, `F=m(a+g)` exclude bodyweight, report in N, warn if unstable; confirm before Phase 2/5/6 |

## 10. Backlog (post-V1 candidates)

- Additional lifts: deadlift, overhead press, bench press, power clean, barbell row.
- Set history, accounts, coach/athlete dashboards, and cross-set comparison.
- Share/export: CSV, PDF, overlay-video download, and social sharing.
- In-app video trimming and on-device transcoding.
- On-device/offline analysis.
- Velocity-based training insights: velocity loss, load-velocity profiling, estimated 1RM, and force-velocity profiling.
- Power output metrics.
- Bodyweight-relative force and total system force.
- Tempo, range-of-motion, and sticking-point analysis.
- Automatic camera-angle validation and live framing feedback.
- Multi-angle or multi-plate tracking.
- Apple Watch / wearable integration.
- Public App Store / Play Store release.
- Localization beyond English.
- Subscription/business model.
