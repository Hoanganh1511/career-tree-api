-- Full-text search cho Message.content (xem docs/chat-search-architecture.md
-- de biet ly do chon huong nay thay vi search engine rieng).

-- "unaccent" la extension contrib chuan cua Postgres (co san tren Neon/hau
-- het managed Postgres) - dung de nguoi dung go KHONG dau van tim ra tin
-- nhan CO dau va nguoc lai (yeu cau UX rat pho bien voi nguoi dung Viet Nam).
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() built-in la STABLE (khong phai IMMUTABLE) vi ve mat ly thuyet
-- dictionary co the doi qua search_path - Postgres KHONG cho dung ham STABLE
-- trong bieu thuc cot GENERATED. Wrapper nay goi thang dictionary "unaccent"
-- CO DINH (khong tra qua search_path) nen an toan de khai bao IMMUTABLE -
-- day la cach lam chuan, pho bien de dung unaccent() trong generated column.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Cot GENERATED ALWAYS ... STORED - Postgres tu tinh lai moi khi content
-- doi (insert/update), khong can trigger rieng. Dung config "simple" (chi
-- tokenize + lowercase, KHONG stemming) thay vi "english" vi noi dung chu
-- yeu la tieng Viet - Postgres khong co dictionary tieng Viet built-in tot,
-- "simple" + unaccent la huong don gian/on dinh nhat (xem docs). unaccent
-- duoc ap dung TRUOC to_tsvector nen ca ban co dau lan khong dau cua CUNG 1
-- tu deu sinh ra token giong nhau - phia query (ChatSearchService) cung phai
-- unaccent() input truoc khi dua vao websearch_to_tsquery de khop dung.
ALTER TABLE "Message" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', immutable_unaccent(coalesce("content", '')))
  ) STORED;

-- GIN index rieng tren searchVector - KHONG gop chung 1 index GIN voi
-- conversationId (can extension "btree_gin" moi lam duoc, chua can thiet o
-- quy mo hien tai). Planner tu ket hop index nay voi index btree san co tren
-- conversationId (@@index([conversationId, createdAt])) qua Bitmap And khi
-- query loc theo ca 2 dieu kien - xem docs/chat-search-architecture.md muc
-- "Khi nao can nghi lai".
CREATE INDEX "Message_searchVector_idx" ON "Message" USING GIN ("searchVector");
