// ===== MODULE: Utility Functions =====
// Core utility functions for date handling, string manipulation, and data processing.

export class DateUtils {
    static formatDate(date, options = {}) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const defaultOptions = {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        };
        
        return date.toLocaleDateString('en-AU', { ...defaultOptions, ...options });
    }

    // NEW: Format date for WOH display (DD/MM/YY format)
    static formatWOHDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
    }

    static toISODate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toISOString().split('T')[0];
    }

    static getWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startOfWeek.setDate(diff);
        
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            week.push(day);
        }
        return week;
    }

    static getWorkingDaysInMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const workingDays = [];
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            if (this.isWorkingDay(d)) {
                workingDays.push(new Date(d));
            }
        }
        return workingDays;
    }

    static isWorkingDay(date) {
        const day = date.getDay();
        return day >= 1 && day <= 5; // Monday to Friday
    }

    static getDayName(date) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    static getMonthName(date) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[date.getMonth()];
    }

    static isNSWPublicHoliday(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // Fixed holidays
        const fixedHolidays = [
            { month: 1, day: 1 },   // New Year's Day
            { month: 1, day: 26 },  // Australia Day
            { month: 4, day: 25 },  // ANZAC Day
            { month: 12, day: 25 }, // Christmas Day
            { month: 12, day: 26 }  // Boxing Day
        ];
        
        if (fixedHolidays.some(h => h.month === month && h.day === day)) {
            return true;
        }
        
        // Easter-based holidays (approximate calculation)
        const easter = this.getEasterDate(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        
        const easterMonday = new Date(easter);
        easterMonday.setDate(easter.getDate() + 1);
        
        if (this.isSameDate(date, goodFriday) || this.isSameDate(date, easterMonday)) {
            return true;
        }
        
        // Queen's Birthday (second Monday in June)
        const queensBirthday = this.getNthWeekdayOfMonth(year, 6, 1, 2);
        if (this.isSameDate(date, queensBirthday)) {
            return true;
        }
        
        // Labour Day (first Monday in October)
        const labourDay = this.getNthWeekdayOfMonth(year, 10, 1, 1);
        if (this.isSameDate(date, labourDay)) {
            return true;
        }
        
        return false;
    }

    static getEasterDate(year) {
        // Simple Easter calculation (not 100% accurate for all years)
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const n = Math.floor((h + l - 7 * m + 114) / 31);
        const p = (h + l - 7 * m + 114) % 31;
        
        return new Date(year, n - 1, p + 1);
    }

    static getNthWeekdayOfMonth(year, month, weekday, n) {
        const firstDay = new Date(year, month - 1, 1);
        const firstWeekday = firstDay.getDay();
        const offset = (weekday - firstWeekday + 7) % 7;
        const date = 1 + offset + (n - 1) * 7;
        return new Date(year, month - 1, date);
    }

    static isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static diffDays(date1, date2) {
        const timeDiff = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    static isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    }

    static getStartOfWeek(date) {
        const result = new Date(date);
        const day = result.getDay();
        const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        result.setDate(diff);
        return result;
    }

    static getEndOfWeek(date) {
        const startOfWeek = this.getStartOfWeek(date);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return endOfWeek;
    }

    static formatTime(date, options = {}) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        
        return date.toLocaleTimeString('en-AU', { ...defaultOptions, ...options });
    }

    static formatDateTime(date, options = {}) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const defaultOptions = {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        
        return date.toLocaleString('en-AU', { ...defaultOptions, ...options });
    }

    static parseDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }

    static getQuarter(date) {
        const month = date.getMonth();
        return Math.floor(month / 3) + 1;
    }

    static getFirstDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    static getLastDayOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    static getDaysInMonth(date) {
        return this.getLastDayOfMonth(date).getDate();
    }

    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    static addYears(date, years) {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
    }

    static getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    static getDateRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }

    static getBusinessDays(startDate, endDate) {
        const dates = this.getDateRange(startDate, endDate);
        return dates.filter(date => this.isWorkingDay(date));
    }

    static getAge(birthDate, referenceDate = new Date()) {
        const birth = new Date(birthDate);
        const ref = new Date(referenceDate);
        
        let age = ref.getFullYear() - birth.getFullYear();
        const monthDiff = ref.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    static getRelativeTime(date, referenceDate = new Date()) {
        const diff = referenceDate.getTime() - date.getTime();
        const absDiff = Math.abs(diff);
        
        const minute = 60 * 1000;
        const hour = minute * 60;
        const day = hour * 24;
        const week = day * 7;
        const month = day * 30;
        const year = day * 365;
        
        if (absDiff < minute) return 'just now';
        if (absDiff < hour) return `${Math.floor(absDiff / minute)} minutes ${diff > 0 ? 'ago' : 'from now'}`;
        if (absDiff < day) return `${Math.floor(absDiff / hour)} hours ${diff > 0 ? 'ago' : 'from now'}`;
        if (absDiff < week) return `${Math.floor(absDiff / day)} days ${diff > 0 ? 'ago' : 'from now'}`;
        if (absDiff < month) return `${Math.floor(absDiff / week)} weeks ${diff > 0 ? 'ago' : 'from now'}`;
        if (absDiff < year) return `${Math.floor(absDiff / month)} months ${diff > 0 ? 'ago' : 'from now'}`;
        
        return `${Math.floor(absDiff / year)} years ${diff > 0 ? 'ago' : 'from now'}`;
    }
}

export class StringUtils {
    static slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    static generateId(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${prefix}${timestamp}_${random}`;
    }

    static capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    static truncate(text, length = 50) {
        if (text.length <= length) return text;
        return text.slice(0, length) + '...';
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static unescapeHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    static camelCase(text) {
        return text.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
    }

    static kebabCase(text) {
        return text
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    static snakeCase(text) {
        return text
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
    }
}

export class ArrayUtils {
    static shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    static unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const value = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    static flatten(array) {
        return array.reduce((flat, item) => {
            return flat.concat(Array.isArray(item) ? this.flatten(item) : item);
        }, []);
    }

    static sortBy(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    static difference(array1, array2) {
        return array1.filter(item => !array2.includes(item));
    }

    static intersection(array1, array2) {
        return array1.filter(item => array2.includes(item));
    }

    static union(array1, array2) {
        return [...new Set([...array1, ...array2])];
    }
}

export class ObjectUtils {
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        return obj;
    }

    static deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    static pick(obj, keys) {
        const result = {};
        keys.forEach(key => {
            if (key in obj) {
                result[key] = obj[key];
            }
        });
        return result;
    }

    static omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => {
            delete result[key];
        });
        return result;
    }

    static isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    static isEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        if (obj1 == null || obj2 == null) return false;
        if (typeof obj1 !== typeof obj2) return false;
        
        if (Array.isArray(obj1)) {
            if (!Array.isArray(obj2) || obj1.length !== obj2.length) return false;
            return obj1.every((item, index) => this.isEqual(item, obj2[index]));
        }
        
        if (typeof obj1 === 'object') {
            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);
            if (keys1.length !== keys2.length) return false;
            return keys1.every(key => this.isEqual(obj1[key], obj2[key]));
        }
        
        return false;
    }

    static get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result == null || typeof result !== 'object') {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    }

    static set(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        return obj;
    }
}

export class NumberUtils {
    static formatCurrency(amount, currency = 'AUD') {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatPercent(value, decimals = 1) {
        return new Intl.NumberFormat('en-AU', {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static round(value, decimals = 0) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    static sum(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0);
    }

    static average(numbers) {
        return numbers.length > 0 ? this.sum(numbers) / numbers.length : 0;
    }

    static median(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }
}

export class ColorUtils {
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    static adjustBrightness(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const adjust = (color) => {
            const adjusted = Math.round(color * (100 + percent) / 100);
            return Math.min(255, Math.max(0, adjusted));
        };
        
        return this.rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
    }

    static getContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return '#000000';
        
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }
}

export class ValidationUtils {
    static isEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static isPhone(phone) {
        const regex = /^(\+?61|0)[2-9]\d{8}$/;
        return regex.test(phone.replace(/\s/g, ''));
    }

    static isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isRequired(value) {
        return value !== null && value !== undefined && value !== '';
    }

    static minLength(value, min) {
        return typeof value === 'string' && value.length >= min;
    }

    static maxLength(value, max) {
        return typeof value === 'string' && value.length <= max;
    }

    static isNumber(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    }

    static isInteger(value) {
        return Number.isInteger(Number(value));
    }

    static isPositive(value) {
        return this.isNumber(value) && Number(value) > 0;
    }

    static inRange(value, min, max) {
        const num = Number(value);
        return this.isNumber(value) && num >= min && num <= max;
    }

    static validateStaffMember(staff) {
        return staff &&
               typeof staff.id === 'string' &&
               typeof staff.name === 'string' &&
               staff.name.length > 0 &&
               Array.isArray(staff.workDays) &&
               staff.workDays.length > 0;
    }

    static validateTask(task) {
        return task &&
               typeof task.id === 'string' &&
               typeof task.name === 'string' &&
               task.name.length > 0 &&
               typeof task.type === 'string' &&
               ['task', 'header'].includes(task.type);
    }
}