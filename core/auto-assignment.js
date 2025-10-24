/**
 * Smart Auto-Assignment Engine
 * 
 * Intelligently assigns tasks to staff based on:
 * - Skills matrix (skill levels per task)
 * - Work On Hand (WOH) - current workload
 * - Work schedule (alternating weeks, fixed days)
 * - Shift preferences
 * - Training opportunities
 * 
 * Version: 3.5.0
 */

import { ScheduleUtils, ShiftPreferenceUtils } from '../config/staff-schema.js';

export const ASSIGNMENT_MODES = {
    BALANCED: 'balanced',       // Balance workload across team
    SKILL_BASED: 'skill-based', // Assign to highest skilled available
    TRAINING: 'training',       // Create training opportunities
    FAIR_SHARE: 'fair-share'    // Ensure everyone gets equal tasks
};

export class SmartAssignmentEngine {
    constructor(app) {
        this.app = app;
        this.config = {
            mode: ASSIGNMENT_MODES.BALANCED,
            considerWOH: true,
            considerSkills: true,
            allowStretch: true,          // Allow assignments slightly above skill level
            minSkillLevel: 1,            // Minimum skill required
            maxSkillGap: 1,              // Maximum skill gap for stretch assignments
            preferTraining: false,       // Prioritize training over optimal assignment
            respectShiftPreferences: true,
            balancePhoneShifts: true
        };
    }
    
    /**
     * Configure assignment engine
     */
    configure(options) {
        this.config = { ...this.config, ...options };
    }
    
    /**
     * Generate assignment suggestions for a task on a specific date
     */
    suggestAssignments(date, taskId, count = 1) {
        const task = this.app.state.tasks.find(t => t.id === taskId);
        if (!task || task.type === 'header') {
            return [];
        }
        
        const dayName = this.getDayName(date);
        const availableStaff = this.getAvailableStaff(date, dayName);
        
        // Score each staff member for this assignment
        const scoredStaff = availableStaff.map(staff => ({
            staff,
            score: this.calculateAssignmentScore(staff, task, date, dayName),
            reasons: this.getAssignmentReasons(staff, task, date, dayName)
        }));
        
        // Sort by score (highest first)
        scoredStaff.sort((a, b) => b.score - a.score);
        
        // Return top N suggestions
        return scoredStaff.slice(0, count);
    }
    
    /**
     * Auto-assign tasks for an entire day
     */
    async autoAssignDay(date) {
        const assignments = [];
        const dayName = this.getDayName(date);
        const dateStr = this.formatDate(date);
        
        // Get all tasks that need assignment
        const tasksToAssign = this.app.state.tasks.filter(t => t.type === 'task');
        
        // Track staff workload for this assignment session
        const sessionWorkload = {};
        this.app.state.staff.forEach(s => {
            sessionWorkload[s.id] = 0;
        });
        
        for (const task of tasksToAssign) {
            // Check if already assigned
            const existing = this.app.state.assignments[dateStr]?.[task.id] || [];
            if (existing.length > 0) continue; // Skip already assigned tasks
            
            // Get suggestions
            const suggestions = this.suggestAssignments(date, task.id, 1);
            
            if (suggestions.length > 0 && suggestions[0].score > 0) {
                const suggestion = suggestions[0];
                
                // Apply assignment
                assignments.push({
                    date: dateStr,
                    taskId: task.id,
                    taskName: task.name,
                    staffId: suggestion.staff.id,
                    staffName: suggestion.staff.name,
                    score: suggestion.score,
                    reasons: suggestion.reasons
                });
                
                // Update session workload
                sessionWorkload[suggestion.staff.id]++;
            }
        }
        
        return assignments;
    }
    
    /**
     * Calculate assignment score for staff member
     */
    calculateAssignmentScore(staff, task, date, dayName) {
        let score = 0;
        const weights = {
            skill: 3.0,
            woh: 2.0,
            preference: 1.5,
            shift: 1.0,
            training: 1.2
        };
        
        // 1. Skill score
        if (this.config.considerSkills) {
            const skillScore = this.getSkillScore(staff, task);
            score += skillScore * weights.skill;
        } else {
            score += 1.0 * weights.skill; // Neutral if not considering skills
        }
        
        // 2. WOH (Work On Hand) score - prefer staff with lower workload
        if (this.config.considerWOH) {
            const wohScore = this.getWOHScore(staff, date);
            score += wohScore * weights.woh;
        } else {
            score += 1.0 * weights.woh;
        }
        
        // 3. Category preference score
        const preferenceScore = this.getPreferenceScore(staff, task);
        score += preferenceScore * weights.preference;
        
        // 4. Shift preference score (if phone shifts enabled)
        if (this.config.respectShiftPreferences) {
            const shiftScore = this.getShiftScore(staff);
            score += shiftScore * weights.shift;
        } else {
            score += 1.0 * weights.shift;
        }
        
        // 5. Training bonus (if in training mode)
        if (this.config.mode === ASSIGNMENT_MODES.TRAINING) {
            const trainingScore = this.getTrainingScore(staff, task);
            score += trainingScore * weights.training;
        }
        
        return score;
    }
    
    /**
     * Get skill-based score
     */
    getSkillScore(staff, task) {
        const skillLevel = this.app.skillsManager?.getStaffTaskSkill(staff.id, task.id) || 1;
        
        // Below minimum skill level
        if (skillLevel < this.config.minSkillLevel) {
            return 0; // Not eligible
        }
        
        // Training mode: prefer skill level just above current (stretch assignments)
        if (this.config.mode === ASSIGNMENT_MODES.TRAINING && this.config.allowStretch) {
            const optimalLevel = this.config.minSkillLevel + 1;
            if (skillLevel === optimalLevel) {
                return 1.5; // Bonus for training opportunity
            } else if (skillLevel === optimalLevel - 1) {
                return 1.2; // Good stretch assignment
            }
        }
        
        // Normal mode: prefer higher skill levels
        // Normalize to 0-1 range (level 1-5 → 0.2-1.0)
        return Math.min(skillLevel / 5, 1.0);
    }
    
    /**
     * Get WOH-based score (lower WOH = higher score)
     */
    getWOHScore(staff, date) {
        const wohData = this.app.state.workOnHand?.[staff.id] || {};
        const totalWOH = Object.values(wohData).reduce((sum, val) => sum + val, 0);
        
        // Normalize: more WOH = lower score
        // 0 WOH = 1.0, 10+ WOH = 0.1
        const maxWOH = 10;
        return Math.max(0.1, 1.0 - (totalWOH / maxWOH));
    }
    
    /**
     * Get preference score based on staff assignment preferences
     */
    getPreferenceScore(staff, task) {
        if (!staff.assignmentPreferences) return 1.0;
        
        const prefs = staff.assignmentPreferences;
        
        // Check if category is preferred
        if (prefs.preferredCategories?.includes(task.category)) {
            return 1.5;
        }
        
        // Check if category should be avoided
        if (prefs.avoidCategories?.includes(task.category)) {
            return 0.3;
        }
        
        return 1.0; // Neutral
    }
    
    /**
     * Get shift preference score
     */
    getShiftScore(staff) {
        if (!staff.shiftPreferences) return 1.0;
        
        // Staff with flexible shift preferences get bonus
        if (staff.shiftPreferences.preferredShift === 'any') {
            return 1.2;
        }
        
        // Staff available for both shifts
        if (staff.shiftPreferences.earlyShift && staff.shiftPreferences.lateShift) {
            return 1.1;
        }
        
        return 1.0;
    }
    
    /**
     * Get training opportunity score
     */
    getTrainingScore(staff, task) {
        if (!staff.assignmentPreferences?.trainingMode) {
            return 1.0; // Not in training mode
        }
        
        const skillLevel = this.app.skillsManager?.getStaffTaskSkill(staff.id, task.id) || 1;
        const taskRequiredLevel = task.skillLevel || 1;
        
        // Perfect training opportunity: task is 1 level above current skill
        if (taskRequiredLevel === skillLevel + 1) {
            return 1.5;
        }
        
        // Good training: task is at current skill level
        if (taskRequiredLevel === skillLevel) {
            return 1.2;
        }
        
        return 1.0;
    }
    
    /**
     * Get available staff for a specific date
     */
    getAvailableStaff(date, dayName) {
        return this.app.state.staff.filter(staff => {
            // Must be active
            if (!staff.active) return false;
            
            // Check if they work this day (considering alternating schedules)
            const worksThisDay = ScheduleUtils.worksOnDate(staff, date);
            if (!worksThisDay) return false;
            
            // Check if on leave
            const dateStr = this.formatDate(date);
            const leaveData = this.app.state.leave[dateStr];
            if (leaveData?.includes(staff.id)) return false;
            
            return true;
        });
    }
    
    /**
     * Get human-readable reasons for assignment
     */
    getAssignmentReasons(staff, task, date, dayName) {
        const reasons = [];
        
        // Skill reason
        const skillLevel = this.app.skillsManager?.getStaffTaskSkill(staff.id, task.id) || 1;
        if (skillLevel >= 4) {
            reasons.push(`Expert (Skill ${skillLevel}/5)`);
        } else if (skillLevel >= 3) {
            reasons.push(`Proficient (Skill ${skillLevel}/5)`);
        } else if (skillLevel >= 2) {
            reasons.push(`Competent (Skill ${skillLevel}/5)`);
        } else {
            reasons.push(`Learning (Skill ${skillLevel}/5)`);
        }
        
        // WOH reason
        const wohData = this.app.state.workOnHand?.[staff.id] || {};
        const totalWOH = Object.values(wohData).reduce((sum, val) => sum + val, 0);
        if (totalWOH === 0) {
            reasons.push('No current workload');
        } else if (totalWOH <= 3) {
            reasons.push(`Low workload (${totalWOH} tasks)`);
        } else if (totalWOH <= 6) {
            reasons.push(`Moderate workload (${totalWOH} tasks)`);
        } else {
            reasons.push(`High workload (${totalWOH} tasks)`);
        }
        
        // Preference reason
        if (staff.assignmentPreferences?.preferredCategories?.includes(task.category)) {
            reasons.push('Prefers this category');
        }
        
        // Training reason
        if (staff.assignmentPreferences?.trainingMode && skillLevel < task.skillLevel) {
            reasons.push('Training opportunity');
        }
        
        // Schedule reason
        reasons.push(`Works ${ScheduleUtils.getScheduleDescription(staff).split(':')[0]}`);
        
        return reasons;
    }
    
    /**
     * Utility methods
     */
    getDayName(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[date.getDay()];
    }
    
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    
    /**
     * Generate assignment report
     */
    generateAssignmentReport(assignments) {
        const report = {
            totalAssignments: assignments.length,
            byStaff: {},
            byTask: {},
            averageScore: 0,
            trainingOpportunities: 0
        };
        
        let totalScore = 0;
        
        assignments.forEach(assignment => {
            // By staff
            if (!report.byStaff[assignment.staffId]) {
                report.byStaff[assignment.staffId] = {
                    name: assignment.staffName,
                    count: 0,
                    tasks: []
                };
            }
            report.byStaff[assignment.staffId].count++;
            report.byStaff[assignment.staffId].tasks.push(assignment.taskName);
            
            // By task
            if (!report.byTask[assignment.taskId]) {
                report.byTask[assignment.taskId] = {
                    name: assignment.taskName,
                    assignedTo: []
                };
            }
            report.byTask[assignment.taskId].assignedTo.push(assignment.staffName);
            
            // Score
            totalScore += assignment.score;
            
            // Training
            if (assignment.reasons.some(r => r.includes('Training'))) {
                report.trainingOpportunities++;
            }
        });
        
        report.averageScore = assignments.length > 0 ? totalScore / assignments.length : 0;
        
        return report;
    }
}
