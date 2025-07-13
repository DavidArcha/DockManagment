import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, OnDestroy, OnInit, SimpleChanges, OnChanges
} from '@angular/core';
import { FormControl } from '@angular/forms';

type DateRange = { from: Date, to: Date | null };
type DateOrRange = Date | DateRange | null;

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
};
const DAYS = {
  en: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
};

@Component({
  selector: 'app-custom-date-picker',
  standalone: false,
  templateUrl: './custom-date-picker.component.html',
  styleUrl: './custom-date-picker.component.scss'
})

export class CustomDatePickerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() dateFormat: 'dd-mm-yyyy' | 'dd/mm/yyyy' | 'mm-dd-yyyy' = 'dd-mm-yyyy';
  @Input() initialDate: string | Date | DateRange | null = null;
  @Input() enableDateRangeSelection = false;
  @Input() showTimePicker = false;
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableWeekends = false;
  @Input() restrictFutureDates = false;
  @Input() closeOnSelect = true;
  @Input() language: 'en' | 'de' = 'en';
  @Input() customErrorMessage: string | null = null;
  @Output() selectedDate = new EventEmitter<DateOrRange>();
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('popupRef') popupRef!: ElementRef<HTMLDivElement>;

  isOpen = false;
  calendarWeeks: any[][] = [];
  inputControl = new FormControl('');
  errorMsg: string | null = null;
  displayValue = '';
  // Calendar header (month/year)
  viewMonth = new Date().getMonth();
  viewYear = new Date().getFullYear();

  // Date selection
  currentDate: Date = new Date();
  selected: DateOrRange = null;
  rangeStep: 'start' | 'end' = 'start';

  // Time picker state
  hours = 0;
  minutes = 0;

  private globalClickUnlistener?: (e: Event) => void;

  ngOnInit() {
    this.setInitialDate(this.initialDate);
    this.inputControl.valueChanges.subscribe(v => this.onInputChange(v || ''));
    this.buildCalendar(); // Initialize calendar on component load
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('initialDate' in changes && changes['initialDate'].currentValue !== undefined) {
      this.setInitialDate(changes['initialDate'].currentValue);
    }
    if ('language' in changes && this.isOpen) {
      this.buildCalendar();
    }
  }

  ngOnDestroy() {
    this.removeGlobalClickListener();
  }

  openPopup() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.opened.emit();
    this.setCalendarToSelected();
    this.buildCalendar();
    setTimeout(() => {
      this.addGlobalClickListener();
      this.focusFirstDay();
    });
  }

  closePopup() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closed.emit();
    this.removeGlobalClickListener();
  }

  togglePopup() {
    this.isOpen ? this.closePopup() : this.openPopup();
  }

  @HostListener('keydown', ['$event'])
  handleKeydown(e: KeyboardEvent) {
    if (this.isOpen && e.key === 'Escape') {
      e.preventDefault();
      this.closePopup();
    }
  }

  // Add/Remove document click
  addGlobalClickListener() {
    this.globalClickUnlistener = this.onGlobalClick.bind(this);
    document.addEventListener('mousedown', this.globalClickUnlistener);
    document.addEventListener('touchstart', this.globalClickUnlistener);
  }
  removeGlobalClickListener() {
    if (this.globalClickUnlistener) {
      document.removeEventListener('mousedown', this.globalClickUnlistener);
      document.removeEventListener('touchstart', this.globalClickUnlistener);
      this.globalClickUnlistener = undefined;
    }
  }
  onGlobalClick(e: Event) {
    if (
      !this.inputRef.nativeElement.contains(e.target as Node) &&
      !this.popupRef?.nativeElement.contains(e.target as Node)
    ) {
      this.closePopup();
    }
  }

  setInitialDate(value: string | Date | DateRange | null) {
    this.selected = null;
    if (!value) {
      this.displayValue = '';
      this.inputControl.setValue('');
      return;
    }
    if (this.enableDateRangeSelection && typeof value === 'object' && 'from' in value && value.from) {
      this.selected = { from: new Date(value.from), to: value.to ? new Date(value.to) : null };
      this.displayValue = this.formatDateRange(this.selected as DateRange);
    } else if (value instanceof Date || typeof value === 'string') {
      const d = this.parseDate(value);
      if (d && this.isDateEnabled(d)) {
        this.selected = d;
        this.displayValue = this.formatDate(d);
        if (this.showTimePicker) {
          this.hours = d.getHours();
          this.minutes = d.getMinutes();
        }
      } else {
        this.selected = null;
        this.displayValue = '';
      }
    }
    this.inputControl.setValue(this.displayValue, { emitEvent: false });
    this.setCalendarToSelected();
  }

  setCalendarToSelected() {
    let d: Date;
    if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected && this.selected.from) {
      d = new Date(this.selected.from);
    } else if (this.selected instanceof Date) {
      d = new Date(this.selected);
    } else {
      d = new Date();
    }
    this.viewMonth = d.getMonth();
    this.viewYear = d.getFullYear();
  }

  // Calendar builder
  buildCalendar() {
    const weeks: any[][] = [];
    const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);
    const startDay = firstOfMonth.getDay(); // 0 (Sun) .. 6 (Sat)
    let current = new Date(this.viewYear, this.viewMonth, 1 - startDay);
    
    for (let w = 0; w < 6; w++) {
      const week: any[] = [];
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(current);
        const isOtherMonth = current.getMonth() !== this.viewMonth;
        
        week.push({
          date: currentDate,
          label: current.getDate(),
          isOtherMonth,
          isToday: this.isSameDay(current, new Date()),
          isSelected: this.isSelectedDay(current),
          isInRange: this.isInRange(current),
          disabled: !this.isDateEnabled(currentDate) // Pass the date copy to avoid issues
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    this.calendarWeeks = weeks;
  }

  prevMonth() {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
    this.buildCalendar();
  }
  nextMonth() {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
    this.buildCalendar();
  }
  changeMonth(m: number) {
    this.viewMonth = m;
    this.buildCalendar();
  }
  changeYear(y: number) {
    this.viewYear = y;
    this.buildCalendar();
  }

  selectDateCell(cell: any) {
    if (cell.disabled) return;
    let d = new Date(cell.date);
    if (this.showTimePicker) {
      d.setHours(this.hours);
      d.setMinutes(this.minutes);
      d.setSeconds(0);
      d.setMilliseconds(0);
    }
    if (this.enableDateRangeSelection) {
      if (!this.selected || (this.selected as DateRange).to) {
        this.selected = { from: d, to: null };
        this.rangeStep = 'end';
      } else if (this.rangeStep === 'end') {
        const from = (this.selected as DateRange).from;
        if (d < from) {
          this.selected = { from: d, to: from };
        } else {
          this.selected = { from, to: d };
        }
        this.rangeStep = 'start';
        this.displayValue = this.formatDateRange(this.selected as DateRange);
        this.selectedDate.emit(this.selected);
        if (this.closeOnSelect) this.closePopup();
      }
    } else {
      this.selected = d;
      this.displayValue = this.formatDate(d);
      this.inputControl.setValue(this.displayValue, { emitEvent: false });
      this.selectedDate.emit(this.getSelectedDateForEmit());
      if (this.closeOnSelect) this.closePopup();
    }
    this.buildCalendar();
  }

  // For time picker
  onTimeChange() {
    if (this.selected instanceof Date) {
      this.selected.setHours(this.hours, this.minutes, 0, 0);
      this.displayValue = this.formatDate(this.selected);
      this.inputControl.setValue(this.displayValue, { emitEvent: false });
      this.selectedDate.emit(this.getSelectedDateForEmit());
    }
  }

  // Today/Clear handlers
  setToday() {
    const now = new Date();
    if (this.enableDateRangeSelection) {
      this.selected = { from: now, to: now };
      this.displayValue = this.formatDateRange(this.selected);
    } else {
      if (this.showTimePicker) {
        this.hours = now.getHours();
        this.minutes = now.getMinutes();
      }
      this.selected = now;
      this.displayValue = this.formatDate(now);
    }
    this.inputControl.setValue(this.displayValue, { emitEvent: false });
    this.selectedDate.emit(this.getSelectedDateForEmit());
    this.closePopup();
    this.buildCalendar();
  }

  clearValue() {
    this.selected = null;
    this.displayValue = '';
    this.inputControl.setValue('', { emitEvent: false });
    this.selectedDate.emit(null);
    this.errorMsg = null;
    this.closePopup();
    this.buildCalendar();
  }

  // Helpers
  formatDate(d: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    let str = '';
    switch (this.dateFormat) {
      case 'dd-mm-yyyy':
        str = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
        break;
      case 'dd/mm/yyyy':
        str = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        break;
      case 'mm-dd-yyyy':
        str = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;
        break;
    }
    if (this.showTimePicker)
      str += ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return str;
  }
  formatDateRange(range: DateRange): string {
    if (!range.from || !range.to) return '';
    return `${this.formatDate(range.from)} to ${this.formatDate(range.to)}`;
  }
  parseDate(val: string | Date): Date | null {
    if (val instanceof Date) return val;
    if (!val) return null;
    let re, parts;
    switch (this.dateFormat) {
      case 'dd-mm-yyyy':
        re = /^(\d{2})-(\d{2})-(\d{4})/;
        break;
      case 'dd/mm/yyyy':
        re = /^(\d{2})\/(\d{2})\/(\d{4})/;
        break;
      case 'mm-dd-yyyy':
        re = /^(\d{2})-(\d{2})-(\d{4})/;
        break;
    }
    parts = re.exec(val);
    if (!parts) return null;
    let [, d1, d2, y] = parts;
    let dd = parseInt(this.dateFormat.startsWith('dd') ? d1 : d2, 10);
    let mm = parseInt(this.dateFormat.startsWith('dd') ? d2 : d1, 10) - 1;
    let dateObj = new Date(+y, mm, dd);
    // Parse time if present
    let timeMatch = val.match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
      dateObj.setHours(+timeMatch[1]);
      dateObj.setMinutes(+timeMatch[2]);
    }
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  isDateEnabled(d: Date): boolean {
    // Add null/undefined check at the beginning
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
      return false;
    }
    
    if (this.minDate && d < this.stripTime(this.minDate)) return false;
    if (this.maxDate && d > this.stripTime(this.maxDate)) return false;
    if (this.restrictFutureDates && d > this.stripTime(new Date())) return false;
    if (this.disableWeekends && (d.getDay() === 0 || d.getDay() === 6)) return false;
    return true;
  }
  isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }
  isSelectedDay(d: Date): boolean {
    if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected) {
      const from = (this.selected as DateRange).from;
      const to = (this.selected as DateRange).to;
      return (from && this.isSameDay(d, from)) || (to && this.isSameDay(d, to)) || false;
    } else if (this.selected instanceof Date) {
      return this.isSameDay(d, this.selected);
    }
    return false;
  }
  isInRange(d: Date): boolean {
    if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected && this.selected.to) {
      let { from, to } = this.selected as DateRange;
      return to ? d >= this.stripTime(from) && d <= this.stripTime(to) : false;
    }
    return false;
  }
  stripTime(d: Date): Date {
    // Add null/undefined check and ensure d is a Date object
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
      return new Date(); // Return current date as fallback
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  focusFirstDay() {
    // Optional: set focus for accessibility
  }

  // Input change/validation
  onInputChange(value: string) {
    if (!value) {
      this.selected = null;
      this.errorMsg = null;
      this.selectedDate.emit(null);
      return;
    }
    // Parse for date/range
    let valid = false;
    if (this.enableDateRangeSelection && value.includes('to')) {
      let [start, end] = value.split('to').map(v => v.trim());
      let from = this.parseDate(start), to = this.parseDate(end);
      if (from && to && this.isDateEnabled(from) && this.isDateEnabled(to) && from <= to) {
        this.selected = { from, to };
        this.errorMsg = null;
        this.selectedDate.emit(this.selected);
        valid = true;
      }
    } else {
      let d = this.parseDate(value);
      if (d && this.isDateEnabled(d)) {
        if (this.showTimePicker) {
          this.hours = d.getHours();
          this.minutes = d.getMinutes();
        }
        this.selected = d;
        this.errorMsg = null;
        this.selectedDate.emit(this.selected);
        valid = true;
      }
    }
    if (!valid) {
      this.selected = null;
      this.errorMsg = this.customErrorMessage ||
        (this.language === 'de'
          ? 'Ungültiges Datum oder außerhalb des zulässigen Bereichs.'
          : 'Invalid date or out of allowed range.');
    }
  }

  // Input placeholder
  getPlaceholder(): string {
    switch (this.dateFormat) {
      case 'dd-mm-yyyy': return '__-__-____';
      case 'dd/mm/yyyy': return '__/__/____';
      case 'mm-dd-yyyy': return '__-__-____';
    }
    return '__-__-____';
  }

  // Month/Year dropdown arrays
  get months(): string[] { 
    return MONTHS[this.language] || MONTHS['en'] || [];
  }
  get days(): string[] { 
    return DAYS[this.language] || DAYS['en'] || [];
  }
  get years(): number[] {
    try {
      const now = new Date();
      let minY = this.minDate ? this.minDate.getFullYear() : now.getFullYear() - 100;
      let maxY = this.maxDate ? this.maxDate.getFullYear() : now.getFullYear() + 20;
      if (this.restrictFutureDates && maxY > now.getFullYear()) maxY = now.getFullYear();
      
      const res: number[] = [];
      for (let y = minY; y <= maxY; y++) res.push(y);
      
      // Ensure we always return a valid array with at least one year
      return res.length > 0 ? res : [now.getFullYear()];
    } catch (error) {
      console.error('Error in years getter:', error);
      // Fallback in case of any error
      const currentYear = new Date().getFullYear();
      return [currentYear - 1, currentYear, currentYear + 1];
    }
  }

  getSelectedDateForEmit(): DateOrRange {
    if (this.enableDateRangeSelection) return this.selected;
    if (this.selected instanceof Date) {
      let d = new Date(this.selected);
      if (this.showTimePicker) d.setHours(this.hours, this.minutes, 0, 0);
      return d;
    }
    return null;
  }
}
