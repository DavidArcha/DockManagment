import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-custom-date-picker',
  standalone: false,
  templateUrl: './custom-date-picker.component.html',
  styleUrl: './custom-date-picker.component.scss'
})
export class CustomDatePickerComponent implements OnInit, OnDestroy {
  @Input() label = 'Date';
  @Input() dateFormat: 'dd-mm-yyyy' | 'dd/mm/yyyy' | 'mm-dd-yyyy' = 'dd-mm-yyyy';
  @Input() initialDate?: string | Date | { from: string | Date, to: string | Date };
  @Input() showTimePicker = false;
  @Input() enableDateRangeSelection = false;
  @Input() minDate?: string | Date;
  @Input() maxDate?: string | Date;
  @Input() disableWeekends = false;
  @Input() restrictFutureDates = false;
  @Input() language: 'en' | 'de' = 'en';
  @Input() customErrorMessage?: string;
  @Input() readonly = false;
  @Input() disabled = false;
  @Input() closeOnSelect = true;

  @Output() selectedDate = new EventEmitter<any>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  inputId = `cdp-input-${Math.floor(Math.random() * 100000)}`;
  isOpen = false;
  popupMinWidth = 280;
  hasError = false;
  errorMessage = '';
  displayValue = '';
  displayPlaceholder = '';
  calendarWeeks: any[][] = [];
  dayLabels: string[] = [];
  monthList: string[] = [];
  yearList: number[] = [];
  todayLabel = 'Today';
  clearLabel = 'Clear';

  // Calendar state
  visibleYear: number;
  visibleMonth: number;
  selectedDateObj?: Date;
  rangeStart?: Date;
  rangeEnd?: Date;
  selectedHour = 0;
  selectedMinute = 0;

  ariaInputLabel = 'Date picker input';

  private clickUnlisten: ((e: any) => void) | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    // Defaults
    const today = new Date();
    this.visibleYear = today.getFullYear();
    this.visibleMonth = today.getMonth();
  }

  ngOnInit() {
    this.setLocale();
    this.setPlaceholder();
    this.initCalendar();
    if (this.initialDate) this.setInitialDate(this.initialDate);
  }
  ngOnDestroy() {
    this.removeClickListener();
  }

  setLocale() {
    if (this.language === 'de') {
      this.monthList = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
      this.dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
      this.todayLabel = 'Heute';
      this.clearLabel = 'Löschen';
      this.ariaInputLabel = 'Datumseingabe';
    } else {
      this.monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      this.dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.todayLabel = 'Today';
      this.clearLabel = 'Clear';
      this.ariaInputLabel = 'Date picker input';
    }
    this.refreshYearList();
  }

  setPlaceholder() {
    switch (this.dateFormat) {
      case 'dd-mm-yyyy': this.displayPlaceholder = '__-__-____'; break;
      case 'dd/mm/yyyy': this.displayPlaceholder = '__/__/____'; break;
      case 'mm-dd-yyyy': this.displayPlaceholder = '__-__-____'; break;
      default: this.displayPlaceholder = '__-__-____';
    }
  }

  setInitialDate(dateVal: any) {
    let date: Date | null = null;
    if (typeof dateVal === 'string') date = this.parseDateStr(dateVal);
    else if (dateVal instanceof Date) date = dateVal;
    else if (typeof dateVal === 'object' && dateVal.from) date = this.parseDateStr(dateVal.from);
    if (date) {
      this.selectedDateObj = date;
      this.visibleYear = date.getFullYear();
      this.visibleMonth = date.getMonth();
      this.displayValue = this.formatDisplay(date);
      if (this.showTimePicker) {
        this.selectedHour = date.getHours();
        this.selectedMinute = date.getMinutes();
      }
      this.refreshYearList();
      this.initCalendar();
    }
  }

  openPopup() {
    if (this.disabled) return;
    this.isOpen = true;
    setTimeout(() => this.addClickListener(), 0);
    this.initCalendar();
    this.opened.emit();
  }
  closePopup() {
    this.isOpen = false;
    this.removeClickListener();
    this.closed.emit();
  }
  togglePopup(ev?: MouseEvent) {
    ev?.stopPropagation();
    if (this.isOpen) this.closePopup(); else this.openPopup();
  }

  addClickListener() {
    if (!this.clickUnlisten) {
      this.clickUnlisten = this.handleOutsideClick.bind(this);
      document.addEventListener('mousedown', this.clickUnlisten);
    }
  }
  removeClickListener() {
    if (this.clickUnlisten) {
      document.removeEventListener('mousedown', this.clickUnlisten);
      this.clickUnlisten = null;
    }
  }
  handleOutsideClick(e: any) {
    const root = document.querySelector('.cdp-root.cdp-open');
    if (root && !root.contains(e.target)) this.closePopup();
  }

  onInputChange(val: string) {
    this.displayValue = val;
    const parsed = this.parseDateStr(val);
    if (parsed && this.isSelectable(parsed)) {
      this.hasError = false;
      this.selectedDateObj = parsed;
      if (this.showTimePicker) {
        this.selectedHour = parsed.getHours();
        this.selectedMinute = parsed.getMinutes();
      }
      this.selectedDate.emit(parsed);
      this.initCalendar();
    } else {
      this.hasError = true;
      this.errorMessage = this.customErrorMessage || (this.language === 'de' ? 'Ungültiges Datum' : 'Invalid date');
    }
  }
  onInputBlur() {
    // No-op for now (can validate/finalize)
  }

  onDayClick(day: any) {
    if (day.disabled) return;
    const sel = new Date(day.date);
    if (this.showTimePicker && this.selectedHour != null && this.selectedMinute != null) {
      sel.setHours(this.selectedHour, this.selectedMinute);
    }
    this.selectedDateObj = sel;
    this.displayValue = this.formatDisplay(sel);
    this.selectedDate.emit(sel);
    this.hasError = false;
    if (this.closeOnSelect) this.closePopup();
    this.initCalendar();
  }

  onHourChange(val: string) {
    this.selectedHour = +val;
    if (this.selectedDateObj) this.selectedDateObj.setHours(this.selectedHour);
    this.updateDisplayTime();
  }
  onMinuteChange(val: string) {
    this.selectedMinute = +val;
    if (this.selectedDateObj) this.selectedDateObj.setMinutes(this.selectedMinute);
    this.updateDisplayTime();
  }
  updateDisplayTime() {
    if (this.selectedDateObj) this.displayValue = this.formatDisplay(this.selectedDateObj);
  }

  onMonthOrYearChange() {
    this.refreshYearList();
    this.initCalendar();
    this.cdr.detectChanges();
  }
  prevMonth() {
    if (this.visibleMonth === 0) {
      this.visibleMonth = 11;
      this.visibleYear--;
    } else {
      this.visibleMonth--;
    }
    this.refreshYearList();
    this.initCalendar();
    this.cdr.detectChanges();
  }
  nextMonth() {
    if (this.visibleMonth === 11) {
      this.visibleMonth = 0;
      this.visibleYear++;
    } else {
      this.visibleMonth++;
    }
    this.refreshYearList();
    this.initCalendar();
    this.cdr.detectChanges();
  }
  private refreshYearList() {
    this.yearList = Array.from({ length: 21 }, (_, i) => this.visibleYear - 10 + i);
  }

  setToday() {
    const now = new Date();
    this.visibleYear = now.getFullYear();
    this.visibleMonth = now.getMonth();
    this.selectedDateObj = now;
    this.displayValue = this.formatDisplay(now);
    if (this.showTimePicker) {
      this.selectedHour = now.getHours();
      this.selectedMinute = now.getMinutes();
    }
    this.refreshYearList();
    this.selectedDate.emit(now);
    this.hasError = false;
    this.closePopup();
  }
  clear() {
    this.selectedDateObj = undefined;
    this.displayValue = '';
    this.hasError = false;
    this.selectedDate.emit(null);
    this.initCalendar();
  }

  // --------- THE KEY FIXED CALENDAR CODE! ---------
  initCalendar() {
    const month = this.visibleMonth;
    const year = this.visibleYear;

    // First day of month
    const firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startDate = new Date(year, month, 1 - daysToMonday);

    this.calendarWeeks = [];
    for (let week = 0; week < 6; week++) {
      const weekArray: any[] = [];
      for (let day = 0; day < 7; day++) {
        const dayOffset = week * 7 + day;
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayOffset);

        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = this.isSameDate(currentDate, new Date());
        const isSelected = this.selectedDateObj && this.isSameDate(currentDate, this.selectedDateObj);

        // The key fix:
        // - Out-of-month days always disabled
        // - In-month days only disabled by isDisabled()!
        const isDisabled = !isCurrentMonth || this.isDisabled(currentDate);

        weekArray.push({
          label: currentDate.getDate().toString(),
          date: new Date(currentDate),
          isToday,
          isSelected,
          disabled: isDisabled,
          isCurrentMonth,
          isFocusable: !isDisabled && isCurrentMonth,
          inRange: false
        });
      }
      this.calendarWeeks.push(weekArray);
    }
  }

  isDisabled(date: Date): boolean {
    if (this.minDate) {
      const min = this.parseDateStr(this.minDate);
      if (min && date < min) return true;
    }
    if (this.maxDate) {
      const max = this.parseDateStr(this.maxDate);
      if (max && date > max) return true;
    }
    if (this.disableWeekends && (date.getDay() === 0 || date.getDay() === 6)) return true;
    if (this.restrictFutureDates && date > new Date()) return true;
    return false;
  }
  isSelectable(date: Date): boolean {
    return !this.isDisabled(date);
  }
  isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  parseDateStr(val: string | Date): Date | null {
    if (val instanceof Date) return val;
    if (!val || typeof val !== 'string') return null;
    let d: number | undefined, m: number | undefined, y: number | undefined;
    let match;
    if (this.dateFormat === 'dd-mm-yyyy' || this.dateFormat === 'dd/mm/yyyy') {
      match = val.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})/);
      if (match) [d, m, y] = [+match[1], +match[2], +match[3]];
    } else if (this.dateFormat === 'mm-dd-yyyy') {
      match = val.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})/);
      if (match) [m, d, y] = [+match[1], +match[2], +match[3]];
    }
    if (d && m && y) return new Date(y, m - 1, d, this.selectedHour, this.selectedMinute);
    return null;
  }
  formatDisplay(date: Date): string {
    const dd = ('0' + date.getDate()).slice(-2);
    const mm = ('0' + (date.getMonth() + 1)).slice(-2);
    const yyyy = date.getFullYear();
    let formatted = '';
    if (this.dateFormat === 'dd-mm-yyyy') formatted = `${dd}-${mm}-${yyyy}`;
    else if (this.dateFormat === 'dd/mm/yyyy') formatted = `${dd}/${mm}/${yyyy}`;
    else if (this.dateFormat === 'mm-dd-yyyy') formatted = `${mm}-${dd}-${yyyy}`;
    if (this.showTimePicker)
      formatted += ` ${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}`;
    return formatted;
  }

  isPrevMonthDisabled(): boolean {
    if (!this.minDate) return false;
    const min = this.parseDateStr(this.minDate);
    if (!min) return false;
    return new Date(this.visibleYear, this.visibleMonth - 1, 1) < new Date(min.getFullYear(), min.getMonth(), 1);
  }
  isNextMonthDisabled(): boolean {
    if (!this.maxDate) return false;
    const max = this.parseDateStr(this.maxDate);
    if (!max) return false;
    return new Date(this.visibleYear, this.visibleMonth + 1, 1) > new Date(max.getFullYear(), max.getMonth(), 1);
  }

  onComponentKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.closePopup();
  }
  onPopupKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.closePopup();
  }

  trackByWeek(index: number, week: any[]): any {
    return index;
  }
  trackByDay(index: number, day: any): any {
    return day.date.getTime();
  }
}
