import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // [New] Chapter 6 데이터를 가져오기 위해 필요
import {
  PieChart as LucidePieChart, BarChart3, Calculator,
  TrendingUp, Activity, DollarSign, Layers,
  Factory, Package, AlertCircle, ClipboardList, CheckCircle2, Users, TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- [Constants] P&L ID와 Factory Category 매핑 ---
const BU_ID_MAPPING = {
  1: 'OLED',
  2: 'API',
  3: 'NEW_BIZ' 
};

// --- [Utility] 데이터 안정성 헬퍼 ---
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// --- [Sub Components] ---
const DashboardCard = ({ title, value, icon: Icon, color, sub }) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  const activeStyle = colorStyles[color] || colorStyles.slate;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</span>
        <div className={`p-3 rounded-xl ${activeStyle}`}>
          {Icon && <Icon size={22} />}
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
        {sub && <p className="mt-2 text-xs text-slate-500 font-semibold">{sub}</p>}
      </div>
    </div>
  );
};

const Badge = ({ text, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const cls = tones[tone] || tones.slate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {text}
    </span>
  );
};

const catTone = (cat) => {
  if (cat === 'OLED') return 'blue';
  if (cat === 'API') return 'emerald';
  if (cat === '신사업') return 'amber';
  return 'slate';
};

// --- [Main Component] ---
const Chapter0_Executive = ({
  pnlData,
  onPnlChange,
  historyData,
  prodStats,
  headcountDB,
  reactorLogs, 
  reactorConfig, 
  selectedMonth,
  crActions = [] 
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rev', direction: 'desc' });
  const [chartViewMode, setChartViewMode] = useState('batch'); 

  // [New] Chapter 6 요약 데이터를 위한 State
  const [trackerStats, setTrackerStats] = useState({
    total: 0,
    resolved: 0,
    rate: 0,
    breakdown: { fixed: 0, cost: 0, prod: 0, hr: 0 }
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // --- [Logic: Chapter 6 Action Tracker Summary] ---
  // Chapter 6의 로직을 경량화하여 통계만 산출
  useEffect(() => {
    const fetchAndCalculateTracker = async () => {
      try {
        // 1. 수기 데이터 & 시스템 상태 Fetch
        const [manualRes, sysRes] = await Promise.all([
          supabase.from('manual_actions').select('*').eq('month', selectedMonth),
          supabase.from('system_issue_states').select('*')
        ]);

        const manualActions = manualRes.data || [];
        const systemStates = {};
        (sysRes.data || []).forEach(s => {
          systemStates[s.sys_id] = { is_resolved: s.is_resolved, is_hidden: s.is_hidden };
        });

        // 2. 이슈 집계 (Chapter 6 로직 미러링)
        let issues = [];

        // Helper
        const addSys = (id, cat) => {
           const state = systemStates[id] || { is_resolved: false, is_hidden: false };
           if (!state.is_hidden) {
             issues.push({ id, cat, isDone: state.is_resolved });
           }
        };

        // (1) Fixed Cost (Auto)
        if (pnlData) {
            const safePnl = Array.isArray(pnlData) ? pnlData : [];
            const totalRev = safePnl.reduce((acc, cur) => acc + (cur.rev || 0), 0);
            const totalFixed = safePnl.reduce((acc, cur) => acc + (cur.fixed || 0), 0);
            const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
            if (ratio > 25) addSys('sys-fixed-1', 'fixed');
        }

        // (2) Cost Reduction (Auto)
        if (crActions) {
            crActions.forEach(a => {
                if (a.status === '리스크' || a.status === '지연') addSys(`sys-cr-${a.id}`, 'cost');
            });
        }

        // (3) Prod (Auto)
        if (prodStats) {
            const target = prodStats.find(p => p.month === selectedMonth);
            if (target) {
                const totalBatch = (target.oled||0) + (target.api||0) + (target.new_biz||target.newBiz||0);
                const otd = totalBatch > 0 ? ((totalBatch - (target.late||0))/totalBatch)*100 : 100;
                if (otd < 95) addSys(`sys-prod-otd-${target.month}`, 'prod');
                if ((target.util||0) < 85) addSys(`sys-prod-util-${target.month}`, 'prod');
                
                const defectRate = totalBatch > 0 ? (((target.defect||0)+(target.rework||0))/totalBatch)*100 : 0;
                if (defectRate > 5) addSys(`sys-prod-defect-${target.month}`, 'prod');
            }
        }

        // (4) HR (Auto)
        if (headcountDB && headcountDB[selectedMonth]) {
            headcountDB[selectedMonth].forEach(dept => {
                dept.members.forEach(m => {
                    if (m.status === '지연' || m.status === '리스크') addSys(`sys-hr-${m.id}`, 'hr');
                });
            });
        }

        // (5) Manual
        manualActions.forEach(m => {
            issues.push({ id: m.id, cat: m.category, isDone: m.is_done });
        });

        // 3. 통계 산출
        const total = issues.length;
        const resolved = issues.filter(i => i.isDone).length;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        
        const breakdown = { fixed: 0, cost: 0, prod: 0, hr: 0 };
        issues.forEach(i => {
            if (breakdown[i.cat] !== undefined && !i.isDone) { // 미해결 건수만 카운트 (옵션) -> 여기서는 전체 건수로 할지 미해결로 할지 결정. *여기서는 Active(미해결) 이슈 기준*
                breakdown[i.cat]++; 
            }
        });

        setTrackerStats({ total, resolved, rate, breakdown });

      } catch (e) {
        console.error("Tracker Summary Error", e);
      }
    };

    if (selectedMonth) {
        fetchAndCalculateTracker();
    }
  }, [selectedMonth, pnlData, crActions, prodStats, headcountDB]);


  // =========================
  // 1) 이번 달 P&L 계산 (기존 로직 유지)
  // =========================
  const calculatedData = useMemo(() => {
    const safePnl = Array.isArray(pnlData) ? pnlData : [];
    const safeLogs = Array.isArray(reactorLogs) ? reactorLogs : [];

    const monthlyLogs = safeLogs.filter(l => String(l?.month || '').slice(0, 7) === selectedMonth);
    let factoryRevenues = { 'OLED': 0, 'API': 0, 'NEW_BIZ': 0 };
    let hasFactoryData = false;

    if (monthlyLogs.length > 0) {
      hasFactoryData = true;
      monthlyLogs.forEach((log) => {
        if (Array.isArray(log.items)) {
          log.items.forEach((item) => {
            let catKey = 'OLED';
            const rawCat = (item.category || 'OLED').toUpperCase();
            if (rawCat === 'API') catKey = 'API';
            else if (rawCat === '신사업' || rawCat === 'NEW_BIZ') catKey = 'NEW_BIZ';
            
            const revenueB = (safeNum(item.quantity) * safeNum(item.price)) / 1_000_000_000;
            factoryRevenues[catKey] += revenueB;
          });
        }
      });
    }

    let processedRows = safePnl.map((row) => {
      let finalRev = safeNum(row.rev);

      if (hasFactoryData) {
        const mappedCategory = BU_ID_MAPPING[row.id];
        if (mappedCategory && factoryRevenues[mappedCategory] !== undefined) {
           finalRev = factoryRevenues[mappedCategory];
        } else {
           const rowName = (row.name || '').toUpperCase();
           if (rowName.includes('OLED')) finalRev = factoryRevenues['OLED'];
           else if (rowName.includes('API') || rowName.includes('중간체')) finalRev = factoryRevenues['API'];
           else if (rowName.includes('신사업') || rowName.includes('NEW')) finalRev = factoryRevenues['NEW_BIZ'];
        }
        finalRev = parseFloat(finalRev.toFixed(1));
      }

      const op = safeNum(row.gm) - safeNum(row.fixed);
      return { ...row, rev: finalRev, op };
    });

    processedRows.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const sums = processedRows.reduce(
      (acc, cur) => ({
        rev: acc.rev + safeNum(cur.rev),
        gm: acc.gm + safeNum(cur.gm),
        fixed: acc.fixed + safeNum(cur.fixed),
      }),
      { rev: 0, gm: 0, fixed: 0 }
    );

    const totalOp = sums.gm - sums.fixed;

    return {
      rows: processedRows,
      total: { rev: sums.rev, gm: sums.gm, fixed: sums.fixed, op: totalOp },
      hasFactoryData
    };
  }, [pnlData, reactorLogs, selectedMonth, sortConfig]);

  const { rows, total, hasFactoryData } = calculatedData;

  // =========================
  // 2) 최근 6개월 생산성/수익성 분석 차트 (기존 로직 유지)
  // =========================
  const chartData = useMemo(() => {
    if (!Array.isArray(historyData) || historyData.length === 0) return [];

    const merged = historyData.map((hItem) => {
      const m = hItem?.month || 'Unknown';
      const safeProdStats = Array.isArray(prodStats) ? prodStats : [];
      const pItem = safeProdStats.find((p) => p.month === m);
      
      const totalBatch = pItem
        ? safeNum(pItem.oled) + safeNum(pItem.api) + safeNum(pItem.new_biz ?? pItem.newBiz)
        : 0;
      const util = pItem ? safeNum(pItem.util) : 0;

      let monthDepts = (headcountDB && headcountDB[m]) ? headcountDB[m] : [];
      if ((!monthDepts || monthDepts.length === 0) && headcountDB) {
        const key = Object.keys(headcountDB).find((k) => k.startsWith(m));
        if (key) monthDepts = headcountDB[key];
      }

      const totalHeadcount = Array.isArray(monthDepts)
        ? monthDepts.reduce((acc, cur) => acc + (parseInt(cur.count, 10) || 0), 0)
        : 0;

      const revTotal = safeNum(hItem.rev);
      const opTotal = safeNum(hItem.totalOp);

      const revPerBatch = totalBatch > 0 ? revTotal / totalBatch : 0;
      const opPerBatch = totalBatch > 0 ? opTotal / totalBatch : 0;

      const revPerHead = totalHeadcount > 0 ? revTotal / totalHeadcount : 0;
      const opPerHead = totalHeadcount > 0 ? opTotal / totalHeadcount : 0;

      return { month: m, util, revTotal, opTotal, revPerBatch, opPerBatch, revPerHead, opPerHead };
    });

    return merged.sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [historyData, prodStats, headcountDB]);

  const getChartConfig = (mode) => {
    switch (mode) {
      case 'total':
        return {
          barKey1: 'revTotal', barName1: '매출 (Total)',
          barKey2: 'opTotal', barName2: '영업이익 (Total)',
          yLabel: '금액 (B KRW)',
        };
      case 'head':
        return {
          barKey1: 'revPerHead', barName1: '인당 매출',
          barKey2: 'opPerHead', barName2: '인당 영업이익',
          yLabel: '인당 금액 (B KRW)',
        };
      case 'batch':
      default:
        return {
          barKey1: 'revPerBatch', barName1: 'Batch당 매출',
          barKey2: 'opPerBatch', barName2: 'Batch당 영업이익',
          yLabel: 'Batch당 금액 (B KRW)',
        };
    }
  };
  const currentChartConfig = getChartConfig(chartViewMode);

  // =========================
  // 3) 이번 달 가동률 현황 (기존 로직 유지)
  // =========================
  const utilizationPanel = useMemo(() => {
    const logs = Array.isArray(reactorLogs) ? reactorLogs : [];
    const reactors = Array.isArray(reactorConfig) ? reactorConfig : [];

    const totalReactors = reactors.length;
    const monthlyLogs = logs.filter((l) => String(l?.month || '').slice(0, 7) === selectedMonth);
    const hasLogs = monthlyLogs.length > 0;

    const byReactor = new Map();
    monthlyLogs.forEach((l) => {
      if (!l?.reactor_id) return;
      byReactor.set(l.reactor_id, l);
    });

    let sumUtil = 0;
    let runningCount = 0;
    let maintenanceCount = 0;
    let idleCount = 0;

    byReactor.forEach((log) => {
      const util = safeNum(log.utilization);
      sumUtil += util;

      const status = log.status || 'Idle';
      if (status === 'Running') runningCount += 1;
      else if (status === 'Maintenance') maintenanceCount += 1;
      else idleCount += 1;
    });

    const denom = totalReactors > 0 ? totalReactors : Math.max(1, byReactor.size);
    const avgUtil = denom > 0 ? (sumUtil / denom) : 0;

    return {
      totalReactors,
      loggedReactors: byReactor.size,
      avgUtil: Number(avgUtil.toFixed(1)),
      runningCount,
      maintenanceCount,
      idleCount,
      hasLogs
    };
  }, [reactorLogs, reactorConfig, selectedMonth]);

  // =========================
  // 4) 이번 달 매출 Top 10 아이템 (기존 로직 유지)
  // =========================
  const topItemsPanel = useMemo(() => {
    const logs = Array.isArray(reactorLogs) ? reactorLogs : [];
    const monthlyLogs = logs.filter((l) => String(l?.month || '').slice(0, 7) === selectedMonth);

    const map = new Map();
    monthlyLogs.forEach((log) => {
      if (!Array.isArray(log.items)) return;
      log.items.forEach((it) => {
        const name = (it.name || '').trim();
        if (!name) return;

        const cat = (it.category || 'OLED');
        const revB = (safeNum(it.quantity) * safeNum(it.price)) / 1_000_000_000;

        const prev = map.get(name);
        if (!prev) {
          map.set(name, { name, cat, revB });
        } else {
          map.set(name, { ...prev, revB: prev.revB + revB });
        }
      });
    });

    const arr = Array.from(map.values())
      .map((x) => ({ ...x, revB: Number(x.revB.toFixed(3)) }))
      .sort((a, b) => b.revB - a.revB);

    const top10 = arr.slice(0, 10);
    const totalItemRev = arr.reduce((acc, cur) => acc + safeNum(cur.revB), 0);

    return {
      hasData: monthlyLogs.length > 0,
      top10,
      totalItemRev: Number(totalItemRev.toFixed(2)),
      itemCount: arr.length,
    };
  }, [reactorLogs, selectedMonth]);

  // =========================
  // UI Rendering
  // =========================
  return (
    <div className="space-y-6 animate-fade-in pb-10">

      {/* 헤더 요약 */}
      <div className="flex items-center gap-2.5 mb-2 mt-4 pl-1">
        <div className="w-1.5 h-6 bg-slate-800 rounded-full"></div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Executive Dashboard <span className="text-slate-400 text-sm font-extrabold ml-2">({selectedMonth || '—'})</span>
        </h2>
        {hasFactoryData && (
          <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Factory Log Synced
          </span>
        )}
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <DashboardCard title="매출 (ACT)" value={`₩ ${total.rev.toFixed(1)}B`} icon={DollarSign} color="blue" />
        <DashboardCard title="GM (ACT)" value={`₩ ${total.gm.toFixed(1)}B`} icon={LucidePieChart} color="emerald" />
        <DashboardCard title="고정비 (ACT)" value={`₩ ${total.fixed.toFixed(1)}B`} icon={Layers} color="amber" />
        <DashboardCard title="OP (ACT)" value={`₩ ${total.op.toFixed(2)}B`} icon={Activity} color={total.op >= 0 ? 'slate' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: P&L 테이블 + 6개월 분석 + Action Tracker */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. P&L 테이블: 높이 480px 고정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[480px] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="text-blue-600" size={20} />
                <span className="tracking-tight">Monthly P&L Status</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSort('rev')}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    sortConfig.key === 'rev'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  매출순
                </button>
                <button
                  onClick={() => handleSort('op')}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                    sortConfig.key === 'op'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  이익순
                </button>
              </div>
            </div>

            {/* Scrollable Table Area */}
            <div className="flex-1 overflow-hidden relative -mx-4 md:mx-0">
              <div className="absolute inset-0 overflow-auto px-4 md:px-0">
                <table className="w-full text-base text-left border-separate border-spacing-y-2 table-fixed">
                  <thead>
                    <tr className="text-slate-500 text-sm uppercase tracking-wider font-bold sticky top-0 bg-white z-10">
                      <th className="py-2 px-4 pl-6 w-[25%] bg-white">Business Unit</th>
                      <th className="py-2 px-2 text-right w-[10%] bg-white">Revenue</th>
                      <th className="py-2 px-6 text-right w-[10%] bg-white">GM</th>
                      <th className="py-2 px-2 text-right w-[13%] bg-white">Fixed Cost</th>
                      <th className="py-2 px-2 text-right text-slate-400 w-[10%] bg-white">Ratio</th>
                      <th className="py-2 px-4 pr-6 text-right text-slate-700 w-[20%] bg-white">OP (Act)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const ratio = row.rev > 0 ? (safeNum(row.fixed) / safeNum(row.rev)) * 100 : 0;
                      const op = safeNum(row.op);
                      return (
                        <tr key={row.id} className="group hover:bg-slate-50 transition-colors rounded-xl bg-white">
                          <td className="py-4 px-4 pl-6 font-bold text-slate-800 text-base rounded-l-xl border-y border-l border-transparent group-hover:border-slate-100 truncate">
                            {row.name}
                          </td>

                          <td className="py-3 px-1 border-y border-transparent group-hover:border-slate-100">
                            <input
                              type="number"
                              step="0.1"
                              className="w-full text-right outline-none text-slate-900 font-extrabold text-lg bg-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 transition-all py-1 font-mono"
                              value={row.rev}
                              onChange={(e) => onPnlChange(row.id, 'rev', e.target.value)}
                            />
                          </td>

                          <td className="py-3 px-0 border-y border-transparent group-hover:border-slate-100">
                            <input
                              type="number"
                              step="0.1"
                              className="w-full text-right outline-none text-slate-600 font-bold text-lg bg-transparent focus:bg-white focus:ring-2 focus:ring-green-100 rounded px-2 transition-all py-1 font-mono"
                              value={row.gm}
                              onChange={(e) => onPnlChange(row.id, 'gm', e.target.value)}
                            />
                          </td>

                          <td className="py-3 px-2 border-y border-transparent group-hover:border-slate-100">
                            <input
                              type="number"
                              step="0.1"
                              className="w-full text-right outline-none text-slate-600 font-bold text-lg bg-transparent focus:bg-white focus:ring-2 focus:ring-amber-100 rounded px-2 transition-all py-1 font-mono"
                              value={row.fixed}
                              onChange={(e) => onPnlChange(row.id, 'fixed', e.target.value)}
                            />
                          </td>

                          <td className={`py-3 px-2 text-right font-bold text-sm border-y border-transparent group-hover:border-slate-100 font-mono ${
                            ratio >= 30 ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {ratio.toFixed(1)}%
                          </td>

                          <td className={`py-3 px-4 pr-6 text-right font-black text-lg rounded-r-xl border-y border-r border-transparent group-hover:border-slate-100 font-mono ${
                            op < 0 ? 'text-rose-500' : 'text-slate-900'
                          }`}>
                            {op.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-slate-100/80 font-bold rounded-xl">
                      <td className="py-5 px-4 pl-6 text-slate-900 rounded-l-xl text-base">Total</td>
                      <td className="py-5 px-8 text-right text-slate-900 font-mono text-lg">{total.rev.toFixed(1)}</td>
                      <td className="py-5 px-6 text-right text-slate-900 font-mono text-lg">{total.gm.toFixed(1)}</td>
                      <td className="py-5 px-8 text-right text-slate-900 font-mono text-lg">{total.fixed.toFixed(1)}</td>
                      <td className="py-5 px-2 text-right text-slate-500 font-mono text-sm">
                        {total.rev > 0 ? ((total.fixed / total.rev) * 100).toFixed(1) : '0.0'}%
                      </td>
                      <td className={`py-5 px-4 pr-6 text-right text-xl rounded-r-xl font-mono font-black ${
                        total.op < 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}>
                        {total.op.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. 최근 6개월: 생산성 및 수익성 분석 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                <span className="tracking-tight">생산성 및 수익성 분석 (최근 6개월)</span>
              </h3>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['total', 'batch', 'head'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChartViewMode(mode)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      chartViewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {mode === 'total' ? 'Total' : mode === 'batch' ? 'Batch당' : '인당'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />

                    <YAxis
                      yAxisId="left"
                      key={chartViewMode}
                      domain={['auto', 'auto']}
                      label={{
                        value: currentChartConfig.yLabel,
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 11,
                        fill: '#94a3b8'
                      }}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        if (val === 0) return '0';
                        if (Math.abs(val) < 0.05) return Number(val).toFixed(3);
                        if (Math.abs(val) < 1) return Number(val).toFixed(2);
                        return Number(val).toFixed(0);
                      }}
                    />

                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      label={{ value: '가동률 (%)', angle: 90, position: 'insideRight', fontSize: 11, fill: '#3b82f6' }}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />

                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                      formatter={(value, name) => {
                        if (name === '가동률') return [`${value}%`, name];
                        const v = Number(value);
                        const formattedVal = Math.abs(v) < 0.01 ? v.toFixed(4) : v.toFixed(2);
                        return [`₩ ${formattedVal}B`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />

                    <Bar yAxisId="left" dataKey={currentChartConfig.barKey1} name={currentChartConfig.barName1} fill="#cbd5e1" barSize={24} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey={currentChartConfig.barKey2} name={currentChartConfig.barName2} fill="#10b981" barSize={24} radius={[4, 4, 0, 0]} />

                    <Line yAxisId="right" type="monotone" dataKey="util" name="가동률" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <Activity size={32} />
                  <span className="text-sm">데이터가 충분하지 않습니다 (Archive + Prod + Headcount)</span>
                </div>
              )}
            </div>
          </div>

          {/* [New] 3. Integrated Action Tracker Summary (Chapter 6 View) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="text-purple-600" size={18}/>
                  Action Tracker Summary (Chapter 6)
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">LIVE</span>
             </div>
             
             <div className="flex flex-col lg:flex-row gap-6 items-center">
                 {/* Left: Overall Status */}
                 <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px] justify-center lg:justify-start">
                     <div className="relative w-16 h-16 shrink-0">
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="32" cy="32" r="28" className="stroke-slate-200" strokeWidth="6" fill="transparent"/>
                             <circle cx="32" cy="32" r="28" className="stroke-blue-600" strokeWidth="6" fill="transparent"
                               strokeDasharray={175.9}
                               strokeDashoffset={175.9 - (175.9 * trackerStats.rate) / 100}
                             />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-700">
                             {trackerStats.rate}%
                         </div>
                     </div>
                     <div>
                         <div className="text-sm font-bold text-slate-500">Total Issues</div>
                         <div className="text-2xl font-black text-slate-900 leading-none mb-1">
                             {trackerStats.total} <span className="text-xs font-normal text-slate-400">건</span>
                         </div>
                         <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                             {trackerStats.resolved} Resolved
                         </div>
                     </div>
                 </div>

                 {/* Right: Active Issue Breakdown by Category */}
                 <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg hover:shadow-sm transition-shadow">
                         <div className="flex items-center gap-1.5 mb-1.5 text-orange-600">
                             <DollarSign size={14}/>
                             <span className="text-[10px] font-bold uppercase">Fixed Cost</span>
                         </div>
                         <div className="text-xl font-black text-slate-800">{trackerStats.breakdown.fixed} <span className="text-[10px] text-slate-400 font-medium">Active</span></div>
                     </div>
                     <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg hover:shadow-sm transition-shadow">
                         <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600">
                             <TrendingDown size={14}/>
                             <span className="text-[10px] font-bold uppercase">Cost Cut</span>
                         </div>
                         <div className="text-xl font-black text-slate-800">{trackerStats.breakdown.cost} <span className="text-[10px] text-slate-400 font-medium">Active</span></div>
                     </div>
                     <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg hover:shadow-sm transition-shadow">
                         <div className="flex items-center gap-1.5 mb-1.5 text-blue-600">
                             <Activity size={14}/>
                             <span className="text-[10px] font-bold uppercase">Prod/Del</span>
                         </div>
                         <div className="text-xl font-black text-slate-800">{trackerStats.breakdown.prod} <span className="text-[10px] text-slate-400 font-medium">Active</span></div>
                     </div>
                     <div className="bg-slate-100/50 border border-slate-200 p-3 rounded-lg hover:shadow-sm transition-shadow">
                         <div className="flex items-center gap-1.5 mb-1.5 text-slate-600">
                             <Users size={14}/>
                             <span className="text-[10px] font-bold uppercase">HR & Org</span>
                         </div>
                         <div className="text-xl font-black text-slate-800">{trackerStats.breakdown.hr} <span className="text-[10px] text-slate-400 font-medium">Active</span></div>
                     </div>
                 </div>
             </div>
          </div>

        </div>

        {/* RIGHT: 가동률 현황 + Top10 아이템 */}
        <div className="lg:col-span-1 space-y-6">

          {/* [Modified] 가동률 현황: 높이 480px 고정 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[480px] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Factory className="text-blue-600" size={18} />
                가동률 현황 (이번 달)
              </h3>
              <Badge text={selectedMonth || '—'} tone="blue" />
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {!utilizationPanel.hasLogs ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-center p-4">
                        <AlertCircle size={24} className="mb-1" />
                        <p className="text-sm font-bold">로그 데이터 없음</p>
                        <p className="text-xs">Chapter7에서 데이터를 입력하세요.</p>
                    </div>
                </div>
                ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 shrink-0">
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-center">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">평균 가동률</p>
                            <p className="mt-1 text-3xl font-black text-slate-900">{utilizationPanel.avgUtil}%</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            분모: 전체 {utilizationPanel.totalReactors}기
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-center">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">로그 반영</p>
                            <p className="mt-1 text-3xl font-black text-slate-900">{utilizationPanel.loggedReactors}</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                            입력된 Reactor 수
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-extrabold text-slate-800">상태 분포</span>
                            <span className="text-[11px] font-bold text-slate-400">Count</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                                <span className="text-sm font-bold text-slate-700">Running</span>
                            </div>
                            <span className="text-base font-black text-slate-900">{utilizationPanel.runningCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
                                <span className="text-sm font-bold text-slate-700">Maintenance</span>
                            </div>
                            <span className="text-base font-black text-slate-900">{utilizationPanel.maintenanceCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                                <span className="text-sm font-bold text-slate-700">Idle</span>
                            </div>
                            <span className="text-base font-black text-slate-900">{utilizationPanel.idleCount}</span>
                            </div>
                        </div>
                    </div>
                </>
                )}
            </div>
          </div>

          {/* 주요 아이템 Top 10 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Package className="text-purple-600" size={18} />
                주요 아이템 (매출 Top 10)
              </h3>
              <Badge text={selectedMonth || '—'} tone="purple" />
            </div>

            {!topItemsPanel.hasData ? (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                <AlertCircle size={18} className="mt-0.5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold">이번 달 Item 매출 데이터가 없습니다.</p>
                  <p className="text-xs mt-1 leading-snug">
                    Chapter7에서 Item에 <b>quantity / price / category / name</b> 입력하면 자동 집계됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">총 Item 매출</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">₩ {topItemsPanel.totalItemRev.toFixed(2)}B</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">아이템 수</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{topItemsPanel.itemCount}</p>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Item</th>
                        <th className="px-3 py-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Cat</th>
                        <th className="px-3 py-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Rev (B)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topItemsPanel.top10.map((it, idx) => (
                        <tr key={it.name} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-sm font-bold text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-slate-400 w-5">{idx + 1}</span>
                              <span className="truncate">{it.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge text={it.cat} tone={catTone(it.cat)} />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-900">
                            {it.revB.toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-[11px] text-slate-400 leading-snug">
                  * 매출 = quantity × price (원) → B KRW로 환산하여 합산
                </p>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Chapter0_Executive;