import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { APIUser, APIIP, APIService } from '../api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private userSubscription?: Subscription;
  title?: string;
  userIPs: APIIP[] = [];
  globalIPs: APIIP[] = [];
  Math = Math;

  constructor(private authSvc: AuthenticationService, private snackBar: MatSnackBar, private api: APIService) { }

  async ngOnInit(): Promise<void> {
    // Bind title to user information
    this.userSubscription = this.authSvc.subscribeUser(u => { if(u) this.userUpdate(u); });
    let u: APIUser | null = await this.authSvc.getUser();
    if(u) this.userUpdate(u);
    // Fill component data
    this.api.getIPs(false).then(l => this.userIPs = l);
    this.api.getIPs(true).then(l => this.globalIPs = l);
  }

  ngOnDestroy(): void {
    this.userSubscription!.unsubscribe();
  }

  private userUpdate(u: APIUser) {
    this.title = 'Welcome, ' + u.name + '!';
  }

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  startStuff() {
    this.userIPs.push({id: Math.random(), name: 'str' + String(this.userIPs.length), ip: '3.3.3.3', added: new Date(), expires: new Date()});
    this.userIPs = [...this.userIPs]; // Trigger explicit change detection for Angular
    this.snackBar.open('Shit.', String(this.userIPs.length));
  }

  deleteIP(ip: APIIP) {
    this.api.deleteIP(ip.id);
    this.userIPs = this.userIPs.filter(v => { return v.id != ip.id; });
  }
}