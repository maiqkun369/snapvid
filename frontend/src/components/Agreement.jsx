import React, { useState, useEffect } from 'react';

function Agreement() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('snapvid_agreement_v1');
    if (!accepted) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('snapvid_agreement_v1', Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 space-y-5 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-medium text-white">使用须知与免责声明</h2>
        <p className="text-xs text-white/30">使用本工具前，请仔细阅读以下条款：</p>

        <div className="space-y-3 text-[12px] text-white/50 leading-relaxed">
          <p><span className="text-white/70 font-medium">1. 合法使用</span> — 本工具仅支持下载用户自有版权、CC0/CC 协议公开授权、公共领域的视频内容。严禁下载受版权保护的影视、综艺、付费课程、平台专属会员内容。</p>

          <p><span className="text-white/70 font-medium">2. 零存储承诺</span> — 本工具不存储、不缓存、不分发任何用户下载的视频资源。所有解析均为实时处理，视频直接从源站下载到您的本地设备。</p>

          <p><span className="text-white/70 font-medium">3. 用户责任</span> — 您应确保下载行为符合所在地区法律法规及目标平台服务条款。因违规使用产生的一切法律责任由用户自行承担。</p>

          <p><span className="text-white/70 font-medium">4. 版权尊重</span> — 请尊重内容创作者的劳动成果。不得将下载内容用于商业目的、二次分发或未经授权的公开传播。</p>

          <p><span className="text-white/70 font-medium">5. 数据安全</span> — 我们不收集用户的下载记录和个人隐私信息。上传的 Cookies 仅存储在本地服务器用于解析，不会传输至第三方。</p>

          <p><span className="text-white/70 font-medium">6. 免责条款</span> — 本工具按「现状」提供，不做任何明示或暗示的保证。对因使用或无法使用本工具造成的直接或间接损失，运营方不承担责任。</p>
        </div>

        <div className="pt-2 border-t border-white/[0.04]">
          <p className="text-[10px] text-white/25 mb-4">侵权投诉通道：abuse@snapvid.app</p>
          <button
            onClick={handleAccept}
            className="w-full bg-white text-gray-900 font-medium py-3 rounded-xl
              transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
          >
            我已阅读并同意以上条款
          </button>
        </div>
      </div>
    </div>
  );
}

export default Agreement;
