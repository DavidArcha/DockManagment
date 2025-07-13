import { Component } from '@angular/core';

type DateRange = { from: Date, to: Date | null };
type DateOrRange = Date | DateRange | null;

@Component({
  selector: 'app-date-picker-demo',
  standalone: false,
  templateUrl: './date-picker-demo.component.html',
  styleUrl: './date-picker-demo.component.scss'
})
export class DatePickerDemoComponent {
  min = new Date(2020, 0, 1); // January 1, 2020
  max = new Date(2030, 11, 31); // December 31, 2030

  onSelectedDate(date: DateOrRange) {
    console.log('Selected date:', date);
  }

  onOpened() {
    console.log('Date picker opened');
  }

  onClosed() {
    console.log('Date picker closed');
  }
}