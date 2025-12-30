import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react'; // Mail 아이콘 대신 User 사용

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState(''); // email 대신 loginId 사용
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // [핵심] Supabase는 이메일 형식이 필수이므로, ID 뒤에 가짜 도메인을 붙여줍니다.
      // 예: 사용자가 'admin' 입력 -> 실제로는 'admin@itchem.com'으로 처리
      const emailToUse = `${loginId}@itchem.com`;

      if (isSignUp) {
        // 회원가입
        const { error } = await supabase.auth.signUp({ 
          email: emailToUse, 
          password 
        });
        if (error) throw error;
        alert(`가입 완료! ID [${loginId}]로 자동 로그인됩니다.`);
      } else {
        // 로그인
        const { error } = await supabase.auth.signInWithPassword({ 
          email: emailToUse, 
          password 
        });
        if (error) throw error;
      }
    } catch (error) {
      alert("로그인 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            ITCHEM <span className="text-indigo-600">Admin</span>
          </h1>
          <p className="text-slate-500 text-sm">통합 관리 시스템 v1.0</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              Access ID
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text" // 이메일 타입 아님
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                placeholder="Enter your ID (e.g. admin)"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-slate-500 hover:text-indigo-600 font-bold underline decoration-2 underline-offset-4 transition-colors"
          >
            {isSignUp ? '계정이 있으신가요? 로그인 (Log In)' : '새 ID 만들기 (Sign Up)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;