export const environment = {
  production: true,
  fakeAPI: false,
  urlAPI: window.location.protocol + '//' + window.location.host + '/api/',
  wsAPI: (window.location.protocol == 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api/',
  version: 'release' // Do not change this value as the CI will try to replace it!
};