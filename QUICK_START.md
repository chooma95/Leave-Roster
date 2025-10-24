# Leave Roster System - Quick Start Guide

## ✅ What's Been Built (So Far)

### Backend (Complete & Running!)
- ✅ Express.js API server on port 3001
- ✅ SQLite database with Prisma ORM
- ✅ Complete database schema (users, staff, shifts, leave, swaps, skills)
- ✅ Authentication endpoints (`/api/auth/login`, `/api/auth/register`)
- ✅ Stub routes for all features
- ✅ Seeded with test users:
  - **Admin**: `admin@roster.local` / `admin123`
  - **Staff 1**: `staff1@roster.local` / `staff123`
  - **Staff 2**: `staff2@roster.local` / `staff123`

### Frontend (Structure Ready, Dependencies Installing)
- ✅ React 18 + TypeScript + Vite setup
- ✅ Material-UI (MUI) for components
- ✅ React Router for navigation
- ✅ Zustand for state management
- ✅ Project structure and app skeleton
- ⏳ Dependencies currently installing...

---

## 🚀 Start the Backend (NOW)

```bash
cd /workspaces/Leave-Roster/backend
npm run dev
```

Backend will be available at:
- API: http://localhost:3001/api
- Health: http://localhost:3001/health

---

## 🎯 Next Steps (After Dependencies Install)

### 1. Complete Frontend Installation
```bash
cd /workspaces/Leave-Roster/frontend
npm install  # (currently running in background)
```

### 2. Create Core Frontend Files
- Auth store (Zustand)
- API service layer (Axios)
- Login page
- Dashboard layout
- Basic pages (Dashboard, Roster, Leave, Swaps)

### 3. Migrate Roster Algorithm
Extract `generateRoster()` from `phone-shift-roster.html` into:
```
backend/src/services/roster-engine.ts
backend/src/routes/roster.ts (POST /api/roster/generate)
```

### 4. Build Admin Interfaces
- Roster generator UI
- Staff management CRUD
- Leave approval queue
- Skills matrix editor

### 5. Build Staff Interfaces
- My shifts view
- Leave request form
- Shift swap proposals
- Skills profile

---

## 📁 Project Structure

```
Leave-Roster/
├── backend/                   # ✅ COMPLETE
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── middleware/       # Auth middleware
│   │   ├── routes/           # API routes (auth, staff, roster, leave, swaps, skills)
│   │   └── prisma/
│   │       └── seed.ts       # Database seeding
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   ├── dev.db                # SQLite database
│   ├── .env                  # Config
│   └── package.json
│
├── frontend/                  # ⏳ IN PROGRESS
│   ├── src/
│   │   ├── main.tsx          # ✅ Entry point
│   │   ├── App.tsx           # ✅ Router setup
│   │   ├── stores/           # ⏳ State management (Zustand)
│   │   ├── services/         # ⏳ API calls (Axios)
│   │   ├── components/       # ⏳ Reusable components
│   │   └── pages/            # ⏳ Page components
│   ├── vite.config.ts        # ✅ Vite config
│   └── package.json          # ✅ Dependencies
│
├── phone-shift-roster.html   # Original roster generator (to be migrated)
└── ARCHITECTURE.md           # Full system design

```

---

## 🔑 API Endpoints (Defined, Some Stubbed)

### Auth
- `POST /api/auth/login` - ✅ Login (returns JWT)
- `POST /api/auth/register` - ✅ Register new user

### Staff (Stub)
- `GET /api/staff` - List all staff
- `POST /api/staff` - Create staff
- `PUT /api/staff/:id` - Update staff
- `GET /api/staff/:id/skills` - Get staff skills

### Roster (Stub - To Implement)
- `POST /api/roster/generate` - Generate roster (migrate algorithm here!)
- `GET /api/roster/current` - Get active roster
- `GET /api/roster/history` - Historical periods

### Leave (Stub)
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave` - List leave requests
- `PUT /api/leave/:id/approve` - Approve leave
- `GET /api/leave/calendar` - Team calendar

### Swaps (Stub - Peer-to-peer, no admin approval!)
- `POST /api/swaps/propose` - Propose shift swap
- `PUT /api/swaps/:id/accept` - Accept swap (auto-completes)
- `PUT /api/swaps/:id/reject` - Reject swap

### Skills (Stub)
- `GET /api/skills` - List skills
- `GET /api/skills/matrix` - Full matrix view

---

## 🎨 Tech Stack

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM + SQLite
- JWT authentication
- bcrypt password hashing
- Zod validation

### Frontend
- React 18 + TypeScript
- Vite build tool
- Material-UI (MUI) components
- React Router v6
- Zustand state management
- Axios HTTP client
- date-fns for dates

---

## 📝 Database Schema Highlights

- **users** - Authentication (email, password, role)
- **staff** - Profiles (name, schedule type, work days)
- **shifts** - Roster assignments (week, day, shift type)
- **leave_requests** - Leave applications (pending/approved/rejected)
- **shift_swaps** - Peer-to-peer swaps (NO admin approval needed)
- **skills** + **skills_matrix** - Competency tracking
- **roster_periods** - Historical roster snapshots

---

## 🐛 Known Status

✅ **Working**:
- Backend API server running
- Database created and seeded
- Authentication endpoints functional
- All routes defined (some stubbed)

⏳ **In Progress**:
- Frontend dependencies installing
- Need to create auth store
- Need to create API service layer
- Need to build page components

🔜 **Next Priority**:
1. Finish frontend dependencies
2. Create auth store + API service
3. Build login page
4. Migrate roster algorithm to backend
5. Build admin roster generator UI

---

## 🚦 Test the Backend Now

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@roster.local", "password": "admin123"}'

# Should return JWT token!
```

---

## 💡 Notes

- Shift swaps are **peer-to-peer only** (no admin approval) - as requested!
- Weekly cap of 2 shifts preserved from original algorithm
- Skills matrix for future work allocation features
- Self-hosted ready (SQLite for dev, easy switch to PostgreSQL for production)
- Fast iteration focus - MUI for quick UI, Zustand for simple state

---

Ready to continue as soon as dependencies finish installing! 🚀
