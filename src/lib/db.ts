import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'promoter.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      description TEXT,
      tone TEXT DEFAULT 'engaging',
      language TEXT DEFAULT 'zh',
      platforms TEXT NOT NULL DEFAULT '[]',
      schedule_cron TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      platform_post_id TEXT,
      scheduled_at TEXT,
      published_at TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS platform_configs (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL UNIQUE,
      config TEXT NOT NULL DEFAULT '{}',
      is_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS run_logs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      posts_created INTEGER DEFAULT 0,
      posts_published INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );
  `);
}

export type Campaign = {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  tone: string;
  language: string;
  platforms: string[];
  schedule_cron: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  campaign_id: string;
  platform: string;
  title: string | null;
  content: string;
  status: 'pending' | 'scheduled' | 'published' | 'failed';
  platform_post_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
};

export type PlatformConfig = {
  id: string;
  platform: string;
  config: Record<string, string>;
  is_enabled: boolean;
};
