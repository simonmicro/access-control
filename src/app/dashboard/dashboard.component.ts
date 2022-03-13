import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IPTableRow } from './ip-table/ip-table.component'
import { Subscription } from 'rxjs';
import { APIUser } from '../api.service';

const a: IPTableRow[] = [
  {name: 'str0', ip: '1.1.1.1', added: new Date(), expires: new Date()},
  {name: 'str1', ip: '1.1.1.1', added: new Date(), expires: new Date()},
  {name: 'str2', ip: '1.1.1.1', added: new Date(), expires: new Date()},
  {name: 'str3', ip: '1.1.1.1', added: new Date(), expires: new Date()},
  {name: 'str4', ip: '1.1.1.1', added: new Date(), expires: new Date()},
  {name: 'str5', ip: '1.1.1.1', added: new Date(), expires: new Date()},
];
const b: IPTableRow[] = [
  {name: 'str', ip: '2.2.2.2', added: new Date(), expires: new Date()},
  {name: 'str', ip: '2.2.2.2', added: new Date(), expires: new Date()},
];

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private userSubscription?: Subscription;
  title?: string;
  a: IPTableRow[] = a;
  b: IPTableRow[] = b;

  constructor(private authSvc: AuthenticationService, private snackBar: MatSnackBar) { }

  async ngOnInit(): Promise<void> { 
    this.userSubscription = this.authSvc.subscribeUser(u => { if(u) this.userUpdate(u); });
    let u: APIUser | null = await this.authSvc.getUser();
    if(u) this.userUpdate(u);
  }

  ngOnDestroy(): void {
    this.userSubscription!.unsubscribe();
  }

  private userUpdate(u: APIUser) {
    this.title = 'Welcome, ' + u.name;
  }

  async logout(): Promise<void> {
    await this.authSvc.logout();
  }

  startStuff() {
    this.a.push({name: 'str' + String(this.a.length), ip: '3.3.3.3', added: new Date(), expires: new Date()});
    this.a = [...this.a]; // Trigger explicit change detection for Angular
    this.snackBar.open('Shit.', String(this.a.length));
  }
}