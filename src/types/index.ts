export type Role = "admin" | "member";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus =
  | "in_progress"
  | "completion_pending"
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
  bio?: string;
  department?: string;
  location?: string;
  dateOfBirth?: string;
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
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  completedAt?: string;
}

export interface TaskReport {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  attachments: MessageAttachment[];
  createdAt: string;
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
  avatar?: string;
}

export interface Stats {
  totalMembers?: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionPending: number;
  completedTasks: number;
  rejectionPending: number;
  cancelledTasks: number;
  overdueTasks?: number;
  averageRating?: number;
}

// ─── Messenger-style Chat ─────────────────────────────────────────────────────

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;         // group name (for group convos)
  memberIds: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  createdById: string;
  members?: ConversationMember[];
  displayName?: string;
}

export interface ConversationMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  attachments: MessageAttachment[];
  createdAt: string;
}

export interface MessageAttachment {
  name: string;
  url: string;
  type: "image" | "file";
  size: number;
}

export interface ConversationMedia extends MessageAttachment {
  messageId: string;
  userId: string;
  createdAt: string;
}

export type AiTaskPlanStatus = "draft" | "applied";

export interface AiTaskSuggestion {
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  priority: TaskPriority;
  dueDate: string;
  rationale: string;
}

export interface AiTaskPlan {
  id: string;
  requirement: string;
  analysis: string;
  tasks: AiTaskSuggestion[];
  status: AiTaskPlanStatus;
  createdById: string;
  createdAt: string;
  appliedAt?: string;
  taskIds?: string[];
}

