import { AfterViewInit, Component, ViewChild, Input, OnInit, OnChanges, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { APIIP } from '../../api.service';
import * as moment from 'moment';

@Component({
  selector: 'app-ip-table',
  templateUrl: './ip-table.component.html',
  styleUrls: ['./ip-table.component.css']
})
export class IpTableComponent implements OnInit, OnChanges, AfterViewInit {
  moment = moment;
  @ViewChild(MatPaginator) paginator: any;
  @ViewChild(MatTable) table: any;

  @Input() ro: boolean = false;
  @Input() pageSize: number = 10;
  @Input() data: APIIP[] = [];

  @Output() deleteEvents: EventEmitter<APIIP> = new EventEmitter<APIIP>();

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol', 'action'];
  dataSource?: MatTableDataSource<APIIP>;
  paginate: boolean = false;

  constructor() { }

  ngOnInit(): void {
    // DO NOT render table here, as the view does not respect it yet nor is the paginator ready!
  }

  ngOnChanges(): void {
    //if(!this.ro && this.displayedColumns.indexOf('action') == -1)
    //  this.displayedColumns.push('action');
    this.paginate = this.data.length > this.pageSize;
    this.dataSource = new MatTableDataSource<APIIP>(this.data);
    this.dataSource!.paginator = this.paginator;
    console.log(this.ro);
  }
  
  ngAfterViewInit() {
    this.ngOnChanges(); // To also inform the table to render initially
  }
}
