# CloudGuard IDS Web App - AI Agent Instructions

## Architecture Overview

This is a **full-stack security monitoring dashboard** with a React frontend and Python FastAPI backend:

- **Frontend**: React 18 + Vite, served on `http://localhost:5173`
- **Backend**: FastAPI (Python), running on `http://localhost:8000`
- **Database**: Supabase (cloud PostgreSQL)
- **UI Components**: shadcn/ui with TailwindCSS

### Key Integration Points

1. **Frontend → Backend**: Dashboard fetches attack logs from FastAPI `/api/*` endpoints
2. **Backend → Supabase**: Python queries `cloudguard_logs` table for security events
3. **CORS**: Backend allows requests from `localhost:5173` and `localhost:3000`

## Developer Workflows

### Starting Development

```bash
# Terminal 1: React frontend (port 5173)
npm run dev

# Terminal 2: Python backend (port 8000)
cd cloudguard-backend
python main.py
# OR with uvicorn watching
uvicorn main:app --reload
```

### Building & Deployment

```bash
npm run build      # Creates production bundle
npm run lint       # ESLint check (must pass before deployment)
npm run preview    # Test production build locally
```

**Deployment Target**: Netlify (keep `npm run build` as build command)

## Project Structure & Patterns

### Pages (3 main routes in `src/pages/`)

1. **LandingPage** (`/`): Hero + features + particle starfield background
   - Uses `react-tsparticles` for animated background
   - Entry point for users

2. **Dashboard** (`/dashboard`): Main security monitoring interface
   - Real-time charts (Recharts: LineChart, BarChart)
   - AI chat widget (sends `ChatRequest` to `/api/chat`)
   - Fetches logs via API endpoints (`/api/recent-logs`, `/api/logs/summary`)
   - Large file (~593 lines) - consider extracting StatCard, ChartCard components

3. **DetailPage** (`/detail`): Detailed log tables and analytics
   - Displays all logs with filters
   - Uses shadcn/ui Table component

### UI Components (`src/components/`)

- **Navbar.jsx**: Navigation with routing links
- **ui/**: shadcn/ui component library
  - `button.jsx`, `card.jsx`, `table.jsx`, `slot.jsx`
  - Use these instead of creating custom components

### Backend API Endpoints (`cloudguard-backend/main.py`)

Key patterns in the 517-line backend:

- **`GET /api/recent-logs`**: Returns last 100 logs
- **`GET /api/logs/summary`**: Aggregated statistics (attacks by type, region, action)
- **`POST /api/chat`**: AI responses about security events
- **`GET /api/logs/<time_range>`**: Time-based filtering

Database queries use Supabase SDK:
```python
supabase.table("cloudguard_logs").select(...).order(...).execute()
```

## Project-Specific Conventions

### Styling

- **Only TailwindCSS classes** - no raw CSS files unless absolutely required
- **Dark theme**: `bg-gray-900`, `bg-gray-800/50`, white text
- **Grid system**: Responsive using Tailwind grid/flex
- Use `backdrop-blur-sm` for glass-morphism effects (see Dashboard)

### Components

- **Functional components only** - no class components
- **Reusable patterns**: StatCard, ChartCard components are repeated in Dashboard
  - Extract these to reduce duplication
- All imports use path alias: `@/components/` (maps to `src/`)

### Data Flow

- Frontend → API calls from React pages
- No local state management library (no Redux/Zustand)
- Use `useState` + `useEffect` for data fetching
- Handle API errors gracefully (Dashboard has try-catch patterns)

### Environment Setup

- **Frontend**: Uses Vite aliases (`@/` → `src/`)
- **Backend**: Requires `.env` file with `SUPABASE_URL` and `SUPABASE_KEY`
- **Tailwind**: Custom colors extend HSL variables (see `tailwind.config.js`)

## Common Tasks & Patterns

### Adding a New Page

1. Create file in `src/pages/PageName.jsx`
2. Add route in `src/App.jsx`:
   ```jsx
   <Route path="/path" element={<PageName />} />
   ```
3. Link in `Navbar.jsx` using `<Link>`

### Adding Backend Endpoints

1. Define Pydantic `BaseModel` for request/response
2. Add `@app.get()` or `@app.post()` decorator
3. Return JSON via `supabase.table(...).execute()`
4. Test CORS with frontend immediately

### Fetching Data in Dashboard

Pattern used throughout Dashboard:
```jsx
const [data, setData] = useState([]);
useEffect(() => {
  fetch(`${API_BASE_URL}/api/endpoint`)
    .then(r => r.json())
    .then(d => setData(d))
    .catch(e => console.error(e));
}, []);
```

## Critical Files

- [vite.config.js](vite.config.js): Path alias setup (`@/` → `src/`)
- [tailwind.config.js](tailwind.config.js): Dark mode, custom colors
- [.cursorrules](.cursorrules): Original design rules (follow these)
- [cloudguard-backend/main.py](cloudguard-backend/main.py): All API endpoints
- [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx): Largest file, main UI logic

## Known Issues & Gotchas

1. **ESLint strict mode**: Build will fail if linting errors exist - always run `npm run lint` before commits
2. **CORS**: Backend has hardcoded allowed origins - update if changing localhost ports
3. **Dashboard complexity**: Dashboard.jsx is 593 lines - needs refactoring into smaller components
4. **Supabase credentials**: Backend requires `.env` - never commit secrets
