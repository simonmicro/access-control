import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { Subscription } from 'rxjs';
import { APIUser, APIIP, APIService, APIScope, APIProvision } from '../api.service';
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
  private userSubscription: Subscription | null = null;
  private routeSubcription: Subscription | null = null;
  private contentSubcription: Subscription | null = null;
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
    this.routeSubcription = this.route.params.subscribe(params => {
      try {
        const u = new URL(params['url']);
        u.search = window.location.search; // Patch in the current windows query parameters to pass on
        this.dialog.open(UrlRequestComponent, {
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
    
    this.api.getScopes().then(s => {
        // This is similar to the user information very static, so we do not update it frequently using the updateContent() method
        s.sort((a, b): number => {
          if (a.name < b.name)
            return -1;
          if (a.name > b.name)
            return 1;
          return 0;
        });
        this.userScopes = s;
      }); 
    // Fill component data
    this.updateContent();
    this.contentSubcription = this.api.subscribeToProvision((state: APIProvision) => {
      // TODO This should be handled using a dedicated message using the websocket from the API, so we must nevery refresh if no new data is there
      if(!state.state)
        this.updateContent();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.routeSubcription?.unsubscribe();
    this.contentSubcription?.unsubscribe();
  }

  private updateContent(): void {
    this.api.getIPs(false).then(l => this.userIPs = l);
    this.api.getIPs(true).then(l => this.globalIPs = l);
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