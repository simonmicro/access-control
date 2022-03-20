import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationGuard implements CanActivate {
  private static authenticatedOverride?: any; // In case the user tried to access a path requiring authentication, which that was denied, it will be stored here (to return later on)

  constructor(private authSvc: AuthenticationService, private snackBar: MatSnackBar, private router: Router) { }

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const hasAuth: boolean = await this.authSvc.isAuthenticated();
    const needsAuth: boolean = this.authSvc.needsPathAuthentication('/' + route.routeConfig!.path!);
//console.warn('GUARD!', 'need?', needsAuth, 'has?', hasAuth);
    if(hasAuth) {
      // User is authenticated...
      if(needsAuth) {
        // ...and wants secured paths -> do we have a redirect for him?
        if(AuthenticationGuard.authenticatedOverride) {
          this.snackBar.open('Welcome back!');
          let override: UrlTree = this.router.createUrlTree([AuthenticationGuard.authenticatedOverride[0]]);
          override.queryParams = AuthenticationGuard.authenticatedOverride[1];
          AuthenticationGuard.authenticatedOverride = null;
          return override;
        }
        return true;
      } else {
        // ...and wants no-auth paths. Prohibited. Send to dash!
        return this.authSvc.dashPath;
      }
    } else {
      // User is not authenticated...
      if(needsAuth) {
        // ...and wants auth paths. PROHIBITED - but we note your attempt for when you have authentication!
        AuthenticationGuard.authenticatedOverride = [window.location.pathname, route.queryParams]; // The path (window.location) was not updated yet, so we can catch it now...
        this.snackBar.open('Please login first.');
        return this.authSvc.loginPath;
      } else {
        // ...and wants no-auth paths. OK!
        return true;
      }
    }
  }
}
