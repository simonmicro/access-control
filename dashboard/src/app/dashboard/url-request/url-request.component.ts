import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { APIScope, APIService } from 'src/app/api.service';

export interface UrlRequestData {
  url: URL
}

@Component({
  selector: 'app-url-request',
  templateUrl: './url-request.component.html',
  styleUrls: ['./url-request.component.css']
})
export class UrlRequestComponent implements OnInit {
  statusOverallLoading: boolean = false;
  statusList: Array<number> = [0, 0, 0, 0, 0];

  constructor(private dialogRef: MatDialogRef<UrlRequestComponent>, private apiSvc: APIService, private snackbar: MatSnackBar, @Inject(MAT_DIALOG_DATA) public data: UrlRequestData) {
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.startProcess();
  }

  private setStatus(id: number, success: boolean) {
    for(let i = 0; i < id && i < this.statusList.length; ++i) {
      this.statusList[i] = 2;
    }
    this.statusList[id] = success ? 2 : 3;
    for(let i = id + 1; i < this.statusList.length; ++i) {
      this.statusList[i] = success ? 0 : 3;
    }
  }

  async startProcess(): Promise<void> {
    this.statusOverallLoading = true;
    let foundScope: APIScope | null = null;
    try {
      // Determine scope
      try {
        const scopes: APIScope[] = await this.apiSvc.getScopes();
        for(let scope of scopes) {
          if(this.data.url.host == scope.url.host)
          foundScope = scope;
        }
        if(foundScope == null) {
          this.snackbar.open('You are missing the permission to access this scope.', '', {duration: 10000});
          throw 0;
        }
        this.setStatus(0, true);
      } catch(e) {
        throw 0;
      }

      // Get my ip
      let myIP: string | null = null;
      try {
        myIP = await this.apiSvc.getPublicIP();
        this.setStatus(1, true);
      } catch(e) {
        throw 1;
      }

      // TODO Register for provision update

      // Add my ip
      try {
        await this.apiSvc.addIP(myIP, 'Direct IP');
        this.setStatus(2, true);
      } catch(e) {
        console.error(e);
        this.snackbar.open('Something went wrong while adding your IP.', '', {duration: 10000});
        throw 2;
      }

      // ...

      /*
      for(let i = 0; i < this.statusList.length; ++i) {
        await new Promise((res, _) => {
          setTimeout(res, 1000);
        });
        this.setStatus(i, false);
        await new Promise((res, _) => {
          setTimeout(res, 1000);
        });
        this.setStatus(i, true);
      }
      */
    } catch(e) {
      // @ts-ignore (TS tries to see a non-number here...)
      this.setStatus(e, false);
    } finally {
      this.statusOverallLoading = false;
      this.dialogRef.disableClose = false;
      setTimeout(() => this.dialogRef.close(), 8000);
    }
  }
}
