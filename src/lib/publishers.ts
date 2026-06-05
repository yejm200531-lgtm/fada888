import { getDb } from './db';

export type PublishResult = {
  success: boolean;
  platform_post_id?: string;
  error?: string;
  url?: string;
};

async function publishToReddit(
  config: Record<string, string>,
  title: string,
  content: string
): Promise<PublishResult> {
  try {
    const snoowrap = require('snoowrap');
    const r = new snoowrap({
      userAgent: config.userAgent || 'AutoPromoter/1.0',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      username: config.username,
      password: config.password,
    });

    const subreddit = config.subreddit || 'test';
    const submission = await r.getSubreddit(subreddit).submitSelfpost({
      title,
      text: content,
    });

    return {
      success: true,
      platform_post_id: submission.id,
      url: `https://reddit.com${submission.permalink}`,
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function publishToTwitter(
  config: Record<string, string>,
  content: string
): Promise<PublishResult> {
  try {
    const { TwitterApi } = require('twitter-api-v2');
    const client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });

    const tweet = await client.v2.tweet(content);
    return {
      success: true,
      platform_post_id: tweet.data.id,
      url: `https://twitter.com/i/web/status/${tweet.data.id}`,
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function publishToSimulated(
  platform: string,
  title: string | undefined,
  content: string
): Promise<PublishResult> {
  // Simulated publish for platforms without real API config
  await new Promise((r) => setTimeout(r, 500));
  const fakeId = Math.random().toString(36).substring(2, 10);
  return {
    success: true,
    platform_post_id: fakeId,
    url: `https://${platform}.com/post/${fakeId}`,
  };
}

export async function publishPost(postId: string): Promise<PublishResult> {
  const db = getDb();

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as {
    id: string;
    platform: string;
    title: string | null;
    content: string;
  } | undefined;

  if (!post) return { success: false, error: 'Post not found' };

  const platformConfig = db
    .prepare('SELECT * FROM platform_configs WHERE platform = ? AND is_enabled = 1')
    .get(post.platform) as { config: string; is_enabled: number } | undefined;

  let result: PublishResult;
  const config = platformConfig ? JSON.parse(platformConfig.config) : {};

  const hasRealConfig =
    platformConfig &&
    platformConfig.is_enabled &&
    Object.keys(config).length > 0;

  if (!hasRealConfig) {
    result = await publishToSimulated(post.platform, post.title ?? undefined, post.content);
  } else if (post.platform === 'reddit') {
    result = await publishToReddit(config, post.title || post.content.slice(0, 100), post.content);
  } else if (post.platform === 'twitter' || post.platform === 'x') {
    result = await publishToTwitter(config, post.content);
  } else {
    result = await publishToSimulated(post.platform, post.title ?? undefined, post.content);
  }

  if (result.success) {
    db.prepare(`
      UPDATE posts SET
        status = 'published',
        platform_post_id = ?,
        published_at = datetime('now'),
        error = NULL
      WHERE id = ?
    `).run(result.platform_post_id, postId);

    // Record initial analytics
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO analytics (id, post_id, metric, value)
      VALUES (?, ?, 'views', 0), (?, ?, 'upvotes', 0), (?, ?, 'comments', 0)
    `).run(uuidv4(), postId, uuidv4(), postId, uuidv4(), postId);
  } else {
    db.prepare(`
      UPDATE posts SET status = 'failed', error = ? WHERE id = ?
    `).run(result.error, postId);
  }

  return result;
}
