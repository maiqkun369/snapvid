import React, { useState, useEffect } from 'react';

function TaskCenter() {
  const [activeTasks, setActiveTasks] = useState([]);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch(`/api/tasks/active?token=${token}`),
        fetch(`/api/downloads?token=${token}&limit=5`),
      ]);
      if (activeRes.ok) setActiveTasks(await activeRes.json());
      if (historyRes.ok) {
        const all = await historyRes.json();
        setRecentCompleted(all.filter(t => t.status === 'completed').slice(0, 5));
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (taskId) => {
    await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
    fetchTasks();
  };

  const handleDownloadFile = (taskId, filename) => {
    window.open(`/api/downloads/${taskId}/file`, '_blank');
  };

  if (loading) return <div className="text-center py-12 text-white/30">加载中...</div>;

  return (
    <div className="space-y-8">
      {/* Active Downloads */}
      <section>
        <h2 className="text-lg font-semibold text-white/80 mb-4">
          活跃任务
          {activeTasks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-violet-400/70">{activeTasks.length} 进行中</span>
          )}
        </h2>

        {activeTasks.length === 0 ? (
          <div className="text-center py-12 glass rounded-2xl">
            <p className="text-white/30 text-sm">没有进行中的下载任务</p>
            <a href="#/" className="text-xs text-violet-400/60 hover:text-violet-300 mt-2 inline-block transition-colors">
              去首页新建下载 →
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <div key={task.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/70 truncate font-medium">{task.title || '获取中...'}</p>
                    <p className="text-xs text-white/30 mt-0.5 truncate">{task.url?.slice(0, 50)}...</p>
                  </div>
                  <button onClick={() => handleCancel(task.id)}
                    className="text-xs text-white/30 hover:text-red-400 px-3 py-1.5 rounded-xl
                      hover:bg-red-500/10 transition-all ml-3">
                    取消
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(task.progress || 0, 100)}%` }} />
                  </div>
                  <span className="text-xs text-white/40 w-12 text-right">{(task.progress || 0).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between mt-2.5 text-xs text-white/25">
                  <span>{task.speed || '--'}</span>
                  <span>{task.eta || '--'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Completed */}
      <section>
        <h2 className="text-lg font-semibold text-white/80 mb-4">最近完成</h2>
        {recentCompleted.length === 0 ? (
          <p className="text-sm text-white/25 text-center py-6">暂无已完成的下载</p>
        ) : (
          <div className="space-y-2">
            {recentCompleted.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-5 py-3.5 glass rounded-2xl">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/60 truncate">{task.title}</p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {task.filesize ? `${(task.filesize / 1024 / 1024).toFixed(1)} MB` : '--'}
                  </p>
                </div>
                <button onClick={() => handleDownloadFile(task.id, task.filename)}
                  className="text-xs text-emerald-400/70 hover:text-emerald-300 px-3 py-1.5 rounded-xl
                    hover:bg-emerald-500/10 transition-all">
                  下载
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default TaskCenter;
