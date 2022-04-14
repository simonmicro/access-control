import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { APIService } from 'src/app/api.service';

@Component({
  selector: 'app-provision-indicator',
  templateUrl: './provision-indicator.component.html',
  styleUrls: ['./provision-indicator.component.css']
})
export class ProvisionIndicatorComponent implements OnInit {
  moment = moment;
  since: Date = new Date();
  active: boolean = false;

  constructor(private api: APIService) { }

  ngOnInit(): void {
    this.api.subscribeToProvision(state => {
      this.active = state.state;
      this.since = state.since;
    });
  }

  ngOnDestroy(): void { }

}
