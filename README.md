# StudyOS — Premium Personal Study Productivity PWA

> **Version 1.0 (Production-Oriented)**  
> Engineered for laptop desktop browsers and Android mobile PWA installation.  
> Designed with UI/UX Pro Max design intelligence: deep dark theme default, Plus Jakarta Sans typography, high-contrast focus states, and glassmorphic micro-interactions.

---

## 🌟 Core Feature Summary

1. **Daily Preparation Cockpit (Dashboard)**
   - Live date banner & countdown to next college lecture.
   - Available self-study capacity calculation (10h planning window: 4:00 PM – 2:00 AM minus commitments).
   - Daily target vs. actual focused-study duration vs. break time (breaks are strictly excluded from focused-study progress).
   - Subject-wise progress with visual color bars.
   - Outstanding backlog reserve with one-click reallocation.

2. **College Timetable**
   - Configurable 9:00 AM – 4:00 PM baseline, Monday through Sunday.
   - Recurring lectures, classroom/hall info, start and end times, recess/break periods.
   - Overlap validation prevents scheduling conflicting periods.
   - Saturday Mode toggle: **College Day**, **Rest Day**, or **Flexible Self-Study Day**.

3. **Strict Study & Break Timer**
   - **Deterministic Algorithm**:
     - **1-Hour Block (60m)**: 50 min study + 10 min break.
     - **2-Hour Block (120m)**: 60 min study + 10 min break + 50 min study.
     - **3-Hour Block (180m)**: 60 min study + 10 min break + 60 min study + 10 min break + 40 min study.
     - Preserves exact block sum for all custom durations (30m, 45m, 90m, 150m, 240m).
   - **Timestamp-Based Source of Truth**: Completely resilient across page reloads, browser restarts, and device sleep.
   - **Strict Return-to-Study Requirement**: When a break ends, the session pauses; the user MUST return and manually press Start to resume study (unmonitored time away never counts as study).
   - Repeated notification reminders every 5 minutes when user is eligible to resume.

4. **Automatic Backlog Allocation**
   - Tracks incomplete or missed daily targets separately from normal targets.
   - Dynamically reallocates backlog into future sessions based on priority without exceeding available capacity or starving any subject.
   - Explains shortfalls clearly and requires user confirmation.

5. **Focus Mode**
   - Fullscreen distraction-free interface suppressing unnecessary navigation.
   - Real-time remaining segment countdown with pulsating visual focus aura.
   - Integrated Approved Resources Drawer.
   - Honest focus policy: handles external site limitations (CSP/X-Frame-Options) safely without freezing or losing timer state.

6. **User-Managed Study Resource Workspace**
   - AI Study Tools (ChatGPT, Gemini).
   - Communication & Study Groups (WhatsApp Web).
   - Documentation & Learning Platforms (MDN, Stack Overflow, DevDocs).
   - Strict URL security: validates HTTP/HTTPS, normalizes hostnames, and rejects dangerous protocols (`javascript:`, `data:`, `file:`).

7. **Study Materials, Notes & Practice**
   - Notes editor with live autosave indicator.
   - Topic practice checklist & questions solved counter.
   - Photos & document uploads for handwritten notes, diagrams, and PDFs.

8. **Progress Analytics**
   - 7-day daily study trend bar chart (Recharts).
   - Subject distribution pie chart.
   - Underlying session inspection audit log.

---

## 🚀 Quick Startup (Windows)

Double click `start.bat` in the root folder, or run:

```cmd
start.bat
```

This script automatically:
1. Verifies Python 3.10+ and Node.js.
2. Creates the Python virtual environment if missing (`backend\venv`).
3. Verifies backend environment (`backend\.env`).
4. Runs database migrations automatically.
5. Launches the Django REST API on `http://127.0.0.1:8000`.
6. Launches the Next.js Frontend PWA on `http://localhost:3000`.

---

## 🛠 Manual Installation & Startup

### Backend Setup (Django + DRF)
```powershell
# From the project root:
python -m venv backend\venv
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
copy backend\.env.example backend\.env
backend\venv\Scripts\python.exe backend\manage.py migrate
backend\venv\Scripts\python.exe backend\manage.py runserver 0.0.0.0:8000
```

### Frontend Setup (Next.js PWA)
```powershell
# From the frontend directory:
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 PWA Installation Instructions

### On Android (Chrome / Brave / Edge)
1. Open `http://<your-laptop-lan-ip>:3000` or deployed HTTPS URL on your Android device.
2. Tap the browser menu (three dots) -> **Install app** or **Add to Home screen**.
3. StudyOS will install as a standalone app with native splash screen, app icon, and offline app shell caching.

### On Laptop Desktop (Chrome / Edge)
1. In the browser address bar, click the **Install StudyOS** icon (computer screen with down arrow).
2. Click **Install**. StudyOS opens as a dedicated window without browser address bars.

---

## 🗄 Database Configuration & Backup

By default, StudyOS initializes with local SQLite for instant setup. To connect to PostgreSQL:
1. Open `backend\.env`.
2. Set `DB_ENGINE=django.db.backends.postgresql` and provide credentials:
   ```env
   DB_ENGINE=django.db.backends.postgresql
   DB_NAME=studyos_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   ```
3. Run migrations: `backend\venv\Scripts\python.exe backend\manage.py migrate`.

### Backup Database
- For SQLite: Copy `backend\db.sqlite3` to a safe location.
- For PostgreSQL: `pg_dump -U postgres studyos_db > backup.sql`.

### Restore Database
- For SQLite: Restore the `db.sqlite3` file to `backend/`.
- For PostgreSQL: `psql -U postgres -d studyos_db < backup.sql`.

---

## 🧪 Automated Test Suite

Run the full Django test suite (including timer deterministic algorithm, overlap calculations, backlog reallocations, and security checks):

```powershell
backend\venv\Scripts\python.exe backend\manage.py test api.tests
```

Run frontend production build verification:
```powershell
npm --prefix frontend run build
```
