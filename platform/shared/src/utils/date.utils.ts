export class DateUtils {
  static format(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  static parse(dateString: string, format?: string): Date {
    if (format) {
      // Custom parsing logic based on format
      return new Date(dateString);
    }
    return new Date(dateString);
  }

  static isValid(date: unknown): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static addMinutes(date: Date, minutes: number): Date {
    if (!date) {
      throw new Error('Date is required');
    }
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  static addSeconds(date: Date, seconds: number): Date {
    if (!date) {
      throw new Error('Date is required');
    }
    const result = new Date(date);
    result.setSeconds(result.getSeconds() + seconds);
    return result;
  }

  static addMilliseconds(date: Date, milliseconds: number): Date {
    const result = new Date(date);
    result.setMilliseconds(result.getMilliseconds() + milliseconds);
    return result;
  }

  static subtractDays(date: Date, days: number): Date {
    return this.addDays(date, -days);
  }

  static subtractHours(date: Date, hours: number): Date {
    return this.addHours(date, -hours);
  }

  static subtractMinutes(date: Date, minutes: number): Date {
    return this.addMinutes(date, -minutes);
  }

  static subtractSeconds(date: Date, seconds: number): Date {
    return this.addSeconds(date, -seconds);
  }

  static subtractMilliseconds(date: Date, milliseconds: number): Date {
    return this.addMilliseconds(date, -milliseconds);
  }

  static differenceInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static differenceInHours(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60));
  }

  static differenceInMinutes(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60));
  }

  static differenceInSeconds(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / 1000);
  }

  static differenceInMilliseconds(date1: Date, date2: Date): number {
    return Math.abs(date2.getTime() - date1.getTime());
  }

  static isBefore(date1: Date, date2: Date): boolean {
    return date1.getTime() < date2.getTime();
  }

  static isAfter(date1: Date, date2: Date): boolean {
    return date1.getTime() > date2.getTime();
  }

  static isSame(date1: Date, date2: Date): boolean {
    return date1.getTime() === date2.getTime();
  }

  static isBetween(date: Date, start: Date, end: Date): boolean {
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }

  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  static startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day;
    result.setDate(diff);
    return this.startOfDay(result);
  }

  static endOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + 6;
    result.setDate(diff);
    return this.endOfDay(result);
  }

  static startOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setDate(1);
    return this.startOfDay(result);
  }

  static endOfMonth(date: Date): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + 1, 0);
    return this.endOfDay(result);
  }

  static startOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(0, 1);
    return this.startOfDay(result);
  }

  static endOfYear(date: Date): Date {
    const result = new Date(date);
    result.setMonth(11, 31);
    return this.endOfDay(result);
  }

  static now(): Date {
    return new Date();
  }

  static utcNow(): Date {
    return new Date(Date.now());
  }

  static toISOString(date: Date): string {
    return date.toISOString();
  }

  static fromISOString(isoString: string): Date {
    return new Date(isoString);
  }

  static toUnixTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  static fromUnixTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }
}
