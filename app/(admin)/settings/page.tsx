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

const PRESET_MODELS = [
  { name: "MiniMax M2.7", model: "MiniMax-M2.7", baseUrl: "https://api.minimaxi.com/v1" },
  { name: "DeepSeek V3", model: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
  { name: "OpenAI GPT-4o", model: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
  { name: "Claude Sonnet", model: "claude-sonnet-4-20250514", baseUrl: "https://api.anthropic.com/v1" },
  { name: "通义千问 Plus", model: "qwen-plus", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { name: "智谱 GLM-4", model: "glm-4", baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { name: "自定义", model: "", baseUrl: "" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState(-1);

  // 表单值
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setApiKey(data.settings.llm_api_key.value);
        setModel(data.settings.llm_model.value);
        setBaseUrl(data.settings.llm_base_url.value);
        // 匹配预设
        const idx = PRESET_MODELS.findIndex(
          (p) => p.model === data.settings.llm_model.value && p.baseUrl === data.settings.llm_base_url.value
        );
        setSelectedPreset(idx >= 0 ? idx : PRESET_MODELS.length - 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handlePresetChange = (idx: number) => {
    setSelectedPreset(idx);
    const preset = PRESET_MODELS[idx];
    if (preset.model) {
      setModel(preset.model);
      setBaseUrl(preset.baseUrl);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_api_key: apiKey,
          llm_model: model,
          llm_base_url: baseUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg("保存成功");
        fetchSettings();
      } else {
        setSaveMsg(`保存失败: ${data.error}`);
      }
    } catch {
      setSaveMsg("网络错误");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleTest = async () => {
    // 先保存再测试
    setTesting(true);
    setTestResult(null);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llm_api_key: apiKey, llm_model: model, llm_base_url: baseUrl }),
      });
      const res = await fetch("/api/settings/test-connection", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "网络错误" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-sm" style={{ color: "var(--muted)" }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">系统设置</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          配置 LLM 模型参数，用于智能拆解和 AI 复核功能
        </p>
      </div>

      {/* 当前状态卡片 */}
      {settings && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <span className="text-sm font-medium text-white">当前配置</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div style={{ color: "var(--muted)" }}>模型</div>
              <div className="font-mono text-white mt-0.5">
                {settings.llm_model.value || "未配置"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>API 地址</div>
              <div className="font-mono text-white mt-0.5 truncate" title={settings.llm_base_url.value}>
                {settings.llm_base_url.value || "未配置"}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>API Key</div>
              <div className="font-mono text-white mt-0.5">
                {settings.llm_api_key.value || "未配置"}
              </div>
            </div>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
            配置来源：
            {settings.llm_model.source === "db" ? "数据库（手动设置）" : "环境变量（.env）"}
          </div>
        </div>
      )}

      {/* 预设模型选择 */}
      <div
        className="mb-6 p-5 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <label className="block text-sm font-medium text-white mb-3">快捷预设</label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_MODELS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetChange(idx)}
              className="px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: selectedPreset === idx ? "rgba(59,130,246,0.15)" : "transparent",
                border:
                  selectedPreset === idx
                    ? "1px solid rgba(59,130,246,0.4)"
                    : "1px solid var(--border)",
                color: selectedPreset === idx ? "white" : "var(--muted)",
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 表单 */}
      <div
        className="p-5 rounded-xl space-y-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "white",
            }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
            {settings?.llm_api_key.masked
              ? "已保存的 Key 已脱敏显示，输入新值将覆盖"
              : "从模型服务商获取的 API 密钥"}
          </p>
        </div>

        {/* 模型名称 */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            模型名称
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setSelectedPreset(PRESET_MODELS.length - 1);
            }}
            placeholder="MiniMax-M2.7"
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "white",
            }}
          />
        </div>

        {/* API 地址 */}
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            API 地址
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setSelectedPreset(PRESET_MODELS.length - 1);
            }}
            placeholder="https://api.minimaxi.com/v1"
            className="w-full px-4 py-2.5 rounded-lg text-sm font-mono"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
              color: "white",
            }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
            OpenAI 兼容格式的 API 基础地址（不含 /chat/completions）
          </p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !model || !baseUrl}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
          style={{
            background: saving
              ? "rgba(59,130,246,0.4)"
              : "linear-gradient(135deg, #3b82f6, #2563eb)",
            boxShadow: saving ? "none" : "0 0 20px rgba(59,130,246,0.25)",
          }}
        >
          {saving ? "保存中..." : "保存设置"}
        </button>

        <button
          onClick={handleTest}
          disabled={testing || !model || !baseUrl}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: testing ? "var(--muted)" : "var(--accent)",
          }}
        >
          {testing ? "测试中..." : "测试连接"}
        </button>

        {saveMsg && (
          <span
            className="text-sm"
            style={{
              color: saveMsg.includes("成功") ? "var(--green, #10b981)" : "#f87171",
            }}
          >
            {saveMsg}
          </span>
        )}
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className="mt-4 p-4 rounded-xl text-sm"
          style={{
            background: testResult.ok ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${testResult.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: testResult.ok ? "#34d399" : "#f87171",
          }}
        >
          <div className="flex items-start gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 mt-0.5"
            >
              {testResult.ok ? (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              ) : (
                <circle cx="12" cy="12" r="10" />
              )}
              {testResult.ok ? (
                <polyline points="22 4 12 14.01 9 11.01" />
              ) : (
                <>
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              )}
            </svg>
            <div>
              <div className="font-medium">{testResult.ok ? "连接成功" : "连接失败"}</div>
              <div className="mt-0.5" style={{ color: "var(--muted)" }}>
                {testResult.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
