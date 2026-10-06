create table songs (
  id integer primary key,
  artist_slug text not null,
  song_slug text not null,
  title text not null check (length(trim(title)) > 0),
  artist text not null check (length(trim(artist)) > 0),
  album text,
  song_key text,
  capo text,
  -- ChordPro text without the metadata directives stored in the columns above.
  body text not null default '',
  -- Plain lyrics derived from body, kept for full-text search.
  lyrics text not null default '',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  unique (artist_slug, song_slug)
);

-- Full-text index over songs. remove_diacritics lets "angen" find "ängen".
create virtual table songs_fts using fts5(
  title,
  artist,
  album,
  lyrics,
  content = 'songs',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);

create trigger songs_fts_insert after insert on songs begin
  insert into songs_fts (rowid, title, artist, album, lyrics)
  values (new.id, new.title, new.artist, coalesce(new.album, ''), new.lyrics);
end;

create trigger songs_fts_delete after delete on songs begin
  insert into songs_fts (songs_fts, rowid, title, artist, album, lyrics)
  values ('delete', old.id, old.title, old.artist, coalesce(old.album, ''), old.lyrics);
end;

create trigger songs_fts_update after update on songs begin
  insert into songs_fts (songs_fts, rowid, title, artist, album, lyrics)
  values ('delete', old.id, old.title, old.artist, coalesce(old.album, ''), old.lyrics);
  insert into songs_fts (rowid, title, artist, album, lyrics)
  values (new.id, new.title, new.artist, coalesce(new.album, ''), new.lyrics);
end;

create table setlists (
  id integer primary key,
  slug text not null unique,
  name text not null check (length(trim(name)) > 0)
);

create table setlist_songs (
  setlist_id integer not null references setlists (id) on delete cascade,
  song_id integer not null references songs (id) on delete cascade,
  position integer not null,
  primary key (setlist_id, song_id)
);

create index setlist_songs_song_id on setlist_songs (song_id);
