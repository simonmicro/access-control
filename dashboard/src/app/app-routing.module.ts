import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AuthenticationGuard } from './authentication.guard'
import { DashboardComponent } from './dashboard/dashboard.component';
import { Error404Component } from './error404/error404.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [ AuthenticationGuard ] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [ AuthenticationGuard ] },
  { path: 'request/:url', component: DashboardComponent, canActivate: [ AuthenticationGuard ] },
  { path: '**', component: Error404Component, canActivate: [ ] }
  // localhost:4200/request/url?https:%2F%2Fgoogle.com=
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
