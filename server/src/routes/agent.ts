import express from 'express';
import { runSearchAgent } from '../services/searchAgent.js';

const router = express.Router();
/**
 * POST /api/agent/search
 * body: { message: string }
 *
 * 智能搜索 Agent：自然语言 → 意图 → 调用站内搜索工具 → 返回话术 + 视频列表
 * 无 LLM Key 时走规则引擎；配置 OPENAI_API_KEY 后可精炼意图。
 */
router.post('/search', async (req, res) => {
  try {
    const message = req.body?.message ?? req.body?.q ?? '';
    const data = await runSearchAgent({ message });
    const hasLlm = Boolean(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
    res.json({
      ...data,
      llmAvailable: hasLlm,
    });
  } catch (err: any) {
    console.error('agent/search error:', err);
    res.status(500).json({ message: err.message || '智能搜索失败' });
  }
});

router.get('/health', (req, res) => {
  const hasLlm = Boolean(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);
  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    process.env.LLM_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  const model =
    process.env.OPENAI_MODEL || process.env.LLM_MODEL || null;
  res.json({
    ok: true,
    mode: hasLlm ? 'llm+rule' : 'rule',
    model: hasLlm ? model : null,
    provider: hasLlm
      ? baseUrl.includes('deepseek')
        ? 'deepseek'
        : 'openai-compatible'
      : 'rule',
    tools: ['search_videos', 'search_shorts', 'list_categories'],
  });
});

export default router;