# Deployment Guide - Team Manager

## ✅ Git Commit đã hoàn tất

Commit hash: `2298b7f`
```
fix: resolve 214 TypeScript errors + Turbopack crash + all tests pass
```

**61 files changed:** 4946 insertions, 2190 deletions

## 📤 Bước 1: Push lên GitHub

```bash
cd D:\my-project\team-manager
git push origin main
```

**Lưu ý:** Bạn sẽ cần nhập GitHub credentials (username + personal access token).

## 🔥 Bước 2: Deploy Firestore Indexes

### Option A: Qua Firebase Console (Nhanh nhất)

Click link này để tạo index trực tiếp:
```
https://console.firebase.google.com/project/team-manager-5ba6c/firestore/indexes
```

Hoặc khi chạy app và gặp lỗi index, click link trong error message.

### Option B: Qua Firebase CLI

1. **Cài Firebase CLI:**
```bash
npm install -g firebase-tools
```

2. **Login:**
```bash
firebase login
```

3. **Deploy indexes:**
```bash
cd D:\my-project\team-manager
firebase deploy --only firestore:indexes
```

## 📋 Index cần deploy

File `firestore.indexes.json` đã chứa đầy đủ 11 indexes cho:
- ✅ conversations (memberIds + lastMessageAt)
- ✅ notifications (userId + read + createdAt)
- ✅ tasks (assigneeId, status, createdAt)
- ✅ taskComments, taskReports
- ✅ evaluations, activityLogs
- ✅ users, messages

## 🚀 Bước 3: Deploy App

Tùy platform bạn chọn:

### Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Docker
```bash
docker build -t team-manager .
docker run -p 3000:3000 team-manager
```

## ✅ Checklist trước deploy

- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors  
- [x] Jest: 27/27 tests pass
- [x] Production build: successful
- [x] Git commit: done (2298b7f)
- [ ] Git push: **CẦN BẠN THỰC HIỆN**
- [ ] Firestore indexes: **CẦN BẠN DEPLOY**
- [ ] App deployment: **CẦN BẠN CHỌN PLATFORM**

## 📝 Biến môi trường cần thiết (production)

```env
FIREBASE_PROJECT_ID=team-manager-5ba6c
FIREBASE_CLIENT_EMAIL=<your-service-account-email>
FIREBASE_PRIVATE_KEY=<your-private-key>
JWT_SECRET=<your-production-secret-min-32-chars>
NODE_ENV=production
```

**Bảo mật:** Không commit file `.env` lên Git. Dùng secrets management của platform deploy.

## 🎉 Sau khi deploy xong

Test các endpoint:
- `GET /` → Homepage
- `GET /login` → Login page
- `POST /api/auth/login` → Authentication
- `GET /api/tasks` → Tasks API
- `GET /admin` → Admin dashboard

**Project sẵn sàng production!** 🚀
