import { EventEmitter, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, ActivatedRoute, Router, UrlTree } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { APIService, APIUser } from './api.service'

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  loginPath: UrlTree;
  dashPath: UrlTree;
  private userSubscription: Subscription;
  private userCache: APIUser | null = null;
  private userEventEmitter: EventEmitter<APIUser | null> = new EventEmitter();

  constructor(private api: APIService, private router: Router, private location: Location) {
    this.updateUser(this.api.getOwnTokenInfo());
    this.userSubscription = api.subscribeToOwnTokenInfo(i => this.updateUser(i));
    this.loginPath = this.router.parseUrl('login');
    this.dashPath = this.router.parseUrl('dashboard');
  }

  ngOnDestroy() {
    this.userSubscription.unsubscribe();
  }

  private updateUser(tokenInfo: any | null): void {
    if(tokenInfo === null)
      this.userCache = null;
    else
      this.userCache = tokenInfo.user;
    this.userEventEmitter.emit(this.userCache);
    // Check if user has to move, as it current path is prohibited now
    const needsAuth: boolean = this.needsPathAuthentication(this.location.path());
    const hasAuth: boolean = this.isAuthenticated();
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

  getUser(): APIUser | null {
    return this.userCache;
  }

  isAuthenticated(): boolean {
    return this.userCache !== null;
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
