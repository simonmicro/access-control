import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AuthenticationGuard } from './authentication.guard'
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [ AuthenticationGuard ] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [ AuthenticationGuard ] },
  { path: '**', component: LoginComponent, canActivate: [ AuthenticationGuard ] } // TODO replace with 404
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
