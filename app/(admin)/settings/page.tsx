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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // Build all settings: default + per-feature overrides
      const body: Record<string, string> = {};
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
    </div>
  );
}
