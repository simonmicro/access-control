import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-too-many-requests',
  templateUrl: './too-many-requests.component.html',
  styleUrls: ['./too-many-requests.component.css']
})
export class TooManyRequestsComponent implements OnInit {
  static amount: number = 0;

  constructor() { }

  ngOnInit(): void {
    TooManyRequestsComponent.amount++;
  }

  getAmount(): number {
    return TooManyRequestsComponent.amount;
  }
}
