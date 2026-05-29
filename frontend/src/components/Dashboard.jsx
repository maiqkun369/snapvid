import React, { useState, useEffect } from 'react';
import TaskCenter from './dashboard/TaskCenter.jsx';
import HistoryPanel from './dashboard/HistoryPanel.jsx';
import Toolbox from './dashboard/Toolbox.jsx';
import AccountPanel from './dashboard/AccountPanel.jsx';
import SchedulePanel from './dashboard/SchedulePanel.jsx';

function Dashboard({ user, onLogout, onNewDownload }) {
  const [activePanel, setActivePanel] = useState('tasks');

  const panels = [
    { id: 'tasks', label: '任务中心', icon: '📥' },
    { id: 'history', label: '下载历史', icon: '📁' },
    { id: 'tools', label: '工具箱', icon: '🔧' },
    { id: 'schedule', label: '定时下载', icon: '⏰' },
    { id: 'account', label: '我的账户', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white flex flex-col">
      {/* Animated Background (subtle for dashboard) */}
      <div className="animated-bg opacity-50" />

      {/* Dashboard Header — Glass */}
      <header className="relative z-40 px-6 py-4">
        <div className="flex items-center justify-between glass-strong rounded-2xl px-6 py-3.5">
          <div className="flex items-center gap-4">
            <a href="#/" className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              SnapVid
            </a>
            <div className="w-[1px] h-4 bg-white/10" />
            <span className="text-sm text-white/40 font-medium">控制台</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onNewDownload}
              className="text-sm text-white font-medium
                bg-gradient-to-r from-violet-500/20 to-cyan-500/20
                border border-violet-400/25 px-4 py-2 rounded-xl
                hover:from-violet-500/30 hover:to-cyan-500/30 hover:border-violet-400/40
                transition-all duration-300 active:scale-[0.97]"
            >
              + 新建下载
            </button>
            <span className="text-sm text-white/40">{user?.phone || '用户'}</span>
            {user?.plan === 'pro' && (
              <span className="text-xs px-2.5 py-1 rounded-lg font-medium
                bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-400/20
                text-violet-300">PRO</span>
            )}
            <button onClick={onLogout} className="text-sm text-white/30 hover:text-white/60 transition-colors">退出</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar — Glass */}
        <aside className="w-56 flex-shrink-0 hidden sm:block p-4 pr-0">
          <nav className="glass rounded-2xl p-3 space-y-1 h-full">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 relative ${
                  activePanel === panel.id
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                }`}
              >
                {/* Active indicator — gradient left bar */}
                {activePanel === panel.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full
                    bg-gradient-to-b from-violet-400 to-cyan-400" />
                )}
                <span className="text-base">{panel.icon}</span>
                {panel.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar — Glass */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3">
          <div className="flex justify-around py-2.5 glass-strong rounded-2xl">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                  activePanel === panel.id
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/40'
                }`}
              >
                <span className="text-lg">{panel.icon}</span>
                <span className="text-[10px]">{panel.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 pb-24 sm:pb-6">
          <div className="max-w-4xl mx-auto">
            {activePanel === 'tasks' && <TaskCenter />}
            {activePanel === 'history' && <HistoryPanel />}
            {activePanel === 'tools' && <Toolbox />}
            {activePanel === 'schedule' && <SchedulePanel />}
            {activePanel === 'account' && <AccountPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
