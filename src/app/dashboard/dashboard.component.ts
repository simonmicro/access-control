import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { Subscription } from 'rxjs';
import { APIUser, APIIP, APIService } from '../api.service';
import { MatDialog } from '@angular/material/dialog';
import { IpAssistantComponent } from './ip-assistant/ip-assistant.component'

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
  userIPsMax: number = 16; //Math.max(10, this.userIPs.length);

  constructor(private authSvc: AuthenticationService, public api: APIService, private dialog: MatDialog) { }

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

  openIPAssistant() {
    const dialogRef = this.dialog.open(IpAssistantComponent);
    dialogRef.afterClosed().subscribe(async o => {
      if(!o)
        return;
      let ip: APIIP = await this.api.addIP(o.ip, o.name);
      this.userIPs.push(ip);
      this.userIPs = [...this.userIPs]; // Trigger explicit change detection for Angular
    });
  }

  deleteIP(ip: APIIP) {
    this.api.deleteIP(ip.id);
    this.userIPs = this.userIPs.filter(v => { return v.id != ip.id; });
  }
}