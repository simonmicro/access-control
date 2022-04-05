import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../authentication.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  year: number = (new Date()).getFullYear();
  loading: boolean = false;

  loginForm: FormGroup = this.formBuilder.group({
    username: [null, Validators.required],
    password: [null, Validators.required]
  });

  constructor(private formBuilder: FormBuilder, private authSvc: AuthenticationService, private snackBar: MatSnackBar, private titleSvc: Title) {
    this.titleSvc.setTitle('Login');
  }

  async onSubmit(): Promise<void> {
    this.loading = true;
    let success: boolean = await this.authSvc.login(this.loginForm.value.username, this.loginForm.value.password);
    if(!success) {
      this.snackBar.open('Login failed.');
      this.loginForm.reset();
    }
    this.loading = false;
  }

  ngOnInit(): void {
  }

}
