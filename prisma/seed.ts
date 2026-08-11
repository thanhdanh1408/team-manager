import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("Admin@123", 10);
  const memberHash = await bcrypt.hash("Member@123", 10);

  const admin = await prisma.user.create({
    data: {
      id: "admin-1",
      name: "Nguyễn Văn Admin",
      email: "admin@team.vn",
      passwordHash: hash,
      role: "admin",
      position: "Team Lead",
      phone: "0901234567",
      isActive: true,
    },
  });

  const members = await Promise.all([
    prisma.user.create({
      data: {
        id: "member-1",
        name: "Trần Thị Mai",
        email: "mai@team.vn",
        passwordHash: memberHash,
        role: "member",
        position: "Frontend Developer",
        phone: "0912345678",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: "member-2",
        name: "Lê Minh Tuấn",
        email: "tuan@team.vn",
        passwordHash: memberHash,
        role: "member",
        position: "Backend Developer",
        phone: "0923456789",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: "member-3",
        name: "Phạm Thu Hà",
        email: "ha@team.vn",
        passwordHash: memberHash,
        role: "member",
        position: "UI/UX Designer",
        phone: "0934567890",
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: "member-4",
        name: "Hoàng Đức Anh",
        email: "anh@team.vn",
        passwordHash: memberHash,
        role: "member",
        position: "QA Engineer",
        phone: "0945678901",
        isActive: true,
      },
    }),
  ]);

  await prisma.task.createMany({
    data: [
      {
        id: "task-1",
        title: "Thiết kế giao diện Dashboard",
        description:
          "Thiết kế wireframe và mockup cho trang Dashboard admin, bao gồm stat cards, charts và activity feed.",
        assigneeId: "member-3",
        createdById: admin.id,
        priority: "high",
        status: "in_progress",
        progress: 65,
        dueDate: daysFromNow(5),
        createdAt: daysAgo(3),
        updatedAt: daysAgo(1),
      },
      {
        id: "task-2",
        title: "Xây dựng API Authentication",
        description:
          "Implement JWT auth, login/logout, refresh token và middleware bảo vệ routes.",
        assigneeId: "member-2",
        createdById: admin.id,
        priority: "urgent",
        status: "in_progress",
        progress: 40,
        dueDate: daysFromNow(2),
        createdAt: daysAgo(5),
        updatedAt: daysAgo(0),
      },
      {
        id: "task-3",
        title: "Viết unit test cho module Task",
        description:
          "Viết unit test coverage tối thiểu 80% cho các service liên quan đến Task management.",
        assigneeId: "member-4",
        createdById: admin.id,
        priority: "medium",
        status: "pending",
        progress: 0,
        dueDate: daysFromNow(7),
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
      },
      {
        id: "task-4",
        title: "Tối ưu performance trang danh sách",
        description:
          "Tối ưu re-render, lazy load, virtualization cho bảng danh sách thành viên và tasks.",
        assigneeId: "member-1",
        createdById: admin.id,
        priority: "medium",
        status: "pending",
        progress: 0,
        dueDate: daysFromNow(10),
        createdAt: daysAgo(0),
        updatedAt: daysAgo(0),
      },
      {
        id: "task-5",
        title: "Fix bug hiển thị avatar",
        description:
          "Avatar bị vỡ layout khi tên người dùng quá dài. Cần fix CSS overflow.",
        assigneeId: "member-1",
        createdById: admin.id,
        priority: "low",
        status: "completed",
        progress: 100,
        dueDate: daysAgo(1),
        createdAt: daysAgo(7),
        updatedAt: daysAgo(2),
        completedAt: daysAgo(2),
      },
      {
        id: "task-6",
        title: "Nghiên cứu tích hợp Socket.IO",
        description:
          "Nghiên cứu và prototype realtime progress update bằng Socket.IO cho task progress.",
        assigneeId: "member-2",
        createdById: admin.id,
        priority: "high",
        status: "rejection_pending",
        progress: 10,
        dueDate: daysFromNow(3),
        createdAt: daysAgo(4),
        updatedAt: daysAgo(1),
        rejectionReason:
          "Đang bận task Authentication khẩn cấp, xin chuyển sang sprint sau.",
      },
    ],
  });

  await prisma.evaluation.createMany({
    data: [
      {
        id: "eval-1",
        memberId: "member-1",
        evaluatorId: admin.id,
        taskId: "task-5",
        rating: 5,
        comment: "Hoàn thành nhanh, code sạch, đúng deadline.",
        createdAt: daysAgo(2),
      },
      {
        id: "eval-2",
        memberId: "member-3",
        evaluatorId: admin.id,
        rating: 4,
        comment: "Thiết kế đẹp, cần cải thiện tốc độ giao file design.",
        createdAt: daysAgo(5),
      },
      {
        id: "eval-3",
        memberId: "member-2",
        evaluatorId: admin.id,
        rating: 4,
        comment: "Kỹ năng backend tốt, communication cần cải thiện.",
        createdAt: daysAgo(10),
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        id: "log-1",
        userId: admin.id,
        action: "create_task",
        detail: "Tạo task: Thiết kế giao diện Dashboard",
        createdAt: daysAgo(3),
      },
      {
        id: "log-2",
        userId: "member-3",
        action: "accept_task",
        detail: "Đồng ý nhận task: Thiết kế giao diện Dashboard",
        createdAt: daysAgo(3),
      },
      {
        id: "log-3",
        userId: "member-1",
        action: "complete_task",
        detail: "Hoàn thành task: Fix bug hiển thị avatar",
        createdAt: daysAgo(2),
      },
      {
        id: "log-4",
        userId: "member-2",
        action: "reject_task",
        detail: "Yêu cầu từ chối task: Nghiên cứu tích hợp Socket.IO",
        createdAt: daysAgo(1),
      },
      {
        id: "log-5",
        userId: admin.id,
        action: "create_task",
        detail: "Tạo task: Tối ưu performance trang danh sách",
        createdAt: daysAgo(0),
      },
    ],
  });

  console.log("Seed OK");
  console.log("Admin: admin@team.vn / Admin@123");
  console.log("Member: mai@team.vn / Member@123");
  console.log(`Users: ${1 + members.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
