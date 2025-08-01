import { Component } from '@angular/core';

/**
 * Type definition for date range selection
 * @property from - Start date of the range
 * @property to - End date of the range, can be null for in-progress selections
 */
type DateRange = { from: Date, to: Date | null };

/**
 * Combined type for all possible date picker return values
 * Can be a single Date, a DateRange object, or null if nothing selected
 */
type DateOrRange = Date | DateRange | null;

/**
 * Demo component showcasing all features of the CustomDatePickerComponent
 * Contains examples of all configuration options and tracks events
 */
@Component({
  selector: 'app-date-picker-demo',
  standalone: false,
  templateUrl: './date-picker-demo.component.html',
  styleUrl: './date-picker-demo.component.scss'
})
export class DatePickerDemoComponent {
  // Date constraints for min/max demos
  min = new Date(2020, 0, 1);  // January 1, 2020
  max = new Date(2030, 11, 31); // December 31, 2030

  // Initial date object for demo
  initialDateObject = new Date(2024, 6, 15); // July 15, 2024

  // Storage for selected values across demo examples
  selectedValues: Record<string, string> = {};

  // Event log to display component events
  eventLogs: string[] = [];

  /**
   * Handles the selectedDate event from any date picker instance
   * @param date - The selected date or date range
   * @param source - Identifier for which picker triggered the event
   */
  onSelectedDate(date: DateOrRange, source: string) {
    // Format the date/range for display
    this.selectedValues[source] = this.formatDateForDisplay(date);

    // Log the event with timestamp
    this.logEvent(`${source} date picker: Selection changed to ${this.selectedValues[source] || 'null'}`);
  }

  /**
   * Handles the opened event from any date picker instance
   * @param source - Identifier for which picker triggered the event
   */
  onOpened(source: string) {
    this.logEvent(`${source} date picker: Opened`);
  }

  /**
   * Handles the closed event from any date picker instance
   * @param source - Identifier for which picker triggered the event
   */
  onClosed(source: string) {
    this.logEvent(`${source} date picker: Closed`);
  }

  /**
   * Formats date objects for readable display in the demo UI
   * @param value - Date, DateRange, or null value to format
   * @returns Formatted string representation
   */
  private formatDateForDisplay(value: DateOrRange): string {
    if (!value) return 'No selection';

    // Helper to format individual dates
    const formatDate = (d: Date) => {
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` +
        (d.getHours() || d.getMinutes() ?
          ` ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` : '');
    };

    // Handle date range objects
    if (typeof value === 'object' && 'from' in value) {
      return `${formatDate(value.from)}${value.to ? ' to ' + formatDate(value.to) : ' (selecting end date...)'}`;
    }

    // Handle single date
    return formatDate(value as Date);
  }

  /**
   * Adds a new entry to the event log with timestamp
   * @param message - Event message to log
   */
  private logEvent(message: string) {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    this.eventLogs.unshift(`[${timestamp}] ${message}`);

    // Keep log to a reasonable size
    if (this.eventLogs.length > 20) {
      this.eventLogs.pop();
    }
  }
  selectedFormattedDate: string = '';

  onFormattedDate(dateStr: string) {
    this.selectedFormattedDate = dateStr;
    console.log('Selected date:', dateStr); // This will display in parent as requested
  }
  // In your parent component
  onFormattedDateReceived(formattedDate: string) {
    console.log('Received formatted date:', formattedDate);
    // Now you have the exact string format that's displayed in the input
  }

  /**
   * Handles date selection for format1 date picker
   * @param date - The selected date or date range
   */
  onDateSelected(date: DateOrRange) {
    // Call the existing method with a default source
    this.onSelectedDate(date, 'format1');
  }

  // Add these properties to your component class
  formattedMatchingDate: string = '15-/07/2025';
  formattedMismatchDate: string = '15/07/2025';
  selectedMismatchDate: string = '';

  // Add these methods
  setMatchingDateFormat() {
    // Get current date and format it as dd-mm-yyyy
    const today = new Date();
    this.formattedMatchingDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    console.log('Setting matching date format:', this.formattedMatchingDate);
  }

  setMismatchDateFormat() {
    // Get current date and format it with intentional mismatch (dd/mm/yyyy)
    const today = new Date();
    this.formattedMismatchDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    console.log('Setting mismatched date format:', this.formattedMismatchDate);
  }

  onFormattedDateWithMismatch(dateStr: string) {
    this.selectedMismatchDate = dateStr;
    console.log('Formatted date after mismatch handling:', dateStr);
  }
}