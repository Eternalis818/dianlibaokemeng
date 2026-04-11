"use client";
import { useState, useEffect } from "react";

interface QtyItem {
  project: string;
  task: string;
  spec: string;
  totalQty: number;
  unit: string;
  unitPrice: number | null;
  estimatedRevenue: number | null;
}

export default function QuantitiesTab() {
  const [items, setItems] = useState<QtyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>("all");

  useEffect(() => {
    fetch("/api/boss/quantities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const projects = Array.from(new Set(items.map((i) => i.project))).sort();
  const filtered = filterProject === "all" ? items : items.filter((i) => i.project === filterProject);

  // 按项目分组
  const grouped = filtered.reduce<Record<string, QtyItem[]>>((acc, i) => {
    if (!acc[i.project]) acc[i.project] = [];
    acc[i.project].push(i);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm" style={{ color: "var(--muted)" }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* 项目筛选 */}
      {projects.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {["all", ...projects].map((p) => (
            <button
              key={p}
              onClick={() => setFilterProject(p)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={filterProject === p
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {p === "all" ? "全部" : p}
            </button>
          ))}
        </div>
      )}

      {Object.entries(grouped).map(([project, projectItems]) => {
        const projectRevenue = projectItems.reduce((s, i) => s + (i.estimatedRevenue || 0), 0);
        return (
          <div key={project}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{project}</span>
              {projectRevenue > 0 && (
                <span className="font-mono text-sm font-bold" style={{ color: "var(--green)" }}>
                  ¥{projectRevenue.toLocaleString()}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {projectItems.map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 rounded-xl"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{item.task}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: "var(--accent)" }}>
                      {item.totalQty} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                    <span>{item.spec || "--"}</span>
                    {item.estimatedRevenue ? (
                      <span style={{ color: "var(--green)" }}>
                        ¥{item.unitPrice}/{item.unit} · ¥{item.estimatedRevenue.toLocaleString()}
                      </span>
                    ) : (
                      <span>待匹配单价</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm" style={{ color: "var(--muted)" }}>暂无工程量数据</span>
        </div>
      )}
    </div>
  );
}
