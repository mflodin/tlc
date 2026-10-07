import { get, post, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: get('/'),
  login: get('/login'),
  loginAction: post('/login'),
  logout: post('/logout'),
  account: get('/account'),
  accountAction: post('/account'),
  songs: {
    new: get('/songs/new'),
    create: post('/songs/new'),
    paste: get('/songs/paste'),
    convert: post('/songs/paste'),
    show: get('/songs/:artist/:song'),
    edit: get('/songs/:artist/:song/edit'),
    update: post('/songs/:artist/:song/edit'),
    confirmDelete: get('/songs/:artist/:song/delete'),
    destroy: post('/songs/:artist/:song/delete'),
    addToSetlist: post('/songs/:artist/:song/setlists'),
  },
  setlists: {
    index: get('/setlists'),
    create: post('/setlists'),
    show: get('/setlists/:id'),
    update: post('/setlists/:id'),
    destroy: post('/setlists/:id/delete'),
    play: get('/setlists/:id/play/:pos'),
  },
})
