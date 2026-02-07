create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists transcript_chunks (
  id uuid primary key default gen_random_uuid(),
  episode_id text not null,
  episode_title text,
  chunk_index int not null,
  content text not null,
  embedding vector(384) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transcript_chunks_episode_idx
  on transcript_chunks (episode_id);

create index if not exists transcript_chunks_embedding_idx
  on transcript_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function match_transcript_chunks(
  query_embedding vector(384),
  match_count int default 5,
  filter_episode_id text default null,
  filter_speaker text default null,
  filter_date_from timestamptz default null,
  filter_date_to timestamptz default null
)
returns table (
  id uuid,
  episode_id text,
  episode_title text,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    transcript_chunks.id,
    transcript_chunks.episode_id,
    transcript_chunks.episode_title,
    transcript_chunks.content,
    transcript_chunks.metadata,
    1 - (transcript_chunks.embedding <=> query_embedding) as similarity
  from transcript_chunks
  where (filter_episode_id is null or transcript_chunks.episode_id = filter_episode_id)
    and (
      filter_speaker is null
      or transcript_chunks.metadata->>'speaker' ilike '%' || filter_speaker || '%'
    )
    and (
      filter_date_from is null
      or (
        coalesce(
          nullif(transcript_chunks.metadata->>'recorded_date', ''),
          nullif(transcript_chunks.metadata->>'date', '')
        )::timestamptz >= filter_date_from
      )
    )
    and (
      filter_date_to is null
      or (
        coalesce(
          nullif(transcript_chunks.metadata->>'recorded_date', ''),
          nullif(transcript_chunks.metadata->>'date', '')
        )::timestamptz <= filter_date_to
      )
    )
  order by transcript_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
