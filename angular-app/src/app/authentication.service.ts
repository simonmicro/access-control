import { EventEmitter, Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { APITokenInfo, APIService, APIUser } from './api.service'

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  loginPath: UrlTree;
  dashPath: UrlTree;
  private userSubscription: Subscription;
  private userCache: Promise<APIUser | null>;
  private userEventEmitter: EventEmitter<APIUser | null> = new EventEmitter();

  constructor(private api: APIService, private router: Router, private location: Location) {
    this.userCache = this.updateUser(this.api.getOwnTokenInfo());
    this.userSubscription = api.subscribeToOwnTokenInfo(tokenPromise => {
      this.userCache = this.updateUser(tokenPromise);
    });
    this.loginPath = this.router.parseUrl('login');
    this.dashPath = this.router.parseUrl('dashboard');
  }

  ngOnDestroy() {
    this.userSubscription.unsubscribe();
  }

  private async updateUser(tokenPromise: Promise<APITokenInfo | null>): Promise<APIUser | null> {
    // NEVER EVER call this function, without also assigning the return of it to this.userCache!!!
    const tokenInfo: APITokenInfo | null = await tokenPromise;
    const userCache: APIUser | null = tokenInfo === null ? null : tokenInfo.user;
    this.userEventEmitter.emit(userCache);
    this.mayRedirectUser(); // We will resolve the Promise needed for that function with our own return - if we were called correctly!
    return userCache;
  }

  private async mayRedirectUser(): Promise<void> {
    // Check if user has to move, as it current path is prohibited now
    const needsAuth: boolean = this.needsPathAuthentication(this.location.path());
    const hasAuth: boolean = await this.isAuthenticated();
    if(needsAuth && !hasAuth)
      this.router.navigateByUrl(this.loginPath);
    else if(!needsAuth && hasAuth)
      this.router.navigateByUrl(this.dashPath); // In case the user needs to return somewhere else, this is done by the authentication guard...
  }

  needsPathAuthentication(path: string): boolean {
    return !path.startsWith('/login');
  }

  subscribeUser(next?: (value: any) => void, error?: (error: any) => void, complete?: () => void): Subscription {
    return this.userEventEmitter.subscribe(next, error, complete);
  }

  async getUser(): Promise<APIUser | null> {
    return this.userCache;
  }

  async isAuthenticated(): Promise<boolean> {
    return (await this.userCache) !== null;
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
