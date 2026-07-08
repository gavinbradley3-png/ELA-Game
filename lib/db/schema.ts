import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Data model per DESIGN.md §30, adapted for the Evidence Battle MVP:
 * - One evidence selection per submission, so it is inlined on `submissions`.
 * - Vote + PeerJustification are inlined on `peer_comparisons` (one vote and
 *   one justification per assigned comparison).
 * Timestamps are unix ms integers. JSON columns are stored as text.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const classes = sqliteTable("classes", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  name: text("name").notNull(),
  grade: text("grade"),
  archived: integer("archived").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const passages = sqliteTable("passages", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  source: text("source"),
  gradeLevel: text("grade_level"),
  genre: text("genre"),
  readingTimeMinutes: integer("reading_time_minutes"),
  vocabNotes: text("vocab_notes"),
  teacherNotes: text("teacher_notes"),
  archived: integer("archived").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const prompts = sqliteTable("prompts", {
  id: text("id").primaryKey(),
  passageId: text("passage_id").notNull(),
  text: text("text").notNull(),
  promptType: text("prompt_type").notNull(),
  focusSkill: text("focus_skill"),
  suggestedTags: text("suggested_tags"), // JSON string[]
  createdAt: integer("created_at").notNull(),
});

export const gameRounds = sqliteTable("game_rounds", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  classId: text("class_id").notNull(),
  passageId: text("passage_id").notNull(),
  promptId: text("prompt_id").notNull(),
  joinCode: text("join_code").notNull(),
  phase: text("phase").notNull().default("lobby"),
  // Phase the round was in when paused; null when not paused.
  pausedFromPhase: text("paused_from_phase"),
  // Timer: absolute deadline for the current phase; null = no timer running.
  phaseEndsAt: integer("phase_ends_at"),
  // Remaining ms captured at pause time so resume can restore the timer.
  pausedRemainingMs: integer("paused_remaining_ms"),
  submissionsLocked: integer("submissions_locked").notNull().default(0),
  namesHidden: integer("names_hidden").notNull().default(1),
  joinLocked: integer("join_locked").notNull().default(0),
  settings: text("settings").notNull(), // JSON RoundSettings
  createdAt: integer("created_at").notNull(),
  startedAt: integer("started_at"),
  endedAt: integer("ended_at"),
});

export const studentSessions = sqliteTable("student_sessions", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  displayName: text("display_name").notNull(),
  sessionToken: text("session_token").notNull(),
  status: text("status").notNull().default("active"), // active | removed
  joinedAt: integer("joined_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
});

export const annotations = sqliteTable("annotations", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  studentSessionId: text("student_session_id").notNull(),
  startOffset: integer("start_offset").notNull(),
  endOffset: integer("end_offset").notNull(),
  text: text("text").notNull(),
  tag: text("tag").notNull(),
  note: text("note"),
  createdAt: integer("created_at").notNull(),
});

export const submissions = sqliteTable("submissions", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  studentSessionId: text("student_session_id").notNull().unique(),
  claim: text("claim").notNull(),
  reasoning: text("reasoning").notNull(),
  confidence: integer("confidence").notNull(), // 1..4
  evidenceStart: integer("evidence_start").notNull(),
  evidenceEnd: integer("evidence_end").notNull(),
  evidenceText: text("evidence_text").notNull(),
  status: text("status").notNull().default("submitted"), // submitted | removed
  spotlighted: integer("spotlighted").notNull().default(0),
  submittedAt: integer("submitted_at").notNull(),
});

export const peerComparisons = sqliteTable("peer_comparisons", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  reviewerSessionId: text("reviewer_session_id").notNull(),
  submissionAId: text("submission_a_id").notNull(),
  submissionBId: text("submission_b_id").notNull(),
  // Vote (null until the reviewer completes the comparison).
  selectedSubmissionId: text("selected_submission_id"),
  justification: text("justification"),
  criteriaUsed: text("criteria_used"), // JSON string[]
  completedAt: integer("completed_at"),
  createdAt: integer("created_at").notNull(),
});

export const revisions = sqliteTable("revisions", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull().unique(),
  revisedClaim: text("revised_claim").notNull(),
  revisedReasoning: text("revised_reasoning").notNull(),
  revisedEvidenceStart: integer("revised_evidence_start").notNull(),
  revisedEvidenceEnd: integer("revised_evidence_end").notNull(),
  revisedEvidenceText: text("revised_evidence_text").notNull(),
  changeExplanation: text("change_explanation").notNull(),
  keptOriginal: integer("kept_original").notNull().default(0),
  submittedAt: integer("submitted_at").notNull(),
});

export const reflections = sqliteTable("reflections", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  studentSessionId: text("student_session_id").notNull(),
  text: text("text").notNull(),
  submittedAt: integer("submitted_at").notNull(),
});

export type User = typeof users.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type Passage = typeof passages.$inferSelect;
export type Prompt = typeof prompts.$inferSelect;
export type GameRound = typeof gameRounds.$inferSelect;
export type StudentSession = typeof studentSessions.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type PeerComparison = typeof peerComparisons.$inferSelect;
export type Revision = typeof revisions.$inferSelect;
export type Reflection = typeof reflections.$inferSelect;
