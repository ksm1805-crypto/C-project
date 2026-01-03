import React, { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Activity, Droplets, Percent, Globe, TrendingUp } from "lucide-react";

import { getMarketData } from "../services/marketData";
import AIStrategyAdvisor from "./common/AIStrategyAdvisor";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// --- [데이터 정규화] 매출/GM/고정비/OP 모두 합산 ---
const normalizeHistoryData = (historyData, currentPnlData) => {
  const mergedList = [];

  // 1) 과거 데이터 (Archive)
  if (Array.isArray(historyData)) {
    historyData.forEach((item) => {
      let rev = safeNum(item.rev);
      let gm = safeNum(item.gm);
      let fixed = safeNum(item.fixed);
      let op = safeNum(item.totalOp) || (gm - fixed);

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
        isLive: false,
      });
    });
  }

  // 2) 현재 라이브 데이터 (Live P&L)
  if (Array.isArray(currentPnlData) && currentPnlData.length > 0) {
    const currentRev = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.rev), 0);
    const currentGm = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.gm), 0);
    const currentFixed = currentPnlData.reduce((acc, cur) => acc + safeNum(cur.fixed), 0);
    const currentOp = currentGm - currentFixed;

    if (currentRev > 0) {
      const today = new Date().toISOString().slice(0, 7);
      const exists = mergedList.find((d) => d.month === today);

      const liveData = {
        month: `${today} (Live)`,
        rev: currentRev,
        gm: currentGm,
        fixed: currentFixed,
        op: currentOp,
        gmRate: (currentGm / currentRev) * 100,
        opRate: (currentOp / currentRev) * 100,
        isLive: true,
      };

      if (!exists) mergedList.push(liveData);
      else mergedList[mergedList.indexOf(exists)] = liveData;
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

// ✅ [고도화된 프롬프트] 회사 정체성(OLED/API 합성, 대기업 벤더) 반영
const GLOBAL_CONSULTING_PROMPT = `
너는 정밀 화학 및 첨단 소재 분야 전문 전략 컨설턴트다.
분석 대상 기업은 **"OLED 중간체/소재 완제품 및 의약품 중간체(API)를 합성하여 대기업에 납품하는 B2B 제조사"**이다.
이 회사는 다양한 유기 합성 기술(Suzuki, Buchwald 등)을 보유하고 있으며, 고객사(대기업)의 엄격한 품질 기준과 납기를 준수해야 하는 벤더(Vendor) 포지션이다.

제공된 [내부 재무/운영 데이터]와 [외부 시장 지표]를 결합하여, 이 회사의 수익성을 극대화할 수 있는 구체적인 전략을 제시하라.

[1. 분석 관점 (Contextual Analysis)]
- **OLED Biz:** 고객사(삼성, LG 등)의 신규 패널 라인업(IT용 OLED, 전장 등)에 따른 소재 수요 예측 및 선제적 재고/생산 대응 전략.
- **API Biz:** 글로벌 의약품 공급망 재편(생물보안법 등) 기회를 활용한 CDMO 수주 확대 및 중국산 원료 의존도 리스크 관리.
- **운영 효율성:** 다품종 소량 생산 특성에 맞는 반응기(Reactor) 운영 최적화 및 배치(Batch) 전환 손실 최소화 방안.
- **대기업 벤더 특성:** 단가 인하(CR) 압박에 대응하기 위한 원가 구조 개선(수율 향상, 공정 단축) 및 고정비 커버리지 분석.

[2. 외부 변수 상관관계 (Macro-Sensitivity)]
- **환율(USD/CNY):** 원재료 수입(CNY 등)과 완제품 수출/납품(USD/KRW) 구조에 따른 환리스크 및 헷징 필요성.
- **유가:** 기초 유분 가격 변동이 합성 원료(Solvent, Reagent) 원가에 미치는 영향 분석.

[3. 필수 산출물 (JSON Output Requirement)]
1) **Executive Summary:** 경영진 보고용 5줄 요약 (기회 vs 위협 명시).
2) **Macro Impact Analysis:** 환율/유가/금리가 당사 마진(OP Margin)에 미치는 구체적 영향.
3) **Operational Insight:** 가동률(Utilization)과 불량률 데이터를 근거로 한 생산성 진단.
4) **Strategic Moves (8개):** - R&D 파이프라인 강화 (차세대 OLED 재료 등).
   - 대기업 파트너십 강화 전략 (SCM 연동 등).
   - 합성 공정 개선을 통한 원가 절감 액션.
5) **Scenario Planning:** 전방 산업 수요 급감(Worst Case) 시 생존을 위한 Cash-flow 확보 방안.

[톤앤매너]
- 전문 용어 사용 (예: 수율(Yield), 배치(Batch), CAPEX, OTD, CR 등).
- 막연한 조언보다는 구체적인 액션 아이템 위주로 서술.
- 언어: 한국어.
`;

const Chapter1_AI_Insights = ({
  pnlData,
  historyData,
  prodStats,
  headcountDB,
  selectedMonth,
}) => {
  // 1) 재무 데이터 통합
  const fullTrendData = useMemo(
    () => normalizeHistoryData(historyData, pnlData),
    [historyData, pnlData]
  );

  // ✅ [시장 데이터]
  const [marketData, setMarketData] = useState({
    cnyRate: 185.5,
    usdRate: 1350.0,
    oilPrice: 75.2,
    interestRate: 3.5,
    globalTrends: {
      oled: "IT용 OLED(태블릿/노트북) 침투율 증가 및 전장 시장 확대 중",
      api: "공급망 다변화 수요로 인한 CDMO 파트너십 기회 증가",
      chemical: "범용 소재 경쟁 심화, 고부가 스페셜티(Specialty) 전환 필요"
    }
  });
  
  const [fetchTime, setFetchTime] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  const refreshMarket = async () => {
    setMarketLoading(true);
    try {
      const m = await getMarketData();
      if (m) {
        setMarketData((prev) => ({ 
          ...prev, 
          ...m,
          globalTrends: prev.globalTrends 
        }));
      }
      setFetchTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    refreshMarket();
  }, []);

  // 2) 6개월 KPI 시리즈
  const kpiSeries6 = useMemo(() => {
    const safeProdStats = Array.isArray(prodStats) ? prodStats : [];
    const safeHeadcount = headcountDB || {};

    return fullTrendData
      .map((data) => {
        const keyMonth = data.month.substring(0, 7);
        const stat = safeProdStats.find((p) => p.month === keyMonth) || {};

        const util = safeNum(stat.util);
        const totalBatch =
          safeNum(stat.oled) +
          safeNum(stat.api) +
          safeNum(stat.new_biz ?? stat.newBiz);
        const late = safeNum(stat.late);
        const otd = totalBatch > 0 ? ((totalBatch - late) / totalBatch) * 100 : 0;

        const depts = safeHeadcount[keyMonth] || [];
        const totalHeadcount = Array.isArray(depts)
          ? depts.reduce((acc, cur) => acc + safeNum(cur.count), 0)
          : 0;

        return {
          ...data,
          totalHeadcount,
          util,
          otd,
          totalBatch,
          isLive: data.isLive,
        };
      })
      .slice(-6);
  }, [fullTrendData, prodStats, headcountDB]);

  const latest = kpiSeries6[kpiSeries6.length - 1];

  // 3) 이번 달 운영 스냅샷 + Top10 아이템
  const opsAndItemSnapshot = useMemo(() => {
    const monthKey = String(selectedMonth || "").slice(0, 7);
    if (!monthKey) {
      return {
        month: null,
        opsSnapshot: { hasLogs: false },
        topItems10: [],
        revenueByCategory: { OLED: 0, API: 0, 신사업: 0 },
      };
    }

    try {
      const logs = JSON.parse(localStorage.getItem("matflow_logs_v2") || "[]");
      const reactors = JSON.parse(localStorage.getItem("matflow_reactors_v2") || "[]");

      const monthlyLogs = Array.isArray(logs)
        ? logs.filter((l) => String(l.month).slice(0, 7) === monthKey)
        : [];

      const totalReactors = Array.isArray(reactors) ? reactors.length : 0;

      const byReactor = new Map();
      monthlyLogs.forEach((l) => {
        if (!l?.reactor_id) return;
        byReactor.set(l.reactor_id, l);
      });

      let sumUtil = 0;
      let running = 0, maint = 0, idle = 0;

      byReactor.forEach((log) => {
        sumUtil += safeNum(log.utilization);
        const status = log.status || "Idle";
        if (status === "Running") running += 1;
        else if (status === "Maintenance") maint += 1;
        else idle += 1;
      });

      const denom = totalReactors > 0 ? totalReactors : Math.max(1, byReactor.size);
      const avgUtil = denom > 0 ? sumUtil / denom : 0;

      const itemMap = new Map();
      const revenueByCategory = { OLED: 0, API: 0, 신사업: 0 };

      monthlyLogs.forEach((log) => {
        if (!Array.isArray(log.items)) return;
        log.items.forEach((it) => {
          const name = (it.name || "").trim();
          if (!name) return;

          const cat = it.category || "OLED";
          const revB = (safeNum(it.quantity) * safeNum(it.price)) / 1_000_000_000;

          if (cat === "OLED") revenueByCategory.OLED += revB;
          else if (cat === "API") revenueByCategory.API += revB;
          else revenueByCategory.신사업 += revB;

          itemMap.set(name, (itemMap.get(name) || 0) + revB);
        });
      });

      const topItems10 = Array.from(itemMap.entries())
        .map(([name, revB]) => ({ name, revB: Number(revB.toFixed(3)) }))
        .sort((a, b) => b.revB - a.revB)
        .slice(0, 10);

      return {
        month: monthKey,
        opsSnapshot: {
          hasLogs: monthlyLogs.length > 0,
          totalReactors,
          loggedReactors: byReactor.size,
          avgUtil: Number(avgUtil.toFixed(1)),
          statusCount: { running, maintenance: maint, idle },
        },
        topItems10,
        revenueByCategory: {
          OLED: Number(revenueByCategory.OLED.toFixed(3)),
          API: Number(revenueByCategory.API.toFixed(3)),
          신사업: Number(revenueByCategory.신사업.toFixed(3)),
        },
      };
    } catch (e) {
      console.error("opsAndItemSnapshot error", e);
      return {
        month: monthKey,
        opsSnapshot: { hasLogs: false },
        topItems10: [],
        revenueByCategory: { OLED: 0, API: 0, 신사업: 0 },
      };
    }
  }, [selectedMonth]);

  // ✅ AI 전송용 데이터룸
  const advisorCurrentData = useMemo(
    () => ({
      selectedMonth: opsAndItemSnapshot.month,
      kpiSeries6,
      latest,
      marketData, 

      opsSnapshot: opsAndItemSnapshot.opsSnapshot,
      topItems10: opsAndItemSnapshot.topItems10,
      revenueByCategory: opsAndItemSnapshot.revenueByCategory,

      prompt: GLOBAL_CONSULTING_PROMPT, // 수정된 프롬프트 전달
    }),
    [kpiSeries6, latest, marketData, opsAndItemSnapshot]
  );

  if (!latest) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <Activity size={48} className="mb-4 text-slate-200" />
        <p className="font-bold text-lg">데이터가 없습니다.</p>
        <p className="text-sm">Chapter 0에서 매출 데이터를 입력하거나, 과거 실적을 저장해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* 1) Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Exchange Rate Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase mb-1">
              <RefreshCcw size={14} className={marketLoading ? "animate-spin" : ""} /> Exchange Rates
            </div>
            <div className="flex gap-4">
                <div>
                    <div className="text-2xl font-black text-slate-900">
                    {safeNum(marketData.usdRate).toFixed(0)} <span className="text-sm font-normal text-slate-400">USD</span>
                    </div>
                </div>
                <div className="border-l pl-4 border-slate-200">
                    <div className="text-2xl font-black text-slate-900">
                    {safeNum(marketData.cnyRate).toFixed(1)} <span className="text-sm font-normal text-slate-400">CNY</span>
                    </div>
                </div>
            </div>
            <div className="text-[10px] text-blue-600 font-bold mt-2">
              Updated: {fetchTime || "Live"}
            </div>
          </div>
        </div>

        {/* Oil Price */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
            <Droplets size={14} /> WTI Oil
          </div>
          <div className="text-2xl font-black text-slate-900">${marketData.oilPrice}</div>
          <span className="text-[10px] text-slate-400 mt-1">Impacts raw material costs</span>
        </div>

        {/* Interest Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
            <Percent size={14} /> Interest Rate
          </div>
          <div className="text-2xl font-black text-slate-900">{marketData.interestRate}%</div>
          <span className="text-[10px] text-slate-400 mt-1">Impacts CAPEX decisions</span>
        </div>

        {/* Global Market Status (New) */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase mb-2">
             <Globe size={14}/> Global Market Context
           </div>
           <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600"><span className="font-bold">OLED</span> <span className="text-green-600 font-bold">Growing ↗</span></div>
              <div className="flex justify-between text-[11px] text-slate-600"><span className="font-bold">API</span> <span className="text-amber-600 font-bold">Competitive -</span></div>
              <div className="flex justify-between text-[11px] text-slate-600"><span className="font-bold">Chem</span> <span className="text-red-500 font-bold">Slowing ↘</span></div>
           </div>
        </div>
      </div>

      {/* 2) AI Strategy Advisor */}
      <div className="grid grid-cols-1 gap-8">
        <AIStrategyAdvisor currentData={advisorCurrentData} />
      </div>
    </div>
  );
};

export default Chapter1_AI_Insights;