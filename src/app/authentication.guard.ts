import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRouteSnapshot, CanActivate, UrlTree } from '@angular/router';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationGuard implements CanActivate {
  private static authenticatedOverride?: any; // In case the user tried to access a path requiring authentication, which that was denied, it will be stored here (to return later on)

  constructor(private authSvc: AuthenticationService, private snackBar: MatSnackBar) { }

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
    const needsAuth: boolean = this.authSvc.needsPathAuthentication('/' + route.routeConfig!.path!);
    const hasAuth: boolean = this.authSvc.isAuthenticated();
    if(hasAuth) {
      // User is authenticated...
      if(needsAuth) {
        // ...and wants secured paths -> do we have a redirect for him?
console.error('override', AuthenticationGuard.authenticatedOverride); // TODO!!!
        if(AuthenticationGuard.authenticatedOverride)
          this.snackBar.open('Welcome back!');
        return true;
      } else {
        // ...and wants no-auth paths. Prohibited. Send to dash!
        return this.authSvc.dashPath;
      }
    } else {
      // User is not authenticated...
      if(needsAuth) {
        // ...and wants auth paths. PROHIBITED - but we note your attempt for when you have authentication!
        AuthenticationGuard.authenticatedOverride = route.routeConfig!.path!;
console.error('for later', AuthenticationGuard.authenticatedOverride); // TODO!!!
        this.snackBar.open('Please login first.');
        return this.authSvc.loginPath;
      } else {
        // ...and wants no-auth paths. OK!
        return true;
      }
    }
  }
}
