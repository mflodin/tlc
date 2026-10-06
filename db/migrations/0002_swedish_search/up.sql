-- Treat å, ä and ö as letters of their own (as in Swedish) instead of folding them to a and o,
-- so "for" no longer matches "för". Case is still ignored. The triggers from 0001 keep
-- working because they refer to the table by name.
drop table songs_fts;

create virtual table songs_fts using fts5(
  title,
  artist,
  album,
  lyrics,
  content = 'songs',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 0'
);

insert into songs_fts (songs_fts) values ('rebuild');
