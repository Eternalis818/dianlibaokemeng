"use client";
import { useState, useEffect, useCallback } from "react";

interface MaterialLibrary {
  id: number;
  name: string;
  _count: { items: number };
}
interface Material {
  id: number;
  libraryId: number;
  code: string;
  name: string;
  unit: string;
  spec: string;
  category: string;
  source: string;
  planQty: number;
  usedQty: number;
  stockQty: number;
  minStock: number;
  unitCost: number;
  warehouseLocation: string;
  hazardous: boolean;
  supplier: string;
  agreementNo: string;
  validUntil: string | null;
  library: { name: string };
}
interface CategoryCount {
  category: string;
  count: number;
}

type Tab = "warehouse" | "agreement";
const RECENT_KEY = "pl_recent_materials";

export default function MaterialsPage() {
  const [libraries, setLibraries] = useState<MaterialLibrary[]>([]);
  const [tab, setTab] = useState<Tab>("warehouse");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchStrategy, setSearchStrategy] = useState("");

  // Categories
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  // Recent
  const [recentIds, setRecentIds] = useState<number[]>([]);

  // Load libraries
  useEffect(() => {
    fetch("/api/material-libraries").then((r) => r.json()).then((d) => {
      setLibraries(Array.isArray(d) ? d : []);
    });
  }, []);

  // Load recent from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_KEY);
      if (saved) setRecentIds(JSON.parse(saved));
    } catch {}
  }, []);

  // Load categories when tab changes
  useEffect(() => {
    setSelectedCat(null);
    setQuery("");
    setSearchResults([]);
    fetchCategories();
  }, [tab]);

  const fetchCategories = useCallback(async () => {
    const lib = libraries.find((l) =>
      (tab === "warehouse" && l.name === "仓库库存") || (tab === "agreement" && l.name === "协议库存")
    );
    if (!lib) return;
    try {
      const res = await fetch(`/api/materials/search?source=${tab}&libraryId=${lib.id}`).then((r) => r.json());
      setCategories(res.categories || []);
    } catch {}
  }, [tab, libraries]);

  // Load materials for current tab + category
  const fetchMaterials = useCallback(async () => {
    const lib = libraries.find((l) =>
      (tab === "warehouse" && l.name === "仓库库存") || (tab === "agreement" && l.name === "协议库存")
    );
    if (!lib) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ libraryId: String(lib.id), source: tab });
      if (selectedCat) params.set("category", selectedCat);
      const data = await fetch(`/api/materials?${params}`).then((r) => r.json());
      setMaterials(Array.isArray(data) ? data : []);
    } catch { setMaterials([]); }
    setLoading(false);
  }, [tab, libraries, selectedCat]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // Search handler with debounce
  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setSearchResults([]); setSearchStrategy(""); return; }
    setSearching(true);
    try {
      const lib = libraries.find((l) =>
        (tab === "warehouse" && l.name === "仓库库存") || (tab === "agreement" && l.name === "协议库存")
      );
      const params = new URLSearchParams({ q: q.trim(), source: tab, limit: "30" });
      if (lib) params.set("libraryId", String(lib.id));
      if (selectedCat) params.set("category", selectedCat);
      const res = await fetch(`/api/materials/search?${params}`).then((r) => r.json());
      setSearchResults(res.items || []);
      setSearchStrategy(res.strategy || "");
    } catch { setSearchResults([]); }
    setSearching(false);
  }, [tab, libraries, selectedCat]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const saveUsedQty = async (id: number) => {
    setSaving(true);
    try {
      await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, usedQty: Number(editVal) }),
      });
      setEditingId(null);
      fetchMaterials();
    } finally { setSaving(false); }
  };

  const touchRecent = (id: number) => {
    const next = [id, ...recentIds.filter((r) => r !== id)].slice(0, 20);
    setRecentIds(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
  };

  const displayItems = query.trim() ? searchResults : materials;
  const currentLib = libraries.find((l) =>
    (tab === "warehouse" && l.name === "仓库库存") || (tab === "agreement" && l.name === "协议库存")
  );
  const totalItems = categories.reduce((s, c) => s + c.count, 0);
  const lowStockCount = materials.filter((m) => m.minStock > 0 && m.stockQty < m.minStock).length;

  const strategyLabel: Record<string, string> = {
    code_exact: "精确编码",
    pinyin_short: "拼音首字母",
    pinyin_full: "全拼匹配",
    code_prefix: "编码前缀",
    name_fuzzy: "名称模糊",
    category_fuzzy: "分类匹配",
  };

  return (
    <div className="min-h-[100dvh] grid-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b" style={{ background: "rgba(7,13,26,0.92)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">材料管控</h1>
            <p className="text-xs mt-0.5" style={{ color: lowStockCount > 0 ? "var(--amber)" : "var(--muted)" }}>
              {lowStockCount > 0 ? `${lowStockCount} 种材料库存不足` : `共 ${totalItems} 种材料`}
            </p>
          </div>
          {/* Tab switch */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg)" }}>
            {(["warehouse", "agreement"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="text-xs px-4 py-1.5 rounded-md font-medium transition-all"
                style={{
                  background: tab === t ? "var(--surface)" : "transparent",
                  color: tab === t ? "white" : "var(--muted)",
                  boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}>
                {t === "warehouse" ? "仓库库存" : "协议库存"}
                {currentLib && <span className="ml-1 font-mono opacity-60">({totalItems})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-8 pb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "warehouse" ? "搜索：编码 / 拼音首字母（如 dl=电力电缆）/ 名称" : "搜索：物料号 / 物料描述"}
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none pl-9"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <svg className="absolute left-3 top-3 opacity-40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {query && (
                <button onClick={() => { setQuery(""); setSearchResults([]); }} className="absolute right-3 top-3 opacity-40 hover:opacity-80">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>
          {searchStrategy && query && (
            <div className="text-[10px] mt-1.5 flex items-center gap-2" style={{ color: "var(--muted)" }}>
              <span>匹配方式：{strategyLabel[searchStrategy] || searchStrategy}</span>
              <span>· {searchResults.length} 条结果</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex px-8 py-4 gap-4">
        {/* Sidebar: Categories */}
        <div className="w-48 shrink-0">
          <div className="text-[10px] font-semibold mb-2 px-1" style={{ color: "var(--muted)" }}>分类筛选</div>
          <div className="space-y-0.5">
            <button onClick={() => setSelectedCat(null)}
              className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all"
              style={{
                background: !selectedCat ? "rgba(59,130,246,0.12)" : "transparent",
                color: !selectedCat ? "white" : "var(--muted)",
                borderLeft: !selectedCat ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              全部 <span className="font-mono opacity-50">{totalItems}</span>
            </button>
            {categories.map((c) => (
              <button key={c.category} onClick={() => setSelectedCat(c.category)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all truncate"
                style={{
                  background: selectedCat === c.category ? "rgba(59,130,246,0.12)" : "transparent",
                  color: selectedCat === c.category ? "white" : "var(--muted)",
                  borderLeft: selectedCat === c.category ? "2px solid var(--accent)" : "2px solid transparent",
                }}>
                {c.category} <span className="font-mono opacity-50">{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="text-center py-20 text-sm" style={{ color: "var(--muted)" }}>
              {query ? "无匹配结果，试试拼音首字母搜索" : selectedCat ? "该分类暂无材料" : "暂无材料数据"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayItems.map((m) => {
                const isLow = m.minStock > 0 && m.stockQty < m.minStock;
                const isRecent = recentIds.includes(m.id);
                return (
                  <div key={m.id}
                    onClick={() => touchRecent(m.id)}
                    className="glass rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer hover:brightness-110 transition-all"
                    style={isLow ? { borderLeft: "3px solid #ef4444" } : isRecent ? { borderLeft: "3px solid var(--accent)" } : undefined}
                  >
                    {/* Code + Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{m.name}</span>
                        {m.hazardous && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>危化</span>
                        )}
                        {isLow && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>库存不足</span>
                        )}
                        {isRecent && !isLow && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent)" }}>常用</span>
                        )}
                      </div>
                      <div className="text-[10px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                        <span className="font-mono">{m.code}</span>
                        <span>· {m.category}</span>
                        {m.spec && <span>· {m.spec.length > 40 ? m.spec.slice(0, 40) + "..." : m.spec}</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      {tab === "warehouse" && (
                        <>
                          <div className="text-center w-16">
                            <div className="text-xs font-mono text-white">{m.stockQty.toFixed(m.stockQty % 1 === 0 ? 0 : 1)}</div>
                            <div className="text-[9px]" style={{ color: "var(--muted)" }}>库存</div>
                          </div>
                          {m.warehouseLocation && (
                            <div className="text-center w-16">
                              <div className="text-[10px] font-mono" style={{ color: "var(--muted)" }}>{m.warehouseLocation}</div>
                              <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>货位</div>
                            </div>
                          )}
                        </>
                      )}
                      {tab === "agreement" && (
                        <>
                          {m.supplier && (
                            <div className="text-center max-w-[120px]">
                              <div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{m.supplier}</div>
                              <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>供应商</div>
                            </div>
                          )}
                          {m.validUntil && (
                            <div className="text-center w-20">
                              <div className="text-[10px]" style={{ color: new Date(m.validUntil) < new Date() ? "#ef4444" : "var(--muted)" }}>
                                {new Date(m.validUntil).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                              </div>
                              <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>有效期</div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="text-center w-10">
                        <div className="text-xs font-mono">{m.unit}</div>
                      </div>
                      <div className="text-center w-20">
                        <div className="text-xs font-mono" style={{ color: m.unitCost > 0 ? "var(--amber)" : "var(--muted)" }}>
                          {m.unitCost > 0 ? `¥${m.unitCost.toFixed(2)}` : "—"}
                        </div>
                        <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>单价</div>
                      </div>
                      {/* Edit usedQty */}
                      <div className="w-24">
                        {editingId === m.id ? (
                          <div className="flex gap-1">
                            <input type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)}
                              className="w-14 px-1.5 py-1 rounded text-xs text-white bg-transparent"
                              style={{ border: "1px solid var(--accent)" }} autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") saveUsedQty(m.id); if (e.key === "Escape") setEditingId(null); }}
                            />
                            <button onClick={() => saveUsedQty(m.id)} disabled={saving}
                              className="text-[9px] px-1.5 py-1 rounded" style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)" }}>
                              {saving ? "..." : "✓"}
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(m.id); setEditVal(String(m.usedQty)); }}
                            className="text-xs font-mono px-2 py-1 rounded"
                            style={{ color: m.usedQty > 0 ? "white" : "var(--muted)", background: m.usedQty > 0 ? "rgba(16,185,129,0.1)" : "transparent" }}>
                            {m.usedQty > 0 ? m.usedQty.toFixed(1) : "录入"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
