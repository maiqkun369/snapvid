// SnapVid Cookie Helper - Popup Script

const platforms = [
  { id: 'douyin', name: '抖音', url: 'https://www.douyin.com' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'bilibili', name: 'B站', url: 'https://www.bilibili.com' },
  { id: 'youku', name: '优酷', url: 'https://www.youku.com' },
  { id: 'tencent', name: '腾讯视频', url: 'https://v.qq.com' },
  { id: 'iqiyi', name: '爱奇艺', url: 'https://www.iqiyi.com' },
  { id: 'mango', name: '芒果TV', url: 'https://www.mgtv.com' },
];

const container = document.getElementById('platforms');

platforms.forEach(p => {
  const btn = document.createElement('div');
  btn.className = 'platform-btn';
  btn.id = `btn-${p.id}`;
  btn.innerHTML = `<span class="name">${p.name}</span><span class="status" id="status-${p.id}">点击同步</span>`;
  btn.onclick = () => syncPlatform(p.id);
  container.appendChild(btn);
});

async function syncPlatform(platformId) {
  const statusEl = document.getElementById(`status-${platformId}`);
  const btnEl = document.getElementById(`btn-${platformId}`);
  statusEl.textContent = '同步中...';
  btnEl.className = 'platform-btn';

  chrome.runtime.sendMessage({ action: 'extract', platform: platformId }, (result) => {
    if (result && result.success) {
      statusEl.textContent = `✅ 已同步 (${result.count} cookies)`;
      btnEl.className = 'platform-btn success';
    } else {
      statusEl.textContent = `❌ ${result?.error || '失败'}`;
      btnEl.className = 'platform-btn error';
    }
  });
}

document.getElementById('syncAll').onclick = () => {
  document.getElementById('syncAll').textContent = '同步中...';
  chrome.runtime.sendMessage({ action: 'extractAll' }, (results) => {
    document.getElementById('syncAll').textContent = '🔄 一键同步全部平台';
    if (results) {
      for (const [pid, result] of Object.entries(results)) {
        const statusEl = document.getElementById(`status-${pid}`);
        const btnEl = document.getElementById(`btn-${pid}`);
        if (result.success) {
          statusEl.textContent = `✅ ${result.count} cookies`;
          btnEl.className = 'platform-btn success';
        } else if (result.error?.includes('未找到')) {
          statusEl.textContent = '- 未登录';
          btnEl.className = 'platform-btn';
        } else {
          statusEl.textContent = `❌ ${result.error}`;
          btnEl.className = 'platform-btn error';
        }
      }
    }
  });
};
