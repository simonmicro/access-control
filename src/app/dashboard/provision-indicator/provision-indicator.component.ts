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
  private websocket: WebSocket | null = null;
  moment = moment;
  since: Date = new Date();
  active: boolean = false;

  constructor(private api: APIService) { }

  ngOnInit(): void {
    this.interval = setInterval(async () => {
      // In case websockets are broken / unsupported
      let state = await this.api.getProvision();
      this.active = state.state;
      this.since = state.since;
    }, 60 * 1000);
    this.api.subscribeToProvision(state => {
      this.active = state.state;
      this.since = state.since;
    });
  }

  ngOnDestroy(): void {
    if(this.interval)
      clearInterval(this.interval);
  }

}
