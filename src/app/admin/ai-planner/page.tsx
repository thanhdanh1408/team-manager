"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Clock3, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { api } from "@/lib/api-client";
import { formatDate, priorityColor, priorityLabel } from "@/lib/utils";
import type { AiTaskPlan } from "@/types";

export default function AiPlannerPage() {
  const [requirement, setRequirement] = useState("");
  const [plans, setPlans] = useState<AiTaskPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadPlans = async () => {
    try {
      const result = await api.get<{ data: AiTaskPlan[] }>("/api/ai/task-plans");
      setPlans(result.data);
      setSelectedId((current) => current || result.data[0]?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được các bản phân công");
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadPlans(); }, []);
  const selected = plans.find((plan) => plan.id === selectedId) || null;

  const generate = async () => {
    if (requirement.trim().length < 20) { toast.error("Hãy mô tả yêu cầu ít nhất 20 ký tự"); return; }
    setGenerating(true);
    try {
      const plan = await api.post<AiTaskPlan>("/api/ai/task-plans", { requirement: requirement.trim() });
      setPlans((previous) => [plan, ...previous]);
      setSelectedId(plan.id);
      setRequirement("");
      toast.success("AI đã tạo và lưu bản phân công nháp");
    } catch (error) { toast.error(error instanceof Error ? error.message : "AI phân tích thất bại"); }
    finally { setGenerating(false); }
  };

  const applyPlan = async () => {
    if (!selected || selected.status === "applied") return;
    setApplying(true);
    try {
      await api.post(`/api/ai/task-plans/${selected.id}/apply`);
      setPlans((previous) => previous.map((plan) => plan.id === selected.id ? { ...plan, status: "applied", appliedAt: new Date().toISOString() } : plan));
      toast.success("Đã tạo và giao toàn bộ công việc trong bản phân công");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể áp dụng bản phân công"); }
    finally { setApplying(false); }
  };

  return <div>
    <PageHeader title="AI phân tích & phân công" description="Phân tích yêu cầu, đề xuất người phù hợp và chỉ tạo task sau khi Admin duyệt" />
    <div className="mb-5 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
      <div className="mb-3 flex items-center gap-2 text-violet-800"><Sparkles size={18} /><p className="font-semibold">Mô tả bài toán hoặc yêu cầu dự án</p></div>
      <Textarea id="ai-requirement" value={requirement} onChange={(event) => setRequirement(event.target.value)} rows={6} placeholder="Ví dụ: Xây dựng landing page ra mắt sản phẩm trong 2 tuần, cần thiết kế, nội dung, frontend và kiểm thử..." />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">AI sử dụng năng lực hồ sơ và số task đang làm để cân bằng phân công.</p>
        <Button onClick={generate} loading={generating}><Bot size={16} /> Phân tích và tạo bản nháp</Button>
      </div>
    </div>

    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">Kết quả đã lưu</p>
        {loading ? <p className="p-5 text-center text-sm text-slate-400">Đang tải...</p> : plans.length === 0 ? <p className="p-5 text-center text-sm text-slate-400">Chưa có bản phân công</p> : <div className="max-h-[560px] overflow-y-auto">
          {plans.map((plan) => <button key={plan.id} type="button" onClick={() => setSelectedId(plan.id)} className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${selectedId === plan.id ? "bg-slate-50" : ""}`}>
            <p className="line-clamp-2 text-sm font-medium text-slate-800">{plan.requirement}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400"><span>{formatDate(plan.createdAt)}</span><span>{plan.status === "applied" ? "Đã áp dụng" : "Bản nháp"}</span></div>
          </button>)}
        </div>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {!selected ? <div className="py-16 text-center"><Bot size={42} className="mx-auto mb-3 text-slate-200" /><p className="text-sm text-slate-400">Chọn hoặc tạo một bản phân công để xem chi tiết</p></div> : <>
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div><div className="mb-1 flex items-center gap-2"><h2 className="font-semibold text-slate-900">Bản phân công AI</h2>{selected.status === "applied" ? <Badge className="bg-emerald-100 text-emerald-700">Đã áp dụng</Badge> : <Badge className="bg-amber-100 text-amber-700">Bản nháp</Badge>}</div><p className="text-sm text-slate-500">{selected.requirement}</p></div>
            {selected.status === "draft" && <Button onClick={applyPlan} loading={applying}><CheckCircle2 size={16} /> Áp dụng</Button>}
          </div>
          <div className="mb-5 rounded-lg bg-violet-50 p-4"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Phân tích</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selected.analysis}</p></div>
          <div className="space-y-3">
            {selected.tasks.map((task, index) => <div key={`${task.title}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-slate-900">{index + 1}. {task.title}</p><p className="mt-1 text-sm text-slate-600">{task.description}</p></div><Badge className={priorityColor[task.priority]}>{priorityLabel[task.priority]}</Badge></div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span className="flex items-center gap-1.5"><UserRound size={13} />{task.assigneeName}</span><span className="flex items-center gap-1.5"><Clock3 size={13} />Hạn {formatDate(task.dueDate)}</span></div>
              <p className="mt-2 text-xs italic text-slate-400">Lý do phân công: {task.rationale}</p>
            </div>)}
          </div>
        </>}
      </div>
    </div>
  </div>;
}
