// src/components/common/AIStrategyAdvisor.jsx
import React, { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  Sparkles, RefreshCcw, ShieldCheck, AlertTriangle, 
  Target, Anchor, FileText, BarChart2, Briefcase, Zap, DollarSign
} from "lucide-react";
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area 
} from "recharts";

// ✅ 경로 수정: ../../services/marketData
import { getMarketData } from "../../services/marketData";

// .env 키
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const EX_RATE_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
const INTEREST_KEY = import.meta.env.VITE_INTEREST_API_KEY;
const OIL_KEY = import.meta.env.VITE_OIL_API_KEY;

const AIStrategyAdvisor = ({ currentData }) => {
  const [activeTab, setActiveTab] = useState("brief"); // 'brief' | 'data'
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState({ cnyRate: 0, oilPrice: 0, interestRate: 0 });
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // 시장 데이터 로드
  const refreshMarket = async () => {
    try {
      const data = await getMarketData({ 
        exRateKey: EX_RATE_KEY, 
        interestKey: INTEREST_KEY, 
        oilKey: OIL_KEY 
      });
      if (data) setMarketData(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error("Market refresh failed", e);
    }
  };

  useEffect(() => { refreshMarket(); }, []);

  // AI 분석 실행 (P&L Focus Prompt)
  const runAiStrategy = async () => {
    if (!GEMINI_KEY) return alert("Gemini API 키가 설정되지 않았습니다.");
    if (!currentData?.kpiSeries6) return alert("분석할 데이터가 부족합니다.");

    setLoading(true);
    setActiveTab("brief"); 

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // [핵심] P&L 데이터(매출, GM, 고정비, OP)를 AI에게 구체적으로 전달
      const pnlContext = currentData.kpiSeries6.map(d => ({
        month: d.month,
        Revenue: d.rev || d.revenue, // 데이터 키 호환성 처리
        GrossMargin: d.gm,
        FixedCost: d.fixed,
        OperatingProfit: d.op,
        OP_Margin: d.opRate ? d.opRate.toFixed(1) + '%' : '0%',
        Utilization: d.util
      }));

      const prompt = `
        You are a Chief Strategy Officer at a Global Top-tier Consulting Firm (McKinsey/BCG style).
        Analyze the P&L structure and profitability risks for SUNCHEM (Chemical Manufacturing).

        [Data Context]
        1. Macro Environment: ${JSON.stringify(marketData)}
        2. P&L Trends (Last 6 Months): ${JSON.stringify(pnlContext)}

        [Requirements]
        1. **Executive Summary**: Focus on *Profitability*. Explain WHY Operating Profit (OP) is changing (e.g., Fixed cost burden? Raw material price impact on GM?).
        2. **Scenario Planning (MECE)**: Provide 3 scenarios (Base, Best, Worst) considering market volatility.
        3. **Tone**: Professional, insightful, and action-oriented.
        4. **Language**: Korean (한국어).

        [Output JSON Format]
        {
          "executive_summary": "One strong conclusion sentence regarding profitability.",
          "scenarios": {
            "base": { "title": "Base Case", "desc": "Most likely outcome..." },
            "best": { "title": "Optimistic Case", "desc": "If margins improve..." },
            "worst": { "title": "Pessimistic Case", "desc": "If costs escalate..." }
          },
          "strategic_moves": [
            { "focus": "Profitability Structure", "action": "Specific action to improve OP margin..." },
            { "focus": "Operational Efficiency", "action": "Specific action regarding Fixed Costs or Util..." }
          ],
          "risk_assessment": "Critical Financial Risk analysis..."
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      setAiAnalysis(JSON.parse(text));
    } catch (err) {
      console.error("AI Error:", err);
      alert("전략 리포트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-10">
      
      {/* 1. Header & Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">AI Strategic Intelligence</h2>
            <p className="text-xs text-slate-500">Powered by Gemini model • P&L Profitability Analysis</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("brief")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === "brief" 
                ? "bg-white text-purple-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText size={16} /> Strategy Brief
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === "data" 
                ? "bg-white text-blue-700 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart2 size={16} /> Data Room
          </button>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="p-6 min-h-[400px]">
        
        {/* --- TAB 1: Strategy Brief (Insights) --- */}
        {activeTab === "brief" && (
          <div className="animate-fade-in space-y-6">
            {!aiAnalysis ? (
              <div className="text-center py-20">
                <div className="mb-4 text-slate-300 mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-slate-900 font-bold mb-2">수익성 분석 리포트 생성</h3>
                <p className="text-slate-500 text-sm mb-6">
                  매출, 고정비, 영업이익 데이터를 기반으로 전략을 수립합니다.
                </p>
                <button 
                  onClick={runAiStrategy} 
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto transition-all shadow-lg shadow-purple-200"
                >
                  {loading ? <RefreshCcw className="animate-spin" size={18}/> : <Zap size={18}/>}
                  {loading ? "AI 정밀 분석 중..." : "전략 리포트 생성하기"}
                </button>
              </div>
            ) : (
              <>
                {/* Executive Summary */}
                <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg">
                  <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2">Executive Summary</h4>
                  <p className="text-xl font-serif text-slate-800 leading-relaxed font-medium">
                    "{aiAnalysis.executive_summary}"
                  </p>
                </div>

                {/* Scenario Planning (3 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ScenarioCard 
                    title={aiAnalysis.scenarios?.best?.title} 
                    desc={aiAnalysis.scenarios?.best?.desc} 
                    type="best" 
                  />
                  <ScenarioCard 
                    title={aiAnalysis.scenarios?.base?.title} 
                    desc={aiAnalysis.scenarios?.base?.desc} 
                    type="base" 
                  />
                  <ScenarioCard 
                    title={aiAnalysis.scenarios?.worst?.title} 
                    desc={aiAnalysis.scenarios?.worst?.desc} 
                    type="worst" 
                  />
                </div>

                {/* Strategic Moves & Risk */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                      <Target size={18} className="text-blue-600"/> Key Strategic Moves
                    </h4>
                    <ul className="space-y-4">
                      {aiAnalysis.strategic_moves?.map((move, idx) => (
                        <li key={idx} className="flex gap-3">
                          <div className="min-w-[4px] bg-blue-100 rounded-full"></div>
                          <div>
                            <span className="text-xs font-bold text-blue-600 uppercase block mb-1">{move.focus}</span>
                            <span className="text-sm text-slate-600 leading-snug">{move.action}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                    <h4 className="flex items-center gap-2 text-red-800 font-bold mb-2">
                      <AlertTriangle size={18}/> Critical Risk Assessment
                    </h4>
                    <p className="text-sm text-red-700 leading-relaxed">
                      {aiAnalysis.risk_assessment}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={runAiStrategy} className="text-xs font-bold text-slate-400 hover:text-purple-600 flex items-center gap-1">
                    <RefreshCcw size={12}/> Re-run Analysis
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- TAB 2: Data Room (P&L Charts) --- */}
        {activeTab === "data" && (
          <div className="animate-fade-in space-y-6">
            {/* Macro Indicators */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <DataCard label="CNY/KRW" value={marketData.cnyRate?.toFixed(2)} sub="Exchange Rate" />
              <DataCard label="WTI Oil" value={`$${marketData.oilPrice}`} sub="Raw Material" />
              <DataCard label="Interest" value={`${marketData.interestRate}%`} sub="Base Rate" />
            </div>

            {/* Advanced P&L Chart */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-96">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <DollarSign size={14}/> P&L Trend Analysis
                 </h4>
                 <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-200 rounded-sm"></span>Rev</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-sm"></span>Fixed</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-1 bg-green-600"></span>OP</span>
                 </div>
              </div>
              
              <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={currentData.kpiSeries6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" unit="%" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [
                      name === 'OP Margin' ? `${Number(value).toFixed(1)}%` : `₩${Number(value).toFixed(2)}B`, 
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} iconSize={8} fontSize={10}/>
                  
                  {/* P&L 시각화: 매출(Bar), 고정비(Area), 영업이익(Line) */}
                  <Bar yAxisId="left" dataKey="rev" name="Revenue" fill="#bfdbfe" barSize={30} radius={[4, 4, 0, 0]} />
                  <Area yAxisId="left" type="monotone" dataKey="fixed" name="Fixed Cost" fill="#cbd5e1" stroke="none" fillOpacity={0.4} />
                  <Line yAxisId="left" type="monotone" dataKey="op" name="Operating Profit" stroke="#16a34a" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                  <Line yAxisId="right" type="monotone" dataKey="opRate" name="OP Margin" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub Components ---
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

const DataCard = ({ label, value, sub }) => (
  <div className="bg-white p-4 rounded-lg border border-slate-200 text-center shadow-sm">
    <div className="text-xs text-slate-400 font-bold uppercase">{label}</div>
    <div className="text-xl font-black text-slate-900 my-1">{value || "-"}</div>
    <div className="text-[10px] text-slate-500">{sub}</div>
  </div>
);

export default AIStrategyAdvisor;