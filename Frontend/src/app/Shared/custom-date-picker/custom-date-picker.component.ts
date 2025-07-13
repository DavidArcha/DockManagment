import {
  Component, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, OnDestroy, OnInit, SimpleChanges, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef, Renderer2, NgZone
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';

// Add these interface definitions at the top of your file
interface CalendarDay {
  date: Date;
  label: number;
  isOtherMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  disabled: boolean;
}

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
  styleUrl: './custom-date-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomDatePickerComponent implements OnInit, OnChanges, OnDestroy {
  // Update the dateFormat Input type to support all formats
  @Input() dateFormat: string = 'dd-mm-yyyy';
  @Input() initialDate: string | Date | DateRange | null = null;
  @Input() enableDateRangeSelection = false;
  @Input() showTimePicker = false;
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() disableWeekends = false;
  @Input() restrictFutureDates = false;
  @Input() closeOnSelect = true;
  @Input() language: 'en' | 'de' = 'de';
  @Input() customErrorMessage: string | null = null;
  @Output() selectedDate = new EventEmitter<DateOrRange>();
  @Output() formattedDateStr = new EventEmitter<string>();  // Add this line
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('inputRef') inputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('popupRef') popupRef!: ElementRef<HTMLDivElement>;

  isOpen = false;
  calendarWeeks: CalendarDay[][] = [];
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

  // Cache properties
  private cachedMonth: number | null = null;
  private cachedYear: number | null = null; 
  private cachedWeeks: CalendarDay[][] = [];

  // New properties for format settings
  showFormatSettings = false;
  availableDateFormats = [
    // Day-Month-Year formats
    'dd-mm-yyyy',
    'dd/mm/yyyy',
    'dd.mm.yyyy',
    'dd mmm yyyy',
    'dd-mmm-yyyy',
    'dd mmmm yyyy',
    'dd-mmmm-yyyy',
    
    // Month-Day-Year formats
    'mm-dd-yyyy',
    'mm/dd/yyyy',
    'mm.dd.yyyy',
    'mmm dd yyyy',
    'mmm-dd-yyyy',
    'mmmm dd yyyy',
    'mmmm-dd-yyyy',
    
    // Year-Month-Day formats (including ISO)
    'yyyy-mm-dd',
    'yyyy/mm/dd',
    'yyyy.mm.dd',
    
    // Short year formats
    'dd-mm-yy',
    'dd/mm/yy',
    'mm-dd-yy',
    'mm/dd/yy',
    'yy-mm-dd',
    'yy/mm/dd'
  ];
  timeFormatOption: '12hr' | '24hr' = '24hr';
  showTimeOption = false;
  enableFormatChange = false;
  
  // Use Angular's renderer for better testability and SSR compatibility
  constructor(
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private ngZone: NgZone
  ) {}

  private globalClickUnlistener?: () => void;
  private inputSubscription?: Subscription;

  private _years: number[] | null = null;

  ngOnInit() {
    this.setInitialDate(this.initialDate);
    this.inputSubscription = this.inputControl.valueChanges.subscribe(v => this.onInputChange(v || ''));
    // Only build calendar when necessary
    if (this.isOpen) {
      this.buildCalendar();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('initialDate' in changes && changes['initialDate'].currentValue !== undefined) {
      this.setInitialDate(changes['initialDate'].currentValue);
    }
    if ('language' in changes && this.isOpen) {
      this.buildCalendar();
    }
    if ('minDate' in changes || 'maxDate' in changes || 'restrictFutureDates' in changes) {
      this._years = null; // Reset years cache
    }
  }

  ngOnDestroy() {
    this.removeGlobalClickListener();
    // Explicitly unsubscribe from any subscriptions
    if (this.inputSubscription) {
      this.inputSubscription.unsubscribe();
    }
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
    if (this.isOpen) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.closePopup();
          break;
        case 'Tab':
          // Handle focus trapping
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown':
          // Implement keyboard navigation
          e.preventDefault();
          this.navigateCalendar(e.key);
          break;
      }
    }
  }

  // Add a new method to handle keyboard navigation
  navigateCalendar(direction: string) {
    // Implementation for keyboard navigation
    this.cdr.markForCheck();
  }

  // Add/Remove document click
  addGlobalClickListener() {
    if (this.globalClickUnlistener) {
      return; // Already listening
    }
    
    this.globalClickUnlistener = this.renderer.listen('document', 'mousedown', (e: Event) => {
      if (!this.elementRef.nativeElement.contains(e.target)) {
        this.closePopup();
        this.cdr.markForCheck();
      }
    });
  }
  removeGlobalClickListener() {
    if (this.globalClickUnlistener) {
      this.globalClickUnlistener();
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

  // Efficient date helpers
  private createDate(year: number, month: number, day: number): Date {
    const date = new Date(0);
    date.setFullYear(year, month, day);
    return date;
  }

  // Reuse date objects in cache
  buildCalendar() {
    this.ngZone.runOutsideAngular(() => {
      // Perform expensive calculations outside Angular's change detection
      // If the calendar is already built for this month/year, reuse it
      if (this.cachedMonth === this.viewMonth && 
          this.cachedYear === this.viewYear && 
          this.cachedWeeks.length > 0) {
        // Instead of returning, just update the display properties
        this.calendarWeeks = this.cachedWeeks.map(week => 
          week.map(day => ({
            ...day,
            isToday: this.isSameDay(day.date, new Date()),
            isSelected: this.isSelectedDay(day.date),
            isInRange: this.isInRange(day.date)
          }))
        );
        // Mark for check inside the zone
        this.ngZone.run(() => {
          this.cdr.markForCheck();
        });
        return;
      }
      
      const weeks: any[][] = [];

      // Create a date for the first day of the current viewing month
      const firstOfMonth = new Date(this.viewYear, this.viewMonth, 1);

      // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
      const firstDayOfWeek = firstOfMonth.getDay();

      // Calculate how many days to show from the previous month
      const daysFromPrevMonth = firstDayOfWeek;

      // Start from the first cell date (could be from previous month)
      const startDate = new Date(this.viewYear, this.viewMonth, 1 - daysFromPrevMonth);

      for (let w = 0; w < 6; w++) {
        const week: any[] = [];
        for (let d = 0; d < 7; d++) {
          // CREATE DATE CORRECTLY: Use a clean new Date object for each cell
          const dayOffset = w * 7 + d;

          // Create a completely fresh date for each cell
          const tempDate = new Date(startDate);
          tempDate.setDate(startDate.getDate() + dayOffset);
          // Create a fresh date to avoid mutation issues
          const currentCellDate = this.createDate(
            tempDate.getFullYear(),
            tempDate.getMonth(),
            tempDate.getDate()
          );

          // Check if this date belongs to current viewing month
          const isOtherMonth = currentCellDate.getMonth() !== this.viewMonth;

          week.push({
            date: new Date(currentCellDate),
            label: currentCellDate.getDate(),
            isOtherMonth,
            isToday: this.isSameDay(currentCellDate, new Date()),
            isSelected: this.isSelectedDay(currentCellDate),
            isInRange: this.isInRange(currentCellDate),
            disabled: !this.isDateEnabled(currentCellDate)
          } as CalendarDay);
        }
        weeks.push(week);
      }

      this.calendarWeeks = weeks;
      this.cachedMonth = this.viewMonth;
      this.cachedYear = this.viewYear;
      this.cachedWeeks = weeks;
      // Mark for check inside the zone
      this.ngZone.run(() => {
        this.cdr.markForCheck();
      });
    });
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
    // Convert the value to a number explicitly (dropdown might return string)
    this.viewMonth = parseInt(m.toString(), 10);

    // Fix: Use numeric values in comparisons
    if (this.viewMonth === 11 && m === 0) {
      this.viewYear--;
    } else if (this.viewMonth === 0 && m === 11) {
      this.viewYear++;
    }

    // Rebuild the calendar with the new month
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
        this.formattedDateStr.emit(this.displayValue); // Add this line
        if (this.closeOnSelect) this.closePopup();
      }
    } else {
      this.selected = d;
      this.displayValue = this.formatDate(d);
      this.inputControl.setValue(this.displayValue, { emitEvent: false });
      this.selectedDate.emit(this.getSelectedDateForEmit());
      this.formattedDateStr.emit(this.displayValue); // Add this line
      console.log('Selected date (formatted):', this.displayValue); // Add console log
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
      this.formattedDateStr.emit(this.displayValue); // Add this line
      console.log('Selected date with time (formatted):', this.displayValue); // Add console log
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
      this.inputControl.setValue(this.displayValue, { emitEvent: false });
      this.selectedDate.emit(this.getSelectedDateForEmit());
      this.formattedDateStr.emit(this.displayValue); // Add this line
      console.log('Today selected (formatted):', this.displayValue); // Add console log
    }
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

  // Enhanced formatDate method to handle all formats
  formatDate(d: Date): string {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = this.language === 'de' ? 
      ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'] :
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const shortMonth = shortMonths[d.getMonth()];
    const fullMonth = fullMonths[d.getMonth()];
    const fullYear = d.getFullYear();
    const shortYear = d.getFullYear() % 100;
    
    let str = '';
    
    // Parse the format and replace parts
    const format = this.dateFormat.toLowerCase();
    
    if (format.includes('mmmm')) {
      // Full month name formats
      if (format.startsWith('mmmm')) {
        // Month first
        if (format.includes(' ')) {
          str = `${fullMonth} ${day} ${fullYear}`;
        } else {
          str = `${fullMonth}-${day}-${fullYear}`;
        }
      } else {
        // Day first
        if (format.includes(' ')) {
          str = `${day} ${fullMonth} ${fullYear}`;
        } else {
          str = `${day}-${fullMonth}-${fullYear}`;
        }
      }
    } else if (format.includes('mmm')) {
      // Short month name formats
      if (format.startsWith('mmm')) {
        // Month first
        if (format.includes(' ')) {
          str = `${shortMonth} ${day} ${fullYear}`;
        } else {
          str = `${shortMonth}-${day}-${fullYear}`;
        }
      } else {
        // Day first
        if (format.includes(' ')) {
          str = `${day} ${shortMonth} ${fullYear}`;
        } else {
          str = `${day}-${shortMonth}-${fullYear}`;
        }
      }
    } else {
      // Numeric formats
      const separator = format.includes('-') ? '-' : format.includes('/') ? '/' : format.includes('.') ? '.' : '-';
      const useShortYear = format.includes('yy') && !format.includes('yyyy');
      const year = useShortYear ? pad(shortYear) : fullYear;
      
      if (format.startsWith('yyyy') || format.startsWith('yy')) {
        // Year first (ISO-like)
        str = `${year}${separator}${month}${separator}${day}`;
      } else if (format.startsWith('mm')) {
        // Month first (US-like)
        str = `${month}${separator}${day}${separator}${year}`;
      } else {
        // Day first (European-like)
        str = `${day}${separator}${month}${separator}${year}`;
      }
    }
    
    // Add time if enabled
    if (this.showTimePicker) {
      const padHours = (n: number) => n < 10 ? '0' + n : n;
      const padMinutes = (n: number) => n < 10 ? '0' + n : n;
      
      if (this.timeFormatOption === '12hr') {
        const hours12 = this.hours === 0 ? 12 : (this.hours > 12 ? this.hours - 12 : this.hours);
        const ampm = this.hours >= 12 ? 'PM' : 'AM';
        str += ` ${padHours(hours12)}:${padMinutes(this.minutes)} ${ampm}`;
      } else {
        str += ` ${padHours(this.hours)}:${padMinutes(this.minutes)}`;
      }
    }
    
    return str;
  }
  formatDateRange(range: DateRange): string {
    if (!range.from || !range.to) return '';
    return `${this.formatDate(range.from)} to ${this.formatDate(range.to)}`;
  }
  // Enhanced parseDate method to handle all formats
  parseDate(val: string | Date): Date | null {
    try {
      if (val instanceof Date) return new Date(val.getTime());
      if (!val) return null;
      
      const format = this.dateFormat.toLowerCase();
      const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const fullMonths = this.language === 'de' ? 
        ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'] :
        ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    
    // Extract time portion if present
    let timePortion = '';
    let datePortion = val;
    
    if (val.includes(' ')) {
      const parts = val.split(' ');
      datePortion = parts[0];
      timePortion = parts.slice(1).join(' ');
    }
    
    let day: number, month: number, year: number;
    
    // Handle text month formats
    if (format.includes('mmmm') || format.includes('mmm')) {
      // Determine separator
      const separator = format.includes('-') ? '-' : format.includes('/') ? '/' : format.includes('.') ? '.' : ' ';
      const parts = datePortion.split(separator);
      
      if (parts.length !== 3) return null;
      
      // Check if month is first or second part
      const isMonthFirst = format.startsWith('mmm');
      const monthText = isMonthFirst ? parts[0].toLowerCase() : parts[1].toLowerCase();
      const dayText = isMonthFirst ? parts[1] : parts[0];
      const yearText = parts[2];
      
      // Try to match with short month names first
      let monthIndex = shortMonths.findIndex(m => monthText.startsWith(m));
      
      // If not found, try full month names
      if (monthIndex === -1) {
        monthIndex = fullMonths.findIndex(m => monthText.startsWith(m.substring(0, 3)));
      }
      
      if (monthIndex === -1) return null;
      
      day = parseInt(dayText, 10);
      month = monthIndex;
      year = parseInt(yearText, 10);
      
      if (year < 100) {
        // Handle 2-digit years
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        year = year + century;
        if (year > currentYear + 20) year -= 100; // Assume dates within 20 years in the future, otherwise previous century
      }
    } else {
      // Handle numeric formats
      let separator = '';
      if (datePortion.includes('-')) separator = '-';
      else if (datePortion.includes('/')) separator = '/';
      else if (datePortion.includes('.')) separator = '.';
      else return null;
      
      const parts = datePortion.split(separator);
      if (parts.length !== 3) return null;
      
      let firstPart = parseInt(parts[0], 10);
      let secondPart = parseInt(parts[1], 10);
      let thirdPart = parseInt(parts[2], 10);
      
      // Determine format pattern
      if (format.startsWith('yyyy') || format.startsWith('yy')) {
        // Year first (ISO-like)
        year = firstPart;
        month = secondPart - 1;
        day = thirdPart;
      } else if (format.startsWith('mm')) {
        // Month first (US-like)
        month = firstPart - 1;
        day = secondPart;
        year = thirdPart;
      } else {
        // Day first (European-like)
        day = firstPart;
        month = secondPart - 1;
        year = thirdPart;
      }
      
      if (year < 100) {
        // Handle 2-digit years
        const currentYear = new Date().getFullYear();
        const century = Math.floor(currentYear / 100) * 100;
        year = year + century;
        if (year > currentYear + 20) year -= 100;
      }
    }
    
    // Basic validation
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > new Date(year, month + 1, 0).getDate()) return null;
    
    const dateObj = new Date(year, month, day);
    
    // Parse time if present
    if (timePortion) {
      const timeMatch = timePortion.match(/(\d{1,2}):(\d{1,2})(?:\s*(am|pm))?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        
        if (ampm) {
          if (ampm === 'pm' && hours < 12) hours += 12;
          else if (ampm === 'am' && hours === 12) hours = 0;
        }
        
        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          dateObj.setHours(hours, minutes, 0, 0);
        }
      }
    }
    
    return isNaN(dateObj.getTime()) ? null : dateObj;
  } catch (err) {
    console.error('Error parsing date:', err);
    return null;
  }
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

  // Enhanced getPlaceholder method for all formats
  getPlaceholder(): string {
    const format = this.dateFormat.toLowerCase();
    
    // Handle text month formats
    if (format.includes('mmmm')) {
      if (format.startsWith('mmmm')) {
        return format.includes(' ') ? 'Month Day Year' : 'Month-Day-Year';
      } else {
        return format.includes(' ') ? 'Day Month Year' : 'Day-Month-Year';
      }
    } else if (format.includes('mmm')) {
      if (format.startsWith('mmm')) {
        return format.includes(' ') ? 'Mon Day Year' : 'Mon-Day-Year';
      } else {
        return format.includes(' ') ? 'Day Mon Year' : 'Day-Mon-Year';
      }
    } else {
      // Handle numeric formats
      const separator = format.includes('-') ? '-' : format.includes('/') ? '/' : format.includes('.') ? '.' : '-';
      const yearPlaceholder = format.includes('yyyy') ? '____' : '__';
      
      if (format.startsWith('yyyy') || format.startsWith('yy')) {
        // Year first (ISO)
        return `${yearPlaceholder}${separator}__${separator}__`;
      } else if (format.startsWith('mm')) {
        // Month first (US)
        return `__${separator}__${separator}${yearPlaceholder}`;
      } else {
        // Day first (European)
        return `__${separator}__${separator}${yearPlaceholder}`;
      }
    }
  }

  // Month/Year dropdown arrays
  get months(): string[] {
    return MONTHS[this.language] || MONTHS['en'] || [];
  }
  get days(): string[] {
    return DAYS[this.language] || DAYS['en'] || [];
  }
  get years(): number[] {
    if (this._years) {
      return this._years;
    }
    
    try {
      const now = new Date();
      let minY = this.minDate ? this.minDate.getFullYear() : now.getFullYear() - 100;
      let maxY = this.maxDate ? this.maxDate.getFullYear() : now.getFullYear() + 20;
      if (this.restrictFutureDates && maxY > now.getFullYear()) maxY = now.getFullYear();

      const res: number[] = [];
      for (let y = minY; y <= maxY; y++) res.push(y);
      
      this._years = res.length > 0 ? res : [now.getFullYear()];
      return this._years;
    } catch (error) {
      console.error('Error in years getter:', error);
      const currentYear = new Date().getFullYear();
      return [currentYear - 1, currentYear, currentYear + 1];
    }
  }

  toggleFormatSettings() {
    this.showFormatSettings = !this.showFormatSettings;
    this.cdr.markForCheck();
  }

  setDateFormat(format: 'dd-mm-yyyy' | 'dd/mm/yyyy' | 'mm-dd-yyyy') {
    this.dateFormat = format;
    if (this.selected) {
      if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected) {
        this.displayValue = this.formatDateRange(this.selected as DateRange);
      } else if (this.selected instanceof Date) {
        this.displayValue = this.formatDate(this.selected);
      }
      this.inputControl.setValue(this.displayValue, { emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  // Add this new method to handle the string to literal type conversion
  setDateFormatFromString(formatStr: string) {
    if (this.availableDateFormats.includes(formatStr)) {
      // We need to handle the new formats like dd-mmm-yyyy
      this.dateFormat = formatStr as any; // Using 'any' here as we're expanding beyond the original types
      if (this.selected) {
        if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected) {
          this.displayValue = this.formatDateRange(this.selected as DateRange);
        } else if (this.selected instanceof Date) {
          this.displayValue = this.formatDate(this.selected);
        }
        this.inputControl.setValue(this.displayValue, { emitEvent: false });
      }
      this.cdr.markForCheck();
    }
  }

  toggleTimeDisplay() {
    this.showTimePicker = this.showTimeOption;
    if (this.showTimePicker && this.selected instanceof Date) {
      const now = new Date();
      this.hours = now.getHours();
      this.minutes = now.getMinutes();
      if (this.selected) {
        this.selected.setHours(this.hours, this.minutes, 0, 0);
        this.displayValue = this.formatDate(this.selected);
        this.inputControl.setValue(this.displayValue, { emitEvent: false });
      }
    }
    this.cdr.markForCheck();
  }

  setTimeFormat(format: '12hr' | '24hr') {
    this.timeFormatOption = format;
    this.cdr.markForCheck();
  }

  // Convert 24hr to 12hr format
  get hours12(): number {
    if (this.hours === 0) return 12;
    return this.hours > 12 ? this.hours - 12 : this.hours;
  }

  // Get AM/PM value
  get amPm(): 'AM' | 'PM' {
    return this.hours >= 12 ? 'PM' : 'AM';
  }

  // Set hours with AM/PM consideration
  setHours12(value: number) {
    const h = parseInt(value.toString(), 10);
    if (isNaN(h)) return;
    
    if (this.amPm === 'AM') {
      this.hours = h === 12 ? 0 : h;
    } else {
      this.hours = h === 12 ? 12 : h + 12;
    }
    this.onTimeChange();
  }

  // Set AM/PM and update hours accordingly
  setAmPm(value: 'AM' | 'PM') {
    if (value === 'AM' && this.hours >= 12) {
      this.hours = this.hours === 12 ? 0 : this.hours - 12;
    } else if (value === 'PM' && this.hours < 12) {
      this.hours = this.hours === 0 ? 12 : this.hours + 12;
    }
    this.onTimeChange();
  }

  // Track functions for NgFor optimization
  trackByMonthIndex(index: number): number {
    return index;
  }

  trackByYear(index: number, year: number): number {
    return year;
  }

  trackByWeekIndex(index: number): number {
    return index;
  }

  trackByDayDate(index: number, day: CalendarDay): number {
    return day.date.getTime();
  }

  // Return the selected date in the appropriate format for the emitter
  getSelectedDateForEmit(): DateOrRange {
    if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected) {
      return this.selected;
    } else if (this.selected instanceof Date) {
      return new Date(this.selected);
    }
    return null;
  }

  toggleFormatChange() {
    if (!this.enableFormatChange) {
      // Reset to default format when unchecked
      this.dateFormat = 'dd-mm-yyyy';
      
      // Update display if a date is selected
      if (this.selected instanceof Date) {
        this.displayValue = this.formatDate(this.selected);
        this.inputControl.setValue(this.displayValue, { emitEvent: false });
      }
    }
    
    this.cdr.markForCheck();
  }

  // Add this method to the CustomDatePickerComponent class

  // Format date for tooltip in long format (e.g., 14-July-2025)
  formatDateForTooltip(date: Date | null): string {
    if (!date) return '';
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const germanMonths = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    const monthNames = this.language === 'de' ? germanMonths : months;
    
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    let formattedDate = `${day}-${month}-${year}`;
    
    // Add time if enabled
    if (this.showTimePicker) {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      if (this.timeFormatOption === '12hr') {
        const hours12 = date.getHours() === 0 ? 12 : (date.getHours() > 12 ? date.getHours() - 12 : date.getHours());
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        formattedDate += ` ${pad(hours12)}:${pad(date.getMinutes())} ${ampm}`;
      } else {
        formattedDate += ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      }
    }
    
    return formattedDate;
  }

  // Get tooltip text based on selection
  getTooltip(): string {
    if (!this.selected) return '';
    
    if (this.enableDateRangeSelection && this.selected && typeof this.selected === 'object' && 'from' in this.selected) {
      const from = this.formatDateForTooltip((this.selected as DateRange).from);
      const to = (this.selected as DateRange).to ? this.formatDateForTooltip((this.selected as DateRange).to) : '';
      return to ? `${from} ${this.language === 'de' ? 'bis' : 'to'} ${to}` : from;
    } else if (this.selected instanceof Date) {
      return this.formatDateForTooltip(this.selected);
    }
    
    return '';
  }
}


