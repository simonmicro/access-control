import { Component, Inject, OnInit, Query } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as moment from 'moment';
import { APIIP, APIScope, APIService } from 'src/app/api.service';

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
  statusList: Array<number> = [0, 0, 0, 0, 0, 0];

  constructor(private dialogRef: MatDialogRef<UrlRequestComponent>, private apiSvc: APIService, private snackbar: MatSnackBar, @Inject(MAT_DIALOG_DATA) public data: UrlRequestData) {
    this.dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.startProcess();
  }

  private setStatus(id: number, success: boolean) {
    for (let i = 0; i < id && i < this.statusList.length; ++i) {
      this.statusList[i] = 2;
    }
    this.statusList[id] = success ? 2 : 3;
    for (let i = id + 1; i < this.statusList.length; ++i) {
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
        for (let scope of scopes) {
          if (this.data.url.host == scope.url.host)
            foundScope = scope;
        }
        if (foundScope == null) {
          this.snackbar.open('You are missing the permission to access this scope.', '', { duration: 10000 });
          throw 0;
        }
        this.setStatus(0, true);
      } catch (e) {
        throw 0;
      }

      // Get my ip
      let myIP: string | null = null;
      try {
        myIP = await this.apiSvc.getPublicIP();
        this.setStatus(1, true);
      } catch (e) {
        throw 1;
      }

      // Get added ips
      let myIPs: APIIP[];
      try {
        myIPs = await this.apiSvc.getIPs(false);
        this.setStatus(2, true);
      } catch (e) {
        throw 2;
      }

      // Determine if we still need to add this ip...
      let skipAddIP: boolean = false;
      for (let ip of myIPs) {
        if (ip.ip == myIP) {
          skipAddIP = true;
          break;
        }
      }

      try {
        let provisionSub = null;
        if (skipAddIP) {
          // We are already done, so no waiting for the provision here!
          const keyExpire = 'url-redirect.expire';
          const keyCount = 'url-redirect.count';
          let expire = localStorage.getItem(keyExpire);
          if(expire !== null && new Date(expire) < new Date()) {
            localStorage.removeItem(keyExpire);
            localStorage.removeItem(keyCount);
          } else {
            let count = localStorage.getItem('url-redirect.count');
            if(count === null)
              count = '0';
            localStorage.setItem(keyCount, (Number.parseInt(count) + 1).toString());
            if(Number.parseInt(count) > 3) {
              // Are we stuck in a loop? If yes, show error!
              this.snackbar.open(
                'Whoops, seems like you are stuck in a loop (' + count + ')?! Please try again later or contact your administrator.' +
                (expire ? ' Automatic redirect is disabled until ' + moment(expire).fromNow() + '. Sorry.' : ''),
                'Accept', {duration: 0}
              );
              throw 'Loop detected!';
            }
            // Okay, increase rewrite count...
            localStorage.setItem(keyExpire, new Date(new Date().getTime() + 300 * 1000).toISOString()); // 5 minute cooldown...
          }
        } else {
          // Register for provision update
          provisionSub = new Promise<void>((resolve, reject) => {
            let sub = this.apiSvc.subscribeToProvision(resp => {
              if (!resp.state) {
                resolve();
                sub.unsubscribe();
              }
            });
            // Fixme... Handle the case the provision hangs or never triggers?
          });

          // Add my ip
          try {
            await this.apiSvc.addIP(myIP, 'Direct IP');
          } catch(e) {
            this.snackbar.open('Something went wrong while adding your IP.', '', { duration: 10000 });
            throw e;
          }
        }
        this.setStatus(3, true);
        // Now we have to wait for the provision to finish (if set)...
        if (provisionSub)
          await provisionSub;
      } catch (e) {
        console.error(e);
        throw 3;
      }

      this.setStatus(4, true);

      // Now we have to return the user to his original uri
      window.location.href = this.data.url.toString();
      this.setStatus(5, true);
    } catch (e) {
      // @ts-ignore (TS tries to see a non-number here...)
      this.setStatus(e, false);
    } finally {
      this.statusOverallLoading = false;
      this.dialogRef.disableClose = false;
      setTimeout(() => this.dialogRef.close(), 8000);
    }
  }
}
