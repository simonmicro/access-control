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
  private ownTokenIsValid: boolean | null = null;
  private ownTokenInfo: APITokenInfo | null = null;
  private ownTokenTimeout?: any = null;
  private ownTokenEventEmitter: EventEmitter<APITokenInfo | null> = new EventEmitter();

  constructor() {
    // Try to load last valid token from localStorage
    if(localStorage.getItem(this.storageKeyName) !== null)
      this.setOwnToken(localStorage.getItem('token'));
    else
      this.setOwnToken(null);
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

  private async validateOwnToken(): Promise<void> {
    let c = (await this.request('token/info'))!;
    this.ownTokenInfo = {expires: new Date(c.expires), user: {name: c.user.name}}; // Parse only known fields into structure
    this.ownTokenIsValid = true;
    this.ownTokenEventEmitter.emit(this.ownTokenInfo);
    if(this.ownToken) // In case the api somehow accepted a "null" token?! Do not save it.
      localStorage.setItem(this.storageKeyName, this.ownToken); // Persist this known good token
    // Periodically check if the token is still valid
    this.ownTokenTimeout = setTimeout(() => this.validateOwnToken(), 60 * 1000);
  }

  private async killOwnToken(): Promise<void> {
    // THIS IS ONLY FOR DEBUGGING! Used to kill the internal token without explicit validation and everything for it...
    this.ownToken = null;
    this.ownTokenInfo = null;
    this.ownTokenIsValid = false;
    localStorage.removeItem(this.storageKeyName);
  }

  async setOwnToken(token: string | null): Promise<boolean> {
    this.ownToken = token;
    this.ownTokenInfo = null;
    this.ownTokenIsValid = false;
    clearTimeout(this.ownTokenTimeout);

    if(this.ownToken === null) {
      localStorage.removeItem(this.storageKeyName)
      this.ownTokenEventEmitter.emit(this.ownTokenInfo);
      return false;
    }

    // Validate given token and either keep it or throw it away...
    try {
      await this.validateOwnToken();
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

  hasOwnToken(): boolean {
    return this.ownTokenIsValid ?? false;
  }

  getOwnTokenInfo(): APITokenInfo | null {
    return this.ownTokenInfo;
  }

  subscribeToOwnTokenInfo(next?: (value: any) => void, error?: (error: any) => void, complete?: () => void): Subscription {
    return this.ownTokenEventEmitter.subscribe(next, error, complete);
  }

  async createToken(user: string, pass: string): Promise<string> {
    return (await this.request('token/createWithCreds', {username: user, password: pass}))!.token;
  }
}
