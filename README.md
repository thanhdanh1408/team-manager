# Team Manager

Hệ thống quản lý team — thành viên, công việc, đánh giá. Giao diện sạch, 2 role **Admin** / **Thành viên**.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **Prisma 5** + SQLite
- **JWT** (httpOnly cookie) + **bcryptjs**
- **Zod** validation, **Sonner** toast

## Tính năng

### Admin
- Dashboard thống kê realtime (poll)
- CRUD thành viên (mật khẩu mạnh, SĐT VN)
- CRUD task, giao việc, duyệt/từ chối yêu cầu hủy
- Đánh giá thành viên (1–5 sao)
- Nhật ký hoạt động

### Thành viên
- Xem task được giao
- **Đồng ý** / **Từ chối** (kèm lý do → chờ Admin duyệt)
- Cập nhật tiến độ (0–100%, 100% = hoàn thành)
- Xem đánh giá của bản thân

## Chạy local

```bash
# Cài dependency
npm install

# Tạo DB + seed
npm run db:push
npm run db:seed

# Dev server
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

### Tài khoản demo

| Role   | Email          | Password    |
|--------|----------------|-------------|
| Admin  | admin@team.vn  | Admin@123   |
| Member | mai@team.vn    | Member@123  |
| Member | tuan@team.vn   | Member@123  |
| Member | ha@team.vn     | Member@123  |
| Member | anh@team.vn    | Member@123  |

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema → SQLite |
| `npm run db:seed` | Seed data demo |
| `npm run db:reset` | Xóa DB + seed lại |

## Cấu trúc

```
src/
  app/
    api/          # REST API (auth, users, tasks, evaluations, logs, stats)
    admin/        # UI Admin
    member/       # UI Thành viên
    login/
  components/     # UI + layout
  context/        # AuthContext
  hooks/          # useStore, useDebouncedValue
  lib/            # db, auth, validations, api-client
prisma/
  schema.prisma
  seed.ts
```

## Luồng task

```
Admin tạo & giao
    ↓
pending → Member Đồng ý → in_progress → progress 100% → completed
                ↘ Từ chối (lý do) → rejection_pending
                                        ↓ Admin duyệt → cancelled
                                        ↓ Admin từ chối yêu cầu → pending
```

## Bảo mật

- Mật khẩu hash bcrypt
- JWT trong httpOnly cookie
- Middleware bảo vệ `/admin`, `/member`
- Zod validate input
- Role-based API (admin-only endpoints)
