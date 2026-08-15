import * as dotenv from "dotenv";
dotenv.config();
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";

if (!getApps().length) {
  initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }) });
}
const db = getFirestore();
const ago = (n: number) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
const later = (n: number) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString(); };

async function clearAll() {
  for (const col of ["activityLogs","evaluations","taskComments","notifications","teamMessages","tasks","users"]) {
    const snap = await db.collection(col).get();
    const b = db.batch(); snap.docs.forEach(d => b.delete(d.ref)); await b.commit();
  }
}

async function main() {
  await clearAll();
  const aHash = await bcrypt.hash("Admin@123", 10);
  const mHash = await bcrypt.hash("Member@123", 10);

  await db.collection("users").doc("admin-1").set({ name:"Nguyễn Văn Admin", email:"admin@team.vn", passwordHash:aHash, role:"admin", position:"Team Lead", phone:"0901234567", isActive:true, avatar:null, createdAt:ago(30) });

  for (const [id, name, email, pos, phone] of [
    ["member-1","Trần Thị Mai","mai@team.vn","Frontend Developer","0912345678"],
    ["member-2","Lê Minh Tuấn","tuan@team.vn","Backend Developer","0923456789"],
    ["member-3","Phạm Thu Hà","ha@team.vn","UI/UX Designer","0934567890"],
    ["member-4","Hoàng Đức Anh","anh@team.vn","QA Engineer","0945678901"],
  ]) {
    await db.collection("users").doc(id as string).set({ name, email, passwordHash:mHash, role:"member", position:pos, phone, isActive:true, avatar:null, createdAt:ago(20) });
  }

  const tasks = [
    { id:"task-1", title:"Thiết kế giao diện Dashboard", description:"Wireframe Dashboard admin.", assigneeId:"member-3", createdById:"admin-1", priority:"high", status:"in_progress", progress:65, dueDate:later(5), createdAt:ago(3), updatedAt:ago(1), rejectionReason:null, completedAt:null },
    { id:"task-2", title:"Xây dựng API Authentication", description:"JWT auth, refresh token.", assigneeId:"member-2", createdById:"admin-1", priority:"urgent", status:"in_progress", progress:40, dueDate:later(2), createdAt:ago(5), updatedAt:ago(0), rejectionReason:null, completedAt:null },
    { id:"task-3", title:"Viết unit test cho module Task", description:"Coverage >= 80%.", assigneeId:"member-1", createdById:"admin-1", priority:"medium", status:"pending", progress:0, dueDate:later(7), createdAt:ago(1), updatedAt:ago(1), rejectionReason:null, completedAt:null },
    { id:"task-4", title:"Tối ưu performance trang danh sách", description:"Render < 100ms.", assigneeId:"member-4", createdById:"admin-1", priority:"medium", status:"pending", progress:0, dueDate:later(10), createdAt:ago(0), updatedAt:ago(0), rejectionReason:null, completedAt:null },
    { id:"task-5", title:"Fix bug hiển thị avatar", description:"Fix CSS overflow.", assigneeId:"member-1", createdById:"admin-1", priority:"low", status:"completed", progress:100, dueDate:ago(1), createdAt:ago(7), updatedAt:ago(2), rejectionReason:null, completedAt:ago(2) },
    { id:"task-6", title:"Nghiên cứu Socket.IO", description:"Prototype realtime.", assigneeId:"member-2", createdById:"admin-1", priority:"high", status:"rejection_pending", progress:10, dueDate:later(3), createdAt:ago(4), updatedAt:ago(1), rejectionReason:"Đang bận Authentication.", completedAt:null },
  ];
  for (const t of tasks) { await db.collection("tasks").doc(t.id).set(t); }

  for (const [id, memberId, evaluatorId, taskId, rating, comment, createdAt] of [
    ["eval-1","member-1","admin-1","task-5",5,"Hoàn thành nhanh, code sạch.",ago(2)],
    ["eval-2","member-3","admin-1",null,    4,"Thiết kế đẹp, cần nhanh hơn.",ago(5)],
    ["eval-3","member-2","admin-1",null,    4,"Backend tốt, communication cần cải thiện.",ago(10)],
  ]) { await db.collection("evaluations").doc(id as string).set({ memberId, evaluatorId, taskId:taskId||null, rating, comment, createdAt }); }

  for (const [id, userId, action, detail, createdAt] of [
    ["log-1","admin-1","create_task","Tạo task: Thiết kế Dashboard",ago(3)],
    ["log-2","member-3","accept_task","Đồng ý nhận task: Thiết kế Dashboard",ago(3)],
    ["log-3","member-1","complete_task","Hoàn thành task: Fix bug avatar",ago(2)],
    ["log-4","member-2","reject_task","Yêu cầu từ chối: Socket.IO",ago(1)],
    ["log-5","admin-1","create_task","Tạo task: Tối ưu performance",ago(0)],
  ]) { await db.collection("activityLogs").doc(id as string).set({ userId, action, detail, createdAt }); }

  console.log("\n✅ Firebase Seed OK!\n👤 admin@team.vn / Admin@123\n👤 mai@team.vn / Member@123");
}

main().catch(e => { console.error("❌", e); process.exit(1); });
