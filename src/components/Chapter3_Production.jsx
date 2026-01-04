import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart
} from 'recharts';
import {
  Factory, CheckCircle, Calendar, AlertTriangle, TrendingUp, Activity, BarChart3, Ban, Link as LinkIcon,
  X, Package
} from 'lucide-react';

// --- [Utility] 데이터 안정성 헬퍼 ---
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const toB = (krw) => num(krw) / 1_000_000_000;

const normalizeCategory = (c) => {
  const s = String(c || '').trim();
  if (!s) return 'Etc';
  const upper = s.toUpperCase();
  if (upper === 'OLED' || upper === 'OLED 소재') return 'OLED';
  if (upper === 'API' || upper === 'API/중간체' || upper === '중간체') return 'API';
  if (upper === '신사업' || upper === 'NEW' || upper === 'NEW_BIZ') return '신사업';
  return s; 
};

const getCategoryColor = (cat) => {
  const upper = String(cat).toUpperCase();
  if (upper === 'OLED') return 'text-blue-600';
  if (upper === 'API') return 'text-emerald-600';
  if (upper === '신사업') return 'text-amber-600';
  return 'text-purple-600'; 
};

const toneByCat = (cat) => {
  const upper = String(cat).toUpperCase();
  if (upper === 'OLED') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (upper === 'API') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (upper === '신사업') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-purple-50 text-purple-700 border-purple-200';
};

// --- [Data: Weekly Checklist] ---
const WEEKLY_CHECKLIST = [
  { week: 'Week 1', title: '계획 확정 & 병목 체크', desc: '수주/납기/생산계획 확정 (제품 믹스 포함)', done: true },
  { week: 'Week 2', title: '수율/불량 & CAPA 분석', desc: 'Top 3 원인분석 + 재작업 비용 가시화', done: false },
  { week: 'Week 3', title: '매출 인식 & 재고 점검', desc: 'Backlog 관리 + 완제품/재공 재고 확인', done: false },
  { week: 'Week 4', title: 'KPI 리뷰 & 차월 계획', desc: 'Plan vs Act 분석 + 차월 고정비 액션 확정', done: false },
];

const Badge = ({ children, tone }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${tone || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
    {children}
  </span>
);

const Modal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-slate-700" />
              <h3 className="text-sm font-black text-slate-800">{title}</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200/60 transition"><X size={18} className="text-slate-600" /></button>
          </div>
          <div className="p-5 max-h-[70vh] overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

// 🔥 [핵심] DB 데이터(props)만 사용하여 원본 로직을 재구현
const Chapter3_Production = ({
  historyData, pnlData, prodStats, onUpdateStats,
  selectedMonth, onMonthChange,
  reactorLogs = [],    // App.jsx에서 내려주는 DB 데이터 (필수)
  reactorConfig = []   // App.jsx에서 내려주는 DB 데이터 (필수)
}) => {
  const [tasks, setTasks] = useState(WEEKLY_CHECKLIST);

  // 아이템 상세 모달 상태
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMonth, setDetailMonth] = useState('');
  const [detailBU, setDetailBU] = useState('OLED');
  const [detailRows, setDetailRows] = useState([]);

  // --- [Logic 1] DB 데이터(reactorLogs)를 가공하여 Linked Data 생성 (LocalStorage 대체) ---
  const linkedData = useMemo(() => {
    // 1. 월별로 그룹화하기 위한 맵 초기화
    const monthlyMap = {};
    
    // 현재 총 반응기 수 (가동률 분모용)
    const totalReactorCount = reactorConfig.length > 0 ? reactorConfig.length : 0;

    // 2. 로그 데이터 순회하며 집계
    reactorLogs.forEach(log => {
      const ym = String(log.month).slice(0, 7);
      if (!monthlyMap[ym]) {
        monthlyMap[ym] = { utilSum: 0, totalBatch: 0, breakdown: {} };
      }

      // 가동률 합산
      if (num(log.utilization) > 0) {
        monthlyMap[ym].utilSum += num(log.utilization);
      }

      // Batch Count 집계 (아이템 개수 = Batch 수)
      if (Array.isArray(log.items)) {
        log.items.forEach(item => {
          // 카테고리 정규화 (OLED, API, 신사업, 기타...)
          const catName = normalizeCategory(item?.category);
          
          if (!monthlyMap[ym].breakdown[catName]) {
            monthlyMap[ym].breakdown[catName] = 0;
          }
          monthlyMap[ym].breakdown[catName] += 1;
          monthlyMap[ym].totalBatch += 1;
        });
      }
    });

    // 3. 최종 데이터 포맷팅
    const formatted = {};
    Object.keys(monthlyMap).forEach(ym => {
      const d = monthlyMap[ym];
      // 평균 가동률 계산
      const avgUtil = totalReactorCount > 0 ? (d.utilSum / totalReactorCount).toFixed(1) : 0;
      
      formatted[ym] = {
        util: avgUtil,
        totalBatch: d.totalBatch,
        oled: d.breakdown['OLED'] || 0,
        api: d.breakdown['API'] || 0,
        new_biz: d.breakdown['신사업'] || 0,
        breakdown: d.breakdown, // 상세 내역 보존 (동적 카테고리용)
        hasData: true
      };
    });

    return formatted;
  }, [reactorLogs, reactorConfig]); 

  // --- [Data Merging] ProdStats(수기/DB) + LinkedData(자동집계) ---
  const mergedData = useMemo(() => {
    const allMonths = new Set([
      ...(prodStats || []).map(d => d.month),
      ...(historyData || []).map(d => d.month),
      ...Object.keys(linkedData)
    ]);
    if (selectedMonth) allMonths.add(selectedMonth);

    const sortedMonths = Array.from(allMonths).filter(Boolean).sort();

    const fullData = sortedMonths.map(month => {
      const stat = (prodStats || []).find(p => p.month === month);
      const linked = linkedData[month];

      // 차트 및 KPI용 데이터 (Linked 우선, 없으면 Stat)
      const cleanStat = {
        oled: linked?.hasData ? num(linked.oled) : num(stat?.oled),
        api: linked?.hasData ? num(linked.api) : num(stat?.api),
        new_biz: linked?.hasData ? num(linked.new_biz) : num(stat?.new_biz),
        util: linked?.hasData ? num(linked.util) : num(stat?.util),

        late: num(stat?.late),
        defect: num(stat?.defect),
        rework: num(stat?.rework),
      };

      const fin = (historyData || []).find(h => h.month === month);
      const rev = fin ? num(fin.rev) : 0;

      // 전체 Batch 수
      const totalBatch = linked?.hasData 
        ? linked.totalBatch 
        : (cleanStat.oled + cleanStat.api + cleanStat.new_biz);

      const otd = totalBatch > 0 ? ((totalBatch - cleanStat.late) / totalBatch) * 100 : 0;
      const defectRate = totalBatch > 0 ? ((cleanStat.defect + cleanStat.rework) / totalBatch) * 100 : 0;
      const revPerBatch = totalBatch > 0 ? (rev / totalBatch) : 0;

      return {
        month,
        ...cleanStat,
        totalBatch,
        revenue: rev,
        revPerBatch,
        otd,
        defectRate,
        isLinked: linked?.hasData,
        breakdown: linked?.breakdown || {} // 동적 카테고리 정보 전달
      };
    });

    return fullData.slice(-6);
  }, [prodStats, historyData, linkedData, selectedMonth]);

  const currentStat = mergedData.find(d => d.month === selectedMonth) || { isLinked: false, breakdown: {} };

  // --- [Charts Data] 사업부별 상세 분석 ---
  const buAnalysisData = useMemo(() => {
    const safePnl = Array.isArray(pnlData) ? pnlData : [];

    // Revenue 매칭 함수
    const findRev = (catName) => {
        const upper = String(catName).toUpperCase();
        if (upper === 'OLED') return safePnl.find(p => p.id === 1)?.rev || 0;
        if (upper === 'API') return safePnl.find(p => p.id === 2)?.rev || 0;
        if (upper === '신사업' || upper === 'NEW') return safePnl.find(p => p.id === 3)?.rev || 0;
        // 동적 매칭
        const found = safePnl.find(p => (p.name || '').toUpperCase().includes(upper));
        return found ? found.rev : 0;
    };

    if (currentStat.isLinked && currentStat.breakdown) {
        // [동적 모드] breakdown의 모든 키를 순회하여 차트 데이터 생성
        const keys = Object.keys(currentStat.breakdown);
        const priority = ['OLED', 'API', '신사업'];
        
        // 정렬: 주요 3개 먼저
        keys.sort((a, b) => {
             const idxA = priority.indexOf(a);
             const idxB = priority.indexOf(b);
             if (idxA !== -1 && idxB !== -1) return idxA - idxB;
             if (idxA !== -1) return -1;
             if (idxB !== -1) return 1;
             return a.localeCompare(b);
        });

        return keys.map(cat => {
            const batchCount = num(currentStat.breakdown[cat]);
            const revenue = findRev(cat);
            return {
                name: cat,
                batch: batchCount,
                rev: revenue,
                eff: batchCount > 0 ? (revenue / batchCount) : 0
            };
        });
    } else {
        // [수동 모드 Fallback]
        return [
          { name: 'OLED', batch: num(currentStat.oled), rev: findRev('OLED') },
          { name: 'API', batch: num(currentStat.api), rev: findRev('API') },
          { name: '신사업', batch: num(currentStat.new_biz), rev: findRev('신사업') },
        ].map(item => ({
          ...item,
          eff: item.batch > 0 ? (item.rev / item.batch) : 0
        }));
    }
  }, [pnlData, currentStat]);

  // --- [Handlers] ---
  const handleInputChange = (field, value) => {
    // Linked 상태일 때는 자동 집계 필드는 수정 불가
    if (currentStat.isLinked && ['util', 'oled', 'api', 'new_biz'].includes(field)) return;

    const numVal = value === '' ? 0 : parseFloat(value);
    const exists = (prodStats || []).find(item => item.month === selectedMonth);
    let updatedStats;

    if (exists) {
      updatedStats = (prodStats || []).map(item =>
        item.month === selectedMonth ? { ...item, [field]: numVal } : item
      );
    } else {
      const newEntry = {
        month: selectedMonth,
        oled: 0, api: 0, new_biz: 0, late: 0, util: 0,
        defect: 0, rework: 0,
        [field]: numVal
      };
      updatedStats = [...(prodStats || []), newEntry].sort((a, b) => a.month.localeCompare(b.month));
    }
    onUpdateStats(updatedStats);
  };

  const toggleTask = (idx) => {
    const newTasks = [...tasks];
    newTasks[idx].done = !newTasks[idx].done;
    setTasks(newTasks);
  };

  const handleTaskTextChange = (idx, field, value) => {
    const newTasks = [...tasks];
    newTasks[idx][field] = value;
    setTasks(newTasks);
  };

  const openBatchDetail = (month, bu) => {
    // LocalStorage가 아닌 reactorLogs(DB props)에서 필터링
    const monthLogs = reactorLogs.filter(l => String(l?.month || '').slice(0, 7) === String(month).slice(0, 7));
    const items = [];

    monthLogs.forEach(log => {
      if (!Array.isArray(log.items)) return;
      log.items.forEach(it => {
        const normalized = normalizeCategory(it.category);
        if (normalized !== bu) return; 

        items.push({
          name: String(it.name || '').trim() || '(No name)',
          category: normalized,
          quantity: num(it.quantity),
          price: num(it.price),
          revenueB: toB(num(it.quantity) * num(it.price)),
          reactor_id: log.reactor_id ?? '-',
          status: log.status ?? '-',
        });
      });
    });

    // 아이템명 기준으로 집계 (동일 제품 합산)
    const map = new Map();
    items.forEach(x => {
      const key = x.name;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { ...x, batches: 1, qtySum: x.quantity });
      } else {
        map.set(key, {
          ...prev,
          batches: prev.batches + 1,
          qtySum: prev.qtySum + x.quantity,
          revenueB: prev.revenueB + x.revenueB,
        });
      }
    });

    const rows = Array.from(map.values())
      .map(r => ({
        ...r,
        revenueB: Number(r.revenueB.toFixed(4)),
        qtySum: Number(r.qtySum.toFixed(2)),
      }))
      .sort((a, b) => b.revenueB - a.revenueB);

    setDetailMonth(String(month).slice(0, 7));
    setDetailBU(bu);
    setDetailRows(rows);
    setDetailOpen(true);
  };

  // --- [Logic: Display Items for Batch Card] ---
  const batchDisplayItems = useMemo(() => {
    if (currentStat.isLinked) {
      const breakdown = currentStat.breakdown || {};
      const keys = Object.keys(breakdown);
      const priority = ['OLED', 'API', '신사업'];
      keys.sort((a, b) => {
        const idxA = priority.indexOf(a);
        const idxB = priority.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      return keys.map(key => ({
        label: key,
        field: key,
        val: breakdown[key],
        color: getCategoryColor(key),
        bu: key,
        isDynamic: !priority.includes(key)
      }));
    } else {
      return [
        { label: 'OLED', field: 'oled', val: currentStat.oled, color: 'text-blue-600', bu: 'OLED' },
        { label: 'API', field: 'api', val: currentStat.api, color: 'text-emerald-600', bu: 'API' },
        { label: '신사업', field: 'new_biz', val: currentStat.new_biz, color: 'text-amber-600', bu: '신사업' }
      ];
    }
  }, [currentStat]);


  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="text-blue-600" /> 생산·매출 연동 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            공장 Layout 데이터(DB)와 연동되어 생산 지표를 자동으로 모니터링합니다.
          </p>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in">
        
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* 설비 가동률 */}
          <div className={`bg-white p-5 rounded-lg shadow-sm border border-slate-200 group focus-within:ring-2 ring-blue-500 transition-all ${currentStat.isLinked ? 'bg-slate-50' : ''}`}>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                설비 가동률
                {currentStat.isLinked && <LinkIcon size={12} className="text-emerald-500" title="Linked to Factory DB" />}
              </span>
              <Activity size={16} className="text-blue-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <input
                type="number"
                readOnly={currentStat.isLinked}
                className={`text-3xl font-extrabold text-slate-900 w-24 bg-transparent outline-none p-0 ${currentStat.isLinked ? 'cursor-default' : 'border-b border-dashed border-slate-300 focus:border-blue-500'}`}
                value={currentStat.util || 0}
                onChange={(e) => handleInputChange('util', e.target.value)}
              />
              <span className="text-sm font-bold text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Avg. Util of All Reactors</p>
          </div>

          {/* 월 생산 Batch (Dynamic Rendering) */}
          <div className={`md:col-span-2 lg:col-span-2 bg-white p-5 rounded-lg shadow-sm border border-slate-200 ${currentStat.isLinked ? 'bg-slate-50' : ''}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                <Factory size={16} className="text-blue-500" /> 월 생산 Batch ({selectedMonth})
                {currentStat.isLinked && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <LinkIcon size={10} /> Live Sync
                  </span>
                )}
              </h3>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                Total: {currentStat.totalBatch || 0}
              </span>
            </div>

            {/* Dynamic Grid based on categories */}
            <div className={`grid gap-4 ${batchDisplayItems.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {batchDisplayItems.map((item) => (
                <div key={item.field} className="flex flex-col">
                  <label className="text-xs font-bold text-slate-400 mb-1 truncate" title={item.label}>
                    {item.label}
                  </label>

                  {currentStat.isLinked ? (
                    <button
                      type="button"
                      onClick={() => openBatchDetail(selectedMonth, item.bu)}
                      className={`w-full text-left text-xl font-black outline-none bg-transparent ${item.color} hover:underline truncate`}
                      title={`${item.label} 상세 보기`}
                    >
                      {item.val || 0}
                    </button>
                  ) : (
                    <input
                      type="number"
                      readOnly={currentStat.isLinked}
                      className={`w-full text-xl font-bold outline-none bg-transparent ${item.color} ${currentStat.isLinked ? 'cursor-default' : 'border-b border-slate-200 focus:border-blue-500'}`}
                      value={item.val || 0}
                      onChange={(e) => handleInputChange(item.field, e.target.value)}
                    />
                  )}

                  {currentStat.isLinked && (
                    <span className="mt-1 text-[10px] text-slate-400 font-bold">See items</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* OTD */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden">
            <div className={`absolute top-0 left-0 bottom-0 w-1 ${currentStat.otd >= 95 ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="flex justify-between mb-2 pl-2">
              <span className="text-xs font-bold text-slate-500 uppercase">납기 준수율 (OTD)</span>
              {currentStat.otd >= 95 ? <CheckCircle size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-red-500" />}
            </div>
            <div className="pl-2">
              <h3 className={`text-3xl font-extrabold ${currentStat.otd >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                {(currentStat.otd || 0).toFixed(1)}%
              </h3>
              <div className="flex items-center gap-2 mt-2 bg-slate-50 p-1.5 rounded-lg">
                <span className="text-xs text-slate-500">지연:</span>
                <input
                  type="number" className="w-12 text-right text-sm font-bold bg-white border border-slate-300 rounded focus:border-red-500 outline-none px-1"
                  value={currentStat.late || 0} onChange={(e) => handleInputChange('late', e.target.value)}
                />
                <span className="text-xs text-slate-400">Batch</span>
              </div>
            </div>
          </div>

          {/* 불량률 */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden group focus-within:ring-2 ring-amber-500 transition-all">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500"></div>
            <div className="flex justify-between mb-2 pl-2">
              <span className="text-xs font-bold text-slate-500 uppercase">품질 불량률</span>
              <Ban size={16} className="text-amber-500" />
            </div>
            <div className="pl-2">
              <h3 className={`text-3xl font-extrabold ${(currentStat.defectRate || 0) > 5 ? 'text-red-600' : 'text-slate-800'}`}>
                {(currentStat.defectRate || 0).toFixed(1)}%
              </h3>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">불량 (Lot)</span>
                  <input
                    type="number"
                    className="text-right text-sm font-bold border-b border-slate-200 outline-none focus:border-amber-500 bg-transparent"
                    value={currentStat.defect || 0}
                    onChange={(e) => handleInputChange('defect', e.target.value)}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">재작업 (Lot)</span>
                  <input
                    type="number"
                    className="text-right text-sm font-bold border-b border-slate-200 outline-none focus:border-amber-500 bg-transparent"
                    value={currentStat.rework || 0}
                    onChange={(e) => handleInputChange('rework', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 사업부별 생산 효율성 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-500" /> 사업부별 생산 효율성</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buAnalysisData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }} barGap={0}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                  <YAxis yAxisId="left" label={{ value: 'Batch 수', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Rev/Batch', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="batch" name="생산량(좌)" fill="#3B82F6" barSize={30} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="eff" name="Batch당 매출(우)" fill="#F97316" barSize={30} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 운영 KPI 트렌드 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> 운영 KPI 트렌드 (최근 6개월)</span>
              <Badge tone="bg-slate-100 text-slate-700 border-slate-200">Rev/Batch + Util + OTD + Defect</Badge>
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mergedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />

                  {/* left: Rev/Batch (B KRW) */}
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                    label={{ value: 'Rev/Batch (B)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                  />

                  {/* right: % metrics */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                    domain={[0, 100]}
                    label={{ value: '% (Util/OTD/Defect)', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }}
                  />

                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    formatter={(value, name) => {
                      if (name === 'Rev/Batch') return [`₩ ${Number(value).toFixed(2)}B`, name];
                      return [`${Number(value).toFixed(1)}%`, name];
                    }}
                  />
                  <Legend />

                  <Bar yAxisId="left" dataKey="revPerBatch" name="Rev/Batch" fill="#cbd5e1" barSize={30} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="util" name="Util" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="otd" name="OTD" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="defectRate" name="Defect" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-[11px] text-slate-400 leading-snug">
              * 기존 “생산 vs 매출” 대신, 운영 레버(가동률/납기/품질)와 결과(Rev/Batch)를 같은 화면에서 추적합니다.
            </p>
          </div>
        </div>

        {/* Weekly Checklist */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-orange-500" /> {selectedMonth} 운영 리듬 체크
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border transition-all flex flex-col gap-2 ${task.done
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-100 hover:border-blue-300'
                  }`}
              >
                <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => toggleTask(idx)}>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {task.week}
                  </span>
                  {task.done ? <CheckCircle size={16} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border border-slate-300"></div>}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    className={`w-full text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-slate-300 pb-0.5 ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                    value={task.title}
                    onChange={(e) => handleTaskTextChange(idx, 'title', e.target.value)}
                  />
                  <textarea
                    className={`w-full text-xs mt-1 bg-transparent outline-none resize-none h-12 ${task.done ? 'text-slate-300' : 'text-slate-500'}`}
                    value={task.desc}
                    onChange={(e) => handleTaskTextChange(idx, 'desc', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 아이템 상세 모달 */}
        <Modal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          title={`${detailMonth} • ${detailBU} 생산 아이템 목록 (DB Link)`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge tone={toneByCat(detailBU)}>{detailBU}</Badge>
            <span className="text-[11px] text-slate-400 font-bold">
              * DB (reactor_logs) 기반 실시간 집계
            </span>
          </div>

          {detailRows.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-bold">
              해당 월/사업부의 아이템 로그가 없습니다. (Chapter7에서 확인)
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase">Item</th>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase text-right">Batches</th>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase text-right">Qty Sum</th>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 uppercase text-right">Revenue (B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailRows.map((r) => (
                    <tr key={r.name} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm font-bold text-slate-800">{r.name}</td>
                      <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-900">{r.batches}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">{r.qtySum}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{r.revenueB.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Chapter3_Production;