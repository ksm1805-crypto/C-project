import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  PieChart as LucidePieChart, BarChart3, Calculator,
  TrendingUp, Activity, DollarSign, Layers,
  Factory, Package, AlertCircle, ClipboardList, CheckCircle2, Users, TrendingDown,
  RefreshCw, PlusCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- [Constants] P&L ID와 Factory Category 매핑 (기본값) ---
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

// --- [Utility] 카테고리 정규화 함수 ---
const normalizeCategory = (cat) => {
  if (!cat) return 'UNKNOWN';
  const upper = String(cat).toUpperCase().trim();
  if (upper === '신사업' || upper === 'NEW BIZ' || upper === 'NEW_BIZ') return 'NEW_BIZ';
  if (upper === '중간체' || upper === 'API') return 'API';
  return upper;
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
  const norm = normalizeCategory(cat);
  if (norm === 'OLED') return 'blue';
  if (norm === 'API') return 'emerald';
  if (norm === 'NEW_BIZ') return 'amber';
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
  crActions = [],
  onRefreshData 
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rev', direction: 'desc' });
  const [chartViewMode, setChartViewMode] = useState('batch'); 
  const [missingCategories, setMissingCategories] = useState([]); 
  const [isSyncing, setIsSyncing] = useState(false);

  const [trackerStats, setTrackerStats] = useState({
    total: 0, resolved: 0, rate: 0, breakdown: { fixed: 0, cost: 0, prod: 0, hr: 0 }
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // --- Sync Logic ---
  useEffect(() => {
    if (!pnlData || !reactorLogs) return;
    const safePnl = Array.isArray(pnlData) ? pnlData : [];
    const monthlyLogs = reactorLogs.filter(l => String(l?.month || '').slice(0, 7) === selectedMonth);
    const dbNames = safePnl.map(row => normalizeCategory(row.name));
    const logCats = new Set();
    monthlyLogs.forEach(log => {
        if(log.items) log.items.forEach(i => logCats.add(i.category || 'OLED'));
    });
    const missing = [];
    logCats.forEach(cat => {
        const norm = normalizeCategory(cat);
        if (!dbNames.includes(norm) && !Object.values(BU_ID_MAPPING).includes(norm)) {
            missing.push(cat);
        }
    });
    setMissingCategories(missing);
  }, [pnlData, reactorLogs, selectedMonth]);

  const handleSyncToSupabase = async () => {
    if (missingCategories.length === 0) return;
    setIsSyncing(true);
    try {
        const newRows = missingCategories.map(name => ({
            name: name, rev: 0, gm: 0, fixed: 0
        }));
        const { error } = await supabase.from('pnl_data').insert(newRows);
        if (error) throw error;
        alert(`${missingCategories.length}개의 신규 카테고리가 DB에 추가되었습니다.`);
        setMissingCategories([]);
        if (onRefreshData) onRefreshData();
        else window.location.reload(); 
    } catch (e) {
        console.error("Sync Error:", e);
        alert("DB 동기화 중 오류가 발생했습니다.");
    } finally {
        setIsSyncing(false);
    }
  };

  // --- Tracker Logic ---
  useEffect(() => {
    const fetchAndCalculateTracker = async () => {
      try {
        const [manualRes, sysRes] = await Promise.all([
          supabase.from('manual_actions').select('*').eq('month', selectedMonth),
          supabase.from('system_issue_states').select('*')
        ]);
        const manualActions = manualRes.data || [];
        const systemStates = {};
        (sysRes.data || []).forEach(s => { systemStates[s.sys_id] = { is_resolved: s.is_resolved, is_hidden: s.is_hidden }; });
        let issues = [];
        const addSys = (id, cat) => {
           const state = systemStates[id] || { is_resolved: false, is_hidden: false };
           if (!state.is_hidden) issues.push({ id, cat, isDone: state.is_resolved });
        };
        if (pnlData) {
            const safePnl = Array.isArray(pnlData) ? pnlData : [];
            const totalRev = safePnl.reduce((acc, cur) => acc + (cur.rev || 0), 0);
            const totalFixed = safePnl.reduce((acc, cur) => acc + (cur.fixed || 0), 0);
            const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
            if (ratio > 25) addSys('sys-fixed-1', 'fixed');
        }
        if (prodStats) {
             const target = prodStats.find(p => p.month === selectedMonth);
             if (target) {
                 if ((target.util||0) < 85) addSys(`sys-prod-util-${target.month}`, 'prod');
             }
        }
        manualActions.forEach(m => issues.push({ id: m.id, cat: m.category, isDone: m.is_done }));
        const total = issues.length;
        const resolved = issues.filter(i => i.isDone).length;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
        const breakdown = { fixed: 0, cost: 0, prod: 0, hr: 0 };
        issues.forEach(i => { if (breakdown[i.cat] !== undefined && !i.isDone) breakdown[i.cat]++; });
        setTrackerStats({ total, resolved, rate, breakdown });
      } catch (e) { console.error(e); }
    };
    if (selectedMonth) fetchAndCalculateTracker();
  }, [selectedMonth, pnlData, crActions, prodStats, headcountDB]);

  // --- P&L Calculation ---
  const calculatedData = useMemo(() => {
    const safePnl = Array.isArray(pnlData) ? [...pnlData] : []; 
    const safeLogs = Array.isArray(reactorLogs) ? reactorLogs : [];
    const monthlyLogs = safeLogs.filter(l => String(l?.month || '').slice(0, 7) === selectedMonth);
    const hasFactoryData = monthlyLogs.length > 0;
    const factoryRevenueMap = {};

    if (hasFactoryData) {
      monthlyLogs.forEach((log) => {
        if (Array.isArray(log.items)) {
          log.items.forEach((item) => {
            const normalizedCat = normalizeCategory(item.category || 'OLED');
            const revenueB = (safeNum(item.quantity) * safeNum(item.price)) / 1_000_000_000;
            factoryRevenueMap[normalizedCat] = (factoryRevenueMap[normalizedCat] || 0) + revenueB;
          });
        }
      });
    }

    missingCategories.forEach(cat => {
        safePnl.push({ id: `virtual-${cat}`, name: cat, rev: 0, gm: 0, fixed: 0, isVirtual: true });
    });

    let processedRows = safePnl.map((row) => {
      let finalRev = safeNum(row.rev);
      if (hasFactoryData) {
        let matchedRev = null;
        const rowNameNorm = normalizeCategory(row.name);
        const mappedCatById = BU_ID_MAPPING[row.id];
        if (mappedCatById && factoryRevenueMap[mappedCatById] !== undefined) {
            matchedRev = factoryRevenueMap[mappedCatById];
        }
        if (matchedRev === null) {
            if (factoryRevenueMap[rowNameNorm] !== undefined) matchedRev = factoryRevenueMap[rowNameNorm];
            else {
                const partialKey = Object.keys(factoryRevenueMap).find(key => rowNameNorm.includes(key));
                if (partialKey) matchedRev = factoryRevenueMap[partialKey];
            }
        }
        if (matchedRev !== null) finalRev = parseFloat(matchedRev.toFixed(1));
      }
      const op = safeNum(row.gm) - safeNum(row.fixed);
      return { ...row, rev: finalRev, op };
    });

    // 🔥 매출 0인 항목 숨기기 (Filter)
    processedRows = processedRows.filter(row => Math.abs(row.rev) > 0.001);

    processedRows.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const sums = processedRows.reduce((acc, cur) => ({
        rev: acc.rev + safeNum(cur.rev), gm: acc.gm + safeNum(cur.gm), fixed: acc.fixed + safeNum(cur.fixed),
      }), { rev: 0, gm: 0, fixed: 0 });

    return { rows: processedRows, total: { ...sums, op: sums.gm - sums.fixed }, hasFactoryData };
  }, [pnlData, reactorLogs, selectedMonth, sortConfig, missingCategories]);

  const { rows, total, hasFactoryData } = calculatedData;
  
  // --- Chart Data ---
  const chartData = useMemo(() => {
    if (!Array.isArray(historyData) || historyData.length === 0) return [];
    return historyData.map((hItem) => {
      const m = hItem?.month || 'Unknown';
      const pItem = (prodStats||[]).find(p => p.month === m);
      const totalBatch = pItem ? safeNum(pItem.oled)+safeNum(pItem.api)+safeNum(pItem.new_biz) : 0;
      return { 
          month: m, util: pItem?safeNum(pItem.util):0, 
          revTotal: safeNum(hItem.rev), opTotal: safeNum(hItem.totalOp),
          revPerBatch: totalBatch>0 ? safeNum(hItem.rev)/totalBatch : 0,
          opPerBatch: totalBatch>0 ? safeNum(hItem.totalOp)/totalBatch : 0 
      };
    }).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);
  }, [historyData, prodStats]);
  
  // 🔥 [오류 수정 완료] 차트 설정 객체 생성
  const getChartConfig = (mode) => {
    switch (mode) {
      case 'total':
        return { barKey1: 'revTotal', barName1: '매출 (Total)', barKey2: 'opTotal', barName2: '영업이익 (Total)', yLabel: '금액 (B KRW)' };
      case 'head':
        return { barKey1: 'revPerHead', barName1: '인당 매출', barKey2: 'opPerHead', barName2: '인당 영업이익', yLabel: '인당 금액 (B KRW)' };
      case 'batch':
      default:
        return { barKey1: 'revPerBatch', barName1: 'Batch당 매출', barKey2: 'opPerBatch', barName2: 'Batch당 영업이익', yLabel: 'Batch당 금액 (B KRW)' };
    }
  };
  const currentChartConfig = getChartConfig(chartViewMode);

  // --- Panels ---
  const utilizationPanel = useMemo(() => {
     const monthlyLogs = (reactorLogs||[]).filter(l => String(l?.month||'').slice(0,7) === selectedMonth);
     const totalReactors = reactorConfig?.length || 0;
     const hasLogs = monthlyLogs.length > 0;
     const byReactor = new Map();
     monthlyLogs.forEach(l => { if(l?.reactor_id) byReactor.set(l.reactor_id, l); });
     let sumUtil = 0, runningCount = 0, maintenanceCount = 0, idleCount = 0;
     byReactor.forEach(log => {
         sumUtil += safeNum(log.utilization);
         const status = log.status || 'Idle';
         if(status === 'Running') runningCount++; else if(status === 'Maintenance') maintenanceCount++; else idleCount++;
     });
     idleCount += Math.max(0, totalReactors - byReactor.size);
     const denom = totalReactors > 0 ? totalReactors : Math.max(1, byReactor.size);
     const avgUtil = denom > 0 ? (sumUtil / denom) : 0;
     return { totalReactors, loggedReactors: byReactor.size, avgUtil: Number(avgUtil.toFixed(1)), runningCount, maintenanceCount, idleCount, hasLogs };
  }, [reactorLogs, reactorConfig, selectedMonth]);

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
          if (!prev) { map.set(name, { name, cat, revB }); }
          else { map.set(name, { ...prev, revB: prev.revB + revB }); }
        });
      });
      const arr = Array.from(map.values()).map((x) => ({ ...x, revB: Number(x.revB.toFixed(3)) })).sort((a, b) => b.revB - a.revB);
      const top10 = arr.slice(0, 10);
      const totalItemRev = arr.reduce((acc, cur) => acc + safeNum(cur.revB), 0);
      return { hasData: monthlyLogs.length > 0, top10, totalItemRev: Number(totalItemRev.toFixed(2)), itemCount: arr.length };
  }, [reactorLogs, selectedMonth]);


  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2 mt-4 pl-1">
        <div className="flex items-center gap-2.5">
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
        {missingCategories.length > 0 && (
            <button 
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold shadow-md transition-all animate-pulse"
            >
                {isSyncing ? <RefreshCw className="animate-spin" size={14}/> : <PlusCircle size={14}/>}
                <span>신규 카테고리 {missingCategories.length}건 DB 등록</span>
            </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <DashboardCard title="매출 (ACT)" value={`₩ ${total.rev.toFixed(1)}B`} icon={DollarSign} color="blue" />
        <DashboardCard title="GM (ACT)" value={`₩ ${total.gm.toFixed(1)}B`} icon={LucidePieChart} color="emerald" />
        <DashboardCard title="고정비 (ACT)" value={`₩ ${total.fixed.toFixed(1)}B`} icon={Layers} color="amber" />
        <DashboardCard title="OP (ACT)" value={`₩ ${total.op.toFixed(2)}B`} icon={Activity} color={total.op >= 0 ? 'slate' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* P&L Table */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-[480px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calculator className="text-blue-600" size={20} />
                <span className="tracking-tight">Monthly P&L Status</span>
              </h3>
              <div className="flex gap-2">
                 <button onClick={()=>handleSort('rev')} className="text-xs px-3 py-1 bg-slate-100 rounded text-slate-600 font-bold">매출순</button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-base text-left border-separate border-spacing-y-2 table-fixed">
                  <thead>
                    <tr className="text-slate-500 text-sm font-bold bg-white sticky top-0 z-10">
                      <th className="w-[20%] pb-2">Business Unit</th>
                      <th className="w-[10%] text-right px-5 pb-2">Rev</th>
                      <th className="w-[10%] text-right px-5 pb-2">GM</th>
                      <th className="w-[10%] text-right px-5 pb-2">Fixed</th>
                      <th className="w-[10%] text-right pb-2 text-slate-400">Ratio</th>
                      <th className="w-[20%] text-right pb-2">OP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-slate-400">
                          이 달의 매출 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => {
                        const ratio = row.rev > 0 ? (safeNum(row.fixed) / safeNum(row.rev)) * 100 : 0;
                        return (
                          <tr key={row.id} className="group hover:bg-slate-50 transition-colors bg-white">
                            <td className="py-3 px-1 font-bold text-slate-800 border-b border-slate-100 flex items-center gap-2">
                              <span className="truncate">{row.name}</span>
                              {row.isVirtual && (
                                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-200 whitespace-nowrap">
                                      Unsynced
                                  </span>
                              )}
                            </td>
                            <td className="py-3 px-1 text-right border-b border-slate-100">
                              <input type="number" readOnly className="w-full text-right outline-none font-mono font-extrabold text-slate-900 bg-transparent" value={row.rev}/>
                            </td>
                            <td className="py-3 px-1 text-right border-b border-slate-100">
                              <input 
                                  type="number" step="0.1"
                                  disabled={row.isVirtual} 
                                  className={`w-full text-right outline-none font-mono font-bold bg-transparent rounded px-1 ${row.isVirtual ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 focus:bg-green-50'}`}
                                  value={row.gm}
                                  onChange={(e) => onPnlChange(row.id, 'gm', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-1 text-right border-b border-slate-100">
                              <input 
                                  type="number" step="0.1"
                                  disabled={row.isVirtual}
                                  className={`w-full text-right outline-none font-mono font-bold bg-transparent rounded px-1 ${row.isVirtual ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 focus:bg-amber-50'}`}
                                  value={row.fixed}
                                  onChange={(e) => onPnlChange(row.id, 'fixed', e.target.value)}
                              />
                            </td>
                            <td className="py-3 px-1 text-right text-xs font-mono text-slate-400 border-b border-slate-100">{ratio.toFixed(1)}%</td>
                            <td className={`py-3 px-2 text-right font-black font-mono border-b border-slate-100 ${row.op<0?'text-rose-500':'text-slate-900'}`}>{row.op.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                    {rows.length > 0 && (
                      <tr className="bg-slate-100/80 font-bold rounded-xl">
                        <td className="py-3 px-2 text-slate-900">Total</td>
                        <td className="py-3 px-5 text-right font-mono">{total.rev.toFixed(1)}</td>
                        <td className="py-3 px-5 text-right font-mono">{total.gm.toFixed(1)}</td>
                        <td className="py-3 px-6 text-right font-mono">{total.fixed.toFixed(1)}</td>
                        <td className="py-3 px-1 text-right font-mono text-xs text-slate-500">
                          {total.rev > 0 ? ((total.fixed / total.rev) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className={`py-3 px-2 text-right font-black font-mono ${total.op < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {total.op.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
          </div>
          
          {/* Chart Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                <span className="tracking-tight">생산성 및 수익성 분석 (최근 6개월)</span>
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['total', 'batch', 'head'].map((mode) => (
                  <button key={mode} onClick={() => setChartViewMode(mode)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${chartViewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{mode === 'total' ? 'Total' : mode === 'batch' ? 'Batch당' : '인당'}</button>
                ))}
              </div>
            </div>
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} label={{ value: currentChartConfig.yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(val) => val === 0 ? '0' : (Math.abs(val) < 1 ? Number(val).toFixed(2) : Number(val).toFixed(0))} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: '가동률 (%)', angle: 90, position: 'insideRight', fontSize: 11, fill: '#3b82f6' }} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} formatter={(value, name) => name === '가동률' ? [`${value}%`, name] : [`₩ ${Number(value).toFixed(2)}B`, name]} />
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

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="text-purple-600" size={18}/>
                  Action Tracker Summary (Chapter 6)
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">LIVE</span>
             </div>
             <div className="flex flex-col lg:flex-row gap-6 items-center">
                 <div className="flex items-center gap-5 bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px] justify-center lg:justify-start">
                     <div className="relative w-16 h-16 shrink-0">
                         <svg className="w-full h-full transform -rotate-90">
                             <circle cx="32" cy="32" r="28" className="stroke-slate-200" strokeWidth="6" fill="transparent"/>
                             <circle cx="32" cy="32" r="28" className="stroke-blue-600" strokeWidth="6" fill="transparent" strokeDasharray={175.9} strokeDashoffset={175.9 - (175.9 * trackerStats.rate) / 100} />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-700">{trackerStats.rate}%</div>
                     </div>
                     <div>
                         <div className="text-sm font-bold text-slate-500">Total Issues</div>
                         <div className="text-2xl font-black text-slate-900 leading-none mb-1">{trackerStats.total} <span className="text-xs font-normal text-slate-400">건</span></div>
                         <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">{trackerStats.resolved} Resolved</div>
                     </div>
                 </div>
                 <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
                     <div className="bg-orange-50/50 border border-orange-100 p-3 rounded-lg hover:shadow-sm transition-shadow"><div className="flex items-center gap-1.5 mb-1.5 text-orange-600"><DollarSign size={14}/><span className="text-[10px] font-bold uppercase">Fixed Cost</span></div><div className="text-xl font-black text-slate-800">{trackerStats.breakdown.fixed} <span className="text-[10px] text-slate-400 font-medium">Active</span></div></div>
                     <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg hover:shadow-sm transition-shadow"><div className="flex items-center gap-1.5 mb-1.5 text-emerald-600"><TrendingDown size={14}/><span className="text-[10px] font-bold uppercase">Cost Cut</span></div><div className="text-xl font-black text-slate-800">{trackerStats.breakdown.cost} <span className="text-[10px] text-slate-400 font-medium">Active</span></div></div>
                     <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg hover:shadow-sm transition-shadow"><div className="flex items-center gap-1.5 mb-1.5 text-blue-600"><Activity size={14}/><span className="text-[10px] font-bold uppercase">Prod/Del</span></div><div className="text-xl font-black text-slate-800">{trackerStats.breakdown.prod} <span className="text-[10px] text-slate-400 font-medium">Active</span></div></div>
                     <div className="bg-slate-100/50 border border-slate-200 p-3 rounded-lg hover:shadow-sm transition-shadow"><div className="flex items-center gap-1.5 mb-1.5 text-slate-600"><Users size={14}/><span className="text-[10px] font-bold uppercase">HR & Org</span></div><div className="text-xl font-black text-slate-800">{trackerStats.breakdown.hr} <span className="text-[10px] text-slate-400 font-medium">Active</span></div></div>
                 </div>
             </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-1 space-y-6">
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
                                <p className="text-[10px] text-slate-500 mt-1 font-semibold">분모: 전체 {utilizationPanel.totalReactors}기</p>
                            </div>
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-center">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">로그 반영</p>
                                <p className="mt-1 text-3xl font-black text-slate-900">{utilizationPanel.loggedReactors}</p>
                                <p className="text-[10px] text-slate-500 mt-1 font-semibold">입력된 Reactor 수</p>
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
                      <p className="text-xs mt-1 leading-snug">Chapter7에서 Item에 <b>quantity / price / category / name</b> 입력하면 자동 집계됩니다.</p>
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
                              <td className="px-3 py-2"><Badge text={it.cat} tone={catTone(it.cat)} /></td>
                              <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-900">{it.revB.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400 leading-snug">* 매출 = quantity × price (원) → B KRW로 환산하여 합산</p>
                  </>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter0_Executive;