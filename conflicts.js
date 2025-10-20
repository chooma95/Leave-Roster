import { DateUtils } from './utils.js';
import { NotificationManager } from './ui.js';

export class ConflictManager {
    constructor(app) {
        this.app = app;
    }

    /**
     * Toggle conflict mode for enhanced conflict visualization
     */
    toggleConflictMode() {
        this.app.state.conflictMode = !this.app.state.conflictMode;
        this.app.uiManager.render();
        NotificationManager.show(
            `Conflict mode ${this.app.state.conflictMode ? 'enabled' : 'disabled'}`, 
            'info'
        );
    }

    /**
     * Check and display conflicts across the current week
     */
    checkAndDisplayConflicts() {
        if (!this.app.state.initialized) return;
        
        const week = DateUtils.getWeek(this.app.state.currentDate);
        const conflicts = this.app.assignmentGenerator.getConflicts();
        
        // Update UI elements with conflict indicators
        if (conflicts.size > 0) {
            console.warn(`⚠️ Found ${conflicts.size} conflicts in current view`);
            // This would be used by the UI to show conflict indicators
            this.app.uiManager.updateConflictDisplay?.(conflicts);
        }
        
        return conflicts;
    }

    /**
     * Analyze workload balance for the current week
     */
    analyzeWorkloadBalance() {
        if (!this.app.state.initialized) return;
        
        const week = DateUtils.getWeek(this.app.state.currentDate);
        const workloadReport = this.app.assignmentGenerator.getWorkloadBalanceReport(week);
        
        this.app.state.workloadAnalytics = {
            lastUpdated: new Date().toISOString(),
            report: workloadReport,
            fairnessScore: this.calculateFairnessScore(workloadReport)
        };
        
        // Log workload insights
        if (Object.keys(workloadReport).length > 0) {
            console.log('📊 Workload Analysis:', workloadReport);
        }
        
        return this.app.state.workloadAnalytics;
    }

    /**
     * Calculate fairness score based on workload distribution
     */
    calculateFairnessScore(workloadReport) {
        const entries = Object.values(workloadReport);
        if (entries.length === 0) return 100;
        
        const totalLoads = entries.map(entry => (entry.phone || 0) + (entry.tasks || 0));
        const mean = totalLoads.reduce((sum, load) => sum + load, 0) / totalLoads.length;
        const variance = totalLoads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / totalLoads.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Convert to 0-100 scale (lower std dev = higher fairness)
        const fairnessScore = Math.max(0, 100 - (standardDeviation * 20));
        return Math.round(fairnessScore);
    }

    /**
     * Show conflict resolution modal for a specific conflict
     */
    showConflictResolutionModal(conflictKey) {
        const conflicts = this.app.assignmentGenerator.getConflicts();
        const conflict = conflicts.get(conflictKey);
        
        if (!conflict) {
            NotificationManager.show('Conflict not found', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-medium">
                <div class="modal-header">
                    <h2>Resolve Conflict</h2>
                    <button class="btn btn-icon close-modal">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="conflict-details">
                        <div class="conflict-type">
                            <span class="material-icons">${this.getConflictIcon(conflict.type)}</span>
                            <span class="conflict-title">${this.getConflictTitle(conflict.type)}</span>
                        </div>
                        <div class="conflict-description">
                            ${this.getConflictDescription(conflict)}
                        </div>
                    </div>
                    
                    <div class="resolution-options">
                        <h3>Resolution Options</h3>
                        ${this.getResolutionOptions(conflict).map((option, index) => `
                            <div class="resolution-option">
                                <button class="btn btn-outline resolution-btn" data-action="${option.action}" data-params="${JSON.stringify(option.params)}">
                                    ${option.title}
                                </button>
                                <p class="resolution-description">${option.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost close-modal">Cancel</button>
                    <button class="btn btn-secondary ignore-conflict">Ignore for Now</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle resolution actions
        modal.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const params = JSON.parse(btn.dataset.params);
                this.executeResolution(action, params, conflict);
                modal.remove();
            });
        });

        // Handle ignore conflict
        modal.querySelector('.ignore-conflict').addEventListener('click', () => {
            this.ignoreConflict(conflictKey);
            modal.remove();
        });

        // Close handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    /**
     * Get appropriate icon for conflict type
     */
    getConflictIcon(type) {
        switch (type) {
            case 'understaffed': return 'group_remove';
            case 'both_shifts': return 'schedule_conflict';
            case 'skill_shortage': return 'psychology_alt';
            case 'overloaded': return 'work_outline';
            default: return 'warning';
        }
    }

    /**
     * Get human-readable title for conflict type
     */
    getConflictTitle(type) {
        switch (type) {
            case 'understaffed': return 'Understaffed Shift';
            case 'both_shifts': return 'Double Shift Assignment';
            case 'skill_shortage': return 'Skill Level Shortage';
            case 'overloaded': return 'Staff Overloaded';
            default: return 'Assignment Conflict';
        }
    }

    /**
     * Get detailed description for conflict
     */
    getConflictDescription(conflict) {
        switch (conflict.type) {
            case 'understaffed':
                return `${conflict.shift || 'Shift'} on ${DateUtils.formatDate(new Date(conflict.date))} has only ${conflict.assigned} staff assigned (needs ${conflict.needed}).`;
            case 'both_shifts':
                return `${conflict.staffName} is assigned to both early and late shifts in the same week, violating fair distribution rules.`;
            case 'skill_shortage':
                return `Task requires skill level ${conflict.requiredSkill} but only staff with skill level ${conflict.availableSkill} are assigned.`;
            case 'overloaded':
                return `${conflict.staffName} has ${conflict.workload} assignments on ${DateUtils.formatDate(new Date(conflict.date))}, exceeding recommended maximum.`;
            default:
                return 'An assignment conflict has been detected that requires attention.';
        }
    }

    /**
     * Get resolution options for conflict
     */
    getResolutionOptions(conflict) {
        const options = [];

        switch (conflict.type) {
            case 'understaffed':
                options.push({
                    action: 'reassign_available',
                    params: { date: conflict.date, shift: conflict.shift },
                    title: 'Find Available Staff',
                    description: 'Automatically search for and assign available staff members'
                });
                options.push({
                    action: 'regenerate_week',
                    params: { date: conflict.date },
                    title: 'Regenerate Week',
                    description: 'Regenerate all assignments for this week with current constraints'
                });
                break;

            case 'both_shifts':
                options.push({
                    action: 'remove_duplicate',
                    params: { staffId: conflict.staffId },
                    title: 'Remove Duplicate Assignment',
                    description: 'Remove one of the conflicting assignments automatically'
                });
                options.push({
                    action: 'redistribute_week',
                    params: { staffId: conflict.staffId },
                    title: 'Redistribute Week',
                    description: 'Redistribute all phone shifts for the week fairly'
                });
                break;

            case 'skill_shortage':
                options.push({
                    action: 'find_skilled_staff',
                    params: { taskId: conflict.taskId, date: conflict.date },
                    title: 'Find Skilled Staff',
                    description: 'Search for staff with appropriate skill levels'
                });
                break;

            case 'overloaded':
                options.push({
                    action: 'redistribute_tasks',
                    params: { staffId: conflict.staffId, date: conflict.date },
                    title: 'Redistribute Tasks',
                    description: 'Move some tasks to less busy staff members'
                });
                break;
        }

        // Common option for all conflicts
        options.push({
            action: 'manual_review',
            params: { conflict: conflict },
            title: 'Manual Review',
            description: 'Mark for manual review and resolution'
        });

        return options;
    }

    /**
     * Execute a resolution action
     */
    executeResolution(action, params, conflict) {
        console.log(`🔧 Executing resolution: ${action}`, params);

        switch (action) {
            case 'reassign_available':
                this.reassignAvailableStaff(params.date, params.shift);
                break;

            case 'regenerate_week':
                this.regenerateWeek(params.date);
                break;

            case 'remove_duplicate':
                this.removeDuplicateAssignment(params.staffId);
                break;

            case 'redistribute_week':
                this.redistributeWeek(params.staffId);
                break;

            case 'find_skilled_staff':
                this.findSkilledStaff(params.taskId, params.date);
                break;

            case 'redistribute_tasks':
                this.redistributeTasks(params.staffId, params.date);
                break;

            case 'manual_review':
                this.markForManualReview(params.conflict);
                break;

            default:
                NotificationManager.show('Unknown resolution action', 'error');
                return;
        }

        // Refresh conflicts and UI
        this.app.debouncedConflictCheck();
        this.app.debouncedWorkloadAnalysis();
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        NotificationManager.show('Conflict resolution applied', 'success');
    }

    /**
     * Reassign available staff to understaffed shift
     */
    reassignAvailableStaff(date, shift) {
        const isoDate = DateUtils.toISODate(new Date(date));
        const dayName = DateUtils.getDayName(new Date(date));
        const weekNumber = DateUtils.getWeekNumber(new Date(date));

        // Find available staff for this shift
        const availableStaff = this.app.state.staff.filter(s => {
            if (!s.workDays.includes(dayName)) return false;
            if (this.app.assignmentGenerator.getStaffLeave(s.id, new Date(date))) return false;
            
            const rotationStatus = this.app.rotationManager.getStaffRotationStatus(s.id, weekNumber);
            const canDoShift = shift === 'early' ? rotationStatus.canDoEarly : rotationStatus.canDoLate;
            
            // Check if already assigned to this shift
            const currentAssignments = this.app.state.phoneRoster[isoDate];
            if (currentAssignments && currentAssignments[shift] && currentAssignments[shift].includes(s.id)) {
                return false;
            }
            
            return canDoShift;
        });

        if (availableStaff.length > 0) {
            // Add staff to fill the gap
            if (!this.app.state.phoneRoster[isoDate]) {
                this.app.state.phoneRoster[isoDate] = { early: [], late: [] };
            }
            
            const currentCount = this.app.state.phoneRoster[isoDate][shift].length;
            const needed = Math.min(2 - currentCount, availableStaff.length);
            
            for (let i = 0; i < needed; i++) {
                this.app.state.phoneRoster[isoDate][shift].push(availableStaff[i].id);
            }
        }
    }

    /**
     * Regenerate entire week assignments
     */
    regenerateWeek(date) {
        const week = DateUtils.getWeek(new Date(date));
        this.app.assignmentManager.generateSmartAssignmentsForWeek();
    }

    /**
     * Remove duplicate assignment (staff doing both shifts)
     */
    removeDuplicateAssignment(staffId) {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        
        // Count assignments and remove the later one
        const assignments = { early: [], late: [] };
        
        week.forEach(date => {
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.app.state.phoneRoster[isoDate];
            
            if (phoneData) {
                if (phoneData.early.includes(staffId)) {
                    assignments.early.push({ date: isoDate, index: phoneData.early.indexOf(staffId) });
                }
                if (phoneData.late.includes(staffId)) {
                    assignments.late.push({ date: isoDate, index: phoneData.late.indexOf(staffId) });
                }
            }
        });
        
        // Remove the second assignment (late shift preference)
        if (assignments.early.length > 0 && assignments.late.length > 0) {
            const lateAssignment = assignments.late[0];
            const phoneData = this.app.state.phoneRoster[lateAssignment.date];
            phoneData.late.splice(lateAssignment.index, 1);
        }
    }

    /**
     * Redistribute phone shifts for the week
     */
    redistributeWeek(staffId) {
        const week = DateUtils.getWeek(this.app.state.currentDate);
        this.app.assignmentGenerator.generateWeeklyPhoneRoster(week, this.app.rotationManager);
    }

    /**
     * Find skilled staff for task assignment
     */
    findSkilledStaff(taskId, date) {
        const task = this.app.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        const eligibleStaff = this.app.skillsManager.getEligibleStaffForTask(taskId);
        const dayName = DateUtils.getDayName(new Date(date));
        
        const availableStaff = eligibleStaff.filter(s => 
            s.workDays.includes(dayName) && 
            !this.app.assignmentGenerator.getStaffLeave(s.id, new Date(date))
        );

        if (availableStaff.length > 0) {
            // Assign best skilled staff
            const bestStaff = availableStaff.sort((a, b) => {
                const aSkill = this.app.skillsManager.getStaffTaskSkill(a.id, taskId);
                const bSkill = this.app.skillsManager.getStaffTaskSkill(b.id, taskId);
                return bSkill - aSkill;
            });

            const assignmentCount = task.skillLevel >= 3 ? Math.min(2, bestStaff.length) : 1;
            const selectedStaff = bestStaff.slice(0, assignmentCount).map(s => s.id);
            
            this.app.assignmentGenerator.assignStaffToTask(taskId, selectedStaff, new Date(date));
        }
    }

    /**
     * Redistribute tasks to balance workload
     */
    redistributeTasks(staffId, date) {
        const isoDate = DateUtils.toISODate(new Date(date));
        const allocations = this.app.state.allocations[isoDate] || {};
        const dayName = DateUtils.getDayName(new Date(date));
        
        // Find tasks assigned to overloaded staff
        const overloadedTasks = [];
        Object.entries(allocations).forEach(([taskId, allocation]) => {
            if (allocation.assignments && allocation.assignments.includes(staffId)) {
                overloadedTasks.push(taskId);
            }
        });
        
        // Redistribute some tasks
        const tasksToRedistribute = overloadedTasks.slice(Math.floor(overloadedTasks.length / 2));
        
        tasksToRedistribute.forEach(taskId => {
            const eligibleStaff = this.app.skillsManager.getEligibleStaffForTask(taskId)
                .filter(s => 
                    s.workDays.includes(dayName) && 
                    !this.app.assignmentGenerator.getStaffLeave(s.id, new Date(date)) &&
                    s.id !== staffId
                );
            
            if (eligibleStaff.length > 0) {
                // Find least busy staff
                const workloads = eligibleStaff.map(s => ({
                    staff: s,
                    workload: this.getStaffWorkloadForDate(s.id, new Date(date))
                })).sort((a, b) => a.workload.total - b.workload.total);
                
                // Reassign to least busy staff
                const newAssignment = [workloads[0].staff.id];
                this.app.assignmentGenerator.assignStaffToTask(taskId, newAssignment, new Date(date));
            }
        });
    }

    /**
     * Mark conflict for manual review
     */
    markForManualReview(conflict) {
        // Add to manual review list (could be stored in state)
        if (!this.app.state.manualReviewQueue) {
            this.app.state.manualReviewQueue = [];
        }
        
        this.app.state.manualReviewQueue.push({
            conflict: conflict,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });
        
        NotificationManager.show('Conflict marked for manual review', 'info');
    }

    /**
     * Ignore conflict temporarily
     */
    ignoreConflict(conflictKey) {
        // Add to ignored conflicts list
        if (!this.app.state.ignoredConflicts) {
            this.app.state.ignoredConflicts = new Set();
        }
        
        this.app.state.ignoredConflicts.add(conflictKey);
        NotificationManager.show('Conflict ignored', 'info');
    }

    /**
     * Get staff workload for date (helper method)
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
     * Get conflict summary for dashboard
     */
    getConflictSummary() {
        const conflicts = this.app.assignmentGenerator.getConflicts();
        const summary = {
            total: conflicts.size,
            byType: {},
            bySeverity: { high: 0, medium: 0, low: 0 }
        };
        
        conflicts.forEach(conflict => {
            // Count by type
            if (!summary.byType[conflict.type]) {
                summary.byType[conflict.type] = 0;
            }
            summary.byType[conflict.type]++;
            
            // Count by severity
            const severity = this.getConflictSeverity(conflict);
            summary.bySeverity[severity]++;
        });
        
        return summary;
    }

    /**
     * Get conflict severity
     */
    getConflictSeverity(conflict) {
        switch (conflict.type) {
            case 'understaffed':
                return conflict.assigned === 0 ? 'high' : 'medium';
            case 'both_shifts':
                return 'high';
            case 'skill_shortage':
                return 'medium';
            case 'overloaded':
                return conflict.workload > 6 ? 'high' : 'medium';
            default:
                return 'low';
        }
    }
}