import React, { useState, useEffect } from 'react';

function AuthModal({ show, onClose, onLogin }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // phone | code
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone.trim() || phone.length < 11) {
      setError('请输入有效的手机号');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '发送失败');
      }
      setStep('code');
      setCountdown(60);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!code.trim() || code.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '登录失败');
      }
      const data = await res.json();
      localStorage.setItem('snapvid_token', data.token);
      onLogin(data);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-7 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-medium text-white mb-1">登录 SnapVid</h3>
        <p className="text-xs text-white/30 mb-6">手机号验证码登录，无需注册</p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/[0.1] border border-red-500/[0.15] text-red-300/80 text-xs">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-2">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                maxLength={11}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                  text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-all"
              />
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading || !phone.trim()}
              className="w-full bg-white text-gray-900 font-medium py-3 rounded-xl
                transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
                disabled:opacity-30"
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/40">验证码</label>
                <span className="text-[10px] text-white/25">{phone}</span>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="请输入6位验证码"
                maxLength={6}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3
                  text-white text-center text-lg tracking-[0.5em] placeholder-white/25
                  focus:outline-none focus:border-white/20 transition-all font-mono"
                autoFocus
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || code.length !== 6}
              className="w-full bg-white text-gray-900 font-medium py-3 rounded-xl
                transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]
                disabled:opacity-30"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                更换手机号
              </button>
              <button
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors disabled:text-white/15"
              >
                {countdown > 0 ? `${countdown}s 后重新获取` : '重新获取验证码'}
              </button>
            </div>
          </div>
        )}

        <p className="mt-5 text-[10px] text-white/15 text-center">
          登录即表示同意《用户协议》和《隐私政策》
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
