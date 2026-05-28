import React, { useState, useEffect, useRef } from 'react';
import Timeline from '../editor/Timeline.jsx';
import ClipList from '../editor/ClipList.jsx';
import ExportPanel from '../editor/ExportPanel.jsx';

function VideoEditor() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [clips, setClips] = useState([]);
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  // Fetch completed downloads
  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/downloads?token=${token}&limit=20`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const completed = data.filter(t => t.status === 'completed' && t.filename);
        setTasks(completed);
      });
  }, []);

  // Load video when task selected
  useEffect(() => {
    if (!selectedTask) return;
    const task = tasks.find(t => t.id === selectedTask);
    if (task?.filename) {
      setVideoUrl(`/api/editor/stream/${encodeURIComponent(task.filename)}`);
      setClips([]);
      setThumbnails([]);
      // Generate thumbnails
      setLoading(true);
      fetch(`/api/editor/thumbnails?task_id=${selectedTask}&count=20`, { method: 'POST' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setThumbnails(data.thumbnails || []);
            setDuration(data.duration || 0);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedTask, tasks]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const addClip = (start, end) => {
    setClips(prev => [...prev, {
      id: Date.now().toString(),
      start: formatTime(start),
      end: formatTime(end),
      speed: 1.0,
    }]);
  };

  const removeClip = (clipId) => {
    setClips(prev => prev.filter(c => c.id !== clipId));
  };

  const updateClip = (clipId, field, value) => {
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, [field]: value } : c));
  };

  const moveClip = (fromIdx, toIdx) => {
    setClips(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white/80 mb-2">在线剪辑</h2>
        <p className="text-sm text-white/30">选择已下载的视频，直接在浏览器中剪辑</p>
      </div>

      {/* Source selection */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <label className="block text-xs text-white/40 mb-2">选择视频</label>
        {tasks.length === 0 ? (
          <p className="text-sm text-white/30">暂无已完成的下载，请先下载视频</p>
        ) : (
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-cyan-500/30"
          >
            <option value="">选择视频...</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title || t.filename} ({t.filesize ? `${(t.filesize / 1024 / 1024).toFixed(1)}MB` : '--'})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div className="rounded-xl overflow-hidden bg-black/40 border border-white/[0.06]">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={handleTimeUpdate}
            controls
            className="w-full max-h-[400px] object-contain"
          />
        </div>
      )}

      {/* Timeline */}
      {duration > 0 && (
        <Timeline
          duration={duration}
          currentTime={currentTime}
          thumbnails={thumbnails}
          clips={clips}
          onSeek={seekTo}
          onAddClip={addClip}
          loading={loading}
        />
      )}

      {/* Clip List */}
      {clips.length > 0 && (
        <ClipList
          clips={clips}
          onRemove={removeClip}
          onUpdate={updateClip}
          onMove={moveClip}
        />
      )}

      {/* Export Panel */}
      {clips.length > 0 && (
        <ExportPanel
          taskId={selectedTask}
          clips={clips}
        />
      )}
    </div>
  );
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

export default VideoEditor;
