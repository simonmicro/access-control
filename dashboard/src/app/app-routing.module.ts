import { NgModule } from '@angular/core';
import { Route, RouterModule, Routes, UrlMatchResult, UrlSegment, UrlSegmentGroup } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AuthenticationGuard } from './authentication.guard'
import { DashboardComponent } from './dashboard/dashboard.component';
import { Error404Component } from './error404/error404.component';

// Match URLs like /request/{scheme}/{url}, with the URL containing '/'
function requestPathMatcher(segments: UrlSegment[], group: UrlSegmentGroup, route: Route): UrlMatchResult | null {
  // Note the requirement of request/scheme/... -> 2 segments
  if (segments.length > 2 && segments[0].path == 'request') {
    return {
      consumed: segments,
      posParams: {
        url: new UrlSegment(segments[1] + '://' + segments.slice(2).join('/'), {})
      }
    };
  }
  return null;
}

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [AuthenticationGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthenticationGuard] },
  { matcher: requestPathMatcher, component: DashboardComponent, canActivate: [AuthenticationGuard] },
  { path: '**', component: Error404Component, canActivate: [] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
