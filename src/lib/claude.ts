import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PLATFORM_PROMPTS: Record<string, string> = {
  reddit: `生成一篇适合 Reddit 的帖子。需要：
  - 标题：吸引眼球，不超过 300 字符
  - 正文：详细、有价值，适当使用 Markdown
  - 语气：真实、接地气，像普通用户分享
  - 格式：JSON { "title": "...", "content": "..." }`,

  twitter: `生成适合 Twitter/X 的推文。需要：
  - 不超过 280 字符
  - 使用 1-3 个相关 hashtag
  - 简洁有力，引发互动
  - 格式：JSON { "content": "..." }`,

  hackernews: `生成适合 Hacker News 的帖子。需要：
  - 标题：简洁、技术性强，不超过 80 字符
  - 正文：深度、技术干货，面向开发者
  - 语气：专业、客观
  - 格式：JSON { "title": "...", "content": "..." }`,

  producthunt: `生成适合 Product Hunt 的产品推介。需要：
  - 标题：产品名称 + 一句话描述
  - tagline：不超过 60 字符的核心价值
  - 正文：功能亮点、使用场景、CTA
  - 格式：JSON { "title": "...", "tagline": "...", "content": "..." }`,

  weibo: `生成适合微博的推广内容。需要：
  - 不超过 140 字
  - 使用 2-3 个 #话题# 标签
  - 活泼、互动性强
  - 格式：JSON { "content": "..." }`,
};

export async function generateContent(
  platform: string,
  topic: string,
  description: string,
  tone: string,
  language: string
): Promise<{ title?: string; content: string; tagline?: string }> {
  const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.twitter;
  const langInstruction = language === 'zh' ? '用中文写作' : 'Write in English';

  const prompt = `你是一个专业的社交媒体营销专家。${langInstruction}。

推广主题：${topic}
${description ? `详细描述：${description}` : ''}
写作风格：${tone}

${platformPrompt}

只输出 JSON，不要其他文字。`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore parse error
  }

  return { content: text };
}

export async function generateBatch(
  platforms: string[],
  topic: string,
  description: string,
  tone: string,
  language: string
) {
  return Promise.all(
    platforms.map(async (platform) => ({
      platform,
      ...(await generateContent(platform, topic, description, tone, language)),
    }))
  );
}
