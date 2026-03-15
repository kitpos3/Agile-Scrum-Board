import { useState, FormEvent } from "react";
import { User } from "firebase/auth";
import { addDoc, collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { X, Loader2 } from "lucide-react";
import CommentsSection from "./CommentsSection";

interface TaskModalProps {
  user: User;
  sprintId: string;
  task?: any;
  onClose: () => void;
  developers?: any[];
  activeDeveloper?: any;
}

const STATUS_OPTIONS = ["Backlog", "To Do", "In Progress", "Code Review", "Testing", "Done"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const EPIC_OPTIONS = ["", "Authentication", "Frontend", "Backend", "Database", "UI/UX", "API", "Other"];

export default function TaskModal({ user, sprintId, task, onClose, developers = [], activeDeveloper }: TaskModalProps) {
  const [epic, setEpic] = useState(task?.epic || "");
  const [desc, setDesc] = useState(task?.desc || "");
  const [assignee, setAssignee] = useState(task?.assignee || activeDeveloper?.name || "");
  const [status, setStatus] = useState(task?.status || "To Do");
  const [priority, setPriority] = useState(task?.priority || "Medium");
  const [sp, setSp] = useState<number>(task?.sp || 0);
  const [blockers, setBlockers] = useState(task?.blockers || "");
  const [loading, setLoading] = useState(false);

  const ASSIGNEE_OPTIONS = ["", ...developers.map(d => d.name)];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) return;

    setLoading(true);
    try {
      const taskData = {
        sprintId,
        epic: epic.trim(),
        desc: desc.trim(),
        assignee: assignee.trim(),
        status,
        priority,
        sp: Number(sp),
        blockers: blockers.trim(),
        ownerId: user.uid,
      };

      if (task?.id) {
        await updateDoc(doc(db, "tasks", task.id), taskData);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, task?.id ? OperationType.UPDATE : OperationType.CREATE, task?.id ? `tasks/${task.id}` : "tasks");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-mono text-[#e0e0ee]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#12122a] border border-[#2a2a44] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-[#1a1a30] shrink-0">
          <h2 className="text-lg font-bold font-sans tracking-tight text-white">
            {task ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} className="text-[#777799] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Description *</label>
                <textarea
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors min-h-[80px] resize-y"
                  placeholder="What needs to be done?"
                  maxLength={1000}
                />
              </div>

            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Epic / Module</label>
              <select
                value={epic}
                onChange={(e) => setEpic(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors appearance-none"
              >
                <option value="">Select Epic / Module</option>
                {EPIC_OPTIONS.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <div className="absolute right-3 top-[34px] pointer-events-none text-[#777799]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors appearance-none"
              >
                <option value="">Select Assignee</option>
                {ASSIGNEE_OPTIONS.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="absolute right-3 top-[34px] pointer-events-none text-[#777799]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors appearance-none"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-3 top-[34px] pointer-events-none text-[#777799]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors appearance-none"
              >
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="absolute right-3 top-[34px] pointer-events-none text-[#777799]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Story Points</label>
              <input
                type="number"
                min="0"
                value={sp}
                onChange={(e) => setSp(Number(e.target.value))}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Blockers / Notes</label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors min-h-[60px] resize-y"
                placeholder="Any blockers or notes?"
                maxLength={500}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[#1a1a30]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#aaaacc] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              disabled={loading || !desc.trim()}
              className="px-4 py-2 bg-[#5b9ff9] text-[#0a0a12] text-sm font-bold rounded-lg hover:bg-[#4a8ee8] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>

        {task?.id && (
          <div className="pt-4 border-t border-[#1a1a30]">
            <CommentsSection user={user} taskId={task.id} activeDeveloper={activeDeveloper} />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
