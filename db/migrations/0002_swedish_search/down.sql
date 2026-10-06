drop table songs_fts;

create virtual table songs_fts using fts5(
  title,
  artist,
  album,
  lyrics,
  content = 'songs',
  content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);

insert into songs_fts (songs_fts) values ('rebuild');
