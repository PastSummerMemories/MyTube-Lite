import {

  searchVideos,
  listCategories,
  searchShorts,
} from './videoSearch.js';
const DATE_LABEL = {
  today: '今天',
  week: '本周',
  month: '本月',
};

const SORT_LABEL = {
  relevance: '相关度',
  latest: '最新上传',
  views: '播放最多',
  likes: '点赞最多',
};

const HELP_REPLY = `我是站内智能搜索助手，可以帮你用自然语言找视频。

你可以这样问我：
· 「本周最火的游戏视频」
· 「动漫分区最新上传」
· 「找一些音乐 Shorts」
· 「点赞最多的娱乐内容」

我会识别分区、时间、排序和 Shorts，再调用站内搜索工具给你结果。直接说想看什么就行～`;

function stripNoise(text) {
  return String(text || '')
    .replace(
      /(帮我|给我|请|一下|看看|找找|找一些|找点|来点|搜索|检索|有没有|想看|想找|推荐)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCategory(message, categories) {
  const text = String(message || '');
  for (const cat of categories) {
    if (cat?.name && text.includes(cat.name)) {
      return cat;
    }
  }
  return null;
}

/** 寒暄 / 能力询问：不走搜索 */
function detectNonSearchAction(message) {
  const raw = String(message || '').trim();
  if (!raw) return null;

  // 纯打招呼
  if (
    /^(你好|您好|嗨|哈喽|hello|hi|hey|早|晚上好|下午好)([\s!！.?？~啊呀嘛]*)$/i.test(
      raw
    )
  ) {
    return 'chat';
  }

  // 问能力 / 身份 / 用法（且不像在找片）
  const asksMeta =
    /(你能做|你会什么|你可以做|你是谁|做什么的|怎么用|如何使用|有什么功能|能帮我做什么|帮助|介绍一下你|help)/i.test(
      raw
    );
  const looksLikeSearch =
    /(视频|shorts|短视频|找|搜|看|推荐|分区|最火|热门|最新|点赞|播放|动漫|游戏|音乐|娱乐)/i.test(
      raw
    );

  if (asksMeta && !looksLikeSearch) return 'help';

  return null;
}

function buildChatReply(action) {
  if (action === 'help') return HELP_REPLY;
  return `你好！我是智能搜索助手，可以帮你在站内找视频或 Shorts。\n\n试着说：「本周最火的游戏视频」或「音乐 Shorts」。也可以问我「你能做什么」。`;
}

/** 规则引擎：把自然语言收成可执行搜索参数 */
function parseIntentByRules(message, categories = []) {
  const raw = String(message || '').trim();
  const text = raw.toLowerCase();

  const nonSearch = detectNonSearchAction(raw);
  if (nonSearch) {
    return {
      action: nonSearch,
      reply: buildChatReply(nonSearch),
      q: '',
      category_id: null,
      category_name: null,
      date: null,
      sort: 'relevance',
      type: 'video',
      limit: 8,
    };
  }

  let date: string | null = null;
  if (/今天|今日|当天/.test(raw)) date = 'today';
  else if (/本周|这一周|最近一周|近一周|这周/.test(raw)) date = 'week';
  else if (/本月|这个月|最近一月|近一个月/.test(raw)) date = 'month';

  let sort = 'relevance';
  if (/最火|热门|最多播放|播放最多|爆款|高播放/.test(raw)) sort = 'views';
  else if (/最多点赞|点赞最多|高赞/.test(raw)) sort = 'likes';
  else if (/最新|最近上传|刚上传|新发布/.test(raw)) sort = 'latest';

  const wantShorts = /shorts|短视频|短片/.test(text) || /短视频|短片/.test(raw);
  const category = matchCategory(raw, categories);

  let q = stripNoise(raw);
  const dropPatterns = [
    /今天|今日|当天/g,
    /本周|这一周|最近一周|近一周|这周/g,
    /本月|这个月|最近一月|近一个月/g,
    /最火|热门|最多播放|播放最多|爆款|高播放/g,
    /最多点赞|点赞最多|高赞/g,
    /最新|最近上传|刚上传|新发布/g,
    /shorts|短视频|短片/gi,
    /分区|分类|频道|视频|内容/g,
  ];
  for (const re of dropPatterns) q = q.replace(re, ' ');
  if (category?.name) {
    q = q.replace(
      new RegExp(category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      ' '
    );
  }
  q = q
    .replace(/[的了吗呢吧啊呀嘛呗嘞？?！!。.~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^(上传|发布|视频|内容|东西|片子|相关)$/.test(q)) {
    q = '';
  }

  // 没有可用筛选信号时，才把原句当关键词；寒暄类不应落到这里
  const hasSignal = Boolean(category || date || wantShorts || sort !== 'relevance' || q);
  if (!hasSignal) {
    return {
      action: 'help',
      reply: `我不太确定你想找什么。\n\n${HELP_REPLY}`,
      q: '',
      category_id: null,
      category_name: null,
      date: null,
      sort: 'relevance',
      type: 'video',
      limit: 8,
    };
  }

  return {
    action: 'search',
    reply: '',
    q,
    category_id: category?.id ?? null,
    category_name: category?.name ?? null,
    date,
    sort: q || category || date ? sort : sort === 'relevance' ? 'latest' : sort,
    type: wantShorts ? 'shorts' : 'video',
    limit: 8,
  };
}

async function callLlmJson({ system, user, temperature = 0.2 }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    process.env.LLM_BASE_URL ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '');
  const model =
    process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4o-mini';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('LLM call failed:', res.status, errText.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (err: any) {
    console.warn('LLM call error:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function refineIntentWithLlm(message, categories, baseIntent) {
  const catalog = categories.map((c) => `${c.id}:${c.name}`).join(', ');
  const system = `你是视频网站的智能搜索助手。先判断用户意图，再决定是否搜索。只输出 JSON，不要 markdown。

字段：
- action: "chat" | "help" | "search"
- reply: string 给用户的自然语言回复（简洁、友好；search 时也可先说一句理解）
- q: string 搜索关键词，可空；去掉口语；不要把整句寒暄当关键词
- category_id: number|null 必须来自分类列表
- date: "today"|"week"|"month"|null
- sort: "relevance"|"latest"|"views"|"likes"
- type: "video"|"shorts"
- limit: 1-12 整数

分类列表：${catalog || '无'}

判定规则：
1. 打招呼、闲聊、致谢 → action=chat，不要搜索
2. 问你是谁/能做什么/怎么用 → action=help，不要搜索
3. 明确或隐含想找视频/Shorts/某分区/热门/最新 → action=search
4. search 时：没提分类 category_id=null；没提时间 date=null；短视频才 shorts
5. 绝不要把「你好」「你能做些什么」之类当成 q`;

  const user = `用户说：${message}
规则引擎初解：${JSON.stringify(baseIntent)}
请输出最终 JSON。`;

  const parsed = await callLlmJson({ system, user, temperature: 0.2 });
  if (!parsed) return null;

  const action = ['chat', 'help', 'search'].includes(parsed.action)
    ? parsed.action
    : 'search';

  if (action !== 'search') {
    return {
      action,
      reply: String(parsed.reply || '').trim() || buildChatReply(action),
      q: '',
      category_id: null,
      category_name: null,
      date: null,
      sort: 'relevance',
      type: 'video',
      limit: 8,
    };
  }

  const validDates = new Set(['today', 'week', 'month']);
  const validSorts = new Set(['relevance', 'latest', 'views', 'likes']);
  const catId = parsed.category_id != null ? Number(parsed.category_id) : null;
  const cat = categories.find((c) => Number(c.id) === catId) || null;
  let q = String(parsed.q || '').trim();

  // 防呆：整句其实是寒暄/帮助，却被标成 search
  const forced = detectNonSearchAction(message);
  if (forced) {
    return {
      action: forced,
      reply: String(parsed.reply || '').trim() || buildChatReply(forced),
      q: '',
      category_id: null,
      category_name: null,
      date: null,
      sort: 'relevance',
      type: 'video',
      limit: 8,
    };
  }

  return {
    action: 'search',
    reply: String(parsed.reply || '').trim(),
    q,
    category_id: cat ? cat.id : null,
    category_name: cat ? cat.name : null,
    date: validDates.has(parsed.date) ? parsed.date : null,
    sort: validSorts.has(parsed.sort) ? parsed.sort : baseIntent.sort,
    type: parsed.type === 'shorts' ? 'shorts' : 'video',
    limit: Math.min(Math.max(parseInt(parsed.limit, 10) || 8, 1), 12),
  };
}

function buildSearchReply(intent, result, llmLead = '') {
  const parts: string[] = [];
  if (intent.type === 'shorts') parts.push('Shorts');
  else parts.push('视频');
  if (intent.q) parts.push(`关键词「${intent.q}」`);
  if (intent.category_name) parts.push(`分区「${intent.category_name}」`);
  if (intent.date) parts.push(DATE_LABEL[intent.date] || intent.date);
  if (intent.sort) parts.push(`按${SORT_LABEL[intent.sort] || intent.sort}`);

  const total = result.totalVideos ?? result.videos?.length ?? 0;
  const shown = result.videos?.length ?? 0;
  const head =
    total > 0
      ? `找到 ${total} 条相关结果，先展示 ${shown} 条。`
      : '没有找到匹配结果。可以换个关键词，或放宽时间/分区条件再试试。';

  const filterDesc = parts.length ? `筛选条件：${parts.join(' · ')}。` : '';
  const lead = llmLead ? `${llmLead.replace(/[。.!！]?$/, '')}。` : '';

  return `${lead}${head}${filterDesc}`.trim();
}

function toClassicSearchPath(intent) {
  const params = new URLSearchParams();
  if (intent.q) params.set('q', intent.q);
  if (intent.category_id) params.set('category_id', String(intent.category_id));
  if (intent.date) params.set('date', intent.date);
  if (intent.sort) params.set('sort', intent.sort);
  const qs = params.toString();
  return qs ? `/Search?${qs}` : '/Search';
}

/**
 * 智能搜索 Agent：先分流闲聊/帮助/搜索，再调用工具
 */
async function runSearchAgent({ message }) {
  const text = String(message || '').trim();
  if (!text) {
    return {
      reply: HELP_REPLY,
      intent: { action: 'help' },
      videos: [],
      mode: 'rule',
      classicSearchPath: null,
      toolsUsed: [],
    };
  }

  const categories = await listCategories();
  const ruleIntent = parseIntentByRules(text, categories);
  const llmIntent = await refineIntentWithLlm(text, categories, ruleIntent);
  const intent = llmIntent || ruleIntent;
  const mode = llmIntent ? 'llm' : 'rule';

  // 闲聊 / 帮助：不调用搜索
  if (intent.action === 'chat' || intent.action === 'help') {
    return {
      reply: intent.reply || buildChatReply(intent.action),
      intent: {
        action: intent.action,
        q: '',
        category_id: null,
        category_name: null,
        date: null,
        sort: null,
        type: null,
      },
      videos: [],
      mode,
      classicSearchPath: null,
      toolsUsed: [],
    };
  }

  const toolParams = {
    q: intent.q,
    category_id: intent.category_id,
    date: intent.date || undefined,
    sort: intent.sort,
    limit: intent.limit || 8,
    page: 1,
  };

  const result =
    intent.type === 'shorts'
      ? await searchShorts(toolParams)
      : await searchVideos(toolParams);

  const videos = (result.videos || []).map((v) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    thumbnail: v.thumbnail,
    video_url: v.video_url,
    duration: v.duration,
    views: v.views,
    likes: v.likes,
    channel: v.channel,
    channel_avatar: v.channel_avatar,
    author: v.author,
    uploaded_at: v.uploaded_at,
    is_short: intent.type === 'shorts',
  }));

  return {
    reply: buildSearchReply(intent, result, intent.reply),
    intent: {
      action: 'search',
      q: intent.q,
      category_id: intent.category_id,
      category_name: intent.category_name,
      date: intent.date,
      sort: intent.sort,
      type: intent.type,
      limit: intent.limit,
      totalVideos: result.totalVideos,
    },
    videos,
    mode,
    classicSearchPath: toClassicSearchPath(intent),
    toolsUsed: [intent.type === 'shorts' ? 'search_shorts' : 'search_videos'],
  };
}

export { runSearchAgent, parseIntentByRules, detectNonSearchAction };