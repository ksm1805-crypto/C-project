// src/components/SalesPredictor.jsx
import React, { useMemo, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
} from "recharts";
import {
  Calculator,
  Activity,
  DollarSign,
  Droplets,
  Percent,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// 기본 샘플(연결 안된 경우에도 UI 유지)
const DEFAULT_MACRO_HISTORY = [
  { month: "2024-07", rev: 4.2, exchange: 1320, oil: 78, interest: 3.5, marketIdx: 110 },
  { month: "2024-08", rev: 4.5, exchange: 1340, oil: 80, interest: 3.5, marketIdx: 112 },
  { month: "2024-09", rev: 4.3, exchange: 1310, oil: 82, interest: 3.25, marketIdx: 108 },
  { month: "2024-10", rev: 5.1, exchange: 1380, oil: 75, interest: 3.25, marketIdx: 115 },
  { month: "2024-11", rev: 5.5, exchange: 1410, oil: 72, interest: 3.0, marketIdx: 120 },
  { month: "2024-12", rev: 6.2, exchange: 1450, oil: 70, interest: 3.0, marketIdx: 125 },
];

const INDICATORS = [
  { id: "exchange", name: "환율", icon: <DollarSign size={14} />, color: "#10B981" },
  { id: "oil", name: "유가", icon: <Droplets size={14} />, color: "#F59E0B" },
  { id: "interest", name: "금리", icon: <Percent size={14} />, color: "#6366f1" },
  { id: "marketIdx", name: "시장지수", icon: <Activity size={14} />, color: "#3B82F6" },
];

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const SalesPredictor = ({ macroHistory }) => {
  const MACRO_HISTORY = Array.isArray(macroHistory) && macroHistory.length ? macroHistory : DEFAULT_MACRO_HISTORY;

  const [selectedInd, setSelectedInd] = useState(INDICATORS[0]);
  const [nextVal, setNextVal] = useState(toNum(MACRO_HISTORY.at(-1)?.[INDICATORS[0].id]) || 1400);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  // 전통적 회귀 (참고용)
  const regression = useMemo(() => {
    const n = MACRO_HISTORY.length;
    if (!n) return { slope: 0, intercept: 0, dataPoints: [] };

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

    const dataPoints = MACRO_HISTORY.map((d) => {
      const x = toNum(d[selectedInd.id]);
      const y = toNum(d.rev);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
      return { x, y, month: d.month };
    });

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = n === 0 ? 0 : (sumY - slope * sumX) / n;

    return { slope, intercept, dataPoints };
  }, [MACRO_HISTORY, selectedInd]);

  const mathPredictedRev = regression.slope * toNum(nextVal) + regression.intercept;

  const runAiPrediction = async () => {
    if (!API_KEY) return alert("API Key가 없습니다. (.env / VITE_GEMINI_API_KEY)");

    setAiLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
당신은 화학/OLED 산업 전문 재무 분석가입니다.
과거 6개월 데이터와 다음 달 예상 지표를 바탕으로 차월 매출(Revenue)을 예측하세요.
반드시 JSON만 출력하세요.

[과거 6개월 데이터]
${JSON.stringify(MACRO_HISTORY)}

[다음 달 타겟 지표]
- 선택된 주 변수(${selectedInd.name}): ${toNum(nextVal)}
- 다른 변수들은 최근 추세를 유지한다고 가정.

[출력 형식 - JSON only]
{
  "predictedRev": number,
  "confidence": number,
  "reason": "짧고 명확한 한 문장"
}
      `.trim();

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      setAiResult(JSON.parse(cleanedText));
    } catch (err) {
      setError("AI 예측 실패: " + (err?.message || "네트워크/키 확인"));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="text-blue-600" /> 매출 예측 시뮬레이터 (Math + AI)
        </h3>
        <button
          onClick={runAiPrediction}
          disabled={aiLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-100 disabled:opacity-60"
        >
          {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {aiLoading ? "Gemini 분석 중..." : "Gemini AI 복합 예측 실행"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-500 mb-3 block">예측 변수 설정</label>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {INDICATORS.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => {
                    setSelectedInd(ind);
                    const last = toNum(MACRO_HISTORY.at(-1)?.[ind.id]);
                    setNextVal(last || nextVal);
                    setAiResult(null);
                    setError(null);
                  }}
                  className={`p-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                    selectedInd.id === ind.id
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {ind.icon} {ind.name}
                </button>
              ))}
            </div>

            <input
              type="number"
              className="w-full text-2xl font-black p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 ring-purple-500"
              value={toNum(nextVal)}
              onChange={(e) => setNextVal(toNum(e.target.value))}
            />

            <p className="text-[10px] text-slate-400 mt-2 text-center">
              차월 예상되는 {selectedInd.name}값을 입력하세요.
            </p>

            <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Math Prediction</div>
              <div className="text-xl font-black text-slate-900">
                {Number.isFinite(mathPredictedRev) ? mathPredictedRev.toFixed(2) : "0.00"}{" "}
                <span className="text-xs text-slate-400">B KRW</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                (단순 회귀 참고값, 실제 의사결정은 AI/운영 KPI와 같이 봐야 함)
              </div>
            </div>
          </div>

          {/* AI Result View */}
          {aiResult && (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-purple-600 uppercase">Gemini AI Prediction</span>
                <span className="text-[10px] font-bold bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">
                  신뢰도 {toNum(aiResult.confidence)}%
                </span>
              </div>
              <div className="text-3xl font-black text-purple-700 mb-2">
                {toNum(aiResult.predictedRev).toFixed(2)} <span className="text-sm">B KRW</span>
              </div>
              <p className="text-xs text-purple-600/80 leading-relaxed font-medium">“{aiResult.reason}”</p>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </div>
          )}
        </div>

        {/* Right: Chart */}
        <div className="lg:col-span-2 h-80 bg-slate-50 rounded-xl border border-slate-100 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MACRO_HISTORY} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" dataKey={selectedInd.id} name={selectedInd.name} domain={["auto", "auto"]} hide />
              <YAxis type="number" domain={["auto", "auto"]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Scatter name="과거 실적" data={regression.dataPoints} fill={selectedInd.color} />

              {/* 수학적 예측 지점 */}
              <Scatter name="수학적 예측" data={[{ x: toNum(nextVal), y: mathPredictedRev }]} fill="#94a3b8" shape="triangle" />

              {/* AI 예측 지점 (있을 경우만) */}
              {aiResult && (
                <Scatter
                  name="AI 예측"
                  data={[{ x: toNum(nextVal), y: toNum(aiResult.predictedRev) }]}
                  fill="#7c3aed"
                  shape="star"
                  r={10}
                />
              )}

              <Legend wrapperStyle={{ fontSize: "10px" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SalesPredictor;
