# AI Saraj — Complete Project File Guide

> Every file in your project explained in simple language, ready for interview prep.

---

## 🔧 BACKEND (`aisaraj-backend/`)

### Root Files

| File | Purpose |
|:---|:---|
| `manage.py` | The main entry point to run Django commands like `runserver`, `migrate`, `createsuperuser`. It tells Django which settings file to use (development by default). |
| `requirements.txt` | Lists all the Python libraries the project depends on (Django, psycopg2, simplejwt, boto3, google-generativeai, etc.). Running `pip install -r requirements.txt` installs them all. |
| `.env` | Contains all secret keys and passwords (database URL, Gemini API key, GetStream keys). This file is never committed to GitHub. |
| `.env.example` | A safe, empty template of `.env` so other developers know which variables they need to fill in. |
| `db.sqlite3` | A local SQLite database file used during early development before migrating to Neon PostgreSQL. |

---

### Config Folder (`config/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Makes `config` a Python package (required by Python). |
| `urls.py` | The main URL router. Maps top-level URL paths (like `/api/v1/auth/`, `/api/v1/practice/`) to the correct app's URL file. |
| `wsgi.py` | Entry point for production web servers (like Gunicorn on Render) to serve the Django app. |
| `asgi.py` | Entry point for async web servers. Similar to `wsgi.py` but for asynchronous handling. |

### Config Settings (`config/settings/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Makes `settings` a Python package. |
| `base.py` | The main settings file shared by all environments. Contains database configuration (reads `DATABASE_URL` from `.env`), installed apps, JWT token lifetimes (30 min access, 7 day refresh), CORS settings, REST Framework config, Gemini API key, and file storage settings. |
| `development.py` | Development-specific settings. Inherits everything from `base.py` and enables `DEBUG=True`. |
| `production.py` | Production-specific settings. Inherits from `base.py` and sets `DEBUG=False` with stricter security. |

---

### Core Folder (`core/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Makes `core` a Python package. |
| `exceptions.py` | Custom error handler for Django REST Framework. Formats all API errors into a consistent, clean JSON structure so the React frontend always gets predictable error messages. |
| `middleware.py` | Custom middleware that logs every incoming API request (method, URL, status code). Useful for debugging. |
| `pagination.py` | Defines a standard pagination class so that API list responses are automatically paginated (20 items per page). |
| `utils.py` | Small helper/utility functions used across the project. |

---

### AI Engine (`ai_engine/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Makes `ai_engine` a Python package. |
| `client.py` | The **Gemini API wrapper**. Initializes the `gemini-1.5-flash` model using the API key from `.env`. Has a `generate_json()` method that sends a prompt to Gemini and parses the JSON response. If Gemini is unavailable or the API key is missing, it falls back to mock (fake) responses so the app doesn't crash. |
| `services.py` | The **AI orchestration layer**. Contains `AIEngineService` class with methods like `acknowledge_answer()` (sends the user's answer to Gemini for a brief acknowledgment) and `evaluate_comprehensive()` (sends the full interview transcript to Gemini for final scoring across 5 dimensions). Also normalizes scores and determines the hiring signal. |
| `evaluator.py` | Additional evaluation helper logic for processing AI responses. |
| `resume_parser.py` | Parses uploaded resume files to extract relevant information (used for resume-based question generation). |
| `tests.py` | Unit tests for the AI engine to verify Gemini integration and mock responses work correctly. |

### AI Engine Prompts (`ai_engine/prompts/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Makes `prompts` a Python package. |
| `practice.py` | Contains the **exact text prompts** sent to Gemini for the AI Practice feature. Includes: `TRACK_BASED_QUESTIONS` (prompt to generate questions), `ACKNOWLEDGE_AND_RESPOND` (prompt to acknowledge a user's answer), `COMPREHENSIVE_EVALUATION` (the massive prompt for final scoring), and `LEETCODE_QUESTION` (prompt to generate DSA coding questions). |
| `evaluation.py` | Contains prompt templates specifically for the evaluation/scoring phase. |
| `interview.py` | Contains prompt templates for the scheduled interview feature. |

---

### Apps — Accounts (`apps/accounts/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `models.py` | Defines the **custom User model** with 3 roles: `student`, `interviewer`, `admin`. Also has fields like `avatar_url`, `phone`, `is_verified`. Uses Django's `AbstractUser` so it inherits all built-in auth features (password hashing, login, etc.). |
| `permissions.py` | Defines **4 custom permission classes**: `IsStudent` (only students allowed), `IsInterviewer` (only interviewers/admins allowed), `IsAdmin` (only admins), `IsInterviewParticipant` (only the interviewer or student linked to a specific interview). These are attached to API views to enforce role-based access. |
| `serializers.py` | Converts User model data to/from JSON. Handles registration (creates user + hashes password) and profile display. |
| `services.py` | Business logic for accounts — e.g., creating users, generating JWT tokens upon registration (auto-login feature). |
| `views.py` | API endpoints for registration (`/auth/register/`), login (`/auth/login/`), and profile retrieval. |
| `urls.py` | Maps URL paths like `/auth/register/` and `/auth/login/` to the correct view functions. |
| `admin.py` | Registers the User model in Django Admin panel so you can manage users from the admin dashboard. |
| `apps.py` | Django app configuration (just the app name). |
| `tests.py` | Unit tests for registration, login, and permission logic. |

---

### Apps — AI Practice (`apps/ai_practice/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `models.py` | Defines 4 database tables: **`PracticeSession`** (stores each interview session with tracks, difficulty, status), **`AIQuestion`** (stores each question asked), **`AIAnswer`** (stores the user's spoken/typed answer), **`PracticeEvaluation`** (stores the final AI-generated scores and feedback). |
| `serializers.py` | Converts model data to/from JSON. Validates user input (e.g., ensures selected tracks are valid: frontend, backend, dsa, or data_analyst). |
| `services.py` | The **brain of the AI Practice feature**. Contains `PracticeService` class with all the core logic: starting sessions, randomly picking questions from the question bank, acknowledging answers via Gemini, generating DSA coding questions, submitting code answers, running comprehensive evaluation, and applying score penalties (for unanswered questions, bad code, disqualification, etc.). |
| `verbal_question_bank.py` | A massive **hardcoded bank of 500+ interview questions** organized by track (Frontend → HTML, CSS, JavaScript, React) and (Backend → Node.js, Django, REST API, etc.). The backend randomly picks from this bank for each session. |
| `dsa_prompts.py` | Contains the **50 most-asked DSA problems** (Two Sum, Reverse Linked List, Coin Change, etc.) with full problem statements, examples, and constraints formatted exactly like LeetCode. |
| `views.py` | API endpoints for: creating a session, starting questions, acknowledging an answer, getting a DSA coding question, submitting answers, and triggering the final evaluation. |
| `urls.py` | Maps URL paths like `/practice/sessions/` and `/practice/evaluate/` to the correct views. |
| `admin.py` | Registers practice models in Django Admin for easy browsing. |
| `apps.py` | Django app configuration. |

---

### Apps — AI Interview (`apps/ai_interview/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `models.py` | Defines 4 database tables for the **scheduled interview** feature: **`AIScheduledInterview`** (stores the interview with interviewer, student, deadline, status, company name), **`AIInterviewQuestion`**, **`AIInterviewAnswer`**, and **`AIInterviewReport`** (stores the final detailed report with all 5 dimension scores, hiring signal, strengths, weaknesses, etc.). |
| `serializers.py` | Converts scheduled interview data to/from JSON. Handles creation (interviewer schedules for a student) and detailed report display. |
| `services.py` | Business logic for scheduling interviews, starting them, getting next questions, submitting answers, completing the interview, and uploading recordings. |
| `views.py` | API endpoints with **strict role-based access**: `AIInterviewCreateView` (only Interviewers can create), `StartInterviewView` (only Students can start), `ReportView` (only Interviewers can see results), `SaveReportView` (Students submit their report), `StudentListView` (Interviewers can browse students). Also handles abandoned interview cleanup. |
| `urls.py` | Maps URL paths for all scheduled interview endpoints. |
| `admin.py` | Registers scheduled interview models in Django Admin with detailed display. |
| `apps.py` | Django app configuration. |

---

### Apps — Interviews (`apps/interviews/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `models.py` | Defines models for the **human-to-human interview** feature (where a real interviewer conducts a live video call with a student using GetStream). Stores interview details, participants, and status. |
| `serializers.py` | Converts interview data to/from JSON for the live interview feature. |
| `services.py` | Business logic for creating video call rooms, generating tokens, and managing live interviews. |
| `views.py` | API endpoints for creating, listing, and managing live human interviews. |
| `urls.py` | Maps URL paths for live interview endpoints. |
| `admin.py` | Registers interview models in Django Admin. |
| `apps.py` | Django app configuration. |

---

### Apps — Code Execution (`apps/code_execution/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `services.py` | Contains `SandboxService` — runs the candidate's submitted code in a safe, isolated environment and captures the output (stdout, stderr, errors). This is used during the DSA coding round to execute the candidate's code. |
| `views.py` | API endpoint that accepts code + language, runs it through the sandbox, and returns the execution result (output or error). |
| `urls.py` | Maps the `/execute/` URL to the code execution view. |
| `apps.py` | Django app configuration. |
| `tests.py` | Tests for the code execution sandbox. |

---

### Apps — Video (`apps/video/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `interfaces.py` | Defines the **abstract base class** `VideoProvider` — a blueprint that any video service (GetStream, Zoom, etc.) must follow. Ensures all providers have `create_call()`, `generate_user_token()`, `end_call()`, and `get_recording_url()` methods. |
| `services.py` | `VideoService` facade — reads `VIDEO_PROVIDER` from settings and creates the correct provider. Currently only supports GetStream. This design makes it easy to swap to a different provider in the future. |
| `apps.py` | Django app configuration. |

### Video Providers (`apps/video/providers/`)

| File | Purpose |
|:---|:---|
| `__init__.py` | Package initializer. |
| `getstream.py` | The **GetStream implementation** of `VideoProvider`. Uses the GetStream SDK to create video call rooms, generate secure user tokens, end calls, and fetch recording URLs. Used for live human-to-human interviews. |

---

---

## 🎨 FRONTEND (`aisaraj-frontend/`)

### Root Files

| File | Purpose |
|:---|:---|
| `package.json` | Lists all JavaScript dependencies (React, react-router-dom, axios, etc.) and defines scripts like `npm start` and `npm run build`. |
| `package-lock.json` | Locks the exact versions of all dependencies to ensure consistent installs. |
| `vercel.json` | Configuration for deploying the frontend to Vercel. Contains rewrite rules so React Router works properly on Vercel. |
| `.env.example` | Template showing the required environment variables: `REACT_APP_API_URL` (backend URL) and `REACT_APP_GETSTREAM_API_KEY`. |
| `.gitignore` | Tells Git to ignore `node_modules` and other unnecessary files. |

---

### Source Entry (`src/`)

| File | Purpose |
|:---|:---|
| `index.js` | The very first JavaScript file that runs. It mounts the React `<App />` component into the HTML page. |
| `index.css` | Global CSS styles applied across the entire application (colors, fonts, backgrounds, layout). |
| `App.js` | The root React component. Wraps the entire app with `AuthProvider` (for login state) and `AppRouter` (for page navigation). |

---

### API Layer (`src/api/`)

| File | Purpose |
|:---|:---|
| `client.js` | Creates a pre-configured **Axios instance** with the backend base URL. Automatically attaches the JWT Access Token to every API request. Also has an interceptor that silently refreshes expired tokens using the Refresh Token. |
| `auth.js` | API functions for authentication: `register()` and `login()`. Calls the backend `/auth/register/` and `/auth/login/` endpoints. |
| `aiPractice.js` | API functions for the AI Practice feature: `createSession()`, `startQuestions()`, `acknowledgeAnswer()`, `getLeetCode()`, `submitAnswer()`, `evaluate()`. |
| `aiInterview.js` | API functions for the Scheduled Interview feature: `getAIInterview()`, `startAIInterview()`, `saveInterviewReport()`, `getStudents()`, `createAIInterview()`. |
| `interviews.js` | API functions for the live human-to-human interview feature: creating rooms, getting tokens, listing interviews. |
| `codeExecution.js` | API function to send code to the backend for execution and receive the output. |

---

### Context (Global State) (`src/context/`)

| File | Purpose |
|:---|:---|
| `AuthContext.jsx` | Creates a **React Context** that stores the currently logged-in user's data and JWT tokens globally. Every component in the app can access the user's info without passing it through props. Handles login, logout, and auto-loading user from localStorage on page refresh. |
| `AISessionContext.jsx` | Creates a React Context for the current AI Practice session state (session ID, questions, current index). Allows multiple components to share session data without prop drilling. |
| `InterviewContext.jsx` | Creates a React Context for the live interview state (call ID, participants). |

---

### Custom Hooks (`src/hooks/`)

| File | Purpose |
|:---|:---|
| `useAuth.js` | A shortcut hook that lets any component easily access the `AuthContext` (current user, login/logout functions). |
| `useSpeech.js` | The **core speech hook**. Wraps the browser's Web Speech API. Provides: `speak()` (text-to-speech), `startListeningWithSilenceDetection()` (speech-to-text with automatic 5-second silence detection), `stopListening()`, `getFinalTranscript()`, `isSpeaking`, and `isListening` states. This is the engine behind the entire voice-driven interview. |
| `useCodeExecution.js` | Hook that calls the backend code execution API, manages loading/result states, and returns the execution output. Used in the DSA coding round. |
| `useMediaRecorder.js` | Hook that uses the browser's `MediaRecorder` API to record audio/video from the webcam stream. Can be used to save interview recordings. |
| `useVideoCall.js` | Hook that manages the GetStream video call connection — joining a call, leaving, and handling stream state. Used for live human interviews. |

---

### Components (`src/components/`)

| File | Purpose |
|:---|:---|
| `CodeEditor/CodeEditor.jsx` | A code editor component (likely using Monaco or a textarea) where the candidate writes their DSA solution during the coding round. Supports language selection and code input. |
| `Recorder/SessionRecorder.jsx` | A component that records the interview session (audio/video) using the `useMediaRecorder` hook. Can upload the recording to the backend. |
| `VideoCall/VideoRoom.jsx` | The live video call room component. Uses GetStream's Video SDK to display the interviewer and candidate's video feeds, handle muting, and manage call controls. |
| `common/index.jsx` | Shared, reusable UI components used across the app (e.g., Navbar, ProtectedRoute, LoadingSpinner). `ProtectedRoute` redirects unauthenticated users to the login page. |

---

### Pages (`src/pages/`)

#### Auth Pages (`pages/auth/`)

| File | Purpose |
|:---|:---|
| `LoginPage.jsx` | The login page UI. Shows email/password form. On submit, calls the login API, saves JWT tokens to localStorage, and redirects to the dashboard. |
| `RegisterPage.jsx` | The registration page UI. Shows name/email/password/role form. On submit, calls the register API, auto-logs the user in (saves tokens immediately), and redirects to the dashboard without requiring a separate login. |

#### Dashboard (`pages/dashboard/`)

| File | Purpose |
|:---|:---|
| `DashboardPage.jsx` | The main dashboard — the largest file in the frontend (~33KB). Shows different views based on the user's role. **Students** see: their past practice sessions with scores, upcoming scheduled interviews, and a button to start a new AI practice. **Interviewers** see: a list of students, ability to schedule new interviews, and view detailed reports of completed interviews. |

#### AI Practice Pages (`pages/ai-practice/`)

| File | Purpose |
|:---|:---|
| `AIPracticePage.jsx` | The **most complex page** (~48KB). Contains the entire AI interview flow: Setup screen (select tracks/difficulty) → Verbal round (speech Q&A with 30s per answer, 10-min total timer) → DSA Coding round (15-min code editor) → Code Explanation (1-min spoken explanation) → Evaluation results screen. Also contains all proctoring logic (face detection via face-api.js, tab switch detection, warning system, disqualification). |
| `AIPracticePage.css` | All the CSS styles for the AI Practice page — interview layout, timer, webcam feed, score cards, progress bars, warning banners, evaluation result cards, etc. |

#### AI Interview Pages (`pages/ai-interview/`)

| File | Purpose |
|:---|:---|
| `AIInterviewPage.jsx` | Page for **Interviewers** to schedule new AI interviews. Shows a form to select a student, set topic, difficulty, tracks, deadline, and company name. |
| `AIReportPage.jsx` | Page for **Interviewers** to view the detailed report of a completed scheduled interview. Shows all 5 dimension scores, strengths, weaknesses, hiring signal, warning count, and disqualification status. Students cannot access this page. |

#### Interview Pages (`pages/interview/`)

| File | Purpose |
|:---|:---|
| `InterviewRoomPage.jsx` | The live video interview room page. Loads the GetStream video call component for human-to-human interviews. |

---

### Routes (`src/routes/`)

| File | Purpose |
|:---|:---|
| `AppRouter.jsx` | Defines all the URL routes for the React app using React Router. Maps paths like `/login`, `/register`, `/dashboard`, `/practice`, `/ai-interview/:id`, `/report/:id` to the correct page components. Wraps protected pages with authentication checks. |

---

### Utilities (`src/utils/`)

| File | Purpose |
|:---|:---|
| `constants.js` | Stores global constant values used across the app (e.g., API base URL, track labels, difficulty options). |
| `helpers.js` | Small helper functions like date formatting, score color calculation, and string truncation. |

---
