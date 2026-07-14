# MEETSPACE - Room Booking System

## Quick Start

### Option 1: Automated (Easiest)
Double-click `START_PROJECT.bat` - it will start everything automatically.

### Option 2: Manual Setup

#### Prerequisites:
- XAMPP installed with MySQL and Apache running
- Node.js installed
- Python 3 installed

#### Step 1: Start XAMPP Services
1. Open XAMPP Control Panel
2. Start MySQL
3. (Optional) Start Apache if needed

#### Step 2: Start Backend Server
```bash
cd backend
npm install
node server.js
```
Backend will run on: **http://localhost:5000**

#### Step 3: Start Frontend Server
```bash
python -m http.server 5500
```
Frontend will run on: **http://localhost:5500**

---

## Services & Ports

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5500 | Web interface |
| Backend API | http://localhost:5000 | API endpoints |
| MySQL Database | localhost:3306 | Data storage |

---

## Login Credentials

### Admin Login
- **URL**: http://localhost:5500/adminlogin.html
- Email: `admin@meetspace.com`
- Password: `Admin@123`

### Tenant Registration
- **URL**: http://localhost:5500/index.html
- Click "Create New Account"
- Fill in details and register

---

## Key Features

✅ **Authentication**
- Email/password login and registration
- Password reset with strength meter
- JWT-based session management

✅ **Tenant Dashboard**
- View available rooms
- Book meeting rooms
- View booking history
- Manage profile

✅ **Admin Dashboard**
- Add/manage rooms
- View all bookings
- Manage tenants
- System overview

✅ **Database**
- SQLite for local development
- MySQL support for production

---

## Troubleshooting

### Backend not starting?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed
taskkill /PID <PID> /F

# Try again
node server.js
```

### Frontend not loading?
```bash
# Make sure you're in the project root
cd c:\xampp\htdocs\Finall project

# Start Python server
python -m http.server 5500
```

### Database connection error?
1. Verify XAMPP MySQL is running
2. Check backend logs for connection details
3. Ensure database tables exist (schema.sql)

### Clear Browser Cache
- Press `Ctrl + Shift + Delete` to open cache clearing
- Clear cookies and cache for localhost:5500

---

## Project Structure

```
.
├── index.html              # Tenant login page
├── tenantdashboard.html    # Tenant dashboard
├── admindashboard.html     # Admin dashboard
├── adminlogin.html         # Admin login
├── style.css               # Login page styles
├── backend/
│   ├── server.js           # Express server entry point
│   ├── app.js              # Express app config
│   ├── package.json        # Dependencies
│   ├── config/
│   │   └── db.js           # Database connection
│   ├── controllers/        # Business logic
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth, validation
│   └── services/           # Email, utilities
└── frontend/               # Additional frontend files
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Tenant login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Confirm password reset
- `GET /api/auth/verify-email` - Verify email token

### Rooms
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create room (admin)
- `PUT /api/rooms/:id` - Update room (admin)
- `DELETE /api/rooms/:id` - Delete room (admin)

### Bookings
- `GET /api/bookings` - List user's bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Tenants
- `GET /api/tenants` - List all tenants (admin)
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant (admin)

---

## Important Notes

### OAuth (Google/Facebook)
- Completely removed from the system
- Uses email/password authentication only

### Database
- Default: SQLite (backend/config/db.js)
- Can switch to MySQL by updating db.js connection
- Schema available in backend/schema.sql

### Security
- All passwords hashed with bcryptjs
- JWT tokens for session management
- Rate limiting on API endpoints
- CORS enabled for localhost

---

## Need Help?

1. Check terminal output for error messages
2. Verify all services are running (XAMPP, Node, Python)
3. Clear browser cache and localStorage
4. Restart all services if something breaks

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-13
