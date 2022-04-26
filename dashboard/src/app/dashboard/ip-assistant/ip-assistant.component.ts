import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { APIService } from 'src/app/api.service';

@Component({
  selector: 'app-ip-assistant',
  templateUrl: './ip-assistant.component.html',
  styleUrls: ['./ip-assistant.component.css']
})
export class IpAssistantComponent implements OnInit {
  @Output() ip: EventEmitter<string> = new EventEmitter<string>();
  publicIP?: string;

  ipForm = this.formBuilder.group({
    name: [null, Validators.required],
    ip: [null, Validators.required]
  });

  constructor(private formBuilder: FormBuilder, private api: APIService, private dialogRef: MatDialogRef<IpAssistantComponent>) { }

  async ngOnInit(): Promise<void> {
    this.publicIP = await this.api.getPublicIP();
  }

  onSubmit(): void {
    this.resolve(this.ipForm.value.ip, this.ipForm.value.name);
  }

  onDirect(): void {
    this.resolve(this.publicIP!, this.ipForm.value.name ? this.ipForm.value.name : 'Public IP');
  }

  resolve(ip: string, name: string): void {
    this.dialogRef.close({ip: ip, name: name});
  }
}