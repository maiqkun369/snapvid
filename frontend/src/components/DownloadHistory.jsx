import React, { useEffect, useState } from 'react';

/**
 * Download history list component.
 */
function DownloadHistory() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch download history from API.
   */
  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/downloads');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch download history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handle file download click.
   * @param {string} taskId - Task UUID.
   * @param {string} filename - File name for download.
   */
  const handleDownloadFile = (taskId, filename) => {
    const link = document.createElement('a');
    link.href = `/api/downloads/${taskId}/file`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Handle task deletion.
   * @param {string} taskId - Task UUID to delete.
   */
  const handleDelete = async (taskId) => {
    if (!confirm('确定要删除这条下载记录吗？')) return;

    try {
      const response = await fetch(`/api/downloads/${taskId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  /**
   * Format file size.
   * @param {number|null} bytes - Size in bytes.
   * @returns {string} Formatted size.
   */
  const formatSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes > 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  /**
   * Get status badge styling.
   * @param {string} status - Task status.
   * @returns {object} Badge configuration.
   */
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { text: '已完成', className: 'bg-green-900/30 text-green-400 border-green-800' };
      case 'downloading':
        return { text: '下载中', className: 'bg-blue-900/30 text-blue-400 border-blue-800' };
      case 'pending':
        return { text: '等待中', className: 'bg-yellow-900/30 text-yellow-400 border-yellow-800' };
      case 'failed':
        return { text: '失败', className: 'bg-red-900/30 text-red-400 border-red-800' };
      default:
        return { text: status, className: 'bg-gray-900/30 text-gray-400 border-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-4">
          <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500">暂无下载记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">下载历史</h3>
      <div className="space-y-3">
        {tasks.map((task) => {
          const badge = getStatusBadge(task.status);
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-800"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {task.title || '未知标题'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.className}`}>
                    {badge.text}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatSize(task.filesize)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {task.status === 'completed' && task.filename && (
                  <button
                    onClick={() => handleDownloadFile(task.id, task.filename)}
                    className="p-2 text-primary-400 hover:text-primary-300 hover:bg-gray-700 rounded-lg transition-colors"
                    title="下载文件"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  title="删除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DownloadHistory;
