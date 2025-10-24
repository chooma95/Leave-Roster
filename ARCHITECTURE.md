# Leave Roster System - Architecture Document

## System Overview

Transform the single-page phone-shift-roster.html into a full-stack workforce management system with:

- **Backend**: RESTful API for roster generation, leave management, shift swaps, skills tracking
- **Frontend**: Modern web interface for staff and admin interactions
- **Database**: Persistent storage for all workforce data

---

## Technology Stack Proposal

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: Prisma (type-safe, migration management)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Zod schema validation

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (lightweight alternative to Redux)
- **Routing**: React Router v6
- **UI Components**: Material-UI (MUI) or Tailwind CSS + Headless UI
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Calendar**: FullCalendar or React Big Calendar

### Shared
- **Monorepo Tool**: npm workspaces (simple) or Turborepo (advanced)
- **API Contract**: Shared TypeScript types
- **Validation**: Shared Zod schemas

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND (React)                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Staff      │  │    Admin     │  │   Manager    │     │
│  │   Portal     │  │   Dashboard  │  │   Console    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │   API Service   │                       │
│                  │     Layer       │                       │
│                  └────────┬────────┘                       │
└───────────────────────────┼─────────────────────────────────┘
                            │
                   HTTPS (JWT Auth)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (Node.js/Express)                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth       │  │   Roster     │  │   Leave      │     │
│  │   Service    │  │   Engine     │  │   Manager    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐     │
│  │   Shift      │  │   Skills     │  │   Swap       │     │
│  │   Service    │  │   Matrix     │  │   Handler    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │  Prisma ORM     │                       │
│                  └────────┬────────┘                       │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   DATABASE (PostgreSQL)                     │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  users   │ │  staff   │ │ shifts   │ │  leave   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
│  ┌────┴────────────┴────────────┴────────────┴──────┐      │
│  │  shift_swaps  │  skills  │  skills_matrix │ etc. │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Prisma)

### Core Tables

#### `users`
- User authentication and profile
- Links to staff records
- Role-based permissions (admin, manager, staff)

#### `staff`
- Workforce profiles (mirrors current staff list)
- Work schedules (fixed/alternating)
- Status tracking (active/leave/inactive)
- Links to user accounts

#### `shifts`
- Individual shift assignments
- Week, day, type (early/late)
- Status (scheduled, completed, swapped)
- Links to staff member

#### `leave_requests`
- Staff leave applications
- Single days or date ranges
- Approval workflow (pending, approved, rejected)
- Reason tracking

#### `shift_swaps`
- Shift exchange requests between staff
- Original and target shift references
- Dual approval (both staff + admin)
- Status tracking

#### `skills`
- Master skills catalog
- Descriptions, categories
- Certification requirements

#### `skills_matrix`
- Staff competency tracking
- Skill level (proficient, training, expert)
- Certification expiry dates
- Last assessed date

#### `roster_periods`
- Historical roster snapshots
- Week metadata (calendar alignment)
- Generated date, stats

---

## API Endpoints

### Authentication
```
POST   /api/auth/login          # JWT token generation
POST   /api/auth/refresh        # Token refresh
POST   /api/auth/logout         # Invalidate token
POST   /api/auth/change-password
```

### Staff Management (Admin)
```
GET    /api/staff               # List all staff
POST   /api/staff               # Create staff member
GET    /api/staff/:id           # Get staff details
PUT    /api/staff/:id           # Update staff profile
DELETE /api/staff/:id           # Remove staff (soft delete)
GET    /api/staff/:id/skills    # Get staff skills
PUT    /api/staff/:id/skills    # Update staff skills
```

### Roster Generation (Admin/Manager)
```
POST   /api/roster/generate     # Generate new roster
GET    /api/roster/current      # Get active roster
GET    /api/roster/history      # List historical periods
GET    /api/roster/:periodId    # Get specific period
DELETE /api/roster/:periodId    # Delete historical period
POST   /api/roster/export       # Export to Excel
```

### Leave Management
```
GET    /api/leave               # List leave (filtered by role)
POST   /api/leave/request       # Staff: submit leave request
GET    /api/leave/:id           # Get leave details
PUT    /api/leave/:id/approve   # Admin: approve leave
PUT    /api/leave/:id/reject    # Admin: reject leave
DELETE /api/leave/:id           # Cancel leave request
GET    /api/leave/calendar      # Full team leave calendar
```

### Shift Swaps
```
GET    /api/swaps               # List swap requests
POST   /api/swaps/propose       # Staff: propose shift swap
GET    /api/swaps/:id           # Get swap details
PUT    /api/swaps/:id/accept    # Peer: accept swap
PUT    /api/swaps/:id/reject    # Peer: reject swap
PUT    /api/swaps/:id/approve   # Admin: final approval
DELETE /api/swaps/:id           # Cancel swap request
```

### Skills Matrix (Admin)
```
GET    /api/skills              # List all skills
POST   /api/skills              # Create new skill
PUT    /api/skills/:id          # Update skill
DELETE /api/skills/:id          # Remove skill
GET    /api/skills/matrix       # Full skills matrix view
```

---

## User Roles & Permissions

### Staff (Authenticated User)
- View own roster assignments
- Request leave (single days or ranges)
- Propose shift swaps with peers
- View own skills and certifications
- Update personal profile

### Manager
- All staff permissions
- View full team roster
- View team leave calendar
- Monitor shift swap activity
- Generate reports

### Admin
- All manager permissions
- Manage staff profiles (add/edit/remove)
- Generate rosters
- Approve/reject leave requests
- Approve/reject shift swaps
- Manage skills matrix
- View historical rosters
- Export data

---

## Frontend Pages

### Staff Portal
1. **Dashboard** - My upcoming shifts, pending leave requests, active swaps
2. **My Roster** - Calendar view of my shifts (weekly/monthly)
3. **Request Leave** - Form to submit leave (with calendar picker)
4. **Shift Swaps** - Propose swap, view incoming requests
5. **My Skills** - View certifications, expiry alerts
6. **Profile** - Update contact details, change password

### Admin Dashboard
1. **Overview** - Team summary, pending actions, alerts
2. **Roster Generator** - Configure period, generate roster (migrate current HTML logic)
3. **Team Roster** - Full grid view (early/late shifts by day/week)
4. **Staff Management** - CRUD interface for staff
5. **Leave Approvals** - Queue of pending requests with approve/reject
6. **Swap Approvals** - Review shift swap proposals
7. **Skills Matrix** - Grid showing staff × skills competencies
8. **Team Calendar** - Full-month view with leave/shifts overlay
9. **Reports** - Fairness metrics, coverage analysis, export options

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Set up monorepo structure
- Initialize backend with Express + Prisma
- Create database schema and migrations
- Build authentication system
- Initialize React frontend with routing

### Phase 2: Core Backend (Week 3-4)
- Migrate roster generation algorithm to backend service
- Implement staff management endpoints
- Build leave request API
- Create shift swap logic
- Add skills matrix CRUD

### Phase 3: Frontend Build (Week 5-6)
- Staff portal UI (dashboard, leave request, swaps)
- Admin roster generator interface
- Team roster display component
- Leave calendar view
- Skills matrix management UI

### Phase 4: Integration & Polish (Week 7-8)
- Connect frontend to backend APIs
- Implement real-time updates (optional: WebSockets)
- Add export functionality
- Testing and bug fixes
- Documentation

### Phase 5: Deployment (Week 9)
- Set up production database (PostgreSQL)
- Configure hosting (Heroku, Render, DigitalOcean)
- Deploy backend + frontend
- User acceptance testing

---

## Preserving Current Logic

The fair roster generation algorithm from `phone-shift-roster.html` will be:

1. **Extracted** into `backend/src/services/roster-engine.ts`
2. **Enhanced** with:
   - Database persistence (save/retrieve rosters)
   - Skills-based assignment (consider staff certifications)
   - Leave integration (auto-exclude staff on approved leave)
   - Audit logging (track who generated, when, why)
3. **Exposed** via `POST /api/roster/generate` endpoint
4. **Called** from React admin interface

Key functions to migrate:
- `generateRoster()` → Main orchestration
- `selectBestCandidateV6()` → Constraint-based selection
- `computeAvailabilityMap()` → Availability checking
- `computeProportionalTargets()` → Fair quota calculation
- `showStats()` → Fairness reporting

---

## Next Steps

1. **Confirm tech stack** - Are you comfortable with Node.js + React? Open to alternatives?
2. **Choose database** - PostgreSQL (recommended) or stick with SQLite for simplicity?
3. **UI framework** - Material-UI (pre-built components) or Tailwind (custom design)?
4. **Hosting preferences** - Self-hosted or cloud platform?

Once confirmed, I'll:
1. Create the monorepo folder structure
2. Set up backend with Express + Prisma
3. Initialize React frontend
4. Start building the API endpoints

Ready to begin? Let me know your tech preferences and we'll scaffold the project!
