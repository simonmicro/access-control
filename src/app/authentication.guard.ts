import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationGuard implements CanActivate {
  private login: UrlTree;
  private dash: UrlTree;

  constructor(private authSvc: AuthenticationService, private router: Router ) {
    this.login = this.router.parseUrl('login');
    this.dash = this.router.parseUrl('dashboard');
  }

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Promise<boolean | UrlTree> {
      if (await this.authSvc.isAuthenticated()) {
        if (route.routeConfig!.path === 'login') {
          return this.dash;
        } else {
          return true;
        }
      } else {
        if (route.routeConfig!.path === 'login') {
          return true;
        } else {
          return this.login;
        }
      }
  }
}
