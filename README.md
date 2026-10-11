# InterviewLens - Technology Stack Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Technologies](#backend-technologies)
- [Frontend Technologies](#frontend-technologies)
- [Infrastructure & DevOps](#infrastructure--devops)
- [External Services](#external-services)
- [Development Tools](#development-tools)
- [Getting Started](#getting-started)

---

## Overview

**InterviewLens** is a real-time technical interview platform with live proctoring, code execution, and video streaming capabilities. It enables interviewers to monitor candidates remotely during coding assessments with features like plagiarism detection, behavioral analysis, and real-time code synchronization.

### Key Features
- 🎥 **Live Camera Feed** - WebRTC-based real-time video streaming
- 💻 **Live Code Editor** - Real-time code synchronization with syntax highlighting
- 🔍 **Proctoring System** - Multi-face detection, tab switching, clipboard monitoring
- ⚡ **Code Execution** - Remote code compilation and testing via Judge0
- 🔒 **Secure Authentication** - JWT-based auth with OAuth support (Google, GitHub)
- 📊 **Analytics Dashboard** - Real-time metrics and performance tracking
- 🚨 **Plagiarism Detection** - Code similarity analysis using TF-IDF and cosine similarity

---

## Architecture

### System Architecture
```
┌─────────────────┐         WebSocket/WebRTC        ┌─────────────────┐
│                 │◄──────────────────────────────► │                 │
│   Candidate     │                                 │   Interviewer   │
│   (React SPA)   │         REST API (FastAPI)      │   (React SPA)   │
│                 │◄──────────────────────────────► │                 │
└─────────────────┘                                 └─────────────────┘
         │                                                   │
         │                                                   │
         └───────────────────┬───────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   FastAPI       │
                    │   Backend       │
                    │   (Python 3.10) │
                    └─────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │PostgreSQL│  │  Judge0  │  │  OAuth   │
         │ Database │  │   API    │  │ Providers│
         └──────────┘  └──────────┘  └──────────┘
```

### Communication Patterns
- **REST API**: CRUD operations for sessions, problems, users, submissions
- **WebSocket**: Real-time code sync, proctoring signals, chat
- **WebRTC**: Peer-to-peer video streaming (candidate → interviewer)

---

## Backend Technologies

### 🐍 Core Framework - Python 3.10+

#### **FastAPI** (v0.115.0)
**Purpose**: High-performance async web framework for building REST APIs

**Usage in Project**:
- RESTful endpoints for authentication, sessions, problems, submissions
- WebSocket endpoints for real-time communication
- Automatic OpenAPI/Swagger documentation
- Request validation using Pydantic models
- Dependency injection for database sessions and authentication

**Key Files**:
- `backend/app/main.py` - Application entry point, CORS, middleware
- `backend/app/api/routes/*.py` - API route handlers

**Example**:
```python
@router.post("/auth/login", response_model=TokenResponse)
async def login_interviewer(body: UserLogin, db: AsyncSession = Depends(get_db)):
    # Authentication logic with async database queries
```

---

#### **Uvicorn** (v0.30.6)
**Purpose**: Lightning-fast ASGI server

**Usage in Project**:
- Serves FastAPI application
- Handles WebSocket connections
- Auto-reload during development

**Start Command**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 🗄️ Database Layer

#### **PostgreSQL** (via asyncpg)
**Purpose**: Primary relational database

**Usage in Project**:
- Stores users, interview sessions, problems, submissions
- Proctoring signals and snapshots
- Code similarity analysis results

**Schema**:
- `users` - Interviewer and candidate accounts
- `interview_sessions` - Interview metadata and access tokens
- `problems` - Coding challenges with test cases
- `submissions` - Code submissions with execution results
- `proctoring_signals` - Real-time proctoring events
- `code_snapshots` - Periodic code state captures
- `similarity_analyses` - Plagiarism detection results

---

#### **SQLAlchemy** (v2.0.35)
**Purpose**: Async ORM for database operations

**Usage in Project**:
- Object-relational mapping for all models
- Async database queries with `AsyncSession`
- Relationships between entities (User ↔ Session ↔ Submission)
- Type-safe queries using SQLAlchemy 2.0 syntax

**Example**:
```python
async def get_session(session_id: str, db: AsyncSession):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id)
        .options(joinedload(InterviewSession.candidate))
    )
    return result.scalar_one_or_none()
```

**Key Files**:
- `backend/app/models/*.py` - Database models
- `backend/app/db/base.py` - Database session factory

---

#### **Alembic** (v1.13.3)
**Purpose**: Database migration tool

**Usage in Project**:
- Version control for database schema changes
- Migrations for adding OAuth fields, candidate email, etc.

**Files**:
- `backend/alembic/versions/*.py` - Migration scripts
- `backend/alembic.ini` - Alembic configuration

**Commands**:
```bash
alembic revision --autogenerate -m "Add new field"
alembic upgrade head
```

---

### 🔐 Authentication & Security

#### **PyJWT / python-jose** (v3.3.0)
**Purpose**: JSON Web Token (JWT) generation and validation

**Usage in Project**:
- Token-based authentication for both REST and WebSocket
- Role-based access control (interviewer vs candidate)
- Session-specific tokens for candidates
- Token expiry: 8 hours (480 minutes)

**Token Structure**:
```json
{
  "sub": "user-uuid",
  "role": "interviewer" | "candidate",
  "session_id": "session-uuid",  // Only for candidates
  "exp": 1234567890
}
```

**Key Files**:
- `backend/app/core/security.py` - Token creation/validation
- `backend/app/api/deps.py` - Authentication dependencies

---

#### **Bcrypt** (v4.2.0)
**Purpose**: Password hashing

**Usage in Project**:
- Secure password storage using bcrypt algorithm
- Password verification during login

**Example**:
```python
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
is_valid = bcrypt.checkpw(password.encode(), hashed)
```

---

#### **OAuth 2.0** (Google, GitHub)
**Purpose**: Third-party authentication

**Usage in Project**:
- Google OAuth for interviewer sign-in
- GitHub OAuth for interviewer sign-in
- Auto-creates user accounts on first OAuth login
- Links OAuth accounts to existing email-based accounts

**Flow**:
1. User clicks "Sign in with Google"
2. Redirects to Google OAuth consent screen
3. Callback returns authorization code
4. Exchange code for access token
5. Fetch user profile (email, name, avatar)
6. Create/update user in database
7. Issue JWT token and redirect to dashboard

**Endpoints**:
- `/api/auth/google/login` - Initiate Google OAuth
- `/api/auth/github/login` - Initiate GitHub OAuth
- `/api/auth/oauth/callback` - Handle OAuth callback

---

### 🔌 Real-time Communication

#### **WebSockets** (v13.1)
**Purpose**: Bidirectional real-time communication

**Usage in Project**:
- **Code Synchronization**: Candidate's code updates stream to interviewer in real-time
- **Proctoring Signals**: Face detection, tab switches, clipboard events
- **WebRTC Signaling**: Exchange SDP offers/answers and ICE candidates
- **Chat**: Communication between interviewer and AI assistant

**Message Types**:
```python
# Code update from candidate
{"type": "code_update", "language": "JavaScript", "code": "...", "problem_id": "1"}

# Proctoring signal
{"type": "signal", "signal_type": "MULTIPLE_FACES", "elapsed_seconds": 120}

# WebRTC signaling
{"type": "webrtc_offer", "offer": {...}, "sender": "user-id"}
{"type": "webrtc_ice_candidate", "candidate": {...}}
```

**Connection Management**:
- Session-based rooms (all participants in same session)
- Automatic reconnection with exponential backoff
- Role-based message filtering (interviewer vs candidate)

**Key Files**:
- `backend/app/websocket/router.py` - WebSocket endpoint and message handlers
- `backend/app/websocket/manager.py` - Connection manager

---

### 🧮 Data Processing & ML

#### **NumPy** (v2.1.1)
**Purpose**: Numerical computing library

**Usage in Project**:
- Array operations for TF-IDF vectors
- Mathematical computations for similarity scores

---

#### **Scikit-learn** (v1.5.2)
**Purpose**: Machine learning library

**Usage in Project**:
- **TF-IDF Vectorization**: Convert code into numerical vectors
- **Cosine Similarity**: Calculate code similarity percentage
- **Plagiarism Detection**: Compare candidate code against reference solutions

**Algorithm**:
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

vectorizer = TfidfVectorizer()
vectors = vectorizer.fit_transform([code1, code2])
similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
```

**Key Files**:
- `backend/app/services/similarity.py` - Similarity analysis service

---

### 🌐 External API Integration

#### **HTTPX** (v0.27.2)
**Purpose**: Async HTTP client for external API calls

**Usage in Project**:
- **Judge0 Integration**: Submit code for execution and fetch results
- **OAuth API Calls**: Exchange tokens and fetch user info from Google/GitHub
- Async/await support for non-blocking I/O

**Example**:
```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "https://ce.judge0.com/submissions",
        json={"source_code": code, "language_id": 63}
    )
```

**Key Files**:
- `backend/app/services/judge0.py` - Code execution service
- `backend/app/api/routes/auth.py` - OAuth handlers

---

### 📦 Configuration & Environment

#### **Pydantic** (v2.9.2)
**Purpose**: Data validation using Python type hints

**Usage in Project**:
- API request/response models with automatic validation
- Settings management with type checking
- Automatic JSON serialization/deserialization

**Key Files**:
- `backend/app/schemas/*.py` - Request/response schemas
- `backend/app/core/config.py` - Settings validation

---

#### **python-dotenv** (v1.0.1)
**Purpose**: Load environment variables from `.env` files

**Usage in Project**:
- Database credentials
- JWT secret key
- OAuth client IDs and secrets
- External API URLs

**Example `.env`**:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/db
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=...
JUDGE0_URL=https://ce.judge0.com
```

---

## Frontend Technologies

### ⚛️ Core Framework - React 18.3.1

#### **React**
**Purpose**: UI library for building interactive interfaces

**Usage in Project**:
- Component-based architecture
- Hooks for state management (`useState`, `useEffect`, `useRef`, `useCallback`)
- Context API for global state (authentication)
- Custom hooks for WebSocket, WebRTC, proctoring

**Key Components**:
- `CandidateInterviewPage.jsx` - Candidate coding interface
- `LiveSession.jsx` - Interviewer monitoring dashboard
- `Dashboard.jsx` - Interview session management
- `CodeEditorPane.jsx` - Syntax-highlighted code editor

---

#### **React Router DOM** (v6.26.2)
**Purpose**: Client-side routing

**Usage in Project**:
- Protected routes requiring authentication
- Role-based routing (interviewer vs candidate)
- URL parameters for session IDs
- Programmatic navigation

**Routes**:
```
/login                    - Authentication
/dashboard                - Interviewer dashboard
/interviews               - Session list
/interviews/:id           - Session details
/live-session?session=id  - Live monitoring (interviewer)
/candidate/interview      - Coding interface (candidate)
/code-analysis            - Plagiarism detection
/insights                 - Analytics
```

---

### 🎨 Styling & UI

#### **Tailwind CSS** (v3.4.13)
**Purpose**: Utility-first CSS framework

**Usage in Project**:
- Responsive design with mobile-first approach
- Custom color schemes and gradients
- Dark mode support (configured but not fully implemented)
- Component styling without separate CSS files

**Example**:
```jsx
<div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
  <h2 className="text-2xl font-bold text-gray-900">Title</h2>
</div>
```

**Configuration**:
- `tailwind.config.js` - Custom theme, colors, fonts
- `postcss.config.js` - PostCSS plugins

---

#### **Lucide React** (v0.446.0)
**Purpose**: Modern icon library

**Usage in Project**:
- Consistent icon set across the application
- Icons for navigation, actions, status indicators
- Examples: `User`, `Code2`, `Video`, `AlertTriangle`, `CheckCircle`

**Example**:
```jsx
import { Video, Wifi, AlertTriangle } from 'lucide-react'
<Video size={20} className="text-blue-600" />
```

---

### 📊 Data Visualization

#### **Recharts** (v2.13.0)
**Purpose**: React chart library

**Usage in Project**:
- **Analytics Dashboard**: Performance metrics, engagement scores
- **Code Analysis**: Similarity score visualizations
- Bar charts, line charts, area charts
- Responsive and customizable

**Example**:
```jsx
<BarChart data={engagementData}>
  <Bar dataKey="value" fill="#3B82F6" />
  <XAxis dataKey="time" />
</BarChart>
```

**Used in**:
- `Dashboard.jsx` - Engagement metrics
- `CodeAnalysis.jsx` - Similarity trends

---

### 🎥 Real-time Features

#### **WebRTC API** (Browser Native)
**Purpose**: Peer-to-peer video streaming

**Usage in Project**:
- Live camera feed from candidate to interviewer
- Uses STUN servers for NAT traversal
- WebSocket-based signaling (SDP offers/answers, ICE candidates)

**Implementation**:
```javascript
// Candidate: Start video and create offer
const stream = await navigator.mediaDevices.getUserMedia({ video: true })
const peerConnection = new RTCPeerConnection({ iceServers: [...] })
stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))
const offer = await peerConnection.createOffer()
sendMessage({ type: 'webrtc_offer', offer })

// Interviewer: Receive offer and send answer
peerConnection.setRemoteDescription(offer)
const answer = await peerConnection.createAnswer()
sendMessage({ type: 'webrtc_answer', answer })
```

**Key Files**:
- `src/hooks/useWebRTC.js` - WebRTC connection management
- Supports both candidate (sender) and interviewer (receiver) roles

**STUN Servers**:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

---

#### **WebSocket API** (Browser Native)
**Purpose**: Real-time bidirectional communication

**Usage in Project**:
- Code synchronization as candidate types
- Proctoring signal transmission
- WebRTC signaling
- Auto-reconnection with backoff

**Custom Hook**:
```javascript
const { connected, lastMessage, send } = useInterviewSocket(sessionId)

// Send message
send({ type: 'code_update', code: '...' })

// Receive message
useEffect(() => {
  if (lastMessage?.type === 'code_update') {
    updateEditorContent(lastMessage.code)
  }
}, [lastMessage])
```

**Key Files**:
- `src/hooks/useInterviewSocket.js` - WebSocket connection hook

---

### 🔍 Browser APIs

#### **MediaDevices API**
**Purpose**: Camera and microphone access

**Usage in Project**:
- Capture candidate's camera feed
- Video constraints: 1280x720 (ideal), user-facing camera
- Permission handling and error recovery

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
})
```

---

#### **Face Detection** (via Browser APIs)
**Purpose**: Detect multiple faces during interview

**Usage in Project**:
- Uses `FaceDetector` API (Chrome) or fallback canvas-based detection
- Emits proctoring signal when multiple faces detected
- Runs every 5 seconds during active interview

**Key Files**:
- `src/hooks/useProctoring.js` - Proctoring logic

---

#### **Visibility API**
**Purpose**: Detect tab/window switching

**Usage in Project**:
- Monitors `document.visibilityState`
- Emits signal when candidate switches tabs
- Tracks total time spent away from interview

---

#### **Clipboard API**
**Purpose**: Monitor clipboard activity

**Usage in Project**:
- Detects paste events (potential code copying)
- Logs clipboard content for review (privacy-respecting)
- Emits proctoring signal on paste

---

### 📝 Code Editor

#### **Highlight.js** (v11.12.0)
**Purpose**: Syntax highlighting for code

**Usage in Project**:
- Real-time syntax highlighting in code editor
- Supports: JavaScript, Python, Java, C++, C#, Go, Ruby, TypeScript
- Auto-detection and manual language selection
- Custom themes (GitHub, Atom One Dark)

**Example**:
```javascript
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'

hljs.registerLanguage('javascript', javascript)
const highlighted = hljs.highlight(code, { language: 'javascript' }).value
```

**Key Files**:
- `src/components/CodeEditorPane.jsx` - Editor component

---

### 🌐 HTTP Client

#### **Axios** (v1.20.0)
**Purpose**: HTTP client for REST API calls

**Usage in Project**:
- CRUD operations for sessions, problems, users, submissions
- Request/response interceptors for authentication
- Centralized API service layer

**Example**:
```javascript
// src/services/api.js
export const sessionsAPI = {
  getAll: () => axios.get('/api/sessions'),
  get: (id) => axios.get(`/api/sessions/${id}`),
  create: (data) => axios.post('/api/sessions', data)
}

// Usage in component
const { data } = await sessionsAPI.getAll()
```

**Interceptors**:
- Automatically adds JWT token to `Authorization` header
- Redirects to login on 401 Unauthorized

---

### 🛠️ Build Tools

#### **Vite** (v5.4.8)
**Purpose**: Frontend build tool and dev server

**Usage in Project**:
- Lightning-fast hot module replacement (HMR)
- ES modules-based development
- Optimized production builds with code splitting
- Environment variable management

**Commands**:
```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build
```

**Configuration**:
- `vite.config.js` - Vite settings, plugins, proxy

---

#### **PostCSS** (v8.4.47)
**Purpose**: CSS transformations

**Usage in Project**:
- Processes Tailwind CSS directives
- Autoprefixer for browser compatibility
- CSS minification in production

---

## Infrastructure & DevOps

### 🐘 PostgreSQL Database

**Version**: 14+

**Usage in Project**:
- Primary data store
- ACID compliance for transactional integrity
- UUID primary keys for security
- Async queries via asyncpg driver

**Schema Highlights**:
- Enum types for status fields (`SessionStatus`, `UserRole`, `SignalType`)
- Foreign key relationships with cascade deletes
- Indexes on frequently queried fields (email, access_token, session_id)

**Connection String**:
```
postgresql+asyncpg://user:password@localhost:5432/interviewlens
```

---

### 🔧 Development Tools

#### **Git & GitHub**
**Purpose**: Version control and collaboration

**Usage in Project**:
- Feature branch workflow
- `.gitignore` excludes `.env`, `node_modules`, `__pycache__`, `.venv`

---

#### **Python Virtual Environment**
**Purpose**: Isolated Python dependencies

**Setup**:
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

---

#### **npm / Node.js**
**Purpose**: Frontend package management

**Setup**:
```bash
npm install
npm run dev
```

---

### 🧪 Testing

#### **Pytest** (v8.3.3)
**Purpose**: Python testing framework

**Usage in Project**:
- Unit tests for similarity analysis
- API endpoint tests (planned)

**Run Tests**:
```bash
pytest backend/tests/
```

**Test Files**:
- `backend/tests/test_similarity.py` - Code similarity tests

---

## External Services

### ⚖️ Judge0 CE (Community Edition)

**Purpose**: Remote code execution and testing

**Usage in Project**:
- Compiles and runs candidate code submissions
- Supports 60+ programming languages
- Test case validation with stdin/stdout
- Execution time and memory limits

**API Endpoint**: `https://ce.judge0.com`

**Flow**:
1. Candidate submits code
2. Backend sends code + test cases to Judge0
3. Judge0 compiles and executes code
4. Returns output, errors, execution time
5. Backend compares output with expected results
6. Stores submission with pass/fail status

**Language IDs**:
- JavaScript (Node.js): 63
- Python: 71
- Java: 62
- C++: 54
- C#: 51

**Key Files**:
- `backend/app/services/judge0.py` - Judge0 integration

---

### 🔐 OAuth Providers

#### **Google OAuth 2.0**
**Purpose**: Interviewer authentication

**Scopes**: `openid email profile`

**Data Retrieved**:
- Email address
- Full name
- Profile picture

---

#### **GitHub OAuth**
**Purpose**: Interviewer authentication

**Scopes**: `user:email`

**Data Retrieved**:
- Email address
- GitHub username
- Avatar URL

---

### 🌍 STUN Servers (Google)

**Purpose**: WebRTC NAT traversal

**Servers**:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

**Usage**: Helps establish peer-to-peer WebRTC connections behind NATs/firewalls

---

## Getting Started

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: 14 or higher
- **npm**: 9 or higher

---

### Backend Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd InterviewLens/backend
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   .venv\Scripts\activate     # Windows
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secret key
   ```

5. **Initialize Database**
   ```bash
   alembic upgrade head
   python -m app.db.seed  # Seed problems
   ```

6. **Run Development Server**
   ```bash
   uvicorn app.main:app --reload
   # API: http://localhost:8000
   # Docs: http://localhost:8000/docs
   ```

---

### Frontend Setup

1. **Navigate to Project Root**
   ```bash
   cd InterviewLens
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment** (optional)
   ```bash
   # Create .env file if needed
   echo "VITE_API_URL=http://localhost:8000" > .env
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   # App: http://localhost:5173
   ```

---

### Create Test Data

```bash
cd backend
python create_test_data.py
```

Creates:
- Interviewer: `interviewer@test.com` / `password123`
- Candidate: `candidate@test.com` / Token: `RBXT-8710-UWOX-7059`
- Sample interview session

---

### Test Credentials

**Interviewer Login**:
- Email: `interviewer@test.com`
- Password: `password123`

**Candidate Login**:
- Email: `candidate@test.com`
- Access Token: `RBXT-8710-UWOX-7059`

---

## Project Structure

```
InterviewLens/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/       # API endpoints
│   │   │   └── deps.py       # Dependencies (auth, db)
│   │   ├── core/
│   │   │   ├── config.py     # Settings
│   │   │   └── security.py   # JWT, password hashing
│   │   ├── db/
│   │   │   ├── base.py       # Database session
│   │   │   └── seed.py       # Seed data
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   ├── judge0.py     # Code execution
│   │   │   ├── similarity.py # Plagiarism detection
│   │   │   └── analytics.py  # Metrics calculation
│   │   ├── websocket/        # WebSocket handlers
│   │   └── main.py           # FastAPI app
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
├── src/
│   ├── components/           # Reusable React components
│   │   ├── CodeEditorPane.jsx
│   │   └── Logo.jsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useWebRTC.js      # WebRTC connection
│   │   ├── useInterviewSocket.js  # WebSocket
│   │   └── useProctoring.js  # Proctoring logic
│   ├── pages/                # Route components
│   │   ├── Dashboard.jsx
│   │   ├── LiveSession.jsx   # Interviewer monitoring
│   │   ├── candidate/
│   │   │   └── CandidateInterviewPage.jsx
│   │   └── CodeAnalysis.jsx
│   ├── services/
│   │   └── api.js            # Axios API clients
│   ├── data/
│   │   └── problems.js       # Sample problems
│   ├── App.jsx               # Main app component
│   └── main.jsx              # React entry point
│
├── package.json              # Node dependencies
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
└── index.html                # HTML entry point
```

---

## Technology Summary

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Backend Framework** | FastAPI | 0.115.0 | REST API, WebSocket |
| **Web Server** | Uvicorn | 0.30.6 | ASGI server |
| **Database** | PostgreSQL | 14+ | Data persistence |
| **ORM** | SQLAlchemy | 2.0.35 | Async database queries |
| **Migrations** | Alembic | 1.13.3 | Schema versioning |
| **Authentication** | PyJWT | 3.3.0 | JWT tokens |
| **Password Hashing** | Bcrypt | 4.2.0 | Secure passwords |
| **HTTP Client** | HTTPX | 0.27.2 | Judge0, OAuth |
| **Real-time** | WebSockets | 13.1 | Bidirectional communication |
| **ML/Analysis** | Scikit-learn | 1.5.2 | Plagiarism detection |
| **Frontend Framework** | React | 18.3.1 | UI library |
| **Routing** | React Router | 6.26.2 | Navigation |
| **Styling** | Tailwind CSS | 3.4.13 | Utility CSS |
| **Icons** | Lucide React | 0.446.0 | Icon library |
| **Charts** | Recharts | 2.13.0 | Data visualization |
| **HTTP Client** | Axios | 1.20.0 | REST API calls |
| **Syntax Highlighting** | Highlight.js | 11.12.0 | Code editor |
| **Build Tool** | Vite | 5.4.8 | Dev server, bundler |
| **Code Execution** | Judge0 CE | - | Remote compiler |
| **Video Streaming** | WebRTC | Native | P2P video |

---

## Security Considerations

### 🔒 Implemented
- JWT-based authentication with 8-hour expiry
- Bcrypt password hashing with salt
- CORS configuration for allowed origins
- SQL injection prevention via parameterized queries (SQLAlchemy)
- XSS protection via React's automatic escaping
- HTTPS recommended for production
- Session-specific candidate tokens
- Email validation for OAuth and session assignment

### ⚠️ Recommended for Production
- **TURN Server**: For WebRTC in corporate networks
- **Rate Limiting**: Prevent API abuse
- **HTTPS**: SSL/TLS certificates
- **Content Security Policy**: XSS protection headers
- **Database Backups**: Regular automated backups
- **Logging**: Centralized logging (e.g., ELK stack)
- **Monitoring**: Application performance monitoring (APM)
- **Secret Management**: Use AWS Secrets Manager, HashiCorp Vault
- **Input Sanitization**: Additional validation for code submissions

---

## Performance Optimizations

- **Async I/O**: All database and external API calls are async
- **Connection Pooling**: SQLAlchemy manages database connections
- **WebSocket**: Reduces HTTP overhead for real-time updates
- **WebRTC P2P**: Direct video streaming (no server bandwidth)
- **Code Splitting**: Vite bundles with dynamic imports
- **Lazy Loading**: React routes loaded on demand
- **Indexing**: Database indexes on frequently queried fields

---

## Future Enhancements

### Planned Features
- 🎤 **Audio Streaming**: Add microphone support to WebRTC
- 📹 **Session Recording**: Record interviews for later review
- 🤖 **AI Code Review**: Automated code quality analysis
- 📊 **Advanced Analytics**: Heatmaps, keystroke dynamics
- 🌐 **Multi-language UI**: Internationalization (i18n)
- 📱 **Mobile App**: React Native for mobile interviewers
- 🔔 **Real-time Notifications**: Push notifications for alerts
- 🎓 **Whiteboard**: Collaborative drawing for system design

### Technology Additions
- **Redis**: Caching and session storage
- **Celery**: Background task queue for long-running jobs
- **Docker**: Containerization for deployment
- **Kubernetes**: Orchestration for scaling
- **AWS S3**: Video recording storage
- **OpenAI API**: AI-powered code insights

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For questions or issues:
- 📧 Email: support@interviewlens.com
- 🐛 Issues: GitHub Issues
- 📚 Docs: `/docs` endpoint in API

---

**Built with ❤️ using modern web technologies**
