// ===== MODULE: Modal Manager =====
// Manages all modal dialogs and popup interactions.

import { DateUtils, StringUtils } from './utils.js';
import { NotificationManager } from './ui.js';

export class ModalManager {
    constructor(app) {
        this.app = app;
    }

    // ===== WOH EDITING MODAL - ENHANCED AND FIXED =====
    
    showWOHEditModal(taskId) {
        if (!taskId || taskId === 'undefined' || taskId === '') {
            console.error('showWOHEditModal called with invalid taskId:', taskId);
            NotificationManager.show('Error: Invalid task ID', 'error');
            return;
        }

        const task = this.app.state.tasks.find(t => t.id === taskId);
        if (!task) {
            console.error('Task not found for taskId:', taskId);
            NotificationManager.show('Error: Task not found', 'error');
            return;
        }

        const currentPriority = this.app.state.priorityTasks[taskId] || {};
        
        console.log('Opening WOH modal for:', task.name, 'Current data:', currentPriority);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-medium">
                <div class="modal-header">
                    <h2>Edit WOH - ${task.name}</h2>
                    <button class="btn btn-icon close-modal">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="woh-form">
                        <div class="form-group">
                            <label for="woh-count">Work on Hand Count:</label>
                            <input type="number" id="woh-count" class="form-input" 
                                   value="${currentPriority.count || ''}" 
                                   min="0" 
                                   max="9999"
                                   placeholder="Enter number of items">
                            <small>Number of items in queue for this task</small>
                        </div>
                        <div class="form-group">
                            <label for="woh-date">Oldest Item Date:</label>
                            <input type="date" id="woh-date" class="form-input" 
                                   value="${currentPriority.oldestDate || ''}">
                            <small>Date of the oldest item in queue</small>
                        </div>
                        <div class="woh-preview" id="woh-preview">
                            <h4>Live Preview:</h4>
                            <div class="preview-content">
                                <div class="woh-display-preview">
                                    <div class="count-display">${currentPriority.count || '-'}</div>
                                    <div class="date-display">${currentPriority.oldestDate ? DateUtils.formatWOHDate(currentPriority.oldestDate) : '-'}</div>
                                </div>
                                <div class="sla-info">
                                    <p><strong>Current Age:</strong> 
                                       <span id="current-age">${this.calculateAge(currentPriority.oldestDate)}</span> days
                                    </p>
                                    <p><strong>SLA Status:</strong> 
                                       <span id="current-sla" class="${this.getSLAClass(currentPriority.oldestDate)}">${this.getSLAStatus(currentPriority.oldestDate)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="woh-quick-actions">
                            <h4>Quick Actions:</h4>
                            <button type="button" class="btn btn-small btn-secondary" id="set-today">Set Date to Today</button>
                            <button type="button" class="btn btn-small btn-secondary" id="add-one-day">+1 Day Age</button>
                            <button type="button" class="btn btn-small btn-secondary" id="sub-one-day">-1 Day Age</button>
                            <button type="button" class="btn btn-small btn-warning" id="set-sla-critical">Set SLA Critical (11 days)</button>
                            <button type="button" class="btn btn-small btn-danger" id="set-sla-breach">Set SLA Breach (14 days)</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost close-modal">Cancel</button>
                    <button class="btn btn-danger clear-woh">Clear WOH</button>
                    <button class="btn btn-primary save-woh">Save WOH Data</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Get form elements
        const countInput = modal.querySelector('#woh-count');
        const dateInput = modal.querySelector('#woh-date');
        
        // Live preview updates
        const updatePreview = () => {
            const count = parseInt(countInput.value) || 0;
            const date = dateInput.value || '';
            
            const countDisplay = modal.querySelector('.count-display');
            const dateDisplay = modal.querySelector('.date-display');
            const ageDisplay = modal.querySelector('#current-age');
            const slaDisplay = modal.querySelector('#current-sla');
            
            countDisplay.textContent = count || '-';
            dateDisplay.textContent = date ? DateUtils.formatWOHDate(date) : '-';
            
            const age = this.calculateAge(date);
            const slaStatus = this.getSLAStatus(date);
            const slaClass = this.getSLAClass(date);
            
            ageDisplay.textContent = age;
            slaDisplay.textContent = slaStatus;
            slaDisplay.className = slaClass;
        };

        // Event listeners for live preview
        countInput.addEventListener('input', updatePreview);
        dateInput.addEventListener('change', updatePreview);

        // Quick action buttons
        modal.querySelector('#set-today').addEventListener('click', () => {
            dateInput.value = new Date().toISOString().split('T')[0];
            updatePreview();
        });

        modal.querySelector('#add-one-day').addEventListener('click', () => {
            if (dateInput.value) {
                const date = new Date(dateInput.value);
                date.setDate(date.getDate() - 1); // Subtract 1 day to make item older
                dateInput.value = date.toISOString().split('T')[0];
                updatePreview();
            }
        });

        modal.querySelector('#sub-one-day').addEventListener('click', () => {
            if (dateInput.value) {
                const date = new Date(dateInput.value);
                date.setDate(date.getDate() + 1); // Add 1 day to make item younger
                dateInput.value = date.toISOString().split('T')[0];
                updatePreview();
            }
        });

        modal.querySelector('#set-sla-critical').addEventListener('click', () => {
            const date = new Date();
            date.setDate(date.getDate() - 11); // 11 days ago
            dateInput.value = date.toISOString().split('T')[0];
            if (!countInput.value) countInput.value = '1';
            updatePreview();
        });

        modal.querySelector('#set-sla-breach').addEventListener('click', () => {
            const date = new Date();
            date.setDate(date.getDate() - 14); // 14 days ago
            dateInput.value = date.toISOString().split('T')[0];
            if (!countInput.value) countInput.value = '1';
            updatePreview();
        });

        // Enhanced save functionality
        modal.querySelector('.save-woh').addEventListener('click', () => {
            const count = parseInt(countInput.value) || 0;
            const oldestDate = dateInput.value || '';
            
            console.log('Saving WOH data:', { taskId, count, oldestDate });
            
            if (count > 0 || oldestDate) {
                if (!this.app.state.priorityTasks) {
                    this.app.state.priorityTasks = {};
                }
                this.app.state.priorityTasks[taskId] = { 
                    count: count.toString(), 
                    oldestDate: oldestDate 
                };
                console.log('WOH data saved to state:', this.app.state.priorityTasks[taskId]);
            } else {
                // Clear the WOH data if both are empty
                if (this.app.state.priorityTasks && this.app.state.priorityTasks[taskId]) {
                    delete this.app.state.priorityTasks[taskId];
                }
            }
            
            // Force save and refresh
            this.app.debouncedSave();
            setTimeout(() => {
                this.app.uiManager.render();
            }, 100);
            
            modal.remove();
            NotificationManager.show(`WOH data updated for ${task.name}`, 'success');
        });

        // Clear WOH functionality
        modal.querySelector('.clear-woh').addEventListener('click', () => {
            if (this.app.state.priorityTasks && this.app.state.priorityTasks[taskId]) {
                delete this.app.state.priorityTasks[taskId];
            }
            this.app.debouncedSave();
            this.app.uiManager.render();
            modal.remove();
            NotificationManager.show(`WOH data cleared for ${task.name}`, 'success');
        });

        this.setupModalCloseHandlers(modal);
    }

    // Helper methods for WOH modal
    calculateAge(dateStr) {
        if (!dateStr) return 0;
        const oldestDate = new Date(dateStr);
        const today = new Date();
        const diffTime = Math.abs(today - oldestDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getSLAStatus(dateStr) {
        const age = this.calculateAge(dateStr);
        if (age === 0) return 'No date set';
        if (age > 14) return `🚨 BREACHED (${age - 14} days over)`;
        if (age >= 11) return `⚠️ CRITICAL (${14 - age} days to breach)`;
        if (age >= 8) return `📋 WARNING (${14 - age} days to breach)`;
        if (age >= 5) return `📝 MONITORING (${14 - age} days to breach)`;
        return `✅ COMPLIANT (${14 - age} days to breach)`;
    }

    getSLAClass(dateStr) {
        const age = this.calculateAge(dateStr);
        if (age === 0) return 'sla-none';
        if (age > 14) return 'sla-breached';
        if (age >= 11) return 'sla-critical';
        if (age >= 8) return 'sla-warning';
        if (age >= 5) return 'sla-monitoring';
        return 'sla-compliant';
    }

    // ===== STAFF MANAGEMENT MODAL =====

    showStaffManagementModal() {
        const modal = this.createModal({
            title: 'Staff Management',
            size: 'modal-large',
            content: this.renderStaffManagementContent(),
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });
        this.setupStaffManagementHandlers(modal);
        document.body.appendChild(modal);
    }

    renderStaffManagementContent() {
        return `
            <div class="staff-management">
                <div class="staff-form">
                    <h3>Add New Staff Member</h3>
                    <div class="form-group">
                        <label for="staff-name">Name:</label>
                        <input type="text" id="staff-name" class="form-input" placeholder="Enter staff name">
                    </div>
                    <div class="form-group">
                        <label>Working Days:</label>
                        <div class="checkbox-group">
                            ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="work-days" value="${day}" checked>
                                    <span>${StringUtils.capitalize(day)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    <button class="btn btn-primary add-staff">Add Staff Member</button>
                </div>
                
                <div class="staff-list">
                    <h3>Current Staff</h3>
                    <div class="staff-items">
                        ${this.app.state.staff.map(staff => `
                            <div class="staff-item" data-id="${staff.id}">
                                <div class="staff-info">
                                    <span class="staff-name">${staff.name}</span>
                                    <span class="staff-days">${staff.workDays.map(d => StringUtils.capitalize(d).slice(0, 3)).join(', ')}</span>
                                </div>
                                <div class="staff-actions">
                                    <button class="btn btn-small btn-outline edit-staff" data-id="${staff.id}">Edit</button>
                                    <button class="btn btn-small btn-danger remove-staff" data-id="${staff.id}">Remove</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    setupStaffManagementHandlers(modal) {
        modal.querySelector('.add-staff').addEventListener('click', () => {
            const name = modal.querySelector('#staff-name').value.trim();
            const workDays = Array.from(modal.querySelectorAll('input[name="work-days"]:checked'))
                .map(input => input.value);

            if (name && workDays.length > 0) {
                this.app.addStaff(name, workDays);
                modal.remove();
                this.showStaffManagementModal(); // Refresh
            } else {
                NotificationManager.show('Please enter name and select work days', 'warning');
            }
        });

        modal.querySelectorAll('.remove-staff').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const staffId = e.target.dataset.id;
                this.app.removeStaff(staffId);
                modal.remove();
                this.showStaffManagementModal(); // Refresh
            });
        });

        modal.querySelectorAll('.edit-staff').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const staffId = e.target.dataset.id;
                this.showEditStaffModal(staffId);
            });
        });

        this.setupModalCloseHandlers(modal);
    }

    showEditStaffModal(staffId) {
        const staff = this.app.getStaffById(staffId);
        if (!staff) return;

        const modal = this.createModal({
            title: `Edit Staff - ${staff.name}`,
            content: `
                <div class="edit-staff-form">
                    <div class="form-group">
                        <label for="edit-staff-name">Name:</label>
                        <input type="text" id="edit-staff-name" class="form-input" value="${staff.name}">
                    </div>
                    <div class="form-group">
                        <label>Working Days:</label>
                        <div class="checkbox-group">
                            ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="edit-work-days" value="${day}" ${staff.workDays.includes(day) ? 'checked' : ''}>
                                    <span>${StringUtils.capitalize(day)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-primary save-staff-changes">Save Changes</button>
            `
        });

        modal.querySelector('.save-staff-changes').addEventListener('click', () => {
            const name = modal.querySelector('#edit-staff-name').value.trim();
            const workDays = Array.from(modal.querySelectorAll('input[name="edit-work-days"]:checked'))
                .map(input => input.value);

            if (name && workDays.length > 0) {
                this.app.updateStaffWorkDays(staffId, workDays);
                staff.name = name;
                this.app.debouncedSave();
                modal.remove();
                NotificationManager.show('Staff updated successfully', 'success');
            } else {
                NotificationManager.show('Please enter name and select work days', 'warning');
            }
        });

        this.setupModalCloseHandlers(modal);
        document.body.appendChild(modal);
    }

    // ===== TASK MANAGEMENT MODAL =====

    showTaskManagementModal() {
        const modal = this.createModal({
            title: 'Task Management',
            size: 'modal-large',
            content: this.renderTaskManagementContent(),
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });
        this.setupTaskManagementHandlers(modal);
        document.body.appendChild(modal);
    }

    renderTaskManagementContent() {
        const tasks = this.app.state.tasks.filter(t => t.type === 'task');
        const categories = [...new Set(this.app.state.tasks.map(t => t.category))];

        return `
            <div class="task-management">
                <div class="task-form">
                    <h3>Add New Task</h3>
                    <div class="form-group">
                        <label for="task-name">Task Name:</label>
                        <input type="text" id="task-name" class="form-input" placeholder="Enter task name">
                    </div>
                    <div class="form-group">
                        <label for="task-category">Category:</label>
                        <select id="task-category" class="form-input">
                            ${categories.map(cat => `<option value="${cat}">${StringUtils.capitalize(cat)}</option>`).join('')}
                            <option value="new">Create New Category</option>
                        </select>
                    </div>
                    <div class="form-group" id="new-category-group" style="display: none;">
                        <label for="new-category">New Category Name:</label>
                        <input type="text" id="new-category" class="form-input" placeholder="Enter new category name">
                    </div>
                    <div class="form-group">
                        <label for="skill-level">Required Skill Level:</label>
                        <select id="skill-level" class="form-input">
                            ${[1,2,3,4,5].map(level => `<option value="${level}">${level}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary add-task">Add Task</button>
                </div>
                
                <div class="task-list">
                    <h3>Current Tasks</h3>
                    <div class="task-items">
                        ${tasks.map(task => `
                            <div class="task-item" data-id="${task.id}">
                                <div class="task-info">
                                    <span class="task-name">${task.name}</span>
                                    <span class="task-details">Category: ${StringUtils.capitalize(task.category)} | Skill: ${task.skillLevel}</span>
                                </div>
                                <div class="task-actions">
                                    <button class="btn btn-small btn-outline edit-task" data-id="${task.id}">Edit</button>
                                    <button class="btn btn-small btn-danger remove-task" data-id="${task.id}">Remove</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    setupTaskManagementHandlers(modal) {
        // Category dropdown handler
        modal.querySelector('#task-category').addEventListener('change', (e) => {
            const newCategoryGroup = modal.querySelector('#new-category-group');
            if (e.target.value === 'new') {
                newCategoryGroup.style.display = 'block';
            } else {
                newCategoryGroup.style.display = 'none';
            }
        });

        modal.querySelector('.add-task').addEventListener('click', () => {
            const name = modal.querySelector('#task-name').value.trim();
            const categorySelect = modal.querySelector('#task-category');
            const newCategoryInput = modal.querySelector('#new-category');
            const skillLevel = parseInt(modal.querySelector('#skill-level').value);

            let category = categorySelect.value;
            if (category === 'new') {
                category = newCategoryInput.value.trim();
                if (!category) {
                    NotificationManager.show('Please enter a category name', 'warning');
                    return;
                }
            }

            if (name && category) {
                this.app.addTask(name, category, skillLevel);
                modal.remove();
                this.showTaskManagementModal(); // Refresh
            } else {
                NotificationManager.show('Please enter task name and category', 'warning');
            }
        });

        modal.querySelectorAll('.remove-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.id;
                this.app.removeTask(taskId);
                modal.remove();
                this.showTaskManagementModal(); // Refresh
            });
        });

        modal.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.id;
                this.showEditTaskModal(taskId);
            });
        });

        this.setupModalCloseHandlers(modal);
    }

    showEditTaskModal(taskId) {
        const task = this.app.getTaskById(taskId);
        if (!task) return;

        const categories = [...new Set(this.app.state.tasks.map(t => t.category))];

        const modal = this.createModal({
            title: `Edit Task - ${task.name}`,
            content: `
                <div class="edit-task-form">
                    <div class="form-group">
                        <label for="edit-task-name">Task Name:</label>
                        <input type="text" id="edit-task-name" class="form-input" value="${task.name}">
                    </div>
                    <div class="form-group">
                        <label for="edit-task-category">Category:</label>
                        <select id="edit-task-category" class="form-input">
                            ${categories.map(cat => `<option value="${cat}" ${cat === task.category ? 'selected' : ''}>${StringUtils.capitalize(cat)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-skill-level">Required Skill Level:</label>
                        <select id="edit-skill-level" class="form-input">
                            ${[1,2,3,4,5].map(level => `<option value="${level}" ${level === task.skillLevel ? 'selected' : ''}>${level}</option>`).join('')}
                        </select>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-primary save-task-changes">Save Changes</button>
            `
        });

        modal.querySelector('.save-task-changes').addEventListener('click', () => {
            const name = modal.querySelector('#edit-task-name').value.trim();
            const category = modal.querySelector('#edit-task-category').value;
            const skillLevel = parseInt(modal.querySelector('#edit-skill-level').value);

            if (name && category) {
                this.app.updateTaskDetails(taskId, { name, category, skillLevel });
                modal.remove();
                NotificationManager.show('Task updated successfully', 'success');
            } else {
                NotificationManager.show('Please enter task name and category', 'warning');
            }
        });

        this.setupModalCloseHandlers(modal);
        document.body.appendChild(modal);
    }

    // ===== REPORTS & ANALYTICS MODAL =====

    showReportsModal() {
        const modal = this.createModal({
            title: 'Reports & Analytics',
            size: 'modal-large',
            content: this.renderReportsContent(),
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });
        this.setupReportsHandlers(modal);
        document.body.appendChild(modal);
    }

    renderReportsContent() {
        const currentWeek = DateUtils.getWeek(this.app.state.currentDate);
        const workloadReport = this.app.getWorkloadReport(currentWeek);
        const wohSummary = this.app.getWOHSummaryData();

        return `
            <div class="reports-container">
                <div class="report-section">
                    <h3>Workload Distribution</h3>
                    <div class="workload-chart">
                        ${Object.entries(workloadReport).map(([staffId, workload]) => {
                            const staff = this.app.getStaffById(staffId);
                            const total = workload.phone + workload.tasks;
                            return `
                                <div class="workload-item">
                                    <span class="staff-name">${staff?.name || 'Unknown'}</span>
                                    <div class="workload-bar">
                                        <div class="workload-fill" style="width: ${Math.min(total * 10, 100)}%"></div>
                                        <span class="workload-text">${total}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="report-section">
                    <h3>WOH Summary - 14 Day SLA</h3>
                    <div class="woh-summary-grid">
                        <div class="summary-card">
                            <div class="summary-value">${wohSummary.totalItems}</div>
                            <div class="summary-label">Total Items</div>
                        </div>
                        <div class="summary-card critical">
                            <div class="summary-value">${wohSummary.criticalTasks}</div>
                            <div class="summary-label">SLA Breached</div>
                        </div>
                        <div class="summary-card warning">
                            <div class="summary-value">${wohSummary.highPriorityTasks}</div>
                            <div class="summary-label">SLA Critical</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value">${wohSummary.avgAge}d</div>
                            <div class="summary-label">Avg Age</div>
                        </div>
                    </div>
                </div>

                <div class="report-actions">
                    <button class="btn btn-secondary export-workload">Export Workload Report</button>
                    <button class="btn btn-secondary export-woh">Export WOH Report</button>
                    <button class="btn btn-secondary show-woh-summary">Show WOH Summary</button>
                    <button class="btn btn-secondary analyze-workload">Analyze Staff Workload</button>
                    <button class="btn btn-primary generate-full-report">Generate Full Report</button>
                </div>
            </div>
        `;
    }

    setupReportsHandlers(modal) {
        modal.querySelector('.export-workload').addEventListener('click', () => {
            this.app.exportWorkloadReport();
            NotificationManager.show('Workload report exported', 'success');
        });

        modal.querySelector('.export-woh').addEventListener('click', () => {
            this.app.generateWOHReport();
        });

        modal.querySelector('.show-woh-summary').addEventListener('click', () => {
            this.app.showWOHSummary();
        });

        modal.querySelector('.analyze-workload').addEventListener('click', () => {
            this.app.analyzeStaffWorkload();
        });

        modal.querySelector('.generate-full-report').addEventListener('click', () => {
            this.app.generateFullSystemReport();
            NotificationManager.show('Full system report generated', 'success');
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== SETTINGS MODAL =====

    showSettingsModal() {
        const modal = this.createModal({
            title: 'System Settings',
            size: 'modal-medium',
            content: this.renderSettingsContent(),
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-primary save-settings">Save Settings</button>
            `
        });
        this.setupSettingsHandlers(modal);
        document.body.appendChild(modal);
    }

    renderSettingsContent() {
        return `
            <div class="settings-form">
                <div class="setting-group">
                    <h3>General Settings</h3>
                    <div class="form-group">
                        <label for="auto-save">Auto-save interval (seconds):</label>
                        <input type="number" id="auto-save" class="form-input" value="30" min="10" max="300">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="show-conflicts" checked>
                            <span>Show conflict notifications</span>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="dark-mode">
                            <span>Enable dark mode</span>
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>Assignment Settings</h3>
                    <div class="form-group">
                        <label for="max-assignments">Max assignments per person per day:</label>
                        <input type="number" id="max-assignments" class="form-input" value="3" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="skill-priority" checked>
                            <span>Prioritize by skill level in assignments</span>
                        </label>
                    </div>
                </div>

                <div class="setting-group">
                    <h3>WOH Settings</h3>
                    <div class="form-group">
                        <label for="sla-days">SLA target (days):</label>
                        <input type="number" id="sla-days" class="form-input" value="14" min="1" max="30">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="woh-alerts" checked>
                            <span>Show SLA breach alerts</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    setupSettingsHandlers(modal) {
        modal.querySelector('.save-settings').addEventListener('click', () => {
            const settings = {
                autoSaveInterval: parseInt(modal.querySelector('#auto-save').value),
                showConflicts: modal.querySelector('#show-conflicts').checked,
                darkMode: modal.querySelector('#dark-mode').checked,
                maxAssignments: parseInt(modal.querySelector('#max-assignments').value),
                skillPriority: modal.querySelector('#skill-priority').checked,
                slaDays: parseInt(modal.querySelector('#sla-days').value),
                wohAlerts: modal.querySelector('#woh-alerts').checked
            };

            this.app.updateSettings(settings);
            modal.remove();
            NotificationManager.show('Settings saved successfully', 'success');
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== CONFLICT RESOLUTION MODAL =====

    showConflictResolutionModal(conflictKey) {
        const conflicts = this.app.getConflicts();
        const conflict = conflicts.get(conflictKey);
        
        if (!conflict) return;

        const modal = this.createModal({
            title: 'Resolve Conflict',
            content: this.renderConflictContent(conflict),
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-warning ignore-conflict">Ignore</button>
                <button class="btn btn-primary auto-resolve">Auto Resolve</button>
            `
        });

        this.setupConflictHandlers(modal, conflictKey, conflict);
        document.body.appendChild(modal);
    }

    renderConflictContent(conflict) {
        return `
            <div class="conflict-details">
                <div class="conflict-info">
                    <h3>${conflict.type}</h3>
                    <p><strong>Date:</strong> ${DateUtils.formatDate(new Date(conflict.date))}</p>
                    <p><strong>Description:</strong> ${conflict.description}</p>
                    ${conflict.staff ? `<p><strong>Staff:</strong> ${conflict.staff.map(s => s.name).join(', ')}</p>` : ''}
                    ${conflict.task ? `<p><strong>Task:</strong> ${conflict.task.name}</p>` : ''}
                </div>
                
                <div class="resolution-options">
                    <h4>Suggested Resolutions:</h4>
                    <div class="resolution-list">
                        ${conflict.suggestions?.map((suggestion, index) => `
                            <div class="resolution-option">
                                <label class="resolution-label">
                                    <input type="radio" name="resolution" value="${index}">
                                    <span>${suggestion.description}</span>
                                </label>
                            </div>
                        `).join('') || '<p>No automatic suggestions available.</p>'}
                    </div>
                </div>
            </div>
        `;
    }

    setupConflictHandlers(modal, conflictKey, conflict) {
        modal.querySelector('.auto-resolve').addEventListener('click', () => {
            const selectedResolution = modal.querySelector('input[name="resolution"]:checked');
            if (selectedResolution) {
                const resolutionIndex = parseInt(selectedResolution.value);
                this.app.conflictManager.resolveConflict(conflictKey, resolutionIndex);
                modal.remove();
                NotificationManager.show('Conflict resolved automatically', 'success');
            } else {
                NotificationManager.show('Please select a resolution option', 'warning');
            }
        });

        modal.querySelector('.ignore-conflict').addEventListener('click', () => {
            this.app.conflictManager.ignoreConflict(conflictKey);
            modal.remove();
            NotificationManager.show('Conflict ignored', 'info');
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== SYSTEM INFO MODAL =====

    showSystemInfoModal() {
        const appInfo = this.app.getApplicationInfo();
        const stats = this.app.getSystemStats();

        const modal = this.createModal({
            title: 'System Information',
            content: `
                <div class="system-info">
                    <div class="info-section">
                        <h3>Application Details</h3>
                        <p><strong>Name:</strong> ${appInfo.name}</p>
                        <p><strong>Version:</strong> ${appInfo.version}</p>
                        <p><strong>Build Date:</strong> ${DateUtils.formatDate(new Date(appInfo.buildDate))}</p>
                    </div>

                    <div class="info-section">
                        <h3>System Statistics</h3>
                        <p><strong>Staff Members:</strong> ${stats.staffCount}</p>
                        <p><strong>Tasks:</strong> ${stats.taskCount}</p>
                        <p><strong>Categories:</strong> ${stats.headerCount}</p>
                        <p><strong>Locked Months:</strong> ${stats.lockedMonths}</p>
                        <p><strong>Current Mode:</strong> ${stats.buildMode ? 'Build Mode' : 'View Mode'}</p>
                        <p><strong>Current View:</strong> ${StringUtils.capitalize(stats.currentView)}</p>
                        <p><strong>Last Saved:</strong> ${stats.lastSaved ? DateUtils.formatDate(stats.lastSaved) : 'Never'}</p>
                    </div>

                    <div class="info-section">
                        <h3>Features</h3>
                        <ul class="feature-list">
                            ${appInfo.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `,
            footer: '<button class="btn btn-primary close-modal">Close</button>'
        });

        this.setupModalCloseHandlers(modal);
        document.body.appendChild(modal);
    }

    // ===== WOH SUMMARY MODAL =====

    showWOHSummaryModal() {
        const wohSummary = this.app.getWOHSummaryData();
        
        let content = `
            <div class="woh-summary-modal">
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="summary-value">${wohSummary.totalItems}</div>
                        <div class="summary-label">Total Items</div>
                    </div>
                    <div class="summary-card critical">
                        <div class="summary-value">${wohSummary.criticalTasks}</div>
                        <div class="summary-label">SLA Breached (14+ days)</div>
                    </div>
                    <div class="summary-card warning">
                        <div class="summary-value">${wohSummary.highPriorityTasks}</div>
                        <div class="summary-label">SLA Critical (11-13 days)</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value">${wohSummary.avgAge}d</div>
                        <div class="summary-label">Average Age</div>
                    </div>
                </div>
                
                ${wohSummary.oldestItem ? `
                    <div class="oldest-item-alert">
                        <h3>🔥 Oldest Item Alert</h3>
                        <p><strong>Task:</strong> ${wohSummary.oldestItem.taskName}</p>
                        <p><strong>Age:</strong> ${wohSummary.oldestItem.age} days</p>
                        <p><strong>Status:</strong> ${wohSummary.oldestItem.slaStatus}</p>
                        ${wohSummary.oldestItem.age > 14 ? 
                            `<p class="breach-warning">⚠️ This item is ${wohSummary.oldestItem.age - 14} days over the 14-day SLA!</p>` : 
                            `<p class="sla-countdown">⏰ ${14 - wohSummary.oldestItem.age} days until SLA breach</p>`
                        }
                    </div>
                ` : ''}
                
                <div class="priority-tasks">
                    <h3>Top Priority Tasks (SLA Focus)</h3>
                    <div class="task-breakdown">
                        ${wohSummary.taskBreakdown.slice(0, 10).map(task => `
                            <div class="task-item ${task.slaStatus.toLowerCase()}">
                                <div class="task-info">
                                    <span class="task-name">${task.taskName}</span>
                                    <span class="task-count">${task.count} items</span>
                                </div>
                                <div class="task-status">
                                    <span class="age">${task.oldestAge} days old</span>
                                    <span class="status-badge ${task.slaStatus.toLowerCase()}">${task.slaStatus}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const modal = this.createModal({
            title: 'Work on Hand Summary - 14 Day SLA',
            size: 'modal-large',
            content: content,
            footer: `
                <button class="btn btn-secondary export-woh-summary">Export Summary</button>
                <button class="btn btn-secondary bulk-edit-woh">Bulk Edit WOH</button>
                <button class="btn btn-primary close-modal">Close</button>
            `
        });

        modal.querySelector('.export-woh-summary')?.addEventListener('click', () => {
            this.app.exportWOHData();
        });

        modal.querySelector('.bulk-edit-woh')?.addEventListener('click', () => {
            modal.remove();
            this.showBulkWOHEditModal();
        });

        document.body.appendChild(modal);
        this.setupModalCloseHandlers(modal);
    }

    // ===== BULK WOH EDIT MODAL =====

    showBulkWOHEditModal() {
        if (!this.app.state.buildMode) {
            NotificationManager.show('Build mode required for bulk WOH editing', 'warning');
            return;
        }

        const tasks = this.app.state.tasks.filter(t => t.type === 'task');
        
        const modal = this.createModal({
            title: 'Bulk Edit WOH Data',
            size: 'modal-fullscreen',
            content: `
                <div class="bulk-woh-editor">
                    <div class="bulk-actions">
                        <button class="btn btn-secondary import-csv">Import from CSV</button>
                        <button class="btn btn-secondary export-template">Download Template</button>
                        <button class="btn btn-warning clear-all-woh">Clear All WOH Data</button>
                    </div>
                    
                    <div class="woh-table-container">
                        <table class="woh-bulk-table">
                            <thead>
                                <tr>
                                    <th>Task Name</th>
                                    <th>Category</th>
                                    <th>Current Count</th>
                                    <th>Current Oldest Date</th>
                                    <th>Current Age (Days)</th>
                                    <th>SLA Status</th>
                                    <th>New Count</th>
                                    <th>New Oldest Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tasks.map(task => {
                                    const currentWOH = this.app.state.priorityTasks[task.id] || {};
                                    const age = this.calculateAge(currentWOH.oldestDate);
                                    const slaStatus = this.getSLAStatus(currentWOH.oldestDate);
                                    
                                    return `
                                        <tr data-task-id="${task.id}">
                                            <td class="task-name">${task.name}</td>
                                            <td class="task-category">${StringUtils.capitalize(task.category)}</td>
                                            <td class="current-count">${currentWOH.count || '0'}</td>
                                            <td class="current-date">${currentWOH.oldestDate ? DateUtils.formatWOHDate(currentWOH.oldestDate) : '-'}</td>
                                            <td class="current-age">${age}</td>
                                            <td class="current-sla ${age > 14 ? 'breached' : age >= 11 ? 'critical' : age >= 8 ? 'warning' : 'compliant'}">${slaStatus}</td>
                                            <td class="new-count">
                                                <input type="number" class="form-input small" value="${currentWOH.count || ''}" min="0" max="9999">
                                            </td>
                                            <td class="new-date">
                                                <input type="date" class="form-input small" value="${currentWOH.oldestDate || ''}">
                                            </td>
                                            <td class="actions">
                                                <button class="btn btn-small btn-outline update-row" data-task-id="${task.id}">Update</button>
                                                <button class="btn btn-small btn-ghost clear-row" data-task-id="${task.id}">Clear</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-warning bulk-clear">Clear All</button>
                <button class="btn btn-primary bulk-save">Save All Changes</button>
            `
        });

        this.setupBulkWOHHandlers(modal);
        document.body.appendChild(modal);
    }

    setupBulkWOHHandlers(modal) {
        // Individual row updates
        modal.querySelectorAll('.update-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                const row = e.target.closest('tr');
                const count = parseInt(row.querySelector('.new-count input').value) || 0;
                const oldestDate = row.querySelector('.new-date input').value || '';
                
                this.updateSingleWOH(taskId, count, oldestDate);
                this.refreshBulkWOHRow(row, taskId);
            });
        });

        // Individual row clearing
        modal.querySelectorAll('.clear-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                const row = e.target.closest('tr');
                
                this.updateSingleWOH(taskId, 0, '');
                this.refreshBulkWOHRow(row, taskId);
            });
        });

        // Bulk save all changes
        modal.querySelector('.bulk-save').addEventListener('click', () => {
            const rows = modal.querySelectorAll('tbody tr');
            let updatedCount = 0;
            
            rows.forEach(row => {
                const taskId = row.dataset.taskId;
                const count = parseInt(row.querySelector('.new-count input').value) || 0;
                const oldestDate = row.querySelector('.new-date input').value || '';
                
                if (count > 0 || oldestDate) {
                    if (!this.app.state.priorityTasks) {
                        this.app.state.priorityTasks = {};
                    }
                    this.app.state.priorityTasks[taskId] = { 
                        count: count.toString(), 
                        oldestDate: oldestDate 
                    };
                    updatedCount++;
                } else {
                    if (this.app.state.priorityTasks && this.app.state.priorityTasks[taskId]) {
                        delete this.app.state.priorityTasks[taskId];
                    }
                }
            });
            
            this.app.debouncedSave();
            this.app.uiManager.render();
            modal.remove();
            
            NotificationManager.show(`Bulk WOH update completed - ${updatedCount} tasks updated`, 'success');
        });

        // Bulk clear all
        modal.querySelector('.bulk-clear').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear ALL WOH data? This cannot be undone.')) {
                this.app.state.priorityTasks = {};
                this.app.debouncedSave();
                this.app.uiManager.render();
                modal.remove();
                
                NotificationManager.show('All WOH data cleared', 'info');
            }
        });

        this.setupModalCloseHandlers(modal);
    }

    updateSingleWOH(taskId, count, oldestDate) {
        if (count > 0 || oldestDate) {
            if (!this.app.state.priorityTasks) {
                this.app.state.priorityTasks = {};
            }
            this.app.state.priorityTasks[taskId] = { 
                count: count.toString(), 
                oldestDate: oldestDate 
            };
        } else {
            if (this.app.state.priorityTasks && this.app.state.priorityTasks[taskId]) {
                delete this.app.state.priorityTasks[taskId];
            }
        }
        
        this.app.debouncedSave();
    }

    refreshBulkWOHRow(row, taskId) {
        const currentWOH = this.app.state.priorityTasks[taskId] || {};
        const age = this.calculateAge(currentWOH.oldestDate);
        const slaStatus = this.getSLAStatus(currentWOH.oldestDate);
        
        row.querySelector('.current-count').textContent = currentWOH.count || '0';
        row.querySelector('.current-date').textContent = currentWOH.oldestDate ? DateUtils.formatWOHDate(currentWOH.oldestDate) : '-';
        row.querySelector('.current-age').textContent = age;
        
        const slaCell = row.querySelector('.current-sla');
        slaCell.textContent = slaStatus;
        slaCell.className = `current-sla ${age > 14 ? 'breached' : age >= 11 ? 'critical' : age >= 8 ? 'warning' : 'compliant'}`;
        
        // Clear the input fields after update
        row.querySelector('.new-count input').value = '';
        row.querySelector('.new-date input').value = '';
    }

    // ===== ALL ORIGINAL MODAL METHODS =====

    showAssignmentModal(itemId, date, type) {
        const item = this.app.state.tasks.find(t => t.id === itemId);
        if (!item) return;

        const dayName = DateUtils.getDayName(date);
        const availableStaff = this.getAvailableStaff(date, type);
        const currentAssignment = this.getCurrentAssignment(itemId, date, type);

        const modal = this.createModal({
            title: `Assign Staff - ${item.name}`,
            content: this.renderAssignmentContent(item, date, availableStaff, currentAssignment, type),
            footer: this.renderAssignmentFooter()
        });

        this.setupAssignmentModalHandlers(modal, itemId, date, type);
        document.body.appendChild(modal);
    }

    getAvailableStaff(date, type) {
        const dayName = DateUtils.getDayName(date);
        return this.app.state.staff.filter(staff => {
            if (!staff.workDays.includes(dayName)) return false;
            const leave = this.app.assignmentGenerator.getStaffLeave(staff.id, date);
            return !leave;
        });
    }

    getCurrentAssignment(itemId, date, type) {
        if (type === 'task') {
            return this.app.assignmentGenerator.getTaskAssignment(itemId, date);
        } else if (type === 'triage') {
            return this.app.assignmentGenerator.getTriageAssignment(itemId, date);
        }
        return null;
    }

    renderAssignmentContent(item, date, availableStaff, currentAssignment, type) {
        const currentStaffIds = currentAssignment?.assignments || [];
        
        return `
            <div class="assignment-form">
                <div class="assignment-info">
                    <p><strong>Date:</strong> ${DateUtils.formatDate(date)}</p>
                    <p><strong>${type === 'task' ? 'Task' : 'Triage'}:</strong> ${item.name}</p>
                    ${item.skillLevel ? `<p><strong>Required Skill Level:</strong> ${item.skillLevel}</p>` : ''}
                </div>
                
                <div class="staff-selection">
                    <h3>Select Staff:</h3>
                    ${availableStaff.length > 0 ? `
                        <div class="staff-list">
                            ${availableStaff.map(staff => {
                                const skillLevel = this.app.skillsManager.getStaffTaskSkill(staff.id, item.id);
                                const isSelected = currentStaffIds.includes(staff.id);
                                return `
                                    <div class="staff-option">
                                        <label class="staff-checkbox">
                                            <input type="checkbox" name="staff" value="${staff.id}" ${isSelected ? 'checked' : ''}>
                                            <span class="staff-info">
                                                <span class="staff-name">${staff.name}</span>
                                                ${type === 'task' ? `<span class="skill-level">Skill: ${skillLevel}</span>` : ''}
                                            </span>
                                        </label>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="no-staff-available">
                            <p>No available staff for ${DateUtils.formatDate(date)}</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    renderAssignmentFooter() {
        return `
            <button class="btn btn-ghost close-modal">Cancel</button>
            <button class="btn btn-danger clear-assignment">Clear Assignment</button>
            <button class="btn btn-primary save-assignment">Save Assignment</button>
        `;
    }

    setupAssignmentModalHandlers(modal, itemId, date, type) {
        modal.querySelector('.save-assignment').addEventListener('click', () => {
            const selectedStaff = Array.from(modal.querySelectorAll('input[name="staff"]:checked'))
                .map(input => input.value);
            
            this.saveAssignment(itemId, date, type, selectedStaff);
            modal.remove();
        });

        modal.querySelector('.clear-assignment').addEventListener('click', () => {
            this.saveAssignment(itemId, date, type, []);
            modal.remove();
        });

        this.setupModalCloseHandlers(modal);
    }

    saveAssignment(itemId, date, type, staffIds) {
        if (type === 'task') {
            this.app.assignmentGenerator.assignStaffToTask(itemId, staffIds, date);
        } else if (type === 'triage') {
            this.app.assignmentGenerator.assignTriageStaff(itemId, staffIds, date);
        }

        this.app.debouncedSave();
        this.app.uiManager.render();

        const item = this.app.state.tasks.find(t => t.id === itemId);
        const staffNames = staffIds.map(id => this.app.getStaffById(id)?.name).filter(Boolean);
        
        if (staffNames.length > 0) {
            NotificationManager.show(`Assigned ${staffNames.join(', ')} to ${item?.name}`, 'success');
        } else {
            NotificationManager.show(`Cleared assignment for ${item?.name}`, 'info');
        }
    }

    showPhoneAssignmentModal(date) {
        const dayName = DateUtils.getDayName(date);
        const availableStaff = this.app.state.staff.filter(staff => 
            staff.workDays.includes(dayName) && 
            !this.app.assignmentGenerator.getStaffLeave(staff.id, date)
        );

        const currentAssignment = this.app.getPhoneAssignment(date);

        const modal = this.createModal({
            title: `Phone Coverage - ${DateUtils.formatDate(date)}`,
            content: this.renderPhoneAssignmentContent(date, availableStaff, currentAssignment),
            footer: this.renderPhoneAssignmentFooter()
        });

        this.setupPhoneModalHandlers(modal, date);
        document.body.appendChild(modal);
    }

    renderPhoneAssignmentContent(date, availableStaff, currentAssignment) {
        return `
            <div class="phone-assignment-form">
                <div class="shift-assignment">
                    <h3>Early Shift</h3>
                    <div class="staff-selection">
                        ${availableStaff.map(staff => {
                            const isSelected = currentAssignment.early?.includes(staff.id);
                            return `
                                <label class="staff-checkbox">
                                    <input type="checkbox" name="early-staff" value="${staff.id}" ${isSelected ? 'checked' : ''}>
                                    <span class="staff-name">${staff.name}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <div class="shift-assignment">
                    <h3>Late Shift</h3>
                    <div class="staff-selection">
                        ${availableStaff.map(staff => {
                            const isSelected = currentAssignment.late?.includes(staff.id);
                            return `
                                <label class="staff-checkbox">
                                    <input type="checkbox" name="late-staff" value="${staff.id}" ${isSelected ? 'checked' : ''}>
                                    <span class="staff-name">${staff.name}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderPhoneAssignmentFooter() {
        return `
            <button class="btn btn-ghost close-modal">Cancel</button>
            <button class="btn btn-danger clear-phone">Clear All</button>
            <button class="btn btn-primary save-phone">Save Phone Coverage</button>
        `;
    }

    setupPhoneModalHandlers(modal, date) {
        modal.querySelector('.save-phone').addEventListener('click', () => {
            const earlyStaff = Array.from(modal.querySelectorAll('input[name="early-staff"]:checked'))
                .map(input => input.value);
            const lateStaff = Array.from(modal.querySelectorAll('input[name="late-staff"]:checked'))
                .map(input => input.value);

            this.savePhoneAssignment(date, earlyStaff, lateStaff);
            modal.remove();
        });

        modal.querySelector('.clear-phone').addEventListener('click', () => {
            this.savePhoneAssignment(date, [], []);
            modal.remove();
        });

        this.setupModalCloseHandlers(modal);
    }

    savePhoneAssignment(date, earlyStaff, lateStaff) {
        const isoDate = DateUtils.toISODate(date);
        
        if (!this.app.state.phoneRoster[isoDate]) {
            this.app.state.phoneRoster[isoDate] = { early: [], late: [] };
        }
        
        this.app.state.phoneRoster[isoDate].early = [...earlyStaff];
        this.app.state.phoneRoster[isoDate].late = [...lateStaff];
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        const earlyNames = earlyStaff.map(id => this.app.getStaffById(id)?.name).filter(Boolean);
        const lateNames = lateStaff.map(id => this.app.getStaffById(id)?.name).filter(Boolean);
        
        NotificationManager.show(
            `Phone coverage updated - Early: ${earlyNames.join(', ') || 'None'}, Late: ${lateNames.join(', ') || 'None'}`, 
            'success'
        );
    }

    showShiftSwapModal(date, shiftType, staffId) {
        const staff = this.app.getStaffById(staffId);
        const dayName = DateUtils.getDayName(date);
        
        const availableStaff = this.app.state.staff.filter(s => {
            if (s.id === staffId) return false;
            if (!s.workDays.includes(dayName)) return false;
            if (this.app.assignmentGenerator.getStaffLeave(s.id, date)) return false;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.app.state.phoneRoster[isoDate];
            const otherShift = shiftType === 'early' ? 'late' : 'early';
            if (phoneData && phoneData[otherShift] && phoneData[otherShift].includes(s.id)) return false;
            
            return true;
        });

        const modal = this.createModal({
            title: `Swap ${shiftType === 'early' ? 'Early' : 'Late'} Shift`,
            content: this.renderShiftSwapContent(date, shiftType, staff, availableStaff),
            footer: this.renderShiftSwapFooter(availableStaff.length > 0)
        });

        this.setupShiftSwapHandlers(modal, date, shiftType, staffId, availableStaff);
        document.body.appendChild(modal);
    }

    renderShiftSwapContent(date, shiftType, staff, availableStaff) {
        return `
            <div class="shift-swap-form">
                <div class="swap-info">
                    <p><strong>Date:</strong> ${DateUtils.formatDate(date)}</p>
                    <p><strong>Shift:</strong> ${shiftType === 'early' ? 'Early' : 'Late'}</p>
                    <p><strong>Current Staff:</strong> ${staff?.name}</p>
                </div>
                
                ${availableStaff.length > 0 ? `
                    <div class="replacement-selection">
                        <h3>Select Replacement:</h3>
                        <div class="staff-list">
                            ${availableStaff.map(s => `
                                <label class="staff-checkbox">
                                    <input type="radio" name="replacement" value="${s.id}">
                                    <span class="staff-name">${s.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="no-replacement">
                        <p>No available staff for swap on this date.</p>
                    </div>
                `}
            </div>
        `;
    }

    renderShiftSwapFooter(hasAvailableStaff) {
        return `
            <button class="btn btn-ghost close-modal">Cancel</button>
            ${hasAvailableStaff ? `
                <button class="btn btn-primary confirm-swap">Confirm Swap</button>
            ` : ''}
        `;
    }

    setupShiftSwapHandlers(modal, date, shiftType, staffId, availableStaff) {
        if (availableStaff.length > 0) {
            modal.querySelector('.confirm-swap').addEventListener('click', () => {
                const replacementId = modal.querySelector('input[name="replacement"]:checked')?.value;
                if (replacementId) {
                    this.confirmShiftSwap(date, shiftType, staffId, replacementId);
                    modal.remove();
                } else {
                    NotificationManager.show('Please select a replacement staff member', 'warning');
                }
            });
        }

        this.setupModalCloseHandlers(modal);
    }

    confirmShiftSwap(date, shiftType, originalStaffId, replacementStaffId) {
        const isoDate = DateUtils.toISODate(date);
        const swapKey = `${shiftType}_${originalStaffId}`;
        
        if (!this.app.state.shiftSwaps[isoDate]) {
            this.app.state.shiftSwaps[isoDate] = {};
        }
        
        this.app.state.shiftSwaps[isoDate][swapKey] = replacementStaffId;
        
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        const originalStaff = this.app.getStaffById(originalStaffId);
        const replacementStaff = this.app.getStaffById(replacementStaffId);
        
        NotificationManager.show(
            `Shift swap confirmed: ${replacementStaff?.name} will cover ${originalStaff?.name}'s ${shiftType} shift`,
            'success'
        );
    }

    showLeavePlanningModal(date) {
        const isoDate = DateUtils.toISODate(date);
        const leaveData = this.app.state.leaveRoster[isoDate] || {};

        const modal = this.createModal({
            title: `Leave Planning - ${DateUtils.formatDate(date)}`,
            content: this.renderLeavePlanningContent(date, leaveData),
            footer: this.renderLeavePlanningFooter()
        });

        this.setupLeavePlanningHandlers(modal, date);
        document.body.appendChild(modal);
    }

    renderLeavePlanningContent(date, leaveData) {
        return `
            <div class="leave-planning-form">
                <div class="current-leave">
                    <h3>Current Leave:</h3>
                    ${Object.keys(leaveData).length > 0 ? `
                        <div class="leave-list">
                            ${Object.entries(leaveData).map(([staffId, comment]) => {
                                const staff = this.app.getStaffById(staffId);
                                return `
                                    <div class="leave-item" data-staff="${staffId}">
                                        <span class="staff-name">${staff?.name || 'Unknown'}</span>
                                        <span class="leave-details">${comment}</span>
                                        <button class="btn btn-small btn-ghost remove-leave" data-staff="${staffId}">
                                            <span class="material-icons">delete</span>
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <p>No leave recorded for this date.</p>
                    `}
                </div>
                
                <div class="add-leave">
                    <h3>Add Leave:</h3>
                    <div class="form-group">
                        <label for="leave-staff">Staff Member:</label>
                        <select id="leave-staff" class="form-input">
                            <option value="">Select staff member</option>
                            ${this.app.state.staff.map(staff => `
                                <option value="${staff.id}">${staff.name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="leave-comment">Leave Details:</label>
                        <input type="text" id="leave-comment" class="form-input" 
                               placeholder="e.g., Annual Leave, Doctor appointment">
                    </div>
                </div>
            </div>
        `;
    }

    renderLeavePlanningFooter() {
        return `
            <button class="btn btn-ghost close-modal">Close</button>
            <button class="btn btn-primary add-leave">Add Leave</button>
        `;
    }

    setupLeavePlanningHandlers(modal, date) {
        modal.querySelector('.add-leave').addEventListener('click', () => {
            const staffId = modal.querySelector('#leave-staff').value;
            const comment = modal.querySelector('#leave-comment').value.trim();
            
            if (staffId && comment) {
                this.addLeave(date, staffId, comment);
                modal.remove();
                this.showLeavePlanningModal(date); // Refresh modal
            } else {
                NotificationManager.show('Please select staff and enter leave details', 'warning');
            }
        });

        modal.querySelectorAll('.remove-leave').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const staffId = e.target.closest('.remove-leave').dataset.staff;
                this.removeLeave(date, staffId);
                modal.remove();
                this.showLeavePlanningModal(date); // Refresh modal
            });
        });

        this.setupModalCloseHandlers(modal);
    }

    addLeave(date, staffId, comment) {
        const isoDate = DateUtils.toISODate(date);
        
        if (!this.app.state.leaveRoster[isoDate]) {
            this.app.state.leaveRoster[isoDate] = {};
        }
        
        this.app.state.leaveRoster[isoDate][staffId] = comment;
        
        this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
        this.app.state.lastLeaveUpdate = new Date().toISOString();
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        const staff = this.app.getStaffById(staffId);
        NotificationManager.show(`Added leave for ${staff?.name}: ${comment}`, 'success');
    }

    removeLeave(date, staffId) {
        const isoDate = DateUtils.toISODate(date);
        
        if (this.app.state.leaveRoster[isoDate]) {
            delete this.app.state.leaveRoster[isoDate][staffId];
            
            if (Object.keys(this.app.state.leaveRoster[isoDate]).length === 0) {
                delete this.app.state.leaveRoster[isoDate];
            }
        }
        
        this.app.assignmentGenerator.updateLeaveRoster(this.app.state.leaveRoster);
        this.app.state.lastLeaveUpdate = new Date().toISOString();
        this.app.debouncedSave();
        this.app.uiManager.render();
        
        const staff = this.app.getStaffById(staffId);
        NotificationManager.show(`Removed leave for ${staff?.name}`, 'success');
    }

    // ===== DATA MANAGEMENT MODALS =====

    showDataManagementModal() {
        const modal = this.createModal({
            title: 'Data Management',
            size: 'modal-medium',
            content: `
                <div class="data-management">
                    <div class="data-section">
                        <h3>Import/Export Data</h3>
                        <div class="form-group">
                            <label for="import-file">Import Data File:</label>
                            <input type="file" id="import-file" class="form-input" accept=".json">
                            <small>Select a JSON file containing roster data</small>
                        </div>
                        <div class="data-actions">
                            <button class="btn btn-primary import-data">Import Data</button>
                            <button class="btn btn-secondary export-data">Export Data</button>
                        </div>
                    </div>
                    
                    <div class="data-section">
                        <h3>System Maintenance</h3>
                        <div class="maintenance-actions">
                            <button class="btn btn-warning clear-old-woh">Clear Old WOH Data (60+ days)</button>
                            <button class="btn btn-warning reset-defaults">Reset to Defaults</button>
                            <button class="btn btn-danger clear-all-data">Clear All Data</button>
                        </div>
                    </div>
                </div>
            `,
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });

        this.setupDataManagementHandlers(modal);
        document.body.appendChild(modal);
    }

    setupDataManagementHandlers(modal) {
        modal.querySelector('.import-data').addEventListener('click', () => {
            const fileInput = modal.querySelector('#import-file');
            const file = fileInput.files[0];
            if (file) {
                this.app.importData(file);
            } else {
                NotificationManager.show('Please select a file to import', 'warning');
            }
        });

        modal.querySelector('.export-data').addEventListener('click', () => {
            this.app.exportData();
        });

        modal.querySelector('.clear-old-woh').addEventListener('click', () => {
            this.app.clearOldWOHData(60);
        });

        modal.querySelector('.reset-defaults').addEventListener('click', () => {
            this.app.resetToDefaults();
        });

        modal.querySelector('.clear-all-data').addEventListener('click', () => {
            this.app.confirmClearData();
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== SKILLS MATRIX MODAL =====

    showSkillsMatrixModal() {
        const modal = this.createModal({
            title: 'Skills Matrix Management',
            size: 'modal-fullscreen',
            content: this.renderSkillsMatrixContent(),
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-primary save-skills">Save Skills Matrix</button>
            `
        });

        this.setupSkillsMatrixHandlers(modal);
        document.body.appendChild(modal);
    }

    renderSkillsMatrixContent() {
        const tasks = this.app.state.tasks.filter(t => t.type === 'task');
        const staff = this.app.state.staff;

        return `
            <div class="skills-matrix">
                <div class="skills-info">
                    <h3>Skills Matrix Configuration</h3>
                    <p>Set skill levels for each staff member on each task (1 = Beginner, 5 = Expert)</p>
                </div>
                
                <div class="skills-table-container">
                    <table class="skills-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                ${tasks.map(task => `<th>${task.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${staff.map(staffMember => `
                                <tr>
                                    <td class="staff-name">${staffMember.name}</td>
                                    ${tasks.map(task => {
                                        const currentSkill = this.app.skillsManager.getStaffTaskSkill(staffMember.id, task.id);
                                        return `
                                            <td>
                                                <select class="skill-select" data-staff="${staffMember.id}" data-task="${task.id}">
                                                    ${[1,2,3,4,5].map(level => 
                                                        `<option value="${level}" ${level === currentSkill ? 'selected' : ''}>${level}</option>`
                                                    ).join('')}
                                                </select>
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    setupSkillsMatrixHandlers(modal) {
        modal.querySelector('.save-skills').addEventListener('click', () => {
            this.app.saveSkillsMatrix(modal);
            modal.remove();
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== INFO MODAL FOR MESSAGES =====

    showInfoModal(title, message) {
        const modal = this.createModal({
            title,
            content: `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; max-height: 400px; overflow-y: auto;">${message}</pre>`,
            footer: '<button class="btn btn-primary close-modal">Close</button>'
        });
        document.body.appendChild(modal);
        this.setupModalCloseHandlers(modal);
    }

    // ===== MONTH LOCK MANAGEMENT MODAL =====

    showMonthLockModal() {
        const modal = this.createModal({
            title: 'Month Lock Management',
            size: 'modal-medium',
            content: this.renderMonthLockContent(),
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });

        this.setupMonthLockHandlers(modal);
        document.body.appendChild(modal);
    }

    renderMonthLockContent() {
        const currentDate = new Date();
        const months = [];
        
        // Generate 12 months starting from current month
        for (let i = 0; i < 12; i++) {
            const month = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
            const isLocked = this.app.state.lockedMonths.includes(monthStr);
            
            months.push({
                value: monthStr,
                display: month.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
                locked: isLocked
            });
        }

        return `
            <div class="month-lock-management">
                <div class="lock-info">
                    <h3>Month Locking</h3>
                    <p>Locked months cannot be edited. Use this to prevent changes to finalized rosters.</p>
                </div>
                
                <div class="month-list">
                    ${months.map(month => `
                        <div class="month-item">
                            <span class="month-name">${month.display}</span>
                            <div class="month-actions">
                                ${month.locked ? `
                                    <span class="lock-status locked">🔒 Locked</span>
                                    <button class="btn btn-small btn-outline unlock-month" data-month="${month.value}">Unlock</button>
                                ` : `
                                    <span class="lock-status unlocked">🔓 Unlocked</span>
                                    <button class="btn btn-small btn-warning lock-month" data-month="${month.value}">Lock</button>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupMonthLockHandlers(modal) {
        modal.querySelectorAll('.lock-month').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monthStr = e.target.dataset.month;
                this.app.addMonthLock(monthStr);
                modal.remove();
                this.showMonthLockModal(); // Refresh
            });
        });

        modal.querySelectorAll('.unlock-month').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const monthStr = e.target.dataset.month;
                this.app.removeMonthLock(monthStr);
                modal.remove();
                this.showMonthLockModal(); // Refresh
            });
        });

        this.setupModalCloseHandlers(modal);
    }

    // ===== LEAVE ROSTER MODAL =====

    showLeaveRosterModal() {
        const modal = this.createModal({
            title: 'Leave Roster Overview',
            size: 'modal-large',
            content: this.renderLeaveRosterContent(),
            footer: '<button class="btn btn-ghost close-modal">Close</button>'
        });

        this.setupLeaveRosterHandlers(modal);
        document.body.appendChild(modal);
    }

    renderLeaveRosterContent() {
        const currentDate = new Date();
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - 7); // Show past week
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 21); // Show next 3 weeks

        const dates = [];
        const date = new Date(startDate);
        while (date <= endDate) {
            if (DateUtils.isWorkingDay(date)) {
                dates.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }

        return `
            <div class="leave-roster-overview">
                <div class="leave-summary">
                    <h3>Leave Summary (Past Week + Next 3 Weeks)</h3>
                    <p>Click on any date to manage leave for that day</p>
                </div>
                
                <div class="leave-calendar">
                    ${dates.map(date => {
                        const isoDate = DateUtils.toISODate(date);
                        const leaveData = this.app.state.leaveRoster[isoDate] || {};
                        const leaveCount = Object.keys(leaveData).length;
                        const isPast = date < currentDate;
                        
                        return `
                            <div class="leave-day ${isPast ? 'past' : 'future'} ${leaveCount > 0 ? 'has-leave' : ''}" 
                                 data-date="${date.toISOString()}"
                                 onclick="workRoster.modalManager.showLeavePlanningModal(new Date('${date.toISOString()}'))">
                                <div class="day-header">
                                    <span class="day-name">${DateUtils.getDayName(date).slice(0, 3)}</span>
                                    <span class="day-date">${date.getDate()}</span>
                                </div>
                                <div class="leave-info">
                                    ${leaveCount > 0 ? `
                                        <span class="leave-count">${leaveCount} on leave</span>
                                        <div class="leave-details">
                                            ${Object.entries(leaveData).map(([staffId, comment]) => {
                                                const staff = this.app.getStaffById(staffId);
                                                return `<div class="leave-item">${staff?.name}: ${comment}</div>`;
                                            }).join('')}
                                        </div>
                                    ` : `
                                        <span class="no-leave">No leave</span>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    setupLeaveRosterHandlers(modal) {
        // Click handlers are set inline in the HTML
        this.setupModalCloseHandlers(modal);
    }

    // ===== CONFIGURATION SETTINGS MODAL =====

    showConfigurationModal() {
        if (!this.app.configManager || !this.app.configManager.initialized) {
            NotificationManager.show('Configuration system not initialized', 'error');
            return;
        }

        const config = this.app.configManager.getEditableConfig();
        
        const modal = this.createModal({
            title: 'System Configuration',
            size: 'modal-large',
            content: this.renderConfigurationContent(config),
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-secondary export-config">Export Config</button>
                <button class="btn btn-primary save-config">Save Changes</button>
            `
        });

        this.setupConfigurationHandlers(modal, config);
        document.body.appendChild(modal);
    }

    renderConfigurationContent(config) {
        return `
            <div class="config-container">
                <div class="config-tabs">
                    <button class="config-tab active" data-tab="organization">
                        <span class="material-icons">business</span>
                        Organization
                    </button>
                    <button class="config-tab" data-tab="workweek">
                        <span class="material-icons">calendar_today</span>
                        Work Week
                    </button>
                    <button class="config-tab" data-tab="features">
                        <span class="material-icons">toggle_on</span>
                        Features
                    </button>
                    <button class="config-tab" data-tab="display">
                        <span class="material-icons">palette</span>
                        Display
                    </button>
                </div>

                <div class="config-panels">
                    <div class="config-panel active" data-panel="organization">
                        ${this.renderOrganizationPanel(config.organization || {})}
                    </div>
                    
                    <div class="config-panel" data-panel="workweek">
                        ${this.renderWorkWeekPanel(config.workWeek || {})}
                    </div>
                    
                    <div class="config-panel" data-panel="features">
                        ${this.renderFeaturesPanel(config.features || {})}
                    </div>
                    
                    <div class="config-panel" data-panel="display">
                        ${this.renderDisplayPanel(config.display || {})}
                    </div>
                </div>
            </div>

            <style>
                .config-container {
                    display: flex;
                    gap: 1rem;
                    height: 500px;
                }
                .config-tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    width: 180px;
                    border-right: 1px solid var(--gray-200);
                    padding-right: 1rem;
                }
                .config-tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                }
                .config-tab:hover {
                    background: var(--gray-100);
                }
                .config-tab.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
                .config-panels {
                    flex: 1;
                    overflow-y: auto;
                }
                .config-panel {
                    display: none;
                }
                .config-panel.active {
                    display: block;
                }
                .config-section {
                    margin-bottom: 2rem;
                }
                .config-section h3 {
                    margin-bottom: 1rem;
                    color: var(--gray-800);
                }
                .form-group {
                    margin-bottom: 1rem;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: var(--gray-700);
                }
                .form-group input, .form-group select {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid var(--gray-300);
                    border-radius: 0.25rem;
                }
                .feature-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    border: 1px solid var(--gray-200);
                    border-radius: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .feature-info {
                    flex: 1;
                }
                .feature-name {
                    font-weight: 500;
                    color: var(--gray-800);
                }
                .feature-description {
                    font-size: 0.875rem;
                    color: var(--gray-600);
                    margin-top: 0.25rem;
                }
                .toggle-switch {
                    position: relative;
                    width: 48px;
                    height: 24px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--gray-300);
                    transition: 0.3s;
                    border-radius: 24px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background-color: var(--primary);
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }
            </style>
        `;
    }

    renderOrganizationPanel(org) {
        return `
            <div class="config-section">
                <h3>Organization Details</h3>
                
                <div class="form-group">
                    <label for="org-name">Organization Name</label>
                    <input type="text" id="org-name" class="form-input" 
                           value="${org.name || 'Work Allocation Team'}"
                           placeholder="Enter organization name">
                </div>

                <div class="form-group">
                    <label for="org-region">Region (for holidays)</label>
                    <select id="org-region" class="form-input">
                        <option value="NSW" ${org.region === 'NSW' ? 'selected' : ''}>NSW</option>
                        <option value="VIC" ${org.region === 'VIC' ? 'selected' : ''}>VIC</option>
                        <option value="QLD" ${org.region === 'QLD' ? 'selected' : ''}>QLD</option>
                        <option value="SA" ${org.region === 'SA' ? 'selected' : ''}>SA</option>
                        <option value="WA" ${org.region === 'WA' ? 'selected' : ''}>WA</option>
                        <option value="TAS" ${org.region === 'TAS' ? 'selected' : ''}>TAS</option>
                        <option value="ACT" ${org.region === 'ACT' ? 'selected' : ''}>ACT</option>
                        <option value="NT" ${org.region === 'NT' ? 'selected' : ''}>NT</option>
                        <option value="Custom" ${org.region === 'Custom' ? 'selected' : ''}>Custom</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="org-timezone">Timezone</label>
                    <input type="text" id="org-timezone" class="form-input" 
                           value="${org.timezone || 'Australia/Sydney'}"
                           placeholder="IANA timezone (e.g., Australia/Sydney)">
                </div>
            </div>
        `;
    }

    renderWorkWeekPanel(workWeek) {
        const startDay = workWeek.startDay || 'tuesday';
        return `
            <div class="config-section">
                <h3>Work Week Configuration</h3>
                
                <div class="form-group">
                    <label for="start-day">Week Start Day</label>
                    <select id="start-day" class="form-input">
                        <option value="monday" ${startDay === 'monday' ? 'selected' : ''}>Monday</option>
                        <option value="tuesday" ${startDay === 'tuesday' ? 'selected' : ''}>Tuesday</option>
                        <option value="wednesday" ${startDay === 'wednesday' ? 'selected' : ''}>Wednesday</option>
                        <option value="thursday" ${startDay === 'thursday' ? 'selected' : ''}>Thursday</option>
                        <option value="friday" ${startDay === 'friday' ? 'selected' : ''}>Friday</option>
                    </select>
                    <small>Note: Changing this requires page reload to take effect</small>
                </div>

                <div class="form-group">
                    <label>Working Days</label>
                    <div class="checkbox-group">
                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => `
                            <label class="checkbox-label">
                                <input type="checkbox" name="working-days" value="${day}" 
                                       ${(workWeek.workingDays || []).includes(day) ? 'checked' : ''}>
                                <span>${day.charAt(0).toUpperCase() + day.slice(1)}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderFeaturesPanel(features) {
        const featureList = [
            { id: 'triageAssignments', name: 'Triage Assignments', desc: 'Category-level triage assignments' },
            { id: 'skillsMatrix', name: 'Skills Matrix', desc: 'Skill-based assignment system' },
            { id: 'workOnHand', name: 'Work on Hand (WOH)', desc: 'WOH tracking with SLA monitoring' },
            { id: 'leaveTracking', name: 'Leave Tracking', desc: 'Staff leave planning and roster' },
            { id: 'conflictDetection', name: 'Conflict Detection', desc: 'Automatic conflict detection' },
            { id: 'monthLocking', name: 'Month Locking', desc: 'Lock completed months' },
            { id: 'shiftSwaps', name: 'Shift Swaps', desc: 'Phone shift swap functionality' },
            { id: 'reportGeneration', name: 'Report Generation', desc: 'Advanced reporting features' }
        ];

        return `
            <div class="config-section">
                <h3>Feature Toggles</h3>
                <p style="color: var(--gray-600); margin-bottom: 1rem;">
                    Enable or disable features based on your team's needs. Changes take effect after page reload.
                </p>
                
                ${featureList.map(feature => `
                    <div class="feature-toggle">
                        <div class="feature-info">
                            <div class="feature-name">${feature.name}</div>
                            <div class="feature-description">${feature.desc}</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" name="feature-${feature.id}" 
                                   ${features[feature.id] !== false ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDisplayPanel(display) {
        return `
            <div class="config-section">
                <h3>Display Preferences</h3>
                
                <div class="form-group">
                    <label for="theme">Theme</label>
                    <select id="theme" class="form-input">
                        <option value="light" ${display.theme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${display.theme === 'dark' ? 'selected' : ''}>Dark</option>
                        <option value="auto" ${display.theme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="default-view">Default View</label>
                    <select id="default-view" class="form-input">
                        <option value="full" ${display.defaultView === 'full' ? 'selected' : ''}>Full Roster</option>
                        <option value="personal" ${display.defaultView === 'personal' ? 'selected' : ''}>Personal View</option>
                    </select>
                </div>

                <div class="feature-toggle">
                    <div class="feature-info">
                        <div class="feature-name">Compact Mode</div>
                        <div class="feature-description">Use smaller fonts and spacing</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="compact-mode" 
                               ${display.compactMode === true ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }

    setupConfigurationHandlers(modal, currentConfig) {
        // Tab switching
        modal.querySelectorAll('.config-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Update tabs
                modal.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update panels
                modal.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
                modal.querySelector(`[data-panel="${tabName}"]`)?.classList.add('active');
            });
        });

        // Save configuration
        modal.querySelector('.save-config')?.addEventListener('click', async () => {
            await this.saveConfiguration(modal);
            modal.remove();
        });

        // Export configuration
        modal.querySelector('.export-config')?.addEventListener('click', () => {
            const exported = this.app.configManager.exportConfig();
            const dataStr = JSON.stringify(exported, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `roster-config-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            NotificationManager.show('Configuration exported', 'success');
        });

        this.setupModalCloseHandlers(modal);
    }

    async saveConfiguration(modal) {
        try {
            // Gather organization data
            const orgData = {
                name: modal.querySelector('#org-name')?.value || 'Work Allocation Team',
                region: modal.querySelector('#org-region')?.value || 'NSW',
                timezone: modal.querySelector('#org-timezone')?.value || 'Australia/Sydney'
            };

            // Gather work week data
            const workWeekData = {
                startDay: modal.querySelector('#start-day')?.value || 'tuesday',
                workingDays: Array.from(modal.querySelectorAll('input[name="working-days"]:checked'))
                    .map(input => input.value)
            };

            // Gather feature flags
            const featuresData = {};
            modal.querySelectorAll('input[name^="feature-"]').forEach(input => {
                const featureName = input.name.replace('feature-', '');
                featuresData[featureName] = input.checked;
            });

            // Gather display preferences
            const displayData = {
                theme: modal.querySelector('#theme')?.value || 'light',
                defaultView: modal.querySelector('#default-view')?.value || 'full',
                compactMode: modal.querySelector('#compact-mode')?.checked || false
            };

            // Update configuration
            await this.app.configManager.updateSection('organization', orgData);
            await this.app.configManager.updateSection('workWeek', workWeekData);
            await this.app.configManager.updateSection('features', featuresData);
            await this.app.configManager.updateSection('display', displayData);

            NotificationManager.show('Configuration saved! Page will reload...', 'success');
            
            // Reload page to apply changes
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('Error saving configuration:', error);
            NotificationManager.show('Failed to save configuration', 'error');
        }
    }

    // ===== UTILITY METHODS =====

    createModal({ title, content, footer, size = 'modal-medium' }) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        // Ensure proper size class and add inline styles as fallback
        const modalSizeClass = size || 'modal-medium';
        const sizeStyles = this.getModalSizeStyles(modalSizeClass);
        
        modal.innerHTML = `
            <div class="modal ${modalSizeClass}" style="${sizeStyles}">
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
        
        return modal;
    }

    getModalSizeStyles(sizeClass) {
        // Fallback inline styles to ensure proper modal sizing
        const sizeMap = {
            'modal-small': 'width: 400px; max-width: 90vw; min-height: 200px;',
            'modal-medium': 'width: 600px; max-width: 90vw; min-height: 400px;',
            'modal-large': 'width: 800px; max-width: 95vw; min-height: 500px;',
            'modal-fullscreen': 'width: 95vw; height: 90vh; max-width: none;'
        };
        
        const baseStyles = 'position: relative; background: white; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); margin: 5vh auto; padding: 0; display: flex; flex-direction: column;';
        
        return baseStyles + (sizeMap[sizeClass] || sizeMap['modal-medium']);
    }

    setupModalCloseHandlers(modal) {
        const closeModal = () => modal.remove();
        
        modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
}