import { useState, FormEvent } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { X, Loader2 } from "lucide-react";

interface SprintModalProps {
  user: User;
  sprint?: any;
  onClose: () => void;
}

export default function SprintModal({ user, sprint, onClose }: SprintModalProps) {
  const [name, setName] = useState(sprint?.name || "");
  const [goal, setGoal] = useState(sprint?.goal || "");
  const [velocityTarget, setVelocityTarget] = useState<number>(sprint?.velocity_target || 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const sprintData = {
        name: name.trim(),
        goal: goal.trim(),
        velocity_target: Number(velocityTarget),
        owner_id: user.id,
      };

      if (sprint?.id) {
        const { error } = await supabase
          .from("sprints")
          .update(sprintData)
          .eq("id", sprint.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sprints")
          .insert(sprintData);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      console.error("Error saving sprint:", error);
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
      <div className="bg-[#12122a] border border-[#2a2a44] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-[#1a1a30]">
          <h2 className="text-lg font-bold font-sans tracking-tight text-white">
            {sprint ? "Edit Sprint" : "New Sprint"}
          </h2>
          <button onClick={onClose} className="text-[#777799] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Sprint Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors"
              placeholder="e.g. Sprint 1 - Foundation"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Sprint Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors min-h-[80px] resize-y"
              placeholder="What are we trying to achieve?"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#777799] mb-1.5 font-semibold">Velocity Target (SP)</label>
            <input
              type="number"
              min="0"
              value={velocityTarget}
              onChange={(e) => setVelocityTarget(Number(e.target.value))}
              className="w-full bg-[#0a0a12] border border-[#2a2a44] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#5b9ff9] transition-colors"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#aaaacc] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 bg-[#5b9ff9] text-[#0a0a12] text-sm font-bold rounded-lg hover:bg-[#4a8ee8] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {sprint ? "Save Changes" : "Create Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
