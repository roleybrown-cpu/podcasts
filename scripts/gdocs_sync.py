import argparse
import json
import os
import sys
from typing import List

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
DEFAULT_EMBEDDINGS_URL = "http://127.0.0.1:8001"
MAX_CHARS = 2000
OVERLAP_CHARS = 200


def chunk_text(text: str) -> List[str]:
    cleaned = text.replace("\r\n", "\n").strip()
    if not cleaned:
        return []

    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    chunks = []
    buffer = ""

    def flush():
        nonlocal buffer
        if buffer.strip():
            chunks.append(buffer.strip())
        if OVERLAP_CHARS > 0 and len(buffer) > OVERLAP_CHARS:
            buffer = buffer[-OVERLAP_CHARS:]
        else:
            buffer = ""

    for paragraph in paragraphs:
        if len(buffer) + len(paragraph) + 2 <= MAX_CHARS:
            buffer = f"{buffer}\n\n{paragraph}".strip() if buffer else paragraph
            continue

        if buffer:
            flush()

        if len(paragraph) <= MAX_CHARS:
            buffer = paragraph
            continue

        start = 0
        while start < len(paragraph):
            slice_ = paragraph[start : start + MAX_CHARS]
            chunks.append(slice_.strip())
            start += MAX_CHARS - OVERLAP_CHARS
        buffer = ""

    if buffer:
        flush()

    return chunks


def get_drive_service(creds_path: str):
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    return build("drive", "v3", credentials=credentials)


def list_docs(service, folder_id: str, since: str | None, limit: int | None):
    query = [
        f"'{folder_id}' in parents",
        "mimeType='application/vnd.google-apps.document'",
        "trashed=false",
    ]
    if since:
        query.append(f"modifiedTime > '{since}'")

    results = []
    page_token = None

    while True:
        response = (
            service.files()
            .list(
                q=" and ".join(query),
                fields="nextPageToken, files(id, name, modifiedTime)",
                pageSize=200,
                pageToken=page_token,
            )
            .execute()
        )
        results.extend(response.get("files", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            break
        if limit and len(results) >= limit:
            break

    if limit:
        return results[:limit]
    return results


def export_doc(service, doc_id: str) -> str:
    data = service.files().export(fileId=doc_id, mimeType="text/plain").execute()
    return data.decode("utf-8")


def embed_texts(embeddings_url: str, inputs: List[str]) -> List[List[float]]:
    res = requests.post(
        f"{embeddings_url}/embed",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"inputs": inputs}),
        timeout=120,
    )
    res.raise_for_status()
    payload = res.json()
    if "embeddings" not in payload:
        raise RuntimeError("Embeddings service returned invalid payload")
    return payload["embeddings"]


def supabase_headers(key: str):
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def delete_existing(base_url: str, key: str, episode_id: str):
    url = f"{base_url}/rest/v1/transcript_chunks?episode_id=eq.{episode_id}"
    res = requests.delete(url, headers=supabase_headers(key), timeout=30)
    res.raise_for_status()


def insert_rows(base_url: str, key: str, rows: List[dict]):
    url = f"{base_url}/rest/v1/transcript_chunks"
    res = requests.post(
        url,
        headers={
            **supabase_headers(key),
            "Prefer": "return=minimal",
        },
        data=json.dumps(rows),
        timeout=60,
    )
    res.raise_for_status()


def main():
    parser = argparse.ArgumentParser(description="Sync Google Docs to Supabase")
    parser.add_argument("--folder-id", required=True)
    parser.add_argument("--creds", required=True, help="Path to service account JSON")
    parser.add_argument("--replace", action="store_true", help="Replace existing chunks")
    parser.add_argument("--since", help="Only include docs modified after RFC3339 timestamp")
    parser.add_argument("--limit", type=int, help="Limit number of docs")
    parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    embeddings_url = os.getenv("EMBEDDINGS_URL", DEFAULT_EMBEDDINGS_URL)

    if not supabase_url or not supabase_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    service = get_drive_service(args.creds)
    docs = list_docs(service, args.folder_id, args.since, args.limit)

    print(f"Found {len(docs)} docs")

    for doc in docs:
        doc_id = doc["id"]
        name = doc["name"]
        modified = doc.get("modifiedTime")

        text = export_doc(service, doc_id)
        chunks = chunk_text(text)

        if not chunks:
            print(f"Skipping {name}: no content")
            continue

        if args.dry_run:
            print(f"{name}: {len(chunks)} chunks (dry run)")
            continue

        embeddings = embed_texts(embeddings_url, chunks)

        rows = []
        for idx, chunk in enumerate(chunks):
            rows.append(
                {
                    "episode_id": doc_id,
                    "episode_title": name,
                    "chunk_index": idx,
                    "content": chunk,
                    "embedding": embeddings[idx],
                    "metadata": {
                        "source": "google_docs",
                        "doc_id": doc_id,
                        "doc_modified": modified,
                    },
                }
            )

        if args.replace:
            delete_existing(supabase_url, supabase_key, doc_id)

        batch_size = 100
        for start in range(0, len(rows), batch_size):
            insert_rows(supabase_url, supabase_key, rows[start : start + batch_size])

        print(f"Synced {name}: {len(rows)} chunks")


if __name__ == "__main__":
    main()
