import { Injectable, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';

export interface APIUser {
  name: string
}
export interface APITokenInfo {
  expires: Date,
  user: APIUser
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

  private async request(operator: string, data: object | null = null): Promise<any | null> {
    if(this.fakeEverything) {
      console.warn('Request emulation is active!', this.ownToken, operator, data);
      if(operator === 'token/createWithCreds')
        return {token: 'dummy'};
      else if(operator === 'token/info')
        return {user: {name: 'dummy'}};
      else
        throw {code: 404, error: 'Not found'};
    }
    return null;
  }

  private async validateOwnToken(): Promise<APITokenInfo | null> {
    // ALWAYS assign the return of this function to this.ownTokenInfo!!!
    let tokenInfo: APITokenInfo | null;
    try {
      let c = (await this.request('token/info'))!;
      tokenInfo = {expires: new Date(c.expires), user: {name: c.user.name}}; // Parse only known fields into structure
      if(this.ownToken) // In case the api somehow accepted a "null" token?! Do not save it.
        localStorage.setItem(this.storageKeyName, this.ownToken); // Persist this known good token
        // Periodically check if the token is still valid
        this.ownTokenTimeout = setTimeout(() => {
          this.ownTokenInfo = this.validateOwnToken();
        }, 60 * 1000);
    } catch(e) {
      tokenInfo = null;
    }
    this.ownTokenEventEmitter.emit(tokenInfo);
    return tokenInfo;
  }

  private async killOwnToken(): Promise<void> {
    // THIS IS ALSO FOR DEBUGGING! Used to kill the internal token without explicit validation and everything for it...
    this.ownToken = null;
    this.ownTokenInfo = Promise.resolve(null);
    localStorage.removeItem(this.storageKeyName);
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
    this.ownToken = token;
    this.ownTokenInfo = this.validateOwnToken();

    // Validate given token and either keep it or throw it away...
    try {
      await this.ownTokenInfo; // If it fails, we fail too!
      return true;
    } catch(error) {
      // Something is wrong with the token. Remove it!
      return await this.setOwnToken(null);
    }
  }

  async revokeOwnToken(): Promise<void> {
    try {
      await this.request('token/delete', {token: this.ownToken});
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
    return (await this.request('token/createWithCreds', {username: user, password: pass}))!.token;
  }
}
