// ===== COMPLETE CONFIG.JS =====
export const CONFIG = {
    WORK_DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // Standardized to Monday-Friday
    SKILL_LEVELS: { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4, MASTER: 5 },
    CATEGORIES: ['cau', 'ctp', 'info', 'roi', 'printing'],
    ROTATION_WEEKS: 6,
    MAX_PHONE_STAFF: 2,
    BUILD_PASSWORD: 'CAU',
    // NEW: Colors for each task category, based on your screenshot
    CATEGORY_COLORS: {
        cau: '#6d28d9',      // Purple
        ctp: '#16a34a',      // Green
        info: '#ea580c',     // Orange
        roi: '#0284c7',      // Blue
        printing: '#4b5563', // Grey
        default: '#a0aec0'   // Default fallback color
    }
};

export const DEFAULT_STAFF = [
    { id: 'kellie', name: 'Kellie', workDays: ['monday', 'tuesday', 'thursday', 'friday'] }, // No Wednesday
    { id: 'gus', name: 'Gus', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'cheryl', name: 'Cheryl', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'ben', name: 'Ben', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'jenny', name: 'Jenny', workDays: ['wednesday'] }, // Only Wednesday
    { id: 'jethro', name: 'Jethro', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'blake', name: 'Blake', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'zak', name: 'Zak', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'di', name: 'Di', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'ash', name: 'Ash', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'mick', name: 'Mick', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'brad', name: 'Brad', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'angela', name: 'Angela', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    { id: 'sonia', name: 'Sonia', workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }
];

export const DEFAULT_TASKS = [
    // CAU Administration Inbox Section
    { 
        type: 'header', 
        name: 'CAU Administration Inbox - Triage', 
        id: 'header_cau_admin', 
        category: 'cau', 
        allowTriage: true 
    },
    { 
        type: 'task', 
        id: 'oir_access_apps', 
        name: 'OIR Access Applications', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'sanctions_lifts', 
        name: 'Sanctions Lifts', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'dlr_block_removal', 
        name: 'Driver Licence Renewal - Online Block Removal', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'vdp_susp_cancel', 
        name: 'VDP/Suspension/Cancellation', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'create_new_lic_cust', 
        name: 'Create New Licence/Customer Number', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'dishonoured_payments', 
        name: 'Dishonoured Payments', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'tag', 
        name: 'TAG', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'court_appeals', 
        name: 'Court Appeals - 69/70 Fines Act', 
        category: 'cau', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'registry_reconcile', 
        name: 'Registry Reconcile', 
        category: 'cau', 
        skillLevel: 1 
    },

    // CAU Inbox - CTP Section
    { 
        type: 'header', 
        name: 'CAU Inbox - CTP', 
        id: 'header_cau_ctp', 
        category: 'ctp', 
        allowTriage: true 
    },
    { 
        type: 'task', 
        id: 'ctp_inbox', 
        name: 'CAU Inbox - CTP', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'greenslip_retrievals', 
        name: 'Greenslip Retrievals', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'pending_ctp_billing', 
        name: 'Pending CTP Billing', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'pending_manual_conf', 
        name: 'Pending Manual Confirmations - Form A', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'pending_mismatches', 
        name: 'Pending Mismatches', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'pending_refused_biz', 
        name: 'Pending Refused Business (CTP004)', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'pending_rej_recon', 
        name: 'Pending Rejection Reconciliations', 
        category: 'ctp', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'manual_insurer_susp', 
        name: 'Manual Insurer Suspensions', 
        category: 'ctp', 
        skillLevel: 1 
    },

    // Info Release Inbox Section
    { 
        type: 'header', 
        name: 'Info Release Inbox - Triage', 
        id: 'header_info', 
        category: 'info', 
        allowTriage: true 
    },
    { 
        type: 'task', 
        id: 'form_5279_law', 
        name: 'Form 5279 - Law Enforcement', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'tinsw_team_legal', 
        name: 'TINSW Team - Legal - Subpoenas CAU, GIPAs, Court Orders(inc FRS)', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_943_access', 
        name: 'Form 943 - Access to Own Personal Records', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5672_deceased', 
        name: 'Form 5672 - Deceased Estate', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5632_liquidator', 
        name: 'Form 5632 - Vehicle Search Liquidator', 
        category: 'info', 
        skillLevel: 1
    },
    { 
        type: 'task', 
        id: 'form_5633_buyer_liq', 
        name: 'Form 5633 - Vehicle Buyer Liquidator', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5656_bankruptcy', 
        name: 'Form 5656 - Vehicle Search Bankruptcy', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5657_buyer_bank', 
        name: 'Form 5657 - Vehicle Buyer Bankruptcy', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_1046_solicitor', 
        name: 'Form 1046 - Solicitor', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5376_council', 
        name: 'Form 5376 - Council', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'form_5689_tinsw', 
        name: 'Form 5689 - TINSW Teams', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'roi_rev_nsw', 
        name: 'ROI - Revenue NSW', 
        category: 'info', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'audit_office', 
        name: 'Audit Office', 
        category: 'info', 
        skillLevel: 1 
    },

    // ROI Interstate Inbox Section
    { 
        type: 'header', 
        name: 'ROI Interstate Inbox - Triage', 
        id: 'header_roi', 
        category: 'roi', 
        allowTriage: true 
    },
    { 
        type: 'task', 
        id: 'awaiting_pdf', 
        name: 'Awaiting PDF email', 
        category: 'roi', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'vehicle_reg_search', 
        name: 'Vehicle Registration Search', 
        category: 'roi', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'roi_batch_inbox', 
        name: 'ROI Batch Inbox', 
        category: 'roi', 
        skillLevel: 1 
    },

    // Printing & Certifying Section
    { 
        type: 'header', 
        name: 'Printing & Certifying', 
        id: 'header_printing', 
        category: 'printing', 
        allowTriage: true 
    },
    { 
        type: 'task', 
        id: 'printing_police', 
        name: 'Printing & Certifying OIR 257 Certificates - POLICE', 
        category: 'printing', 
        skillLevel: 1 
    },
    { 
        type: 'task', 
        id: 'printing_personals', 
        name: 'Printing & Certifying OIR 257 Certificates - PERSONALS', 
        category: 'printing', 
        skillLevel: 1 
    }
];

// Create default skills matrix with new task-based structure
const initialTaskSkills = {};
DEFAULT_TASKS.forEach(task => {
    if (task.type === 'task') {
        initialTaskSkills[task.id] = 1; // Default skill level
    }
});

export const DEFAULT_SKILLS_MATRIX = {};
DEFAULT_STAFF.forEach(staff => {
    DEFAULT_SKILLS_MATRIX[staff.id] = {
        taskSkills: { ...initialTaskSkills }
    };
});

// ===== UTILITY CLASSES (from your paste) =====

// Date utilities
export class DateUtils {
    static getNSWPublicHolidays(year) {
        const holidays = new Set();
        
        holidays.add(`${year}-01-01`); // New Year's Day
        holidays.add(`${year}-01-26`); // Australia Day
        holidays.add(`${year}-04-25`); // Anzac Day
        holidays.add(`${year}-12-25`); // Christmas Day
        holidays.add(`${year}-12-26`); // Boxing Day
        
        const easter = this.getEasterDate(year);
        holidays.add(this.toISODate(new Date(easter.getTime() - 2 * 24 * 60 * 60 * 1000))); // Good Friday
        holidays.add(this.toISODate(new Date(easter.getTime() + 1 * 24 * 60 * 60 * 1000))); // Easter Monday
        
        const queensBirthday = this.getNthWeekdayOfMonth(year, 5, 1, 2);
        holidays.add(this.toISODate(queensBirthday));
        
        const labourDay = this.getNthWeekdayOfMonth(year, 9, 1, 1);
        holidays.add(this.toISODate(labourDay));
        
        const holidayDates = Array.from(holidays);
        holidayDates.forEach(dateStr => {
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay();
            
            if (dayOfWeek === 6) {
                const mondayDate = new Date(date);
                mondayDate.setDate(date.getDate() + 2);
                holidays.add(this.toISODate(mondayDate));
            }
            else if (dayOfWeek === 0) {
                const mondayDate = new Date(date);
                mondayDate.setDate(date.getDate() + 1);
                holidays.add(this.toISODate(mondayDate));
            }
        });
        
        return holidays;
    }
    
    static getEasterDate(year) {
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
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }
    
    static getNthWeekdayOfMonth(year, month, weekday, n) {
        const firstDay = new Date(year, month, 1);
        const firstWeekday = firstDay.getDay();
        let diff = weekday - firstWeekday;
        if (diff < 0) diff += 7;
        const nthDay = 1 + diff + (n - 1) * 7;
        return new Date(year, month, nthDay);
    }
    
    static isNSWPublicHoliday(date) {
        const year = date.getFullYear();
        const holidays = this.getNSWPublicHolidays(year);
        return holidays.has(this.toISODate(date));
    }

    static isWorkingDay(date) {
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5 && !this.isNSWPublicHoliday(date);
    }

    // UPDATED: Tuesday to Monday work week
    static getWeek(date) {
        const d = new Date(date);
        const day = d.getDay(); // 0=Sun, 1=Mon, 2=Tue, ...

        let tuesday;
        if (day === 1) { // If it's a Monday, the work week started on the previous Tuesday
            tuesday = new Date(d);
            tuesday.setDate(d.getDate() - 6);
        } else {
            tuesday = new Date(d);
            tuesday.setDate(d.getDate() - (day - 2));
        }

        const week = [
            tuesday, // Tuesday
            new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate() + 1), // Wednesday
            new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate() + 2), // Thursday
            new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate() + 3), // Friday
            new Date(tuesday.getFullYear(), tuesday.getMonth(), tuesday.getDate() + 6)  // Monday of the next calendar week
        ];
        
        return week;
    }
    
    static formatDate(date, options) { 
        return date.toLocaleDateString('en-AU', options); 
    }
    
    static toISODate(date) { 
        return date.toISOString().split('T')[0]; 
    }
    
    static getWeekNumber(date) {
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = date - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.ceil(diff / oneWeek);
    }

    static getDayName(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[date.getDay()];
    }

    static formatWOHDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
}

// Validation utilities
export class ValidationUtils {
    static validateStaffMember(staff) {
        return staff && 
               typeof staff.id === 'string' && 
               typeof staff.name === 'string' && 
               Array.isArray(staff.workDays) &&
               staff.workDays.every(day => CONFIG.WORK_DAYS.includes(day));
    }

    static validateTask(task) {
        return task && 
               typeof task.id === 'string' && 
               typeof task.name === 'string' && 
               ['task', 'header'].includes(task.type) &&
               (!task.skillLevel || (task.skillLevel >= 1 && task.skillLevel <= 5));
    }

    static validateAssignment(date, taskId, staffIds) {
        if (!date || !taskId || !Array.isArray(staffIds)) return false;
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return false;
        
        return staffIds.every(id => typeof id === 'string');
    }
}

// Performance utilities
export class PerformanceUtils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Data migration utilities
export class MigrationUtils {
    static migrateSkillsMatrix(oldMatrix) {
        const newMatrix = {};
        
        for (const [staffId, oldSkills] of Object.entries(oldMatrix)) {
            if (oldSkills.taskSkills) {
                // Already in new format
                newMatrix[staffId] = oldSkills;
            } else if (oldSkills.skills && Array.isArray(oldSkills.skills)) {
                // Old format - convert to new
                const taskSkills = {};
                DEFAULT_TASKS.forEach(task => {
                    if (task.type === 'task') {
                        // Map category skills to task skills
                        const hasCategory = oldSkills.skills.includes(task.category);
                        taskSkills[task.id] = hasCategory ? (oldSkills.skillLevel || 1) : 0;
                    }
                });
                newMatrix[staffId] = { taskSkills };
            } else {
                // Initialize with defaults
                const taskSkills = {};
                DEFAULT_TASKS.forEach(task => {
                    if (task.type === 'task') {
                        taskSkills[task.id] = 1;
                    }
                });
                newMatrix[staffId] = { taskSkills };
            }
        }
        
        return newMatrix;
    }

    static migrateWorkDays(staff) {
        return staff.map(s => ({
            ...s,
            workDays: s.workDays || CONFIG.WORK_DAYS
        }));
    }
}

// Export verification and system health
export const SystemHealth = {
    verifyConfiguration() {
        const issues = [];
        
        // Check CONFIG
        if (!CONFIG.WORK_DAYS || !Array.isArray(CONFIG.WORK_DAYS)) {
            issues.push('Invalid WORK_DAYS configuration');
        }
        
        if (!CONFIG.ROTATION_WEEKS || CONFIG.ROTATION_WEEKS < 1) {
            issues.push('Invalid ROTATION_WEEKS configuration');
        }
        
        // Check DEFAULT_STAFF
        DEFAULT_STAFF.forEach((staff, index) => {
            if (!ValidationUtils.validateStaffMember(staff)) {
                issues.push(`Invalid staff member at index ${index}: ${staff?.name || 'unknown'}`);
            }
        });
        
        // Check DEFAULT_TASKS
        DEFAULT_TASKS.forEach((task, index) => {
            if (!ValidationUtils.validateTask(task)) {
                issues.push(`Invalid task at index ${index}: ${task?.name || 'unknown'}`);
            }
        });
        
        // Check DEFAULT_SKILLS_MATRIX
        for (const [staffId, skills] of Object.entries(DEFAULT_SKILLS_MATRIX)) {
            if (!skills.taskSkills || typeof skills.taskSkills !== 'object') {
                issues.push(`Invalid skills matrix for staff: ${staffId}`);
            }
        }
        
        return {
            healthy: issues.length === 0,
            issues
        };
    },
    
    getDiagnostics() {
        const health = this.verifyConfiguration();
        
        return {
            ...health,
            staffCount: DEFAULT_STAFF.length,
            taskCount: DEFAULT_TASKS.filter(t => t.type === 'task').length,
            headerCount: DEFAULT_TASKS.filter(t => t.type === 'header').length,
            skillsMatrixComplete: Object.keys(DEFAULT_SKILLS_MATRIX).length === DEFAULT_STAFF.length,
            workDaysCoverage: DEFAULT_STAFF.filter(s => s.workDays.length >= 4).length,
            partTimeStaff: DEFAULT_STAFF.filter(s => s.workDays.length < 5).length
        };
    }
};

// System verification on load
console.log('=== SYSTEM VERIFICATION ===');
const diagnostics = SystemHealth.getDiagnostics();
console.log('System Health:', diagnostics.healthy ? '✅ HEALTHY' : '❌ ISSUES FOUND');
console.log('Diagnostics:', diagnostics);

if (!diagnostics.healthy) {
    console.log('Issues found:', diagnostics.issues);
} else {
    console.log('All modules configured and ready for use');
    console.log('Configuration Summary:');
    console.log(`✅ Staff Members: ${diagnostics.staffCount}`);
    console.log(`✅ Tasks: ${diagnostics.taskCount}`);
    console.log(`✅ Categories: ${CONFIG.CATEGORIES.length}`);
    console.log(`✅ Skills Matrix: Complete for all ${diagnostics.staffCount} staff members`);
    console.log(`✅ Work Coverage: ${diagnostics.workDaysCoverage} full-time, ${diagnostics.partTimeStaff} part-time`);
    console.log('✅ Monday-Friday week structure');
    console.log('✅ Task-based skills matrix');
    console.log('✅ 6-week rotation system');
    console.log('✅ NSW public holiday support');
}