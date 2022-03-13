import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class APIService {
  private storageKeyName: string = 'token';
  private ownToken: string | null = null;
  private ownTokenIsValid: Promise<boolean> | boolean;
  private fakeEverything: boolean = true;

  constructor() {
    // Try to load last valid token from localStorage
    if(localStorage.getItem(this.storageKeyName) !== null)
    this.ownTokenIsValid = this.setOwnToken(localStorage.getItem('token'));
    else
      this.ownTokenIsValid = false;
  }

  private async request(operator: string, data: object | null = null): Promise<any | null> {
    console.warn('Request is not implemented yet!', operator, data);
    if(this.fakeEverything) {
      if(operator === 'token/createWithCreds')
        return {token: 'dummy'};
      else if(operator === 'token/test')
        return {};
    }
    return null;
  }

  async setOwnToken(token: string | null): Promise<boolean> {
    this.ownTokenIsValid = false;
    this.ownToken = token;

    if(this.ownToken === null) {
      localStorage.removeItem(this.storageKeyName)
      return false;
    }

    // Validate given token and either keep it or throw it away...
    try {
      await this.request('token/test');
      localStorage.setItem(this.storageKeyName, this.ownToken); // Persist this known good token
      this.ownTokenIsValid = true;
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
    return this.ownTokenIsValid;
  }

  async createToken(user: string, pass: string): Promise<string> {
    return (await this.request('token/createWithCreds', {username: user, password: pass}))!.token;
  }
}
