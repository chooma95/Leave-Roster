/**
 * Setup Wizard - First-Run Experience
 * Guides new users through initial configuration
 */

export class SetupWizard {
    constructor(configManager, templateLoader) {
        this.configManager = configManager;
        this.templateLoader = templateLoader;
        this.currentStep = 0;
        this.wizardData = {};
        this.steps = [
            'welcome',
            'template',
            'organization',
            'workweek',
            'features',
            'complete'
        ];
    }

    /**
     * Check if setup wizard should be shown
     * Returns true if this is a first-run (no existing config)
     */
    async shouldShowWizard() {
        const hasExistingData = await chrome.storage.local.get(['rosterData', 'configData']);
        
        // Show wizard if no roster data AND no config data
        const isFirstRun = !hasExistingData.rosterData && !hasExistingData.configData;
        
        // Also check if user has explicitly requested wizard
        const wizardRequested = await chrome.storage.local.get('showWizard');
        
        return isFirstRun || wizardRequested.showWizard === true;
    }

    /**
     * Start the setup wizard
     */
    async start() {
        this.currentStep = 0;
        this.wizardData = {};
        await this.render();
    }

    /**
     * Render the current wizard step
     */
    async render() {
        const stepName = this.steps[this.currentStep];
        const stepHtml = await this.getStepHtml(stepName);
        
        const wizardModal = this.createWizardModal(stepHtml);
        document.body.appendChild(wizardModal);
        
        this.attachEventListeners();
    }

    /**
     * Create wizard modal structure
     */
    createWizardModal(contentHtml) {
        const modal = document.createElement('div');
        modal.id = 'setup-wizard-modal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '10000';
        
        const progress = Math.round(((this.currentStep + 1) / this.steps.length) * 100);
        
        modal.innerHTML = `
            <div class="modal-container wizard-container">
                <div class="wizard-header">
                    <h2>
                        <span class="material-icons">assistant</span>
                        Setup Wizard
                    </h2>
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">Step ${this.currentStep + 1} of ${this.steps.length}</span>
                    </div>
                </div>
                
                <div class="wizard-content">
                    ${contentHtml}
                </div>
                
                <div class="wizard-footer">
                    <button id="wizard-prev" class="btn btn-ghost" ${this.currentStep === 0 ? 'disabled' : ''}>
                        <span class="material-icons">chevron_left</span>
                        Previous
                    </button>
                    <button id="wizard-skip" class="btn btn-ghost">
                        Skip Setup
                    </button>
                    <button id="wizard-next" class="btn btn-primary">
                        ${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}
                        <span class="material-icons">chevron_right</span>
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Get HTML for specific wizard step
     */
    async getStepHtml(stepName) {
        switch (stepName) {
            case 'welcome':
                return this.getWelcomeHtml();
            case 'template':
                return await this.getTemplateHtml();
            case 'organization':
                return this.getOrganizationHtml();
            case 'workweek':
                return this.getWorkWeekHtml();
            case 'features':
                return this.getFeaturesHtml();
            case 'complete':
                return this.getCompleteHtml();
            default:
                return '<p>Unknown step</p>';
        }
    }

    /**
     * Welcome step
     */
    getWelcomeHtml() {
        return `
            <div class="wizard-step wizard-welcome">
                <div class="welcome-hero">
                    <span class="material-icons welcome-icon">calendar_today</span>
                    <h1>Welcome to Work Allocation Roster</h1>
                    <p class="welcome-subtitle">Let's get you set up in just a few steps</p>
                </div>
                
                <div class="welcome-features">
                    <div class="feature-card">
                        <span class="material-icons">people</span>
                        <h3>Team Management</h3>
                        <p>Manage staff, tasks, and assignments</p>
                    </div>
                    <div class="feature-card">
                        <span class="material-icons">event_available</span>
                        <h3>Leave Tracking</h3>
                        <p>Track leave and availability</p>
                    </div>
                    <div class="feature-card">
                        <span class="material-icons">tune</span>
                        <h3>Fully Configurable</h3>
                        <p>Customize everything to your needs</p>
                    </div>
                    <div class="feature-card">
                        <span class="material-icons">phone</span>
                        <h3>Phone Shifts</h3>
                        <p>Manage phone coverage rotation</p>
                    </div>
                </div>
                
                <p class="welcome-note">
                    <span class="material-icons">info</span>
                    This wizard will help you configure the roster for your team. You can change any setting later.
                </p>
            </div>
        `;
    }

    /**
     * Template selection step
     */
    async getTemplateHtml() {
        const templates = await this.templateLoader.listTemplates();
        
        let templateCards = '';
        
        // Add "Blank Template" option
        templateCards += `
            <div class="template-card" data-template="blank">
                <div class="template-icon">
                    <span class="material-icons">add_circle_outline</span>
                </div>
                <h3>Start from Scratch</h3>
                <p>Create your own configuration from the ground up</p>
                <ul class="template-features">
                    <li>No pre-configured staff or tasks</li>
                    <li>Full customization</li>
                    <li>Recommended for unique setups</li>
                </ul>
                <button class="btn btn-primary select-template-btn">Select</button>
            </div>
        `;
        
        // Add template cards
        for (const template of templates) {
            const metadata = template.metadata || {};
            templateCards += `
                <div class="template-card" data-template="${template.id}">
                    <div class="template-icon">
                        <span class="material-icons">${metadata.icon || 'description'}</span>
                    </div>
                    <h3>${metadata.name || template.id}</h3>
                    <p>${metadata.description || 'Pre-configured template'}</p>
                    <ul class="template-features">
                        <li>${metadata.staffCount || 0} staff members</li>
                        <li>${metadata.taskCount || 0} tasks</li>
                        <li>${metadata.organization || 'Generic'} setup</li>
                    </ul>
                    <button class="btn btn-primary select-template-btn">Select</button>
                    <button class="btn btn-ghost preview-template-btn">Preview</button>
                </div>
            `;
        }
        
        return `
            <div class="wizard-step wizard-template">
                <h2>Choose a Starting Template</h2>
                <p>Select a template that best matches your organization, or start from scratch.</p>
                
                <div class="template-grid">
                    ${templateCards}
                </div>
                
                <div id="template-preview" class="template-preview" style="display: none;">
                    <h3>Template Preview</h3>
                    <div id="preview-content"></div>
                    <button class="btn btn-ghost close-preview-btn">Close Preview</button>
                </div>
            </div>
        `;
    }

    /**
     * Organization details step
     */
    getOrganizationHtml() {
        const config = this.configManager.config;
        
        return `
            <div class="wizard-step wizard-organization">
                <h2>Organization Details</h2>
                <p>Tell us about your organization</p>
                
                <div class="form-group">
                    <label for="org-name">
                        <span class="material-icons">business</span>
                        Organization Name
                    </label>
                    <input type="text" id="org-name" class="form-input" 
                           value="${config.organization?.name || ''}" 
                           placeholder="e.g., NSW Department of Transport">
                </div>
                
                <div class="form-group">
                    <label for="team-name">
                        <span class="material-icons">group</span>
                        Team/Department Name
                    </label>
                    <input type="text" id="team-name" class="form-input" 
                           value="${config.organization?.department || ''}" 
                           placeholder="e.g., Customer Administration Unit">
                </div>
                
                <div class="form-group">
                    <label for="region">
                        <span class="material-icons">location_on</span>
                        Region/Location
                    </label>
                    <input type="text" id="region" class="form-input" 
                           value="${config.organization?.region || ''}" 
                           placeholder="e.g., Sydney, Australia">
                </div>
                
                <div class="form-group">
                    <label for="timezone">
                        <span class="material-icons">schedule</span>
                        Timezone
                    </label>
                    <select id="timezone" class="form-input">
                        <option value="Australia/Sydney" ${config.organization?.timezone === 'Australia/Sydney' ? 'selected' : ''}>Australia/Sydney (AEST/AEDT)</option>
                        <option value="Australia/Melbourne" ${config.organization?.timezone === 'Australia/Melbourne' ? 'selected' : ''}>Australia/Melbourne (AEST/AEDT)</option>
                        <option value="Australia/Brisbane" ${config.organization?.timezone === 'Australia/Brisbane' ? 'selected' : ''}>Australia/Brisbane (AEST)</option>
                        <option value="Australia/Perth" ${config.organization?.timezone === 'Australia/Perth' ? 'selected' : ''}>Australia/Perth (AWST)</option>
                        <option value="Pacific/Auckland" ${config.organization?.timezone === 'Pacific/Auckland' ? 'selected' : ''}>New Zealand (NZST/NZDT)</option>
                        <option value="America/New_York" ${config.organization?.timezone === 'America/New_York' ? 'selected' : ''}>US Eastern Time</option>
                        <option value="America/Chicago" ${config.organization?.timezone === 'America/Chicago' ? 'selected' : ''}>US Central Time</option>
                        <option value="America/Los_Angeles" ${config.organization?.timezone === 'America/Los_Angeles' ? 'selected' : ''}>US Pacific Time</option>
                        <option value="Europe/London" ${config.organization?.timezone === 'Europe/London' ? 'selected' : ''}>UK (GMT/BST)</option>
                        <option value="UTC" ${config.organization?.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                    </select>
                </div>
            </div>
        `;
    }

    /**
     * Work week configuration step
     */
    getWorkWeekHtml() {
        const config = this.configManager.config;
        const weekStart = config.workWeek?.startDay || 'monday';
        const weekDays = config.workWeek?.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        const days = [
            { id: 'monday', label: 'Monday' },
            { id: 'tuesday', label: 'Tuesday' },
            { id: 'wednesday', label: 'Wednesday' },
            { id: 'thursday', label: 'Thursday' },
            { id: 'friday', label: 'Friday' },
            { id: 'saturday', label: 'Saturday' },
            { id: 'sunday', label: 'Sunday' }
        ];
        
        return `
            <div class="wizard-step wizard-workweek">
                <h2>Work Week Configuration</h2>
                <p>Configure your team's work week</p>
                
                <div class="form-group">
                    <label for="week-start">
                        <span class="material-icons">event</span>
                        Week Starts On
                    </label>
                    <select id="week-start" class="form-input">
                        ${days.map(day => `
                            <option value="${day.id}" ${weekStart === day.id ? 'selected' : ''}>
                                ${day.label}
                            </option>
                        `).join('')}
                    </select>
                    <small>Choose the first day of your work week (e.g., Monday for standard, Tuesday for NSW Government)</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <span class="material-icons">view_week</span>
                        Work Days
                    </label>
                    <div class="day-checkboxes">
                        ${days.map(day => `
                            <label class="checkbox-label">
                                <input type="checkbox" name="work-day" value="${day.id}" 
                                       ${weekDays.includes(day.id) ? 'checked' : ''}>
                                <span>${day.label}</span>
                            </label>
                        `).join('')}
                    </div>
                    <small>Select the days your team typically works</small>
                </div>
                
                <div class="form-group">
                    <label for="sla-days">
                        <span class="material-icons">timer</span>
                        SLA Days (Work on Hand tracking)
                    </label>
                    <input type="number" id="sla-days" class="form-input" min="1" max="90" 
                           value="${config.workWeek?.slaDays || 14}">
                    <small>Number of days before work is considered overdue (default: 14)</small>
                </div>
            </div>
        `;
    }

    /**
     * Features selection step
     */
    getFeaturesHtml() {
        const features = this.configManager.config.features || {};
        
        const featureList = [
            { id: 'triageAssignments', icon: 'inbox', name: 'Triage Assignments', description: 'Track unassigned work in triage queue' },
            { id: 'skillsMatrix', icon: 'engineering', name: 'Skills Matrix', description: 'Track staff skill levels for tasks' },
            { id: 'workOnHand', icon: 'assessment', name: 'Work on Hand (WOH)', description: 'Track pending work and SLA compliance' },
            { id: 'leaveTracking', icon: 'event_available', name: 'Leave Tracking', description: 'Manage staff leave and availability' },
            { id: 'conflictDetection', icon: 'warning', name: 'Conflict Detection', description: 'Detect assignment conflicts automatically' },
            { id: 'monthLocking', icon: 'lock', name: 'Month Locking', description: 'Lock past months to prevent changes' },
            { id: 'shiftSwaps', icon: 'swap_horiz', name: 'Shift Swaps', description: 'Allow staff to swap shifts' },
            { id: 'reportGeneration', icon: 'summarize', name: 'Report Generation', description: 'Generate utilization and coverage reports' },
            { id: 'buildMode', icon: 'edit', name: 'Build Mode', description: 'Enable editing and assignment capabilities' }
        ];
        
        return `
            <div class="wizard-step wizard-features">
                <h2>Enable Features</h2>
                <p>Choose which features you want to enable. You can change these later.</p>
                
                <div class="features-grid">
                    ${featureList.map(feature => `
                        <div class="feature-toggle-card">
                            <div class="feature-toggle-header">
                                <span class="material-icons">${feature.icon}</span>
                                <label class="toggle-switch">
                                    <input type="checkbox" name="feature" value="${feature.id}" 
                                           ${features[feature.id] !== false ? 'checked' : ''}>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            <h4>${feature.name}</h4>
                            <p>${feature.description}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div class="wizard-note">
                    <span class="material-icons">lightbulb</span>
                    <p>Don't worry! You can enable or disable any feature later in the settings.</p>
                </div>
            </div>
        `;
    }

    /**
     * Completion step
     */
    getCompleteHtml() {
        return `
            <div class="wizard-step wizard-complete">
                <div class="complete-hero">
                    <span class="material-icons complete-icon">check_circle</span>
                    <h1>Setup Complete!</h1>
                    <p>Your roster is ready to use</p>
                </div>
                
                <div class="next-steps">
                    <h3>Next Steps:</h3>
                    <div class="step-card">
                        <span class="material-icons">group_add</span>
                        <div>
                            <h4>Add Your Team</h4>
                            <p>Go to Settings → Staff Management to add team members</p>
                        </div>
                    </div>
                    <div class="step-card">
                        <span class="material-icons">assignment</span>
                        <div>
                            <h4>Configure Tasks</h4>
                            <p>Go to Settings → Task Management to define your tasks</p>
                        </div>
                    </div>
                    <div class="step-card">
                        <span class="material-icons">calendar_month</span>
                        <div>
                            <h4>Start Assigning</h4>
                            <p>Click "Manage" → "Enter Build Mode" to start creating assignments</p>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-note">
                    <span class="material-icons">help</span>
                    <p>Need help? Check out the documentation or run the setup wizard again from Settings.</p>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to wizard buttons
     */
    attachEventListeners() {
        const modal = document.getElementById('setup-wizard-modal');
        if (!modal) return;
        
        // Previous button
        const prevBtn = modal.querySelector('#wizard-prev');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
        }
        
        // Next button
        const nextBtn = modal.querySelector('#wizard-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        
        // Skip button
        const skipBtn = modal.querySelector('#wizard-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipWizard());
        }
        
        // Template selection
        const templateBtns = modal.querySelectorAll('.select-template-btn');
        templateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.template-card');
                const templateId = card.dataset.template;
                this.selectTemplate(templateId);
            });
        });
        
        // Template preview
        const previewBtns = modal.querySelectorAll('.preview-template-btn');
        previewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.template-card');
                const templateId = card.dataset.template;
                this.previewTemplate(templateId);
            });
        });
        
        // Close preview
        const closePreviewBtn = modal.querySelector('.close-preview-btn');
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
                modal.querySelector('#template-preview').style.display = 'none';
            });
        }
    }

    /**
     * Move to previous step
     */
    async previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            await this.updateWizard();
        }
    }

    /**
     * Move to next step
     */
    async nextStep() {
        // Capture current step data
        await this.captureStepData();
        
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            await this.updateWizard();
        } else {
            // Final step - complete wizard
            await this.completeWizard();
        }
    }

    /**
     * Capture data from current step
     */
    async captureStepData() {
        const stepName = this.steps[this.currentStep];
        const modal = document.getElementById('setup-wizard-modal');
        
        switch (stepName) {
            case 'organization':
                this.wizardData.organization = {
                    name: modal.querySelector('#org-name')?.value || '',
                    department: modal.querySelector('#team-name')?.value || '',
                    region: modal.querySelector('#region')?.value || '',
                    timezone: modal.querySelector('#timezone')?.value || 'Australia/Sydney'
                };
                break;
                
            case 'workweek':
                const workDays = Array.from(modal.querySelectorAll('input[name="work-day"]:checked'))
                    .map(cb => cb.value);
                
                this.wizardData.workWeek = {
                    startDay: modal.querySelector('#week-start')?.value || 'monday',
                    workDays: workDays,
                    slaDays: parseInt(modal.querySelector('#sla-days')?.value || '14')
                };
                break;
                
            case 'features':
                const features = {};
                modal.querySelectorAll('input[name="feature"]').forEach(cb => {
                    features[cb.value] = cb.checked;
                });
                this.wizardData.features = features;
                break;
        }
    }

    /**
     * Update wizard display
     */
    async updateWizard() {
        const oldModal = document.getElementById('setup-wizard-modal');
        if (oldModal) {
            oldModal.remove();
        }
        await this.render();
    }

    /**
     * Select a template
     */
    async selectTemplate(templateId) {
        this.wizardData.selectedTemplate = templateId;
        
        // Highlight selected template
        const modal = document.getElementById('setup-wizard-modal');
        modal.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('selected');
        });
        modal.querySelector(`[data-template="${templateId}"]`)?.classList.add('selected');
        
        // Auto-advance after short delay
        setTimeout(() => this.nextStep(), 500);
    }

    /**
     * Preview a template
     */
    async previewTemplate(templateId) {
        const modal = document.getElementById('setup-wizard-modal');
        const previewDiv = modal.querySelector('#template-preview');
        const contentDiv = modal.querySelector('#preview-content');
        
        if (templateId === 'blank') {
            contentDiv.innerHTML = '<p>Starting from scratch - no pre-configured data.</p>';
        } else {
            const template = await this.templateLoader.getTemplate(templateId);
            
            let html = '<div class="preview-sections">';
            
            if (template.organization) {
                html += `
                    <div class="preview-section">
                        <h4><span class="material-icons">business</span> Organization</h4>
                        <p><strong>Name:</strong> ${template.organization.name || 'N/A'}</p>
                        <p><strong>Department:</strong> ${template.organization.department || 'N/A'}</p>
                    </div>
                `;
            }
            
            if (template.staff && template.staff.length > 0) {
                html += `
                    <div class="preview-section">
                        <h4><span class="material-icons">group</span> Staff (${template.staff.length})</h4>
                        <ul>
                            ${template.staff.slice(0, 5).map(s => `<li>${s.name}</li>`).join('')}
                            ${template.staff.length > 5 ? `<li><em>... and ${template.staff.length - 5} more</em></li>` : ''}
                        </ul>
                    </div>
                `;
            }
            
            if (template.tasks && template.tasks.length > 0) {
                html += `
                    <div class="preview-section">
                        <h4><span class="material-icons">assignment</span> Tasks (${template.tasks.length})</h4>
                        <ul>
                            ${template.tasks.slice(0, 5).map(t => `<li>${t.name}</li>`).join('')}
                            ${template.tasks.length > 5 ? `<li><em>... and ${template.tasks.length - 5} more</em></li>` : ''}
                        </ul>
                    </div>
                `;
            }
            
            html += '</div>';
            contentDiv.innerHTML = html;
        }
        
        previewDiv.style.display = 'block';
    }

    /**
     * Skip wizard
     */
    async skipWizard() {
        if (confirm('Are you sure you want to skip the setup wizard? You can run it again later from Settings.')) {
            await this.closeWizard();
            // Mark wizard as completed to not show again
            await chrome.storage.local.set({ showWizard: false });
        }
    }

    /**
     * Complete wizard and apply configuration
     */
    async completeWizard() {
        try {
            // Load template if selected
            if (this.wizardData.selectedTemplate && this.wizardData.selectedTemplate !== 'blank') {
                await this.templateLoader.loadTemplate(this.wizardData.selectedTemplate);
            }
            
            // Apply wizard configuration
            if (this.wizardData.organization) {
                this.configManager.set('organization', this.wizardData.organization);
            }
            
            if (this.wizardData.workWeek) {
                this.configManager.set('workWeek', this.wizardData.workWeek);
            }
            
            if (this.wizardData.features) {
                this.configManager.set('features', this.wizardData.features);
            }
            
            // Save configuration
            await this.configManager.save();
            
            // Mark wizard as completed
            await chrome.storage.local.set({ showWizard: false });
            
            // Close wizard
            await this.closeWizard();
            
            // Reload the application to apply changes
            window.location.reload();
            
        } catch (error) {
            console.error('Error completing wizard:', error);
            alert('Error completing setup. Please try again.');
        }
    }

    /**
     * Close wizard modal
     */
    async closeWizard() {
        const modal = document.getElementById('setup-wizard-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Reset wizard (for re-running)
     */
    static async resetWizard() {
        await chrome.storage.local.set({ showWizard: true });
        alert('Setup wizard will run on next launch. Reloading...');
        window.location.reload();
    }
}
