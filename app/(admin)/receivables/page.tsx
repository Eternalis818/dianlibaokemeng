"use client";
import { useState, useEffect, useCallback } from "react";

// ─── 常量 ────────────────────────────────────────────────────────────────
const DEBTOR_TYPES: Record<string, { label: string; color: string }> = {
  state_owned: { label: "公家单位", color: "#3b82f6" },
  affiliated: { label: "挂靠单位", color: "#a78bfa" },
  private: { label: "私人业主", color: "#f59e0b" },
  government: { label: "政府机构", color: "#10b981" },
  general_contractor: { label: "总包单位", color: "#f472b6" },
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "待收", color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  ready: { label: "可收", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  billed: { label: "已开票", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  collected: { label: "已收", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  overdue: { label: "逾期", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

const MILESTONE_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "待收", color: "#94a3b8", icon: "⏳" },
  ready: { label: "可收", color: "#10b981", icon: "✅" },
  billed: { label: "已开票", color: "#3b82f6", icon: "📄" },
  collected: { label: "已收", color: "#10b981", icon: "💰" },
};

const DEFAULT_MILESTONES = [
  { name: "预付款", percentage: 30, requiredDocs: ["合同原件", "发票"] },
  { name: "进度款", percentage: 40, requiredDocs: ["进度确认单", "工程量签认", "发票"] },
  { name: "竣工验收款", percentage: 25, requiredDocs: ["竣工验收报告", "结算书", "发票"] },
  { name: "质保金", percentage: 5, requiredDocs: ["质保期满证明"] },
];

function fmtMoney(n: number) {
  return "¥" + n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 知识库Tab ─────────────────────────────────────────────────────────
const KB_CATEGORIES = [
  { key: "", label: "全部" },
  { key: "strategy", label: "催收策略" },
  { key: "script", label: "话术模板" },
  { key: "legal", label: "法律知识" },
  { key: "industry", label: "行业惯例" },
  { key: "specialized", label: "专有知识" },
  { key: "custom", label: "自定义" },
];

function KnowledgeTab() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editArticle, setEditArticle] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState("");

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      const res = await fetch(`/api/collection-knowledge?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setArticles(data);
    } catch { /* */ }
    setLoading(false);
  }, [category, search]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除？")) return;
    await fetch(`/api/collection-knowledge/${id}`, { method: "DELETE" });
    loadArticles();
    if (selected?.id === id) setSelected(null);
  };

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadArticles()}
          placeholder="搜索标题或内容..."
          className="flex-1 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "white" }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "white" }}>
          {KB_CATEGORIES.map((c) => <option key={c.key} value={c.key} style={{ background: "#1e293b" }}>{c.label}</option>)}
        </select>
        <button onClick={() => { setEditArticle(null); setShowEditor(true); }}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>+ 新增</button>
      </div>

      {/* 文章列表 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 左侧列表 */}
        <div className="col-span-1 space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--muted)" }}>加载中...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--muted)" }}>暂无文章</div>
          ) : articles.map((a: any) => (
            <div key={a.id} onClick={() => setSelected(a)}
              className="p-3 rounded-lg cursor-pointer transition-all" style={{ background: selected?.id === a.id ? "var(--surface)" : "var(--bg)", border: `1px solid ${selected?.id === a.id ? "var(--accent)" : "var(--border)"}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{a.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>
                      {KB_CATEGORIES.find((c) => c.key === a.category)?.label || a.category}
                    </span>
                    {a.isEncrypted && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>加密</span>}
                    {a.isBuiltIn && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>内置</span>}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditArticle(a); setShowEditor(true); }}
                  className="text-[10px] shrink-0 px-1.5 py-0.5 rounded" style={{ color: "var(--muted)" }}>编辑</button>
              </div>
            </div>
          ))}
        </div>

        {/* 右侧详情 */}
        <div className="col-span-2 max-h-[65vh] overflow-y-auto rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{selected.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>
                      {KB_CATEGORIES.find((c) => c.key === selected.category)?.label || selected.category}
                    </span>
                    {selected.isEncrypted && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>专有知识（加密）</span>}
                  </div>
                  {selected.subCategory && <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>分类：{selected.subCategory}</div>}
                </div>
                {!selected.isBuiltIn && (
                  <button onClick={() => handleDelete(selected.id)} className="text-xs px-2 py-1 rounded" style={{ color: "#f87171" }}>删除</button>
                )}
              </div>
              {selected.isEncrypted ? (
                <div className="text-center py-12 text-sm" style={{ color: "var(--muted)" }}>
                  <div className="text-2xl mb-2">🔒</div>
                  此为专有知识，需联系客服解锁查看
                </div>
              ) : (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {selected.content}
                </div>
              )}
              {selected.tags && selected.tags.length > 0 && (
                <div className="flex gap-1.5 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  {selected.tags.map((t: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>
              <div className="text-3xl mb-2">📚</div>
              点击左侧文章查看详情
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showEditor && (
        <KnowledgeEditor
          article={editArticle}
          onClose={() => { setShowEditor(false); setEditArticle(null); }}
          onSaved={() => { setShowEditor(false); setEditArticle(null); loadArticles(); }}
        />
      )}
    </div>
  );
}

// ─── 知识库编辑器弹窗 ─────────────────────────────────────────────────
function KnowledgeEditor({ article, onClose, onSaved }: { article?: any; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(article?.category || "strategy");
  const [subCategory, setSubCategory] = useState(article?.subCategory || "");
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [tags, setTags] = useState<string[]>(article?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(article?.isEncrypted || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (article) {
      setCategory(article.category || "strategy");
      setSubCategory(article.subCategory || "");
      setTitle(article.title || "");
      setContent(article.content || "");
      setTags(article.tags || []);
      setIsEncrypted(article.isEncrypted || false);
    }
  }, [article]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const url = article ? `/api/collection-knowledge/${article.id}` : "/api/collection-knowledge";
      const method = article ? "PATCH" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, subCategory, title, content, tags, isEncrypted }) });
      onSaved();
    } catch { /* */ }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">{article ? "编辑知识" : "新增知识"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>分类 *</div>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
              {KB_CATEGORIES.filter((c) => c.key !== "").map((c) => <option key={c.key} value={c.key} style={{ background: "#1e293b" }}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>子分类</div>
            <input value={subCategory} onChange={(e) => setSubCategory(e.target.value)} placeholder="如：国网三产、城投"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>标题 *</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章标题"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>正文内容 *</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="文章正文..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>标签（回车添加）</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>
                  {t} <button onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(""); } }} placeholder="标签"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="encCheck" checked={isEncrypted} onChange={(e) => setIsEncrypted(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="encCheck" className="text-xs" style={{ color: "#f59e0b" }}>标记为专有知识（加密，仅订阅用户可见）</label>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>取消</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── AI 助手Tab ──────────────────────────────────────────────────────
function AIAssistantTab() {
  const [action, setAction] = useState<"strategy" | "letter" | "timing" | "custom">("strategy");
  const [debtorType, setDebtorType] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [overdueDays, setOverdueDays] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [pendingAmount, setPendingAmount] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doAsk = async (actionType?: string) => {
    const act = actionType || action;
    if (act === "custom" && !customQuestion.trim()) return;
    if (act === "strategy" && !debtorType) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: "" }]);

    try {
      const body: any = { action: act === "custom" ? undefined : act };
      if (act === "strategy" || act === "timing") {
        if (debtorType) body.debtorType = debtorType;
        if (debtorName) body.debtorName = debtorName;
        if (overdueDays) body.overdueDays = parseInt(overdueDays);
        if (contractAmount) body.contractAmount = parseFloat(contractAmount);
        if (pendingAmount) body.pendingAmount = parseFloat(pendingAmount);
      }
      if (act === "letter") {
        body.debtorName = debtorName;
        body.pendingAmount = pendingAmount;
        body.overdueDays = overdueDays ? parseInt(overdueDays) : undefined;
        body.contractAmount = contractAmount ? parseFloat(contractAmount) : undefined;
      }
      if (act === "custom") {
        body.customQuestion = customQuestion;
      }

      const res = await fetch("/api/collection-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { role: "assistant", content: data.content || data.error || "服务暂不可用" };
        return updated;
      });
      if (act === "custom") setCustomQuestion("");
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) updated[updated.length - 1] = { role: "assistant", content: "请求失败，请稍后重试" };
        return updated;
      });
    }
    setLoading(false);
  };

  const actionButtons = [
    { key: "strategy" as const, label: "催收策略", desc: "根据债主类型推荐" },
    { key: "letter" as const, label: "催款函", desc: "生成正式催款函" },
    { key: "timing" as const, label: "时机分析", desc: "分析最佳催收时间" },
    { key: "custom" as const, label: "自由问答", desc: "任意催收问题" },
  ];

  return (
    <div className="space-y-4">
      {/* 操作模式选择 */}
      <div className="grid grid-cols-4 gap-3">
        {actionButtons.map((btn) => (
          <button key={btn.key} onClick={() => setAction(btn.key)}
            className="p-4 rounded-xl text-center transition-all" style={{ background: action === btn.key ? "var(--surface)" : "var(--bg)", border: `1px solid ${action === btn.key ? "var(--accent)" : "var(--border)"}` }}>
            <div className="text-sm font-medium" style={{ color: action === btn.key ? "white" : "var(--muted)" }}>{btn.label}</div>
            <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{btn.desc}</div>
          </button>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {action === "strategy" && (
          <div className="space-y-3">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>债主信息（填写的越多建议越精准）</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>债主类型 *</div>
                <select value={debtorType} onChange={(e) => setDebtorType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
                  <option value="" style={{ background: "#1e293b" }}>选择类型</option>
                  {Object.entries(DEBTOR_TYPES).map(([k, v]) => <option key={k} value={k} style={{ background: "#1e293b" }}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>债主名称</div>
                <input value={debtorName} onChange={(e) => setDebtorName(e.target.value)} placeholder="如：XX电力公司"
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>逾期天数</div>
                <input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>待收金额</div>
                <input value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
            </div>
          </div>
        )}
        {action === "letter" && (
          <div className="space-y-3">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>催款函信息</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>债主名称 *</div>
                <input value={debtorName} onChange={(e) => setDebtorName(e.target.value)} placeholder="公司名称"
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>欠款金额</div>
                <input value={pendingAmount} onChange={(e) => setPendingAmount(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>逾期天数</div>
                <input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>合同总额</div>
                <input value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
            </div>
          </div>
        )}
        {action === "timing" && (
          <div className="space-y-3">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>分析催收时机（留空则分析当前整体情况）</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>债主类型</div>
                <select value={debtorType} onChange={(e) => setDebtorType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
                  <option value="" style={{ background: "#1e293b" }}>不限类型</option>
                  {Object.entries(DEBTOR_TYPES).map(([k, v]) => <option key={k} value={k} style={{ background: "#1e293b" }}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>逾期天数</div>
                <input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} placeholder="0"
                  className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
            </div>
          </div>
        )}
        {action === "custom" && (
          <div className="space-y-3">
            <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>输入您的催收问题</div>
            <textarea value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} rows={4}
              placeholder="如：对付老赖最好的方法是什么？国网三产单位拖欠工程款该如何处理？"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
        )}

        {/* 发送按钮 */}
        <div className="flex justify-end mt-4">
          <button onClick={() => doAsk()} disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", boxShadow: "0 0 20px rgba(139,92,246,0.25)" }}>
            {loading ? "分析中..." : "🚀 发送"}
          </button>
        </div>
      </div>

      {/* AI 回复 */}
      {messages.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>AI 建议</div>
          {messages.map((m, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs mb-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded" style={{ background: m.role === "user" ? "rgba(59,130,246,0.1)" : "rgba(139,92,246,0.1)", color: m.role === "user" ? "#60a5fa" : "#a78bfa" }}>
                  {m.role === "user" ? "你" : "AI"}
                </span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>
                {i === messages.length - 1 && loading ? (
                  <span style={{ color: "var(--muted)" }}>正在思考中...</span>
                ) : m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 债主管理弹窗 ──────────────────────────────────────────────────────
function DebtorModal({ open, onClose, onSaved, edit }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  edit?: any;
}) {
  const [name, setName] = useState(edit?.name || "");
  const [type, setType] = useState(edit?.type || "state_owned");
  const [creditCode, setCreditCode] = useState(edit?.creditCode || "");
  const [address, setAddress] = useState(edit?.address || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(edit?.tags || []);
  const [notes, setNotes] = useState(edit?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setName(edit.name || ""); setType(edit.type || "state_owned");
      setCreditCode(edit.creditCode || ""); setAddress(edit.address || "");
      setTags(edit.tags || []); setNotes(edit.notes || "");
    } else {
      setName(""); setType("state_owned"); setCreditCode(""); setAddress(""); setTags([]); setNotes("");
    }
  }, [edit, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = edit ? `/api/debtors/${edit.id}` : "/api/debtors";
      const method = edit ? "PATCH" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, type, creditCode, address, tags, notes }) });
      onSaved();
      onClose();
    } catch { /* */ }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">{edit ? "编辑债主" : "新增债主"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>名称 *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="公司/单位名称"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>类型</div>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
              {Object.entries(DEBTOR_TYPES).map(([k, v]) => <option key={k} value={k} style={{ background: "#1e293b" }}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>信用代码</div>
            <input value={creditCode} onChange={(e) => setCreditCode(e.target.value)} placeholder="统一社会信用代码"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>地址</div>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="地址"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>标签（回车添加）</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent)" }}>
                  {t} <button onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(""); } }} placeholder="如：国网三产、城投"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div className="col-span-2">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>备注</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="备注信息"
              className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>取消</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>{saving ? "保存中..." : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 创建收款台账弹窗 ─────────────────────────────────────────────────
function ReceivableModal({ open, onClose, onSaved, debtors, projects }: {
  open: boolean; onClose: () => void; onSaved: () => void; debtors: any[]; projects: any[];
}) {
  const [debtorId, setDebtorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [invoiceRequired, setInvoiceRequired] = useState("专票");
  const [notes, setNotes] = useState("");
  const [milestones, setMilestones] = useState(DEFAULT_MILESTONES.map((m) => ({ ...m, dueDate: "" })));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDebtorId(""); setProjectId(""); setContractAmount(""); setContractDate("");
      setPaymentTerms(""); setInvoiceRequired("专票"); setNotes("");
      setMilestones(DEFAULT_MILESTONES.map((m) => ({ ...m, dueDate: "" })));
    }
  }, [open]);

  const updateMilestone = (idx: number, field: string, value: any) => {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const handleSave = async () => {
    if (!debtorId || !contractAmount) return;
    setSaving(true);
    try {
      await fetch("/api/receivables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtorId: parseInt(debtorId), projectId: projectId || null,
          contractAmount: parseFloat(contractAmount),
          contractDate: contractDate || null, paymentTerms, invoiceRequired, notes,
          milestones: milestones.map((m) => ({ name: m.name, percentage: m.percentage, dueDate: m.dueDate || null, requiredDocs: m.requiredDocs })),
        }),
      });
      onSaved();
      onClose();
    } catch { /* */ }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white">新建收款台账</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>债主 *</div>
            <select value={debtorId} onChange={(e) => setDebtorId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
              <option value="">选择债主</option>
              {debtors.map((d: any) => <option key={d.id} value={d.id} style={{ background: "#1e293b" }}>{d.name} ({DEBTOR_TYPES[d.type]?.label})</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>关联项目</div>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
              <option value="">不关联</option>
              {projects.map((p: any) => <option key={p.code} value={p.code} style={{ background: "#1e293b" }}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>合同金额 *</div>
            <input type="number" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>合同日期</div>
            <input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>开票要求</div>
            <select value={invoiceRequired} onChange={(e) => setInvoiceRequired(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
              <option value="专票">增值税专用发票</option>
              <option value="普票">增值税普通发票</option>
              <option value="不需要">不需要发票</option>
            </select>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>付款条款</div>
            <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="如：按月进度80%"
              className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          </div>
        </div>

        {/* 收款节点 */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: "var(--muted)" }}>收款节点计划</div>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg" style={{ background: "var(--bg)" }}>
                <input value={m.name} onChange={(e) => updateMilestone(i, "name", e.target.value)} className="col-span-3 px-2 py-1.5 rounded text-xs" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
                <div className="col-span-2 flex items-center gap-1">
                  <input type="number" value={m.percentage} onChange={(e) => updateMilestone(i, "percentage", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 rounded text-xs text-center" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>%</span>
                </div>
                <div className="col-span-2 text-xs font-mono text-right" style={{ color: contractAmount ? "var(--accent)" : "var(--muted)" }}>
                  {contractAmount ? fmtMoney(parseFloat(contractAmount) * m.percentage / 100) : "-"}
                </div>
                <input type="date" value={m.dueDate} onChange={(e) => updateMilestone(i, "dueDate", e.target.value)} className="col-span-3 px-2 py-1.5 rounded text-xs" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
                <button onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="col-span-2 text-xs" style={{ color: "#f87171" }}>删除</button>
              </div>
            ))}
            <button onClick={() => setMilestones([...milestones, { name: "", percentage: 0, requiredDocs: [], dueDate: "" }])}
              className="w-full py-2 rounded-lg text-xs" style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}>+ 添加节点</button>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>取消</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>{saving ? "创建中..." : "创建收款台账"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── 节点详情展开面板 ──────────────────────────────────────────────────
function MilestonePanel({ milestones, receivableId, onUpdate }: {
  milestones: any[]; receivableId: number; onUpdate: () => void;
}) {
  const handleStatusChange = async (milestoneId: number, status: string) => {
    try {
      await fetch(`/api/receivables/${receivableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, milestoneStatus: status, actualDate: status === "collected" ? new Date().toISOString() : undefined }),
      });
      onUpdate();
    } catch { /* */ }
  };

  return (
    <div className="mt-3 space-y-2">
      {milestones.map((m: any) => {
        const ms = MILESTONE_STATUS[m.status] || MILESTONE_STATUS.pending;
        let reqDocs: string[] = [];
        try { reqDocs = m.requiredDocs ? JSON.parse(m.requiredDocs) : []; } catch {}
        let provDocs: string[] = [];
        try { provDocs = m.providedDocs ? JSON.parse(m.providedDocs) : []; } catch {}

        return (
          <div key={m.id} className="p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{ms.icon}</span>
                <span className="text-sm font-medium text-white">{m.name}</span>
                <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{m.percentage}% · {fmtMoney(m.amount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: ms.color, background: `${ms.color}15` }}>{ms.label}</span>
                {m.dueDate && <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>应收: {fmtDate(m.dueDate)}</span>}
              </div>
            </div>

            {/* 所需资料 */}
            {reqDocs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {reqDocs.map((doc: string, i: number) => {
                  const ready = provDocs.includes(doc);
                  return (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: ready ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)", color: ready ? "#10b981" : "#f87171", border: `1px solid ${ready ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}` }}>
                      {ready ? "✓" : "○"} {doc}
                    </span>
                  );
                })}
              </div>
            )}

            {/* 操作按钮 */}
            {m.status !== "collected" && (
              <div className="flex gap-2">
                {m.status === "pending" && m.docsReady && (
                  <button onClick={() => handleStatusChange(m.id, "ready")} className="px-3 py-1 rounded-lg text-[11px]"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>标记可收</button>
                )}
                {m.status === "ready" && (
                  <button onClick={() => handleStatusChange(m.id, "billed")} className="px-3 py-1 rounded-lg text-[11px]"
                    style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>已开票</button>
                )}
                {m.status === "billed" && (
                  <button onClick={() => handleStatusChange(m.id, "collected")} className="px-3 py-1 rounded-lg text-[11px] font-medium"
                    style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}>确认收款</button>
                )}
              </div>
            )}
            {m.actualDate && <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>实收: {fmtDate(m.actualDate)}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────
type TabKey = "overview" | "list" | "debtors" | "knowledge" | "ai";

export default function ReceivablesPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<any>(null);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 弹窗状态
  const [showDebtorModal, setShowDebtorModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [editDebtor, setEditDebtor] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, r, d, p] = await Promise.all([
        fetch("/api/receivables/stats").then((r) => r.json()),
        fetch("/api/receivables").then((r) => r.json()),
        fetch("/api/debtors").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      if (s.stats) setStats(s);
      if (Array.isArray(r)) setReceivables(r);
      if (Array.isArray(d)) setDebtors(d);
      if (Array.isArray(p)) setProjects(p);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">收款管理</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>管住钱 — 知道谁欠多少、该收多少、什么时候收</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditDebtor(null); setShowDebtorModal(true); }}
            className="px-4 py-2.5 rounded-lg text-sm" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>+ 债主</button>
          <button onClick={() => setShowReceivableModal(true)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 20px rgba(59,130,246,0.25)" }}>+ 收款台账</button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg)" }}>
        {[
          { key: "overview" as const, label: "总览" },
          { key: "list" as const, label: "收款台账" },
          { key: "debtors" as const, label: "债主管理" },
          { key: "knowledge" as const, label: "知识库" },
          { key: "ai" as const, label: "AI 助手" },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex-1 text-xs py-2 rounded-md font-medium transition-all"
            style={{ background: tab === t.key ? "var(--surface)" : "transparent", color: tab === t.key ? "white" : "var(--muted)", boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === 总览 === */}
      {tab === "overview" && stats && (
        <div className="space-y-6">
          {/* 核心数据 */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "合同总额", value: fmtMoney(Number(stats.stats?.totalContract || 0)), color: "var(--accent)" },
              { label: "已收回款", value: fmtMoney(Number(stats.stats?.totalReceived || 0)), color: "#10b981" },
              { label: "待收金额", value: fmtMoney(Number(stats.stats?.totalPending || 0)), color: "#f59e0b" },
              { label: "收款台账数", value: stats.stats?.total || 0, color: "#a78bfa" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{s.label}</div>
                <div className="font-mono font-bold text-lg" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* 账龄分析 */}
          {stats.aging && stats.aging.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>账龄分析</div>
              <div className="flex gap-3">
                {[
                  { bucket: "not_due", label: "未到期", color: "#94a3b8" },
                  { bucket: "30d", label: "30天内", color: "#f59e0b" },
                  { bucket: "60d", label: "30-60天", color: "#f97316" },
                  { bucket: "90d", label: "60-90天", color: "#ef4444" },
                  { bucket: "90d_plus", label: "90天+", color: "#dc2626" },
                ].map((a) => {
                  const found = stats.aging.find((x: any) => x.aging_bucket === a.bucket);
                  const amount = Number(found?.amount || 0);
                  return (
                    <div key={a.bucket} className="flex-1 p-3 rounded-lg text-center" style={{ background: `${a.color}10` }}>
                      <div className="text-xs mb-1" style={{ color: a.color }}>{a.label}</div>
                      <div className="font-mono text-sm font-bold" style={{ color: a.color }}>{fmtMoney(amount)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 即将到期 */}
          {stats.upcoming && stats.upcoming.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <div className="text-xs font-medium mb-3" style={{ color: "var(--amber)" }}>7天内到期提醒</div>
              <div className="space-y-2">
                {stats.upcoming.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{u.debtorName}</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{u.name} · {fmtMoney(u.amount)}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--amber)" }}>{fmtDate(u.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 已逾期 */}
          {stats.overdue && stats.overdue.length > 0 && (
            <div className="rounded-xl p-5" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div className="text-xs font-medium mb-3" style={{ color: "#f87171" }}>已逾期 ({stats.overdue.length} 笔)</div>
              <div className="space-y-2">
                {stats.overdue.slice(0, 5).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{o.debtorName}</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{o.name} · {fmtMoney(o.amount)}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#f87171" }}>逾期 {Math.ceil((Date.now() - new Date(o.dueDate).getTime()) / 86400000)} 天</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === 收款台账 === */}
      {tab === "list" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} /></div>
          ) : receivables.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无收款台账，点击右上角创建</div>
          ) : receivables.map((r: any) => {
            const dt = DEBTOR_TYPES[r.debtorType] || { label: "未知", color: "#94a3b8" };
            const pending = r.contractAmount - r.receivedAmount;
            const progress = r.contractAmount > 0 ? Math.round((r.receivedAmount / r.contractAmount) * 100) : 0;
            const isExpanded = expandedId === r.id;

            return (
              <div key={r.id} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: dt.color, background: `${dt.color}20` }}>{dt.label}</span>
                      <span className="text-sm font-semibold text-white">{r.debtorName}</span>
                      {r.projectName && <span className="text-xs" style={{ color: "var(--muted)" }}>· {r.projectName}</span>}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      合同: {fmtMoney(r.contractAmount)} · 已收: {fmtMoney(r.receivedAmount)} · 待收: <span style={{ color: pending > 0 ? "#f59e0b" : "#10b981" }}>{fmtMoney(pending)}</span>
                      {r.statuteRemaining !== null && r.statuteRemaining !== undefined && (
                        <span style={{ color: r.statuteRemaining < 180 ? "#f87171" : "var(--muted)" }}> · 诉讼时效: {r.statuteRemaining}天</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 收款进度条 */}
                    <div className="w-24 h-2 rounded-full" style={{ background: "var(--bg)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress >= 100 ? "#10b981" : "var(--accent)" }} />
                    </div>
                    <span className="text-xs font-mono" style={{ color: progress >= 100 ? "#10b981" : "var(--accent)" }}>{progress}%</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {/* 展开的节点 */}
                {isExpanded && (
                  <MilestonePanel milestones={r.milestones || []} receivableId={r.id} onUpdate={fetchAll} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === 债主管理 === */}
      {tab === "debtors" && (
        <div className="space-y-3">
          {debtors.map((d: any) => {
            const dt = DEBTOR_TYPES[d.type] || { label: "未知", color: "#94a3b8" };
            return (
              <div key={d.id} className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: dt.color, background: `${dt.color}20` }}>{dt.label}</span>
                      <span className="text-sm font-semibold text-white">{d.name}</span>
                      {d.creditCode && <span className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>{d.creditCode}</span>}
                    </div>
                    {d.address && <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{d.address}</div>}
                    {d.tags && d.tags.length > 0 && (
                      <div className="flex gap-1.5 mb-1">
                        {d.tags.map((t: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {/* 联系人 */}
                    {d.contacts && d.contacts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {d.contacts.map((c: any) => (
                          <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ background: "var(--bg)" }}>
                            <span className="text-white">{c.name}</span>
                            {c.role && <span style={{ color: "var(--muted)" }}>{c.role}</span>}
                            {c.phone && <span style={{ color: "var(--muted)" }}>{c.phone}</span>}
                            {c.isDecisionMaker && <span style={{ color: "#f59e0b" }}>决策</span>}
                            {c.isFinance && <span style={{ color: "#3b82f6" }}>财务</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 信誉分 */}
                    <div className="text-center">
                      <div className="font-mono font-bold text-lg" style={{ color: d.creditScore >= 70 ? "#10b981" : d.creditScore >= 40 ? "#f59e0b" : "#f87171" }}>{d.creditScore}</div>
                      <div className="text-[9px]" style={{ color: "var(--muted)" }}>信誉</div>
                    </div>
                    <button onClick={() => { setEditDebtor(d); setShowDebtorModal(true); }}
                      className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}>编辑</button>
                  </div>
                </div>
              </div>
            );
          })}
          {debtors.length === 0 && !loading && (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted)" }}>暂无债主，点击右上角添加</div>
          )}
        </div>
      )}

      {/* === 知识库 === */}
      {tab === "knowledge" && <KnowledgeTab />}

      {/* === AI 助手 === */}
      {tab === "ai" && <AIAssistantTab />}

      {/* Modals */}
      <DebtorModal open={showDebtorModal} onClose={() => { setShowDebtorModal(false); setEditDebtor(null); }} onSaved={fetchAll} edit={editDebtor} />
      <ReceivableModal open={showReceivableModal} onClose={() => setShowReceivableModal(false)} onSaved={fetchAll} debtors={debtors} projects={projects} />
    </div>
  );
}
