import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { APIService } from 'src/app/api.service';

@Component({
  selector: 'app-provision-indicator',
  templateUrl: './provision-indicator.component.html',
  styleUrls: ['./provision-indicator.component.css']
})
export class ProvisionIndicatorComponent implements OnInit {
  private interval: any | null = null;
  moment = moment;
  since: Date = new Date();
  active: boolean = false;

  constructor(private api: APIService) { }

  ngOnInit(): void {
    this.interval = setInterval(async () => {
      let state = await this.api.getProvision();
      this.active = state.state;
      this.since = state.since;
    }, 1000);
  }

  ngOnDestroy(): void {
    if(this.interval)
      clearInterval(this.interval);
  }

}
