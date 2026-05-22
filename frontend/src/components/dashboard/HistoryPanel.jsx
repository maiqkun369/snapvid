import React, { useState, useEffect } from 'react';

function HistoryPanel() {
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/downloads?token=${token}&page=${page}&limit=20`);
      if (res.ok) setTasks(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [page]);

  const handleDelete = async (taskId) => {
    await fetch(`/api/downloads/${taskId}`, { method: 'DELETE' });
    fetchHistory();
  };

  const handleDownload = (taskId) => {
    window.open(`/api/downloads/${taskId}/file`, '_blank');
  };

  if (loading) return <div className="text-center py-12 text-white/30">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-white/80">下载历史</h2>
        <span className="text-xs text-white/30">{tasks.length} 条记录</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.02] rounded-xl border border-white/[0.06]">
          <p className="text-white/30">暂无下载记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/60 truncate">{task.title || '未知'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400/70' :
                    task.status === 'failed' ? 'bg-red-500/10 text-red-400/70' :
                    task.status === 'downloading' ? 'bg-cyan-500/10 text-cyan-400/70' :
                    'bg-white/[0.05] text-white/30'
                  }`}>
                    {task.status === 'completed' ? '完成' : task.status === 'failed' ? '失败' : task.status === 'downloading' ? '下载中' : '等待'}
                  </span>
                  <span className="text-xs text-white/20">
                    {task.filesize ? `${(task.filesize / 1024 / 1024).toFixed(1)} MB` : '--'}
                  </span>
                  <span className="text-xs text-white/15">{task.created_at?.split('T')[0] || ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                {task.status === 'completed' && (
                  <button onClick={() => handleDownload(task.id)}
                    className="text-xs text-emerald-400/60 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors">
                    ↓
                  </button>
                )}
                <button onClick={() => handleDelete(task.id)}
                  className="text-xs text-white/20 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          className="text-xs text-white/40 hover:text-white/60 disabled:opacity-20 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
          ← 上一页
        </button>
        <span className="text-xs text-white/30">第 {page} 页</span>
        <button onClick={() => setPage(page + 1)} disabled={tasks.length < 20}
          className="text-xs text-white/40 hover:text-white/60 disabled:opacity-20 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
          下一页 →
        </button>
      </div>
    </div>
  );
}

export default HistoryPanel;
