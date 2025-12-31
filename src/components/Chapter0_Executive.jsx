import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Calculator, 
  ArrowUpDown, Calendar, ChevronRight, PieChart as PieIcon, BarChart3, ArrowLeft, Save, Loader2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

// KPI Card Component (Responsive Font Sizes)
const DashboardCard = ({ title, value, sub, trendValue, isPositiveGood = true, colorClass, barColor }) => {
  const isUp = trendValue > 0;
  const isGood = isPositiveGood ? isUp : !isUp;
  const trendColor = isGood ? 'text-green-600' : 'text-red-600';
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 relative overflow-hidden group">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor}`}></div>
      <div className="flex justify-between items-start mb-2 pl-2">
        <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</span>
        {colorClass.includes('red') ? <AlertCircle size={18} className="text-red-500"/> : 
         colorClass.includes('green') ? <CheckCircle size={18} className="text-green-500"/> :
         <div className={`w-2 h-2 rounded-full ${barColor}`}></div>}
      </div>
      <div className="pl-2">
        {/* Responsive Text Size: Mobile text-2xl, Desktop text-3xl */}
        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">{value}</h3>
        <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
          <span className={`flex items-center gap-0.5 ${trendColor} bg-slate-50 px-1.5 py-0.5 rounded`}>
            <Icon size={12} /> {Math.abs(trendValue).toFixed(1)}% (MoM)
          </span>
          <span className="text-slate-400">| {sub}</span>
        </div>
      </div>
    </div>
  );
};

const Chapter0_Executive = ({ pnlData, onPnlChange, historyData, onSaveArchive }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'rev', direction: 'desc' });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [saveMonthName, setSaveMonthName] = useState(() => new Date().toISOString().slice(0, 7)); 
  const [isSaving, setIsSaving] = useState(false); 

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleSaveClick = async () => {
    if (!saveMonthName) return;
    setIsSaving(true);
    try {
      await onSaveArchive(saveMonthName);
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedData = useMemo(() => {
    const safeData = Array.isArray(pnlData) ? pnlData : [];
    let processedRows = safeData.map(row => {
      const op = (row.gm || 0) - (row.fixed || 0);
      const prevOp = (row.prevGm || 0) - (row.prevFixed || 0);
      const opVar = op - prevOp;
      return { ...row, op, prevOp, opVar };
    });

    processedRows.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const sums = processedRows.reduce((acc, cur) => ({
      rev: acc.rev + (cur.rev || 0), prevRev: acc.prevRev + (cur.prevRev || 0),
      gm: acc.gm + (cur.gm || 0), prevGm: acc.prevGm + (cur.prevGm || 0),
      fixed: acc.fixed + (cur.fixed || 0), prevFixed: acc.prevFixed + (cur.prevFixed || 0),
    }), { rev: 0, prevRev: 0, gm: 0, prevGm: 0, fixed: 0, prevFixed: 0 });

    const totalOp = sums.gm - sums.fixed;
    const totalPrevOp = sums.prevGm - sums.prevFixed;
    
    const revTrend = sums.prevRev > 0 ? ((sums.rev - sums.prevRev) / sums.prevRev) * 100 : 0;
    const gmTrend = sums.prevGm > 0 ? ((sums.gm - sums.prevGm) / sums.prevGm) * 100 : 0;
    const fixedTrend = sums.prevFixed > 0 ? ((sums.fixed - sums.prevFixed) / sums.prevFixed) * 100 : 0;
    const opTrend = totalPrevOp !== 0 ? ((totalOp - totalPrevOp) / Math.abs(totalPrevOp)) * 100 : 0;

    const totalRow = {
      id: 'total', name: 'Total', ...sums, op: totalOp, prevOp: totalPrevOp,
      opVar: totalOp - totalPrevOp, isTotal: true
    };

    return { rows: processedRows, total: totalRow, trends: { revTrend, gmTrend, fixedTrend, opTrend } };
  }, [pnlData, sortConfig]);

  const { rows, total, trends } = calculatedData;

  const calculateHistoryTotal = (buData) => {
    if (!buData) return { rev: 0, gm: 0, fixed: 0, op: 0 };
    const sums = buData.reduce((acc, cur) => ({
      rev: acc.rev + (cur.rev || 0),
      gm: acc.gm + (cur.gm || 0),
      fixed: acc.fixed + (cur.fixed || 0),
    }), { rev: 0, gm: 0, fixed: 0 });
    return { ...sums, op: sums.gm - sums.fixed };
  };

  // --- [View: Drill-down (Archive Detail)] ---
  if (selectedMonth) {
    const historyTotal = calculateHistoryTotal(selectedMonth.bu_data);
    return (
      <div className="space-y-6 animate-fade-in bg-slate-50 min-h-screen pb-20 lg:pb-10">
        {/* Header (Responsive) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div>
            <button onClick={() => setSelectedMonth(null)} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 font-medium">
              <ArrowLeft size={16}/> Back
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
              <Calendar className="text-indigo-600"/> {selectedMonth.month} 실적 상세
            </h2>
          </div>
          <div className="flex gap-6 md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
             <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Rev</p>
                <p className="text-lg md:text-xl font-bold text-slate-800">₩ {historyTotal.rev.toFixed(1)}B</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total OP</p>
                <p className={`text-lg md:text-xl font-bold ${historyTotal.op >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                  ₩ {historyTotal.op.toFixed(2)}B
                </p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-indigo-500"/> P&L Breakdown
             </h3>
             {/* [Responsive Table] */}
             <div className="overflow-x-auto -mx-4 md:mx-0">
               <div className="min-w-[600px] px-4 md:px-0">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
                     <tr>
                       <th className="py-3 px-4 font-semibold">사업부</th>
                       <th className="py-3 px-2 text-right font-semibold">Rev (B)</th>
                       <th className="py-3 px-2 text-right font-semibold">GM (B)</th>
                       <th className="py-3 px-2 text-right font-semibold">Fixed (B)</th>
                       <th className="py-3 px-2 text-right font-semibold">Ratio</th>
                       <th className="py-3 px-4 text-right font-semibold bg-slate-100 text-slate-700">OP (B)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {selectedMonth.bu_data && selectedMonth.bu_data.map((item, idx) => {
                       const op = item.gm - item.fixed;
                       const ratio = item.rev > 0 ? (item.fixed / item.rev) * 100 : 0;
                       return (
                         <tr key={idx} className="hover:bg-slate-50/50">
                           <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                           <td className="py-3 px-2 text-right text-slate-600">{item.rev.toFixed(2)}</td>
                           <td className="py-3 px-2 text-right text-slate-600">{item.gm.toFixed(2)}</td>
                           <td className="py-3 px-2 text-right text-slate-600">{item.fixed.toFixed(2)}</td>
                           <td className={`py-3 px-2 text-right ${ratio >= 25 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                             {ratio.toFixed(0)}%
                           </td>
                           <td className={`py-3 px-4 text-right font-bold bg-slate-50/50 ${op < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                             {op.toFixed(2)}
                           </td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
           
           <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieIcon size={18}/> Cost Mix</h3>
             <div className="h-64">
               {selectedMonth.cost_details && selectedMonth.cost_details.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={selectedMonth.cost_details} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {selectedMonth.cost_details.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                     </Pie>
                     <Tooltip formatter={(val)=>`₩${val.toFixed(2)}B`}/>
                   </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="flex items-center justify-center h-full text-slate-400 text-sm">No Details</div>
               )}
             </div>
           </div>
        </div>
      </div>
    );
  }

  // --- [View: Main Dashboard] ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Top KPI Cards (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        <DashboardCard title="매출 (Act)" value={`₩ ${total.rev.toFixed(1)}B`} sub={`Prev: ${total.prevRev.toFixed(1)}B`} trendValue={trends.revTrend} colorClass="text-blue-600" barColor="bg-blue-600" />
        <DashboardCard title="GM (Act)" value={`₩ ${total.gm.toFixed(1)}B`} sub={`Prev: ${total.prevGm.toFixed(1)}B`} trendValue={trends.gmTrend} colorClass="text-green-600" barColor="bg-emerald-500" />
        <DashboardCard title="고정비 (Act)" value={`₩ ${total.fixed.toFixed(1)}B`} sub={`Prev: ${total.prevFixed.toFixed(1)}B`} trendValue={trends.fixedTrend} isPositiveGood={false} colorClass="text-amber-600" barColor="bg-amber-500" />
        <DashboardCard title="OP (Act)" value={`₩ ${total.op.toFixed(2)}B`} sub={`Prev: ${total.prevOp.toFixed(2)}B`} trendValue={trends.opTrend} colorClass={total.op > 0 ? "text-slate-600" : "text-red-600"} barColor={total.op > 0 ? "bg-slate-500" : "bg-red-500"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. P&L Table (Scrollable & Responsive) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="text-indigo-500" size={20}/> 손익 비교 (Auto-Sort)
            </h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-medium self-start sm:self-auto">
              기준: {sortConfig.key === 'rev' ? '매출' : sortConfig.key === 'op' ? 'OP' : '기타'} ({sortConfig.direction === 'desc' ? '높은순' : '낮은순'})
            </span>
          </div>
          
          {/* [Table Wrapper for Mobile Scroll] */}
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[600px] px-4 md:px-0">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-y border-slate-200 cursor-pointer select-none">
                    <th className="py-3 px-4 font-semibold w-28">사업부</th>
                    <th className="py-3 px-2 text-right font-semibold w-24 hover:bg-slate-100" onClick={() => handleSort('rev')}>
                      매출 <ArrowUpDown size={12} className="inline ml-1"/>
                    </th>
                    <th className="py-3 px-2 text-right font-semibold w-24">GM</th>
                    <th className="py-3 px-2 text-right font-semibold w-24">고정비</th>
                    <th className="py-3 px-2 text-right font-semibold w-24 text-slate-500">%</th>
                    <th className="py-3 px-4 text-right font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => handleSort('op')}>
                      Act OP <ArrowUpDown size={12} className="inline ml-1"/>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const ratio = row.rev > 0 ? (row.fixed / row.rev) * 100 : 0;
                    
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition align-top">
                        <td className="py-4 px-4 font-medium text-slate-800 pt-5">{row.name}</td>
                        
                        {/* [EDITABLE] Input Fields with better mobile touch targets */}
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-end bg-white border border-slate-200 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                            <input type="number" step="0.01" className="w-full text-right outline-none text-slate-900 font-bold bg-transparent text-sm min-w-[60px]"
                              value={row.rev} onChange={(e) => onPnlChange(row.id, 'rev', e.target.value)} />
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center justify-end bg-white border border-slate-200 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-green-500 transition-all">
                            <input type="number" step="0.01" className="w-full text-right outline-none text-slate-600 font-medium bg-transparent text-sm min-w-[60px]"
                              value={row.gm} onChange={(e) => onPnlChange(row.id, 'gm', e.target.value)} />
                          </div>
                        </td>

                        <td className="py-2 px-2">
                          <div className="flex items-center justify-end bg-white border border-slate-200 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-amber-500 transition-all">
                            <input type="number" step="0.01" className="w-full text-right outline-none text-slate-600 font-medium bg-transparent text-sm min-w-[60px]"
                              value={row.fixed} onChange={(e) => onPnlChange(row.id, 'fixed', e.target.value)} />
                          </div>
                        </td>

                        <td className={`py-4 px-2 text-right text-xs pt-6 ${ratio >= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                          {ratio.toFixed(1)}%
                        </td>

                        <td className={`py-4 px-4 text-right font-bold text-base pt-5 bg-slate-50/50 ${row.op < 0 ? 'text-red-500' : 'text-slate-800'}`}>{row.op.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Total Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    {(() => {
                      const totalRatio = total.rev > 0 ? (total.fixed / total.rev) * 100 : 0;
                      return (
                        <>
                          <td className="py-3 px-4 text-slate-900">Total</td>
                          <td className="py-3 px-2 text-right text-slate-800">{total.rev.toFixed(1)}</td>
                          <td className="py-3 px-2 text-right text-slate-800">{total.gm.toFixed(1)}</td>
                          <td className="py-3 px-2 text-right text-slate-800">{total.fixed.toFixed(1)}</td>
                          <td className="py-3 px-2 text-right text-slate-600 text-xs">{totalRatio.toFixed(1)}%</td>
                          <td className={`py-3 px-4 text-right text-lg ${total.op < 0 ? 'text-red-600' : 'text-slate-900'}`}>{total.op.toFixed(2)}</td>
                        </>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Monthly Archive & Save */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-slate-100 flex flex-col max-h-[600px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="text-slate-500" size={20}/> 아카이브
          </h3>
          
          <div className="mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
             <div className="flex gap-2">
                <input 
                  type="month" 
                  className="flex-1 text-sm border border-indigo-200 rounded-lg px-2 outline-none focus:border-indigo-500 h-10 bg-white"
                  value={saveMonthName}
                  onChange={(e) => setSaveMonthName(e.target.value)}
                />
                <button 
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="bg-indigo-600 text-white text-xs font-bold px-4 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-1 disabled:opacity-50 whitespace-nowrap min-w-[70px]"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                  {isSaving ? '저장' : '저장'}
                </button>
             </div>
             <p className="text-[10px] text-indigo-400 mt-1.5 pl-1">
               * 현재 값을 {saveMonthName} 실적으로 저장
             </p>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {(!historyData || historyData.length === 0) ? (
                <div className="text-center text-slate-400 text-sm py-10">데이터 없음</div>
            ) : (
                historyData.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedMonth(item)}
                    className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-700">{item.month}</h4>
                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">{item.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">OP {item.totalOp >= 0 ? '+' : ''}{item.totalOp.toFixed(2)}B</p>
                      <p className="text-xs text-slate-400">View Detail</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform"/>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter0_Executive;