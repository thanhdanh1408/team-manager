export type Role = "admin" | "member";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "rejection_pending"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  createdById: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  completedAt?: string;
}

export interface Evaluation {
  id: string;
  memberId: string;
  evaluatorId: string;
  taskId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}


export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
}

export interface Stats {
  totalMembers?: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  rejectionPending: number;
  cancelledTasks: number;
  overdueTasks?: number;
  averageRating?: number;
}
