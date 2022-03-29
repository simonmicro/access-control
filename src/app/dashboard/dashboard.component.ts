import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { Subscription } from 'rxjs';
import { APIUser, APIIP, APIService } from '../api.service';
import { MatDialog } from '@angular/material/dialog';
import { IpAssistantComponent } from './ip-assistant/ip-assistant.component'
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private expireInterval?: any;
  private userSubscription?: Subscription;
  title?: string;
  userIPs: APIIP[] = [];
  globalIPs: APIIP[] = [];
  userIPsMax: number = 0;
  apiDocs: string = '';

  constructor(private authSvc: AuthenticationService, public api: APIService, private dialog: MatDialog, private snackbar: MatSnackBar) { }

  async ngOnInit(): Promise<void> {
    // Bind title to user information
    this.userSubscription = this.authSvc.subscribeUser(u => { if(u) this.userUpdate(u); });
    let u: APIUser | null = await this.authSvc.getUser();
    if(u) this.userUpdate(u);
    // Fill component data
    this.api.getIPs(false).then(l => this.userIPs = l);
    this.api.getIPs(true).then(l => this.globalIPs = l);
    this.apiDocs = this.api.getDocsURI();
    this.expireInterval = setInterval(() => {
      this.userIPs = this.userIPs.filter(e => { return e.expires !== null ? e.expires > new Date() : true; });
      this.globalIPs = this.globalIPs.filter(e => { return e.expires !== null ? e.expires > new Date() : true; });
    }, 60 * 1000);
  }

  ngOnDestroy(): void {
    this.userSubscription!.unsubscribe();
    clearInterval(this.expireInterval);
  }

  private userUpdate(u: APIUser) {
    this.title = 'Welcome, ' + u.name + '!';
    this.userIPsMax = u.limit;
  }

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  openIPAssistant() {
    const dialogRef = this.dialog.open(IpAssistantComponent);
    dialogRef.afterClosed().subscribe(async o => {
      if(!o)
        return;
      try {
        let ip: APIIP = await this.api.addIP(o.ip, o.name);
        this.userIPs.push(ip);
        this.userIPs = [...this.userIPs]; // Trigger explicit change detection for Angular
      } catch(e: any) {
        console.warn(e);
        if(e.detail)
          this.snackbar.open('Whoops? ' + e.detail.toString());
      }
    });
  }

  async deleteIP(ip: APIIP) {
    await this.api.deleteIP(ip.ip);
    this.userIPs = this.userIPs.filter(v => { return v.ip != ip.ip; });
  }
}