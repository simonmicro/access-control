import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-error404',
  templateUrl: './error404.component.html',
  styleUrls: ['./error404.component.css']
})
export class Error404Component implements OnInit {

  constructor(private titleSvc: Title) {
    this.titleSvc.setTitle('Error 404');
  }

  ngOnInit(): void {
  }

}
