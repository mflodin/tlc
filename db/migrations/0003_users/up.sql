create table users (
  id integer primary key,
  username text not null unique collate nocase check (length(trim(username)) > 0),
  password_hash text not null,
  role text not null check (role in ('viewer', 'editor')),
  -- Stored in the session; bumping it logs out every existing session for the user.
  session_version integer not null default 1,
  created_at text not null default (datetime('now'))
);
