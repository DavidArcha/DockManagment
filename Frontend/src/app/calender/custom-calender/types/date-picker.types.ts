export type DateFormat = 'dd-mm-yyyy' | 'dd/mm/yyyy' | 'mm-dd-yyyy';
export type Language = 'en' | 'de';

export interface DateRange {
    from: Date | null;
    to: Date | null;
}

export interface CalendarCell {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    isInRange: boolean;
    isRangeStart: boolean;
    isRangeEnd: boolean;
    isDisabled: boolean;
}

export interface MonthYear {
    month: number;
    year: number;
}

export interface TimeSelection {
    hours: number;
    minutes: number;
}

export interface Translations {
    en: {
        months: string[];
        monthsShort: string[];
        weekdays: string[];
        weekdaysShort: string[];
        today: string;
        clear: string;
        invalidDate: string;
        selectDate: string;
        selectStartDate: string;
        selectEndDate: string;
    };
    de: {
        months: string[];
        monthsShort: string[];
        weekdays: string[];
        weekdaysShort: string[];
        today: string;
        clear: string;
        invalidDate: string;
        selectDate: string;
        selectStartDate: string;
        selectEndDate: string;
    };
}