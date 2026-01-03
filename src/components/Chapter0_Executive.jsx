import React, { useMemo, useState } from 'react';
import {
  PieChart as LucidePieChart, BarChart3, Calculator,
  TrendingUp, Activity, DollarSign, Layers,
  Factory, Package, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

// --- [Constants] P&L ID와 Factory Category 매핑 ---
// 이름이 바뀌어도 ID가 1이면 OLED 매출을 가져오도록 고정합니다.
// (DB의 pnl_data 테이블 id 기준)
const BU_ID_MAPPING = {
  1: 'OLED',
  2: 'API',
  3: 'NEW_BIZ' // '신사업'
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
  reactorLogs, // App.jsx에서 내려받는 전체 로그
  reactorConfig, // App.jsx에서 내려받는 전체 설비 정보
  selectedMonth,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rev', direction: 'desc' });
  const [chartViewMode, setChartViewMode] = useState('batch'); // total | batch | head

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // =========================
  // 1) 이번 달 P&L 계산 (ID 기반 매칭 + Factory Sync)
  // =========================
  const calculatedData = useMemo(() => {
    const safePnl = Array.isArray(pnlData) ? pnlData : [];
    const safeLogs = Array.isArray(reactorLogs) ? reactorLogs : [];

    // 1. Factory Log 집계 (카테고리별)
    const monthlyLogs = safeLogs.filter(l => String(l?.month || '').slice(0, 7) === selectedMonth);
    let factoryRevenues = { 'OLED': 0, 'API': 0, 'NEW_BIZ': 0 };
    let hasFactoryData = false;

    if (monthlyLogs.length > 0) {
      hasFactoryData = true;
      monthlyLogs.forEach((log) => {
        if (Array.isArray(log.items)) {
          log.items.forEach((item) => {
            // 카테고리 정규화
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

    // 2. P&L 테이블 처리 (매칭 로직 개선)
    let processedRows = safePnl.map((row) => {
      let finalRev = safeNum(row.rev);

      if (hasFactoryData) {
        // [Logic Fix] ID 기반 매칭 우선
        const mappedCategory = BU_ID_MAPPING[row.id];
        
        if (mappedCategory && factoryRevenues[mappedCategory] !== undefined) {
           finalRev = factoryRevenues[mappedCategory];
        } else {
           // [Fallback] ID 매칭 실패 시 기존 이름 기반 매칭 (하위 호환성)
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

    // 정렬
    processedRows.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // 합계 계산
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
  // 2) 최근 6개월 생산성/수익성 분석 차트
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
  // 3) 이번 달 가동률 현황 (Props 기반)
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
  // 4) 이번 달 매출 Top 10 아이템 (Props 기반)
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
        {/* LEFT: P&L 테이블 + 6개월 분석 */}
        <div className="lg:col-span-2 space-y-6">
          {/* P&L 테이블 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
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

            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="min-w-[600px] px-4 md:px-0">
                <table className="w-full text-base text-left border-separate border-spacing-y-2 table-fixed">
                  <thead>
                    <tr className="text-slate-500 text-sm uppercase tracking-wider font-bold">
                      <th className="py-2 px-4 pl-6 w-[25%]">Business Unit</th>
                      <th className="py-2 px-2 text-right w-[10%]">Revenue</th>
                      <th className="py-2 px-6 text-right w-[10%]">GM</th>
                      <th className="py-2 px-2 text-right w-[13%]">Fixed Cost</th>
                      <th className="py-2 px-2 text-right text-slate-400 w-[10%]">Ratio</th>
                      <th className="py-2 px-4 pr-6 text-right text-slate-700 w-[20%]">OP (Act)</th>
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

          {/* 최근 6개월: 생산성 및 수익성 분석 */}
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
        </div>

        {/* RIGHT: 가동률 현황 + Top10 아이템 */}
        <div className="lg:col-span-1 space-y-6">

          {/* 가동률 현황 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Factory className="text-blue-600" size={18} />
                가동률 현황 (이번 달)
              </h3>
              <Badge text={selectedMonth || '—'} tone="blue" />
            </div>

            {!utilizationPanel.hasLogs ? (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                <AlertCircle size={18} className="mt-0.5 text-slate-400" />
                <div>
                  <p className="text-sm font-bold">이번 달 Reactor Log가 없습니다.</p>
                  <p className="text-xs mt-1 leading-snug">
                    Chapter7에서 반응기 월간 로그를 입력하면 여기서 자동 집계됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">평균 가동률</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{utilizationPanel.avgUtil}%</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                      분모: 전체 {utilizationPanel.totalReactors}기
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">로그 반영</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{utilizationPanel.loggedReactors}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                      입력된 Reactor 수
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-slate-800">상태 분포</span>
                    <span className="text-[11px] font-bold text-slate-400">Count</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-sm font-bold text-slate-700">Running</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{utilizationPanel.runningCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="text-sm font-bold text-slate-700">Maintenance</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{utilizationPanel.maintenanceCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                        <span className="text-sm font-bold text-slate-700">Idle</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{utilizationPanel.idleCount}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
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