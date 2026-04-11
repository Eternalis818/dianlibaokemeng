"use client";
import { useState, useEffect, useCallback } from "react";

interface SettingItem {
  label: string;
  value: string;
  source: "db" | "env";
  masked?: boolean;
}
interface Settings {
  llm_api_key: SettingItem;
  llm_model: SettingItem;
  llm_base_url: SettingItem;
}
interface Features {
  [key: string]: { label: string; enabled: boolean };
}

const FEATURES_META = [
  { key: "default", label: "默认模型", desc: "智能拆解、工人聊天", presetGroup: "text" },
  { key: "photo", label: "视觉模型", desc: "照片复核、多模态分析", presetGroup: "vision" },
  { key: "summary", label: "摘要模型", desc: "Boss AI 摘要", presetGroup: "text" },
] as const;

const PRESET_MODELS = {
  text: [
    { name: "MiniMax M2.7", model: "MiniMax-M2.7", baseUrl: "https://api.minimaxi.com/v1" },
    { name: "DeepSeek V3", model: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
    { name: "通义千问 Plus", model: "qwen-plus", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    { name: "智谱 GLM-4", model: "glm-4", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
    { name: "自定义", model: "", baseUrl: "" },
  ],
  vision: [
    { name: "通义千问 VL", model: "qwen-vl-plus", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    { name: "MiniMax VL", model: "MiniMax-VL-01", baseUrl: "https://api.minimaxi.com/v1" },
    { name: "DeepSeek VL", model: "deepseek-vl", baseUrl: "https://api.deepseek.com/v1" },
    { name: "自定义", model: "", baseUrl: "" },
  ],
};

type FeatureConfig = { apiKey: string; model: string; baseUrl: string };

type PushConfig = {
  push_platform: string;
  push_webhook_url: string;
  push_enabled: string;
  push_daily_time: string;
  push_weekly_day: string;
  push_report_types: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Push config
  const [pushConfig, setPushConfig] = useState<PushConfig>({
    push_platform: "serverchan",
    push_webhook_url: "",
    push_enabled: "off",
    push_daily_time: "18:00",
    push_weekly_day: "5",
    push_report_types: '["daily","weekly"]',
  });
  const [pushTestResult, setPushTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pushTesting, setPushTesting] = useState(false);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<string>("default");

  // Per-feature configs
  const [featureConfigs, setFeatureConfigs] = useState<Record<string, FeatureConfig>>({
    default: { apiKey: "", model: "", baseUrl: "" },
    photo: { apiKey: "", model: "", baseUrl: "" },
    summary: { apiKey: "", model: "", baseUrl: "" },
  });

  // Per-feature test results
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string } | null>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        if (data.features) setFeatures(data.features);

        // Default config from main settings
        const def: FeatureConfig = {
          apiKey: data.settings.llm_api_key.value,
          model: data.settings.llm_model.value,
          baseUrl: data.settings.llm_base_url.value,
        };

        // Per-feature configs from data.featureConfigs or fallback to default
        const fc = data.featureConfigs || {};
        setFeatureConfigs({
          default: { apiKey: def.apiKey, model: def.model, baseUrl: def.baseUrl },
          photo: fc.photo ? { apiKey: fc.photo.apiKey || "", model: fc.photo.model || "", baseUrl: fc.photo.baseUrl || "" } : { apiKey: "", model: "", baseUrl: "" },
          summary: fc.summary ? { apiKey: fc.summary.apiKey || "", model: fc.summary.model || "", baseUrl: fc.summary.baseUrl || "" } : { apiKey: "", model: "", baseUrl: "" },
        });

        // Push config
        if (data.pushConfig) {
          setPushConfig((prev) => ({ ...prev, ...data.pushConfig }));
        }
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // Build all settings: default + per-feature overrides
      const body: Record<string, string | object> = {};
      const dc = featureConfigs.default;
      body.llm_api_key = dc.apiKey;
      body.llm_model = dc.model;
      body.llm_base_url = dc.baseUrl;

      // Per-feature: only save if model is set (non-empty means user configured it)
      for (const [feat, cfg] of Object.entries(featureConfigs)) {
        if (feat === "default") continue;
        if (cfg.model.trim()) {
          body[`${feat}_model`] = cfg.model;
          if (cfg.baseUrl.trim()) body[`${feat}_base_url`] = cfg.baseUrl;
          if (cfg.apiKey.trim()) body[`${feat}_api_key`] = cfg.apiKey;
        }
      }

      // Features toggle
      body.features = JSON.stringify(
        features ? Object.fromEntries(Object.entries(features).map(([k, v]) => [k, v.enabled])) : {}
      );

      // Push config
      body.push = { ...pushConfig };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSaveMsg(data.success ? "保存成功" : `保存失败: ${data.error}`);
      if (data.success) fetchSettings();
    } catch { setSaveMsg("网络错误"); }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleTest = async (feature: string) => {
    setTesting(feature);
    setTestResults({ ...testResults, [feature]: null });
    try {
      await handleSave();
      const res = await fetch(`/api/settings/test-connection?feature=${feature}`, { method: "POST" });
      const data = await res.json();
      setTestResults({ ...testResults, [feature]: data });
    } catch {
      setTestResults({ ...testResults, [feature]: { ok: false, message: "网络错误" } });
    }
    setTesting(null);
  };

  const updateConfig = (feature: string, field: keyof FeatureConfig, value: string) => {
    setFeatureConfigs({
      ...featureConfigs,
      [feature]: { ...featureConfigs[feature], [field]: value },
    });
  };

  const applyPreset = (feature: string, presetIdx: number) => {
    const group = FEATURES_META.find((f) => f.key === feature)?.presetGroup || "text";
    const presets = PRESET_MODELS[group as keyof typeof PRESET_MODELS];
    if (presetIdx < presets.length - 1) {
      updateConfig(feature, "model", presets[presetIdx].model);
      updateConfig(feature, "baseUrl", presets[presetIdx].baseUrl);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse text-sm" style={{ color: "var(--muted)" }}>加载中...</div>;
  }

  const currentConfig = featureConfigs[activeTab] || featureConfigs.default;
  const currentMeta = FEATURES_META.find((f) => f.key === activeTab)!;
  const currentPresets = PRESET_MODELS[currentMeta.presetGroup as keyof typeof PRESET_MODELS];
  const currentTest = testResults[activeTab];

  return (
    <div className="p-8 max-w-3xl">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">系统设置</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>不同 AI 功能可配置不同模型，灵活搭配最优性价比</p>
      </div>

      {/* Model Tabs */}
      <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: "var(--bg)" }}>
        {FEATURES_META.map((f) => (
          <button key={f.key} onClick={() => setActiveTab(f.key)}
            className="flex-1 text-xs py-2 rounded-md font-medium transition-all"
            style={{
              background: activeTab === f.key ? "var(--surface)" : "transparent",
              color: activeTab === f.key ? "white" : "var(--muted)",
              boxShadow: activeTab === f.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}>
            <div>{f.label}</div>
            <div className="text-[9px] mt-0.5 opacity-60">{f.desc}</div>
          </button>
        ))}
      </div>

      {/* Config Panel */}
      <div className="p-5 rounded-xl space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{currentMeta.label}配置</span>
          {activeTab !== "default" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--muted)" }}>
              留空则使用默认模型
            </span>
          )}
        </div>

        {/* Presets */}
        <div>
          <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>快捷预设</div>
          <div className="grid grid-cols-4 gap-2">
            {currentPresets.map((preset, idx) => (
              <button key={idx}
                onClick={() => applyPreset(activeTab, idx)}
                className="px-3 py-2 rounded-lg text-xs transition-all"
                style={{
                  background: currentConfig.model === preset.model && preset.model ? "rgba(59,130,246,0.15)" : "transparent",
                  border: `1px solid ${currentConfig.model === preset.model && preset.model ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                  color: currentConfig.model === preset.model && preset.model ? "white" : "var(--muted)",
                }}>
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>API Key</div>
          <input type="password" value={currentConfig.apiKey}
            onChange={(e) => updateConfig(activeTab, "apiKey", e.target.value)} placeholder={activeTab === "default" ? "sk-..." : "留空使用默认 Key"}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        </div>

        {/* Model */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>模型名称</div>
          <input type="text" value={currentConfig.model}
            onChange={(e) => updateConfig(activeTab, "model", e.target.value)}
            placeholder={activeTab === "default" ? "MiniMax-M2.7" : "留空使用默认模型"}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
        </div>

        {/* Base URL */}
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>API 地址</div>
          <input type="text" value={currentConfig.baseUrl}
            onChange={(e) => updateConfig(activeTab, "baseUrl", e.target.value)}
            placeholder="https://api.minimaxi.com/v1"
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
          <div className="text-[10px] mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>OpenAI 兼容格式（不含 /chat/completions）</div>
        </div>

        {/* Test result */}
        {currentTest && (
          <div className="p-3 rounded-lg text-xs"
            style={{
              background: currentTest.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${currentTest.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: currentTest.ok ? "#34d399" : "#f87171",
            }}>
            {currentTest.message}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button onClick={() => handleSave()} disabled={saving}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: saving ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: saving ? "none" : "0 0 20px rgba(59,130,246,0.25)" }}>
          {saving ? "保存中..." : "保存所有配置"}
        </button>
        <button onClick={() => handleTest(activeTab)} disabled={testing === activeTab}
          className="px-6 py-2.5 rounded-lg text-sm"
          style={{ background: "transparent", border: "1px solid var(--border)", color: testing === activeTab ? "var(--muted)" : "var(--accent)" }}>
          {testing === activeTab ? "测试中..." : `测试${currentMeta.label}`}
        </button>
        {saveMsg && (
          <span className="text-sm" style={{ color: saveMsg.includes("成功") ? "var(--green, #10b981)" : "#f87171" }}>{saveMsg}</span>
        )}
      </div>

      {/* Feature Toggles */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white mb-1">功能开关</h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>按需启用高级 AI 功能（消耗对应模型配额）</p>
        <div className="space-y-3">
          {features && Object.entries(features).map(([key, val]) => (
            <div key={key} className="p-4 rounded-xl flex items-center justify-between"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div>
                <div className="text-sm font-medium text-white">{val.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
                  {key === "feature_photo_review" ? "开启后，施工照片将自动由视觉模型分析复核" : ""}
                </div>
              </div>
              <button onClick={() => setFeatures({ ...features, [key]: { ...val, enabled: !val.enabled } })}
                className="relative w-11 h-6 rounded-full transition-all"
                style={{ background: val.enabled ? "var(--accent)" : "var(--border)" }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: val.enabled ? "22px" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Push Config */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-white mb-1">定时推送</h2>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>配置施工日报/周报自动推送到微信或企业微信</p>

        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="p-4 rounded-xl flex items-center justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div>
              <div className="text-sm font-medium text-white">启用定时推送</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>开启后，系统将按计划自动推送施工报告</div>
            </div>
            <button onClick={() => setPushConfig({ ...pushConfig, push_enabled: pushConfig.push_enabled === "on" ? "off" : "on" })}
              className="relative w-11 h-6 rounded-full transition-all"
              style={{ background: pushConfig.push_enabled === "on" ? "var(--accent)" : "var(--border)" }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                style={{ left: pushConfig.push_enabled === "on" ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Platform */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>推送平台</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "serverchan", label: "Server酱", desc: "推送到微信，简单方便" },
                { key: "wechat", label: "企业微信", desc: "群机器人 Webhook" },
              ].map((p) => (
                <button key={p.key}
                  onClick={() => setPushConfig({ ...pushConfig, push_platform: p.key })}
                  className="px-4 py-3 rounded-lg text-left transition-all"
                  style={{
                    background: pushConfig.push_platform === p.key ? "rgba(59,130,246,0.15)" : "transparent",
                    border: `1px solid ${pushConfig.push_platform === p.key ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                    color: pushConfig.push_platform === p.key ? "white" : "var(--muted)",
                  }}>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[10px] mt-0.5 opacity-60">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Webhook URL */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
              {pushConfig.push_platform === "serverchan" ? "Server酱 SendKey URL" : "企业微信 Webhook URL"}
            </div>
            <input type="text" value={pushConfig.push_webhook_url}
              onChange={(e) => setPushConfig({ ...pushConfig, push_webhook_url: e.target.value })}
              placeholder={pushConfig.push_platform === "serverchan" ? "https://sct.ftqq.com/xxxxx.send" : "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
            <div className="text-[10px] mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>
              {pushConfig.push_platform === "serverchan"
                ? "在 sct.ftqq.com 注册获取 SendKey"
                : "在企业微信群 → 添加群机器人 → 获取 Webhook 地址"}
            </div>
          </div>

          {/* Schedule config */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>推送计划</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>日报推送时间</div>
                <input type="time" value={pushConfig.push_daily_time}
                  onChange={(e) => setPushConfig({ ...pushConfig, push_daily_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }} />
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: "var(--muted)" }}>周报推送日</div>
                <select value={pushConfig.push_weekly_day}
                  onChange={(e) => setPushConfig({ ...pushConfig, push_weekly_day: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "white" }}>
                  {["周日","周一","周二","周三","周四","周五","周六"].map((d, i) => (
                    <option key={i} value={String(i)} style={{ background: "#1e293b" }}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report types */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>报告类型</div>
            <div className="flex gap-2">
              {([
                { key: "daily", label: "施工日报", desc: "出勤+报量+签证" },
                { key: "weekly", label: "周报汇总", desc: "产值+签证+出勤统计" },
                { key: "alert", label: "异常预警", desc: "库存+积压+年检+锁定" },
              ] as const).map((rt) => {
                const selected = pushConfig.push_report_types.includes(rt.key);
                return (
                  <button key={rt.key}
                    onClick={() => {
                      const types: string[] = JSON.parse(pushConfig.push_report_types || "[]");
                      const next = selected ? types.filter((t) => t !== rt.key) : [...types, rt.key];
                      setPushConfig({ ...pushConfig, push_report_types: JSON.stringify(next) });
                    }}
                    className="flex-1 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      background: selected ? "rgba(59,130,246,0.15)" : "transparent",
                      border: `1px solid ${selected ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                      color: selected ? "white" : "var(--muted)",
                    }}>
                    <div className="text-xs font-medium">{rt.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-60">{rt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Push actions */}
          <div className="flex items-center gap-3">
            <button onClick={async () => {
              setPushTesting(true);
              setPushTestResult(null);
              try {
                await handleSave();
                const res = await fetch("/api/cron/report?type=daily&push=1&secret=pl_admin_secret_2026", { method: "POST" });
                const data = await res.json();
                setPushTestResult({ ok: data.pushed, message: data.pushMessage || data.error || "未知结果" });
              } catch {
                setPushTestResult({ ok: false, message: "网络错误" });
              }
              setPushTesting(false);
            }} disabled={pushTesting}
              className="px-5 py-2.5 rounded-lg text-sm"
              style={{ background: "transparent", border: "1px solid var(--border)", color: pushTesting ? "var(--muted)" : "var(--accent)" }}>
              {pushTesting ? "测试中..." : "测试推送"}
            </button>
            <button onClick={async () => {
              setPreviewLoading(true);
              setReportPreview(null);
              try {
                const res = await fetch("/api/cron/report?type=daily", { method: "POST" });
                const data = await res.json();
                setReportPreview(data.content || data.error || "生成失败");
              } catch {
                setReportPreview("网络错误");
              }
              setPreviewLoading(false);
            }} disabled={previewLoading}
              className="px-5 py-2.5 rounded-lg text-sm"
              style={{ background: "transparent", border: "1px solid var(--border)", color: previewLoading ? "var(--muted)" : "var(--muted)" }}>
              {previewLoading ? "生成中..." : "预览日报"}
            </button>
            {pushTestResult && (
              <span className="text-xs" style={{ color: pushTestResult.ok ? "#34d399" : "#f87171" }}>
                {pushTestResult.message}
              </span>
            )}
          </div>

          {/* Report preview */}
          {reportPreview && (
            <div className="p-4 rounded-xl text-xs whitespace-pre-wrap font-mono leading-relaxed"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", color: "var(--muted)", maxHeight: "300px", overflow: "auto" }}>
              {reportPreview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
