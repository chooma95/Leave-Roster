import { CONFIG } from './config.js';
import { DateUtils } from './utils.js';
import { ScheduleUtils } from './core/schedule-utils.js';

// ===== SKILLS MANAGER =====
export class SkillsManager {
    constructor(skillsMatrix, staff, tasks) {
        this.skillsMatrix = skillsMatrix || {};
        this.staff = staff || [];
        this.tasks = tasks || [];
    }

    getStaffTaskSkill(staffId, taskId) {
        return this.skillsMatrix[staffId]?.taskSkills?.[taskId] || 0;
    }

    canStaffDoTask(staffId, taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;
        
        const staffSkill = this.getStaffTaskSkill(staffId, taskId);
        return staffSkill >= (task.skillLevel || 1);
    }

    getEligibleStaffForTask(taskId, excludeStaff = []) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return [];
        
        return this.staff.filter(s => 
            !excludeStaff.includes(s.id) && 
            this.canStaffDoTask(s.id, taskId)
        );
    }
    
    calculateOverallSkillLevel(staffId) {
        const taskSkillsObject = this.skillsMatrix[staffId]?.taskSkills;
        if (!taskSkillsObject || Object.keys(taskSkillsObject).length === 0) {
            return 0;
        }

        const skills = Object.values(taskSkillsObject).map(Number).filter(skill => skill > 0);
        if (skills.length === 0) return 0;
        
        const total = skills.reduce((sum, skill) => sum + skill, 0);
        const average = total / skills.length;
        return parseFloat(average.toFixed(2));
    }

    updateSkillsMatrix(newMatrix) {
        this.skillsMatrix = newMatrix;
    }

    setStaffTaskSkill(staffId, taskId, skillLevel) {
        if (!this.skillsMatrix[staffId]) {
            this.skillsMatrix[staffId] = { taskSkills: {} };
        }
        this.skillsMatrix[staffId].taskSkills[taskId] = skillLevel;
    }

    getStaffSkillsForCategory(staffId, category) {
        const categoryTasks = this.tasks.filter(t => t.category === category && t.type === 'task');
        const skills = {};
        
        categoryTasks.forEach(task => {
            skills[task.id] = this.getStaffTaskSkill(staffId, task.id);
        });
        
        return skills;
    }
}

// ===== ROTATION MANAGER =====
export class RotationManager {
    constructor(staff) {
        this.staff = staff || [];
        this.shiftRotations = {};
        this.initialize();
    }

    initialize() {
        if (Object.keys(this.shiftRotations).length > 0) return;
        
        const allStaff = this.staff.filter(s => ScheduleUtils.getWorkDaysCount(s) > 1);
        const rotationOrder = [...allStaff].sort(() => Math.random() - 0.5);
        
        rotationOrder.forEach((staffMember, index) => {
            this.shiftRotations[staffMember.id] = {
                earlyWeekOff: ((index * 2) % CONFIG.ROTATION_WEEKS) + 1,
                lateWeekOff: ((index * 2 + 1) % CONFIG.ROTATION_WEEKS) + 1,
                lastEarlyShift: null,
                lastLateShift: null
            };
        });
    }

    getStaffRotationStatus(staffId, weekNumber) {
        const rotation = this.shiftRotations[staffId];
        if (!rotation) return { canDoEarly: true, canDoLate: true };
        
        const adjustedWeek = ((weekNumber - 1) % CONFIG.ROTATION_WEEKS) + 1;
        
        return {
            canDoEarly: adjustedWeek !== rotation.earlyWeekOff,
            canDoLate: adjustedWeek !== rotation.lateWeekOff,
            isEarlyOffWeek: adjustedWeek === rotation.earlyWeekOff,
            isLateOffWeek: adjustedWeek === rotation.lateWeekOff
        };
    }

    setRotations(rotations) {
        this.shiftRotations = rotations;
    }

    getRotations() {
        return this.shiftRotations;
    }

    updateStaffRotation(staffId, earlyWeekOff, lateWeekOff) {
        if (!this.shiftRotations[staffId]) {
            this.shiftRotations[staffId] = {};
        }
        this.shiftRotations[staffId].earlyWeekOff = earlyWeekOff;
        this.shiftRotations[staffId].lateWeekOff = lateWeekOff;
    }
}

// ===== ENHANCED ASSIGNMENT GENERATOR =====
export class AssignmentGenerator {
    constructor(staff, tasks, skillsManager, allocations, triageAssignments, phoneRoster, leaveRoster) {
        this.staff = staff;
        this.tasks = tasks;
        this.skillsManager = skillsManager;
        this.allocations = allocations;
        this.triageAssignments = triageAssignments;
        this.phoneRoster = phoneRoster;
        this.leaveRoster = leaveRoster || {};
        this.conflicts = new Map();
        this.jennyStaffId = this.findJennyStaffId();
        this.priorityTasks = {};
    }

    findJennyStaffId() {
        const jenny = this.staff.find(s => 
            s.name.toLowerCase().includes('jenny') || s.id.toLowerCase().includes('jenny')
        );
        return jenny?.id || null;
    }

    generateWeeklyPhoneRoster(week, rotationManager) {
        console.log('🔄 Generating weekly phone roster with coverage priority...');
        
        week.forEach(date => {
            const isoDate = DateUtils.toISODate(date);
            if (this.phoneRoster[isoDate]) {
                this.phoneRoster[isoDate].early = [];
                this.phoneRoster[isoDate].late = [];
            }
        });

        const weekNumber = DateUtils.getWeekNumber(week[0]);
        const weeklyAssignments = { early: new Set(), late: new Set() };
        const assignmentTracker = this.initializeAssignmentTracker(week, weekNumber, rotationManager);
        
        this.assignJennyWednesdayShifts(week, assignmentTracker, weeklyAssignments);
        this.assignShiftsWithCoveragePriority(week, assignmentTracker, weeklyAssignments);
        this.fillRemainingShiftsFairly(week, assignmentTracker, weeklyAssignments);
        this.validateAndFixWeeklyAssignments(week);
        this.detectAndLogWeeklyConflicts(week, weeklyAssignments);
        
        console.log('✅ Weekly phone roster generated with coverage priority');
        this.logAssignmentSummary(week, weeklyAssignments);
    }

    generateWeeklyPhoneRosterWithEmergencyBackup(week, rotationManager) {
        console.log('🔄 Generating weekly phone roster with emergency backup...');
        
        this.generateWeeklyPhoneRoster(week, rotationManager);
        
        const assignmentTracker = this.initializeAssignmentTracker(week, DateUtils.getWeekNumber(week[0]), rotationManager);
        const weeklyAssignments = { early: new Set(), late: new Set() };
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (phoneData) {
                phoneData.early.forEach(staffId => weeklyAssignments.early.add(staffId));
                phoneData.late.forEach(staffId => weeklyAssignments.late.add(staffId));
            }
        });
        
        this.handleEmergencyCoverage(week, assignmentTracker, weeklyAssignments);
        
        const suggestions = this.suggestManualInterventions(week);
        if (suggestions.length > 0) {
            console.log('💡 Manual intervention suggestions:');
            suggestions.forEach(suggestion => {
                console.log(`  - ${suggestion.suggestion}`);
            });
        }
        
        console.log('✅ Weekly phone roster with emergency coverage complete');
    }

    initializeAssignmentTracker(week, weekNumber, rotationManager) {
        const tracker = {};
        
        this.staff.forEach(staff => {
            const rotationStatus = rotationManager.getStaffRotationStatus(staff.id, weekNumber);
            tracker[staff.id] = {
                staff: staff,
                canDoEarly: rotationStatus.canDoEarly,
                canDoLate: rotationStatus.canDoLate,
                isJenny: staff.id === this.jennyStaffId,
                availability: {},
                earlyAssigned: false,
                lateAssigned: false,
                totalShifts: 0
            };
            
            week.forEach(date => {
                const dayName = DateUtils.getDayName(date);
                const isOnLeave = this.getStaffLeave(staff.id, date);
                const worksThisDay = ScheduleUtils.isWorkingDay(staff, date);
                
                tracker[staff.id].availability[DateUtils.toISODate(date)] = {
                    available: worksThisDay && !isOnLeave,
                    dayName: dayName,
                    onLeave: !!isOnLeave
                };
            });
        });
        
        return tracker;
    }

    assignJennyWednesdayShifts(week, assignmentTracker, weeklyAssignments) {
        if (!this.jennyStaffId) return;
        
        const jenny = assignmentTracker[this.jennyStaffId];
        if (!jenny) return;
        
        const wednesday = week.find(date => DateUtils.getDayName(date) === 'wednesday');
        if (!wednesday) return;
        
        const wednesdayIso = DateUtils.toISODate(wednesday);
        const wednesdayAvailability = jenny.availability[wednesdayIso];
        
        if (!wednesdayAvailability?.available) {
            console.log('⚠️ Jenny not available on Wednesday');
            return;
        }
        
        if (!this.phoneRoster[wednesdayIso]) {
            this.phoneRoster[wednesdayIso] = { early: [], late: [] };
        }
        
        if (jenny.canDoEarly && !jenny.earlyAssigned && 
            !this.phoneRoster[wednesdayIso].early.includes(this.jennyStaffId)) {
            
            this.phoneRoster[wednesdayIso].early.push(this.jennyStaffId);
            jenny.earlyAssigned = true;
            jenny.totalShifts++;
            weeklyAssignments.early.add(this.jennyStaffId);
            console.log('✅ Jenny assigned to Wednesday early shift');
        }
        
        if (jenny.canDoLate && !jenny.lateAssigned && 
            !this.phoneRoster[wednesdayIso].late.includes(this.jennyStaffId)) {
            
            this.phoneRoster[wednesdayIso].late.push(this.jennyStaffId);
            jenny.lateAssigned = true;
            jenny.totalShifts++;
            weeklyAssignments.late.add(this.jennyStaffId);
            console.log('✅ Jenny assigned to Wednesday late shift');
        }
    }

    assignShiftsWithCoveragePriority(week, assignmentTracker, weeklyAssignments) {
        const shiftsNeeded = [];
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const dayName = DateUtils.getDayName(date);
            
            if (!this.phoneRoster[isoDate]) {
                this.phoneRoster[isoDate] = { early: [], late: [] };
            }
            
            const isWednesday = dayName === 'wednesday';
            const jennyAssignedEarly = isWednesday && this.jennyStaffId && 
                this.phoneRoster[isoDate].early.includes(this.jennyStaffId);
            const jennyAssignedLate = isWednesday && this.jennyStaffId && 
                this.phoneRoster[isoDate].late.includes(this.jennyStaffId);
            
            if (!jennyAssignedEarly || this.phoneRoster[isoDate].early.length < CONFIG.MAX_PHONE_STAFF) {
                shiftsNeeded.push({
                    date: date,
                    isoDate: isoDate,
                    shift: 'early',
                    currentStaff: this.phoneRoster[isoDate].early.length,
                    needed: CONFIG.MAX_PHONE_STAFF - this.phoneRoster[isoDate].early.length,
                    priority: this.calculateShiftPriority(date, 'early')
                });
            }
            
            if (!jennyAssignedLate || this.phoneRoster[isoDate].late.length < CONFIG.MAX_PHONE_STAFF) {
                shiftsNeeded.push({
                    date: date,
                    isoDate: isoDate,
                    shift: 'late',
                    currentStaff: this.phoneRoster[isoDate].late.length,
                    needed: CONFIG.MAX_PHONE_STAFF - this.phoneRoster[isoDate].late.length,
                    priority: this.calculateShiftPriority(date, 'late')
                });
            }
        });
        
        shiftsNeeded.sort((a, b) => {
            if (a.currentStaff === 0 && b.currentStaff > 0) return -1;
            if (b.currentStaff === 0 && a.currentStaff > 0) return 1;
            return b.priority - a.priority;
        });
        
        console.log(`📋 Need to fill ${shiftsNeeded.length} shifts this week`);
        
        shiftsNeeded.forEach(shiftInfo => {
            this.assignStaffToShift(shiftInfo, assignmentTracker, weeklyAssignments);
        });
    }

    calculateShiftPriority(date, shiftType) {
        let priority = 10;
        
        const dayName = DateUtils.getDayName(date);
        
        if (dayName === 'monday' || dayName === 'friday') {
            priority += 2;
        }
        
        if (shiftType === 'early') {
            priority += 1;
        }
        
        if (dayName === 'wednesday') {
            priority += 1;
        }
        
        return priority;
    }

    assignStaffToShift(shiftInfo, assignmentTracker, weeklyAssignments) {
        const { date, isoDate, shift, needed } = shiftInfo;
        
        let eligibleStaff = this.getEligibleStaffForShiftFlexible(
            date, shift, assignmentTracker, weeklyAssignments
        );
        
        if (eligibleStaff.length < needed && this.phoneRoster[isoDate][shift].length === 0) {
            console.log(`⚠️ Relaxing constraints for ${shift} shift on ${DateUtils.formatDate(date)} - need coverage`);
            eligibleStaff = this.getEligibleStaffWithRelaxedConstraints(
                date, shift, assignmentTracker, weeklyAssignments
            );
        }
        
        const sortedStaff = this.sortStaffByWorkloadAndAvailability(eligibleStaff, assignmentTracker);
        const toAssign = Math.min(needed, sortedStaff.length);
        
        for (let i = 0; i < toAssign; i++) {
            const staffId = sortedStaff[i].id;
            
            if (!this.phoneRoster[isoDate][shift].includes(staffId)) {
                this.phoneRoster[isoDate][shift].push(staffId);
                
                assignmentTracker[staffId][`${shift}Assigned`] = true;
                assignmentTracker[staffId].totalShifts++;
                weeklyAssignments[shift].add(staffId);
                
                const staffName = this.staff.find(s => s.id === staffId)?.name;
                console.log(`✅ Assigned ${staffName} to ${shift} shift on ${DateUtils.formatDate(date)}`);
            }
        }
        
        const finalAssigned = this.phoneRoster[isoDate][shift].length;
        if (finalAssigned < CONFIG.MAX_PHONE_STAFF) {
            console.log(`⚠️ ${shift} shift on ${DateUtils.formatDate(date)}: ${finalAssigned}/${CONFIG.MAX_PHONE_STAFF} staff assigned`);
        }
    }

    getEligibleStaffForShiftFlexible(date, shiftType, assignmentTracker, weeklyAssignments) {
        const isoDate = DateUtils.toISODate(date);
        const dayName = DateUtils.getDayName(date);
        const isWednesday = dayName === 'wednesday';
        
        return this.staff.filter(staff => {
            const tracker = assignmentTracker[staff.id];
            if (!tracker) return false;
            
            if (isWednesday && staff.id === this.jennyStaffId && 
                weeklyAssignments[shiftType].has(staff.id)) {
                return false;
            }
            
            if (!tracker.availability[isoDate]?.available) return false;
            
            if (shiftType === 'early' && !tracker.canDoEarly) return false;
            if (shiftType === 'late' && !tracker.canDoLate) return false;
            
            const otherShift = shiftType === 'early' ? 'late' : 'early';
            const alreadyOnOtherShift = this.phoneRoster[isoDate]?.[otherShift]?.includes(staff.id);
            if (alreadyOnOtherShift && !(isWednesday && staff.id === this.jennyStaffId)) {
                return false;
            }
            
            return !weeklyAssignments[shiftType].has(staff.id);
        });
    }

    getEligibleStaffWithRelaxedConstraints(date, shiftType, assignmentTracker, weeklyAssignments) {
        const isoDate = DateUtils.toISODate(date);
        const dayName = DateUtils.getDayName(date);
        const isWednesday = dayName === 'wednesday';
        
        return this.staff.filter(staff => {
            const tracker = assignmentTracker[staff.id];
            if (!tracker) return false;
            
            if (!tracker.availability[isoDate]?.available) return false;
            
            if (shiftType === 'early' && !tracker.canDoEarly) return false;
            if (shiftType === 'late' && !tracker.canDoLate) return false;
            
            const otherShift = shiftType === 'early' ? 'late' : 'early';
            const alreadyOnOtherShift = this.phoneRoster[isoDate]?.[otherShift]?.includes(staff.id);
            if (alreadyOnOtherShift && !(isWednesday && staff.id === this.jennyStaffId)) {
                return false;
            }
            
            return true;
        });
    }

    sortStaffByWorkloadAndAvailability(eligibleStaff, assignmentTracker) {
        return eligibleStaff
            .map(staff => ({
                ...staff,
                totalShifts: assignmentTracker[staff.id].totalShifts,
                workDayCount: ScheduleUtils.getWorkDaysCount(staff)
            }))
            .sort((a, b) => {
                if (a.totalShifts !== b.totalShifts) {
                    return a.totalShifts - b.totalShifts;
                }
                
                if (a.workDayCount !== b.workDayCount) {
                    return b.workDayCount - a.workDayCount;
                }
                
                return a.name.localeCompare(b.name);
            });
    }

    fillRemainingShiftsFairly(week, assignmentTracker, weeklyAssignments) {
        console.log('🔄 Filling remaining shifts fairly...');
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (!phoneData) return;
            
            if (phoneData.early.length < CONFIG.MAX_PHONE_STAFF) {
                const needed = CONFIG.MAX_PHONE_STAFF - phoneData.early.length;
                this.fillShiftGap(date, 'early', needed, assignmentTracker, weeklyAssignments);
            }
            
            if (phoneData.late.length < CONFIG.MAX_PHONE_STAFF) {
                const needed = CONFIG.MAX_PHONE_STAFF - phoneData.late.length;
                this.fillShiftGap(date, 'late', needed, assignmentTracker, weeklyAssignments);
            }
        });
    }

    fillShiftGap(date, shiftType, needed, assignmentTracker, weeklyAssignments) {
        const eligible = this.getEligibleStaffWithRelaxedConstraints(
            date, shiftType, assignmentTracker, weeklyAssignments
        );
        
        const isoDate = DateUtils.toISODate(date);
        const available = eligible.filter(staff => 
            !this.phoneRoster[isoDate][shiftType].includes(staff.id)
        );
        
        const sorted = available.sort((a, b) => {
            const aShifts = assignmentTracker[a.id].totalShifts;
            const bShifts = assignmentTracker[b.id].totalShifts;
            return aShifts - bShifts;
        });
        
        const toAssign = Math.min(needed, sorted.length);
        
        for (let i = 0; i < toAssign; i++) {
            const staffId = sorted[i].id;
            this.phoneRoster[isoDate][shiftType].push(staffId);
            
            assignmentTracker[staffId].totalShifts++;
            weeklyAssignments[shiftType].add(staffId);
            
            const staffName = this.staff.find(s => s.id === staffId)?.name;
            console.log(`📋 Gap fill: Assigned ${staffName} to ${shiftType} shift on ${DateUtils.formatDate(date)}`);
        }
    }

    handleEmergencyCoverage(week, assignmentTracker, weeklyAssignments) {
        console.log('🚨 Activating emergency coverage protocols...');
        
        const emergencyActions = [];
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (!phoneData) return;
            
            if (phoneData.early.length === 0) {
                emergencyActions.push({
                    date: date,
                    shift: 'early',
                    severity: 'critical',
                    action: 'emergency_assign'
                });
            }
            
            if (phoneData.late.length === 0) {
                emergencyActions.push({
                    date: date,
                    shift: 'late',
                    severity: 'critical',
                    action: 'emergency_assign'
                });
            }
            
            if (phoneData.early.length === 1 && CONFIG.MAX_PHONE_STAFF === 2) {
                emergencyActions.push({
                    date: date,
                    shift: 'early',
                    severity: 'severe',
                    action: 'emergency_fill'
                });
            }
            
            if (phoneData.late.length === 1 && CONFIG.MAX_PHONE_STAFF === 2) {
                emergencyActions.push({
                    date: date,
                    shift: 'late',
                    severity: 'severe',
                    action: 'emergency_fill'
                });
            }
        });
        
        emergencyActions.forEach(action => {
            if (action.severity === 'critical') {
                this.emergencyAssignCritical(action.date, action.shift, assignmentTracker, weeklyAssignments);
            } else if (action.severity === 'severe') {
                this.emergencyFillSevere(action.date, action.shift, assignmentTracker, weeklyAssignments);
            }
        });
        
        if (emergencyActions.length > 0) {
            console.log(`🚨 Processed ${emergencyActions.length} emergency coverage actions`);
        }
    }

    emergencyAssignCritical(date, shiftType, assignmentTracker, weeklyAssignments) {
        console.log(`🚨 CRITICAL: Zero coverage for ${shiftType} shift on ${DateUtils.formatDate(date)}`);
        
        const isoDate = DateUtils.toISODate(date);
        const dayName = DateUtils.getDayName(date);
        const isWednesday = dayName === 'wednesday';
        
        const emergencyStaff = this.staff.filter(staff => {
            const tracker = assignmentTracker[staff.id];
            if (!tracker) return false;
            
            if (!tracker.availability[isoDate]?.available) return false;
            
            if (shiftType === 'early' && !tracker.canDoEarly) return false;
            if (shiftType === 'late' && !tracker.canDoLate) return false;
            
            const otherShift = shiftType === 'early' ? 'late' : 'early';
            const onOtherShift = this.phoneRoster[isoDate]?.[otherShift]?.includes(staff.id);
            if (onOtherShift && !(isWednesday && staff.id === this.jennyStaffId)) {
                return false;
            }
            
            if (this.phoneRoster[isoDate][shiftType].includes(staff.id)) {
                return false;
            }
            
            return true;
        });
        
        if (emergencyStaff.length > 0) {
            emergencyStaff.sort((a, b) => {
                return assignmentTracker[a.id].totalShifts - assignmentTracker[b.id].totalShifts;
            });
            
            const staffId = emergencyStaff[0].id;
            const staffName = emergencyStaff[0].name;
            
            this.phoneRoster[isoDate][shiftType].push(staffId);
            assignmentTracker[staffId].totalShifts++;
            weeklyAssignments[shiftType].add(staffId);
            
            console.log(`🚨 EMERGENCY: Assigned ${staffName} to ${shiftType} shift on ${DateUtils.formatDate(date)}`);
            
            if (weeklyAssignments[shiftType].has(staffId)) {
                console.log(`⚠️ WARNING: ${staffName} now has multiple ${shiftType} shifts this week (emergency coverage)`);
            }
        } else {
            console.log(`❌ CRITICAL: NO STAFF AVAILABLE for ${shiftType} shift on ${DateUtils.formatDate(date)}`);
            
            this.conflicts.set(`${isoDate}_${shiftType}_no_staff_available`, {
                type: 'no_coverage',
                date: isoDate,
                shift: shiftType,
                severity: 'critical',
                message: `No staff available for ${shiftType} shift - manual intervention required`
            });
        }
    }

    emergencyFillSevere(date, shiftType, assignmentTracker, weeklyAssignments) {
        console.log(`⚠️ SEVERE: Only 1 person assigned to ${shiftType} shift on ${DateUtils.formatDate(date)}`);
        
        const isoDate = DateUtils.toISODate(date);
        const needed = CONFIG.MAX_PHONE_STAFF - this.phoneRoster[isoDate][shiftType].length;
        
        const eligible = this.getEligibleStaffWithRelaxedConstraints(
            date, shiftType, assignmentTracker, weeklyAssignments
        );
        
        const available = eligible.filter(staff => 
            !this.phoneRoster[isoDate][shiftType].includes(staff.id)
        );
        
        if (available.length > 0) {
            available.sort((a, b) => {
                return assignmentTracker[a.id].totalShifts - assignmentTracker[b.id].totalShifts;
            });
            
            const toAssign = Math.min(needed, available.length);
            
            for (let i = 0; i < toAssign; i++) {
                const staffId = available[i].id;
                const staffName = available[i].name;
                
                this.phoneRoster[isoDate][shiftType].push(staffId);
                assignmentTracker[staffId].totalShifts++;
                weeklyAssignments[shiftType].add(staffId);
                
                console.log(`⚠️ EMERGENCY FILL: Assigned ${staffName} to ${shiftType} shift on ${DateUtils.formatDate(date)}`);
            }
        } else {
            console.log(`⚠️ Cannot fill ${shiftType} shift on ${DateUtils.formatDate(date)} - no additional staff available`);
        }
    }

    suggestManualInterventions(week) {
        const suggestions = [];
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (!phoneData) return;
            
            if (phoneData.early.length < CONFIG.MAX_PHONE_STAFF) {
                const deficit = CONFIG.MAX_PHONE_STAFF - phoneData.early.length;
                suggestions.push({
                    type: 'understaffed',
                    date: isoDate,
                    shift: 'early',
                    deficit: deficit,
                    suggestion: `Consider reassigning staff from other days or shifts to cover early shift on ${DateUtils.formatDate(date)}`
                });
            }
            
            if (phoneData.late.length < CONFIG.MAX_PHONE_STAFF) {
                const deficit = CONFIG.MAX_PHONE_STAFF - phoneData.late.length;
                suggestions.push({
                    type: 'understaffed',
                    date: isoDate,
                    shift: 'late',
                    deficit: deficit,
                    suggestion: `Consider reassigning staff from other days or shifts to cover late shift on ${DateUtils.formatDate(date)}`
                });
            }
        });
        
        const shiftCounts = this.getStaffShiftCounts(week);
        const overworkedStaff = Object.entries(shiftCounts)
            .filter(([staffId, count]) => count > 2)
            .map(([staffId, count]) => ({
                staffId,
                name: this.staff.find(s => s.id === staffId)?.name,
                shiftCount: count
            }));
        
        if (overworkedStaff.length > 0) {
            suggestions.push({
                type: 'rebalance',
                suggestion: `Consider redistributing shifts from: ${overworkedStaff.map(s => `${s.name} (${s.shiftCount} shifts)`).join(', ')}`
            });
        }
        
        return suggestions;
    }

    getStaffShiftCounts(week) {
        const counts = {};
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (phoneData) {
                phoneData.early.forEach(staffId => {
                    counts[staffId] = (counts[staffId] || 0) + 1;
                });
                phoneData.late.forEach(staffId => {
                    counts[staffId] = (counts[staffId] || 0) + 1;
                });
            }
        });
        
        return counts;
    }

    validateAndFixWeeklyAssignments(week) {
        console.log('🔍 Validating and fixing weekly assignments...');
        let fixedConflicts = 0;
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (!phoneData) return;
            
            phoneData.early = [...new Set(phoneData.early)];
            phoneData.late = [...new Set(phoneData.late)];
            
            const isWednesday = DateUtils.getDayName(date) === 'wednesday';
            const bothShifts = phoneData.early.filter(staffId => 
                phoneData.late.includes(staffId)
            );
            
            bothShifts.forEach(staffId => {
                if (!(isWednesday && staffId === this.jennyStaffId)) {
                    phoneData.late = phoneData.late.filter(id => id !== staffId);
                    fixedConflicts++;
                    console.log(`🔧 Fixed: Removed ${this.staff.find(s => s.id === staffId)?.name} from late shift on ${DateUtils.formatDate(date)}`);
                }
            });
            
            phoneData.early = phoneData.early.filter((staffId, index, arr) => 
                arr.indexOf(staffId) === index
            );
            phoneData.late = phoneData.late.filter((staffId, index, arr) => 
                arr.indexOf(staffId) === index
            );
        });
        
        if (fixedConflicts > 0) {
            console.log(`✅ Fixed ${fixedConflicts} assignment conflicts`);
        }
        
        return fixedConflicts;
    }

    detectAndLogWeeklyConflicts(week, weeklyAssignments) {
        this.conflicts.clear();
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (phoneData && phoneData.early && phoneData.late) {
                const bothShiftsToday = phoneData.early.filter(staffId => 
                    phoneData.late.includes(staffId)
                );
                
                bothShiftsToday.forEach(staffId => {
                    const staff = this.staff.find(s => s.id === staffId);
                    this.conflicts.set(`${staffId}_both_shifts_${isoDate}`, {
                        type: 'both_shifts_same_day',
                        staffId: staffId,
                        staffName: staff?.name,
                        date: isoDate,
                        message: `${staff?.name} assigned to both early and late shifts on ${DateUtils.formatDate(date)}`
                    });
                });
                
                if (phoneData.early.length < CONFIG.MAX_PHONE_STAFF) {
                    this.conflicts.set(`${isoDate}_early_understaffed`, {
                        type: 'understaffed',
                        date: isoDate,
                        shift: 'early',
                        assigned: phoneData.early.length,
                        needed: CONFIG.MAX_PHONE_STAFF
                    });
                }
                
                if (phoneData.late.length < CONFIG.MAX_PHONE_STAFF) {
                    this.conflicts.set(`${isoDate}_late_understaffed`, {
                        type: 'understaffed',
                        date: isoDate,
                        shift: 'late',
                        assigned: phoneData.late.length,
                        needed: CONFIG.MAX_PHONE_STAFF
                    });
                }
            }
        });
        
        if (this.conflicts.size > 0) {
            console.warn(`⚠️ Detected ${this.conflicts.size} assignment conflicts:`);
            this.conflicts.forEach((conflict, key) => {
                console.warn(`  - ${key}:`, conflict);
            });
        } else {
            console.log('✅ No assignment conflicts detected');
        }
    }

    logAssignmentSummary(week, weeklyAssignments) {
        console.log('📊 Weekly Assignment Summary:');
        console.log(`  Early shifts assigned: ${weeklyAssignments.early.size} staff`);
        console.log(`  Late shifts assigned: ${weeklyAssignments.late.size} staff`);
        
        let totalSlotsNeeded = 0;
        let totalSlotsFilled = 0;
        let daysFullyCovered = 0;
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            
            if (phoneData) {
                totalSlotsNeeded += CONFIG.MAX_PHONE_STAFF * 2;
                totalSlotsFilled += phoneData.early.length + phoneData.late.length;
                
                if (phoneData.early.length === CONFIG.MAX_PHONE_STAFF && 
                    phoneData.late.length === CONFIG.MAX_PHONE_STAFF) {
                    daysFullyCovered++;
                }
            }
        });
        
        const coveragePercentage = ((totalSlotsFilled / totalSlotsNeeded) * 100).toFixed(1);
        const workingDays = week.filter(d => DateUtils.isWorkingDay(d)).length;
        
        console.log(`  📈 Coverage: ${totalSlotsFilled}/${totalSlotsNeeded} slots (${coveragePercentage}%)`);
        console.log(`  📅 Fully covered days: ${daysFullyCovered}/${workingDays}`);
        
        const shiftCounts = {};
        weeklyAssignments.early.forEach(id => {
            shiftCounts[id] = (shiftCounts[id] || 0) + 1;
        });
        weeklyAssignments.late.forEach(id => {
            shiftCounts[id] = (shiftCounts[id] || 0) + 1;
        });
        
        console.log('  👥 Individual assignments:');
        Object.entries(shiftCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([staffId, count]) => {
                const staff = this.staff.find(s => s.id === staffId);
                console.log(`    ${staff?.name}: ${count} shift(s)`);
            });
    }

    generateWeeklyTaskAssignmentsWithWOH(week) {
        console.log('🔄 Generating weekly task assignments considering WOH and age...');
        
        const workingDays = week.filter(date => DateUtils.isWorkingDay(date));
        if (workingDays.length === 0) return;
        
        const taskPriorities = this.calculateTaskPriorities();
        const weeklyStaffAvailability = this.getWeeklyStaffAvailability(week);
        
        const assignableTasks = this.tasks.filter(t => t.type === 'task')
            .sort((a, b) => {
                const aPriority = taskPriorities[a.id] || 0;
                const bPriority = taskPriorities[b.id] || 0;
                return bPriority - aPriority;
            });
        
        console.log('📊 Task Priority Order:');
        assignableTasks.slice(0, 10).forEach(task => {
            const priority = taskPriorities[task.id] || 0;
            const wohData = this.getTaskWOHData(task.id);
            console.log(`  ${task.name}: Priority ${priority.toFixed(1)} (${wohData.count} items, oldest: ${wohData.oldestAge} days)`);
        });
        
        const weeklyTaskAssignments = {};
        
        assignableTasks.forEach(task => {
            const taskWOH = this.getTaskWOHData(task.id);
            const eligibleStaff = this.getEligibleStaffForTaskWithWOH(task, weeklyStaffAvailability, taskWOH);
            
            if (eligibleStaff.length === 0) {
                console.warn(`⚠️ No eligible staff for ${task.name} (${taskWOH.count} items pending)`);
                weeklyTaskAssignments[task.id] = { assignments: [], wohData: taskWOH };
                return;
            }
            
            const assignmentCount = this.calculateOptimalAssignmentCount(task, taskWOH, eligibleStaff.length);
            
            const selectedStaff = eligibleStaff.slice(0, assignmentCount);
            weeklyTaskAssignments[task.id] = {
                assignments: selectedStaff.map(s => s.id),
                wohData: taskWOH
            };
            
            selectedStaff.forEach(staff => {
                weeklyStaffAvailability[staff.id].currentAssignments++;
                weeklyStaffAvailability[staff.id].wohLoad += taskWOH.count / assignmentCount;
            });
            
            console.log(`📋 Assigned ${selectedStaff.map(s => s.name).join(', ')} to ${task.name} (${taskWOH.count} items, ${assignmentCount} staff)`);
        });
        
        this.applyWeeklyAssignments(workingDays, weeklyTaskAssignments);
        
        console.log('✅ Weekly task assignments generated with WOH consideration');
    }

    calculateTaskPriorities() {
        const priorities = {};
        
        this.tasks.filter(t => t.type === 'task').forEach(task => {
            const wohData = this.getTaskWOHData(task.id);
            let priority = 0;
            
            if (wohData.oldestAge > 0) {
                priority += Math.min(wohData.oldestAge * 2, 100);
                
                if (wohData.oldestAge > 30) priority += (wohData.oldestAge - 30) * 5;
                if (wohData.oldestAge > 60) priority += (wohData.oldestAge - 60) * 10;
            }
            
            priority += Math.sqrt(wohData.count) * 5;
            
            if (wohData.oldestAge > 14 && (task.skillLevel || 1) >= 3) {
                priority += 20;
            }
            
            if (['cau', 'info'].includes(task.category) && wohData.oldestAge > 7) {
                priority += 15;
            }
            
            priorities[task.id] = priority;
        });
        
        return priorities;
    }

    getTaskWOHData(taskId) {
        const wohInfo = this.priorityTasks?.[taskId] || {};
        
        const count = parseInt(wohInfo.count || '0', 10);
        const oldestDate = wohInfo.oldestDate || '';
        
        let oldestAge = 0;
        if (oldestDate) {
            const oldest = new Date(oldestDate);
            const now = new Date();
            if (!isNaN(oldest.getTime())) {
                oldestAge = Math.floor((now - oldest) / (1000 * 60 * 60 * 24));
            }
        }
        
        return {
            count: count,
            oldestDate: oldestDate,
            oldestAge: oldestAge,
            urgencyLevel: this.calculateUrgencyLevel(count, oldestAge)
        };
    }

    calculateUrgencyLevel(count, ageInDays) {
        if (ageInDays > 60 || count > 100) return 'critical';
        if (ageInDays > 30 || count > 50) return 'high';
        if (ageInDays > 14 || count > 20) return 'medium';
        if (ageInDays > 7 || count > 10) return 'low';
        return 'normal';
    }

    getEligibleStaffForTaskWithWOH(task, weeklyStaffAvailability, taskWOH) {
        const eligibleStaff = this.skillsManager.getEligibleStaffForTask(task.id)
            .filter(staff => weeklyStaffAvailability[staff.id]?.availableDays > 0);
        
        return eligibleStaff.sort((a, b) => {
            const aAvail = weeklyStaffAvailability[a.id];
            const bAvail = weeklyStaffAvailability[b.id];
            
            if (taskWOH.urgencyLevel === 'critical' || taskWOH.urgencyLevel === 'high') {
                const aSkill = this.skillsManager.getStaffTaskSkill(a.id, task.id);
                const bSkill = this.skillsManager.getStaffTaskSkill(b.id, task.id);
                if (aSkill !== bSkill) return bSkill - aSkill;
            }
            
            const aLoad = aAvail.currentAssignments + (aAvail.wohLoad || 0) / 10;
            const bLoad = bAvail.currentAssignments + (bAvail.wohLoad || 0) / 10;
            if (aLoad !== bLoad) return aLoad - bLoad;
            
            if (aAvail.availableDays !== bAvail.availableDays) {
                return bAvail.availableDays - aAvail.availableDays;
            }
            
            const aSkill = this.skillsManager.getStaffTaskSkill(a.id, task.id);
            const bSkill = this.skillsManager.getStaffTaskSkill(b.id, task.id);
            return bSkill - aSkill;
        });
    }

    calculateOptimalAssignmentCount(task, wohData, eligibleStaffCount) {
        let assignmentCount = 1;
        
        switch (wohData.urgencyLevel) {
            case 'critical':
                assignmentCount = Math.min(3, eligibleStaffCount);
                break;
            case 'high':
                assignmentCount = Math.min(2, eligibleStaffCount);
                break;
            case 'medium':
                assignmentCount = (task.skillLevel || 1) >= 3 && eligibleStaffCount >= 2 ? 2 : 1;
                break;
            default:
                assignmentCount = 1;
        }
        
        if (wohData.count > 50 && eligibleStaffCount >= 2) {
            assignmentCount = Math.max(assignmentCount, 2);
        }
        
        if (wohData.count > 100 && eligibleStaffCount >= 3) {
            assignmentCount = Math.max(assignmentCount, 3);
        }
        
        return assignmentCount;
    }

    getWeeklyStaffAvailability(week) {
        const availability = {};
        
        this.staff.forEach(staff => {
            let availableDays = 0;
            let totalWorkDays = 0;
            
            week.forEach(date => {
                if (!DateUtils.isWorkingDay(date)) return;
                
                const dayName = DateUtils.getDayName(date);
                const worksThisDay = ScheduleUtils.isWorkingDay(staff, date);
                const isOnLeave = this.getStaffLeave(staff.id, date);
                
                if (worksThisDay) {
                    totalWorkDays++;
                    if (!isOnLeave) {
                        availableDays++;
                    }
                }
            });
            
            availability[staff.id] = {
                availableDays,
                totalWorkDays,
                currentAssignments: 0,
                wohLoad: 0,
                staff: staff
            };
        });
        
        return availability;
    }

    applyWeeklyAssignments(workingDays, weeklyTaskAssignments) {
        workingDays.forEach(date => {
            const isoDate = DateUtils.toISODate(date);
            if (!this.allocations[isoDate]) this.allocations[isoDate] = {};
            
            Object.entries(weeklyTaskAssignments).forEach(([taskId, assignment]) => {
                const dayAvailableStaff = assignment.assignments.filter(staffId => {
                    return !this.getStaffLeave(staffId, date) && 
                           this.isStaffAvailableOnDay(staffId, date);
                });
                
                this.allocations[isoDate][taskId] = {
                    assignments: dayAvailableStaff,
                    count: assignment.wohData.count.toString(),
                    oldestDate: assignment.wohData.oldestDate
                };
            });
        });
    }

    isStaffAvailableOnDay(staffId, date) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) return false;
        
        const dayName = DateUtils.getDayName(date);
        const worksThisDay = ScheduleUtils.isWorkingDay(staff, date);
        const isOnLeave = this.getStaffLeave(staffId, date);
        
        return worksThisDay && !isOnLeave;
    }

    generateWeeklyTriageAssignments(week) {
        console.log('🔄 Generating weekly triage assignments...');
        
        const workingDays = week.filter(date => DateUtils.isWorkingDay(date));
        if (workingDays.length === 0) return;
        
        const triageHeaders = this.tasks.filter(t => t.type === 'header' && t.allowTriage);
        
        triageHeaders.forEach(header => {
            const availableStaff = this.staff.filter(staff => {
                const availableDays = workingDays.filter(date => {
                    const dayName = DateUtils.getDayName(date);
                    const worksThisDay = ScheduleUtils.isWorkingDay(staff, date);
                    const isOnLeave = this.getStaffLeave(staff.id, date);
                    return worksThisDay && !isOnLeave;
                }).length;
                
                return availableDays > 0;
            });
            
            if (availableStaff.length === 0) return;
            
            const sortedStaff = availableStaff.sort((a, b) => {
                const aAvailability = workingDays.filter(date => 
                    this.isStaffAvailableOnDay(a.id, date)
                ).length;
                const bAvailability = workingDays.filter(date => 
                    this.isStaffAvailableOnDay(b.id, date)
                ).length;
                
                return bAvailability - aAvailability;
            });
            
            const assignmentCount = Math.min(2, sortedStaff.length);
            const selectedStaff = sortedStaff.slice(0, assignmentCount);
            
            workingDays.forEach(date => {
                const isoDate = DateUtils.toISODate(date);
                if (!this.triageAssignments[isoDate]) {
                    this.triageAssignments[isoDate] = {};
                }
                
                const dayAssignments = selectedStaff
                    .filter(staff => this.isStaffAvailableOnDay(staff.id, date))
                    .map(staff => staff.id);
                
                this.triageAssignments[isoDate][header.id] = {
                    assignments: dayAssignments
                };
            });
            
            console.log(`📋 Assigned ${selectedStaff.map(s => s.name).join(', ')} to ${header.name} triage for the week`);
        });
    }

    updateTaskWOH(taskId, count, oldestDate) {
        if (!this.priorityTasks) this.priorityTasks = {};
        if (!this.priorityTasks[taskId]) this.priorityTasks[taskId] = {};
        
        this.priorityTasks[taskId].count = count.toString();
        this.priorityTasks[taskId].oldestDate = oldestDate;
        
        console.log(`📊 Updated WOH for ${this.tasks.find(t => t.id === taskId)?.name}: ${count} items, oldest ${oldestDate}`);
    }

    getWOHSummary() {
        const summary = {
            totalItems: 0,
            criticalTasks: 0,
            highPriorityTasks: 0,
            oldestItem: null,
            taskBreakdown: []
        };
        
        this.tasks.filter(t => t.type === 'task').forEach(task => {
            const wohData = this.getTaskWOHData(task.id);
            
            summary.totalItems += wohData.count;
            
            if (wohData.urgencyLevel === 'critical') summary.criticalTasks++;
            if (wohData.urgencyLevel === 'high') summary.highPriorityTasks++;
            
            if (!summary.oldestItem || wohData.oldestAge > summary.oldestItem.age) {
                summary.oldestItem = {
                    taskId: task.id,
                    taskName: task.name,
                    age: wohData.oldestAge,
                    date: wohData.oldestDate
                };
            }
            
            if (wohData.count > 0 || wohData.oldestAge > 0) {
                summary.taskBreakdown.push({
                    taskId: task.id,
                    taskName: task.name,
                    count: wohData.count,
                    oldestAge: wohData.oldestAge,
                    urgencyLevel: wohData.urgencyLevel
                });
            }
        });
        
        summary.taskBreakdown.sort((a, b) => {
            const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1, normal: 0 };
            const aUrgency = urgencyOrder[a.urgencyLevel];
            const bUrgency = urgencyOrder[b.urgencyLevel];
            
            if (aUrgency !== bUrgency) return bUrgency - aUrgency;
            return b.oldestAge - a.oldestAge;
        });
        
        return summary;
    }

    generateCompleteWeeklyAssignmentsWithWOH(week, rotationManager) {
        console.log('🔄 Generating complete weekly assignments considering WOH...');
        
        const wohSummary = this.getWOHSummary();
        console.log(`📊 Current WOH Status: ${wohSummary.totalItems} items, ${wohSummary.criticalTasks} critical tasks, oldest item: ${wohSummary.oldestItem?.age || 0} days`);
        
        this.generateWeeklyPhoneRosterWithEmergencyBackup(week, rotationManager);
        this.generateWeeklyTaskAssignmentsWithWOH(week);
        this.generateWeeklyTriageAssignments(week);
        
        console.log('✅ Complete weekly assignments generated with WOH consideration');
        this.reportCriticalAssignments(week);
    }

    reportCriticalAssignments(week) {
        const workingDays = week.filter(date => DateUtils.isWorkingDay(date));
        const criticalAssignments = [];
        
        workingDays.forEach(date => {
            const isoDate = DateUtils.toISODate(date);
            const allocations = this.allocations[isoDate] || {};
            
            Object.entries(allocations).forEach(([taskId, allocation]) => {
                const count = parseInt(allocation.count || '0', 10);
                const oldestDate = allocation.oldestDate;
                
                if (count > 0 || oldestDate) {
                    const task = this.tasks.find(t => t.id === taskId);
                    const wohData = this.getTaskWOHData(taskId);
                    
                    if (wohData.urgencyLevel === 'critical' || wohData.urgencyLevel === 'high') {
                        criticalAssignments.push({
                            date: DateUtils.formatDate(date),
                            taskName: task?.name,
                            count: count,
                            oldestAge: wohData.oldestAge,
                            urgencyLevel: wohData.urgencyLevel,
                            assignedStaff: allocation.assignments.map(id => 
                                this.staff.find(s => s.id === id)?.name
                            ).filter(Boolean)
                        });
                    }
                }
            });
        });
        
        if (criticalAssignments.length > 0) {
            console.log('🚨 Critical WOH assignments for this week:');
            criticalAssignments.forEach(assignment => {
                console.log(`  ${assignment.date}: ${assignment.taskName} (${assignment.count} items, ${assignment.oldestAge} days old) → ${assignment.assignedStaff.join(', ')}`);
            });
        }
    }

    generateRandomTaskAssignments(date) {
        const isoDate = DateUtils.toISODate(date);
        const dayName = DateUtils.getDayName(date);
        
        const availableStaff = this.staff.filter(s => 
            ScheduleUtils.isWorkingDay(s, date) && 
            !this.getStaffLeave(s.id, date)
        );
        
        if (availableStaff.length === 0) {
            console.warn(`⚠️ No available staff for ${DateUtils.formatDate(date)}`);
            return;
        }
        
        if (!this.allocations[isoDate]) this.allocations[isoDate] = {};
        
        const staffWorkload = {};
        availableStaff.forEach(s => staffWorkload[s.id] = 0);
        
        const phoneData = this.phoneRoster[isoDate];
        if (phoneData) {
            phoneData.early.forEach(staffId => {
                if (staffWorkload[staffId] !== undefined) {
                    staffWorkload[staffId] += 0.5;
                }
            });
            phoneData.late.forEach(staffId => {
                if (staffWorkload[staffId] !== undefined) {
                    staffWorkload[staffId] += 0.5;
                }
            });
        }
        
        const assignableTasks = this.tasks.filter(t => t.type === 'task');
        
        assignableTasks.forEach(task => {
            const eligibleStaff = this.skillsManager.getEligibleStaffForTask(task.id)
                .filter(s => availableStaff.some(a => a.id === s.id))
                .sort((a, b) => {
                    const workloadDiff = staffWorkload[a.id] - staffWorkload[b.id];
                    if (workloadDiff !== 0) return workloadDiff;
                    
                    const aSkill = this.skillsManager.getStaffTaskSkill(a.id, task.id);
                    const bSkill = this.skillsManager.getStaffTaskSkill(b.id, task.id);
                    return bSkill - aSkill;
                });
            
            if (eligibleStaff.length === 0) {
                this.allocations[isoDate][task.id] = { assignments: [] };
                console.warn(`⚠️ No eligible staff for task: ${task.name} on ${DateUtils.formatDate(date)}`);
                return;
            }
            
            let assignmentCount = 1;
            if ((task.skillLevel || 1) >= 3 && eligibleStaff.length >= 2) {
                assignmentCount = 2;
            }
            
            const selectedStaff = eligibleStaff.slice(0, assignmentCount);
            
            this.allocations[isoDate][task.id] = {
                assignments: selectedStaff.map(s => s.id)
            };
            
            selectedStaff.forEach(s => staffWorkload[s.id]++);
        });
        
        console.log(`✅ Task assignments generated for ${DateUtils.formatDate(date)}`);
    }

    getStaffLeave(staffId, date) {
        const isoDate = DateUtils.toISODate(new Date(date));
        
        const phoneLeave = this.phoneRoster[isoDate]?.leave?.find(entry => entry.staffId === staffId);
        const leaveEntry = this.leaveRoster?.[isoDate]?.[staffId];
        
        if (phoneLeave) {
            return { staffId, comment: phoneLeave.comment, source: 'phone' };
        }
        
        if (leaveEntry) {
            return { staffId, comment: leaveEntry, source: 'leave' };
        }
        
        return null;
    }

    getConflicts() {
        return this.conflicts;
    }

    hasConflictsForDate(date) {
        const isoDate = DateUtils.toISODate(date);
        for (const [key] of this.conflicts) {
            if (key.includes(isoDate)) return true;
        }
        return false;
    }

    getWorkloadBalanceReport(week) {
        const report = {};
        
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.phoneRoster[isoDate];
            const allocations = this.allocations[isoDate] || {};
            
            if (phoneData) {
                phoneData.early.forEach(staffId => {
                    if (!report[staffId]) report[staffId] = { phone: 0, tasks: 0 };
                    report[staffId].phone += 0.5;
                });
                phoneData.late.forEach(staffId => {
                    if (!report[staffId]) report[staffId] = { phone: 0, tasks: 0 };
                    report[staffId].phone += 0.5;
                });
            }
            
            Object.values(allocations).forEach(allocation => {
                if (allocation.assignments) {
                    allocation.assignments.forEach(staffId => {
                        if (!report[staffId]) report[staffId] = { phone: 0, tasks: 0 };
                        report[staffId].tasks++;
                    });
                }
            });
        });
        
        return report;
    }

    copyPreviousWeekAssignments(currentWeek) {
        const previousWeek = new Date(currentWeek[0]);
        previousWeek.setDate(previousWeek.getDate() - 7);
        const prevWeekDates = DateUtils.getWeek(previousWeek);

        currentWeek.forEach((currentDate, index) => {
            const currentIso = DateUtils.toISODate(currentDate);
            const prevIso = DateUtils.toISODate(prevWeekDates[index]);

            if (this.allocations[prevIso]) {
                this.allocations[currentIso] = JSON.parse(JSON.stringify(this.allocations[prevIso]));
            }

            if (this.triageAssignments[prevIso]) {
                this.triageAssignments[currentIso] = JSON.parse(JSON.stringify(this.triageAssignments[prevIso]));
            }

            if (this.phoneRoster[prevIso]) {
                this.phoneRoster[currentIso] = JSON.parse(JSON.stringify(this.phoneRoster[prevIso]));
            }
        });
    }

    assignStaffToTask(taskId, staffIds, date) {
        const isoDate = DateUtils.toISODate(date);
        
        if (!this.allocations[isoDate]) {
            this.allocations[isoDate] = {};
        }
        
        this.allocations[isoDate][taskId] = {
            assignments: staffIds,
            count: '',
            oldestDate: ''
        };
    }

    assignTriageStaff(headerId, staffIds, date) {
        const isoDate = DateUtils.toISODate(date);
        
        if (!this.triageAssignments[isoDate]) {
            this.triageAssignments[isoDate] = {};
        }
        
        this.triageAssignments[isoDate][headerId] = {
            assignments: staffIds
        };
    }

    getTaskAssignment(taskId, date) {
        const isoDate = DateUtils.toISODate(date);
        return this.allocations[isoDate]?.[taskId];
    }

    getTriageAssignment(headerId, date) {
        const isoDate = DateUtils.toISODate(date);
        return this.triageAssignments[isoDate]?.[headerId];
    }

    updateLeaveRoster(leaveRoster) {
        this.leaveRoster = leaveRoster;
        this.rebalanceAfterLeaveUpdate();
    }

    rebalanceAfterLeaveUpdate() {
        console.log('📋 Leave roster updated - consider regenerating assignments');
    }
}

// ===== THEME MANAGER =====
export class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.observers = [];
        this.init();
    }

    init() {
        this.currentTheme = this.getSavedTheme() || 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    getSavedTheme() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['theme'], (result) => {
                if (result.theme) {
                    this.currentTheme = result.theme;
                    document.documentElement.setAttribute('data-theme', this.currentTheme);
                    this.updateThemeIcon();
                }
            });
        }
        return localStorage.getItem('theme');
    }

    saveTheme(theme) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ theme: theme });
        } else {
            localStorage.setItem('theme', theme);
        }
    }

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
        this.saveTheme(this.currentTheme);
        this.notifyObservers();
    }

    updateThemeIcon() {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
        }
    }

    addObserver(callback) {
        this.observers.push(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => callback(this.currentTheme));
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', this.currentTheme);
            this.updateThemeIcon();
            this.saveTheme(theme);
            this.notifyObservers();
        }
    }
}

// ===== DATA MANAGER =====
export class DataManager {
    constructor() {
        this.data = {};
        this.autoSaveEnabled = true;
        this.saveQueue = [];
        this.isSaving = false;
    }

    async save(data) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ workRosterData: data });
            } else {
                localStorage.setItem('workRosterData', JSON.stringify(data));
            }
            
            this.data = data;
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Failed to save data:', error);
            throw error;
        }
    }

    async load() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                return new Promise((resolve) => {
                    chrome.storage.local.get(['workRosterData', 'userProfile'], (result) => {
                        resolve(result);
                    });
                });
            } else {
                const workRosterData = localStorage.getItem('workRosterData');
                const userProfile = localStorage.getItem('userProfile');
                
                return {
                    workRosterData: workRosterData ? JSON.parse(workRosterData) : null,
                    userProfile: userProfile ? JSON.parse(userProfile) : null
                };
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            return {};
        }
    }

    async export() {
        try {
            const data = await this.load();
            const exportData = {
                ...data,
                exportDate: new Date().toISOString(),
                version: '3.2.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `work-roster-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Failed to export data:', error);
            return false;
        }
    }

    async import(file) {
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            
            if (importedData.workRosterData) {
                await this.save(importedData.workRosterData);
                
                if (importedData.userProfile) {
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        await chrome.storage.local.set({ userProfile: importedData.userProfile });
                    } else {
                        localStorage.setItem('userProfile', JSON.stringify(importedData.userProfile));
                    }
                }
                
                return true;
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    async clear() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.clear();
            } else {
                localStorage.clear();
            }
            
            this.data = {};
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    enableAutoSave() {
        this.autoSaveEnabled = true;
    }

    disableAutoSave() {
        this.autoSaveEnabled = false;
    }
}

// ===== PERFORMANCE UTILS =====
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

    static batchUpdates(updates, batchSize = 10) {
        const batches = [];
        for (let i = 0; i < updates.length; i += batchSize) {
            batches.push(updates.slice(i, i + batchSize));
        }
        return batches;
    }

    static measurePerformance(name, func) {
        const start = performance.now();
        const result = func();
        const end = performance.now();
        console.log(`${name} took ${end - start} milliseconds`);
        return result;
    }
}

// ===== VALIDATION UTILS =====
export class ValidationUtils {
    static validateStaffMember(staff) {
        return staff && 
               typeof staff.id === 'string' && 
               typeof staff.name === 'string' && 
               ScheduleUtils.isValidSchedule(staff);
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

    static validateSkillLevel(skillLevel) {
        return Number.isInteger(skillLevel) && skillLevel >= 0 && skillLevel <= 5;
    }

    static validateWorkDays(workDays) {
        return Array.isArray(workDays) && 
               workDays.length > 0 && 
               workDays.every(day => CONFIG.WORK_DAYS.includes(day));
    }
}

// ===== ERROR HANDLER =====
export class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
    }

    setupGlobalHandlers() {
        window.addEventListener('error', (event) => {
            this.logError(event.error, 'Global Error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError(event.reason, 'Unhandled Promise Rejection');
        });
    }

    logError(error, context = 'Unknown', metadata = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error?.message || String(error),
            stack: error?.stack,
            context,
            metadata
        };

        this.errors.push(errorEntry);
        
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        console.error(`[${context}]`, error, metadata);
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }

    getErrorSummary() {
        const summary = {};
        this.errors.forEach(error => {
            const key = error.context;
            if (!summary[key]) {
                summary[key] = 0;
            }
            summary[key]++;
        });
        return summary;
    }
}