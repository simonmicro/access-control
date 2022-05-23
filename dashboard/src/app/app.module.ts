import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog'; 
import { MatStepperModule } from '@angular/material/stepper';
import { MatSidenavModule } from '@angular/material/sidenav'; 
import { MatListModule } from '@angular/material/list';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { IpTableComponent } from './dashboard/ip-table/ip-table.component';
import { HideProdDirective } from './hide-prod.directive';
import { DebugMenuComponent } from './debug-menu/debug-menu.component';
import { Error404Component } from './error404/error404.component';
import { IpAssistantComponent } from './dashboard/ip-assistant/ip-assistant.component';
import { ProvisionIndicatorComponent } from './dashboard/provision-indicator/provision-indicator.component';
import { ServiceIndicatorComponent } from './dashboard/service-indicator/service-indicator.component';
import { UrlRequestComponent } from './dashboard/url-request/url-request.component';
import { StatusIconComponent } from './dashboard/url-request/status-icon/status-icon.component';
import { TooManyRequestsComponent } from './too-many-requests/too-many-requests.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    IpTableComponent,
    HideProdDirective,
    DebugMenuComponent,
    Error404Component,
    IpAssistantComponent,
    ProvisionIndicatorComponent,
    ServiceIndicatorComponent,
    UrlRequestComponent,
    StatusIconComponent,
    TooManyRequestsComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatTableModule,
    MatPaginatorModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDialogModule,
    MatStepperModule,
    MatSidenavModule,
    MatListModule
  ],
  providers: [
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {duration: 2500, horizontalPosition: 'left'}}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
