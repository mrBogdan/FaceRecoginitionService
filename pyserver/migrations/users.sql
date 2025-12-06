CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id bigserial PRIMARY KEY,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    face_embedding vector(512),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX ON users USING hnsw (face_embedding vector_cosine_ops);