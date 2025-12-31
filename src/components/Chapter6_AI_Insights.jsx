// src/components/Chapter6_AI_Insights.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCcw, Activity, Droplets, Percent, TrendingUp, TrendingDown, DollarSign
} from "lucide-react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area
} from "recharts";

import { getMarketData } from "../services/marketData";
import AIStrategyAdvisor from "./common/AIStrategyAdvisor";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// --- [데이터 정규화] 매출/GM/고정비/OP 모두 합산 ---
const normalizeHistoryData = (historyData, currentPnlData) => {
  const mergedList = [];

  // 1. 과거 데이터 (Archive)
  if (Array.isArray(historyData)) {
    historyData.forEach(item => {
      let rev = safeNum(item.rev);
      let gm = safeNum(item.gm);
      let fixed = safeNum(item.fixed);
      let op = safeNum(item.totalOp) || (gm - fixed); // totalOp가 없으면 계산

      // 만약 상위 레벨에 값이 없고 bu_data만 있는 경우 합산
      if (rev === 0 && Array.isArray(item.bu_data)) {
        rev = item.bu_data.reduce((acc, cur) => acc + safeNum(cur.rev), 0);
        gm = item.bu_data.reduce((acc, cur) => acc + safeNum(cur.gm), 0);
        fixed = item.bu_data.reduce((acc, cur) => acc + safeNum(cur.fixed), 0);
        op = gm - fixed;
      }

      mergedList.push({
        month: item.month,
        rev, gm, fixed, op,
        gmRate: rev > 0 ? (gm / rev) * 100 : 0,
        opRate: rev > 0 ? (op / rev) * 100 : 0,
        isLive: false
      });
    });
  }

  // 2. 현재 라이브 데이터 (Live P&L)
  if (Array.isArray(currentPnlData) && currentPnlData.length > 0) {
    const currentRev = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.rev), 0);
    const currentGm = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.gm), 0);
    const currentFixed = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.fixed), 0);
    const currentOp = currentGm - currentFixed;
    
    if (currentRev > 0) {
      const today = new Date().toISOString().slice(0, 7);
      const exists = mergedList.find(d => d.month === today);
      
      const liveData = {
        month: `${today} (Live)`,
        rev: currentRev,
        gm: currentGm,
        fixed: currentFixed,
        op: currentOp,
        gmRate: (currentGm / currentRev) * 100,
        opRate: (currentOp / currentRev) * 100,
        isLive: true
      };

      if (!exists) {
        mergedList.push(liveData);
      } else {
        // 이미 있으면 (이번 달 마감을 안 했지만 아카이브 된 경우 등) 덮어쓰기 고려 가능
        // 여기서는 중복 방지 위해 Live가 우선하도록 리스트 교체
        const index = mergedList.indexOf(exists);
        mergedList[index] = liveData;
      }
    }
  }

  return mergedList.sort((a, b) => a.month.localeCompare(b.month));
};

const KPIChip = ({ tone = "slate", children }) => {
  const map = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[tone]}`}>
      {children}
    </span>
  );
};

const Chapter6_AI_Insights = ({ 
  pnlData, 
  historyData, 
  prodStats, 
  headcountDB 
}) => {
  // 1. 재무 데이터 통합
  const fullTrendData = useMemo(() => normalizeHistoryData(historyData, pnlData), [historyData, pnlData]);

  const [marketData, setMarketData] = useState({
    cnyRate: 185.5, oilPrice: 75, interestRate: 3.5, industryIndex: 100
  });
  const [fetchTime, setFetchTime] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const refreshMarket = async () => {
    setMarketLoading(true);
    try {
      const m = await getMarketData();
      if(m) setMarketData(prev => ({...prev, ...m}));
      setFetchTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => { refreshMarket(); }, []);

  // 2. 전체 데이터 시리즈 (재무 + 운영)
  const kpiSeries6 = useMemo(() => {
    const safeProdStats = Array.isArray(prodStats) ? prodStats : [];
    const safeHeadcount = headcountDB || {};

    return fullTrendData.map((data) => {
      const keyMonth = data.month.substring(0, 7);
      const stat = safeProdStats.find(p => p.month === keyMonth) || {};
      
      // 운영 지표
      const util = safeNum(stat.util);
      const totalBatch = safeNum(stat.oled) + safeNum(stat.api) + safeNum(stat.new_biz ?? stat.newBiz);
      const late = safeNum(stat.late);
      const otd = totalBatch > 0 ? ((totalBatch - late) / totalBatch) * 100 : 0;

      // 인력
      const depts = safeHeadcount[keyMonth] || [];
      const totalHeadcount = Array.isArray(depts) ? depts.reduce((acc, cur) => acc + safeNum(cur.count), 0) : 0;
      
      return {
        ...data, // rev, gm, fixed, op, gmRate, opRate 포함됨
        totalHeadcount,
        util, 
        otd,
        isLive: data.isLive
      };
    }).slice(-6);
  }, [fullTrendData, prodStats, headcountDB]);

  const latest = kpiSeries6[kpiSeries6.length - 1];

  // AI 전송용 데이터
  const advisorCurrentData = useMemo(() => ({
    kpiSeries6,
    latest,
    marketData // 마켓 데이터도 함께 패키징
  }), [kpiSeries6, latest, marketData]);

  if (!latest) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400">
      <Activity size={48} className="mb-4 text-slate-200" />
      <p className="font-bold text-lg">데이터가 없습니다.</p>
      <p className="text-sm">Chapter 0에서 매출 데이터를 입력하거나, 과거 실적을 저장해주세요.</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      
      {/* 1. Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
           <div>
             <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase mb-1">
               <RefreshCcw size={14} className={marketLoading ? "animate-spin" : ""} /> Live Market (CNY/KRW)
             </div>
             <div className="text-3xl font-black text-slate-900">{safeNum(marketData.cnyRate).toFixed(2)} <span className="text-sm font-normal text-slate-400">KRW</span></div>
             <div className="text-[10px] text-blue-600 font-bold mt-1">Updated: {fetchTime || "Live"}</div>
           </div>
           <div className="text-right">
              <KPIChip tone={marketData.cnyRate > 190 ? "red" : "green"}>
                {marketData.cnyRate > 190 ? "High Risk" : "Stable"}
              </KPIChip>
           </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2"><Droplets size={14}/> WTI Oil</div>
            <div className="text-2xl font-black text-slate-900">${marketData.oilPrice}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2"><Percent size={14}/> Interest Rate</div>
            <div className="text-2xl font-black text-slate-900">{marketData.interestRate}%</div>
        </div>
      </div>

      {/* 2. Financial Trend Chart (P&L Focus) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <DollarSign size={18} className="text-green-600"/> P&L Analysis (Rev vs Fixed vs OP)
          </h3>
          <div className="flex gap-4 text-xs text-slate-500">
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200 rounded-sm"></div> 매출 (Rev)</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-300 rounded-sm"></div> 고정비 (Fixed)</span>
             <span className="flex items-center gap-1"><div className="w-3 h-1 bg-green-600"></div> 영업이익 (OP)</span>
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={kpiSeries6} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{fontSize: 11}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left" tick={{fontSize: 11}} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" unit="%" tick={{fontSize: 11}} axisLine={false} tickLine={false}/>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                formatter={(val, name) => [
                  name.includes('Rate') || name.includes('OTD') || name.includes('Util') ? `${Number(val).toFixed(1)}%` : `₩${Number(val).toFixed(2)}B`, 
                  name
                ]}
              />
              <Legend />
              {/* 차트 구성: 매출(Bar), 고정비(Area), 영업이익(Line) */}
              <Bar yAxisId="left" dataKey="rev" name="Revenue" fill="#bfdbfe" barSize={30} radius={[4, 4, 0, 0]} />
              <Area yAxisId="left" type="monotone" dataKey="fixed" name="Fixed Cost" fill="#f1f5f9" stroke="#94a3b8" />
              <Line yAxisId="left" type="monotone" dataKey="op" name="Operating Profit" stroke="#16a34a" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              <Line yAxisId="right" type="monotone" dataKey="opRate" name="OP Margin %" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. AI Strategy Advisor */}
      <div className="grid grid-cols-1 gap-8">
         <AIStrategyAdvisor currentData={advisorCurrentData} />
      </div>
    </div>
  );
};

export default Chapter6_AI_Insights;