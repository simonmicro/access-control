import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-status-icon',
  templateUrl: './status-icon.component.html',
  styleUrls: ['./status-icon.component.css']
})
export class StatusIconComponent implements OnInit {
  @Input() status: number = 0;

  constructor() { }

  ngOnInit(): void {
  }

}
