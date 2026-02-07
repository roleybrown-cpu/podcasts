"use client";

import { useEffect, useState } from "react";

type QueryResult = {
  id: string;
  episode_id: string;
  episode_title: string | null;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number | null;
};

export default function Home() {
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [episodeId, setEpisodeId] = useState("");
  const [metadata, setMetadata] = useState("{}");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [ingestStatus, setIngestStatus] = useState<string>("");

  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [queryStatus, setQueryStatus] = useState<string>("");
  const [speaker, setSpeaker] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [generateStatus, setGenerateStatus] = useState("");
  const [transcriptTopic, setTranscriptTopic] = useState("");
  const [transcriptStyle, setTranscriptStyle] = useState("Conversational");
  const [lengthMinutes, setLengthMinutes] = useState(6);
  const [lengthWords, setLengthWords] = useState(0);
  const [saveTranscript, setSaveTranscript] = useState(false);
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptId, setTranscriptId] = useState("");
  const [transcriptStatus, setTranscriptStatus] = useState("");
  const [generatedTranscript, setGeneratedTranscript] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/session");
        if (res.ok) {
          setIsAuthed(true);
        }
      } catch {
        // ignore
      }
    }
    checkSession();
  }, []);

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    setIngestStatus("Uploading...");

    const form = new FormData();
    form.append("episodeTitle", episodeTitle);
    form.append("episodeId", episodeId);
    form.append("metadata", metadata);
    form.append("text", text);
    if (file) form.append("file", file);

    const res = await fetch("/api/ingest", {
      method: "POST",
      body: form
    });

    const data = await res.json();
    if (!res.ok) {
      setIngestStatus(`Error: ${data.error || "Failed to ingest"}`);
      return;
    }

    setIngestStatus(`Ingested ${data.chunks} chunks for ${data.episodeId}`);
    setText("");
    setFile(null);
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    setQueryStatus("Searching...");

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        topK,
        episodeId: episodeId || undefined,
        speaker: speaker || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setQueryStatus(`Error: ${data.error || "Query failed"}`);
      return;
    }

    setResults(data.results || []);
    setQueryStatus(`Found ${data.results?.length || 0} matches`);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerateStatus("Generating...");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, topK })
    });

    const data = await res.json();
    if (!res.ok) {
      setGenerateStatus(`Error: ${data.error || "Generation failed"}`);
      return;
    }

    setDraft(data.draft || "");
    setGenerateStatus("Draft ready");
  }

  async function handleGenerateTranscript(e: React.FormEvent) {
    e.preventDefault();
    setTranscriptStatus("Generating...");

    const res = await fetch("/api/generate-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: transcriptTopic,
        style: transcriptStyle,
        topK,
        lengthMinutes,
        lengthWords,
        save: saveTranscript,
        episodeTitle: transcriptTitle,
        episodeId: transcriptId || undefined
      })
    });

    const data = await res.json();
    if (!res.ok) {
      setTranscriptStatus(`Error: ${data.error || "Generation failed"}`);
      return;
    }

    setGeneratedTranscript(data.transcript || "");
    if (data.saved) {
      setTranscriptStatus(`Saved as ${data.episodeId}`);
    } else {
      setTranscriptStatus("Transcript ready");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthStatus("Signing in...");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: adminToken })
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthStatus(`Error: ${data.error || "Login failed"}`);
      return;
    }
    setAuthStatus("Signed in");
    setIsAuthed(true);
    setAdminToken("");
  }

  return (
    <main className="page">
      <header className="nav">
        <div className="brand">
          <img src="/logo.png" alt="The Data Journey" className="logo" />
          <div>
            <p className="eyebrow">Podcast RAG Studio</p>
            <h1>The Data Journey</h1>
          </div>
        </div>
        <div className="nav-actions">
          <span className="pill">Supabase pgvector</span>
          <span className="pill">Local Embeddings</span>
        </div>
      </header>

      <section className="hero">
        <div>
          <h2>Upload transcripts. Query instantly. Draft new episodes.</h2>
          <p className="sub">
            Store your podcast transcripts in Supabase pgvector and use RAG to
            generate fresh outlines and full transcripts backed by your archive.
          </p>
        </div>
        <div className="hero-panel">
          <p className="hero-label">System Status</p>
          <div className="hero-metrics">
            <div>
              <span className="metric-label">Embeddings</span>
              <strong>Local</strong>
            </div>
            <div>
              <span className="metric-label">Vector DB</span>
              <strong>Supabase</strong>
            </div>
          </div>
          <p className="muted">
            Use the admin token to unlock API access. Then ingest, search, and
            generate from your archive.
          </p>
        </div>
      </section>

      {!isAuthed && (
        <section className="card">
          <h3>Admin Access</h3>
          <form onSubmit={handleLogin} className="form">
            <label>
              Admin Token
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Enter admin token"
              />
            </label>
            <button type="submit" className="btn-primary">
              Sign In
            </button>
            {authStatus && <p className="status">{authStatus}</p>}
          </form>
        </section>
      )}

      <section className="card">
        <h3>Ingest Transcript</h3>
        <form onSubmit={handleIngest} className="form">
          <label>
            Episode Title
            <input
              value={episodeTitle}
              onChange={(e) => setEpisodeTitle(e.target.value)}
              placeholder="Episode 12: The Future of AI"
            />
          </label>
          <label>
            Episode ID (optional)
            <input
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              placeholder="ep_2026_02_06"
            />
          </label>
          <label>
            Metadata (JSON)
            <textarea
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={3}
              placeholder='{"speaker":"Alicia","recorded_date":"2026-02-06T00:00:00Z"}'
            />
          </label>
          <label>
            Paste Transcript Text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="Paste transcript text here..."
            />
          </label>
          <label>
            Or Upload File (.txt or .docx)
            <input
              type="file"
              accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" className="btn-primary">
            Ingest Transcript
          </button>
          {ingestStatus && <p className="status">{ingestStatus}</p>}
        </form>
      </section>

      <section className="card">
        <h3>Search Transcript Archive</h3>
        <form onSubmit={handleQuery} className="form">
          <label>
            Query
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What did we say about AI regulation?"
            />
          </label>
          <label>
            Top K
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </label>
          <label>
            Speaker (optional)
            <input
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="Host name"
            />
          </label>
          <label>
            Date From (optional)
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label>
            Date To (optional)
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary">
            Search
          </button>
          {queryStatus && <p className="status">{queryStatus}</p>}
        </form>
        <div className="results">
          {results.map((row) => (
            <article key={row.id} className="result">
              <header>
                <strong>{row.episode_title || row.episode_id}</strong>
                {row.similarity !== null && (
                  <span>Similarity: {row.similarity.toFixed(3)}</span>
                )}
              </header>
              <p>{row.content}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Generate Draft From Archive</h3>
        <form onSubmit={handleGenerate} className="form">
          <label>
            Topic
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="The next wave of AI in healthcare"
            />
          </label>
          <label>
            Top K
            <input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </label>
          <button type="submit" className="btn-primary">
            Generate Draft
          </button>
          {generateStatus && <p className="status">{generateStatus}</p>}
        </form>
        {draft && (
          <div className="draft">
            <pre>{draft}</pre>
          </div>
        )}
      </section>

      <section className="card">
        <h3>Generate Full Transcript</h3>
        <form onSubmit={handleGenerateTranscript} className="form">
          <label>
            Topic
            <input
              value={transcriptTopic}
              onChange={(e) => setTranscriptTopic(e.target.value)}
              placeholder="AI assistants in creative workflows"
            />
          </label>
          <label>
            Style
            <input
              value={transcriptStyle}
              onChange={(e) => setTranscriptStyle(e.target.value)}
              placeholder="Conversational, solo host"
            />
          </label>
          <label>
            Target Length (minutes)
            <input
              type="number"
              min={1}
              max={90}
              value={lengthMinutes}
              onChange={(e) => setLengthMinutes(Number(e.target.value))}
            />
          </label>
          <label>
            Or Target Length (words)
            <input
              type="number"
              min={0}
              max={20000}
              value={lengthWords}
              onChange={(e) => setLengthWords(Number(e.target.value))}
            />
          </label>
          <label>
            Episode Title (optional)
            <input
              value={transcriptTitle}
              onChange={(e) => setTranscriptTitle(e.target.value)}
              placeholder="Episode 24: Creative AI Teams"
            />
          </label>
          <label>
            Episode ID (optional)
            <input
              value={transcriptId}
              onChange={(e) => setTranscriptId(e.target.value)}
              placeholder="gen_2026_02_06"
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={saveTranscript}
              onChange={(e) => setSaveTranscript(e.target.checked)}
            />
            Save generated transcript to vector database
          </label>
          <button type="submit" className="btn-primary">
            Generate Transcript
          </button>
          {transcriptStatus && <p className="status">{transcriptStatus}</p>}
        </form>
        {generatedTranscript && (
          <div className="draft">
            <pre>{generatedTranscript}</pre>
          </div>
        )}
      </section>
    </main>
  );
}
