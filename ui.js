// ===== MODULE: UI Manager =====
// Manages all DOM rendering and user interface event handling.

import { CONFIG } from './config.js';
import { DateUtils, StringUtils } from './utils.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.cacheDOMElements();
    }

    cacheDOMElements() {
        this.elements = {
            weekDisplay: document.getElementById('week-display'),
            gridContainer: document.getElementById('grid-container'),
            gridParentContainer: document.getElementById('grid-parent-container'),
            userSelect: document.getElementById('user-select'),
            viewToggle: document.getElementById('view-toggle'),
            modeIndicator: document.getElementById('mode-indicator'),
            themeToggle: document.getElementById('theme-toggle'),
            gridHeader: document.getElementById('grid-header'),
            gridBody: document.getElementById('grid-body'),
            gridFooter: document.getElementById('grid-footer'),
            randomGenerateBtn: document.getElementById('random-generate-btn'),
            skillsMatrixBtn: document.getElementById('skills-matrix-btn'),
            copyPrevWeekBtn: document.getElementById('copy-prev-week-btn'),
            manageBtn: document.getElementById('manage-btn'),
            exitBuildBtn: document.getElementById('exit-build-btn'),
            leaveRosterBtn: document.getElementById('leave-roster-btn'),
            prevWeekBtn: document.getElementById('prev-week'),
            nextWeekBtn: document.getElementById('next-week'),
            todayBtn: document.getElementById('today-btn'),
            loadingOverlay: document.getElementById('loading'),
            errorDisplay: document.getElementById('error-display')
        };
    }
    
    // ===== Core Rendering =====

    render() {
        if (!this.app.state.initialized || this.app.state.isLoading) {
            console.log('Skipping render - not initialized or loading');
            return;
        }

        try {
            const week = DateUtils.getWeek(this.app.state.currentDate);
            const isLocked = this.app.isWeekLocked(week[0]);
            
            this.updateWeekDisplay(week, isLocked);
            this.updateViewToggle();
            this.updateModeDisplay();
            this.renderGrid(week);
            
            requestAnimationFrame(() => this.scaleGridToFit());
        } catch (error) {
            console.error('Render error:', error);
            this.app.errorHandler.logError(error, 'Render');
            NotificationManager.show('Error rendering view', 'error');
        }
    }
    
    updateWeekDisplay(week, isLocked) {
        if (!this.elements.weekDisplay) return;
        const weekEnd = week[week.length - 1];
        const lockIcon = isLocked ? ' 🔒' : '';
        this.elements.weekDisplay.textContent = 
            `${DateUtils.formatDate(week[0], {day:'numeric', month:'short'})} - ${DateUtils.formatDate(weekEnd, {day:'numeric', month:'short', year:'numeric'})}${lockIcon}`;
    }

    renderGrid(week) {
        if (!this.elements.gridContainer) return;
        this.renderHeader(week);
        this.renderBody(week);
        this.renderFooter(week);
    }
    
    renderHeader(week) {
        if (!this.elements.gridHeader) return;
        
        // Check if WOH feature is enabled
        const showWOH = this.app.featureFlags?.isEnabled('workOnHand') ?? true;
        
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th class="task-name-header">Task</th>
            ${showWOH ? '<th class="woh-header">WOH DD/MM/YY</th>' : '<th class="woh-header" style="display: none;"></th>'}
        `;

        week.forEach(date => {
            const dayHeader = document.createElement('th');
            const isHoliday = DateUtils.isNSWPublicHoliday(date);
            dayHeader.className = `day-header ${DateUtils.isWorkingDay(date) ? 'working-day' : 'non-working-day'} ${isHoliday ? 'holiday' : ''}`;
            
            const dayName = DateUtils.getDayName(date);
            const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1, 3);
            
            dayHeader.innerHTML = `
                <div class="day-header-content">
                    <div class="day-name">${formattedDayName}</div>
                    <div class="day-date">${date.getDate()}/${date.getMonth() + 1}</div>
                </div>
            `;
            headerRow.appendChild(dayHeader);
        });

        this.elements.gridHeader.innerHTML = '';
        this.elements.gridHeader.appendChild(headerRow);
    }

    renderBody(week) {
        if (!this.elements.gridBody) return;
        this.elements.gridBody.innerHTML = '';
        
        // Filter tasks if in personal view
        let tasksToRender = this.app.state.tasks;
        if (this.app.state.currentView === 'personal' && this.app.state.selectedUserId) {
            const userId = this.app.state.selectedUserId;
            
            // Find tasks where user is assigned in current week
            const assignedTaskIds = new Set();
            const assignedHeaderIds = new Set();
            
            week.forEach(date => {
                const isoDate = DateUtils.toISODate(date);
                
                // Check task allocations
                const dayAllocations = this.app.state.allocations[isoDate] || {};
                Object.entries(dayAllocations).forEach(([taskId, allocation]) => {
                    if (allocation.assignments?.includes(userId)) {
                        assignedTaskIds.add(taskId);
                        // Find the category of this task
                        const task = this.app.state.tasks.find(t => t.id === taskId);
                        if (task) {
                            const header = this.app.state.tasks.find(t => t.type === 'header' && t.category === task.category);
                            if (header) assignedHeaderIds.add(header.id);
                        }
                    }
                });
                
                // Check triage assignments
                const triageAssignments = this.app.state.triageAssignments[isoDate] || {};
                Object.entries(triageAssignments).forEach(([headerId, assignment]) => {
                    if (assignment.assignments?.includes(userId)) {
                        assignedHeaderIds.add(headerId);
                    }
                });
                
                // Check phone assignments
                const phoneData = this.app.state.phoneRoster[isoDate] || {};
                if (phoneData.early?.includes(userId) || phoneData.late?.includes(userId)) {
                    // Show all tasks if user has phone duty
                    tasksToRender = this.app.state.tasks;
                    return;
                }
            });
            
            // If user has no assignments this week, show message
            if (assignedTaskIds.size === 0 && assignedHeaderIds.size === 0) {
                this.elements.gridBody.innerHTML = `
                    <tr>
                        <td colspan="${week.length + 2}" style="text-align: center; padding: 2rem;">
                            No assignments for ${this.app.state.userProfile?.name || 'selected user'} this week
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Filter tasks to only assigned ones
            tasksToRender = this.app.state.tasks.filter(t => 
                assignedHeaderIds.has(t.id) || 
                assignedTaskIds.has(t.id) ||
                (t.type === 'header' && this.app.state.tasks.some(task => 
                    task.category === t.category && assignedTaskIds.has(task.id)
                ))
            );
        }
        
        const tasksByCategory = this.groupTasksByCategory(tasksToRender);

        Object.entries(tasksByCategory).forEach(([category, tasks]) => {
            if (tasks.length > 0) {
                const header = tasks.find(t => t.type === 'header');
                if (header) {
                    this.renderCategoryHeaderRow(header, week);
                }
                
                // Check if category is collapsed
                if (!this.app.isCategoryCollapsed(category)) {
                    const taskRowsFragment = document.createDocumentFragment();
                    tasks.filter(t => t.type === 'task').forEach(task => {
                        this.renderTaskRow(task, week, taskRowsFragment);
                    });
                    this.elements.gridBody.appendChild(taskRowsFragment);
                }
            }
        });
    }
    
    renderFooter(week) {
        if (!this.elements.gridFooter) return;
        
        // Check if phone shifts are enabled
        const phoneShiftsEnabled = this.app.configManager?.get('phoneShifts.enabled') ?? true;
        
        if (!phoneShiftsEnabled) {
            this.elements.gridFooter.innerHTML = '';
            return;
        }
        
        const footerRow = document.createElement('tr');
        footerRow.className = 'phone-coverage-row';
        footerRow.innerHTML = `
            <td class="phone-coverage-header">Phone Coverage</td>
            <td class="woh-column">-</td>
        `;
        
        week.forEach(date => {
            const coverageCell = document.createElement('td');
            coverageCell.className = `phone-coverage-cell ${this.app.state.buildMode ? 'clickable' : ''}`;
            coverageCell.dataset.date = DateUtils.toISODate(date);
            coverageCell.innerHTML = this.renderPhoneCoverage(date);
            footerRow.appendChild(coverageCell);
        });

        this.elements.gridFooter.innerHTML = '';
        this.elements.gridFooter.appendChild(footerRow);
    }
    
    renderCategoryHeaderRow(header, week) {
        const isCollapsed = this.app.isCategoryCollapsed(header.category);
        const headerRow = document.createElement('tr');
        headerRow.className = `category-header-row category-${header.category} ${isCollapsed ? 'collapsed' : ''}`;
        
        // Check feature flags
        const showWOH = this.app.featureFlags?.isEnabled('workOnHand') ?? true;
        const showTriage = this.app.featureFlags?.isEnabled('triageAssignments') ?? true;
        
        headerRow.innerHTML = `
            <td class="category-header-cell">
                <div class="category-header-content">
                    <span class="material-icons collapse-icon">
                        ${isCollapsed ? 'chevron_right' : 'expand_less'}
                    </span>
                    <span class="category-title">${header.name}</span>
                    ${this.app.state.buildMode && header.allowTriage && showTriage ? `
                        <div class="triage-actions">
                            <button class="assign-triage-btn" data-header="${header.id}">Assign</button>
                            <button class="push-triage-btn" data-header="${header.id}">→</button>
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="woh-column" ${!showWOH ? 'style="display: none;"' : ''}>-</td>
        `;

        week.forEach((date, index) => {
            const assignmentCell = document.createElement('td');
            assignmentCell.className = `category-header-day-cell ${this.app.state.buildMode && header.allowTriage && showTriage ? 'clickable' : ''}`;
            assignmentCell.dataset.date = DateUtils.toISODate(date);
            assignmentCell.dataset.header = header.id;
            if (DateUtils.isNSWPublicHoliday(date)) {
                assignmentCell.classList.add('holiday');
            }
            assignmentCell.innerHTML = showTriage ? this.renderTriageAssignment(header.id, date) : '-';
            headerRow.appendChild(assignmentCell);
        });

        this.elements.gridBody.appendChild(headerRow);
    }
    
    renderTaskRow(task, week, fragment) {
        const taskRow = document.createElement('tr');
        taskRow.className = `task-row category-${task.category}`;
        
        // Check feature flags
        const showSkillLevel = this.app.featureFlags?.isEnabled('skillsMatrix') ?? true;
        const showWOH = this.app.featureFlags?.isEnabled('workOnHand') ?? true;
        
        taskRow.innerHTML = `
            <td class="task-name-cell">
                <div class="task-name-content">
                    <span class="task-title">${task.name}</span>
                    ${showSkillLevel ? `<div class="task-skill-info">Skill Level: ${task.skillLevel || 1}</div>` : ''}
                </div>
            </td>
            <td class="woh-column" ${!showWOH ? 'style="display: none;"' : ''}>${showWOH ? this.renderWOHDisplay(task.id) : '-'}</td>
        `;
        
        week.forEach((date, index) => {
            const assignmentCell = document.createElement('td');
            assignmentCell.className = `assignment-cell ${this.app.state.buildMode ? 'clickable' : ''}`;
            assignmentCell.dataset.date = DateUtils.toISODate(date);
            assignmentCell.dataset.task = task.id;
            if (DateUtils.isNSWPublicHoliday(date)) {
                assignmentCell.classList.add('holiday');
            }
            
            const content = this.renderTaskAssignment(task.id, date);
            // Add push button only on Tuesday (index 0)
            if (this.app.state.buildMode && index === 0 && !DateUtils.isNSWPublicHoliday(date)) {
                assignmentCell.innerHTML = `
                    ${content}
                    <button class="push-tuesday-btn" title="Push to rest of week">→</button>
                `;
            } else {
                assignmentCell.innerHTML = content;
            }
            
            taskRow.appendChild(assignmentCell);
        });
        
        fragment.appendChild(taskRow);
    }

    renderWOHDisplay(taskId) {
        if (!taskId) {
            console.error('renderWOHDisplay called with undefined taskId');
            return '<div class="woh-display">-</div>';
        }
        
        const priorityTask = this.app.state.priorityTasks[taskId];
        const clickableClass = this.app.state.buildMode ? 'clickable' : '';
        
        if (!priorityTask || (!priorityTask.count && !priorityTask.oldestDate)) {
            return `<div class="woh-display ${clickableClass}" data-task="${taskId}">
                        <div class="count-display">-</div>
                        <div class="date-display">-</div>
                    </div>`;
        }
        
        return `
            <div class="woh-display ${clickableClass}" data-task="${taskId}">
                <div class="count-display">${priorityTask.count || '-'}</div>
                <div class="date-display">${DateUtils.formatWOHDate(priorityTask.oldestDate)}</div>
            </div>`;
    }

    renderTriageAssignment(headerId, date) {
        const assignment = this.app.assignmentGenerator.getTriageAssignment(headerId, date);
        if (!assignment || !assignment.assignments || assignment.assignments.length === 0) {
            return `<div class="triage-placeholder">${this.app.state.buildMode ? 'Click to assign' : '-'}</div>`;
        }
        const staffNames = assignment.assignments
            .map(id => this.app.getStaffById(id)?.name || 'Unknown').join(', ');
        return `<div class="triage-content">${staffNames || '-'}</div>`;
    }

    renderTaskAssignment(taskId, date) {
        const assignment = this.app.assignmentGenerator.getTaskAssignment(taskId, date);
        const isoDate = DateUtils.toISODate(date);
        const leaveData = this.app.state.leaveRoster[isoDate] || {};
        
        let content = '';
        
        // Show assignments
        if (assignment && assignment.assignments && assignment.assignments.length > 0) {
            const staffWithLeave = assignment.assignments.map(id => {
                const staffName = this.app.getStaffById(id)?.name || 'Unknown';
                const leave = leaveData[id];
                return leave ? `${staffName} (${leave})` : staffName;
            });
            content = `<div class="assignment-content">${staffWithLeave.join(', ')}</div>`;
        } else {
            content = `<div class="assignment-placeholder">${this.app.state.buildMode ? 'Click to assign' : '-'}</div>`;
        }
        
        // Show any other staff on leave for this task
        const assignedStaff = assignment?.assignments || [];
        const otherLeave = Object.entries(leaveData)
            .filter(([staffId, leave]) => !assignedStaff.includes(staffId))
            .map(([staffId, leave]) => {
                const staff = this.app.getStaffById(staffId);
                return staff ? `${staff.name} (${leave})` : null;
            })
            .filter(Boolean);
        
        if (otherLeave.length > 0) {
            content += `<div class="leave-note" style="font-size: 0.7rem; color: var(--warning); margin-top: 2px;">Leave: ${otherLeave.join(', ')}</div>`;
        }
        
        return content;
    }
    
    renderPhoneCoverage(date) {
        const isoDate = DateUtils.toISODate(date);
        const phoneData = this.app.state.phoneRoster[isoDate];
        const swaps = this.app.state.shiftSwaps[isoDate] || {};
        const leaveData = this.app.state.leaveRoster[isoDate] || {};
        
        const renderShiftStaff = (staffIds, shiftType) => {
            return staffIds.map(id => {
                const swapKey = `${shiftType}_${id}`;
                const swappedTo = swaps[swapKey];
                const staff = this.app.getStaffById(id);
                const leave = leaveData[id];
                
                if (swappedTo) {
                    const originalName = staff?.name;
                    const swappedName = this.app.getStaffById(swappedTo)?.name;
                    const swappedLeave = leaveData[swappedTo];
                    return `<span class="swapped-out">${originalName}</span> → ${swappedName}${swappedLeave ? ` (${swappedLeave})` : ''}`;
                }
                
                return `${staff?.name}${leave ? ` (${leave})` : ''}`;
            }).join(', ') || 'Not assigned';
        };
        
        const earlyStaff = phoneData?.early ? renderShiftStaff(phoneData.early, 'early') : 'Not assigned';
        const lateStaff = phoneData?.late ? renderShiftStaff(phoneData.late, 'late') : 'Not assigned';

        return `
            <div class="phone-shift early-shift">
                <div class="shift-label">Early</div>
                <div class="shift-assignment">${earlyStaff}</div>
                ${this.app.state.buildMode && phoneData?.early?.length ? 
                    phoneData.early.map(staffId => `
                        <button class="swap-icon" data-shift="early" data-date="${isoDate}" data-staff="${staffId}" title="Swap shift">
                            <span class="material-icons">swap_horiz</span>
                        </button>
                    `).join('') : ''
                }
            </div>
            <div class="phone-shift late-shift">
                <div class="shift-label">Late</div>
                <div class="shift-assignment">${lateStaff}</div>
                ${this.app.state.buildMode && phoneData?.late?.length ? 
                    phoneData.late.map(staffId => `
                        <button class="swap-icon" data-shift="late" data-date="${isoDate}" data-staff="${staffId}" title="Swap shift">
                            <span class="material-icons">swap_horiz</span>
                        </button>
                    `).join('') : ''
                }
            </div>
        `;
    }
    
    // ===== UI State & Helpers =====
    
    setLoading(loading) {
        this.elements.loadingOverlay?.classList.toggle('hidden', !loading);
    }
    
    showErrorMessage(message) {
        const errorContent = this.elements.errorDisplay?.querySelector('.error-message');
        if (errorContent) {
            errorContent.textContent = message;
            this.elements.errorDisplay.classList.remove('hidden');
        }
    }
    
    updateViewToggle() {
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.app.state.currentView);
        });
    }

    renderUserSelect() {
        if (!this.elements.userSelect) return;
        const profile = this.app.state.userProfile;
        if (profile) {
            this.elements.userSelect.innerHTML = `<option value="${profile.id}">${profile.name}</option>`;
            this.elements.userSelect.style.display = 'block';
        } else {
            this.elements.userSelect.style.display = 'none';
        }
    }
    
    // ===== ENHANCED BUILD MODE MANAGEMENT =====
    
    updateModeDisplay() {
        if (!this.elements.modeIndicator) return;
        
        const icon = this.elements.modeIndicator.querySelector('.material-icons');
        const text = this.elements.modeIndicator.querySelector('.mode-text');
        
        // Update mode indicator
        if (this.app.state.buildMode) {
            this.elements.modeIndicator.className = 'mode-indicator build-mode';
            if (icon) icon.textContent = 'edit';
            if (text) text.textContent = 'Build Mode';
            document.body.classList.add('build-mode');
        } else {
            this.elements.modeIndicator.className = 'mode-indicator view-mode';
            if (icon) icon.textContent = 'visibility';
            if (text) text.textContent = 'View Mode';
            document.body.classList.remove('build-mode');
        }
        
        // Show/hide build mode buttons based on build mode AND feature flags
        const buildModeButtons = document.querySelectorAll('.build-mode-only');
        buildModeButtons.forEach(btn => {
            btn.style.display = this.app.state.buildMode ? 'inline-flex' : 'none';
        });
        
        // Apply feature flag visibility (only when in build mode)
        if (this.app.state.buildMode) {
            // Skills Matrix button - requires skillsMatrix feature
            const skillsBtn = document.getElementById('skills-matrix-btn');
            if (skillsBtn && !this.app.featureFlags.isEnabled('skillsMatrix')) {
                skillsBtn.style.display = 'none';
            }
            
            // Generate Shifts button - requires triageAssignments feature
            const generateBtn = document.getElementById('random-generate-btn');
            if (generateBtn && !this.app.featureFlags.isEnabled('triageAssignments')) {
                generateBtn.style.display = 'none';
            }
        }
        
        // Update manage button behavior and appearance
        this.updateManageButton();
        
        // Update exit build mode button
        this.updateExitBuildButton();
    }

    updateManageButton() {
        const manageBtn = this.elements.manageBtn;
        if (!manageBtn) return;
        
        if (this.app.state.buildMode) {
            manageBtn.innerHTML = `
                <span class="material-icons">settings</span>
                Manage System
            `;
            manageBtn.title = 'Manage staff, tasks, and system settings';
            manageBtn.className = 'btn btn-accent';
        } else {
            manageBtn.innerHTML = `
                <span class="material-icons">edit</span>
                Enter Build Mode
            `;
            manageBtn.title = 'Enter build mode to edit assignments';
            manageBtn.className = 'btn btn-accent';
        }
    }

    updateExitBuildButton() {
        const exitBtn = this.elements.exitBuildBtn;
        if (!exitBtn) return;
        
        if (this.app.state.buildMode) {
            exitBtn.style.display = 'inline-flex';
        } else {
            exitBtn.style.display = 'none';
        }
    }

    showBuildModeModal() {
        const content = !this.app.state.buildMode 
            ? `<div class="build-mode-entry">
                   <p>Build mode allows editing work allocations. Enter password to continue:</p>
                   <input type="password" id="build-password" placeholder="Enter password" class="form-input" style="width: 100%;">
                   <div id="password-error" style="display: none; color: var(--danger); margin-top: 0.5rem; font-size: 0.875rem;">
                       <span class="material-icons" style="font-size: 1rem; vertical-align: middle;">error</span>
                       Incorrect password. Please try again.
                   </div>
               </div>`
            : `<div class="build-mode-status">
                   <div class="status-indicator active">
                       <span class="material-icons">edit</span>
                       <span>Build Mode Active</span>
                   </div>
                   <p>You are currently in build mode and can edit all assignments and system settings.</p>
                   <div class="build-mode-features">
                       <h4>Available Features:</h4>
                       <ul>
                           <li><span class="material-icons">check_circle</span> Edit task assignments</li>
                           <li><span class="material-icons">check_circle</span> Modify phone coverage</li>
                           <li><span class="material-icons">check_circle</span> Generate smart assignments</li>
                           <li><span class="material-icons">check_circle</span> Copy previous week</li>
                           <li><span class="material-icons">check_circle</span> Manage staff and tasks</li>
                           <li><span class="material-icons">check_circle</span> Configure skills matrix</li>
                           <li><span class="material-icons">check_circle</span> Plan and manage leave</li>
                           <li><span class="material-icons">check_circle</span> Lock/unlock months</li>
                       </ul>
                   </div>
                   <div class="build-mode-warning">
                       <span class="material-icons">info</span>
                       <span>Remember to exit build mode when finished to prevent accidental changes.</span>
                   </div>
               </div>`;

        const footer = `
            <button class="btn btn-ghost close-modal">
                <span class="material-icons">close</span>
                Cancel
            </button>
            ${!this.app.state.buildMode 
                ? `<button id="enter-build-mode" class="btn btn-primary">
                       <span class="material-icons">edit</span>
                       Enter Build Mode
                   </button>`
                : `<button id="exit-build-mode" class="btn btn-danger">
                       <span class="material-icons">logout</span>
                       Exit Build Mode
                   </button>`
            }`;

        const modal = this._createModal({ 
            title: this.app.state.buildMode ? 'Build Mode Manager' : 'Enter Build Mode', 
            content, 
            footer,
            size: 'modal-medium'
        });
        document.body.appendChild(modal);

        const passwordInput = modal.querySelector('#build-password');
        const passwordError = modal.querySelector('#password-error');
        const enterBtn = modal.querySelector('#enter-build-mode');
        const exitBtn = modal.querySelector('#exit-build-mode');
        
        const enterBuildMode = () => {
            const password = passwordInput.value.trim();
            if (password === CONFIG.BUILD_PASSWORD) {
                this.app.state.buildMode = true;
                this.app.debouncedSave();
                modal.remove();
                this.updateModeDisplay();
                this.render();
                NotificationManager.show('Build mode activated - you can now edit assignments', 'success');
            } else {
                passwordError.style.display = 'block';
                passwordInput.style.borderColor = 'var(--danger)';
                passwordInput.value = '';
                passwordInput.focus();
                
                // Auto-hide error after 3 seconds
                setTimeout(() => {
                    passwordError.style.display = 'none';
                    passwordInput.style.borderColor = '';
                }, 3000);
            }
        };

        const exitBuildMode = () => {
            this.showConfirmModal({
                title: 'Exit Build Mode',
                message: 'Are you sure you want to exit build mode? You will no longer be able to edit assignments until you re-enter with the password.',
                onConfirm: () => {
                    this.app.state.buildMode = false;
                    this.app.debouncedSave();
                    modal.remove();
                    this.updateModeDisplay();
                    this.render();
                    NotificationManager.show('Build mode deactivated - switched to view-only mode', 'info');
                }
            });
        };

        // Event listeners
        enterBtn?.addEventListener('click', enterBuildMode);
        passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                enterBuildMode();
            }
            // Clear error on typing
            if (passwordError) {
                passwordError.style.display = 'none';
                passwordInput.style.borderColor = '';
            }
        });
        
        exitBtn?.addEventListener('click', exitBuildMode);
        
        // Auto-focus password input
        if (passwordInput) {
            setTimeout(() => passwordInput.focus(), 100);
        }
    }

    quickExitBuildMode() {
        if (!this.app.state.buildMode) return;
        
        this.app.state.buildMode = false;
        this.app.debouncedSave();
        this.updateModeDisplay();
        this.render();
        NotificationManager.show('Quick exit from build mode', 'info');
    }
    
    scaleGridToFit() {
        const { gridParentContainer, gridContainer } = this.elements;
        if (!gridParentContainer || !gridContainer) return;
        
        const scale = gridParentContainer.clientWidth < gridContainer.scrollWidth 
            ? gridParentContainer.clientWidth / gridContainer.scrollWidth 
            : 1;

        gridContainer.style.transform = scale < 1 ? `scale(${scale})` : 'none';
        gridContainer.style.transformOrigin = 'top left';
        gridParentContainer.style.height = scale < 1 ? `${gridContainer.scrollHeight * scale}px` : 'auto';
    }
    
    groupTasksByCategory(tasks = null) {
        const tasksToGroup = tasks || this.app.state.tasks;
        const grouped = {};
        tasksToGroup.forEach(task => {
            grouped[task.category] = grouped[task.category] || [];
            grouped[task.category].push(task);
        });
        Object.values(grouped).forEach(tasks => tasks.sort((a, b) => a.type === 'header' ? -1 : 1));
        return grouped;
    }
    
    // ===== MODALS =====

    _createModal({ id, title, content, footer, size = 'modal-medium' }) {
        const modal = document.createElement('div');
        modal.className = `modal-overlay ${id ? '' : 'temp-modal'}`;
        if (id) modal.id = id;

        modal.innerHTML = `
            <div class="modal ${size}">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="btn btn-icon close-modal">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-content">${content}</div>
                <div class="modal-footer">${footer}</div>
            </div>
        `;

        const closeModal = () => modal.remove();
        modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal();
        });
        
        return modal;
    }

    showConfirmModal({ title, message, onConfirm }) {
        const modal = this._createModal({
            title,
            content: `<p>${message}</p>`,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button id="confirm-action" class="btn btn-danger">Confirm</button>
            `
        });
        document.body.appendChild(modal);
        modal.querySelector('#confirm-action').addEventListener('click', () => {
            onConfirm();
            modal.remove();
        });
    }
    
    showUserProfileModal() {
        return new Promise((resolve) => {
            const modal = this._createModal({
                title: 'Welcome! Please enter your name',
                content: `
                    <p>This will be used to identify you in the roster system.</p>
                    <input type="text" id="user-name-input" placeholder="Your name" class="form-input" style="width: 100%;">
                    <div id="name-error" style="display: none; color: var(--danger); margin-top: 0.5rem;">Please enter a valid name.</div>
                `,
                footer: `<button id="save-user-profile" class="btn btn-primary">Save Profile</button>`
            });
            
            // Handle promise resolution on close
            const originalClose = modal.querySelector('.close-modal').onclick;
            modal.querySelector('.close-modal').onclick = () => {
                originalClose();
                resolve({ cancelled: true });
            };
            modal.addEventListener('click', e => {
                if (e.target === modal) resolve({ cancelled: true });
            });

            document.body.appendChild(modal);

            const input = modal.querySelector('#user-name-input');
            const errorDiv = modal.querySelector('#name-error');
            const saveButton = modal.querySelector('#save-user-profile');
            
            const saveProfile = async () => {
                const name = input.value.trim();
                if (name && name.length >= 2) {
                    await this.app.saveUserProfile(name);
                    modal.remove();
                    resolve({ cancelled: false });
                } else {
                    errorDiv.style.display = 'block';
                }
            };

            saveButton.addEventListener('click', saveProfile);
            input.addEventListener('keypress', e => e.key === 'Enter' && saveProfile());
            input.addEventListener('input', () => errorDiv.style.display = 'none');
            setTimeout(() => input.focus(), 100);
        });
    }
    
    showSkillsMatrixModal() {
        const modal = this._createModal({
            title: 'Skills Matrix',
            size: 'modal-fullscreen',
            content: `<div class="skills-matrix-container">${this.renderSkillsMatrix()}</div>`,
            footer: `
                <button class="btn btn-ghost close-modal">Close</button>
                <button id="save-skills" class="btn btn-primary">Save Skills Matrix</button>`
        });
        document.body.appendChild(modal);
        modal.querySelector('#save-skills').addEventListener('click', () => {
            this.app.saveSkillsMatrix(modal);
            modal.remove();
        });
    }
    
    renderSkillsMatrix() {
        const tasks = this.app.state.tasks.filter(t => t.type === 'task');
        return `
            <table class="skills-matrix-table">
                <thead>
                    <tr>
                        <th>Staff Member</th>
                        ${tasks.map(task => `<th class="task-header" title="${task.name}">${task.name}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${this.app.state.staff.map(staff => `
                        <tr>
                            <td class="staff-name">${staff.name}</td>
                            ${tasks.map(task => {
                                const skillLevel = this.app.skillsManager.getStaffTaskSkill(staff.id, task.id);
                                return `
                                    <td class="skill-cell">
                                        <select class="skill-select" data-staff="${staff.id}" data-task="${task.id}">
                                            ${[0,1,2,3,4,5].map(level => `<option value="${level}" ${skillLevel === level ? 'selected' : ''}>${level}</option>`).join('')}
                                        </select>
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    // ===== ENHANCED LEAVE ROSTER SYSTEM =====

    showLeaveRosterModal() {
        const modal = this._createModal({
            title: 'Leave & Phone Roster',
            size: 'modal-fullscreen',
            content: `
                <div class="calendar-nav">
                    <button class="btn btn-icon" id="prev-month-leave"><span class="material-icons">chevron_left</span></button>
                    <h3 id="leave-month-display"></h3>
                    <button class="btn btn-icon" id="next-month-leave"><span class="material-icons">chevron_right</span></button>
                </div>
                <div id="leave-roster-grid"></div>
            `,
            footer: `
                ${this.app.state.buildMode ? `
                    <button id="generate-monthly-shifts" class="btn btn-secondary">
                        <span class="material-icons">auto_awesome</span>
                        Generate Monthly Phone Shifts
                    </button>
                ` : ''}
                <button id="add-my-leave" class="btn btn-primary">
                    <span class="material-icons">event_note</span>
                    Add My Leave
                </button>
                <button class="btn btn-ghost close-modal">Close</button>
            `
        });
        document.body.appendChild(modal);

        const updateView = () => {
            modal.querySelector('#leave-month-display').textContent = `${DateUtils.getMonthName(this.app.state.currentLeaveDate)} ${this.app.state.currentLeaveDate.getFullYear()}`;
            modal.querySelector('#leave-roster-grid').innerHTML = this.renderLeaveRosterGrid();
            this.setupLeaveRosterEventListeners(modal);
        };

        // Navigation events
        modal.querySelector('#prev-month-leave').addEventListener('click', () => {
            this.app.state.currentLeaveDate.setMonth(this.app.state.currentLeaveDate.getMonth() - 1);
            updateView();
        });
        
        modal.querySelector('#next-month-leave').addEventListener('click', () => {
            this.app.state.currentLeaveDate.setMonth(this.app.state.currentLeaveDate.getMonth() + 1);
            updateView();
        });

        // Generate monthly shifts (build mode only)
        if (this.app.state.buildMode) {
            modal.querySelector('#generate-monthly-shifts')?.addEventListener('click', () => {
                this.app.generateMonthlyPhoneRoster();
                updateView();
                NotificationManager.show('Monthly phone shifts generated', 'success');
            });
        }

        // Add personal leave
        modal.querySelector('#add-my-leave').addEventListener('click', () => {
            this.showPersonalLeaveModal();
        });

        updateView();
    }

    renderLeaveRosterGrid() {
        const workingDays = DateUtils.getWorkingDaysInMonth(this.app.state.currentLeaveDate);
        const currentUserName = this.app.state.userProfile?.name || 'You';
        
        return `
            <div class="leave-roster-controls">
                <div class="roster-info">
                    <p><strong>Instructions:</strong></p>
                    <ul>
                        <li>Click on your name in phone shifts to request a swap</li>
                        <li>Click "Add Leave" to add your own leave</li>
                        <li>Original assignments shown with strikethrough when swapped</li>
                        ${this.app.state.buildMode ? '<li><strong>Build Mode:</strong> Generate monthly shifts available</li>' : ''}
                    </ul>
                </div>
            </div>
            <table class="leave-roster-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Early Shift</th>
                        <th>Late Shift</th>
                        <th>Leave</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${workingDays.map(date => {
                        const isoDate = DateUtils.toISODate(date);
                        const phoneData = this.app.state.phoneRoster[isoDate] || {};
                        const leaveData = this.app.state.leaveRoster[isoDate] || {};
                        const swapData = this.app.state.shiftSwaps[isoDate] || {};
                        
                        const renderShiftWithSwaps = (staffIds, shiftType) => {
                            if (!staffIds || staffIds.length === 0) return '<span class="no-assignment">Not assigned</span>';
                            
                            return staffIds.map(staffId => {
                                const staff = this.app.getStaffById(staffId);
                                const staffName = staff?.name || 'Unknown';
                                const swapKey = `${shiftType}_${staffId}`;
                                const swappedTo = swapData[swapKey];
                                const isCurrentUser = staffName === currentUserName;
                                
                                if (swappedTo) {
                                    const swappedStaff = this.app.getStaffById(swappedTo);
                                    const swappedName = swappedStaff?.name || 'Unknown';
                                    return `
                                        <div class="shift-assignment swapped">
                                            <span class="original-assignment strikethrough">${staffName}</span>
                                            <span class="swap-arrow">→</span>
                                            <span class="swapped-assignment">${swappedName}</span>
                                            ${this.app.state.buildMode || isCurrentUser ? `
                                                <button class="btn btn-small btn-ghost undo-swap" 
                                                        data-date="${isoDate}" 
                                                        data-shift="${shiftType}" 
                                                        data-staff="${staffId}"
                                                        title="Undo swap">
                                                    <span class="material-icons">undo</span>
                                                </button>
                                            ` : ''}
                                        </div>
                                    `;
                                } else {
                                    return `
                                        <div class="shift-assignment normal">
                                            <span class="staff-name ${isCurrentUser ? 'current-user' : ''}">${staffName}</span>
                                            ${this.app.state.buildMode || isCurrentUser ? `
                                                <button class="btn btn-small btn-outline request-swap" 
                                                        data-date="${isoDate}" 
                                                        data-shift="${shiftType}" 
                                                        data-staff="${staffId}"
                                                        title="Request shift swap">
                                                    <span class="material-icons">swap_horiz</span>
                                                </button>
                                            ` : ''}
                                        </div>
                                    `;
                                }
                            }).join('<br>');
                        };
                        
                        const earlyShift = renderShiftWithSwaps(phoneData.early, 'early');
                        const lateShift = renderShiftWithSwaps(phoneData.late, 'late');
                        
                        const leaveEntries = Object.entries(leaveData).map(([staffId, comment]) => {
                            const staff = this.app.getStaffById(staffId);
                            const staffName = staff?.name || 'Unknown';
                            const isCurrentUser = staffName === currentUserName;
                            
                            return `
                                <div class="leave-entry ${isCurrentUser ? 'current-user-leave' : ''}">
                                    <span class="leave-staff">${staffName}:</span>
                                    <span class="leave-details">${comment}</span>
                                    ${this.app.state.buildMode || isCurrentUser ? `
                                        <button class="btn btn-small btn-ghost edit-leave" 
                                                data-date="${isoDate}" 
                                                data-staff="${staffId}"
                                                title="Edit leave">
                                            <span class="material-icons">edit</span>
                                        </button>
                                        <button class="btn btn-small btn-ghost remove-leave" 
                                                data-date="${isoDate}" 
                                                data-staff="${staffId}"
                                                title="Remove leave">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('');
                        
                        const dayName = DateUtils.getDayName(date).substring(0, 3);
                        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;
                        
                        return `
                            <tr class="roster-day-row">
                                <td class="date-cell">${formattedDate}</td>
                                <td class="day-cell">${dayName}</td>
                                <td class="shift-cell early-shift-cell">${earlyShift}</td>
                                <td class="shift-cell late-shift-cell">${lateShift}</td>
                                <td class="leave-cell">
                                    ${leaveEntries || '<span class="no-leave">None</span>'}
                                </td>
                                <td class="actions-cell">
                                    <button class="btn btn-small btn-primary add-leave-btn" 
                                            data-date="${isoDate}"
                                            title="Add leave for this day">
                                        <span class="material-icons">add</span>
                                        Add Leave
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    setupLeaveRosterEventListeners(modal) {
        // Add leave buttons
        modal.querySelectorAll('.add-leave-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.add-leave-btn').dataset.date;
                this.showAddLeaveModal(new Date(date));
            });
        });

        // Edit leave buttons
        modal.querySelectorAll('.edit-leave').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.edit-leave').dataset.date;
                const staffId = e.target.closest('.edit-leave').dataset.staff;
                this.showEditLeaveModal(new Date(date), staffId);
            });
        });

        // Remove leave buttons
        modal.querySelectorAll('.remove-leave').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.remove-leave').dataset.date;
                const staffId = e.target.closest('.remove-leave').dataset.staff;
                this.removeLeave(date, staffId);
            });
        });

        // Request swap buttons
        modal.querySelectorAll('.request-swap').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.request-swap').dataset.date;
                const shift = e.target.closest('.request-swap').dataset.shift;
                const staffId = e.target.closest('.request-swap').dataset.staff;
                this.showSwapRequestModal(new Date(date), shift, staffId);
            });
        });

        // Undo swap buttons
        modal.querySelectorAll('.undo-swap').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.target.closest('.undo-swap').dataset.date;
                const shift = e.target.closest('.undo-swap').dataset.shift;
                const staffId = e.target.closest('.undo-swap').dataset.staff;
                this.undoSwap(date, shift, staffId);
            });
        });
    }

    showPersonalLeaveModal() {
        const userProfile = this.app.state.userProfile;
        if (!userProfile) {
            NotificationManager.show('Please set up your user profile first', 'warning');
            return;
        }

        const modal = this._createModal({
            title: 'Add My Leave',
            content: `
                <div class="personal-leave-form">
                    <div class="user-info">
                        <span class="material-icons">person</span>
                        <span>Adding leave for: <strong>${userProfile.name}</strong></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="leave-start-date">Start Date:</label>
                        <input type="date" id="leave-start-date" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="leave-end-date">End Date (optional):</label>
                        <input type="date" id="leave-end-date" class="form-input">
                        <small>Leave blank for single day</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="leave-type">Leave Type:</label>
                        <select id="leave-type" class="form-input">
                            <option value="AL">Annual Leave (AL)</option>
                            <option value="SL">Sick Leave (SL)</option>
                            <option value="PL">Personal Leave (PL)</option>
                            <option value="5hr">5 Hour Day</option>
                            <option value="early">Early Finish</option>
                            <option value="late">Late Start</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="leave-details">Additional Details:</label>
                        <input type="text" id="leave-details" class="form-input" 
                               placeholder="e.g., finishing at 3pm, doctor appointment">
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button id="save-personal-leave" class="btn btn-primary">
                    <span class="material-icons">save</span>
                    Save My Leave
                </button>
            `
        });

        document.body.appendChild(modal);

        modal.querySelector('#save-personal-leave').addEventListener('click', () => {
            this.savePersonalLeave(modal);
        });

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        modal.querySelector('#leave-start-date').min = today;
        modal.querySelector('#leave-end-date').min = today;

        // Update end date minimum when start date changes
        modal.querySelector('#leave-start-date').addEventListener('change', (e) => {
            modal.querySelector('#leave-end-date').min = e.target.value;
        });
    }

    savePersonalLeave(modal) {
        const userProfile = this.app.state.userProfile;
        if (!userProfile) return;

        const startDate = modal.querySelector('#leave-start-date').value;
        const endDate = modal.querySelector('#leave-end-date').value;
        const leaveType = modal.querySelector('#leave-type').value;
        const details = modal.querySelector('#leave-details').value.trim();

        if (!startDate) {
            NotificationManager.show('Please select a start date', 'warning');
            return;
        }

        // Build leave description
        let leaveDescription = leaveType;
        if (details) {
            leaveDescription += ` - ${details}`;
        }

        // Apply leave to date range
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : start;
        
        let daysAdded = 0;
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            if (DateUtils.isWorkingDay(date)) {
                const isoDate = DateUtils.toISODate(date);
                
                if (!this.app.state.leaveRoster[isoDate]) {
                    this.app.state.leaveRoster[isoDate] = {};
                }
                
                this.app.state.leaveRoster[isoDate][userProfile.id] = leaveDescription;
                daysAdded++;
            }
        }

        this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
        this.app.state.lastLeaveUpdate = new Date().toISOString();
        this.app.debouncedSave();

        modal.remove();
        
        const message = daysAdded === 1 
            ? 'Leave added for 1 working day'
            : `Leave added for ${daysAdded} working days`;
        
        NotificationManager.show(message, 'success');
        
        // Refresh leave roster if open
        const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
        if (leaveModal) {
            this.showLeaveRosterModal();
        }
    }

    showAddLeaveModal(date) {
        const userProfile = this.app.state.userProfile;
        if (!userProfile) {
            NotificationManager.show('Please set up your user profile first', 'warning');
            return;
        }

        const modal = this._createModal({
            title: `Add Leave - ${DateUtils.formatDate(date)}`,
            content: `
                <div class="personal-leave-form">
                    <div class="user-info">
                        <span class="material-icons">person</span>
                        <span>Adding leave for: <strong>${userProfile.name}</strong></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="single-leave-type">Leave Type:</label>
                        <select id="single-leave-type" class="form-input">
                            <option value="AL">Annual Leave (AL)</option>
                            <option value="SL">Sick Leave (SL)</option>
                            <option value="PL">Personal Leave (PL)</option>
                            <option value="5hr">5 Hour Day</option>
                            <option value="early">Early Finish</option>
                            <option value="late">Late Start</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="single-leave-details">Additional Details:</label>
                        <input type="text" id="single-leave-details" class="form-input" 
                               placeholder="e.g., finishing at 3pm, doctor appointment">
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button id="save-single-leave" class="btn btn-primary">
                    <span class="material-icons">save</span>
                    Save Leave
                </button>
            `
        });

        document.body.appendChild(modal);

        modal.querySelector('#save-single-leave').addEventListener('click', () => {
            const leaveType = modal.querySelector('#single-leave-type').value;
            const details = modal.querySelector('#single-leave-details').value.trim();

            let leaveDescription = leaveType;
            if (details) {
                leaveDescription += ` - ${details}`;
            }

            const isoDate = DateUtils.toISODate(date);
            
            if (!this.app.state.leaveRoster[isoDate]) {
                this.app.state.leaveRoster[isoDate] = {};
            }
            
            this.app.state.leaveRoster[isoDate][userProfile.id] = leaveDescription;

            this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
            this.app.state.lastLeaveUpdate = new Date().toISOString();
            this.app.debouncedSave();

            modal.remove();
            NotificationManager.show('Leave added successfully', 'success');
            
            // Refresh leave roster if open
            const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
            if (leaveModal) {
                this.showLeaveRosterModal();
            }
        });
    }

    showEditLeaveModal(date, staffId) {
        const currentUser = this.app.state.userProfile;
        const staff = this.app.getStaffById(staffId);
        
        // Check permissions
        const canEdit = this.app.state.buildMode || (currentUser && staff && currentUser.name === staff.name);
        
        if (!canEdit) {
            NotificationManager.show('You can only edit your own leave', 'warning');
            return;
        }

        const isoDate = DateUtils.toISODate(date);
        const currentLeave = this.app.state.leaveRoster[isoDate]?.[staffId] || '';

        const modal = this._createModal({
            title: `Edit Leave - ${DateUtils.formatDate(date)}`,
            content: `
                <div class="personal-leave-form">
                    <div class="user-info">
                        <span class="material-icons">person</span>
                        <span>Editing leave for: <strong>${staff?.name}</strong></span>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-leave-details">Leave Details:</label>
                        <input type="text" id="edit-leave-details" class="form-input" 
                               value="${currentLeave}"
                               placeholder="e.g., AL - finishing at 3pm">
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button id="save-edited-leave" class="btn btn-primary">
                    <span class="material-icons">save</span>
                    Save Changes
                </button>
            `
        });

        document.body.appendChild(modal);

        modal.querySelector('#save-edited-leave').addEventListener('click', () => {
            const newDetails = modal.querySelector('#edit-leave-details').value.trim();

            if (newDetails) {
                this.app.state.leaveRoster[isoDate][staffId] = newDetails;
            } else {
                delete this.app.state.leaveRoster[isoDate][staffId];
                if (Object.keys(this.app.state.leaveRoster[isoDate]).length === 0) {
                    delete this.app.state.leaveRoster[isoDate];
                }
            }

            this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
            this.app.state.lastLeaveUpdate = new Date().toISOString();
            this.app.debouncedSave();

            modal.remove();
            NotificationManager.show('Leave updated successfully', 'success');
            
            // Refresh leave roster if open
            const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
            if (leaveModal) {
                this.showLeaveRosterModal();
            }
        });
    }

    showSwapRequestModal(date, shiftType, originalStaffId) {
        const isoDate = DateUtils.toISODate(date);
        const dayName = DateUtils.getDayName(date);
        const originalStaff = this.app.getStaffById(originalStaffId);
        const currentUser = this.app.state.userProfile;
        
        // Check if current user is the original staff member or in build mode
        const canSwap = this.app.state.buildMode || (currentUser && originalStaff && currentUser.name === originalStaff.name);
        
        if (!canSwap) {
            NotificationManager.show('You can only swap your own shifts', 'warning');
            return;
        }

        // Get available staff for swap
        const availableStaff = this.app.state.staff.filter(s => {
            if (s.id === originalStaffId) return false;
            if (!s.workDays.includes(dayName)) return false;
            if (this.app.assignmentGenerator.getStaffLeave(s.id, date)) return false;
            
            // Check if already assigned to other shift
            const phoneData = this.app.state.phoneRoster[isoDate];
            const otherShift = shiftType === 'early' ? 'late' : 'early';
            if (phoneData && phoneData[otherShift] && phoneData[otherShift].includes(s.id)) return false;
            
            return true;
        });

        const modal = this._createModal({
            title: `Request ${shiftType === 'early' ? 'Early' : 'Late'} Shift Swap`,
            content: `
                <div class="swap-request-info">
                    <div class="swap-details">
                        <span class="material-icons">swap_horiz</span>
                        <div>
                            <p><strong>Date:</strong> ${DateUtils.formatDate(date)}</p>
                            <p><strong>Shift:</strong> ${shiftType === 'early' ? 'Early' : 'Late'}</p>
                            <p><strong>Original Assignment:</strong> ${originalStaff?.name}</p>
                        </div>
                    </div>
                </div>
                
                ${availableStaff.length > 0 ? `
                    <div class="swap-staff-selection">
                        <h3>Select replacement staff:</h3>
                        <div class="staff-selection">
                            ${availableStaff.map(staff => `
                                <div class="staff-option">
                                    <label class="staff-checkbox">
                                        <input type="radio" name="swap-replacement" value="${staff.id}">
                                        <span class="staff-name">${staff.name}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="no-staff-available">
                        <span class="material-icons">info</span>
                        <p>No available staff for this swap on ${DateUtils.formatDate(date)}</p>
                    </div>
                `}
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                ${availableStaff.length > 0 ? `
                    <button id="confirm-swap" class="btn btn-primary">
                        <span class="material-icons">swap_horiz</span>
                        Confirm Swap
                    </button>
                ` : ''}
            `
        });

        document.body.appendChild(modal);

        if (availableStaff.length > 0) {
            modal.querySelector('#confirm-swap').addEventListener('click', () => {
                const selectedStaff = modal.querySelector('input[name="swap-replacement"]:checked')?.value;
                if (selectedStaff) {
                    this.confirmSwap(isoDate, shiftType, originalStaffId, selectedStaff);
                    modal.remove();
                } else {
                    NotificationManager.show('Please select a replacement staff member', 'warning');
                }
            });
        }
    }

    confirmSwap(isoDate, shiftType, originalStaffId, replacementStaffId) {
        const swapKey = `${shiftType}_${originalStaffId}`;
        
        if (!this.app.state.shiftSwaps[isoDate]) {
            this.app.state.shiftSwaps[isoDate] = {};
        }
        
        this.app.state.shiftSwaps[isoDate][swapKey] = replacementStaffId;
        
        this.app.debouncedSave();
        
        const originalStaff = this.app.getStaffById(originalStaffId);
        const replacementStaff = this.app.getStaffById(replacementStaffId);
        
        NotificationManager.show(
            `Shift swap confirmed: ${replacementStaff?.name} will cover ${originalStaff?.name}'s ${shiftType} shift`,
            'success'
        );
        
        // Refresh leave roster if open
        const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
        if (leaveModal) {
            this.showLeaveRosterModal();
        }
    }

    undoSwap(isoDate, shiftType, originalStaffId) {
        const swapKey = `${shiftType}_${originalStaffId}`;
        
        if (this.app.state.shiftSwaps[isoDate] && this.app.state.shiftSwaps[isoDate][swapKey]) {
            delete this.app.state.shiftSwaps[isoDate][swapKey];
            
            // Clean up empty swap data
            if (Object.keys(this.app.state.shiftSwaps[isoDate]).length === 0) {
                delete this.app.state.shiftSwaps[isoDate];
            }
            
            this.app.debouncedSave();
            
            NotificationManager.show('Shift swap undone', 'success');
            
            // Refresh leave roster if open
            const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
            if (leaveModal) {
                this.showLeaveRosterModal();
            }
        }
    }

    removeLeave(isoDate, staffId) {
        const currentUser = this.app.state.userProfile;
        const staff = this.app.getStaffById(staffId);
        
        // Check permissions
        const canRemove = this.app.state.buildMode || (currentUser && staff && currentUser.name === staff.name);
        
        if (!canRemove) {
            NotificationManager.show('You can only remove your own leave', 'warning');
            return;
        }

        if (this.app.state.leaveRoster[isoDate]) {
            delete this.app.state.leaveRoster[isoDate][staffId];
            
            // Clean up empty leave data
            if (Object.keys(this.app.state.leaveRoster[isoDate]).length === 0) {
                delete this.app.state.leaveRoster[isoDate];
            }
            
            this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
            this.app.state.lastLeaveUpdate = new Date().toISOString();
            this.app.debouncedSave();
            
            NotificationManager.show('Leave removed', 'success');
            
            // Refresh leave roster if open
            const leaveModal = document.querySelector('#leave-modal:not(.hidden)');
            if (leaveModal) {
                this.showLeaveRosterModal();
            }
        }
    }

    showManageModal() {
        const modal = this._createModal({
            title: 'System Management',
            size: 'modal-large',
            content: this.renderManageContent(),
            footer: `<button class="btn btn-ghost close-modal">Close</button>`
        });
        document.body.appendChild(modal);
        this.addManageEventListeners(modal);
    }
    
    renderManageContent() {
        const staffListHtml = this.app.state.staff.map(s => `<div class="item-card" data-id="${s.id}">${s.name}<button class="btn btn-icon remove-btn"><span class="material-icons">delete</span></button></div>`).join('');
        const taskListHtml = this.app.state.tasks.filter(t => t.type === 'task').map(t => `<div class="item-card" data-id="${t.id}">${t.name}<button class="btn btn-icon remove-btn"><span class="material-icons">delete</span></button></div>`).join('');
        const lockListHtml = this.app.state.lockedMonths.map(m => `<div class="item-card" data-month="${m}">${m}<button class="btn btn-icon remove-btn"><span class="material-icons">lock_open</span></button></div>`).join('');

        return `
            <div class="manage-grid">
                <div class="manage-section">
                    <div class="section-header">
                        <span class="material-icons">people</span>
                        <h3>Staff Management</h3>
                    </div>
                    <div id="staff-list" class="item-list">${staffListHtml}</div>
                    <div class="add-form">
                        <input type="text" id="new-staff-name" placeholder="New staff name" class="form-input">
                        <button id="add-staff-btn" class="btn btn-primary">
                            <span class="material-icons">add</span>
                            Add
                        </button>
                    </div>
                </div>
                <div class="manage-section">
                    <div class="section-header">
                        <span class="material-icons">task</span>
                        <h3>Task Management</h3>
                    </div>
                    <div id="task-list" class="item-list">${taskListHtml}</div>
                    <div class="add-form">
                        <input type="text" id="new-task-name" placeholder="New task name" class="form-input">
                        <button id="add-task-btn" class="btn btn-primary">
                            <span class="material-icons">add</span>
                            Add
                        </button>
                    </div>
                </div>
                <div class="manage-section">
                    <div class="section-header">
                        <span class="material-icons">lock</span>
                        <h3>Roster Locks</h3>
                    </div>
                    <div id="lock-list" class="item-list">${lockListHtml}</div>
                    <div class="add-form">
                        <input type="month" id="new-lock-month" class="form-input">
                        <button id="add-lock-btn" class="btn btn-danger">
                            <span class="material-icons">lock</span>
                            Lock Month
                        </button>
                    </div>
                </div>
            </div>
            <div class="manage-actions">
                <button id="configuration-btn" class="btn btn-primary">
                    <span class="material-icons">settings</span>
                    Configuration
                </button>
                <button id="export-data-btn" class="btn btn-secondary">
                    <span class="material-icons">download</span>
                    Export Data
                </button>
                <label for="import-data-input" class="btn btn-secondary">
                    <span class="material-icons">upload</span>
                    Import Data
                </label>
                <input type="file" id="import-data-input" accept=".json" style="display: none;">
                <button id="clear-data-btn" class="btn btn-danger">
                    <span class="material-icons">delete_forever</span>
                    Clear All Data
                </button>
            </div>
        `;
    }
    
    addManageEventListeners(modal) {
        // Staff
        modal.querySelector('#add-staff-btn').addEventListener('click', () => {
            const input = modal.querySelector('#new-staff-name');
            if (input.value.trim()) {
                this.app.addStaff(input.value.trim());
                modal.remove();
                this.showManageModal();
            }
        });
        modal.querySelectorAll('#staff-list .remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.item-card').dataset.id;
                this.app.removeStaff(id);
                modal.remove();
                this.showManageModal();
            });
        });

        // Tasks
        modal.querySelector('#add-task-btn').addEventListener('click', () => {
            const input = modal.querySelector('#new-task-name');
            if (input.value.trim()) {
                this.app.addTask(input.value.trim());
                modal.remove();
                this.showManageModal();
            }
        });
        modal.querySelectorAll('#task-list .remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.item-card').dataset.id;
                this.app.removeTask(id);
                modal.remove();
                this.showManageModal();
            });
        });

        // Locks
        modal.querySelector('#add-lock-btn').addEventListener('click', () => {
            const input = modal.querySelector('#new-lock-month');
            if (input.value) {
                this.app.addMonthLock(input.value);
                modal.remove();
                this.showManageModal();
            }
        });
        modal.querySelectorAll('#lock-list .remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const month = e.target.closest('.item-card').dataset.month;
                this.app.removeMonthLock(month);
                modal.remove();
                this.showManageModal();
            });
        });

        // Configuration
        modal.querySelector('#configuration-btn').addEventListener('click', () => {
            modal.remove();
            this.app.modalManager.showConfigurationModal();
        });

        // Data
        modal.querySelector('#export-data-btn').addEventListener('click', () => this.app.dataManager.export());
        modal.querySelector('#import-data-input').addEventListener('change', (e) => {
            this.app.importData(e.target.files[0]);
            modal.remove();
        });
        modal.querySelector('#clear-data-btn').addEventListener('click', () => {
            modal.remove();
            this.app.confirmClearData();
        });
    }

    showInfoModal(title, message) {
        const modal = this._createModal({
            title,
            content: `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; max-height: 400px; overflow-y: auto;">${message}</pre>`,
            footer: `<button class="btn btn-primary close-modal">Close</button>`
        });
        document.body.appendChild(modal);
    }
}

// ===== Notification Manager (Static Class) =====
export class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            notification.addEventListener('animationend', () => notification.remove());
        }, duration);
    }
}