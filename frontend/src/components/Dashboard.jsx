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
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      {/* Dashboard Header */}
      <header className="px-6 py-4 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <a href="#/" className="text-base font-semibold text-white/80 tracking-wide hover:text-white transition-colors">
            SnapVid
          </a>
          <span className="text-xs text-white/20">|</span>
          <span className="text-sm text-white/40">控制台</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNewDownload}
            className="text-sm text-white font-medium bg-gradient-to-r from-cyan-500/20 to-purple-500/20
              border border-cyan-400/30 px-4 py-2 rounded-lg hover:from-cyan-500/30 hover:to-purple-500/30 transition-all"
          >
            + 新建下载
          </button>
          <span className="text-sm text-white/50">{user?.phone || '用户'}</span>
          {user?.plan === 'pro' && (
            <span className="text-xs px-2 py-1 rounded-md font-medium bg-purple-500/20 text-purple-300">PRO</span>
          )}
          <button onClick={onLogout} className="text-sm text-white/30 hover:text-white/60 transition-colors">退出</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-white/[0.06] py-4 flex-shrink-0 hidden sm:block">
          <nav className="space-y-1 px-3">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  activePanel === panel.id
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                }`}
              >
                <span className="text-base">{panel.icon}</span>
                {panel.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0b]/95 backdrop-blur-md border-t border-white/[0.06] z-40">
          <div className="flex justify-around py-2">
            {panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  activePanel === panel.id ? 'text-white' : 'text-white/40'
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
