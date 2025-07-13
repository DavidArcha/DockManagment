import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DateFormat, Language, DateRange, CalendarCell, MonthYear, TimeSelection, Translations } from './types/date-picker.types';

@Component({
  selector: 'app-custom-calender',
  standalone: false, // If using standalon// Add these imports for standalone
  templateUrl: './custom-calender.component.html',
  styleUrl: './custom-calender.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomCalenderComponent),
      multi: true
    }
  ]
})
export class CustomCalenderComponent implements OnInit, OnDestroy, ControlValueAccessor, OnChanges {
  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;
  @ViewChild('calendarPopup', { static: false }) calendarPopup!: ElementRef<HTMLDivElement>;

  // Input properties
  @Input() dateFormat: DateFormat = 'dd-mm-yyyy';
  @Input() language: Language = 'en';
  @Input() initialDate: string | Date | DateRange | null = null;
  @Input() enableDateRangeSelection: boolean = false;
  @Input() showTimePicker: boolean = false;
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableWeekends: boolean = false;
  @Input() restrictFutureDates: boolean = false;
  @Input() closeOnSelect: boolean = true;
  @Input() customErrorMessage: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;

  // Output events
  @Output() selectedDate = new EventEmitter<Date | DateRange | null>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // Internal state
  isPopupOpen = false;
  displayValue = '';
  errorMessage = '';
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  calendarCells: CalendarCell[] = [];
  selectedStartDate: Date | null = null;
  selectedEndDate: Date | null = null;
  selectedSingleDate: Date | null = null;
  selectedTime: TimeSelection = { hours: 0, minutes: 0 };
  isSelectingEndDate = false;
  
  // Form control
  dateControl = new FormControl('');

  // ControlValueAccessor
  private onChange = (value: any) => {};
  private onTouched = () => {};

  // Translations
  private translations: Translations = {
    en: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      today: 'Today',
      clear: 'Clear',
      invalidDate: 'Invalid date format',
      selectDate: 'Select date',
      selectStartDate: 'Select start date',
      selectEndDate: 'Select end date'
    },
    de: {
      months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
      monthsShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
      weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      weekdaysShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      today: 'Heute',
      clear: 'Löschen',
      invalidDate: 'Ungültiges Datumsformat',
      selectDate: 'Datum auswählen',
      selectStartDate: 'Startdatum auswählen',
      selectEndDate: 'Enddatum auswählen'
    }
  };

  // Add a subscription property to track the form control subscription
  private subscription: any;

  // Add destroy subject
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.generateCalendar();
    this.initializePlaceholder();
    this.setInitialDate();
    
    // Handle initial disabled state
    if (this.disabled) {
      this.dateControl.disable();
    }
    
    // Subscribe to input changes and store the subscription
    this.subscription = this.dateControl.valueChanges.subscribe(value => {
      this.onInputChange(value || '');
    });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialDate'] && !changes['initialDate'].firstChange) {
      this.setInitialDate();
    }
    if (changes['language']) {
      this.initializePlaceholder();
    }
    if (changes['dateFormat']) {
      this.initializePlaceholder();
      this.updateDisplayValue();
    }
    
    // Handle disabled state changes
    if (changes['disabled']) {
      if (this.disabled) {
        this.dateControl.disable();
      } else {
        this.dateControl.enable();
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      this.setDateValue(value);
    } else {
      this.clearSelection();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.dateControl.disable();
    } else {
      this.dateControl.enable();
    }
  }

  // Event handlers
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.isPopupOpen && !this.isClickInsideComponent(event)) {
      this.closePopup();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isPopupOpen) {
      this.closePopup();
    }
  }

  onInputClick() {
    if (!this.disabled) {
      this.openPopup();
    }
  }

  onCalendarIconClick() {
    if (!this.disabled) {
      this.openPopup();
    }
  }

  onInputChange(value: string) {
    this.displayValue = value;
    this.validateAndParseInput(value);
  }

  onDateCellClick(cell: CalendarCell) {
    if (cell.isDisabled) return;

    if (this.enableDateRangeSelection) {
      this.handleRangeDateSelection(cell.date);
    } else {
      this.handleSingleDateSelection(cell.date);
    }
  }

  
  onClearClick() {
    this.clearSelection();
    this.closePopup();
  }

  onMonthChange(month: number) {
    this.currentMonth = month;
    this.generateCalendar();
  }

  onYearChange(year: number) {
    this.currentYear = year;
    this.generateCalendar();
  }

  onPreviousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  onNextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  onTimeChange(type: 'hours' | 'minutes', value: number) {
    this.selectedTime[type] = value;
    if (this.selectedSingleDate) {
      this.emitSingleValue();
    }
  }

  onTodayClick() {
    const today = new Date();
    
    // Update calendar to show current month
    this.currentMonth = today.getMonth();
    this.currentYear = today.getFullYear();
    
    if (this.enableDateRangeSelection) {
      this.selectedStartDate = today;
      this.selectedEndDate = today;
      this.emitRangeValue();
    } else {
      this.selectedSingleDate = today;
      this.emitSingleValue();
    }
    this.updateDisplayValue();
    this.generateCalendar();
    if (this.closeOnSelect) {
      this.closePopup();
    }
  }

  // Private methods
  private setInitialDate() {
    if (!this.initialDate) return;

    if (this.enableDateRangeSelection) {
      if (typeof this.initialDate === 'object' && 'from' in this.initialDate) {
        this.selectedStartDate = this.initialDate.from;
        this.selectedEndDate = this.initialDate.to;
      }
    } else {
      if (typeof this.initialDate === 'string') {
        const parsed = this.parseStringToDate(this.initialDate);
        if (parsed) {
          this.selectedSingleDate = parsed;
        }
      } else if (this.initialDate instanceof Date) {
        this.selectedSingleDate = new Date(this.initialDate);
      }
    }

    this.updateDisplayValue();
    this.generateCalendar();
  }

  private setDateValue(value: any) {
    if (this.enableDateRangeSelection && typeof value === 'object' && value.from && value.to) {
      this.selectedStartDate = new Date(value.from);
      this.selectedEndDate = new Date(value.to);
    } else if (value instanceof Date || typeof value === 'string') {
      const date = value instanceof Date ? value : this.parseStringToDate(value);
      if (date) {
        this.selectedSingleDate = date;
      }
    }
    this.updateDisplayValue();
    this.generateCalendar();
  }

  private initializePlaceholder() {
    if (this.placeholder) return;
    
    const formatMap = {
      'dd-mm-yyyy': '__-__-____',
      'dd/mm/yyyy': '__/__/____',
      'mm-dd-yyyy': '__-__-____'
    };
    this.placeholder = formatMap[this.dateFormat];
  }

  private openPopup() {
    this.isPopupOpen = true;
    this.opened.emit();
    
    // Set current month/year to selected date if available
    if (this.selectedSingleDate) {
      this.currentMonth = this.selectedSingleDate.getMonth();
      this.currentYear = this.selectedSingleDate.getFullYear();
    } else if (this.selectedStartDate) {
      this.currentMonth = this.selectedStartDate.getMonth();
      this.currentYear = this.selectedStartDate.getFullYear();
    }
    
    this.generateCalendar();
  }

  private closePopup() {
    this.isPopupOpen = false;
    this.closed.emit();
    this.onTouched();
  }

  private isClickInsideComponent(event: Event): boolean {
    const target = event.target as HTMLElement;
    return this.dateInput?.nativeElement.contains(target) || 
           this.calendarPopup?.nativeElement.contains(target) || false;
  }

  private validateAndParseInput(value: string) {
    this.errorMessage = '';
    
    if (!value.trim()) {
      this.clearSelection();
      return;
    }

    if (this.enableDateRangeSelection) {
      this.parseRangeInput(value);
    } else {
      this.parseSingleDateInput(value);
    }
  }

  private parseSingleDateInput(value: string) {
    const date = this.parseStringToDate(value);
    if (date && this.isDateValid(date)) {
      this.selectedSingleDate = date;
      this.emitSingleValue();
      this.generateCalendar();
    } else if (value.length >= this.getFormatLength()) {
      this.errorMessage = this.customErrorMessage || this.translations[this.language].invalidDate;
    }
  }

  private parseRangeInput(value: string) {
    const parts = value.split(' to ');
    if (parts.length === 2) {
      const startDate = this.parseStringToDate(parts[0].trim());
      const endDate = this.parseStringToDate(parts[1].trim());
      
      if (startDate && endDate && this.isDateValid(startDate) && this.isDateValid(endDate)) {
        this.selectedStartDate = startDate;
        this.selectedEndDate = endDate;
        this.emitRangeValue();
        this.generateCalendar();
      } else {
        this.errorMessage = this.customErrorMessage || this.translations[this.language].invalidDate;
      }
    }
  }

  private parseStringToDate(dateStr: string): Date | null {
    const cleanStr = dateStr.trim();
    if (!cleanStr) return null;

    let day: number, month: number, year: number;

    switch (this.dateFormat) {
      case 'dd-mm-yyyy':
        const ddmmyyyy = cleanStr.split('-');
        if (ddmmyyyy.length === 3) {
          day = parseInt(ddmmyyyy[0]);
          month = parseInt(ddmmyyyy[1]) - 1;
          year = parseInt(ddmmyyyy[2]);
        } else return null;
        break;
      
      case 'dd/mm/yyyy':
        const ddmmyyyy2 = cleanStr.split('/');
        if (ddmmyyyy2.length === 3) {
          day = parseInt(ddmmyyyy2[0]);
          month = parseInt(ddmmyyyy2[1]) - 1;
          year = parseInt(ddmmyyyy2[2]);
        } else return null;
        break;
      
      case 'mm-dd-yyyy':
        const mmddyyyy = cleanStr.split('-');
        if (mmddyyyy.length === 3) {
          month = parseInt(mmddyyyy[0]) - 1;
          day = parseInt(mmddyyyy[1]);
          year = parseInt(mmddyyyy[2]);
        } else return null;
        break;
      
      default:
        return null;
    }

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return null;
    }
    
    return date;
  }

  // Change from private to public
  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();

    switch (this.dateFormat) {
      case 'dd-mm-yyyy':
        return `${day}-${month}-${year}`;
      case 'dd/mm/yyyy':
        return `${day}/${month}/${year}`;
      case 'mm-dd-yyyy':
        return `${month}-${day}-${year}`;
      default:
        return `${day}-${month}-${year}`;
    }
  }

  private getFormatLength(): number {
    return this.dateFormat.length;
  }

  private isDateValid(date: Date): boolean {
    if (this.minDate && date < this.minDate) return false;
    if (this.maxDate && date > this.maxDate) return false;
    if (this.restrictFutureDates && date > new Date()) return false;
    if (this.disableWeekends && (date.getDay() === 0 || date.getDay() === 6)) return false;
    return true;
  }

  private handleSingleDateSelection(date: Date) {
    this.selectedSingleDate = date;
    if (this.showTimePicker) {
      this.selectedTime = {
        hours: date.getHours(),
        minutes: date.getMinutes()
      };
    }
    
    // Update calendar to show the selected date's month
    this.currentMonth = date.getMonth();
    this.currentYear = date.getFullYear();
    
    this.emitSingleValue();
    this.updateDisplayValue();
    this.generateCalendar();
    
    if (this.closeOnSelect && !this.showTimePicker) {
      this.closePopup();
    }
  }

  private handleRangeDateSelection(date: Date) {
    if (!this.selectedStartDate || this.isSelectingEndDate) {
      if (this.selectedEndDate && date > this.selectedEndDate) {
        this.selectedStartDate = this.selectedEndDate;
        this.selectedEndDate = date;
      } else {
        this.selectedStartDate = date;
        this.selectedEndDate = null;
      }
      this.isSelectingEndDate = false;
      
      // Update calendar to show the start date's month
      this.currentMonth = date.getMonth();
      this.currentYear = date.getFullYear();
    } else {
      if (date < this.selectedStartDate) {
        this.selectedEndDate = this.selectedStartDate;
        this.selectedStartDate = date;
      } else {
        this.selectedEndDate = date;
      }
      this.isSelectingEndDate = true;
    }

    this.emitRangeValue();
    this.updateDisplayValue();
    this.generateCalendar();

    if (this.closeOnSelect && this.selectedStartDate && this.selectedEndDate) {
      this.closePopup();
    }
  }

  private emitSingleValue() {
    let dateToEmit = this.selectedSingleDate;
    
    if (dateToEmit && this.showTimePicker) {
      dateToEmit = new Date(dateToEmit);
      dateToEmit.setHours(this.selectedTime.hours, this.selectedTime.minutes, 0, 0);
    }
    
    this.selectedDate.emit(dateToEmit);
    this.onChange(dateToEmit);
  }

  private emitRangeValue() {
    const range: DateRange = {
      from: this.selectedStartDate,
      to: this.selectedEndDate
    };
    this.selectedDate.emit(range);
    this.onChange(range);
  }

  private updateDisplayValue() {
    if (this.enableDateRangeSelection) {
      if (this.selectedStartDate && this.selectedEndDate) {
        this.displayValue = `${this.formatDate(this.selectedStartDate)} to ${this.formatDate(this.selectedEndDate)}`;
      } else if (this.selectedStartDate) {
        this.displayValue = this.formatDate(this.selectedStartDate);
      } else {
        this.displayValue = '';
      }
    } else {
      this.displayValue = this.selectedSingleDate ? this.formatDate(this.selectedSingleDate) : '';
    }
    
    this.dateControl.setValue(this.displayValue, { emitEvent: false });
    
    // Update current month/year to match selected date
    this.updateCurrentMonthYear();
  }

  private updateCurrentMonthYear() {
    if (this.selectedSingleDate) {
      this.currentMonth = this.selectedSingleDate.getMonth();
      this.currentYear = this.selectedSingleDate.getFullYear();
    } else if (this.selectedStartDate) {
      this.currentMonth = this.selectedStartDate.getMonth();
      this.currentYear = this.selectedStartDate.getFullYear();
    }
  }

  private clearSelection() {
    this.selectedSingleDate = null;
    this.selectedStartDate = null;
    this.selectedEndDate = null;
    this.isSelectingEndDate = false;
    this.displayValue = '';
    this.errorMessage = '';
    this.dateControl.setValue('', { emitEvent: false });
    this.selectedDate.emit(null);
    this.onChange(null);
    this.generateCalendar();
  }

  private generateCalendar() {
    this.calendarCells = [];
    
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      cellDate.setHours(0, 0, 0, 0);

      const cell: CalendarCell = {
        date: new Date(cellDate),
        day: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === this.currentMonth,
        isToday: cellDate.getTime() === today.getTime(),
        isSelected: this.isCellSelected(cellDate),
        isInRange: this.isCellInRange(cellDate),
        isRangeStart: this.isCellRangeStart(cellDate),
        isRangeEnd: this.isCellRangeEnd(cellDate),
        isDisabled: !this.isDateValid(cellDate)
      };

      this.calendarCells.push(cell);
    }
  }

  private isCellSelected(date: Date): boolean {
    if (this.enableDateRangeSelection) {
      return (this.selectedStartDate !== null && this.isSameDay(date, this.selectedStartDate)) ||
             (this.selectedEndDate !== null && this.isSameDay(date, this.selectedEndDate));
    } else {
      return this.selectedSingleDate !== null && this.isSameDay(date, this.selectedSingleDate);
    }
  }

  private isCellInRange(date: Date): boolean {
    if (!this.enableDateRangeSelection || !this.selectedStartDate || !this.selectedEndDate) {
      return false;
    }
    return date > this.selectedStartDate && date < this.selectedEndDate;
  }

  private isCellRangeStart(date: Date): boolean {
    return this.enableDateRangeSelection && 
           this.selectedStartDate !== null && 
           this.isSameDay(date, this.selectedStartDate);
  }

  private isCellRangeEnd(date: Date): boolean {
    return this.enableDateRangeSelection && 
           this.selectedEndDate !== null && 
           this.isSameDay(date, this.selectedEndDate);
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  // Getter methods for template
  get currentMonthName(): string {
    return this.translations[this.language].months[this.currentMonth];
  }

  get weekdaysShort(): string[] {
    return this.translations[this.language].weekdaysShort;
  }

  get monthOptions(): {value: number, label: string}[] {
    return this.translations[this.language].months.map((month, index) => ({
      value: index,
      label: month
    }));
  }

  get yearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  }

  get hourOptions(): number[] {
    return Array.from({length: 24}, (_, i) => i);
  }

  get minuteOptions(): number[] {
    return Array.from({length: 60}, (_, i) => i);
  }

  get todayLabel(): string {
    return this.translations[this.language].today;
  }

  get clearLabel(): string {
    return this.translations[this.language].clear;
  }

  get selectDateLabel(): string {
    if (this.enableDateRangeSelection) {
      if (!this.selectedStartDate) {
        return this.translations[this.language].selectStartDate;
      } else if (!this.selectedEndDate) {
        return this.translations[this.language].selectEndDate;
      }
    }
    return this.translations[this.language].selectDate;
  }
}
