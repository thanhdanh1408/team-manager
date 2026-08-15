# Deploy Firestore Indexes - Quick Guide

## ⚡ Cách nhanh nhất: Firebase Console

### Bước 1: Mở Firebase Console
```
https://console.firebase.google.com/project/team-manager-5ba6c/firestore/indexes
```

### Bước 2: Tạo Composite Index cho Conversations

Click **"Create Index"** và nhập:
- **Collection ID:** `conversations`
- **Fields to index:**
  1. `memberIds` - **Array-contains**
  2. `lastMessageAt` - **Descending**
- **Query scope:** Collection

Click **Create Index**

### Bước 3: Hoặc click link tự động từ error

Khi chạy app và gặp lỗi index, Firebase sẽ cho link như thế này:
```
https://console.firebase.google.com/v1/r/project/team-manager-5ba6c/firestore/indexes?create_composite=...
```

Chỉ cần click và confirm là xong!

---

## 🔧 Cách 2: Firebase CLI (nếu cần deploy nhiều indexes)

### Fix Firebase CLI authentication

1. **Logout và login lại:**
```bash
firebase logout
firebase login
```

2. **Nếu vẫn lỗi, dùng service account:**

Tạo file `.firebaserc`:
```json
{
  "projects": {
    "default": "team-manager-5ba6c"
  }
}
```

3. **Deploy:**
```bash
firebase deploy --only firestore:indexes --project team-manager-5ba6c
```

---

## 📋 Index đã được định nghĩa trong `firestore.indexes.json`

Tất cả 11 indexes đã có sẵn:
- ✅ conversations (memberIds + lastMessageAt) ← **CẦN NGAY**
- ✅ notifications (userId + read + createdAt)
- ✅ tasks (assigneeId, status, createdAt)
- ✅ taskComments, taskReports
- ✅ evaluations, activityLogs, users, messages

---

## ✨ Khuyến nghị

**Dùng Firebase Console** (cách 1) — nhanh nhất, không cần CLI authentication.

Index conversations là quan trọng nhất (cho Chat feature). Các index khác có thể tạo sau khi gặp lỗi tương tự.

Firebase sẽ build index trong 1-5 phút. Sau đó Chat feature sẽ hoạt động ngay!
