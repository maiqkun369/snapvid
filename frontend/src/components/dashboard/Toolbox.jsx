import React, { useState } from 'react';

function Toolbox() {
  const [activeProcess, setActiveProcess] = useState(null);
  const [result, setResult] = useState(null);

  const tools = [
    { id: 'subtitle', name: 'AI 字幕生成', desc: '自动识别语音生成字幕文件', icon: '📝', pro: true },
    { id: 'super_res', name: 'AI 超分增强', desc: '提升视频分辨率至 2K/4K', icon: '✨', pro: true },
    { id: 'watermark', name: 'AI 去水印', desc: '智能移除视频水印', icon: '🎨', pro: true },
    { id: 'convert', name: '格式转换', desc: '视频/音频格式无损转换', icon: '🔄', pro: false },
    { id: 'audio_extract', name: '音频提取', desc: '从视频中提取纯音频', icon: '🎵', pro: false },
    { id: 'thumbnail', name: '封面提取', desc: '获取视频封面/缩略图', icon: '🖼️', pro: false },
    { id: 'compress', name: '视频压缩', desc: '减小文件体积(保持画质)', icon: '📦', pro: true },
    { id: 'merge', name: '视频拼接', desc: '多个视频合并为一个', icon: '🔗', pro: true },
  ];

  const handleTool = async (toolId) => {
    setActiveProcess(toolId);
    setResult(null);
    // Simulate processing (real implementation would call API)
    setTimeout(() => {
      setResult({ tool: toolId, message: '功能开发中，即将上线' });
      setActiveProcess(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white/80 mb-2">工具箱</h2>
        <p className="text-sm text-white/30">选择已下载的视频文件，使用 AI 工具进行加工处理</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleTool(tool.id)}
            disabled={activeProcess !== null}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200
              ${activeProcess === tool.id
                ? 'bg-cyan-500/[0.08] border-cyan-500/30'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
              }
              disabled:opacity-50`}
          >
            <span className="text-xl mt-0.5">{tool.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70 font-medium">{tool.name}</span>
                {tool.pro && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">PRO</span>
                )}
              </div>
              <p className="text-xs text-white/30 mt-1">{tool.desc}</p>
              {activeProcess === tool.id && (
                <p className="text-xs text-cyan-400/70 mt-2 animate-pulse">处理中...</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-sm text-white/50">{result.message}</p>
        </div>
      )}
    </div>
  );
}

export default Toolbox;
