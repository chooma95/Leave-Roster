/**
 * Enhanced Staff Schema for v3.5.0
 * 
 * Supports:
 * - Alternating week schedules (Week 1 / Week 2 patterns)
 * - Shift availability preferences (Early/Late)
 * - Enhanced metadata for smart assignment
 */

export const STAFF_SCHEMA = {
    // Core identification
    id: 'string',           // Unique staff identifier (slugified name)
    name: 'string',         // Display name
    email: 'string?',       // Optional email
    
    // Work schedule configuration
    scheduleType: 'enum',   // 'fixed' | 'alternating'
    workDays: 'array',      // For fixed schedules: ['monday', 'tuesday', ...]
    workSchedule: {         // For alternating schedules
        week1: 'array',     // Days worked in odd weeks
        week2: 'array'      // Days worked in even weeks
    },
    
    // Shift preferences
    shiftPreferences: {
        earlyShift: 'boolean',      // Available for early shift (e.g., 8am-4pm)
        lateShift: 'boolean',       // Available for late shift (e.g., 10am-6pm)
        preferredShift: 'enum',     // 'early' | 'late' | 'any' | 'none'
        earlyShiftTimes: 'string',  // e.g., "8:00am-4:00pm" (display only)
        lateShiftTimes: 'string'    // e.g., "10:00am-6:00pm" (display only)
    },
    
    // Employment details
    employmentType: 'enum',     // 'full-time' | 'part-time' | 'casual' | 'contractor'
    hoursPerWeek: 'number',     // Expected hours per week
    
    // Assignment metadata
    assignmentPreferences: {
        maxTasksPerDay: 'number',           // Maximum concurrent tasks
        trainingMode: 'boolean',            // Willing to take training assignments
        mentorMode: 'boolean',              // Can mentor others
        preferredCategories: 'array',       // Preferred task categories
        avoidCategories: 'array'            // Categories to avoid if possible
    },
    
    // Active status
    active: 'boolean',          // Is staff member currently active
    startDate: 'date',          // Employment/assignment start date
    endDate: 'date?',           // Optional end date for contractors/temps
    
    // Notes
    notes: 'string?'            // Optional notes/comments
};

/**
 * Default staff member template
 */
export const DEFAULT_STAFF_MEMBER = {
    id: '',
    name: '',
    email: null,
    scheduleType: 'fixed',
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workSchedule: {
        week1: [],
        week2: []
    },
    shiftPreferences: {
        earlyShift: true,
        lateShift: true,
        preferredShift: 'any',
        earlyShiftTimes: '8:00am-4:00pm',
        lateShiftTimes: '10:00am-6:00pm'
    },
    employmentType: 'full-time',
    hoursPerWeek: 38,
    assignmentPreferences: {
        maxTasksPerDay: 5,
        trainingMode: false,
        mentorMode: false,
        preferredCategories: [],
        avoidCategories: []
    },
    active: true,
    startDate: null,
    endDate: null,
    notes: null
};

/**
 * Schedule type definitions
 */
export const SCHEDULE_TYPES = {
    FIXED: 'fixed',         // Same days every week
    ALTERNATING: 'alternating'  // Different days on Week 1 vs Week 2
};

/**
 * Shift preference types
 */
export const SHIFT_PREFERENCES = {
    EARLY: 'early',
    LATE: 'late',
    ANY: 'any',
    NONE: 'none'
};

/**
 * Employment types
 */
export const EMPLOYMENT_TYPES = {
    FULL_TIME: 'full-time',
    PART_TIME: 'part-time',
    CASUAL: 'casual',
    CONTRACTOR: 'contractor'
};

/**
 * Validation functions
 */
export class StaffValidator {
    static validate(staff) {
        const errors = [];
        
        // Required fields
        if (!staff.id || typeof staff.id !== 'string') {
            errors.push('Staff ID is required and must be a string');
        }
        if (!staff.name || typeof staff.name !== 'string') {
            errors.push('Staff name is required and must be a string');
        }
        
        // Schedule validation
        if (!Object.values(SCHEDULE_TYPES).includes(staff.scheduleType)) {
            errors.push(`Invalid schedule type: ${staff.scheduleType}`);
        }
        
        if (staff.scheduleType === SCHEDULE_TYPES.FIXED) {
            if (!Array.isArray(staff.workDays) || staff.workDays.length === 0) {
                errors.push('Fixed schedule requires at least one work day');
            }
        } else if (staff.scheduleType === SCHEDULE_TYPES.ALTERNATING) {
            if (!staff.workSchedule || !Array.isArray(staff.workSchedule.week1) || !Array.isArray(staff.workSchedule.week2)) {
                errors.push('Alternating schedule requires week1 and week2 arrays');
            }
            if (staff.workSchedule.week1.length === 0 && staff.workSchedule.week2.length === 0) {
                errors.push('Alternating schedule must have work days in at least one week');
            }
        }
        
        // Shift preferences validation
        if (staff.shiftPreferences) {
            if (!Object.values(SHIFT_PREFERENCES).includes(staff.shiftPreferences.preferredShift)) {
                errors.push(`Invalid shift preference: ${staff.shiftPreferences.preferredShift}`);
            }
        }
        
        // Employment type validation
        if (staff.employmentType && !Object.values(EMPLOYMENT_TYPES).includes(staff.employmentType)) {
            errors.push(`Invalid employment type: ${staff.employmentType}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    static sanitize(staff) {
        // Ensure all required fields exist with defaults
        return {
            ...DEFAULT_STAFF_MEMBER,
            ...staff,
            shiftPreferences: {
                ...DEFAULT_STAFF_MEMBER.shiftPreferences,
                ...(staff.shiftPreferences || {})
            },
            workSchedule: {
                ...DEFAULT_STAFF_MEMBER.workSchedule,
                ...(staff.workSchedule || {})
            },
            assignmentPreferences: {
                ...DEFAULT_STAFF_MEMBER.assignmentPreferences,
                ...(staff.assignmentPreferences || {})
            }
        };
    }
}

/**
 * Schedule utilities
 */
export class ScheduleUtils {
    /**
     * Get work days for a specific date based on schedule type
     */
    static getWorkDaysForDate(staff, date) {
        if (staff.scheduleType === SCHEDULE_TYPES.FIXED) {
            return staff.workDays || [];
        }
        
        // For alternating schedules, determine if it's week 1 or week 2
        const weekNumber = this.getWeekNumber(date);
        const isWeek1 = weekNumber % 2 === 1;
        
        return isWeek1 ? 
            (staff.workSchedule?.week1 || []) : 
            (staff.workSchedule?.week2 || []);
    }
    
    /**
     * Check if staff works on a specific date
     */
    static worksOnDate(staff, date) {
        const dayName = this.getDayName(date);
        const workDays = this.getWorkDaysForDate(staff, date);
        return workDays.includes(dayName);
    }
    
    /**
     * Get all work days for the staff (union of all schedules)
     */
    static getAllWorkDays(staff) {
        if (staff.scheduleType === SCHEDULE_TYPES.FIXED) {
            return staff.workDays || [];
        }
        
        // For alternating, return unique days from both weeks
        const week1 = staff.workSchedule?.week1 || [];
        const week2 = staff.workSchedule?.week2 || [];
        return [...new Set([...week1, ...week2])];
    }
    
    /**
     * Get week number for alternating schedule calculation
     */
    static getWeekNumber(date) {
        const start = new Date(date.getFullYear(), 0, 1);
        const diff = date - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        return Math.ceil(diff / oneWeek);
    }
    
    /**
     * Get day name from date
     */
    static getDayName(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[date.getDay()];
    }
    
    /**
     * Get schedule description for UI display
     */
    static getScheduleDescription(staff) {
        if (staff.scheduleType === SCHEDULE_TYPES.FIXED) {
            const days = staff.workDays || [];
            return `Fixed: ${days.map(d => d.substring(0, 3).toUpperCase()).join(', ')}`;
        }
        
        const week1 = staff.workSchedule?.week1 || [];
        const week2 = staff.workSchedule?.week2 || [];
        
        return `Alternating:\nWeek 1: ${week1.map(d => d.substring(0, 3).toUpperCase()).join(', ')}\nWeek 2: ${week2.map(d => d.substring(0, 3).toUpperCase()).join(', ')}`;
    }
}

/**
 * Shift preference utilities
 */
export class ShiftPreferenceUtils {
    /**
     * Check if staff is available for a specific shift
     */
    static isAvailableForShift(staff, shiftType) {
        if (!staff.shiftPreferences) return true; // Default: available for all
        
        if (shiftType === 'early') {
            return staff.shiftPreferences.earlyShift !== false;
        } else if (shiftType === 'late') {
            return staff.shiftPreferences.lateShift !== false;
        }
        
        return true;
    }
    
    /**
     * Get shift preference score for assignment algorithm
     */
    static getPreferenceScore(staff, shiftType) {
        if (!staff.shiftPreferences) return 1.0; // Neutral
        
        const pref = staff.shiftPreferences.preferredShift;
        
        if (pref === SHIFT_PREFERENCES.NONE) return 0; // Never assign shifts
        if (pref === SHIFT_PREFERENCES.ANY) return 1.0; // No preference
        if (pref === shiftType) return 1.5; // Preferred shift
        if (pref !== shiftType && pref !== SHIFT_PREFERENCES.ANY) return 0.5; // Not preferred
        
        return 1.0;
    }
    
    /**
     * Get shift preference description
     */
    static getPreferenceDescription(staff) {
        if (!staff.shiftPreferences) return 'Any shift';
        
        const early = staff.shiftPreferences.earlyShift;
        const late = staff.shiftPreferences.lateShift;
        const pref = staff.shiftPreferences.preferredShift;
        
        if (!early && !late) return 'No shift availability';
        if (early && late && pref === SHIFT_PREFERENCES.ANY) return 'Any shift';
        if (early && !late) return 'Early shift only';
        if (!early && late) return 'Late shift only';
        if (pref === SHIFT_PREFERENCES.EARLY) return 'Prefers early shift';
        if (pref === SHIFT_PREFERENCES.LATE) return 'Prefers late shift';
        
        return 'Any shift';
    }
}

/**
 * Migration utilities for existing data
 */
export class StaffMigration {
    /**
     * Migrate old staff format to new enhanced format
     */
    static migrate(oldStaff) {
        const migrated = {
            ...DEFAULT_STAFF_MEMBER,
            id: oldStaff.id,
            name: oldStaff.name,
            email: oldStaff.email || null,
            
            // Preserve existing workDays as fixed schedule
            scheduleType: SCHEDULE_TYPES.FIXED,
            workDays: oldStaff.workDays || DEFAULT_STAFF_MEMBER.workDays,
            
            // Initialize empty alternating schedule
            workSchedule: {
                week1: [],
                week2: []
            },
            
            // Default shift preferences (available for all shifts)
            shiftPreferences: {
                earlyShift: true,
                lateShift: true,
                preferredShift: SHIFT_PREFERENCES.ANY,
                earlyShiftTimes: '8:00am-4:00pm',
                lateShiftTimes: '10:00am-6:00pm'
            },
            
            // Determine employment type from work days
            employmentType: this.guessEmploymentType(oldStaff.workDays),
            hoursPerWeek: this.calculateHoursPerWeek(oldStaff.workDays),
            
            // Default assignment preferences
            assignmentPreferences: {
                maxTasksPerDay: 5,
                trainingMode: false,
                mentorMode: false,
                preferredCategories: [],
                avoidCategories: []
            },
            
            active: true,
            startDate: null,
            endDate: null,
            notes: oldStaff.notes || null
        };
        
        return migrated;
    }
    
    static guessEmploymentType(workDays) {
        if (!workDays || workDays.length === 0) return EMPLOYMENT_TYPES.CASUAL;
        if (workDays.length >= 5) return EMPLOYMENT_TYPES.FULL_TIME;
        if (workDays.length >= 3) return EMPLOYMENT_TYPES.PART_TIME;
        return EMPLOYMENT_TYPES.CASUAL;
    }
    
    static calculateHoursPerWeek(workDays) {
        if (!workDays) return 0;
        // Assume 7.6 hours per day (standard Australian full-time)
        return workDays.length * 7.6;
    }
    
    /**
     * Batch migrate array of staff
     */
    static migrateAll(staffArray) {
        return staffArray.map(staff => this.migrate(staff));
    }
}
