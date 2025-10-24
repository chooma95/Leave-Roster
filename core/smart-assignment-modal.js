// ===== SMART ASSIGNMENT MODAL CONTENT =====
// This file contains the complete modal implementation for smart assignment
// Import this into modals.js to add the feature

export const SmartAssignmentModalMixin = {
    showSmartAssignmentModal(date, taskId) {
        if (!this.app.smartAssignmentEngine) {
            NotificationManager.show('Smart Assignment feature not available', 'error');
            return;
        }

        const task = this.app.state.tasks.find(t => t.id === taskId);
        if (!task) {
            NotificationManager.show('Task not found', 'error');
            return;
        }

        const DateUtils = this.app.constructor.DateUtils || window.DateUtils;
        const dateStr = DateUtils.toISODate(date);
        const currentAssignments = this.app.state.assignments[dateStr]?.[taskId] || [];

        const modal = this.createModal({
            title: `Smart Assignment - ${task.name}`,
            size: 'modal-large',
            content: this.renderSmartAssignmentContent(task, date, currentAssignments),
            footer: `
                <button class="btn btn-ghost close-modal">Cancel</button>
                <button class="btn btn-secondary get-suggestions">
                    <span class="material-icons">psychology</span>
                    Get AI Suggestions
                </button>
                <button class="btn btn-primary apply-assignments" disabled>
                    <span class="material-icons">check</span>
                    Apply Selected
                </button>
            `
        });

        this.setupSmartAssignmentHandlers(modal, date, task);
        document.body.appendChild(modal);
    },

    renderSmartAssignmentContent(task, date, currentAssignments) {
        const DateUtils = this.app.constructor.DateUtils || window.DateUtils;
        
        return `
            <div class="smart-assignment-container">
                <div class="assignment-info-card">
                    <div class="info-row">
                        <span class="info-label">
                            <span class="material-icons">assignment</span>
                            Task:
                        </span>
                        <span class="info-value">${task.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <span class="material-icons">event</span>
                            Date:
                        </span>
                        <span class="info-value">${DateUtils.formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">
                            <span class="material-icons">people</span>
                            Currently Assigned:
                        </span>
                        <span class="info-value">${currentAssignments.length} staff</span>
                    </div>
                </div>

                <div class="assignment-mode-selector">
                    <label class="section-label">
                        <span class="material-icons">tune</span>
                        Assignment Mode
                    </label>
                    <div class="mode-options">
                        <label class="radio-option">
                            <input type="radio" name="assignment-mode" value="balanced" checked>
                            <div class="option-card">
                                <span class="material-icons">balance</span>
                                <strong>Balanced</strong>
                                <small>Distribute workload evenly considering WOH</small>
                            </div>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="assignment-mode" value="skill-based">
                            <div class="option-card">
                                <span class="material-icons">star</span>
                                <strong>Skill-Based</strong>
                                <small>Prioritize highest skilled staff first</small>
                            </div>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="assignment-mode" value="training">
                            <div class="option-card">
                                <span class="material-icons">school</span>
                                <strong>Training</strong>
                                <small>Create skill development opportunities</small>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="assignment-options">
                    <label class="section-label">
                        <span class="material-icons">settings</span>
                        Options
                    </label>
                    <label class="checkbox-option">
                        <input type="checkbox" id="consider-woh" checked>
                        <span class="material-icons">work</span>
                        <span>Consider Work On Hand (balance workload)</span>
                    </label>
                    <label class="checkbox-option">
                        <input type="checkbox" id="allow-stretch" checked>
                        <span class="material-icons">trending_up</span>
                        <span>Allow stretch assignments (slightly above current skill)</span>
                    </label>
                    <label class="checkbox-option">
                        <input type="checkbox" id="respect-shifts">
                        <span class="material-icons">schedule</span>
                        <span>Respect shift preferences (early/late)</span>
                    </label>
                </div>

                <div class="min-skill-selector">
                    <label for="min-skill-level">
                        <span class="material-icons">military_tech</span>
                        Minimum Skill Level:
                    </label>
                    <select id="min-skill-level" class="form-select">
                        <option value="0">Any Skill Level (0+)</option>
                        <option value="1" selected>Beginner (1+)</option>
                        <option value="2">Intermediate (2+)</option>
                        <option value="3">Advanced (3+)</option>
                        <option value="4">Expert (4+)</option>
                        <option value="5">Master (5)</option>
                    </select>
                </div>

                <div class="suggestion-preview" id="suggestion-preview">
                    <div class="loading-state">
                        <span class="material-icons">psychology</span>
                        <p>Click "Get AI Suggestions" to analyze and recommend staff</p>
                        <small>Our AI will consider skills, workload, availability, and preferences</small>
                    </div>
                </div>
            </div>

            ${this.getSmartAssignmentStyles()}
        `;
    },

    getSmartAssignmentStyles() {
        return `
            <style>
                .smart-assignment-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    max-height: 70vh;
                    overflow-y: auto;
                }
                
                .assignment-info-card {
                    background: linear-gradient(135deg, var(--primary-light) 0%, var(--gray-100) 100%);
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    border: 1px solid var(--gray-200);
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .info-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    color: var(--gray-700);
                }
                
                .info-label .material-icons {
                    font-size: 1.25rem;
                    color: var(--primary);
                }
                
                .info-value {
                    color: var(--gray-900);
                    font-weight: 500;
                }
                
                .assignment-mode-selector,
                .assignment-options {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .section-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    color: var(--gray-700);
                    letter-spacing: 0.5px;
                }
                
                .section-label .material-icons {
                    font-size: 1.25rem;
                }
                
                .mode-options {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 1rem;
                }
                
                .radio-option {
                    cursor: pointer;
                }
                
                .radio-option input {
                    display: none;
                }
                
                .option-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    padding: 1.25rem;
                    border: 2px solid var(--gray-300);
                    border-radius: 0.75rem;
                    transition: all 0.3s ease;
                    gap: 0.5rem;
                    background: white;
                    height: 100%;
                    min-height: 140px;
                }
                
                .option-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .option-card .material-icons {
                    font-size: 2.5rem;
                    color: var(--gray-500);
                    transition: color 0.3s;
                }
                
                .option-card strong {
                    font-size: 0.875rem;
                    color: var(--gray-900);
                }
                
                .option-card small {
                    font-size: 0.75rem;
                    color: var(--gray-600);
                    line-height: 1.4;
                }
                
                .radio-option input:checked + .option-card {
                    border-color: var(--primary);
                    background: linear-gradient(135deg, var(--primary-light) 0%, white 100%);
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.2);
                }
                
                .radio-option input:checked + .option-card .material-icons {
                    color: var(--primary);
                }
                
                .assignment-options {
                    padding: 1.25rem;
                    background: var(--gray-50);
                    border-radius: 0.75rem;
                    border: 1px solid var(--gray-200);
                }
                
                .checkbox-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    transition: background 0.2s;
                }
                
                .checkbox-option:hover {
                    background: var(--gray-100);
                }
                
                .checkbox-option input {
                    width: 1.25rem;
                    height: 1.25rem;
                    cursor: pointer;
                    accent-color: var(--primary);
                }
                
                .checkbox-option .material-icons {
                    font-size: 1.25rem;
                    color: var(--gray-600);
                }
                
                .min-skill-selector {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--gray-50);
                    border-radius: 0.75rem;
                    border: 1px solid var(--gray-200);
                }
                
                .min-skill-selector label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    white-space: nowrap;
                }
                
                .min-skill-selector label .material-icons {
                    color: var(--primary);
                }
                
                .min-skill-selector select {
                    flex: 1;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--gray-300);
                }
                
                .suggestion-preview {
                    min-height: 250px;
                    max-height: 400px;
                    overflow-y: auto;
                    border: 2px dashed var(--gray-300);
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    background: var(--gray-50);
                }
                
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: var(--gray-500);
                    height: 100%;
                    text-align: center;
                    padding: 2rem;
                }
                
                .loading-state .material-icons {
                    font-size: 3.5rem;
                    color: var(--primary);
                }
                
                .loading-state p {
                    font-weight: 500;
                    font-size: 1rem;
                }
                
                .loading-state small {
                    font-size: 0.875rem;
                    color: var(--gray-400);
                }
                
                .suggestion-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                    background: white;
                    border: 2px solid var(--gray-200);
                    border-radius: 0.75rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                
                .suggestion-card:hover {
                    border-color: var(--primary);
                    background: var(--primary-light);
                    transform: translateX(4px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .suggestion-card input[type="checkbox"] {
                    width: 1.5rem;
                    height: 1.5rem;
                    cursor: pointer;
                    accent-color: var(--primary);
                    margin-top: 0.25rem;
                }
                
                .suggestion-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .suggestion-name {
                    font-weight: 600;
                    font-size: 1rem;
                    color: var(--gray-900);
                }
                
                .suggestion-reason {
                    font-size: 0.875rem;
                    color: var(--gray-600);
                    line-height: 1.4;
                }
                
                .suggestion-metrics {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    font-size: 0.75rem;
                    padding-top: 0.5rem;
                }
                
                .metric {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.25rem 0.75rem;
                    background: var(--gray-100);
                    border-radius: 1rem;
                    font-weight: 500;
                }
                
                .metric .material-icons {
                    font-size: 1rem;
                    color: var(--primary);
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                .spin {
                    animation: spin 2s linear infinite;
                }
                
                /* Scrollbar styling */
                .smart-assignment-container::-webkit-scrollbar,
                .suggestion-preview::-webkit-scrollbar {
                    width: 8px;
                }
                
                .smart-assignment-container::-webkit-scrollbar-track,
                .suggestion-preview::-webkit-scrollbar-track {
                    background: var(--gray-100);
                    border-radius: 4px;
                }
                
                .smart-assignment-container::-webkit-scrollbar-thumb,
                .suggestion-preview::-webkit-scrollbar-thumb {
                    background: var(--gray-400);
                    border-radius: 4px;
                }
                
                .smart-assignment-container::-webkit-scrollbar-thumb:hover,
                .suggestion-preview::-webkit-scrollbar-thumb:hover {
                    background: var(--gray-500);
                }
            </style>
        `;
    },

    setupSmartAssignmentHandlers(modal, date, task) {
        const getSuggestionsBtn = modal.querySelector('.get-suggestions');
        const applyBtn = modal.querySelector('.apply-assignments');
        const previewDiv = modal.querySelector('#suggestion-preview');
        const DateUtils = this.app.constructor.DateUtils || window.DateUtils;
        const NotificationManager = window.NotificationManager || this.app.NotificationManager;

        getSuggestionsBtn.addEventListener('click', async () => {
            const mode = modal.querySelector('input[name="assignment-mode"]:checked').value;
            const considerWOH = modal.querySelector('#consider-woh').checked;
            const allowStretch = modal.querySelector('#allow-stretch').checked;
            const respectShifts = modal.querySelector('#respect-shifts').checked;
            const minSkillLevel = parseInt(modal.querySelector('#min-skill-level').value);

            previewDiv.innerHTML = `
                <div class="loading-state">
                    <span class="material-icons spin">psychology</span>
                    <p>Analyzing staff availability, skills, and workload...</p>
                    <small>This may take a moment</small>
                </div>
            `;

            const options = {
                mode,
                considerWOH,
                allowStretch,
                respectShifts,
                minSkillLevel
            };

            try {
                const suggestions = await this.app.smartAssignmentEngine.suggestAssignments(
                    date,
                    task.id,
                    options
                );

                if (suggestions.length === 0) {
                    previewDiv.innerHTML = `
                        <div class="loading-state">
                            <span class="material-icons">warning</span>
                            <p>No suitable staff found for this task</p>
                            <small>Try lowering the minimum skill level or changing the assignment mode</small>
                        </div>
                    `;
                    applyBtn.disabled = true;
                    return;
                }

                previewDiv.innerHTML = suggestions.map((suggestion, index) => `
                    <div class="suggestion-card">
                        <input type="checkbox" class="suggestion-checkbox" 
                               data-staff-id="${suggestion.staffId}" 
                               ${index < 2 ? 'checked' : ''}>
                        <div class="suggestion-info">
                            <span class="suggestion-name">${suggestion.staffName}</span>
                            <span class="suggestion-reason">${suggestion.reason}</span>
                            <div class="suggestion-metrics">
                                <span class="metric">
                                    <span class="material-icons">star</span>
                                    Skill: ${suggestion.skillLevel}/5
                                </span>
                                <span class="metric">
                                    <span class="material-icons">work</span>
                                    WOH: ${suggestion.currentWOH}
                                </span>
                                <span class="metric">
                                    <span class="material-icons">trending_up</span>
                                    Score: ${suggestion.score.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('');

                applyBtn.disabled = false;

                // Update apply button when checkboxes change
                previewDiv.querySelectorAll('.suggestion-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        const anyChecked = Array.from(previewDiv.querySelectorAll('.suggestion-checkbox'))
                            .some(cb => cb.checked);
                        applyBtn.disabled = !anyChecked;
                    });
                });

            } catch (error) {
                console.error('Error getting suggestions:', error);
                previewDiv.innerHTML = `
                    <div class="loading-state">
                        <span class="material-icons">error</span>
                        <p>Error generating suggestions</p>
                        <small>${error.message}</small>
                    </div>
                `;
                applyBtn.disabled = true;
            }
        });

        applyBtn.addEventListener('click', () => {
            const selectedStaff = Array.from(previewDiv.querySelectorAll('.suggestion-checkbox:checked'))
                .map(cb => cb.dataset.staffId);

            if (selectedStaff.length === 0) {
                NotificationManager.show('No staff selected', 'warning');
                return;
            }

            // Apply assignments
            const dateStr = DateUtils.toISODate(date);
            if (!this.app.state.assignments[dateStr]) {
                this.app.state.assignments[dateStr] = {};
            }

            // Get current assignments
            const currentAssignments = this.app.state.assignments[dateStr][task.id] || [];

            // Add new staff (avoid duplicates)
            selectedStaff.forEach(staffId => {
                if (!currentAssignments.includes(staffId)) {
                    currentAssignments.push(staffId);
                }
            });

            this.app.state.assignments[dateStr][task.id] = currentAssignments;

            // Save and refresh
            this.app.saveState();
            this.app.uiManager.renderRoster();

            NotificationManager.show(
                `✓ Assigned ${selectedStaff.length} staff to ${task.name}`,
                'success'
            );

            modal.remove();
        });
    }
};
