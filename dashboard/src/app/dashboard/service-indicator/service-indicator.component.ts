import { Component, OnInit, Input } from '@angular/core';
import { APIService, APIVersionInfo } from 'src/app/api.service';

@Component({
  selector: 'app-service-indicator',
  templateUrl: './service-indicator.component.html',
  styleUrls: ['./service-indicator.component.css']
})
export class ServiceIndicatorComponent implements OnInit {
  @Input() scope: string = 'undefined';
  @Input() display: string = 'Undefined';
  healthy: boolean | null = null;
  info: APIVersionInfo | null = null;

  constructor(private apiSvc: APIService) { }

  async ngOnInit(): Promise<void> {
    try {
      this.info = await this.apiSvc.getVersionInfo(this.scope);
      this.healthy = this.info.healthy;
    } catch(e) {
      this.healthy = false;
    }
  }

}
