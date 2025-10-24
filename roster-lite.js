// ===== PHONE SHIFT ROSTER LITE - JAVASCRIPT =====
// Simplified 6-week phone shift roster generator
// Focus: Early/Late shift assignment with constraints

// State
let staff = [];
let roster = {};
let rosterPeriods = []; // Track historical periods for fairness
let currentPeriod = null; // { startDate, endDate, weeks, roster }

// Constants
const WORK_DAYS = ['tuesday', 'wednesday', 'thursday', 'friday', 'monday']; // Week runs Tue-Mon
const SHIFTS = ['early', 'late'];
const DAY_NAMES = {
    tuesday: 'Tue',
    wednesday: 'Wed', 
    thursday: 'Thu',
    friday: 'Fri',
    monday: 'Mon'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderStaffList();
    updateStats();
    setDefaultPeriod();
    renderPreviousPeriods();
});

// Set default period (current month)
function setDefaultPeriod() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    document.getElementById('period-month').value = `${year}-${month}`;
    updateMonthPeriod();
}

// Update period based on selected month
function updateMonthPeriod() {
    const monthInput = document.getElementById('period-month');
    if (!monthInput.value) return;
    
    const [year, month] = monthInput.value.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    // Find first Tuesday of the month
    const firstTuesday = getFirstTuesday(monthDate);
    
    // Count all Tuesday-Monday weeks that include days from this month
    // A week belongs to a month if Tuesday is in that month
    let weeks = 0;
    let currentTuesday = new Date(firstTuesday);
    const selectedMonth = monthDate.getMonth();
    
    // Keep counting weeks while Tuesday is in the selected month
    while (currentTuesday.getMonth() === selectedMonth) {
        weeks++;
        currentTuesday.setDate(currentTuesday.getDate() + 7);
    }
    
    // If the last week's Monday falls in the next month, that's fine - 
    // we include it because its Tuesday was in our month
    
    // Set the values
    document.getElementById('period-start').value = firstTuesday.toISOString().split('T')[0];
    document.getElementById('period-weeks').value = weeks;
    updatePeriodEnd();
}

// Get first Tuesday of a month
function getFirstTuesday(date) {
    const result = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 2 = Tuesday
    const daysUntilTuesday = dayOfWeek <= 2 ? (2 - dayOfWeek) : (9 - dayOfWeek);
    result.setDate(result.getDate() + daysUntilTuesday);
    return result;
}

// Get next Tuesday from a given date (kept for compatibility)
function getNextTuesday(date) {
    const result = new Date(date);
    const dayOfWeek = result.getDay(); // 0 = Sunday, 2 = Tuesday
    const daysUntilTuesday = dayOfWeek === 2 ? 0 : (2 - dayOfWeek + 7) % 7;
    result.setDate(result.getDate() + daysUntilTuesday);
    return result;
}

// Update period end date based on start date and weeks
function updatePeriodEnd() {
    const startInput = document.getElementById('period-start');
    const weeksInput = document.getElementById('period-weeks');
    const endInput = document.getElementById('period-end');
    
    if (!startInput.value || !weeksInput.value) return;
    
    const startDate = new Date(startInput.value + 'T00:00:00');
    const weeks = parseInt(weeksInput.value);
    
    // Calculate end date (Monday of the last week)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7) - 1); // -1 because week ends on Monday
    
    endInput.value = endDate.toISOString().split('T')[0];
    
    // Update stats
    document.getElementById('stat-weeks').textContent = weeks;
    document.getElementById('stat-shifts').textContent = weeks * 2 * WORK_DAYS.length; // 2 shifts per day
}

// Get cumulative staff stats from all previous periods
function getCumulativeStats() {
    const cumulativeStats = {};
    
    // Initialize stats for all current staff
    staff.forEach(s => {
        cumulativeStats[s.id] = {
            name: s.name,
            earlyCount: 0,
            lateCount: 0,
            totalShifts: 0,
            assignedDays: {}
        };
    });
    
    // Add up stats from all previous periods
    rosterPeriods.forEach(period => {
        if (period.roster) {
            Object.keys(period.roster).forEach(week => {
                WORK_DAYS.forEach(day => {
                    const shifts = period.roster[week][day];
                    if (shifts) {
                        // Count early shifts
                        [0, 1].forEach(i => {
                            const staffId = shifts.early?.[i];
                            if (staffId && cumulativeStats[staffId]) {
                                cumulativeStats[staffId].earlyCount++;
                                cumulativeStats[staffId].totalShifts++;
                            }
                        });
                        
                        // Count late shifts
                        [0, 1].forEach(i => {
                            const staffId = shifts.late?.[i];
                            if (staffId && cumulativeStats[staffId]) {
                                cumulativeStats[staffId].lateCount++;
                                cumulativeStats[staffId].totalShifts++;
                            }
                        });
                    }
                });
            });
        }
    });
    
    return cumulativeStats;
}

// Render previous periods
function renderPreviousPeriods() {
    const container = document.getElementById('previous-periods');
    const list = document.getElementById('previous-periods-list');
    
    if (rosterPeriods.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    list.innerHTML = rosterPeriods.map((period, index) => {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        return `
            <span class="period-badge" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                <span class="material-icons" style="font-size: 1rem;">history</span>
                ${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - 
                ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                (${period.weeks}w)
                <button onclick="viewPeriod(${index})" class="icon-btn" title="View Roster" style="padding: 0.125rem; margin-left: 0.25rem;">
                    <span class="material-icons" style="font-size: 1rem;">visibility</span>
                </button>
                <button onclick="deletePeriod(${index})" class="icon-btn" title="Delete Period" style="padding: 0.125rem; color: var(--red-600);">
                    <span class="material-icons" style="font-size: 1rem;">delete</span>
                </button>
            </span>
        `;
    }).join('');
}

// View a previous period's roster
function viewPeriod(index) {
    const period = rosterPeriods[index];
    if (!period) return;
    
    const modal = document.getElementById('period-view-modal');
    const title = document.getElementById('period-view-title');
    const content = document.getElementById('period-view-content');
    
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    title.textContent = `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })} (${period.weeks} weeks)`;
    
    // Build the roster table HTML
    let html = '<div style="overflow-x: auto;"><table class="roster-table" style="width: 100%; min-width: 600px;">';
    
    // Header
    html += '<thead><tr><th style="width: 80px;">Week</th>';
    WORK_DAYS.forEach(day => {
        html += `<th style="text-transform: capitalize;">${day}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Rows
    for (let week = 1; week <= period.weeks; week++) {
        html += `<tr><td class="week-cell">Week ${week}</td>`;
        
        WORK_DAYS.forEach(day => {
            const dayData = period.roster[week][day];
            const earlyStaff = dayData.early.map(id => staff.find(s => s.id === id)?.name || 'Unknown').filter(n => n !== 'Unknown');
            const lateStaff = dayData.late.map(id => staff.find(s => s.id === id)?.name || 'Unknown').filter(n => n !== 'Unknown');
            
            html += '<td class="day-cell">';
            if (earlyStaff.length > 0) {
                html += `<div class="shift-group"><span class="shift-label-early">Early:</span><span class="shift-names">${earlyStaff.join(', ')}</span></div>`;
            }
            if (lateStaff.length > 0) {
                html += `<div class="shift-group"><span class="shift-label-late">Late:</span><span class="shift-names">${lateStaff.join(', ')}</span></div>`;
            }
            if (earlyStaff.length === 0 && lateStaff.length === 0) {
                html += '<span style="color: var(--gray-400); font-style: italic;">No shifts</span>';
            }
            html += '</td>';
        });
        
        html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    
    // Add statistics
    html += '<div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid var(--gray-200);">';
    html += '<h4 style="margin-bottom: 0.75rem; color: var(--gray-900);">Period Statistics:</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">';
    
    Object.entries(period.stats).forEach(([staffId, stats]) => {
        const staffMember = staff.find(s => s.id === parseInt(staffId));
        if (staffMember) {
            html += `
                <div style="padding: 0.5rem; background: var(--gray-50); border-radius: 0.375rem; border: 1px solid var(--gray-200);">
                    <div style="font-weight: 600; color: var(--gray-900); margin-bottom: 0.25rem;">${staffMember.name}</div>
                    <div style="font-size: 0.875rem; color: var(--gray-600);">
                        <div>Early: ${stats.earlyCount} | Late: ${stats.lateCount}</div>
                        <div>Total: ${stats.totalShifts} shifts</div>
                        ${stats.weekOff ? `<div style="color: var(--blue-600);">Week off: ${stats.weekOff}</div>` : ''}
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div></div>';
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

// Delete a previous period
function deletePeriod(index) {
    const period = rosterPeriods[index];
    if (!period) return;
    
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    const dateStr = `${startDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    
    if (confirm(`Are you sure you want to delete the period:\n${dateStr} (${period.weeks} weeks)?\n\nThis will remove the period from history but won't affect cumulative fairness calculations for remaining periods.`)) {
        rosterPeriods.splice(index, 1);
        saveState();
        renderPreviousPeriods();
        
        // Show confirmation
        const list = document.getElementById('previous-periods-list');
        const notice = document.createElement('div');
        notice.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--green-500); color: white; padding: 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000;';
        notice.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 0.5rem;">check_circle</span>Period deleted successfully';
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 3000);
    }
}

// Close period view modal
function closePeriodViewModal() {
    document.getElementById('period-view-modal').style.display = 'none';
}

// Toggle schedule type
function toggleScheduleType() {
    const scheduleType = document.getElementById('schedule-type').value;
    const fixedDiv = document.getElementById('fixed-schedule');
    const alternatingDiv = document.getElementById('alternating-schedule');
    
    if (scheduleType === 'alternating') {
        fixedDiv.style.display = 'none';
        alternatingDiv.style.display = 'grid';
    } else {
        fixedDiv.style.display = 'grid';
        alternatingDiv.style.display = 'none';
    }
}

// Add staff member
function addStaff() {
    const nameInput = document.getElementById('staff-name');
    const scheduleType = document.getElementById('schedule-type').value;
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('Please enter a staff name', 'warning');
        return;
    }
    
    // Get work days based on schedule type
    let workDays = [];
    let week1Days = [];
    let week2Days = [];
    
    if (scheduleType === 'alternating') {
        // Get week1 days
        document.querySelectorAll('.week1-checkbox:checked').forEach(cb => {
            week1Days.push(cb.value);
        });
        
        // Get week2 days
        document.querySelectorAll('.week2-checkbox:checked').forEach(cb => {
            week2Days.push(cb.value);
        });
        
        if (week1Days.length === 0 && week2Days.length === 0) {
            showNotification('Please select at least one work day in Week 1 or Week 2', 'warning');
            return;
        }
    } else {
        // Get fixed schedule days
        const workDayCheckboxes = document.querySelectorAll('.work-day-checkbox:checked');
        workDays = Array.from(workDayCheckboxes).map(cb => cb.value);
        
        if (workDays.length === 0) {
            showNotification('Please select at least one work day', 'warning');
            return;
        }
    }
    
    const staffMember = {
        id: generateId(),
        name: name,
        scheduleType: scheduleType,
        workDays: workDays, // For fixed schedules
        week1Days: week1Days, // For alternating schedules
        week2Days: week2Days, // For alternating schedules
        weekOff: null, // Will be auto-assigned
        status: 'active', // active, leave, inactive
        leaveStart: null,
        leaveEnd: null,
        leaveReason: null,
        inactiveDate: null
    };

    staff.push(staffMember);

    // Clear form
    nameInput.value = '';
    document.querySelectorAll('.work-day-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.week1-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.week2-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('schedule-type').value = 'fixed';
    toggleScheduleType();

    saveState();
    renderStaffList();
    updateStats();
    showNotification(`Added ${name}`, 'success');
}

// Remove staff member
function removeStaff(id) {
    staff = staff.filter(s => s.id !== id);
    saveState();
    renderStaffList();
    updateStats();
    showNotification('Staff member removed', 'success');
}

// Render staff list
function renderStaffList() {
    const listDiv = document.getElementById('staff-list');
    
    if (staff.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: var(--gray-600); padding: 2rem;">No staff added yet</p>';
        updateStats();
        return;
    }

    listDiv.innerHTML = staff.map(s => {
        // Get status badge
        let statusIcon = 'check_circle';
        let statusClass = 'active';
        let statusText = 'Active';
        
        if (s.status === 'leave') {
            statusIcon = 'beach_access';
            statusClass = 'leave';
            statusText = 'On Leave';
            if (s.leaveStart && s.leaveEnd) {
                const start = new Date(s.leaveStart).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
                const end = new Date(s.leaveEnd).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
                statusText += ` (${start} - ${end})`;
            }
        } else if (s.status === 'inactive') {
            statusIcon = 'person_off';
            statusClass = 'inactive';
            statusText = 'Inactive';
            if (s.inactiveDate) {
                const date = new Date(s.inactiveDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
                statusText += ` (${date})`;
            }
        }
        
        // Get schedule badge
        let scheduleBadge = '';
        if (s.scheduleType === 'alternating') {
            scheduleBadge = '<span class="schedule-badge alternating">Alternating</span>';
        } else {
            scheduleBadge = '<span class="schedule-badge">Fixed</span>';
        }
        
        // Get work days display
        let workDaysHtml = '';
        if (s.scheduleType === 'alternating') {
            const week1 = s.week1Days.map(day => `<span class="day-badge">${day.substring(0, 3)}</span>`).join('');
            const week2 = s.week2Days.map(day => `<span class="day-badge">${day.substring(0, 3)}</span>`).join('');
            workDaysHtml = `
                <div style="font-size: 0.75rem; color: var(--gray-600);">W1: ${week1 || '<span style="color: var(--gray-500);">None</span>'}</div>
                <div style="font-size: 0.75rem; color: var(--gray-600);">W2: ${week2 || '<span style="color: var(--gray-500);">None</span>'}</div>
            `;
        } else {
            workDaysHtml = s.workDays.map(day => `<span class="day-badge">${day.substring(0, 3)}</span>`).join('');
        }
        
        // Show auto-assigned week off
        let weekOffBadge = '';
        if (s.weekOff) {
            weekOffBadge = `<span class="week-off-badge">Week ${s.weekOff} Off</span>`;
        } else {
            weekOffBadge = '<span style="color: var(--gray-600); font-size: 0.875rem;">Auto-assigned</span>';
        }
        
        return `
            <div class="staff-item" onclick="editStaff('${s.id}')" style="opacity: ${s.status === 'inactive' ? '0.6' : '1'};">
                <div>
                    <div class="staff-name">${s.name}</div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                        <span class="status-badge ${statusClass}">
                            <span class="material-icons" style="font-size: 1rem;">${statusIcon}</span>
                            ${statusText}
                        </span>
                        ${scheduleBadge}
                    </div>
                </div>
                <div class="work-days">${workDaysHtml}</div>
                <div>${weekOffBadge}</div>
                <button class="btn-remove" onclick="event.stopPropagation(); removeStaff('${s.id}')">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        `;
    }).join('');
    
    updateStats();
}

// Get work days for a staff member on a specific week (handles alternating schedules)
function getWorkDaysForWeek(staffMember, weekNumber) {
    if (staffMember.scheduleType === 'alternating') {
        // Odd weeks (1, 3, 5) use week1Days, even weeks (2, 4, 6) use week2Days
        if (weekNumber % 2 === 1) {
            return staffMember.week1Days || [];
        } else {
            return staffMember.week2Days || [];
        }
    } else {
        // Fixed schedule
        return staffMember.workDays || [];
    }
}

// Get previous working day (handles week boundaries)
function getPreviousDay(currentDay, currentWeek) {
    const dayIndex = WORK_DAYS.indexOf(currentDay);
    
    if (dayIndex > 0) {
        // Previous day is in same week
        return {
            day: WORK_DAYS[dayIndex - 1],
            week: currentWeek
        };
    } else if (currentWeek > 1) {
        // Previous day is last day of previous week (Monday)
        return {
            day: WORK_DAYS[WORK_DAYS.length - 1], // monday
            week: currentWeek - 1
        };
    }
    
    return null; // No previous day (first day of first week)
}

// Check if staff member had this shift type yesterday
function hadShiftYesterday(staffId, shiftType, currentDay, currentWeek) {
    const prev = getPreviousDay(currentDay, currentWeek);
    if (!prev) return false;
    
    const yesterdayShifts = roster[prev.week]?.[prev.day]?.[shiftType];
    if (!yesterdayShifts) return false;
    
    return yesterdayShifts.includes(staffId);
}

// Generate roster
function generateRoster() {
    const activeStaff = staff.filter(s => s.status !== 'inactive');
    
    if (activeStaff.length === 0) {
        showNotification('Please add active staff members first', 'warning');
        return;
    }

    if (activeStaff.length < 4) {
        showNotification('Need at least 4 active staff members (2 per early shift + 2 per late shift)', 'warning');
        return;
    }

    const startDate = document.getElementById('period-start').value;
    const weeks = parseInt(document.getElementById('period-weeks').value);
    
    if (!startDate) {
        showNotification('Please select a start date', 'warning');
        return;
    }

    // Get cumulative stats from previous periods for fairness
    const cumulativeStats = getCumulativeStats();

    // Auto-assign week-offs (distribute evenly across the period, only for active staff)
    activeStaff.forEach((s, index) => {
        s.weekOff = (index % weeks) + 1;
    });

    roster = {};
    
    // Initialize roster structure (2 people per shift)
    for (let week = 1; week <= weeks; week++) {
        roster[week] = {};
        WORK_DAYS.forEach(day => {
            roster[week][day] = {
                early: [null, null], // 2 people for early shift
                late: [null, null]   // 2 people for late shift
            };
        });
    }

    // Track assignments for fairness - initialize with cumulative stats
    const staffStats = {};
    staff.forEach(s => {
        staffStats[s.id] = {
            name: s.name,
            earlyCount: cumulativeStats[s.id]?.earlyCount || 0,
            lateCount: cumulativeStats[s.id]?.lateCount || 0,
            totalShifts: cumulativeStats[s.id]?.totalShifts || 0,
            assignedDays: cumulativeStats[s.id]?.assignedDays || {}
        };
    });

    // Try to maintain consistent shift days for each person
    const preferredEarlyDay = {};
    const preferredLateDay = {};

    // Generate assignments
    for (let week = 1; week <= weeks; week++) {
        // Track weekly assignments
        const weeklyAssignments = {};
        staff.forEach(s => {
            weeklyAssignments[s.id] = { early: 0, late: 0 };
        });

        WORK_DAYS.forEach((day, dayIndex) => {
            // Calculate actual date for this day
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + ((week - 1) * 7) + dayIndex);
            
            // Get available staff for this day/week (using alternating schedule logic)
            const availableStaff = staff.filter(s => {
                // Must be active or on leave but available on this date
                if (s.status === 'inactive') return false;
                
                // Check if on leave during this specific date
                if (s.status === 'leave' && s.leaveStart && s.leaveEnd) {
                    const leaveStart = new Date(s.leaveStart + 'T00:00:00');
                    const leaveEnd = new Date(s.leaveEnd + 'T00:00:00');
                    if (dayDate >= leaveStart && dayDate <= leaveEnd) {
                        return false; // On leave this day
                    }
                }
                
                // Get work days for this specific week
                const workDays = getWorkDaysForWeek(s, week);
                
                // Must work this day
                if (!workDays.includes(day)) return false;
                
                // Check if on week off
                if (s.weekOff === week) return false;
                
                return true;
            });

            if (availableStaff.length === 0) {
                console.warn(`No staff available for Week ${week}, ${day} (${dayDate.toDateString()})`);
                return;
            }

            if (availableStaff.length < 4) {
                console.warn(`Only ${availableStaff.length} staff available for Week ${week}, ${day} - may have unfilled shifts`);
            }

            // Assign 2 EARLY shifts
            const assignedEarlyIds = [];
            for (let i = 0; i < 2; i++) {
                const earlyCandidate = selectBestCandidate(
                    availableStaff.filter(s => !assignedEarlyIds.includes(s.id)),
                    'early',
                    day,
                    week,
                    staffStats,
                    weeklyAssignments,
                    preferredEarlyDay,
                    [] // No early shifts assigned yet
                );

                if (earlyCandidate) {
                    roster[week][day].early[i] = earlyCandidate.id;
                    assignedEarlyIds.push(earlyCandidate.id);
                    staffStats[earlyCandidate.id].earlyCount++;
                    staffStats[earlyCandidate.id].totalShifts++;
                    weeklyAssignments[earlyCandidate.id].early++;
                    
                    // Remember their preferred day
                    if (!preferredEarlyDay[earlyCandidate.id]) {
                        preferredEarlyDay[earlyCandidate.id] = day;
                    }
                } else {
                    console.warn(`Could not assign early shift ${i+1} for Week ${week}, ${day}`);
                }
            }

            // Assign 2 LATE shifts (strongly prefer different people from early)
            const assignedLateIds = [];
            for (let i = 0; i < 2; i++) {
                // First try: exclude people who did early shift today
                let lateCandidate = selectBestCandidate(
                    availableStaff.filter(s => 
                        !assignedEarlyIds.includes(s.id) && 
                        !assignedLateIds.includes(s.id)
                    ),
                    'late',
                    day,
                    week,
                    staffStats,
                    weeklyAssignments,
                    preferredLateDay,
                    assignedEarlyIds // Pass early IDs to penalize heavily
                );

                // Second try: expand to people with fewer total shifts if still no one
                if (!lateCandidate && availableStaff.length >= 3) {
                    // Try with people who have lowest shift counts, excluding early
                    const sortedByShifts = availableStaff
                        .filter(s => !assignedEarlyIds.includes(s.id) && !assignedLateIds.includes(s.id))
                        .sort((a, b) => staffStats[a.id].totalShifts - staffStats[b.id].totalShifts);
                    
                    if (sortedByShifts.length > 0) {
                        lateCandidate = sortedByShifts[0];
                    }
                }

                // Last resort: allow people who did early (only if absolutely no other option)
                if (!lateCandidate && availableStaff.length >= 1) {
                    const notAssignedLate = availableStaff.filter(s => !assignedLateIds.includes(s.id));
                    if (notAssignedLate.length > 0) {
                        // Pick person with fewest total shifts
                        notAssignedLate.sort((a, b) => staffStats[a.id].totalShifts - staffStats[b.id].totalShifts);
                        lateCandidate = notAssignedLate[0];
                        
                        if (assignedEarlyIds.includes(lateCandidate.id)) {
                            console.warn(`⚠️ Week ${week}, ${day}: ${lateCandidate.name} doing both early and late (LAST RESORT - critical shortage)`);
                        }
                    }
                }

                if (lateCandidate) {
                    roster[week][day].late[i] = lateCandidate.id;
                    assignedLateIds.push(lateCandidate.id);
                    staffStats[lateCandidate.id].lateCount++;
                    staffStats[lateCandidate.id].totalShifts++;
                    weeklyAssignments[lateCandidate.id].late++;
                    
                    // Remember their preferred day
                    if (!preferredLateDay[lateCandidate.id]) {
                        preferredLateDay[lateCandidate.id] = day;
                    }
                } else {
                    console.error(`❌ Could not assign late shift ${i+1} for Week ${week}, ${day} - NO STAFF AVAILABLE`);
                }
            }
        });
    }

    // Save this period to history
    const startDateStr = document.getElementById('period-start').value;
    const endDateStr = document.getElementById('period-end').value;
    const numWeeks = parseInt(document.getElementById('period-weeks').value);
    
    currentPeriod = {
        startDate: startDateStr,
        endDate: endDateStr,
        weeks: numWeeks,
        roster: JSON.parse(JSON.stringify(roster)), // Deep copy
        generatedAt: new Date().toISOString()
    };
    
    rosterPeriods.push(currentPeriod);

    renderRoster();
    showStats(staffStats);
    saveState();
    renderPreviousPeriods();
    showNotification('Roster generated successfully!', 'success');
}

// Select best candidate for shift using smart algorithm
function selectBestCandidate(availableStaff, shiftType, day, week, staffStats, weeklyAssignments, preferredDays, assignedEarlyIds = []) {
    if (availableStaff.length === 0) return null;

    // Score each candidate
    const scored = availableStaff.map(s => {
        let score = 100; // Start with base score

        // MASSIVE penalty if they're already doing early shift today (for late assignments)
        if (assignedEarlyIds.includes(s.id)) {
            score -= 10000; // Extremely high penalty - absolute last resort
        }

        // Strong penalty if they had the same shift type yesterday (avoid consecutive days)
        if (hadShiftYesterday(s.id, shiftType, day, week)) {
            score -= 500; // Strong penalty for back-to-back same shift type
        }

        // Already has this shift type this week? Prefer those who don't, but don't disqualify
        const weeklyCount = weeklyAssignments[s.id][shiftType];
        if (weeklyCount === 0) {
            score += 100; // Strong preference for no shifts this week yet
        } else if (weeklyCount === 1) {
            score += 20; // Slight preference for only 1 shift this week
        } else {
            score -= weeklyCount * 30; // Penalty for multiple shifts, but not disqualifying
        }

        // Strongly prefer lower total shift count (balance workload across all weeks)
        const totalShifts = staffStats[s.id].totalShifts;
        const avgShifts = Object.values(staffStats).reduce((sum, s) => sum + s.totalShifts, 0) / staff.length;
        const shiftDiff = totalShifts - avgShifts;
        score -= shiftDiff * 50; // Stronger penalty for being above average

        // STRONGLY prefer balancing early vs late shifts (avoid imbalance)
        const earlyCount = staffStats[s.id].earlyCount;
        const lateCount = staffStats[s.id].lateCount;
        const earlyLateImbalance = Math.abs(earlyCount - lateCount);
        
        if (shiftType === 'early') {
            if (earlyCount < lateCount) {
                score += 200; // Strong bonus if they have more lates than earlies
            } else if (earlyCount > lateCount) {
                score -= earlyLateImbalance * 80; // Heavy penalty for making imbalance worse
            }
        } else if (shiftType === 'late') {
            if (lateCount < earlyCount) {
                score += 200; // Strong bonus if they have more earlies than lates
            } else if (lateCount > earlyCount) {
                score -= earlyLateImbalance * 80; // Heavy penalty for making imbalance worse
            }
        }

        // Prefer their usual day if already established (consistency)
        if (preferredDays[s.id] === day) {
            score += 30; // Preference for consistency
        }

        // Additional penalty check for doing both shifts same day
        const otherShiftType = shiftType === 'early' ? 'late' : 'early';
        if (weeklyAssignments[s.id][otherShiftType] > 0) {
            // Check if they already have the other shift on this same day
            const existingShift = roster[week]?.[day]?.[otherShiftType];
            if (existingShift && existingShift.includes(s.id)) {
                score -= 5000; // Massive penalty for doing both shifts same day
            }
        }

        return { staff: s, score };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].staff;
}

// Render roster table
function renderRoster() {
    const tbody = document.getElementById('roster-tbody');
    
    if (Object.keys(roster).length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--gray-600);">
                    <span class="material-icons" style="font-size: 3rem; opacity: 0.5;">calendar_month</span>
                    <p style="margin-top: 1rem;">Add staff and click "Generate Roster" to create the schedule</p>
                </td>
            </tr>
        `;
        return;
    }

    const startDateStr = document.getElementById('period-start').value;
    const weeks = parseInt(document.getElementById('period-weeks').value);
    const startDate = new Date(startDateStr + 'T00:00:00');

    let html = '';
    
    for (let week = 1; week <= weeks; week++) {
        // Calculate date range for this week (Tuesday to Monday)
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + ((week - 1) * 7));
        
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6); // Monday
        
        const dateRange = `${weekStartDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${weekEndDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        
        html += `<tr class="week-header">
            <td colspan="6">
                <div class="week-date-header">
                    <span>Week ${week}</span>
                    <span class="week-date-range">${dateRange}</span>
                </div>
            </td>
        </tr>`;
        html += '<tr>';
        html += `<td style="font-weight: 600;">Shifts</td>`;
        
        WORK_DAYS.forEach((day, dayIndex) => {
            const shifts = roster[week][day];
            
            // Calculate actual date for this day
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(dayDate.getDate() + dayIndex);
            const dayDateStr = dayDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
            
            html += '<td>';
            html += `<div style="font-size: 0.75rem; font-weight: 600; color: var(--primary); margin-bottom: 0.25rem;">${dayDateStr}</div>`;
            html += '<div class="shift-cell">';
            
            // Early shift - 2 people
            const earlyStaff1 = staff.find(s => s.id === shifts.early[0]);
            const earlyStaff2 = staff.find(s => s.id === shifts.early[1]);
            
            if (earlyStaff1 || earlyStaff2) {
                html += `<div class="shift-slot early">
                    <span class="material-icons">wb_sunny</span>
                    <div>
                        ${earlyStaff1 ? earlyStaff1.name : '<span style="color: var(--gray-500);">TBD</span>'}
                        ${earlyStaff2 ? `<br>${earlyStaff2.name}` : '<br><span style="color: var(--gray-500);">TBD</span>'}
                    </div>
                </div>`;
            } else {
                html += '<div class="empty-slot">No early shift</div>';
            }
            
            // Late shift - 2 people
            const lateStaff1 = staff.find(s => s.id === shifts.late[0]);
            const lateStaff2 = staff.find(s => s.id === shifts.late[1]);
            
            if (lateStaff1 || lateStaff2) {
                html += `<div class="shift-slot late">
                    <span class="material-icons">nights_stay</span>
                    <div>
                        ${lateStaff1 ? lateStaff1.name : '<span style="color: var(--gray-500);">TBD</span>'}
                        ${lateStaff2 ? `<br>${lateStaff2.name}` : '<br><span style="color: var(--gray-500);">TBD</span>'}
                    </div>
                </div>`;
            } else {
                html += '<div class="empty-slot">No late shift</div>';
            }
            
            html += '</div></td>';
        });
        
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

// Show statistics
function showStats(staffStats) {
    console.log('Shift Distribution:');
    Object.values(staffStats).forEach(s => {
        console.log(`${s.name}: ${s.totalShifts} total (${s.earlyCount} early, ${s.lateCount} late)`);
    });
}

// Update stats display
function updateStats() {
    const activeStaff = staff.filter(s => s.status === 'active' || s.status === 'leave').length;
    const inactiveStaff = staff.filter(s => s.status === 'inactive').length;
    
    document.getElementById('stat-staff').textContent = staff.length;
    
    // Update active staff count in staff list header
    const activeCountEl = document.getElementById('active-staff-count');
    if (activeCountEl) {
        activeCountEl.textContent = `${activeStaff} active, ${inactiveStaff} inactive`;
    }
}

// Edit staff member
function editStaff(staffId) {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    
    document.getElementById('edit-staff-id').value = member.id;
    document.getElementById('edit-staff-name').value = member.name;
    document.getElementById('edit-staff-status').value = member.status || 'active';
    document.getElementById('edit-leave-start').value = member.leaveStart || '';
    document.getElementById('edit-leave-end').value = member.leaveEnd || '';
    document.getElementById('edit-leave-reason').value = member.leaveReason || '';
    document.getElementById('edit-inactive-date').value = member.inactiveDate || '';
    
    toggleLeaveFields();
    document.getElementById('staff-edit-modal').style.display = 'flex';
}

// Toggle leave/inactive fields based on status
function toggleLeaveFields() {
    const status = document.getElementById('edit-staff-status').value;
    const leaveFields = document.getElementById('leave-fields');
    const inactiveFields = document.getElementById('inactive-fields');
    
    if (status === 'leave') {
        leaveFields.style.display = 'block';
        inactiveFields.style.display = 'none';
    } else if (status === 'inactive') {
        leaveFields.style.display = 'none';
        inactiveFields.style.display = 'block';
    } else {
        leaveFields.style.display = 'none';
        inactiveFields.style.display = 'none';
    }
}

// Save staff edit
function saveStaffEdit() {
    const staffId = document.getElementById('edit-staff-id').value;
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    
    const newStatus = document.getElementById('edit-staff-status').value;
    member.status = newStatus;
    
    if (newStatus === 'leave') {
        member.leaveStart = document.getElementById('edit-leave-start').value;
        member.leaveEnd = document.getElementById('edit-leave-end').value;
        member.leaveReason = document.getElementById('edit-leave-reason').value;
        member.inactiveDate = null;
    } else if (newStatus === 'inactive') {
        member.inactiveDate = document.getElementById('edit-inactive-date').value;
        member.leaveStart = null;
        member.leaveEnd = null;
        member.leaveReason = null;
    } else {
        member.leaveStart = null;
        member.leaveEnd = null;
        member.leaveReason = null;
        member.inactiveDate = null;
    }
    
    saveState();
    renderStaffList();
    closeEditModal();
    showNotification(`Updated ${member.name}'s status`, 'success');
}

// Close edit modal
function closeEditModal(event) {
    if (event && event.target.id !== 'staff-edit-modal') return;
    document.getElementById('staff-edit-modal').style.display = 'none';
}

// Export roster
function exportRoster() {
    if (Object.keys(roster).length === 0) {
        showNotification('Generate a roster first', 'warning');
        return;
    }

    if (!currentPeriod) {
        showNotification('No active period', 'warning');
        return;
    }

    let csv = '';
    
    // Title row (spans across all columns)
    const startDate = new Date(currentPeriod.startDate);
    const monthYear = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    csv += `${monthYear} CAU PHONE & LEAVE ROSTER\n`;
    
    // Process each week
    for (let week = 1; week <= currentPeriod.weeks; week++) {
        // Calculate the start of this week (Tuesday)
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * 7);
        
        // Date header row (Tue, Wed, Thu, Fri, Mon of next week)
        const dateHeaders = [];
        WORK_DAYS.forEach((day, dayIndex) => {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(dayDate.getDate() + dayIndex);
            
            const dayName = day.charAt(0).toUpperCase() + day.slice(1, 3);
            const dayNum = dayDate.getDate();
            const monthName = dayDate.toLocaleDateString('en-US', { month: 'short' });
            const year = dayDate.getFullYear().toString().slice(-2);
            
            dateHeaders.push(`${dayName} ${dayNum} ${monthName} ${year}`);
        });
        csv += dateHeaders.join('\t') + '\n';
        
        // Early Phone Coverage label row
        csv += WORK_DAYS.map(() => 'Early Phone Coverage').join('\t') + '\n';
        
        // Early staff names row
        const earlyStaff = WORK_DAYS.map(day => {
            const shifts = roster[week][day];
            const staff1 = staff.find(s => s.id === shifts.early[0]);
            const staff2 = staff.find(s => s.id === shifts.early[1]);
            const name1 = staff1?.name.split(' ')[0] || '';
            const name2 = staff2?.name.split(' ')[0] || '';
            
            if (name1 && name2) {
                return `${name1}/${name2}`;
            } else if (name1 || name2) {
                return name1 || name2;
            } else {
                return '';
            }
        });
        csv += earlyStaff.join('\t') + '\n';
        
        // Late Phone Coverage label row
        csv += WORK_DAYS.map(() => 'Late Phone Coverage').join('\t') + '\n';
        
        // Late staff names row
        const lateStaff = WORK_DAYS.map(day => {
            const shifts = roster[week][day];
            const staff1 = staff.find(s => s.id === shifts.late[0]);
            const staff2 = staff.find(s => s.id === shifts.late[1]);
            const name1 = staff1?.name.split(' ')[0] || '';
            const name2 = staff2?.name.split(' ')[0] || '';
            
            if (name1 && name2) {
                return `${name1}/${name2}`;
            } else if (name1 || name2) {
                return name1 || name2;
            } else {
                return '';
            }
        });
        csv += lateStaff.join('\t') + '\n';
        
        // Planned Leave label row
        csv += WORK_DAYS.map(() => 'Planned Leave').join('\t') + '\n';
        
        // Planned Leave data row (empty cells for user to fill)
        csv += WORK_DAYS.map(() => '').join('\t') + '\n';
    }
    
    // Create HTML table format that Excel can open and interpret correctly
    let html = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
    html += '<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>\n';
    html += '<x:Name>Phone Roster</x:Name>\n';
    html += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>\n';
    html += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->\n';
    html += '</head>\n<body>\n';
    html += '<table border="1">\n';
    
    // Convert CSV to HTML table
    const rows = csv.split('\n');
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() === '') {
            html += '<tr><td colspan="5">&nbsp;</td></tr>\n'; // Empty row
            continue;
        }
        
        const cells = rows[i].split('\t');
        html += '<tr>';
        for (let j = 0; j < cells.length; j++) {
            html += `<td>${cells[j] || '&nbsp;'}</td>`;
        }
        html += '</tr>\n';
    }
    
    html += '</table>\n</body>\n</html>';
    
    // Download as HTML file that Excel will open with proper columns
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone-roster-${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Roster exported - opens in Excel with proper columns', 'success');
}

// Notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check_circle' : 
                 type === 'error' ? 'error' : 'warning';
    
    notification.innerHTML = `
        <span class="material-icons">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility: Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Save/Load state
function saveState() {
    localStorage.setItem('roster-lite-staff', JSON.stringify(staff));
    localStorage.setItem('roster-lite-roster', JSON.stringify(roster));
    localStorage.setItem('roster-lite-periods', JSON.stringify(rosterPeriods));
    localStorage.setItem('roster-lite-current-period', JSON.stringify(currentPeriod));
}

function loadState() {
    const savedStaff = localStorage.getItem('roster-lite-staff');
    const savedRoster = localStorage.getItem('roster-lite-roster');
    const savedPeriods = localStorage.getItem('roster-lite-periods');
    const savedCurrentPeriod = localStorage.getItem('roster-lite-current-period');
    
    if (savedStaff) {
        staff = JSON.parse(savedStaff);
    }
    
    if (savedRoster) {
        roster = JSON.parse(savedRoster);
        renderRoster();
    }
    
    if (savedPeriods) {
        rosterPeriods = JSON.parse(savedPeriods);
    }
    
    if (savedCurrentPeriod) {
        currentPeriod = JSON.parse(savedCurrentPeriod);
    }
}
