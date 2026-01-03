// src/components/common/AIStrategyAdvisor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  Sparkles, RefreshCcw, AlertTriangle,
  Target, Briefcase, Zap
} from "lucide-react";

// .env 키
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// --- [Utility] JSON 파서 ---
function safeParseAiJson(rawText) {
  const text = String(rawText ?? "").trim();
  if (!text) return { ok: false, error: "Empty AI response", raw: rawText };

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (_) {}

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (_) {}

  // 부분 추출 시도
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let start = -1;

  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);

  if (start === -1) {
    return { ok: false, error: "No JSON start token found", raw: rawText };
  }

  const s = cleaned.slice(start);
  const stack = [];
  let end = -1;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      else { end = i; break; }
      if (stack.length === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    return { ok: false, error: "JSON seems incomplete", raw: rawText };
  }

  const candidate = s.slice(0, end + 1).trim();

  try {
    return { ok: true, data: JSON.parse(candidate) };
  } catch (e) {
    return { ok: false, error: "Failed to parse extracted JSON", raw: rawText, detail: String(e) };
  }
}

const JSON_ONLY_RULE = `
[OUTPUT RULE - MUST FOLLOW]
- 반드시 "유효한 JSON"만 출력한다.
- JSON 밖에 어떤 문장/서문/설명/마크다운/코드펜스도 쓰지 않는다.
- 출력은 반드시 단일 JSON 객체 1개로 끝난다.
`;

const REQUIRED_SCHEMA_HINT = `
[JSON SCHEMA]
{
  "executive_summary": "string",
  "scenarios": {
    "base": { "title": "string", "desc": "string" },
    "best": { "title": "string", "desc": "string" },
    "worst": { "title": "string", "desc": "string" }
  },
  "strategic_moves": [
    { "focus": "string", "action": "string" }
  ],
  "risk_assessment": "string"
}
`;

const AIStrategyAdvisor = ({ currentData }) => {
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState({ 
      cnyRate: 0, usdRate: 0, oilPrice: 0, interestRate: 0, 
      globalTrends: { oled: "", api: "", chemical: "" } 
  });
  const [aiAnalysis, setAiAnalysis] = useState(null);

  useEffect(() => {
      // currentData에 marketData가 있으면 상태 동기화 (AI 프롬프트용)
      if (currentData?.marketData) {
          setMarketData(currentData.marketData);
      }
  }, [currentData]);

  const pnlContext = useMemo(() => {
    if (!currentData?.kpiSeries6) return [];
    return currentData.kpiSeries6.map(d => ({
      month: d.month,
      Revenue: d.rev || d.revenue,     
      GrossMargin: d.gm,
      FixedCost: d.fixed,
      OperatingProfit: d.op,
      OP_Margin: d.opRate ? Number(d.opRate).toFixed(1) : 0,
      Utilization: d.util
    }));
  }, [currentData]);

  const runAiStrategy = async () => {
    if (!GEMINI_KEY) return alert("Gemini API 키가 설정되지 않았습니다.");
    if (!currentData?.kpiSeries6) return alert("분석할 데이터가 부족합니다.");

    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const opsSnapshot = currentData?.opsSnapshot ?? null;
      const topItems10 = currentData?.topItems10 ?? null;
      const revenueByCategory = currentData?.revenueByCategory ?? null;

      const basePrompt = currentData?.prompt ?? `Analyze Profitability.`;

      // [Logic] UI에는 안 보이지만, AI에게는 여전히 시장 데이터를 제공함
      const finalPrompt =
        `${basePrompt}\n\n` +
        `[Context Data]\n` + 
        `Macro: ${JSON.stringify(marketData)}\n` +
        `P&L: ${JSON.stringify(pnlContext)}\n` + 
        `Ops: ${JSON.stringify(opsSnapshot)}\n` + 
        `Items: ${JSON.stringify(topItems10)}\n` + 
        `RevMix: ${JSON.stringify(revenueByCategory)}\n\n` + 
        `${JSON_ONLY_RULE}\n${REQUIRED_SCHEMA_HINT}\n\n` +
        `Return ONLY the JSON object.`;

      const result = await model.generateContent(finalPrompt);
      const raw = result?.response?.text?.() ?? "";
      const parsed = safeParseAiJson(raw);

      if (!parsed.ok) {
        setAiAnalysis({ _mode: "text", rawText: String(raw ?? ""), parseError: parsed.error });
      } else {
        setAiAnalysis(parsed.data);
      }
    } catch (err) {
      console.error("AI Error:", err);
      alert("전략 리포트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-10">
      {/* 1. Header (Tab 제거됨) */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">AI Strategic Intelligence</h2>
            <p className="text-xs text-slate-500">Powered by Gemini model • Macro & P&L Analysis</p>
          </div>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="p-6 min-h-[400px]">
        <div className="animate-fade-in space-y-6">
          {!aiAnalysis ? (
            <div className="text-center py-20">
              <div className="mb-4 text-slate-300 mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Sparkles size={32} />
              </div>
              <h3 className="text-slate-900 font-bold mb-2">종합 전략 리포트 생성</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                재무 실적, 환율/유가/금리 및 OLED/API 산업 동향을 통합 분석하여 전략을 제안합니다.
              </p>
              <button
                onClick={runAiStrategy}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto transition-all shadow-lg shadow-purple-200"
              >
                {loading ? <RefreshCcw className="animate-spin" size={18} /> : <Zap size={18} />}
                {loading ? "전략 수립 중 (Macro & Micro)..." : "AI 전략 리포트 생성하기"}
              </button>
            </div>
          ) : aiAnalysis?._mode === "text" ? (
            // 파싱 실패 시 텍스트 표시
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <AlertTriangle size={18} /> 응답 형식 오류 (Raw Text)
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-xs bg-slate-50 border border-slate-200 p-4 rounded-xl overflow-auto max-h-[520px]">
                {aiAnalysis.rawText}
              </pre>
              <div className="flex justify-end pt-2">
                  <button
                    onClick={runAiStrategy}
                    className="text-xs font-bold text-slate-400 hover:text-purple-600 flex items-center gap-1"
                  >
                    <RefreshCcw size={12} /> Re-run Analysis
                  </button>
                </div>
            </div>
          ) : (
            // 성공 시 리포트 표시
            <>
              {/* Executive Summary */}
              <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg shadow-sm">
                <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Executive Summary</h4>
                <p className="text-lg font-serif text-slate-800 leading-relaxed font-medium">
                  "{aiAnalysis.executive_summary}"
                </p>
              </div>

              {/* Scenarios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ScenarioCard title={aiAnalysis.scenarios?.best?.title} desc={aiAnalysis.scenarios?.best?.desc} type="best" />
                <ScenarioCard title={aiAnalysis.scenarios?.base?.title} desc={aiAnalysis.scenarios?.base?.desc} type="base" />
                <ScenarioCard title={aiAnalysis.scenarios?.worst?.title} desc={aiAnalysis.scenarios?.worst?.desc} type="worst" />
              </div>

              {/* Strategies & Risks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                    <Target size={18} className="text-blue-600" /> Strategic Initiatives
                  </h4>
                  <ul className="space-y-4">
                    {aiAnalysis.strategic_moves?.map((move, idx) => (
                      <li key={idx} className="flex gap-3">
                        <div className="min-w-[4px] bg-blue-100 rounded-full mt-1"></div>
                        <div>
                          <span className="text-xs font-bold text-blue-600 uppercase block mb-0.5">{move.focus}</span>
                          <span className="text-sm text-slate-600 leading-snug">{move.action}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                  <h4 className="flex items-center gap-2 text-red-800 font-bold mb-2">
                    <AlertTriangle size={18} /> Macro & Operational Risks
                  </h4>
                  <p className="text-sm text-red-700 leading-relaxed whitespace-pre-wrap">
                    {aiAnalysis.risk_assessment}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                  <button
                    onClick={runAiStrategy}
                    className="text-xs font-bold text-slate-400 hover:text-purple-600 flex items-center gap-1"
                  >
                    <RefreshCcw size={12} /> Re-run Analysis
                  </button>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ScenarioCard = ({ title, desc, type }) => {
  const styles = {
    base: "bg-slate-50 border-slate-200 text-slate-800",
    best: "bg-emerald-50 border-emerald-100 text-emerald-800",
    worst: "bg-amber-50 border-amber-100 text-amber-800",
  };
  const labels = { base: "Base Case", best: "Best Case", worst: "Worst Case" };
  return (
    <div className={`p-4 rounded-lg border ${styles[type] || styles.base} flex-1`}>
      <div className="text-[10px] font-black uppercase opacity-60 mb-1">{labels[type]}</div>
      <div className="font-bold text-sm mb-2">{title || "N/A"}</div>
      <div className="text-xs opacity-80 leading-snug">{desc || "No data available."}</div>
    </div>
  );
};

export default AIStrategyAdvisor;