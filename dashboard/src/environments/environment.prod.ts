export const environment = {
  production: true,
  fakeAPI: false,
  urlAPI: window.location.protocol + '//' + window.location.host + '/api/',
  wsAPI: (window.location.protocol == 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api/'
};