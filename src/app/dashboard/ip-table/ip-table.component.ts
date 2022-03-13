import { AfterViewInit, Component, ViewChild, Input, OnInit, OnChanges } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as moment from 'moment';

export interface IPTableRow {
  name: string;
  ip: string;
  added: Date;
  expires: Date;
}

@Component({
  selector: 'app-ip-table',
  templateUrl: './ip-table.component.html',
  styleUrls: ['./ip-table.component.css']
})
export class IpTableComponent implements OnInit, OnChanges, AfterViewInit {
  moment = moment;
  @ViewChild(MatPaginator) paginator: any;

  @Input('ro') ro: boolean = false;
  @Input('pageSize') pageSize: number = 10;
  @Input('data') dd: IPTableRow[] = [];

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol', 'action'];
  dataSource?: MatTableDataSource<IPTableRow>;
  paginate: boolean = false;

  constructor() { }

  ngOnInit(): void {
    // DO NOT render table here, as the view does not respect it yet nor is the paginator ready!
  }

  ngOnChanges(): void {
    //if(!this.ro && this.displayedColumns.indexOf('action') == -1)
    //  this.displayedColumns.push('action');
    this.paginate = this.dd.length > this.pageSize;
    this.dataSource = new MatTableDataSource<IPTableRow>(this.dd);
    this.dataSource.paginator = this.paginator;
  }
  
  ngAfterViewInit() {
    this.ngOnChanges(); // To also inform the table to render initially
  }
}
