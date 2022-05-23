import { Injectable, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';

export interface APIUser {
  name: string
  limit: number
}
export interface APITokenInfo {
  expires: Date | null,
  user: APIUser
}
export interface APIIP {
  name: string;
  ip: string;
  added: Date;
  expires: Date | null;
}
export interface APIProvision {
  state: boolean;
  since: Date | null;
}
export interface APIVersionInfo {
  healthy: boolean;
  version: string;
}
export interface APIScope {
  id: string
  name: string
  url: URL
}

@Injectable({
  providedIn: 'root'
})
export class APIService {
  private readonly storageKeyName: string = 'token';
  private readonly fakeEverything: boolean = environment.fakeAPI;
  private ownToken: string | null = null;
  private ownTokenInfo: null | Promise<APITokenInfo | null>;
  private ownTokenTimeout?: any = null;
  private ownTokenEventEmitter: EventEmitter<APITokenInfo | null> = new EventEmitter();
  private startLoading?: any = null;
  private stopLoading?: any = null;
  private websocket: WebSocket | null = null;
  private websocketTimeout: number = 0;
  private provisionEventEmitter: EventEmitter<APIProvision | null> = new EventEmitter();
  public loading: boolean = false;

  constructor() {
    // Try to load last valid token from localStorage
    this.ownTokenInfo = null; // Will be set explicitly with the next calls
    if(localStorage.getItem(this.storageKeyName) !== null)
      this.setOwnToken(localStorage.getItem('token'));
    else
      this.setOwnToken(null);
    // TODO While the "this.setOwnToken(...)" is fast, there is a very small chance that an
    // other actor tries to get the answer to e.g. "hasOwnToken()"" - before the Promise was
    // set (resolve or reject is irrelevant). For now just "(this.ownTokenInfo!)" is used,
    // so the code crashes in case these calls happen too early.
  }

  private async _request(method: string, operator: string, params: any | null = null, data: any | null = null): Promise<any | null> {
    if(this.fakeEverything) {
      await new Promise((res) => { setTimeout(res, Math.floor(Math.random() * 4200)); });
      console.warn('Request emulation is active!', this.ownToken, operator, data);
      if(operator === 'token/create/oauth2')
        return {token: 'dummy'};
      else if(operator === 'token/info')
        return {user: {name: 'dummy'}};
      else if(operator === 'ip/add')
          return {id: Math.random(), name: data!.name, ip: data!.ip, added: new Date(), expires: new Date()};
      else if(operator === 'ip/delete')
        return;
      else if(operator === 'ip/public')
        return {ip: '1.2.3.4'};
      else if(operator === 'provision/state')
        return {state: (new Date()).getMinutes() % 2, since: new Date()};
      else if(operator === 'ip/list')
        return {ips: [{id: Math.random(), name: 'Dummy', ip: '1.1.1.1', expires: new Date(), added: new Date()}]};
      else
        throw {code: 404, error: 'Not found'};
    }

    const paramsAsQuery = new URLSearchParams();
    for(const key in params)
      paramsAsQuery.append(key, params[key]);
    const formDataAsQuery = new URLSearchParams(); // Do not use FormData, as they would be multipart, which is not supported by the backend (at least for authentication)!
    for(const key in data)
      formDataAsQuery.append(key, data[key]);

    let headers = new Headers({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    if(this.ownToken)
      headers.set('Authorization', 'Bearer ' + this.ownToken);
    const resp = await fetch(environment.urlAPI + operator + (params !== null ? ('?' + paramsAsQuery) : ''), {
      method: method,
      cache: 'no-cache',
      headers: headers,
      body: (method.toLowerCase() != 'get' && method.toLowerCase() != 'head') ? formDataAsQuery : null
    });
    const json = resp.json();
    if(resp.ok)
      return json;
    else
      throw await json;
  }

  private async request(method: string, operator: string, params: any | null = null, data: any | null = null, background: boolean = false): Promise<any | null> {
    // The loading flag will be set after 100ms of initial request and be unset 1000ms after complection!
    if(!background) {
      if(this.stopLoading !== null)
        clearTimeout(this.stopLoading);
      this.stopLoading = null;
      this.startLoading = setTimeout(() => {
        this.loading = true; // To prevent angular from complaining
      }, 100);
    }
    try {
      return await this._request(method, operator, params, data);
    } catch(e) {
      throw e;
    } finally {
      if(!background) {
        if(this.startLoading !== null) {
          clearTimeout(this.startLoading);
          this.startLoading = null;
        }
        if(this.stopLoading === null) {
          this.stopLoading = setTimeout(() => {
            this.stopLoading = null;
            this.loading = false;
          }, 1000);
        }
      }
    }
  }

  private async validateOwnToken(): Promise<APITokenInfo | null> {
    this.disableWebsocket(); // Close the current websocket as the token changed
    // ALWAYS assign the return of this function to this.ownTokenInfo!!!
    let tokenInfo: APITokenInfo | null;
    try {
      let c = (await this.request('get', 'token/info'))!;
      tokenInfo = {expires: new Date(c.expires), user: {name: c.user.name, limit: c.user.limit}}; // Parse only known fields into structure
      if(this.ownToken) { // In case the api somehow accepted a "null" token?! Do not save it.
        localStorage.setItem(this.storageKeyName, this.ownToken); // Persist this known good token
        // Periodically check if the token is still valid
        this.ownTokenTimeout = setTimeout(() => {
          this.ownTokenInfo = this.validateOwnToken();
        }, 60 * 1000);
      }
      this.websocket = this.enableWebsocket();
    } catch(e) {
      tokenInfo = null;
      this.disableWebsocket();
    }
    this.ownTokenEventEmitter.emit(tokenInfo);
    return tokenInfo;
  }

  private async killOwnToken(): Promise<void> {
    // THIS IS ALSO FOR DEBUGGING! Used to kill the internal token without explicit validation and everything for it...
    this.ownToken = null;
    this.ownTokenInfo = Promise.resolve(null);
    localStorage.removeItem(this.storageKeyName);
    this.disableWebsocket();
  }

  private enableWebsocket(force: boolean = false): WebSocket {
    if(!force) {
      if(this.websocket !== null)
        return this.websocket;
      console.debug('Websocket enabled');
    }
    let s = new WebSocket(environment.wsAPI + 'ws?token=' + this.ownToken);
    s.onopen = evt => {
      this.websocketTimeout = 0; // Connection confirmed
    };
    s.onmessage = evt => {
      if(evt.data == 'ping')
        // Ignore, TCP already indicated out successful receive
        return;
      // This indicates a provision state change!
      let emitMe = JSON.parse(evt.data);
      this.provisionEventEmitter.emit({
        state: emitMe.state,
        since: emitMe.since
      });
    };
    s.onclose = async evt => {
      this.websocketTimeout++;
      const retryIn = Math.min(this.websocketTimeout, 30);
      await new Promise((res) => { setTimeout(res, retryIn * 1000); }); // Cooldown increasing amount after connection failure...
      // Whoops, the socket was closed! Try to reconnect (if this socket is not to be deleted)
      if(this.websocket) {
        console.warn('Websocket unexpectedly disconnected - reconnecting (' + this.websocketTimeout + ')...');
        this.websocket = this.enableWebsocket(true);
      } else {
        // Reference removed, let the connection die...
        this.disableWebsocket();
      }
    };
    return s;
  }

  private disableWebsocket(): void {
    if(this.websocket === null)
      return;
    console.debug('Websocket disabled');
    let s = this.websocket; // First remove the ref, then close - otherwise onclose() will reconnect
    this.websocket = null;
    s?.close();
    this.websocketTimeout = 0;
  }

  getDocsURI(): string {
    return environment.urlAPI + 'docs';
  }

  async setOwnToken(token: string | null): Promise<boolean> {
    clearTimeout(this.ownTokenTimeout); // Cancel remaining checks
    this.ownToken = token;

    // Token cleaned?
    if(this.ownToken === null) {
      this.killOwnToken();
      this.ownTokenEventEmitter.emit(await this.ownTokenInfo);
      return false;
    }

    // Real (invalid?) token set, validate it!
    this.ownTokenInfo = this.validateOwnToken();

    // Validate given token and either keep it or throw it away...
    try {
      if((await this.ownTokenInfo) === null) // If it fails, we fail too!
        // Whoops, the token is invalid? Revoke it.
        throw 'Token validation failed!';
      return true;
    } catch(e) {
      // Something is wrong with the token. Remove it!
      await this.setOwnToken(null);
      return false;
    }
  }

  async revokeOwnToken(): Promise<void> {
    try {
      await this.request('delete', 'token/delete');
    } catch(e) {
      // Ignore
    }
    await this.setOwnToken(null);
  }

  async hasOwnToken(): Promise<boolean> {
    return await (this.ownTokenInfo!) !== null; // If finished we know that we either have a valid or invalid token!
  }

  async getOwnTokenInfo(): Promise<APITokenInfo | null> {
    return (this.ownTokenInfo!);
  }

  subscribeToOwnTokenInfo(next?: (value: any) => void, error?: (error: any) => void, complete?: () => void): Subscription {
    return this.ownTokenEventEmitter.subscribe(next, error, complete);
  }

  async createToken(user: string, pass: string): Promise<string> {
    return (await this.request('post', 'token/create/oauth2', null, {
      grant_type: 'password',
      username: user,
      password: pass
    }))!.access_token;
  }

  async getIPs(global: boolean): Promise<APIIP[]> {
    let response = (await this.request('get', 'ip/list', {globals: global}))!.ips;
    let returnme: APIIP[] = [];
    for(let r of response)
      returnme.push({
        name: r.name,
        expires: r.expires !== null ? new Date(r.expires) : null,
        added: new Date(r.added),
        ip: r.ip
      });
    return returnme;
  }

  async getScopes(): Promise<APIScope[]> {
    let response = (await this.request('get', 'scopes'))!.scopes;
    let returnme: APIScope[] = [];
    for(let r of response)
      returnme.push({
        id: r.id,
        name: r.name,
        url: new URL(r.url)
      });
    return returnme;
  }

  async addIP(ip: string, name: string): Promise<APIIP> {
    return this.request('post', 'ip/add', {name: name, ip: ip});
  }

  async deleteIP(ip: string) {
    return this.request('delete', 'ip/delete', {ip: ip});
  }

  async getPublicIP(): Promise<string> {
    return this.request('get', 'ip/public');
  }

  async getProvision(): Promise<APIProvision> {
    return this.request('get', 'provision/state', null, null, true);
  }

  async getVersionInfo(name: string): Promise<APIVersionInfo> {
    if(name === 'dashboard')
      return {healthy: true, version: environment.version};
    return this.request('get', 'version/' + name);
  }

  subscribeToProvision(next?: (value: any) => void, error?: (error: any) => void, complete?: () => void): Subscription {
    return this.provisionEventEmitter.subscribe(next, error, complete);
  }
}
