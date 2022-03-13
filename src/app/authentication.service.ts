import { Injectable } from '@angular/core';
import { APIService } from './api.service'

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  constructor(private api: APIService) { }

  async isAuthenticated(): Promise<boolean> {
    return this.api.hasOwnToken();
  }

  async login(user: string, pass: string): Promise<boolean> {
    try {
      // Create new token using credentials on the api
      // Set token for further api useage
      return await this.api.setOwnToken(await this.api.createToken(user, pass));
    } catch(e) {
      return false;
    }
  }

  logout(): Promise<void> {
    return this.api.revokeOwnToken();
  }
}
