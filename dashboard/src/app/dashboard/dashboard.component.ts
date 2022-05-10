import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { Subscription } from 'rxjs';
import { APIUser, APIIP, APIService, APIScope } from '../api.service';
import { MatDialog } from '@angular/material/dialog';
import { IpAssistantComponent } from './ip-assistant/ip-assistant.component'
import { UrlRequestComponent } from './url-request/url-request.component'
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private userSubscription?: Subscription;
  private routeSub: any;
  title?: string;
  userIPs?: APIIP[];
  globalIPs?: APIIP[];
  userScopes?: APIScope[];
  userIPsMax: number = 0;
  apiDocs: string = '';
  openSideNav: boolean = false;

  constructor(private authSvc: AuthenticationService, public api: APIService, private dialog: MatDialog, private snackbar: MatSnackBar, private titleSvc: Title, private route: ActivatedRoute) {
    this.titleSvc.setTitle('Dashboard');
  }

  async ngOnInit(): Promise<void> {
    // Configure sidebar
    this.apiDocs = this.api.getDocsURI();
    // Open the sidenav if orientation is landscape
    if(window.matchMedia("only screen and (orientation: landscape)").matches)
      this.openSideNav = true;
    // Retreive the URL for the request UI
    this.routeSub = this.route.params.subscribe(params => {
      try {
        const u = new URL(params['url']);
        const dialogRef = this.dialog.open(UrlRequestComponent, {
          data: { url: u },
        });
      } catch(e) {
        // Either the parameter is empty or invalid
      }
    });
    // Bind title to user information
    this.userSubscription = this.authSvc.subscribeUser(u => { if(u) this.userUpdate(u); });
    let u: APIUser | null = await this.authSvc.getUser();
    if(u) this.userUpdate(u);
    // Fill component data
    this.api.getIPs(false).then(l => this.userIPs = l);
    this.api.getIPs(true).then(l => this.globalIPs = l);
    this.api.getScopes().then(s => this.userScopes = s);
  }

  ngOnDestroy(): void {
    this.userSubscription!.unsubscribe();
    this.routeSub!.unsubscribe();
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
        this.userIPs!.push(ip);
        this.userIPs = [...this.userIPs!]; // Trigger explicit change detection for Angular
      } catch(e: any) {
        console.warn(e);
        if(e.detail)
          this.snackbar.open('Whoops? ' + e.detail.toString());
      }
    });
  }

  async deleteIP(ip: APIIP) {
    await this.api.deleteIP(ip.ip);
    this.userIPs = this.userIPs!.filter(v => { return v.ip != ip.ip; });
  }
}