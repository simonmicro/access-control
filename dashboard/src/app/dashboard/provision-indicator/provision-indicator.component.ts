import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { APIProvision, APIService } from 'src/app/api.service';

@Component({
  selector: 'app-provision-indicator',
  templateUrl: './provision-indicator.component.html',
  styleUrls: ['./provision-indicator.component.css']
})
export class ProvisionIndicatorComponent implements OnInit {
  private subscription: Subscription | null = null;
  moment = moment;
  since: Date = new Date();
  active: boolean = false;

  constructor(private api: APIService) { }

  ngOnInit(): void {
    this.subscription = this.api.subscribeToProvision((state: APIProvision) => {
      this.update(state);
    });
    this.api.getProvision().then(state => this.update(state));
  }

  private update(state: APIProvision): void {
    this.active = state.state;
    if(state.since === null)
      this.since = new Date();
    else
      this.since = state.since;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

}
