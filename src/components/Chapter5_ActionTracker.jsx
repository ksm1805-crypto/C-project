import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Plus, Trash2, CheckCircle, Calendar,
  AlertTriangle, Activity, Users, DollarSign, TrendingDown, Loader2
} from 'lucide-react';

const SECTIONS = [
  { id: 'fixed', title: '고정비 통제 (Fixed Cost)', color: 'bg-orange-500', icon: <DollarSign size={18} />, desc: '판관비, 감가상각, 기타 고정비 이슈' },
  { id: 'cost', title: '원가절감 (Cost Reduction)', color: 'bg-emerald-500', icon: <TrendingDown size={18} />, desc: '원재료 이원화, 공정 개선, 수율 향상' },
  { id: 'prod', title: '생산/납기 (Prod & Delivery)', color: 'bg-blue-600', icon: <Activity size={18} />, desc: '가동률, OTD(납기준수), 품질 이슈' },
  { id: 'hr', title: '인력/조직 (HR & Org)', color: 'bg-slate-700', icon: <Users size={18} />, desc: '채용, 핵심인재 관리, R&R 조정' }
];

const Chapter5_ActionTracker = ({ pnlData, prodStats, crActions, depts }) => {
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [loading, setLoading] = useState(true);
  
  // [State] DB Data
  const [manualActions, setManualActions] = useState([]); 
  const [systemStates, setSystemStates] = useState({});   

  // [State] Input Form
  const [newItem, setNewItem] = useState({ 
    category: 'fixed', text: '', owner: '', due: '' 
  });

  // --- [Logic 0] Available Months (생산 데이터 기반) ---
  const availableMonths = useMemo(() => {
    if (!prodStats || prodStats.length === 0) return ['2024-12'];
    // 중복 제거 및 정렬
    const months = [...new Set(prodStats.map(p => p.month))].sort();
    return months;
  }, [prodStats]);

  // 초기 로딩 시 가장 최신 월 선택
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  // --- [Supabase Logic 1] 데이터 Fetch ---
  useEffect(() => {
    if (selectedMonth) {
      fetchData();
    }
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 선택된 월의 수기 액션 조회
      const { data: manuals, error: err1 } = await supabase
        .from('manual_actions')
        .select('*')
        .eq('month', selectedMonth)
        .order('created_at', { ascending: true });
      
      if (err1) throw err1;

      // 2. 시스템 이슈 상태 조회 (숨김/완료 여부)
      const { data: sysStates, error: err2 } = await supabase
        .from('system_issue_states')
        .select('*');
      
      if (err2) throw err2;

      const stateMap = {};
      sysStates.forEach(s => {
        stateMap[s.sys_id] = { is_resolved: s.is_resolved, is_hidden: s.is_hidden };
      });

      setManualActions(manuals || []);
      setSystemStates(stateMap);

    } catch (error) {
      console.error('Error fetching tracker data:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- [Logic 2] 데이터 병합 및 분류 (핵심 로직: 자동 이슈 감지) ---
  const categorizedItems = useMemo(() => {
    let items = [];

    // 시스템 아이템 생성 헬퍼 함수
    const createSysItem = (id, category, text, owner, risk) => {
      const state = systemStates[id] || { is_resolved: false, is_hidden: false };
      // 사용자가 숨김 처리한 항목은 제외
      if (state.is_hidden) return null;

      return {
        id, category, text, owner, risk,
        due: selectedMonth,
        isSystem: true,
        isDone: state.is_resolved
      };
    };

    // 1. [Auto] P&L 기반 고정비 이슈 (고정비 비중 25% 초과 시)
    if (pnlData) {
      const safePnl = Array.isArray(pnlData) ? pnlData : [];
      const totalRev = safePnl.reduce((acc, cur) => acc + (cur.rev || 0), 0);
      const totalFixed = safePnl.reduce((acc, cur) => acc + (cur.fixed || 0), 0);
      const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
      
      if (ratio > 25) { 
        const item = createSysItem(
          'sys-fixed-1', 
          'fixed', 
          `고정비 비중 ${ratio.toFixed(1)}%로 목표(25%) 초과`, 
          'System', 
          'High'
        );
        if (item) items.push(item);
      }
    }

    // 2. [Auto] 원가절감 리스크 (상태가 '리스크'이거나 '지연'인 항목)
    if (crActions) {
      crActions.forEach(a => {
        if (a.status === '리스크' || a.status === '지연') {
          const item = createSysItem(
            `sys-cr-${a.id}`, 
            'cost', 
            `${a.item}: ${a.action} (${a.status})`, 
            'System', 
            'High'
          );
          if (item) items.push(item);
        }
      });
    }

    // 3. [Auto] 생산/납기/품질 이슈 (선택된 월 기준)
    if (prodStats && prodStats.length > 0) {
      const targetStat = prodStats.find(p => p.month === selectedMonth);
      
      if (targetStat) {
        const totalBatch = (targetStat.oled || 0) + (targetStat.api || 0) + (targetStat.new_biz || targetStat.newBiz || 0);
        
        // (1) 납기 준수율 (OTD) < 95%
        const otd = totalBatch > 0 ? ((totalBatch - (targetStat.late || 0)) / totalBatch) * 100 : 100;
        if (otd < 95) {
           const item = createSysItem(
             `sys-prod-otd-${targetStat.month}`, 
             'prod', 
             `${targetStat.month} 납기 준수율 ${otd.toFixed(1)}% (목표 95% 미달)`, 
             '생산팀', 
             'High'
           );
           if (item) items.push(item);
        }

        // (2) 가동률 (Util) < 85%
        if ((targetStat.util || 0) < 85) {
           const item = createSysItem(
             `sys-prod-util-${targetStat.month}`, 
             'prod', 
             `${targetStat.month} 가동률 ${targetStat.util}% (목표 85% 미달)`, 
             '생산팀', 
             'Medium'
           );
           if (item) items.push(item);
        }

        // (3) 불량률 (Defect) > 5%
        const defectCount = (targetStat.defect || 0) + (targetStat.rework || 0);
        const defectRate = totalBatch > 0 ? (defectCount / totalBatch) * 100 : 0;
        if (defectRate > 5) {
            const item = createSysItem(
                `sys-prod-defect-${targetStat.month}`,
                'prod',
                `[품질] ${targetStat.month} 불량률 ${defectRate.toFixed(1)}% (목표 5% 초과)`,
                '품질팀',
                'High'
            );
            if (item) items.push(item);
        }
      }
    }

    // 4. [Auto] 인력 이슈 (HR 부서원 상태 체크)
    if (depts) {
      depts.forEach(dept => {
        dept.members.forEach(m => {
          if (m.status === '지연' || m.status === '리스크') {
            const item = createSysItem(
              `sys-hr-${m.id}`, 
              'hr', 
              `[${dept.name}] ${m.name}: ${m.task} 지연`, 
              'HR', 
              'Medium'
            );
            if (item) items.push(item);
          }
        });
      });
    }

    // 5. [Manual] 수기 입력 데이터 병합
    const manualItems = manualActions.map(m => ({
      ...m,
      due: m.due_date,
      isDone: m.is_done,
      isSystem: false
    }));
    items = [...items, ...manualItems];

    // 6. 카테고리별 분류
    const grouped = { fixed: [], cost: [], prod: [], hr: [] };
    items.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }, [pnlData, prodStats, crActions, depts, manualActions, systemStates, selectedMonth]);

  // --- [Supabase Handlers] ---

  const handleAddItem = async () => {
    if (!newItem.text) return;

    const payload = {
      category: newItem.category,
      month: selectedMonth,
      text: newItem.text,
      owner: newItem.owner,
      due_date: newItem.due,
      is_done: false
    };

    try {
      const { data, error } = await supabase.from('manual_actions').insert([payload]).select();
      if (error) throw error;
      setManualActions(prev => [...prev, data[0]]);
      setNewItem({ ...newItem, text: '', owner: '' });
    } catch (e) {
      console.error("Add failed", e);
      alert("추가 실패");
    }
  };

  const handleDelete = async (id, isSystem) => {
    const msg = isSystem ? '이 시스템 항목을 목록에서 숨기시겠습니까?' : '이 항목을 삭제하시겠습니까?';
    if (!window.confirm(msg)) return;

    try {
      if (isSystem) {
        // 시스템 이슈는 '삭제'가 아니라 '숨김' 처리
        const { error } = await supabase
          .from('system_issue_states')
          .upsert({ 
            sys_id: id, 
            is_hidden: true,
            is_resolved: systemStates[id]?.is_resolved || false 
          });
        
        if (error) throw error;

        setSystemStates(prev => ({
          ...prev,
          [id]: { ...prev[id], is_hidden: true }
        }));

      } else {
        // 수기 이슈는 실제 삭제
        const { error } = await supabase.from('manual_actions').delete().eq('id', id);
        if (error) throw error;
        setManualActions(prev => prev.filter(m => m.id !== id));
      }
    } catch (e) {
      console.error("Delete failed", e);
      alert("삭제 실패");
    }
  };

  const toggleDone = async (id, isSystem) => {
    try {
      let currentDone = false;
      if (isSystem) {
        currentDone = systemStates[id]?.is_resolved || false;
      } else {
        currentDone = manualActions.find(m => m.id === id)?.is_done || false;
      }
      
      const newDone = !currentDone;

      if (isSystem) {
        const { error } = await supabase
          .from('system_issue_states')
          .upsert({ 
            sys_id: id, 
            is_resolved: newDone,
            is_hidden: systemStates[id]?.is_hidden || false
          });
        if (error) throw error;

        setSystemStates(prev => ({
          ...prev,
          [id]: { ...prev[id], is_resolved: newDone }
        }));

      } else {
        const { error } = await supabase
          .from('manual_actions')
          .update({ is_done: newDone })
          .eq('id', id);
        if (error) throw error;

        setManualActions(prev => prev.map(m => 
          m.id === id ? { ...m, is_done: newDone, is_done: newDone } : m 
        ));
      }
    } catch (e) {
      console.error("Toggle failed", e);
      alert("상태 변경 실패");
    }
  };

  const totalItems = Object.values(categorizedItems).flat();
  const doneCount = totalItems.filter(i => i.isDone).length;
  const progress = totalItems.length > 0 ? Math.round((doneCount / totalItems.length) * 100) : 0;

  if (loading && manualActions.length === 0) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col pb-20 lg:pb-10">
      
      {/* 1. Header & Controls (Responsive) */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div className="w-full xl:w-auto">
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Activity className="text-blue-600"/> Monthly Action Plan Matrix
           </h2>
           <p className="text-sm text-slate-500 mt-1">4대 핵심 영역별 이슈 및 액션 아이템 통합 관리</p>
        </div>
        
        {/* [Responsive Input Form] 모바일: 세로, PC: 가로 */}
        <div className="w-full xl:w-auto bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-2">
            <select 
              className="px-2 py-2 rounded border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              <option value="fixed">고정비</option>
              <option value="cost">원가절감</option>
              <option value="prod">생산/납기</option>
              <option value="hr">인력/조직</option>
            </select>
            <input 
              className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500"
              placeholder="새로운 액션 아이템 입력..."
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-2">
              <input 
                className="w-20 md:w-24 px-2 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500"
                placeholder="담당자"
                value={newItem.owner}
                onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })}
              />
              <input 
                type="date"
                className="flex-1 md:w-32 px-2 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500 text-slate-500"
                value={newItem.due}
                onChange={(e) => setNewItem({ ...newItem, due: e.target.value })}
              />
              <button onClick={handleAddItem} className="bg-slate-800 text-white px-4 rounded hover:bg-slate-700 transition flex items-center justify-center shrink-0">
                <Plus size={18}/>
              </button>
            </div>
        </div>
      </div>

      {/* 2. Month Selector & Progress (Responsive) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end px-1 gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-2 text-slate-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200 w-full sm:w-auto">
           <Calendar size={14}/>
           <span className="text-sm font-bold mr-1">조회 월:</span>
           <select 
              className="text-sm font-bold text-blue-600 bg-transparent outline-none cursor-pointer flex-1"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
           >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m} 월</option>
              ))}
           </select>
        </div>

        {/* Progress Bar */}
        <div className="w-full sm:w-auto text-right">
           <div className="text-xs text-slate-500 mb-1 hidden sm:block">Total Completion Rate</div>
           <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
           </div>
        </div>
      </div>

      {/* 3. The Matrix Grid (Responsive) */}
      {/* 모바일: 1열, PC: 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 flex-1 min-h-[600px]">
        {SECTIONS.map((section) => {
          const items = categorizedItems[section.id];
          return (
            <div key={section.id} className="flex flex-col rounded-lg shadow-sm overflow-hidden border border-slate-200 bg-white h-full min-h-[300px]">
              <div className={`${section.color} px-5 py-3 flex justify-between items-center`}>
                <div className="flex items-center gap-2 text-white">
                  {section.icon}
                  <h3 className="font-bold text-base tracking-tight">{section.title}</h3>
                </div>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length} 건
                </span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto bg-slate-50/30 max-h-[400px] lg:max-h-none">
                 {items.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 gap-2">
                     <CheckCircle size={32}/>
                     <span className="text-sm">No Active Issues</span>
                   </div>
                 ) : (
                   <ul className="space-y-3">
                     {items.map((item) => (
                       <li key={item.id} className={`group relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all
                         ${item.isDone ? 'border-slate-100 opacity-60' : 'border-slate-200'}
                         ${item.risk === 'High' && !item.isDone ? 'border-l-4 border-l-red-500' : ''}
                       `}>
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex items-start gap-2 pr-6">
                              <button 
                                onClick={() => toggleDone(item.id, item.isSystem)} 
                                className={`mt-0.5 min-w-[16px] h-4 rounded border flex items-center justify-center transition
                                  ${item.isDone ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 hover:border-blue-500'}`}
                              >
                                {item.isDone && <CheckCircle size={12}/>}
                              </button>
                              <span className={`text-sm font-medium leading-snug ${item.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {item.text}
                              </span>
                           </div>
                           <button 
                             onClick={() => handleDelete(item.id, item.isSystem)} 
                             className="text-slate-300 hover:text-red-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition absolute top-3 right-3"
                             title={item.isSystem ? "목록에서 숨기기" : "삭제"}
                           >
                             <Trash2 size={14}/>
                           </button>
                         </div>
                         <div className="flex items-center gap-3 pl-6 mt-2 text-xs text-slate-400">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                               {item.owner}
                            </span>
                            <span>Due: {item.due || 'TBD'}</span>
                            {item.isSystem && (
                                <span className="flex items-center gap-1 text-amber-600 font-bold ml-auto text-[10px] bg-amber-50 px-1 rounded">
                                    <AlertTriangle size={10}/> AUTO
                                </span>
                            )}
                         </div>
                       </li>
                     ))}
                   </ul>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Chapter5_ActionTracker;