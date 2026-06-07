// Per-user data access for Adept (client-side; Row-Level Security enforces
// isolation server-side). Column names are snake_case to match Postgres.
import { createClient } from "./supabase/client";

export type TopicRow = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  target_level: string | null;
  assessment: unknown | null;
  curriculum: unknown; // jsonb array
  created_at: string;
  updated_at: string;
};

export type FlashcardRow = {
  id: string;
  user_id: string;
  topic_id: string;
  module_id: string | null;
  front: string;
  back: string;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: string | null;
  created_at: string;
};

async function userId(): Promise<string> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return user.id;
}

// ── topics ───────────────────────────────────────────────────────────────────
export async function listTopics(): Promise<TopicRow[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from("topics")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTopic(slug: string): Promise<TopicRow | null> {
  const sb = createClient();
  const { data, error } = await sb.from("topics").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTopic(input: {
  title: string;
  slug: string;
  target_level?: string | null;
  assessment?: unknown;
  curriculum?: unknown;
}): Promise<TopicRow> {
  const sb = createClient();
  const { data, error } = await sb
    .from("topics")
    .insert({
      user_id: await userId(),
      title: input.title,
      slug: input.slug,
      target_level: input.target_level ?? null,
      assessment: input.assessment ?? null,
      curriculum: input.curriculum ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTopic(
  id: string,
  fields: Partial<Pick<TopicRow, "target_level" | "assessment" | "curriculum">>,
): Promise<void> {
  const sb = createClient();
  const { error } = await sb
    .from("topics")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("topics").delete().eq("id", id);
  if (error) throw error;
}

// ── flashcards ───────────────────────────────────────────────────────────────
export async function listFlashcards(topicId: string): Promise<FlashcardRow[]> {
  const sb = createClient();
  const { data, error } = await sb.from("flashcards").select("*").eq("topic_id", topicId);
  if (error) throw error;
  return data ?? [];
}

export async function insertFlashcards(
  topicId: string,
  cards: { module_id: string; front: string; back: string }[],
): Promise<void> {
  if (!cards.length) return;
  const sb = createClient();
  const uid = await userId();
  const { error } = await sb.from("flashcards").insert(
    cards.map((c) => ({
      user_id: uid,
      topic_id: topicId,
      module_id: c.module_id,
      front: c.front,
      back: c.back,
    })),
  );
  if (error) throw error;
}

export async function updateFlashcard(
  id: string,
  fields: Partial<Pick<FlashcardRow, "ease" | "interval_days" | "reps" | "due_at">>,
): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("flashcards").update(fields).eq("id", id);
  if (error) throw error;
}
