import { Component } from '@angular/core';

@Component({
  selector: 'app-date-picker-demo',
  standalone: false,
  templateUrl: './date-picker-demo.component.html',
  styleUrl: './date-picker-demo.component.scss'
})
export class DatePickerDemoComponent {
  eventLog: string[] = [];

  onSelect(label: string, value: any) {
    this.eventLog.unshift(`[${new Date().toLocaleTimeString()}] [${label}] Selected: ${JSON.stringify(value)}`);
    this.trimLog();
  }
  onOpened(label: string) {
    this.eventLog.unshift(`[${new Date().toLocaleTimeString()}] [${label}] Popup opened`);
    this.trimLog();
  }
  onClosed(label: string) {
    this.eventLog.unshift(`[${new Date().toLocaleTimeString()}] [${label}] Popup closed`);
    this.trimLog();
  }
  private trimLog() {
    if (this.eventLog.length > 50) this.eventLog.pop();
  }
}