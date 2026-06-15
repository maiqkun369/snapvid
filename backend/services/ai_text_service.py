"""DeepSeek AI text intelligence service.

Uses the OpenAI-compatible DeepSeek API for video content summarisation,
copywriting generation, smart tags, file analysis, and free-form chat.
"""

from __future__ import annotations

import logging
import os
import json
from pathlib import Path
from typing import Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

# DeepSeek current pricing (per 1M tokens, USD)
PRICE_INPUT_PER_M = 0.14  # $0.14 per 1M input tokens (flash, cache-miss)
PRICE_OUTPUT_PER_M = 0.28  # $0.28 per 1M output tokens (flash)


def _estimate_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate USD cost based on token usage."""
    cost_input = (prompt_tokens / 1_000_000) * PRICE_INPUT_PER_M
    cost_output = (completion_tokens / 1_000_000) * PRICE_OUTPUT_PER_M
    return round(cost_input + cost_output, 6)


class AITextService:
    """Singleton service wrapping the DeepSeek chat-completion API."""

    _instance: Optional["AITextService"] = None

    def __new__(cls) -> "AITextService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialised = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialised:
            return
        self._initialised = True

        api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
        base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").strip()
        self.model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash").strip()
        self.available = bool(api_key)

        if self.available:
            self.client = OpenAI(api_key=api_key, base_url=base_url)
            logger.info("AITextService initialised — model=%s", self.model)
        else:
            self.client = None
            logger.warning("AITextService not available: DEEPSEEK_API_KEY not set")

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------

    def _chat_internal(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        *,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[dict] = None,
    ) -> dict:
        """Low-level chat call returning a structured dict."""
        if not self.available:
            return {
                "success": False,
                "error": "AI 服务未配置（请在环境变量中设置 DEEPSEEK_API_KEY）",
                "data": "",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost_estimate": 0.0,
            }

        messages: list[dict] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        kwargs: dict = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            response = self.client.chat.completions.create(**kwargs)
            choice = response.choices[0]
            content = choice.message.content or ""

            prompt_tokens = response.usage.prompt_tokens if response.usage else 0
            completion_tokens = response.usage.completion_tokens if response.usage else 0

            return {
                "success": True,
                "data": content,
                "tokens_used": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                },
                "cost_estimate": _estimate_cost(prompt_tokens, completion_tokens),
            }
        except Exception as exc:
            logger.error("DeepSeek API call failed: %s", exc)
            return {
                "success": False,
                "error": f"AI 调用失败: {str(exc)}",
                "data": "",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost_estimate": 0.0,
            }

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------

    def chat(self, prompt: str, system_prompt: Optional[str] = None) -> dict:
        """Single-turn chat."""
        return self._chat_internal(prompt, system_prompt)

    def generate_summary(self, video_info: dict, context: str = "") -> dict:
        """Generate a video content summary.

        Parameters
        ----------
        video_info : dict
            Should include keys like ``title``, ``description``, ``uploader``,
            ``platform``, ``duration_string``, ``tags`` (optional).
        context : str
            Additional user-provided context (e.g. "这是教程视频").
        """
        system_prompt = (
            "你是一个专业的视频内容分析助手。请根据提供的视频信息生成简洁、准确的内容摘要。"
            "用中文回复，200-400字，包含视频主题、核心内容和受众分析。"
        )

        parts = []
        if video_info.get("title"):
            parts.append(f"标题: {video_info['title']}")
        if video_info.get("description"):
            desc = video_info["description"]
            parts.append(f"描述: {desc[:500]}{'...' if len(desc) > 500 else ''}")
        if video_info.get("uploader"):
            parts.append(f"创作者: {video_info['uploader']}")
        if video_info.get("platform"):
            parts.append(f"平台: {video_info['platform']}")
        if video_info.get("duration_string"):
            parts.append(f"时长: {video_info['duration_string']}")
        if video_info.get("tags"):
            tags = video_info["tags"]
            if isinstance(tags, list):
                parts.append(f"标签: {', '.join(tags[:10])}")
            elif isinstance(tags, str):
                parts.append(f"标签: {tags[:200]}")
        if context:
            parts.append(f"补充说明: {context}")

        user_prompt = "请为以下视频生成内容摘要：\n\n" + "\n".join(parts)
        return self._chat_internal(user_prompt, system_prompt, temperature=0.5, max_tokens=800)

    def generate_copywriting(self, video_info: dict, style: str = "social") -> dict:
        """Generate social-media copywriting / titles.

        Parameters
        ----------
        video_info : dict
            Same keys as ``generate_summary``.
        style : str
            One of ``"social"``, ``"professional"``, ``"quirky"``, ``"seo"``.
        """
        style_instructions = {
            "social": "小红书/抖音风格：活泼、有emoji、使用#话题标签、短句为主。",
            "professional": "B站/公众号风格：专业、深度、有观点、适合长视频。",
            "quirky": "微博/即刻风格：幽默风趣、有梗、引人好奇。",
            "seo": "YouTube SEO风格：包含关键词、吸引点击、描述详细但不浮夸。",
        }
        style_guide = style_instructions.get(style, style_instructions["social"])

        system_prompt = (
            f"你是一个顶级社交媒体文案专家。请{style_guide}"
            "请生成：1) 一个吸引人的标题 2) 一段100-200字的社交媒体文案 3) 3-5个推荐标签。"
            "用中文回复。"
        )

        parts = []
        if video_info.get("title"):
            parts.append(f"原标题: {video_info['title']}")
        if video_info.get("description"):
            desc = video_info["description"]
            parts.append(f"原描述: {desc[:400]}{'...' if len(desc) > 400 else ''}")
        if video_info.get("platform"):
            parts.append(f"来源平台: {video_info['platform']}")

        user_prompt = "请为以下视频生成" + style + "风格的文案：\n\n" + "\n".join(parts)
        return self._chat_internal(user_prompt, system_prompt, temperature=0.8, max_tokens=1000)

    def generate_tags(self, video_info: dict, count: int = 5) -> dict:
        """Generate smart tags in JSON list format.

        Parameters
        ----------
        video_info : dict
            Same keys as other methods.
        count : int
            Desired number of tags (default 5).
        """
        system_prompt = (
            "你是一个视频内容分类与标签专家。根据视频信息生成精准的分类标签。"
            "请以 JSON 数组格式返回标签，例如 [\"标签1\", \"标签2\", ...]。"
            f"只返回 JSON 数组，不要其他文字。生成 {count} 个标签。"
        )

        parts = []
        if video_info.get("title"):
            parts.append(f"标题: {video_info['title']}")
        if video_info.get("description"):
            desc = video_info["description"]
            parts.append(f"描述: {desc[:300]}{'...' if len(desc) > 300 else ''}")

        user_prompt = "请为以下视频生成#标签：\n\n" + "\n".join(parts)
        result = self._chat_internal(
            user_prompt, system_prompt,
            temperature=0.3, max_tokens=300,
            response_format={"type": "json_object"},
        )

        if result["success"] and result["data"]:
            try:
                parsed = json.loads(result["data"])
                # DeepSeek JSON mode may wrap the array differently
                if isinstance(parsed, dict):
                    for v in parsed.values():
                        if isinstance(v, list):
                            result["data"] = v[:count]
                            break
                    else:
                        # If no list found in dict values, use the raw string
                        if isinstance(result["data"], str):
                            result["data"] = [result["data"]]
                elif isinstance(parsed, list):
                    result["data"] = parsed[:count]
            except json.JSONDecodeError:
                # Fallback: split by common delimiters
                raw = result["data"]
                tags = [t.strip().strip('#"\'') for t in raw.replace("\n", ",").split(",") if t.strip()]
                result["data"] = tags[:count] if tags else [raw[:50]]

        return result

    def analyze_file(self, file_path: str, instruction: str = "") -> dict:
        """Analyse the content of a text file (.srt / .vtt / .txt).

        Parameters
        ----------
        file_path : str
            Absolute or relative path to the file.
        instruction : str
            Optional hint, e.g. "请总结这份字幕的要点"。
        """
        path = Path(file_path)
        if not path.exists():
            return {
                "success": False,
                "error": f"文件不存在: {file_path}",
                "data": "",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost_estimate": 0.0,
            }

        ext = path.suffix.lower()
        if ext not in (".srt", ".vtt", ".txt", ".md", ".json", ".csv"):
            return {
                "success": False,
                "error": f"不支持的文件类型: {ext}（支持 .srt .vtt .txt .md .json .csv）",
                "data": "",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost_estimate": 0.0,
            }

        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:
            return {
                "success": False,
                "error": f"读取文件失败: {str(exc)}",
                "data": "",
                "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0},
                "cost_estimate": 0.0,
            }

        # Trim to avoid exceeding context window (conservative 30K chars)
        if len(content) > 30000:
            content = content[:30000] + "\n...[文件内容已截断]"

        file_type_desc = {
            ".srt": "字幕文件(.srt)",
            ".vtt": "字幕文件(.vtt)",
            ".txt": "文本文件",
            ".md": "Markdown文档",
            ".json": "JSON数据",
            ".csv": "CSV表格",
        }.get(ext, "文本文件")

        system_prompt = (
            "你是一个专业的文档分析助手。请根据文件内容进行深入分析。"
            "用中文回复，结构清晰。"
        )

        if not instruction:
            instruction = "请分析这个文件的内容，给出摘要和关键信息。"

        user_prompt = (
            f"我正在分析一个{file_type_desc}。\n\n"
            f"分析要求: {instruction}\n\n"
            f"文件内容:\n---\n{content}\n---"
        )

        return self._chat_internal(user_prompt, system_prompt, temperature=0.5, max_tokens=2000)
