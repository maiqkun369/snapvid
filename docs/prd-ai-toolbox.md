# SnapVid AI 工具箱 PRD

> 版本: v1.0 | 日期: 2026-06-15 | 作者: pm-researcher

---

## 产品目标

为 SnapVid 工具箱接入真实 AI 能力，首期通过 DeepSeek V4 API 实现视频内容摘要、AI 文案生成和智能标签等文本智能功能，替代当前 demo/simulated 模式。同时调研多模态模型市场，为下阶段视频帧分析和视觉理解功能做好技术选型。

---

## 用户故事

| # | 角色 | 需求 | 价值 |
|---|------|------|------|
| 1 | 普通用户 | 下载视频后，一键生成视频内容摘要，方便分享到社交媒体 | 省去手动写描述的麻烦 |
| 2 | 内容创作者 | 用 AI 分析视频文案并生成优化建议/标题/多语言字幕稿 | 提升内容生产效率 |
| 3 | 运营人员 | 批量处理下载视频，自动生成标签、分类和摘要 | 内容管理和 SEO |
| 4 | 开发者 | 在控制台管理 AI API Key，选择不同模型 | 灵活性和可控性 |

---

## 需求池

### P0 — 本次实现（DeepSeek 集成）

- [ ] **DeepSeek Chat 对话**: 用户输入 Prompt，AI 返回分析结果
- [ ] **视频内容摘要**: 一键生成视频标题+内容摘要（基于视频元数据 + 用户提供的上下文）
- [ ] **AI 文案生成**: 基于视频信息生成社交媒体文案、标题、描述
- [ ] **智能标签**: 自动生成视频分类标签（如 #教程 #vlog #游戏）
- [ ] **文本文件分析**: 上传字幕文件 (.srt/.vtt) 或描述文本，让 AI 分析
- [ ] **AI API 配置管理**: 环境变量配置 DeepSeek API Key

### P1 — 下个版本（多模态）

- [ ] **视频帧分析**: 提取视频关键帧，调用多模态模型分析视觉内容
- [ ] **AI 字幕生成**（真实版）: 替换当前 demo 模式，接入真实 Speech-to-Text API
- [ ] **多模型切换**: 用户可选择 DeepSeek / Gemini / Qwen-VL 等模型
- [ ] **模型使用统计**: Dashboard 显示各模型调用量和费用

### P2 — 远期

- [ ] **自定义 Prompt 模板市场**: 用户保存和分享 Prompt 模板
- [ ] **批量处理队列**: 上传多个视频自动排队处理
- [ ] **AI 视频编辑**: 基于 AI 分析结果自动剪辑高光片段
- [ ] **本地模型支持**: 支持本地部署的 Ollama 模型

---

## DeepSeek 接入方案

### API 概览

| 项目 | 详情 |
|------|------|
| **API 端点** | `https://api.deepseek.com` |
| **协议格式** | OpenAI 兼容 (`/v1/chat/completions`) |
| **SDK** | 可直接使用 `openai` Python 库，只需改 `base_url` |
| **认证方式** | `Authorization: Bearer sk-xxx` |

### 当前模型

| 模型 ID | 说明 | 缓存命中输入 | 缓存未命中输入 | 输出 | 上下文 |
|---------|------|-------------|---------------|------|--------|
| `deepseek-v4-flash` | 快速版，适合日常任务 | $0.0028/M | $0.14/M | $0.28/M | 1M tokens |
| `deepseek-v4-pro` | 专业版，复杂推理（当前2.5折至2026/05/31） | $0.025/M | $0.435/M (原价$1.74) | $0.87/M (原价$3.48) | 1M tokens |

> 注: 中文报价（元/百万tokens）— Flash: 命中0.02/未命中1/输出2; Pro: 命中0.025/未命中3(2.5折)/输出6(2.5折)

### 模型能力

| 能力 | V4-Flash | V4-Pro |
|------|----------|--------|
| 思考模式 (DeepThink) | 支持 | 支持（默认） |
| 上下文长度 | 1M tokens | 1M tokens |
| 最大输出 | 384K tokens | 384K tokens |
| JSON 输出 | 支持 | 支持 |
| Tool Calls | 支持 | 支持 |
| FIM 补全 | 支持（非思考模式） | 支持（非思考模式） |
| 知识截止 | 2025年5月 | 2025年5月 |
| 多模态视觉输入 | **不支持** | **不支持** |

> **重要**: DeepSeek 当前 **不** 支持视觉输入（图片/视频帧分析）。它主要通过 OCR 提取上传文件中的文字信息。如果需要视频帧分析，必须引入多模态模型（见下方调研）。

### 环境变量设计

```bash
# .env / Railway 环境变量
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com  # 可选，默认值
DEEPSEEK_MODEL=deepseek-v4-flash             # 可选，默认值（flash 或 pro）
```

### 与现有 `ai_tools.py` 的集成方式

当前 `ai_tools.py` 是一个 **stub 实现**，只返回 demo 数据。集成方案：

1. **新增 `DeepSeekService` 类**（或在 `AIToolsService` 中添加方法）
2. **使用 `openai` Python SDK**，设置 `base_url` 指向 DeepSeek
3. **API 调用封装**:
   ```python
   from openai import OpenAI
   
   client = OpenAI(
       api_key=os.environ["DEEPSEEK_API_KEY"],
       base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
   )
   
   response = client.chat.completions.create(
       model=os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash"),
       messages=[
           {"role": "system", "content": "你是视频内容分析助手..."},
           {"role": "user", "content": f"分析这个视频: {video_info}"}
       ],
       temperature=0.7,
       max_tokens=2000
   )
   ```

4. **新增 API 端点**（`backend/routes/tools.py`）:
   - `POST /api/tools/ai-summary` — 视频内容摘要
   - `POST /api/tools/ai-copywriting` — AI 文案生成
   - `POST /api/tools/ai-tags` — 智能标签
   - `POST /api/tools/ai-chat` — 自由对话

5. **兼容现有任务状态管理**: 复用 `_tasks` 字典追踪异步任务

### 成本估算

场景: 每天 1000 次 AI 调用，每次输入 2000 tokens，输出 500 tokens。

| 模型 | 日消耗输入 | 日消耗输出 | 日成本 | 月成本 (30天) |
|------|-----------|-----------|--------|---------------|
| V4-Flash | 2M tokens | 0.5M tokens | ~$0.42 | ~$12.6 (≈¥91) |
| V4-Pro (折后) | 2M tokens | 0.5M tokens | ~$1.30 | ~$39 (≈¥284) |
| V4-Pro (原价) | 2M tokens | 0.5M tokens | ~$5.22 | ~$156.6 (≈¥1,138) |

建议默认使用 V4-Flash，大部分摘要/文案任务已足够。

---

## 多模态模型调研对比

### 对比总表

| 模型 | 厂商 | 输入价格（每百万tokens） | 输出价格（每百万tokens） | 视觉能力 | 上下文 | 接入难度 | 推荐优先级 |
|------|------|------------------------|------------------------|---------|--------|---------|-----------|
| **Gemini 2.5 Flash** | Google | $0.30 | $2.50 | 图片/视频/音频原生输入 | 1M | 低（有官方SDK） | **P0 首选** |
| **Qwen3-VL-Flash** | 阿里云 | $0.022 (≤32K) | $0.215 | 图片/视频/OCR | 256K | 低（OpenAI兼容） | **P0 备选** |
| **Gemini 2.5 Pro** | Google | $1.25 (≤200K) | $10.00 | 图片/视频/音频 | 1M | 低（有官方SDK） | P1 |
| **Claude Sonnet 4.6** | Anthropic | $3.00 | $15.00 | 图片/文档分析 | 1M | 低（有官方SDK） | P1 |
| **GLM-4.6V** | 智谱AI | ¥1 (≈$0.14) | ¥3 (≈$0.42) | 图片/视频 | 128K | 中（非标API） | P1 |
| **Qwen3-VL-Plus** | 阿里云 | $0.143 (≤32K) | $1.434 | 图片/视频/OCR | 256K | 低（OpenAI兼容） | P2 |
| **Doubao 2.0 Pro** | 字节跳动 | ¥3.2 (≈$0.44) | ¥16 (≈$2.21) | 多模态Agent | 128K | 中（火山引擎） | P2 |

### 各模型详细评估

#### 1. Gemini 2.5 Flash ⭐⭐⭐⭐⭐ (P0 首选)

- **厂商**: Google
- **模型ID**: `gemini-2.5-flash`
- **价格**: 输入 $0.30/M, 输出 $2.50/M
- **视觉能力**: 原生支持图片、视频、音频多模态输入
- **上下文**: 1M tokens（所有输入共享）
- **优势**:
  - 原生多模态，直接传入视频帧或音频进行理解
  - 价格适中，性价比极高
  - Google AI Studio 免费层: 每月 2M tokens 免费，非常适合开发测试
  - 有官方 Python SDK (`google-genai`)
  - Batch API 50% 折扣，适合批量处理
- **劣势**: 国内访问可能需要代理；中文理解不如国产模型
- **适用场景**: 视频帧分析、音视频内容理解、批量处理
- **接入方式**: `pip install google-genai`，API Key 从 Google AI Studio 获取

#### 2. Qwen3-VL-Flash ⭐⭐⭐⭐⭐ (P0 备选)

- **厂商**: 阿里云（百炼平台）
- **模型ID**: `qwen3-vl-flash`
- **价格**: 输入 $0.022/M (≤32K), 输出 $0.215/M
- **视觉能力**: 原生支持图片、视频输入，OCR 优秀
- **上下文**: 256K tokens
- **优势**:
  - **国内最优价格**，极其便宜
  - 中文能力出色
  - 阿里云百炼平台，国内访问无障碍
  - OpenAI 兼容 API，零成本切换
  - 视频理解能力强（20分钟以上长视频）
- **劣势**: 长上下文不如 Gemini (256K vs 1M)
- **适用场景**: 国内用户首选，成本敏感场景，中文内容分析
- **接入方式**: 阿里云百炼控制台创建 API Key，OpenAI 兼容格式

#### 3. Claude Sonnet 4.6 ⭐⭐⭐⭐ (P1)

- **厂商**: Anthropic
- **模型ID**: `claude-sonnet-4-6`
- **价格**: 输入 $3.00/M, 输出 $15.00/M
- **视觉能力**: 图片输入（文档、图表分析能力强）
- **上下文**: 1M tokens
- **优势**:
  - 复杂推理和代码能力强
  - 文档/图表分析能力业界领先
  - Extended Thinking 模式支持深度推理
  - Batch API 50% 折扣
- **劣势**: 价格较高；无原生视频输入，需预处理为图片序列
- **适用场景**: 复杂视频内容深度分析、脚本优化建议、文档理解
- **接入方式**: `pip install anthropic`，官方 SDK

#### 4. GLM-4.6V ⭐⭐⭐⭐ (P1)

- **厂商**: 智谱AI
- **模型ID**: `GLM-4.6V`
- **价格**: 输入 ¥1/M (≈$0.14), 输出 ¥3/M (≈$0.42); Flash 版免费
- **视觉能力**: 图片、视频输入
- **上下文**: 128K tokens
- **优势**:
  - **Flash 版免费**，零成本开发
  - 中文场景优化
  - 国内合规，访问无障碍
  - 价格极具竞争力（仅 ¥1/3 元）
- **劣势**: 上下文较短 (128K)；API 非 OpenAI 标准格式
- **适用场景**: 中文视频分析、低成本方案、内部工具
- **接入方式**: 智谱开放平台 `open.bigmodel.cn` 获取 API Key

#### 5. Doubao 2.0 Pro / Seed 1.6 Vision ⭐⭐⭐ (P2)

- **厂商**: 字节跳动（火山引擎）
- **模型ID**: `doubao-seed-2.0-pro` / `doubao-seed-1.6-vision`
- **价格**: Pro 输入 ¥3.2/M, 输出 ¥16/M; Vision 输入 ¥0.8/M, 输出 ¥8/M
- **视觉能力**: 多模态 Agent，工具调用，视频理解
- **上下文**: 128K-256K
- **优势**:
  - 多模态 Agent 能力（可调用外部工具）
  - 抖音生态深度整合
  - 火山引擎完善的企业级服务
- **劣势**: 价格偏高（Pro版）；API 生态较封闭
- **适用场景**: 与抖音内容联动、企业级部署、高级 Agent 场景
- **接入方式**: 火山引擎控制台开通

### 推荐选型策略

```
         ┌─────────────────────────────────────┐
         │       SnapVid AI 模型选型决策树       │
         └─────────────────────────────────────┘
                           │
             用户要做什么?
        ┌─────────┼──────────┐
        ▼         ▼          ▼
   文本类任务   视觉类任务   批量处理
        │         │          │
        ▼         ▼          ▼
   DeepSeek   需要国内?   Gemini/Claude
   V4-Flash   │          Batch API
   (P0)     ┌─┴─┐        50% 折扣
            ▼   ▼
         Yes  No
          │    │
          ▼    ▼
      Qwen3-VL  Gemini 2.5
      Flash     Flash
      (最便宜)   (最强能力)
```

**总结**: 
- **P0**: DeepSeek V4-Flash 做文本智能，Gemini 2.5 Flash 或 Qwen3-VL-Flash 做视觉
- **P1**: 增加 Claude Sonnet 做深度分析，GLM-4.6V 做低成本方案
- **成本最优组合**: DeepSeek Flash + Qwen3-VL-Flash（国内最低价方案）

---

## UI 交互设计

### 工具箱 AI 区域改造建议

当前 Toolbox.jsx 已有 `summary`（视频信息）和 `subtitle`（AI字幕）按钮。建议改造:

```
┌─────────────────────────────────────────────────┐
│  AI 工具箱                         [配置API Key] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  内容摘要     │  │  AI 文案生成  │            │
│  │  一键摘要视频  │  │  社媒文案/标题│            │
│  │  关键信息提取  │  │  多风格可选   │            │
│  │         [执行]│  │         [执行]│            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │  智能标签     │  │  AI 对话     │            │
│  │  自动生成标签  │  │  自由提问     │            │
│  │  分类/SEO     │  │  关于视频...  │            │
│  │         [执行]│  │         [执行]│            │
│  └──────────────┘  └──────────────┘            │
│                                                 │
│  ▼ 结果展示区（可折叠）                          │
│  ┌─────────────────────────────────────────────┐│
│  │ AI 分析结果（Markdown 渲染）                 ││
│  │ ...                                         ││
│  │ [复制] [保存] [重新生成]                     ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### 交互要求

1. **配置入口**: 设置页面可配置 API Key + 选择默认模型
2. **Prompt 预览**: 执行前可预览发给 AI 的 Prompt
3. **流式输出**: AI 回复使用 SSE 流式展示（打字机效果）
4. **Markdown 渲染**: 结果区域支持 Markdown 渲染
5. **错误处理**: API Key 未配置时显示引导提示，而非报错
6. **费用预估**: 执行前预估本次调用费用

### 前端改造范围

**新增状态和函数** (`Toolbox.jsx`):
```javascript
// AI 工具状态
const [aiPrompt, setAiPrompt] = useState('');
const [aiResult, setAiResult] = useState('');
const [aiStreaming, setAiStreaming] = useState(false);
const [aiCostEstimate, setAiCostEstimate] = useState(null);
const [selectedAiTool, setSelectedAiTool] = useState('');

// AI 调用函数
const executeAi = async (toolId) => { /* ... SSE streaming ... */ };
```

**新增 API 端点** (前端调用):
- `POST /api/tools/ai-summary` → `{ task_id, prompt }`
- `POST /api/tools/ai-copywriting` → `{ task_id, style }`
- `POST /api/tools/ai-tags` → `{ task_id, max_tags }`
- `POST /api/tools/ai-chat` → `{ task_id, message }`

---

## 后端实现计划

### 文件结构

```
backend/
├── services/
│   ├── ai_tools.py          # 现有 stub（字幕/超分/去水印）
│   └── ai_text_service.py   # 新增: DeepSeek 文本智能服务
├── routes/
│   └── tools.py             # 现有路由，新增 AI 端点
├── config/
│   └── ai_config.py         # 新增: AI 配置管理
```

### `ai_text_service.py` 核心设计

```python
class AITextService:
    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        )
        self.model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
    
    async def summarize_video(self, video_info: dict) -> dict:
        """生成视频内容摘要"""
        ...
    
    async def generate_copywriting(self, video_info: dict, style: str) -> dict:
        """生成社交媒体文案"""
        ...
    
    async def generate_tags(self, video_info: dict, max_tags: int = 10) -> dict:
        """生成智能标签"""
        ...
    
    async def analyze_subtitle(self, subtitle_text: str) -> dict:
        """分析字幕文件内容"""
        ...
    
    async def chat(self, video_info: dict, user_message: str) -> AsyncGenerator:
        """自由对话（流式）"""
        ...
```

---

## 待确认问题

| # | 问题 | 负责人 | 优先级 |
|---|------|--------|--------|
| 1 | DeepSeek API Key 由谁提供？是否需要支持用户自带 Key？ | team-lead | P0 |
| 2 | 现有 `subtitle` 占位功能的真实 ASR 方案何时确定？（DeepSeek 不支持语音识别） | team-lead | P1 |
| 3 | 多模态模型是否需要支持用户自行配置 API Key？ | team-lead | P1 |
| 4 | AI 调用是否需要用户登录鉴权后才能使用？ | team-lead | P0 |
| 5 | 是否需要限制单用户的每日 AI 调用次数？ | team-lead | P2 |
| 6 | 前端 AI 结果是否需要持久化存储？ | team-lead | P2 |
| 7 | Gemini API 国内访问需要代理 — 是否接受或用 Qwen-VL 替代？ | team-lead | P1 |

---

## 附录: 参考链接

- DeepSeek API 文档: https://api-docs.deepseek.com/
- DeepSeek 定价: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- Google Gemini API: https://ai.google.dev/
- 阿里云百炼: https://bailian.console.aliyun.com/
- 智谱开放平台: https://open.bigmodel.cn/
- Anthropic Claude: https://docs.anthropic.com/
- 火山引擎豆包: https://www.volcengine.com/product/doubao
