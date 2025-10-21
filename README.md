Cardiac Backend (Node.js + Express + SQLite)

Quick start (PowerShell):
1. cd backend_only
2. npm install
3. copy .env.example .env  (edit .env to set JWT_SECRET and SMTP if needed)
4. npm start
API endpoints:
- POST /api/auth/register  {name,email,password}
- POST /api/auth/login     {email,password} -> {user,token}
- GET  /api/profile/:userId
- POST /api/profile/create
- PUT  /api/profile/update
- GET  /api/readings/:userId
- POST /api/readings
- GET  /api/reminders/:userId
- POST /api/reminders/create
- PUT  /api/reminders/update
