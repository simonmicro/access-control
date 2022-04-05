import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { APIService } from '../api.service';

@Component({
  selector: 'app-debug-menu',
  templateUrl: './debug-menu.component.html',
  styleUrls: ['./debug-menu.component.css']
})
export class DebugMenuComponent implements OnInit {

  constructor(private api: APIService, private snackBar: MatSnackBar) { }

  ngOnInit(): void { }

  clearToken() {
    // @ts-ignore
    this.api.killOwnToken();
    this.snackBar.open('Token killed.');
  }

  async revokeToken() {
    await this.api.revokeOwnToken();
    this.snackBar.open('Token reset.');
  }

  async validateToken() {
    // @ts-ignore
    await this.api.validateOwnToken();
    this.snackBar.open('Token validated!');
  }
}
