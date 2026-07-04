import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_DIR = process.env.RECEIPTS_DATA_DIR ?? path.join(process.cwd(), "data");
const DB_PATH = process.env.RECEIPTS_DB_PATH ?? path.join(DB_DIR, "receipts.db");

// Next.js dev server re-evaluates modules; keep one connection per process.
const globalForDb = globalThis as unknown as { __receiptsDb?: ReturnType<typeof createDb> };

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  migrate(sqlite);
  return drizzle(sqlite, { schema });
}

function migrate(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      name TEXT NOT NULL,
      grade TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS passages (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      source TEXT,
      grade_level TEXT,
      genre TEXT,
      reading_time_minutes INTEGER,
      vocab_notes TEXT,
      teacher_notes TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      passage_id TEXT NOT NULL,
      text TEXT NOT NULL,
      prompt_type TEXT NOT NULL,
      focus_skill TEXT,
      suggested_tags TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_rounds (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      passage_id TEXT NOT NULL,
      prompt_id TEXT NOT NULL,
      join_code TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'lobby',
      paused_from_phase TEXT,
      phase_ends_at INTEGER,
      paused_remaining_ms INTEGER,
      submissions_locked INTEGER NOT NULL DEFAULT 0,
      names_hidden INTEGER NOT NULL DEFAULT 1,
      join_locked INTEGER NOT NULL DEFAULT 0,
      settings TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_rounds_join_code ON game_rounds(join_code);
    CREATE TABLE IF NOT EXISTS student_sessions (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      session_token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_round ON student_sessions(round_id);
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      student_session_id TEXT NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      text TEXT NOT NULL,
      tag TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_annotations_round ON annotations(round_id);
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      student_session_id TEXT NOT NULL UNIQUE,
      claim TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      evidence_start INTEGER NOT NULL,
      evidence_end INTEGER NOT NULL,
      evidence_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      spotlighted INTEGER NOT NULL DEFAULT 0,
      submitted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_round ON submissions(round_id);
    CREATE TABLE IF NOT EXISTS peer_comparisons (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      reviewer_session_id TEXT NOT NULL,
      submission_a_id TEXT NOT NULL,
      submission_b_id TEXT NOT NULL,
      selected_submission_id TEXT,
      justification TEXT,
      criteria_used TEXT,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_comparisons_round ON peer_comparisons(round_id);
    CREATE INDEX IF NOT EXISTS idx_comparisons_reviewer ON peer_comparisons(reviewer_session_id);
    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL UNIQUE,
      revised_claim TEXT NOT NULL,
      revised_reasoning TEXT NOT NULL,
      revised_evidence_start INTEGER NOT NULL,
      revised_evidence_end INTEGER NOT NULL,
      revised_evidence_text TEXT NOT NULL,
      change_explanation TEXT NOT NULL,
      kept_original INTEGER NOT NULL DEFAULT 0,
      submitted_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      student_session_id TEXT NOT NULL,
      text TEXT NOT NULL,
      submitted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reflections_round ON reflections(round_id);
  `);
}

export const db = globalForDb.__receiptsDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__receiptsDb = db;

export * from "./schema";
