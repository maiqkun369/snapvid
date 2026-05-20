import React, { useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket.js';

/**
 * Download progress bar component with real-time updates.
 * @param {object} props
 * @param {string} props.taskId - The download task UUID.
 * @param {function} props.onComplete - Callback when download completes.
 */
function ProgressBar({ taskId, onComplete }) {
  const [status, setStatus] = useState('connecting');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('');
  const [eta, setEta] = useState('');
  const [error, setError] = useState('');

  /**
   * Handle incoming WebSocket messages.
   * @param {object} data - Progress data from server.
   */
  const handleMessage = (data) => {
    if (data.progress !== undefined) {
      setProgress(data.progress);
    }
    if (data.speed !== undefined) {
      setSpeed(data.speed);
    }
    if (data.eta !== undefined) {
      setEta(data.eta);
    }
    if (data.status) {
      setStatus(data.status);
      if (data.status === 'completed' && onComplete) {
        onComplete();
      }
      if (data.status === 'failed') {
        setError(data.error || '下载失败');
      }
    }
  };

  useWebSocket(taskId, handleMessage);

  /**
   * Get status label text.
   * @returns {string} Human-readable status.
   */
  const getStatusLabel = () => {
    switch (status) {
      case 'connecting':
        return '连接中...';
      case 'pending':
        return '等待中...';
      case 'downloading':
        return '下载中';
      case 'completed':
        return '下载完成';
      case 'failed':
        return '下载失败';
      default:
        return status;
    }
  };

  /**
   * Get progress bar color class.
   * @returns {string} Tailwind CSS class.
   */
  const getBarColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-primary-500';
    }
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          {getStatusLabel()}
        </span>
        <span className="text-sm text-gray-400">
          {progress.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Speed & ETA */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{speed || '--'}</span>
        <span>{eta ? `剩余 ${eta}` : '--'}</span>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Completed state */}
      {status === 'completed' && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          下载完成！可在下载历史中获取文件。
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
