import { DateUtils, ObjectUtils } from './utils.js';
import { NotificationManager } from './ui.js';

export class AssignmentManager {
    constructor(app) {
        this.app = app;
    }

    /**
     * Enhanced assignment generation with smart algorithms
     */
    generateSmartAssignmentsForWeek() {
        if (this.app.isWeekLocked(this.app.state.currentDate)) {
            return NotificationManager.show('Cannot generate for a locked week', 'error');
        }
        
        const week = DateUtils.getWeek(this.app.state.currentDate);
        
        console.log('🧠 Generating smart assignments with enhanced algorithms...');
        
        // Step 1: Generate fair phone roster using enhanced algorithm
        this.app.assignmentGenerator.generateWeeklyPhoneRoster(week, this.app.rotationManager);
        
        // Step 2: Generate task assignments with workload balancing
        week.forEach(date => {
            if (DateUtils.isWorkingDay(date)) {
                this.app.assignmentGenerator.generateRandomTaskAssignments(date);
            }
        });
        
        // Step 3: Run conflict detection and analysis
        this.app.conflictManager.checkAndDisplayConflicts();
        this.app.conflictManager.analyzeWorkloadBalance();
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        const conflicts = this.app.assignmentGenerator.getConflicts();
        const message = conflicts.size > 0 
            ? `Generated smart assignments with ${conflicts.size} conflicts to review`
            : 'Generated smart assignments successfully';
        
        NotificationManager.show(message, conflicts.size > 0 ? 'warning' : 'success');
    }

    /**
     * Generate monthly phone roster with enhanced fair distribution
     */
    generateMonthlyPhoneRoster() {
        const { currentLeaveDate } = this.app.state;
        const workingDays = DateUtils.getWorkingDaysInMonth(currentLeaveDate);
        
        // Group days into weeks (Tuesday to Monday)
        const weeks = [];
        let currentWeek = [];
        
        workingDays.forEach(date => {
            const dayName = DateUtils.getDayName(date);
            if (dayName === 'tuesday' && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(date);
        });
        
        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }
        
        // Generate phone roster for each week using enhanced algorithm
        weeks.forEach(week => {
            this.app.assignmentGenerator.generateWeeklyPhoneRoster(week, this.app.rotationManager);
        });
        
        this.app.debouncedSave();
        NotificationManager.show(`Generated phone shifts for ${DateUtils.getMonthName(currentLeaveDate)}`, 'success');
    }

    /**
     * Copy previous week with conflict checking
     */
    copyPreviousWeek() {
        if (this.app.isWeekLocked(this.app.state.currentDate)) {
            return NotificationManager.show('Cannot copy to a locked week', 'error');
        }
        const week = DateUtils.getWeek(this.app.state.currentDate);
        this.app.assignmentGenerator.copyPreviousWeekAssignments(week);
        
        // Check for conflicts after copying
        this.app.debouncedConflictCheck();
        this.app.debouncedWorkloadAnalysis();
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        NotificationManager.show('Copied assignments from previous week', 'success');
    }

    /**
     * Push Tuesday assignments to the rest of the week
     */
    pushTuesdayToWeek(tuesday) {
        const week = DateUtils.getWeek(tuesday);
        const tuesdayIso = DateUtils.toISODate(tuesday);
        
        // Get Tuesday's assignments
        const tuesdayAllocations = this.app.state.allocations[tuesdayIso] || {};
        const tuesdayTriage = this.app.state.triageAssignments[tuesdayIso] || {};
        
        // Copy to rest of week (skip Tuesday itself)
        week.slice(1).forEach(date => {
            if (DateUtils.isWorkingDay(date)) {
                const isoDate = DateUtils.toISODate(date);
                this.app.state.allocations[isoDate] = ObjectUtils.deepClone(tuesdayAllocations);
                this.app.state.triageAssignments[isoDate] = ObjectUtils.deepClone(tuesdayTriage);
                // Don't copy phone roster - it should be unique per day
            }
        });
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        NotificationManager.show('Tuesday assignments pushed to week', 'success');
    }

    /**
     * Push triage assignment to the rest of the week
     */
    pushTriageToWeek(headerId, startDate) {
        const week = DateUtils.getWeek(startDate);
        const startIso = DateUtils.toISODate(startDate);
        
        const triageAssignment = this.app.state.triageAssignments[startIso]?.[headerId];
        if (!triageAssignment) {
            NotificationManager.show('No triage assignment to push', 'warning');
            return;
        }
        
        week.slice(1).forEach(date => {
            if (DateUtils.isWorkingDay(date)) {
                const isoDate = DateUtils.toISODate(date);
                if (!this.app.state.triageAssignments[isoDate]) {
                    this.app.state.triageAssignments[isoDate] = {};
                }
                this.app.state.triageAssignments[isoDate][headerId] = ObjectUtils.deepClone(triageAssignment);
            }
        });
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        NotificationManager.show('Triage assignment pushed to week', 'success');
    }

    /**
     * Apply assignment suggestion
     */
    applySuggestion(suggestionId) {
        const suggestion = this.app.state.assignmentSuggestions[suggestionId];
        if (!suggestion) {
            NotificationManager.show('Suggestion not found', 'error');
            return;
        }

        try {
            switch (suggestion.type) {
                case 'staff_assignment':
                    this.applyStaffAssignmentSuggestion(suggestion);
                    break;
                case 'workload_balance':
                    this.applyWorkloadBalanceSuggestion(suggestion);
                    break;
                case 'skill_optimization':
                    this.applySkillOptimizationSuggestion(suggestion);
                    break;
                default:
                    NotificationManager.show('Unknown suggestion type', 'error');
                    return;
            }

            // Remove applied suggestion
            delete this.app.state.assignmentSuggestions[suggestionId];
            
            this.app.debouncedConflictCheck();
            this.app.debouncedWorkloadAnalysis();
            this.app.debouncedSave();
            this.app.uiManager.render();
            
            NotificationManager.show('Suggestion applied successfully', 'success');
        } catch (error) {
            console.error('Failed to apply suggestion:', error);
            NotificationManager.show('Failed to apply suggestion', 'error');
        }
    }

    /**
     * Apply staff assignment suggestion
     */
    applyStaffAssignmentSuggestion(suggestion) {
        const { taskId, staffId, date, type } = suggestion.params;
        
        if (type === 'task') {
            // Get current assignment
            const currentAssignment = this.app.assignmentGenerator.getTaskAssignment(taskId, new Date(date));
            const currentStaff = currentAssignment?.assignments || [];
            
            // Add suggested staff if not already assigned
            if (!currentStaff.includes(staffId)) {
                const newAssignment = [...currentStaff, staffId];
                this.app.assignmentGenerator.assignStaffToTask(taskId, newAssignment, new Date(date));
            }
        } else if (type === 'triage') {
            // Similar logic for triage assignments
            const currentAssignment = this.app.assignmentGenerator.getTriageAssignment(taskId, new Date(date));
            const currentStaff = currentAssignment?.assignments || [];
            
            if (!currentStaff.includes(staffId)) {
                const newAssignment = [...currentStaff, staffId];
                this.app.assignmentGenerator.assignTriageStaff(taskId, newAssignment, new Date(date));
            }
        }
    }

    /**
     * Apply workload balance suggestion
     */
    applyWorkloadBalanceSuggestion(suggestion) {
        const { fromStaffId, toStaffId, taskId, date } = suggestion.params;
        
        // Remove task from overloaded staff
        const isoDate = DateUtils.toISODate(new Date(date));
        const allocations = this.app.state.allocations[isoDate] || {};
        
        if (allocations[taskId] && allocations[taskId].assignments) {
            // Remove from overloaded staff
            allocations[taskId].assignments = allocations[taskId].assignments.filter(id => id !== fromStaffId);
            
            // Add to underloaded staff
            if (!allocations[taskId].assignments.includes(toStaffId)) {
                allocations[taskId].assignments.push(toStaffId);
            }
        }
    }

    /**
     * Apply skill optimization suggestion
     */
    applySkillOptimizationSuggestion(suggestion) {
        const { taskId, recommendedStaff, date } = suggestion.params;
        
        // Replace current assignment with recommended staff
        this.app.assignmentGenerator.assignStaffToTask(taskId, recommendedStaff, new Date(date));
    }

    /**
     * Generate assignment suggestions for the current week
     */
    generateAssignmentSuggestions() {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        const suggestions = {};
        let suggestionId = 0;

        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;

            const isoDate = DateUtils.toISODate(date);
            const allocations = this.app.state.allocations[isoDate] || {};
            const dayName = DateUtils.getDayName(date);

            // Analyze each task assignment
            Object.entries(allocations).forEach(([taskId, allocation]) => {
                const task = this.app.state.tasks.find(t => t.id === taskId);
                if (!task || task.type !== 'task') return;

                const currentStaff = allocation.assignments || [];
                
                // Skill optimization suggestions
                const eligibleStaff = this.app.skillsManager.getEligibleStaffForTask(taskId)
                    .filter(s => 
                        s.workDays.includes(dayName) && 
                        !this.app.assignmentGenerator.getStaffLeave(s.id, date)
                    );

                // Find higher skilled staff not currently assigned
                const higherSkilledStaff = eligibleStaff.filter(staff => {
                    const skillLevel = this.app.skillsManager.getStaffTaskSkill(staff.id, taskId);
                    const currentMaxSkill = Math.max(...currentStaff.map(id => 
                        this.app.skillsManager.getStaffTaskSkill(id, taskId)
                    ), 0);
                    
                    return skillLevel > currentMaxSkill && !currentStaff.includes(staff.id);
                });

                if (higherSkilledStaff.length > 0) {
                    const bestStaff = higherSkilledStaff.sort((a, b) => {
                        const aSkill = this.app.skillsManager.getStaffTaskSkill(a.id, taskId);
                        const bSkill = this.app.skillsManager.getStaffTaskSkill(b.id, taskId);
                        return bSkill - aSkill;
                    })[0];

                    suggestions[`skill_${suggestionId++}`] = {
                        type: 'skill_optimization',
                        priority: 'medium',
                        title: `Improve ${task.name} assignment`,
                        description: `${bestStaff.name} has higher skill level for this task`,
                        params: {
                            taskId,
                            date: isoDate,
                            recommendedStaff: [bestStaff.id],
                            currentStaff
                        }
                    };
                }

                // Workload balance suggestions
                const overloadedStaff = currentStaff.filter(staffId => {
                    const workload = this.getStaffWorkloadForDate(staffId, date);
                    return workload.total > 4;
                });

                if (overloadedStaff.length > 0) {
                    const underloadedStaff = eligibleStaff.filter(staff => {
                        const workload = this.getStaffWorkloadForDate(staff.id, date);
                        return workload.total <= 2 && !currentStaff.includes(staff.id);
                    });

                    if (underloadedStaff.length > 0) {
                        suggestions[`workload_${suggestionId++}`] = {
                            type: 'workload_balance',
                            priority: 'high',
                            title: `Balance workload for ${task.name}`,
                            description: `Move from overloaded to available staff`,
                            params: {
                                taskId,
                                date: isoDate,
                                fromStaffId: overloadedStaff[0],
                                toStaffId: underloadedStaff[0]
                            }
                        };
                    }
                }
            });
        });

        this.app.state.assignmentSuggestions = suggestions;
        return suggestions;
    }

    /**
     * Get staff workload for date
     */
    getStaffWorkloadForDate(staffId, date) {
        const isoDate = DateUtils.toISODate(date);
        let total = 0;
        
        // Count phone shifts
        const phoneData = this.app.state.phoneRoster[isoDate];
        if (phoneData) {
            if (phoneData.early.includes(staffId)) total += 0.5;
            if (phoneData.late.includes(staffId)) total += 0.5;
        }
        
        // Count task assignments
        const allocations = this.app.state.allocations[isoDate] || {};
        Object.values(allocations).forEach(allocation => {
            if (allocation.assignments && allocation.assignments.includes(staffId)) {
                total += 1;
            }
        });
        
        // Count triage assignments
        const triageAssignments = this.app.state.triageAssignments[isoDate] || {};
        Object.values(triageAssignments).forEach(assignment => {
            if (assignment.assignments && assignment.assignments.includes(staffId)) {
                total += 0.5;
            }
        });
        
        return {
            total,
            low: total <= 2,
            medium: total > 2 && total <= 4,
            high: total > 4
        };
    }

    /**
     * Validate assignments for fairness and conflicts
     */
    validateWeekAssignments() {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        const issues = [];

        // Check phone shift fairness
        const phoneAssignments = { early: new Set(), late: new Set() };
        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.app.state.phoneRoster[isoDate];
            
            if (phoneData) {
                phoneData.early.forEach(staffId => phoneAssignments.early.add(staffId));
                phoneData.late.forEach(staffId => phoneAssignments.late.add(staffId));
            }
        });

        // Check for staff doing both shifts
        const bothShifts = [...phoneAssignments.early].filter(id => phoneAssignments.late.has(id));
        if (bothShifts.length > 0) {
            issues.push({
                type: 'fairness',
                severity: 'high',
                description: `${bothShifts.length} staff assigned to both early and late shifts`,
                affectedStaff: bothShifts
            });
        }

        // Check workload balance
        const workloadAnalysis = this.app.conflictManager.analyzeWorkloadBalance();
        if (workloadAnalysis.fairnessScore < 70) {
            issues.push({
                type: 'workload',
                severity: 'medium',
                description: `Poor workload distribution (fairness score: ${workloadAnalysis.fairnessScore})`,
                recommendation: 'Consider redistributing assignments'
            });
        }

        return issues;
    }

    /**
     * Auto-fix common assignment issues
     */
    autoFixAssignmentIssues() {
        const issues = this.validateWeekAssignments();
        let fixedCount = 0;

        issues.forEach(issue => {
            switch (issue.type) {
                case 'fairness':
                    if (this.fixFairnessIssues(issue)) fixedCount++;
                    break;
                case 'workload':
                    if (this.fixWorkloadIssues(issue)) fixedCount++;
                    break;
            }
        });

        if (fixedCount > 0) {
            this.app.debouncedConflictCheck();
            this.app.debouncedWorkloadAnalysis();
            this.app.debouncedSave();
            this.app.uiManager.render();
            
            NotificationManager.show(`Auto-fixed ${fixedCount} assignment issues`, 'success');
        } else if (issues.length > 0) {
            NotificationManager.show('No automatic fixes available for current issues', 'info');
        } else {
            NotificationManager.show('No assignment issues found', 'success');
        }

        return fixedCount;
    }

    /**
     * Fix fairness issues (staff doing both shifts)
     */
    fixFairnessIssues(issue) {
        if (!issue.affectedStaff || issue.affectedStaff.length === 0) return false;

        const week = DateUtils.getWeek(this.app.state.currentDate);
        let fixed = false;

        issue.affectedStaff.forEach(staffId => {
            // Remove from late shifts (keep early shift preference)
            week.forEach(date => {
                const isoDate = DateUtils.toISODate(date);
                const phoneData = this.app.state.phoneRoster[isoDate];
                
                if (phoneData && phoneData.late.includes(staffId)) {
                    phoneData.late = phoneData.late.filter(id => id !== staffId);
                    fixed = true;
                }
            });
        });

        return fixed;
    }

    /**
     * Fix workload issues by redistributing assignments
     */
    fixWorkloadIssues(issue) {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        let fixed = false;

        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;

            const isoDate = DateUtils.toISODate(date);
            const allocations = this.app.state.allocations[isoDate] || {};
            
            // Find overloaded and underloaded staff
            const staffWorkloads = this.app.state.staff.map(staff => ({
                id: staff.id,
                workload: this.getStaffWorkloadForDate(staff.id, date)
            }));

            const overloaded = staffWorkloads.filter(s => s.workload.total > 4);
            const underloaded = staffWorkloads.filter(s => s.workload.total <= 2);

            // Redistribute tasks from overloaded to underloaded
            overloaded.forEach(overloadedStaff => {
                const assignedTasks = Object.entries(allocations).filter(([taskId, allocation]) => 
                    allocation.assignments && allocation.assignments.includes(overloadedStaff.id)
                );

                // Move some tasks to underloaded staff
                const tasksToMove = assignedTasks.slice(0, Math.floor(assignedTasks.length / 2));
                
                tasksToMove.forEach(([taskId, allocation]) => {
                    const eligibleUnderloaded = underloaded.filter(staff => {
                        const dayName = DateUtils.getDayName(date);
                        const staffMember = this.app.getStaffById(staff.id);
                        return staffMember && 
                               staffMember.workDays.includes(dayName) &&
                               this.app.skillsManager.canStaffDoTask(staff.id, taskId) &&
                               !this.app.assignmentGenerator.getStaffLeave(staff.id, date);
                    });

                    if (eligibleUnderloaded.length > 0) {
                        // Remove from overloaded staff and assign to underloaded
                        allocation.assignments = allocation.assignments.filter(id => id !== overloadedStaff.id);
                        allocation.assignments.push(eligibleUnderloaded[0].id);
                        fixed = true;
                    }
                });
            });
        });

        return fixed;
    }

    /**
     * Generate assignment optimization report
     */
    generateOptimizationReport() {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        const report = {
            period: `Week of ${DateUtils.formatDate(week[0])}`,
            generatedAt: new Date().toISOString(),
            workloadAnalysis: this.app.conflictManager.analyzeWorkloadBalance(),
            conflicts: this.app.conflictManager.getConflictSummary(),
            suggestions: Object.keys(this.app.state.assignmentSuggestions).length,
            fairnessMetrics: this.calculateFairnessMetrics(week),
            recommendations: this.generateRecommendations(week)
        };

        return report;
    }

    /**
     * Calculate fairness metrics
     */
    calculateFairnessMetrics(week) {
        const phoneAssignments = { early: new Set(), late: new Set() };
        const taskCounts = {};
        
        this.app.state.staff.forEach(staff => {
            taskCounts[staff.id] = 0;
        });

        week.forEach(date => {
            if (!DateUtils.isWorkingDay(date)) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.app.state.phoneRoster[isoDate];
            const allocations = this.app.state.allocations[isoDate] || {};
            
            // Count phone assignments
            if (phoneData) {
                phoneData.early.forEach(staffId => phoneAssignments.early.add(staffId));
                phoneData.late.forEach(staffId => phoneAssignments.late.add(staffId));
            }
            
            // Count task assignments
            Object.values(allocations).forEach(allocation => {
                if (allocation.assignments) {
                    allocation.assignments.forEach(staffId => {
                        if (taskCounts[staffId] !== undefined) {
                            taskCounts[staffId]++;
                        }
                    });
                }
            });
        });

        const taskCountValues = Object.values(taskCounts);
        const avgTasks = taskCountValues.reduce((sum, count) => sum + count, 0) / taskCountValues.length;
        const maxTasks = Math.max(...taskCountValues);
        const minTasks = Math.min(...taskCountValues);

        return {
            phoneShiftDistribution: {
                earlyShifts: phoneAssignments.early.size,
                lateShifts: phoneAssignments.late.size,
                bothShifts: [...phoneAssignments.early].filter(id => phoneAssignments.late.has(id)).length
            },
            taskDistribution: {
                average: Math.round(avgTasks * 100) / 100,
                minimum: minTasks,
                maximum: maxTasks,
                spread: maxTasks - minTasks
            },
            fairnessScore: this.app.state.workloadAnalytics.fairnessScore || 0
        };
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(week) {
        const recommendations = [];
        const conflicts = this.app.assignmentGenerator.getConflicts();
        const fairnessMetrics = this.calculateFairnessMetrics(week);

        // Phone shift recommendations
        if (fairnessMetrics.phoneShiftDistribution.bothShifts > 0) {
            recommendations.push({
                type: 'fairness',
                priority: 'high',
                title: 'Fix Phone Shift Distribution',
                description: `${fairnessMetrics.phoneShiftDistribution.bothShifts} staff assigned to both early and late shifts`
            });
        }

        // Workload recommendations
        if (fairnessMetrics.taskDistribution.spread > 3) {
            recommendations.push({
                type: 'workload',
                priority: 'medium',
                title: 'Balance Task Distribution',
                description: `Large workload variation (${fairnessMetrics.taskDistribution.spread} tasks difference between busiest and least busy staff)`
            });
        }

        // Conflict recommendations
        if (conflicts.size > 0) {
            recommendations.push({
                type: 'conflicts',
                priority: 'high',
                title: 'Resolve Assignment Conflicts',
                description: `${conflicts.size} conflicts detected that need attention`
            });
        }

        // Overall fairness recommendation
        if (fairnessMetrics.fairnessScore < 70) {
            recommendations.push({
                type: 'optimization',
                priority: 'medium',
                title: 'Improve Assignment Fairness',
                description: `Current fairness score: ${fairnessMetrics.fairnessScore}/100. Consider regenerating assignments.`
            });
        }

        return recommendations;
    }
}