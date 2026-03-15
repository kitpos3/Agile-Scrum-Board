import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import SprintModal from "./components/SprintModal";
import TaskModal from "./components/TaskModal";
import ConfirmModal from "./components/ConfirmModal";

const STATUS_ORDER = ["Backlog", "To Do", "In Progress", "Code Review", "Testing", "Done"];
const STATUS_CONFIG: Record<string, any> = {
  Backlog:     { bg: "#1e1e2e", text: "#888899", dot: "#555566" },
  "To Do":     { bg: "#172032", text: "#5b9ff9", dot: "#3b7ddb" },
  "In Progress": { bg: "#2a1f0e", text: "#f0a830", dot: "#d4922a" },
  "Code Review": { bg: "#251530", text: "#c77dff", dot: "#a855f7" },
  Testing:     { bg: "#1a2520", text: "#4ade80", dot: "#22c55e" },
  Done:        { bg: "#0e2018", text: "#22c55e", dot: "#16a34a" },
};
const PRIORITY_CONFIG: Record<string, any> = {
  High:   { color: "#ff6b6b", icon: "▲" },
  Medium: { color: "#f0a830", icon: "◆" },
  Low:    { color: "#4ade80", icon: "▼" },
};

export default function SprintTracker({ user }: { user: User }) {
  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [developers, setDevelopers] = useState<any[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [activeDeveloperId, setActiveDeveloperId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDevDropdownOpen, setIsDevDropdownOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(true);
  const [loading, setLoading] = useState(true);

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const [newDevName, setNewDevName] = useState("");
  const [isAddingDev, setIsAddingDev] = useState(false);

  useEffect(() => {
    if (!user) return;
    const qSprints = query(collection(db, "sprints"), where("ownerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubSprints = onSnapshot(qSprints, (snapshot) => {
      const spData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSprints(spData);
      if (spData.length > 0 && !selectedSprintId) {
        setSelectedSprintId(spData[0].id);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "sprints");
      setLoading(false);
    });

    const qDevs = query(collection(db, "developers"), where("ownerId", "==", user.uid), orderBy("createdAt", "asc"));
    const unsubDevs = onSnapshot(qDevs, (snapshot) => {
      const devData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDevelopers(devData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "developers");
    });

    return () => {
      unsubSprints();
      unsubDevs();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedSprintId) return;
    const qTasks = query(collection(db, "tasks"), where("sprintId", "==", selectedSprintId), where("ownerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "tasks");
    });

    return () => unsubTasks();
  }, [user, selectedSprintId]);

  useEffect(() => {
    setAnimateIn(false);
    const t = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(t);
  }, [selectedSprintId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isDevDropdownOpen && !(e.target as Element).closest('.dev-dropdown-container')) {
        setIsDevDropdownOpen(false);
        setIsAddingDev(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDevDropdownOpen]);

  const handleDeleteTask = async (taskId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "tasks", taskId));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteSprint = async (sprintId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Sprint",
      message: "Are you sure you want to delete this sprint? All associated tasks will remain but be orphaned.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "sprints", sprintId));
          if (selectedSprintId === sprintId) {
            setSelectedSprintId(sprints.find(s => s.id !== sprintId)?.id || null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `sprints/${sprintId}`);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName.trim()) return;
    try {
      await addDoc(collection(db, "developers"), {
        name: newDevName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      });
      setNewDevName("");
      setIsAddingDev(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "developers");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#5b9ff9]" /></div>;
  }

  const currentSprint = sprints.find(s => s.id === selectedSprintId);
  const activeDeveloper = developers.find(d => d.id === activeDeveloperId);

  const filteredTasks = tasks.filter(
    (t) => filterStatus === "All" || t.status === filterStatus
  ).sort((a, b) => {
    if (activeDeveloper) {
      const aIsActive = a.assignee === activeDeveloper.name;
      const bIsActive = b.assignee === activeDeveloper.name;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
    }
    return 0; // Keep original order (createdAt desc) otherwise
  });

  const totalSP = tasks.reduce((s, t) => s + (Number(t.sp) || 0), 0);
  const doneSP = tasks.filter((t) => t.status === "Done").reduce((s, t) => s + (Number(t.sp) || 0), 0);
  const inProgressSP = tasks.filter((t) => t.status === "In Progress" || t.status === "Code Review").reduce((s, t) => s + (Number(t.sp) || 0), 0);

  const statusCounts: Record<string, number> = {};
  tasks.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });

  return (
    <div style={{ background: "#0a0a12", color: "#e0e0ee", fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111122; }
        ::-webkit-scrollbar-thumb { background: #333355; border-radius: 3px; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .task-row { transition: background 0.15s ease, transform 0.15s ease; }
        .task-row:hover { background: rgba(255,255,255,0.03) !important; transform: translateX(2px); }
        .filter-btn { border: 1px solid #222233; background: transparent; color: #777799; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .filter-btn:hover { border-color: #444466; color: #aaaacc; }
        .filter-btn.active { border-color: #5b9ff9; color: #5b9ff9; background: rgba(91,159,249,0.08); }
        .sprint-option { padding: 10px 16px; cursor: pointer; transition: background 0.1s; display: flex; justify-content: space-between; align-items: center; }
        .sprint-option:hover { background: rgba(91,159,249,0.1); }
      `}</style>

      {/* ──── HEADER ──── */}
      <div style={{ padding: "24px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Sprint Tracker
          </div>
          <div style={{ fontSize: 11, color: "#555577", marginTop: 4 }}>SaaS Application • Agile Management</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Developer Selector */}
          <div className="dev-dropdown-container" style={{ position: "relative" }}>
            <button
              onClick={() => setIsDevDropdownOpen(!isDevDropdownOpen)}
              style={{
                background: "linear-gradient(135deg, #12122a, #1a1a35)",
                border: "1px solid #2a2a44",
                borderRadius: 10,
                padding: "10px 20px",
                color: "#fff",
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 200,
                justifyContent: "space-between",
                transition: "border-color 0.15s",
                borderColor: isDevDropdownOpen ? "#c77dff" : "#2a2a44",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#c77dff", display: "inline-block" }} />
                {activeDeveloper?.name || "Select User"} 
              </span>
              <span style={{ fontSize: 10, color: "#555577", transform: isDevDropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
            </button>

            {isDevDropdownOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, width: "100%",
                background: "#13132a", border: "1px solid #2a2a44", borderRadius: 10,
                overflow: "hidden", zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                animation: "fadeIn 0.12s ease",
              }}>
                <div
                  className="sprint-option"
                  onClick={() => { setActiveDeveloperId(null); setIsDevDropdownOpen(false); }}
                  style={{ background: !activeDeveloperId ? "rgba(199,125,255,0.08)" : "transparent", borderLeft: !activeDeveloperId ? "3px solid #c77dff" : "3px solid transparent" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: !activeDeveloperId ? "#c77dff" : "#ccc", fontFamily: "'Space Grotesk', sans-serif" }}>None</div>
                </div>
                {developers.map((d) => (
                  <div
                    key={d.id}
                    className="sprint-option"
                    onClick={() => { setActiveDeveloperId(d.id); setIsDevDropdownOpen(false); }}
                    style={{ background: d.id === activeDeveloperId ? "rgba(199,125,255,0.08)" : "transparent", borderLeft: d.id === activeDeveloperId ? "3px solid #c77dff" : "3px solid transparent" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: d.id === activeDeveloperId ? "#c77dff" : "#ccc", fontFamily: "'Space Grotesk', sans-serif" }}>{d.name}</div>
                  </div>
                ))}
                
                {/* Add New Developer */}
                <div style={{ padding: "10px 16px", borderTop: "1px solid #2a2a44", background: "#0a0a12" }}>
                  {isAddingDev ? (
                    <form onSubmit={handleAddDeveloper} className="flex gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        value={newDevName}
                        onChange={(e) => setNewDevName(e.target.value)}
                        placeholder="Name..."
                        className="w-full bg-[#1a1a30] border border-[#2a2a44] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#c77dff]"
                      />
                      <button type="submit" className="text-xs bg-[#c77dff] text-black px-2 py-1 rounded font-bold">Add</button>
                    </form>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsAddingDev(true); }}
                      className="text-xs text-[#c77dff] hover:text-white flex items-center gap-1 font-bold w-full"
                    >
                      <Plus className="w-3 h-3" /> Add Developer
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditingSprint(null);
              setIsSprintModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a30] hover:bg-[#2a2a44] border border-[#2a2a44] rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> New Sprint
          </button>

          {/* Sprint Selector */}
          {sprints.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  background: "linear-gradient(135deg, #12122a, #1a1a35)",
                  border: "1px solid #2a2a44",
                  borderRadius: 10,
                  padding: "10px 20px",
                  color: "#fff",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 260,
                  justifyContent: "space-between",
                  transition: "border-color 0.15s",
                  borderColor: isDropdownOpen ? "#5b9ff9" : "#2a2a44",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5b9ff9", display: "inline-block" }} />
                  {currentSprint?.name || "Select Sprint"} 
                </span>
                <span style={{ fontSize: 10, color: "#555577", transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {isDropdownOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, width: "100%",
                  background: "#13132a", border: "1px solid #2a2a44", borderRadius: 10,
                  overflow: "hidden", zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                  animation: "fadeIn 0.12s ease",
                }}>
                  {sprints.map((s) => (
                    <div
                      key={s.id}
                      className="sprint-option"
                      onClick={() => { setSelectedSprintId(s.id); setIsDropdownOpen(false); setFilterStatus("All"); }}
                      style={{ background: s.id === selectedSprintId ? "rgba(91,159,249,0.08)" : "transparent", borderLeft: s.id === selectedSprintId ? "3px solid #5b9ff9" : "3px solid transparent" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: s.id === selectedSprintId ? "#5b9ff9" : "#ccc", fontFamily: "'Space Grotesk', sans-serif" }}>{s.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!currentSprint ? (
        <div className="p-12 text-center text-[#777799]">
          <p>No sprints found. Create one to get started.</p>
        </div>
      ) : (
        <>
          {/* ──── SPRINT GOAL ──── */}
          <div style={{
            margin: "16px 28px", padding: "12px 18px",
            background: "linear-gradient(135deg, rgba(91,159,249,0.06), rgba(168,85,247,0.04))",
            border: "1px solid rgba(91,159,249,0.12)", borderRadius: 10,
            display: "flex", justifyContent: "space-between", alignItems: "flex-start"
          }}>
            <div>
              <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 2, color: "#5b9ff9", marginBottom: 4, fontWeight: 600 }}>Sprint Goal</div>
              <div style={{ fontSize: 13, color: "#aaaacc", lineHeight: 1.5, fontFamily: "'Space Grotesk', sans-serif" }}>{currentSprint.goal || "No goal set for this sprint."}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingSprint(currentSprint); setIsSprintModalOpen(true); }} className="p-2 text-[#777799] hover:text-[#5b9ff9] transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDeleteSprint(currentSprint.id)} className="p-2 text-[#777799] hover:text-[#ff6b6b] transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* ──── STATS ──── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "0 28px", marginBottom: 16 }}>
            {[
              { label: "Total SP", value: totalSP, color: "#e0e0ee", target: currentSprint.velocityTarget },
              { label: "Done", value: doneSP, color: "#22c55e" },
              { label: "In Flight", value: inProgressSP, color: "#f0a830" },
              { label: "Completion", value: totalSP > 0 ? Math.round((doneSP / totalSP) * 100) + "%" : "0%", color: "#5b9ff9" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "linear-gradient(135deg, #111125, #161633)",
                border: "1px solid #1e1e38",
                borderRadius: 10, padding: "14px 16px",
                animation: animateIn ? `slideUp 0.3s ease ${i * 0.05}s both` : "none",
              }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, color: "#555577", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.value}
                  {s.target && <span style={{ fontSize: 11, color: "#555577", fontWeight: 400 }}> / {s.target}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ──── FILTERS & ACTIONS ──── */}
          <div style={{ padding: "0 28px 12px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#444466", marginRight: 4, textTransform: "uppercase", letterSpacing: 1 }}>Status</span>
              {["All", ...STATUS_ORDER].map((s) => (
                <button key={s} className={`filter-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
                  {s}{s !== "All" && statusCounts[s] ? ` (${statusCounts[s]})` : ""}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#5b9ff9] hover:bg-[#4a8ee8] text-[#0a0a12] rounded-lg text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {/* ──── TABLE ──── */}
          <div style={{ padding: "0 28px 28px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 3px", minWidth: 900 }}>
              <thead>
                <tr>
                  {["Epic / Module", "Task Description", "Assignee", "Status", "Priority", "SP", "Blockers / Notes", "Actions"].map((h, i) => (
                    <th key={h} style={{
                      fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5,
                      color: "#444466", textAlign: i === 1 || i === 6 ? "left" : "center",
                      padding: "8px 12px", fontWeight: 500, borderBottom: "1px solid #1a1a30",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, idx) => {
                  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG["Backlog"];
                  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG["Medium"];
                  return (
                    <tr
                      key={task.id}
                      className="task-row group"
                      style={{
                        animation: animateIn ? `slideUp 0.3s ease ${idx * 0.04}s both` : "none",
                        background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        borderRadius: 8,
                      }}
                    >
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, padding: "3px 10px", borderRadius: 20,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                          color: "#888899", whiteSpace: "nowrap",
                        }}>
                          {task.epic || "General"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#cccce0", lineHeight: 1.45, fontFamily: "'Space Grotesk', sans-serif", maxWidth: 360 }}>
                        {task.desc}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 11, color: "#aaaacc", whiteSpace: "nowrap" }}>
                        {task.assignee || "Unassigned"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                          background: sc.bg, color: sc.text, whiteSpace: "nowrap",
                          display: "inline-flex", alignItems: "center", gap: 5,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ fontSize: 11, color: pc.color, fontWeight: 600 }}>
                          {pc.icon} {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#e0e0ee" }}>
                        {task.sp}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: task.blockers ? "#f0a830" : "#333344", maxWidth: 280, lineHeight: 1.4, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {task.blockers || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="p-1.5 text-[#777799] hover:text-[#5b9ff9] hover:bg-[#1a1a30] rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-[#777799] hover:text-[#ff6b6b] hover:bg-[#1a1a30] rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#444466", fontSize: 13 }}>
                      No tasks match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isSprintModalOpen && (
        <SprintModal
          user={user}
          sprint={editingSprint}
          onClose={() => setIsSprintModalOpen(false)}
        />
      )}

      {isTaskModalOpen && currentSprint && (
        <TaskModal
          user={user}
          sprintId={currentSprint.id}
          task={editingTask}
          onClose={() => setIsTaskModalOpen(false)}
          developers={developers}
          activeDeveloper={activeDeveloper}
        />
      )}

      {confirmModal && confirmModal.isOpen && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
