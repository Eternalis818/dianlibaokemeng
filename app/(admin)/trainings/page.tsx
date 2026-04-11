"use client";
import { useState, useEffect, useCallback } from "react";

interface Training {
  id: number; title: string; content: string; version: number; isActive: boolean; createdAt: string; updatedAt: string;
}
interface Question {
  id: number; question: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string;
}

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Questions management
  const [selectedTraining, setSelectedTraining] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showQForm, setShowQForm] = useState(false);
  const [qData, setQData] = useState({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" });
  const [savingQ, setSavingQ] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetch("/api/safety-trainings").then((r) => r.json());
      if (Array.isArray(data)) setTrainings(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchQuestions = async (trainingId: number) => {
    setSelectedTraining(trainingId);
    try {
      // Fetch with correct answers for admin
      const data = await fetch(`/api/safety-trainings/${trainingId}/questions`).then((r) => r.json());
      setQuestions(Array.isArray(data) ? data : []);
    } catch { setQuestions([]); }
  };

  const resetForm = () => {
    setTitle(""); setContent(""); setShowForm(false); setEditing(null);
  };

  const openEdit = (t: Training) => {
    setEditing(t); setTitle(t.title); setContent(t.content); setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/safety-trainings/${editing.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content: content.trim() }),
          })
        : await fetch("/api/safety-trainings", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim(), content: content.trim() }),
          });
      if (res.ok) { resetForm(); fetchAll(); }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleToggle = async (t: Training) => {
    try {
      await fetch(`/api/safety-trainings/${t.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      fetchAll();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除该培训？")) return;
    try {
      await fetch(`/api/safety-trainings/${id}`, { method: "DELETE" });
      fetchAll();
      if (selectedTraining === id) { setSelectedTraining(null); setQuestions([]); }
    } catch { /* ignore */ }
  };

  const handleAddQuestion = async () => {
    if (!selectedTraining || !qData.question.trim() || !qData.optionA.trim() || !qData.optionB.trim()) return;
    setSavingQ(true);
    try {
      const res = await fetch(`/api/safety-trainings/${selectedTraining}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(qData),
      });
      if (res.ok) {
        setQData({ question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" });
        setShowQForm(false);
        fetchQuestions(selectedTraining);
      }
    } catch { /* ignore */ }
    setSavingQ(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">安规学习</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>扣满12分需完成学习+考试才能核销扣分解锁</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-sm px-4 py-2">+ 新增培训</button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-5 space-y-3" style={{ borderLeft: "2px solid var(--accent)" }}>
          <div className="text-sm font-semibold text-white">{editing ? `编辑 — ${editing.title}` : "新增培训"}</div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>标题 *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：施工现场安全规范"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>内容 *</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="培训材料内容..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-y"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? "保存中..." : editing ? "确认修改" : "确认创建"}
            </button>
            <button onClick={resetForm} className="btn-ghost text-sm">取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      ) : trainings.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无安规培训内容</div>
      ) : (
        <div className="space-y-3">
          {trainings.map((t) => (
            <div key={t.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">{t.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                    style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)", border: "1px solid rgba(59,130,246,0.2)" }}>
                    v{t.version}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchQuestions(t.id)}
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ color: "var(--amber)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                    题目{selectedTraining === t.id ? " ▼" : ""}
                  </button>
                  <button onClick={() => handleToggle(t)} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ color: t.isActive ? "var(--green)" : "var(--muted)", background: t.isActive ? "rgba(16,185,129,0.1)" : "var(--bg)" }}>
                    {t.isActive ? "启用" : "停用"}
                  </button>
                  <button onClick={() => openEdit(t)} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    编辑
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    删除
                  </button>
                </div>
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {t.content.length > 120 ? t.content.slice(0, 120) + "..." : t.content}
              </div>

              {/* Questions panel */}
              {selectedTraining === t.id && (
                <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-white">考试题目 ({questions.length})</div>
                    <button onClick={() => setShowQForm(!showQForm)} className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: "var(--accent)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      {showQForm ? "取消" : "+ 新增题目"}
                    </button>
                  </div>

                  {showQForm && (
                    <div className="glass rounded-lg p-4 mb-3 space-y-2" style={{ borderLeft: "2px solid var(--amber)" }}>
                      <input value={qData.question} onChange={(e) => setQData({ ...qData, question: e.target.value })} placeholder="题目"
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={qData.optionA} onChange={(e) => setQData({ ...qData, optionA: e.target.value })} placeholder="选项A"
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        <input value={qData.optionB} onChange={(e) => setQData({ ...qData, optionB: e.target.value })} placeholder="选项B"
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        <input value={qData.optionC} onChange={(e) => setQData({ ...qData, optionC: e.target.value })} placeholder="选项C"
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                        <input value={qData.optionD} onChange={(e) => setQData({ ...qData, optionD: e.target.value })} placeholder="选项D"
                          className="rounded-lg px-3 py-2 text-sm outline-none"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: "var(--muted)" }}>正确答案</span>
                        {["A", "B", "C", "D"].map((opt) => (
                          <button key={opt} onClick={() => setQData({ ...qData, correctAnswer: opt })}
                            className="text-xs px-3 py-1 rounded-lg"
                            style={{
                              color: qData.correctAnswer === opt ? "#fff" : "var(--muted)",
                              background: qData.correctAnswer === opt ? "var(--accent)" : "var(--bg)",
                              border: `1px solid ${qData.correctAnswer === opt ? "var(--accent)" : "var(--border)"}`,
                            }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                      <button onClick={handleAddQuestion} disabled={savingQ} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                        {savingQ ? "保存中..." : "确认添加"}
                      </button>
                    </div>
                  )}

                  {questions.length === 0 ? (
                    <div className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>暂无题目</div>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((q, idx) => (
                        <div key={q.id} className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--bg)" }}>
                          <div className="text-white mb-1">{idx + 1}. {q.question}</div>
                          <div className="flex gap-3" style={{ color: "var(--muted)" }}>
                            <span style={q.correctAnswer === "A" ? { color: "var(--green)" } : {}}>A.{q.optionA}</span>
                            <span style={q.correctAnswer === "B" ? { color: "var(--green)" } : {}}>B.{q.optionB}</span>
                            <span style={q.correctAnswer === "C" ? { color: "var(--green)" } : {}}>C.{q.optionC}</span>
                            <span style={q.correctAnswer === "D" ? { color: "var(--green)" } : {}}>D.{q.optionD}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
