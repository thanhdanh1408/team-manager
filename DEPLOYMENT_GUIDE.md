# 🚀 Deployment Guide - Team Manager

**Cập nhật:** 11/08/2026  
**Version:** 1.0.0

---

## 📋 MỤC LỤC

1. [Git Setup & Push](#1-git-setup--push)
2. [Real-time Database (WebSocket)](#2-real-time-database-websocket)
3. [Deployment Options](#3-deployment-options)
4. [Post-Deployment](#4-post-deployment)

---

## 1. GIT SETUP & PUSH

### Bước 1: Khởi tạo Git Repository

```bash
# Kiểm tra git đã init chưa
git status

# Nếu chưa có, init git
git init

# Add tất cả files
git add .

# Commit đầu tiên
git commit -m "feat: Initial commit - Team Manager v1.0.0

Features:
- Full-stack Next.js 15 with TypeScript
- Prisma ORM + SQLite database
- JWT authentication with refresh tokens
- Role-based access control (Admin/Member)
- Dashboard with Recharts analytics
- Profile management
- Notification system with real-time updates
- Task comments and bulk actions
- PDF/CSV export reports
- Mobile responsive design
- CSRF protection and rate limiting

Tech Stack:
- Next.js 15, React 19, TypeScript
- Prisma ORM, SQLite
- TailwindCSS, Recharts
- Zod validation, Sonner toast
"
```

### Bước 2: Tạo Repository trên GitHub/GitLab

**GitHub:**
1. Vào https://github.com/new
2. Tạo repository mới: `team-manager`
3. Không init với README (đã có local)

**GitLab:**
1. Vào https://gitlab.com/projects/new
2. Tạo project mới: `team-manager`

### Bước 3: Connect và Push

```bash
# Connect với remote (thay YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/team-manager.git

# Hoặc GitLab
# git remote add origin https://gitlab.com/YOUR_USERNAME/team-manager.git

# Kiểm tra remote
git remote -v

# Push lên main branch
git branch -M main
git push -u origin main
```

### Bước 4: Tạo .gitignore (nếu chưa có)

```bash
# .gitignore đã có, kiểm tra nội dung
cat .gitignore
```

Đảm bảo .gitignore có:
```
node_modules/
.next/
.env
.env.local
*.db
*.db-journal
.DS_Store
dist/
build/
```

### Bước 5: Branch Strategy (Optional)

```bash
# Tạo development branch
git checkout -b development
git push -u origin development

# Tạo staging branch
git checkout -b staging
git push -u origin staging

# Back to main
git checkout main
```

---

## 2. REAL-TIME DATABASE (WEBSOCKET)

Hiện tại app đang dùng **polling (10s refresh)**. Để chuyển sang **real-time với WebSocket**, có 3 options:

### Option 1: Socket.IO (Recommended) ⭐

**Ưu điểm:**
- Dễ implement
- Fallback to polling nếu WebSocket fail
- Hỗ trợ rooms/namespaces
- Production-ready

**Cài đặt:**

```bash
npm install socket.io socket.io-client
```

**Implementation:**

#### A. Server Setup (`src/lib/socket-server.ts`)

```typescript
import { Server as HTTPServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from './auth';

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    // Auth middleware
    const token = socket.handshake.auth.token;
    try {
      const user = await verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.data.user.email);

    // Join user-specific room
    socket.join(`user:${socket.data.user.id}`);

    // Join role-specific room
    socket.join(`role:${socket.data.user.role}`);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.data.user.email);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

// Emit functions
export function emitTaskUpdate(taskId: string) {
  io?.to(`role:admin`).to(`role:member`).emit('task:updated', { taskId });
}

export function emitNotification(userId: string, notification: any) {
  io?.to(`user:${userId}`).emit('notification:new', notification);
}

export function emitCommentAdded(taskId: string, comment: any) {
  io?.to(`role:admin`).to(`role:member`).emit('comment:added', { taskId, comment });
}
```

#### B. Custom Server (`server.js` - root folder)

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initSocketServer } = require('./src/lib/socket-server');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.IO
  initSocketServer(httpServer);

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

#### C. Client Setup (`src/lib/socket-client.ts`)

```typescript
'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (socket?.connected) return socket;

  socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
```

#### D. Use in Components

```typescript
// In AuthContext or App component
useEffect(() => {
  if (user?.token) {
    const socket = connectSocket(user.token);

    // Listen for real-time updates
    socket.on('task:updated', ({ taskId }) => {
      // Refetch tasks
      mutate('/api/tasks');
    });

    socket.on('notification:new', (notification) => {
      // Add to notification list
      toast.info(notification.message);
    });

    socket.on('comment:added', ({ taskId, comment }) => {
      // Update task comments
      mutate(`/api/tasks/${taskId}/comments`);
    });

    return () => {
      disconnectSocket();
    };
  }
}, [user]);
```

#### E. Emit from API Routes

```typescript
// In task API route after update
import { emitTaskUpdate } from '@/lib/socket-server';

// After task update
await prisma.task.update({ ... });
emitTaskUpdate(taskId);
```

#### F. Update package.json scripts

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

---

### Option 2: Pusher (Managed Service) 💰

**Ưu điểm:**
- Không cần maintain server
- Auto-scaling
- Free tier: 200k messages/day

**Cài đặt:**

```bash
npm install pusher pusher-js
```

**Setup:**

```typescript
// Server (.env)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=ap1

// lib/pusher-server.ts
import Pusher from 'pusher';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Trigger events
await pusher.trigger('tasks', 'task-updated', { taskId });

// Client
import PusherJS from 'pusher-js';

const pusher = new PusherJS(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

const channel = pusher.subscribe('tasks');
channel.bind('task-updated', (data) => {
  console.log('Task updated:', data);
});
```

---

### Option 3: Supabase Realtime (PostgreSQL) 🔥

**Ưu điểm:**
- Database + Realtime + Auth all-in-one
- PostgreSQL với realtime subscriptions
- Free tier generous

**Migration:**

```bash
npm install @supabase/supabase-js
```

**Setup:**

```typescript
// .env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Subscribe to changes
const channel = supabase
  .channel('tasks')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'Task' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();
```

**Note:** Cần migrate từ Prisma+SQLite sang Supabase PostgreSQL

---

### ⭐ RECOMMENDATION: Socket.IO

Vì bạn đã có codebase ổn định với Prisma+SQLite, tôi recommend **Option 1 (Socket.IO)**:

**Pros:**
- Không cần đổi database
- Không phụ thuộc third-party
- Free, self-hosted
- Dễ integrate với code hiện tại

**Cons:**
- Cần maintain WebSocket server
- Phức tạp hơn khi scale (cần Redis adapter)

---

## 3. DEPLOYMENT OPTIONS

### Option A: Vercel (Easiest) ⭐⭐⭐

**Ưu điểm:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Free tier generous
- Git integration

**Nhược điểm:**
- WebSocket phức tạp (cần separate server)
- Serverless có cold starts
- SQLite không work (cần PostgreSQL)

**Steps:**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Production deploy
vercel --prod
```

**Database:** Cần migrate sang **Vercel Postgres** hoặc **Supabase**

```bash
# Vercel Postgres
vercel postgres create

# Update .env với connection string
DATABASE_URL="postgres://..."

# Update prisma/schema.prisma
datasource db {
  provider = "postgresql"  // thay vì "sqlite"
  url      = env("DATABASE_URL")
}

# Migrate
npx prisma migrate dev
npx prisma generate
```

---

### Option B: Railway (Recommended cho SQLite) ⭐⭐⭐

**Ưu điểm:**
- Hỗ trợ persistent storage (SQLite OK!)
- WebSocket support
- Easy deployment
- $5/month free credit

**Steps:**

1. **Signup:** https://railway.app
2. **New Project** → Deploy from GitHub
3. **Add Variables:**
   ```
   JWT_SECRET=your_secret
   JWT_REFRESH_SECRET=your_refresh_secret
   NODE_ENV=production
   ```
4. **Deploy** → Automatic!

**Domain:** Railway cung cấp subdomain free: `your-app.up.railway.app`

---

### Option C: Render (Balanced) ⭐⭐

**Ưu điểm:**
- Free tier (với limits)
- PostgreSQL database free
- Auto-deploy from Git
- HTTPS included

**Steps:**

1. **Signup:** https://render.com
2. **New Web Service** → Connect GitHub
3. **Build Command:** `npm install && npx prisma generate && npm run build`
4. **Start Command:** `npm start`
5. **Add PostgreSQL** database
6. **Environment Variables**

---

### Option D: VPS (DigitalOcean, AWS, Azure) ⭐

**Ưu điểm:**
- Full control
- SQLite OK
- WebSocket OK
- Scalable

**Nhược điểm:**
- Phải tự setup everything
- Maintenance required

**Steps (Ubuntu VPS):**

```bash
# 1. SSH to server
ssh root@your_server_ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
npm install -g pm2

# 4. Clone project
git clone https://github.com/YOUR_USERNAME/team-manager.git
cd team-manager

# 5. Install dependencies
npm install

# 6. Setup .env
cp .env.example .env
nano .env  # Edit values

# 7. Build
npm run build

# 8. Run with PM2
pm2 start npm --name "team-manager" -- start
pm2 save
pm2 startup

# 9. Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/team-manager

# Nginx config:
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/team-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

---

### 📊 COMPARISON TABLE

| Platform | Difficulty | Cost | SQLite | WebSocket | Free Tier |
|----------|------------|------|--------|-----------|-----------|
| **Vercel** | ⭐ Easy | Free → $20/mo | ❌ No | ⚠️ Limited | ✅ Generous |
| **Railway** | ⭐⭐ Easy | $5/mo | ✅ Yes | ✅ Yes | $5 credit |
| **Render** | ⭐⭐ Easy | Free → $7/mo | ⚠️ Limited | ✅ Yes | ✅ Limited |
| **VPS** | ⭐⭐⭐ Hard | $5-50/mo | ✅ Yes | ✅ Yes | ❌ No |

---

## 4. POST-DEPLOYMENT

### A. Environment Variables Checklist

```bash
# Production .env
NODE_ENV=production
DATABASE_URL="your_database_url"
JWT_SECRET="generate_strong_secret_64_chars"
JWT_REFRESH_SECRET="generate_different_secret_64_chars"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

**Generate secrets:**
```bash
openssl rand -base64 64
```

### B. Database Migration

```bash
# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

### C. Health Check

```bash
# Test endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/auth/me
```

### D. Monitoring Setup

**Sentry (Error tracking):**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

### E. Custom Domain

**Vercel:**
- Settings → Domains → Add your-domain.com
- Update DNS: CNAME → cname.vercel-dns.com

**Railway:**
- Settings → Networking → Custom Domain
- Update DNS: CNAME → provided_value

---

## 🎯 RECOMMENDED DEPLOYMENT FLOW

### For Quick Deploy (Development/Staging):
1. Push to GitHub ✅
2. Deploy on **Railway** (SQLite support, WebSocket OK)
3. Add environment variables
4. Done! 🎉

### For Production:
1. Migrate database: SQLite → **PostgreSQL** (Vercel Postgres or Supabase)
2. Implement **Socket.IO** cho real-time
3. Deploy on **Vercel** (frontend) + **Railway** (WebSocket server)
4. Setup monitoring (Sentry)
5. Custom domain + SSL
6. Done! 🚀

---

## 📝 QUICK START COMMANDS

```bash
# 1. Git Push
git add .
git commit -m "feat: production ready v1.0.0"
git push origin main

# 2. Deploy to Railway (easiest)
# - Go to railway.app
# - New Project → Deploy from GitHub
# - Select team-manager repo
# - Add environment variables
# - Deploy!

# 3. Deploy to Vercel + PostgreSQL
vercel
vercel env add DATABASE_URL
vercel --prod
```

---

**Thời gian ước tính:**
- Git push: 5 phút
- Deploy Railway: 10 phút
- Socket.IO implementation: 2-4 giờ
- Production deployment: 30 phút - 2 giờ

**Có câu hỏi gì không? Tôi có thể giúp implement chi tiết! 🚀**
