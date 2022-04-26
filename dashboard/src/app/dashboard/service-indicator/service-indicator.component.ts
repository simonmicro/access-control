import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-service-indicator',
  templateUrl: './service-indicator.component.html',
  styleUrls: ['./service-indicator.component.css']
})
export class ServiceIndicatorComponent implements OnInit {
  @Input() scope: string = 'undefined';
  @Input() display: string = 'Undefined';

  constructor() { }

  ngOnInit(): void {
  }

}
