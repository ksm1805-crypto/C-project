import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Minus, Loader2 } from 'lucide-react';

const KPICard = ({ title, value, sub = '', alert = false, loading = false }) => {
  // [Safety Check] Supabase 데이터 로딩 중일 때 sub가 undefined면 에러가 나므로 기본값 '' 처리 및 체크
  const isPositive = sub && typeof sub === 'string' && sub.includes('+');
  const isNegative = sub && typeof sub === 'string' && sub.includes('-');

  // 색상을 원색에서 무채색/딥톤으로 변경하여 전문성 강조
  const iconBg = alert ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600';
  
  // 아이콘 결정 로직
  const SubIcon = alert ? AlertCircle : (isPositive ? TrendingUp : (isNegative ? TrendingDown : Minus));

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group h-full flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          {/* 제목 */}
          <p className="text-sm font-semibold text-slate-500 tracking-tight leading-tight">{title}</p>
          
          {/* 값 (로딩 중이면 스피너 표시) */}
          {loading ? (
            <div className="h-9 flex items-center">
               <Loader2 className="animate-spin text-slate-300" size={24}/>
            </div>
          ) : (
            <h3 className="text-3xl font-bold text-slate-900 tracking-tighter leading-none">
              {value || '-'}
            </h3>
          )}
        </div>
        
        {/* 아이콘 박스 */}
        <div className={`p-2.5 rounded-md ${iconBg} transition-colors group-hover:bg-slate-800 group-hover:text-white`}>
          <SubIcon size={20} strokeWidth={2} />
        </div>
      </div>
      
      {/* 하단 정보 */}
      <div className="flex items-center gap-2">
        {loading ? (
           <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
        ) : (
           <span className={`text-sm font-medium ${alert ? 'text-slate-700' : 'text-slate-500'}`}>
             {sub || '-'}
           </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;