import { CONFIG, DEFAULT_STAFF, DEFAULT_TASKS, DEFAULT_SKILLS_MATRIX } from './config.js';
import { DateUtils, ArrayUtils, ObjectUtils, StringUtils } from './utils.js';
import { SkillsManager, RotationManager, AssignmentGenerator, ThemeManager, DataManager, PerformanceUtils, ValidationUtils, ErrorHandler } from './managers.js';
import { UIManager, NotificationManager } from './ui.js';
import { ModalManager } from './modals.js';
import { ConflictManager } from './conflicts.js';
import { AssignmentManager } from './assignments.js';
import { ConfigManager } from './core/config-manager.js';
import { FeatureFlags } from './core/feature-flags.js';
import { TemplateLoader } from './core/template-loader.js';
import { SetupWizard } from './core/setup-wizard.js';
import { SmartAssignmentEngine } from './core/auto-assignment.js';
import { StaffMigration, ScheduleUtils } from './config/staff-schema.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Work Allocation Roster v3.5.0');
    
    class WorkAllocationRoster {
        constructor() {
            this.errorHandler = new ErrorHandler();
            this.errorHandler.setupGlobalHandlers();
            this.configManager = new ConfigManager();
            this.initializationPromise = this.initialize();
        }

        async initialize() {
            try {
                console.log('Starting application initialization...');
                
                // Initialize configuration system first
                await this.configManager.initialize();
                console.log('✓ ConfigManager initialized');
                
                // Initialize feature flags and template loader
                this.featureFlags = new FeatureFlags(this.configManager);
                this.templateLoader = new TemplateLoader(this.configManager);
                this.setupWizard = new SetupWizard(this.configManager, this.templateLoader);
                console.log('✓ FeatureFlags, TemplateLoader, and SetupWizard initialized');
                
                // Check if wizard should be shown (first-run)
                const shouldShowWizard = await this.setupWizard.shouldShowWizard();
                if (shouldShowWizard) {
                    console.log('🧙 First-run detected - showing setup wizard');
                    await this.setupWizard.start();
                    // Wizard will reload the page after completion
                    return; // Stop initialization here
                }
                
                this.initializeState();
                console.log('✓ Application state initialized');
                
                this.initializeManagers();
                console.log('✓ Managers initialized');
                
                this.uiManager = new UIManager(this);
                this.modalManager = new ModalManager(this);
                this.conflictManager = new ConflictManager(this);
                this.assignmentManager = new AssignmentManager(this);
                console.log('✓ UI and specialized managers initialized');
                
                this.setupEventListeners();
                console.log('✓ Event listeners setup');
                
                await this.loadDataAndStart();
                console.log('✓ Application startup sequence complete.');
                
                return true;
            } catch (error) {
                console.error('Failed to initialize application:', error);
                this.errorHandler.logError(error, 'Constructor');
                if (this.uiManager) {
                    this.uiManager.showErrorMessage('Failed to initialize application. Please refresh the page.');
                }
                return false;
            }
        }

        initializeState() {
            this.state = {
                currentDate: new Date(),
                currentLeaveDate: new Date(),
                staff: [],
                tasks: [],
                allocations: {},
                leaveRoster: {},
                phoneRoster: {},
                triageAssignments: {},
                lockedMonths: [],
                currentAssignment: {},
                currentView: 'full',
                buildMode: false,
                userProfile: null,
                collapsedSections: new Set(),
                skillsMatrix: {},
                priorityTasks: {},
                shiftRotations: {},
                shiftSwaps: {},
                currentRotationWeek: 1,
                isLoading: true,
                lastSaved: null,
                initialized: false,
                selectedUserId: null,
                conflictMode: false,
                lastLeaveUpdate: null,
                assignmentSuggestions: {},
                workloadAnalytics: {}
            };
        }

        initializeManagers() {
            this.themeManager = new ThemeManager();
            this.dataManager = new DataManager();
            this.skillsManager = new SkillsManager({}, [], []);
            this.rotationManager = new RotationManager([]);
            this.assignmentGenerator = new AssignmentGenerator([], [], this.skillsManager, {}, {}, {}, {});
            this.smartAssignment = new SmartAssignmentEngine(this);
            this.debouncedSave = PerformanceUtils.debounce(() => this.saveData(), 500);
            
            this.debouncedConflictCheck = PerformanceUtils.debounce(() => this.conflictManager?.checkAndDisplayConflicts(), 300);
            this.debouncedWorkloadAnalysis = PerformanceUtils.debounce(() => this.conflictManager?.analyzeWorkloadBalance(), 1000);
        }

        async loadDataAndStart() {
            try {
                this.uiManager.setLoading(true);
                const result = await this.dataManager.load();
                
                if (result.workRosterData) {
                    await this.processLoadedData(result.workRosterData);
                } else {
                    this.initializeDefaults();
                }
                
                this.reinitializeManagers();
                
                this.uiManager.setLoading(false);
                this.state.isLoading = false;

                await this.handleUserProfile(result.userProfile);
                
            } catch (error) {
                this.errorHandler.logError(error, 'Load Data');
                this.uiManager.showErrorMessage('Failed to load data. Using defaults.');
                this.uiManager.setLoading(false);
                this.state.isLoading = false;
                this.initializeDefaults();
                this.reinitializeManagers();
                this.startApplication();
            }
        }

        async processLoadedData(data) {
            // Load staff and tasks from ConfigManager or fallback to saved data or defaults
            // Priority: 1) Saved data 2) ConfigManager (from template) 3) Hardcoded defaults
            let defaultStaff = DEFAULT_STAFF;
            let defaultTasks = DEFAULT_TASKS;
            
            // Try to get staff/tasks from ConfigManager (template data)
            if (this.configManager) {
                const configStaff = this.configManager.get('organization.staff');
                const configTasks = this.configManager.get('organization.tasks');
                
                if (configStaff && Array.isArray(configStaff) && configStaff.length > 0) {
                    defaultStaff = configStaff;
                }
                if (configTasks && Array.isArray(configTasks) && configTasks.length > 0) {
                    defaultTasks = configTasks;
                }
            }
            
            // Migrate staff to new enhanced format (v3.5.0)
            const loadedStaff = data.staff || defaultStaff;
            const migratedStaff = StaffMigration.migrateAll(loadedStaff);
            this.state.staff = this.validateAndMigrateStaff(migratedStaff);
            
            this.state.tasks = this.validateAndMigrateTasks(data.tasks || defaultTasks);
            this.state.allocations = data.allocations || {};
            this.state.leaveRoster = data.leaveRoster || {};
            this.state.phoneRoster = data.phoneRoster || {};
            this.state.triageAssignments = data.triageAssignments || {};
            this.state.lockedMonths = Array.from(data.lockedMonths || []);
            this.state.skillsMatrix = this.migrateSkillsMatrix(data.skillsMatrix || DEFAULT_SKILLS_MATRIX);
            this.state.collapsedSections = new Set(data.collapsedSections || []);
            this.state.priorityTasks = data.priorityTasks || {};
            this.state.shiftRotations = data.shiftRotations || {};
            this.state.shiftSwaps = data.shiftSwaps || {};
            
            this.state.assignmentSuggestions = data.assignmentSuggestions || {};
            this.state.lastLeaveUpdate = data.lastLeaveUpdate || null;
            
            console.log('✓ Staff data migrated to v3.5.0 enhanced format');
        }

        async handleUserProfile(userProfile) {
            this.state.userProfile = userProfile;
            if (!this.state.userProfile) {
                const result = await this.uiManager.showUserProfileModal();
                if (result.cancelled) {
                    await this.saveUserProfile("Default User");
                }
            } else {
                this.state.selectedUserId = this.state.userProfile.id;
                this.uiManager.renderUserSelect();
                this.startApplication();
            }
        }

        async saveUserProfile(name) {
            this.state.userProfile = { name, id: StringUtils.slugify(name) };
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    await new Promise(resolve => chrome.storage.local.set({ userProfile: this.state.userProfile }, resolve));
                } else {
                    localStorage.setItem('userProfile', JSON.stringify(this.state.userProfile));
                }

                this.state.selectedUserId = this.state.userProfile.id;
                this.uiManager.renderUserSelect();
                
                if (!this.state.initialized) {
                    this.startApplication();
                }
            } catch (error) {
                this.errorHandler.logError(error, 'Save User Profile');
                this.uiManager.showErrorMessage('Could not save profile.');
            }
        }

        startApplication() {
            if (this.state.initialized) return;

            console.log('🚀 Starting main application...');
            this.state.initialized = true;
            
            this.uiManager.render();
            this.uiManager.updateModeDisplay();
            this.uiManager.renderUserSelect();
            this.setupResizeHandler();
            this.setupGridEventHandlers();
            
            if (this.conflictManager) {
                this.conflictManager.checkAndDisplayConflicts();
                this.conflictManager.analyzeWorkloadBalance();
            }
            
            console.log('✅ Work Allocation Roster started successfully');
            setTimeout(() => NotificationManager.show('Application loaded successfully', 'success'), 500);
        }

        setupResizeHandler() {
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (this.state.initialized) {
                        this.uiManager.scaleGridToFit();
                    }
                }, 250);
            });
        }

        setupGridEventHandlers() {
            document.addEventListener('click', (e) => {
                // ===== WOH DISPLAY CLICK HANDLER - FIXED =====
                const wohDisplay = e.target.closest('.woh-display');
                if (wohDisplay && this.state.buildMode) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const taskId = wohDisplay.getAttribute('data-task');
                    console.log('WOH display clicked! TaskId:', taskId, 'BuildMode:', this.state.buildMode);
                    
                    if (taskId && taskId !== 'undefined' && taskId !== '') {
                        this.modalManager.showWOHEditModal(taskId);
                        return;
                    } else {
                        console.error('Invalid taskId in WOH display:', taskId);
                        NotificationManager.show('Error: Invalid task ID', 'error');
                        return;
                    }
                }

                // ===== CATEGORY HEADER COLLAPSE =====
                const categoryHeader = e.target.closest('.category-header-row');
                if (categoryHeader && e.target.closest('.collapse-icon')) {
                    const category = Array.from(categoryHeader.classList)
                        .find(c => c.startsWith('category-'))
                        ?.replace('category-', '');
                    
                    if (category) {
                        this.toggleCategoryCollapse(category);
                    }
                    return;
                }

                if (!this.state.buildMode) return;

                // ===== TASK ASSIGNMENT CELLS =====
                const assignmentCell = e.target.closest('.assignment-cell.clickable');
                if (assignmentCell && !e.target.closest('.edit-icon') && !e.target.closest('.push-tuesday-btn')) {
                    const date = new Date(assignmentCell.dataset.date);
                    const taskId = assignmentCell.dataset.task;
                    if (taskId && !DateUtils.isNSWPublicHoliday(date)) {
                        this.modalManager.showAssignmentModal(taskId, date, 'task');
                    }
                }

                // ===== TRIAGE ASSIGNMENT CELLS =====
                const triageCell = e.target.closest('.category-header-day-cell.clickable');
                if (triageCell && !e.target.closest('.assign-triage-btn')) {
                    const date = new Date(triageCell.dataset.date);
                    const headerId = triageCell.dataset.header;
                    if (headerId && !DateUtils.isNSWPublicHoliday(date)) {
                        this.modalManager.showAssignmentModal(headerId, date, 'triage');
                    }
                }

                // ===== PHONE COVERAGE CELLS =====
                const phoneCell = e.target.closest('.phone-coverage-cell.clickable');
                if (phoneCell) {
                    const date = new Date(phoneCell.dataset.date);
                    if (!DateUtils.isNSWPublicHoliday(date)) {
                        this.modalManager.showPhoneAssignmentModal(date);
                    }
                }

                // ===== PUSH TUESDAY BUTTON =====
                if (e.target.classList.contains('push-tuesday-btn')) {
                    const week = DateUtils.getWeek(this.state.currentDate);
                    this.assignmentManager.pushTuesdayToWeek(week[0]);
                }

                // ===== PUSH TRIAGE BUTTON =====
                if (e.target.classList.contains('push-triage-btn')) {
                    const headerId = e.target.dataset.header;
                    const week = DateUtils.getWeek(this.state.currentDate);
                    this.assignmentManager.pushTriageToWeek(headerId, week[0]);
                }

                // ===== ASSIGN TRIAGE BUTTON =====
                if (e.target.classList.contains('assign-triage-btn')) {
                    const headerId = e.target.dataset.header;
                    const week = DateUtils.getWeek(this.state.currentDate);
                    const availableDay = week.find(date => DateUtils.isWorkingDay(date));
                    if (availableDay) {
                        this.modalManager.showAssignmentModal(headerId, availableDay, 'triage');
                    }
                }

                // ===== SWAP ICON =====
                if (e.target.closest('.swap-icon')) {
                    const swapBtn = e.target.closest('.swap-icon');
                    const date = new Date(swapBtn.dataset.date);
                    const shiftType = swapBtn.dataset.shift;
                    const staffId = swapBtn.dataset.staff;
                    this.modalManager.showShiftSwapModal(date, shiftType, staffId);
                }

                // ===== LEAVE CELL =====
                const leaveCell = e.target.closest('.leave-cell');
                if (leaveCell && leaveCell.dataset.date) {
                    const date = new Date(leaveCell.dataset.date);
                    this.modalManager.showLeavePlanningModal(date);
                }

                // ===== CONFLICT RESOLUTION =====
                if (e.target.classList.contains('resolve-conflict-btn')) {
                    const conflictKey = e.target.dataset.conflict;
                    this.conflictManager.showConflictResolutionModal(conflictKey);
                }

                // ===== APPLY SUGGESTION =====
                if (e.target.classList.contains('apply-suggestion-btn')) {
                    const suggestionId = e.target.dataset.suggestion;
                    this.assignmentManager.applySuggestion(suggestionId);
                }
            });
        }

        setupEventListeners() {
            const { elements } = this.uiManager;
            
            elements.prevWeekBtn?.addEventListener('click', () => this.changeWeek(-7));
            elements.nextWeekBtn?.addEventListener('click', () => this.changeWeek(7));
            elements.todayBtn?.addEventListener('click', () => this.changeWeek(0));
            
            elements.themeToggle?.addEventListener('click', () => this.themeManager.toggle());
            
            elements.manageBtn?.addEventListener('click', () => {
                if (!this.state.buildMode) {
                    this.uiManager.showBuildModeModal();
                } else {
                    this.uiManager.showManageModal();
                }
            });
            
            elements.randomGenerateBtn?.addEventListener('click', () => {
                if (this.state.buildMode) {
                    this.generateSmartAssignmentsForWeek();
                }
            });
            
            elements.copyPrevWeekBtn?.addEventListener('click', () => {
                if (this.state.buildMode) {
                    this.copyPreviousWeek();
                }
            });
            
            elements.skillsMatrixBtn?.addEventListener('click', () => {
                if (this.state.buildMode) {
                    this.uiManager.showSkillsMatrixModal();
                }
            });
            
            elements.exitBuildBtn?.addEventListener('click', () => {
                this.uiManager.showConfirmModal({
                    title: 'Exit Build Mode',
                    message: 'Exit build mode and return to view-only? You will need to re-enter the password to make changes again.',
                    onConfirm: () => {
                        this.state.buildMode = false;
                        this.debouncedSave();
                        this.uiManager.updateModeDisplay();
                        this.uiManager.render();
                        NotificationManager.show('Exited build mode', 'info');
                    }
                });
            });
            
            elements.leaveRosterBtn?.addEventListener('click', () => {
                this.uiManager.showLeaveRosterModal();
            });
            
            elements.viewToggle?.addEventListener('click', (e) => {
                const view = e.target.closest('.toggle-btn')?.dataset.view;
                if (view && view !== this.state.currentView) {
                    this.state.currentView = view;
                    this.uiManager.render();
                    NotificationManager.show(`Switched to ${view === 'full' ? 'full roster' : 'personal'} view`, 'info');
                }
            });
            
            elements.userSelect?.addEventListener('change', (e) => {
                this.state.selectedUserId = e.target.value;
                if (this.state.currentView === 'personal') {
                    this.uiManager.render();
                }
            });

            document.getElementById('help-btn')?.addEventListener('click', () => {
                document.getElementById('help-modal')?.classList.remove('hidden');
            });
            
            document.querySelectorAll('.close-help').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('help-modal')?.classList.add('hidden');
                });
            });

            document.querySelector('.error-dismiss')?.addEventListener('click', () => {
                document.getElementById('error-display')?.classList.add('hidden');
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                    if (modals.length > 0) {
                        modals.forEach(modal => modal.remove());
                        return;
                    }
                    
                    if ((e.ctrlKey || e.metaKey) && this.state.buildMode) {
                        e.preventDefault();
                        this.uiManager.quickExitBuildMode();
                        return;
                    }
                }
                
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key) {
                        case 'ArrowLeft':
                            e.preventDefault();
                            this.changeWeek(-7);
                            break;
                            
                        case 'ArrowRight':
                            e.preventDefault();
                            this.changeWeek(7);
                            break;
                            
                        case 'Home':
                            e.preventDefault();
                            this.changeWeek(0);
                            break;
                            
                        case 'b':
                        case 'B':
                            e.preventDefault();
                            if (this.state.buildMode) {
                                this.uiManager.showBuildModeModal();
                            } else {
                                this.uiManager.showBuildModeModal();
                            }
                            break;
                            
                        case 'r':
                        case 'R':
                            if (this.state.buildMode) {
                                e.preventDefault();
                                this.generateSmartAssignmentsForWeek();
                            }
                            break;
                            
                        case 'c':
                        case 'C':
                            e.preventDefault();
                            if (this.conflictManager) {
                                this.conflictManager.toggleConflictMode();
                            }
                            break;
                            
                        case 'm':
                        case 'M':
                            e.preventDefault();
                            if (this.state.buildMode) {
                                this.uiManager.showManageModal();
                            } else {
                                this.uiManager.showBuildModeModal();
                            }
                            break;
                            
                        case 's':
                        case 'S':
                            if (this.state.buildMode) {
                                e.preventDefault();
                                this.uiManager.showSkillsMatrixModal();
                            }
                            break;
                            
                        case 'l':
                        case 'L':
                            e.preventDefault();
                            this.uiManager.showLeaveRosterModal();
                            break;
                    }
                }
                
                switch(e.key) {
                    case 'F1':
                        e.preventDefault();
                        document.getElementById('help-modal')?.classList.remove('hidden');
                        break;
                        
                    case 'F2':
                        if (this.state.buildMode) {
                            e.preventDefault();
                            this.generateSmartAssignmentsForWeek();
                        }
                        break;
                }
            });
        }
        
        changeWeek(days) {
            if (days === 0) {
                this.state.currentDate = new Date();
            } else {
                this.state.currentDate.setDate(this.state.currentDate.getDate() + days);
            }
            
            this.debouncedConflictCheck();
            this.debouncedWorkloadAnalysis();
            this.uiManager.render();
        }

        toggleCategoryCollapse(category) {
            if (this.state.collapsedSections.has(category)) {
                this.state.collapsedSections.delete(category);
            } else {
                this.state.collapsedSections.add(category);
            }
            
            this.debouncedSave();
            this.uiManager.render();
            
            // Fixed: Removed undefined staffIds reference
            NotificationManager.show(`Toggled category: ${category}`, 'info');
        }

        removeStaffFromPhoneShift(date, shift, staffId) {
            if (!this.state.buildMode) return;
            
            const isoDate = DateUtils.toISODate(date);
            const phoneData = this.state.phoneRoster[isoDate];
            
            if (phoneData && phoneData[shift]) {
                phoneData[shift] = phoneData[shift].filter(id => id !== staffId);
                this.debouncedSave();
                this.uiManager.render();
                
                const staff = this.getStaffById(staffId);
                NotificationManager.show(`Removed ${staff?.name} from ${shift} phone shift`, 'success');
            }
        }

        updateLeaveRoster(leaveData) {
            this.state.leaveRoster = { ...this.state.leaveRoster, ...leaveData };
            this.state.lastLeaveUpdate = new Date().toISOString();
            
            this.assignmentGenerator.updateLeaveRoster(this.state.leaveRoster);
            this.debouncedSave();
            
            NotificationManager.show('Leave roster updated', 'success');
            
            if (this.conflictManager) {
                this.conflictManager.checkAndDisplayConflicts();
            }
        }

        getTaskAssignment(taskId, date) {
            return this.assignmentGenerator.getTaskAssignment(taskId, date);
        }

        getTriageAssignment(headerId, date) {
            return this.assignmentGenerator.getTriageAssignment(headerId, date);
        }

        getPhoneAssignment(date) {
            const isoDate = DateUtils.toISODate(date);
            return this.state.phoneRoster[isoDate] || { early: [], late: [] };
        }

        getStaffLeave(staffId, date) {
            return this.assignmentGenerator.getStaffLeave(staffId, date);
        }

        exportData() {
            try {
                this.dataManager.export();
                NotificationManager.show('Data exported successfully', 'success');
            } catch (error) {
                this.errorHandler.logError(error, 'Export Data');
                NotificationManager.show('Failed to export data', 'error');
            }
        }

        saveData() {
            if (!this.state.initialized) return;
            
            try {
                const appData = { 
                    staff: this.state.staff, 
                    tasks: this.state.tasks,
                    allocations: this.state.allocations, 
                    leaveRoster: this.state.leaveRoster,
                    phoneRoster: this.state.phoneRoster, 
                    triageAssignments: this.state.triageAssignments,
                    lockedMonths: Array.from(this.state.lockedMonths || []),
                    collapsedSections: Array.from(this.state.collapsedSections || []),
                    skillsMatrix: this.state.skillsMatrix,
                    priorityTasks: this.state.priorityTasks,
                    shiftRotations: this.rotationManager.getRotations(),
                    shiftSwaps: this.state.shiftSwaps,
                    assignmentSuggestions: this.state.assignmentSuggestions,
                    lastLeaveUpdate: this.state.lastLeaveUpdate,
                    version: '3.2.0',
                    lastModified: new Date().toISOString()
                };
                
                this.dataManager.save(appData);
                this.state.lastSaved = new Date();
            } catch (error) {
                this.errorHandler.logError(error, 'Save Data');
                NotificationManager.show('Failed to save data', 'error');
            }
        }
        
        getStaffById(staffId) {
            return this.state.staff.find(s => s.id === staffId);
        }

        getTaskById(taskId) {
            return this.state.tasks.find(t => t.id === taskId);
        }

        isWeekLocked(date) {
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return this.state.lockedMonths.includes(monthStr);
        }

        canEditAssignments() {
            return this.state.buildMode && !this.isWeekLocked(this.state.currentDate);
        }

        getWorkloadReport(week) {
            if (!this.assignmentGenerator) return {};
            return this.assignmentGenerator.getWorkloadBalanceReport(week);
        }

        hasConflicts() {
            if (!this.assignmentGenerator) return false;
            return this.assignmentGenerator.getConflicts().size > 0;
        }

        getConflicts() {
            if (!this.assignmentGenerator) return new Map();
            return this.assignmentGenerator.getConflicts();
        }

        getSystemStats() {
            return {
                staffCount: this.state.staff.length,
                taskCount: this.state.tasks.filter(t => t.type === 'task').length,
                headerCount: this.state.tasks.filter(t => t.type === 'header').length,
                lockedMonths: this.state.lockedMonths.length,
                lastSaved: this.state.lastSaved,
                buildMode: this.state.buildMode,
                currentView: this.state.currentView,
                version: '3.2.0'
            };
        }

        resetToDefaults() {
            this.uiManager.showConfirmModal({
                title: 'Reset to Defaults',
                message: 'This will reset all staff, tasks, and skills to default values. Assignment data will be preserved. Continue?',
                onConfirm: () => {
                    // Try to get defaults from ConfigManager (template), otherwise use hardcoded defaults
                    let defaultStaff = DEFAULT_STAFF;
                    let defaultTasks = DEFAULT_TASKS;
                    
                    if (this.configManager) {
                        const configStaff = this.configManager.get('organization.staff');
                        const configTasks = this.configManager.get('organization.tasks');
                        
                        if (configStaff && Array.isArray(configStaff)) defaultStaff = configStaff;
                        if (configTasks && Array.isArray(configTasks)) defaultTasks = configTasks;
                    }
                    
                    this.state.staff = JSON.parse(JSON.stringify(defaultStaff));
                    this.state.tasks = JSON.parse(JSON.stringify(defaultTasks));
                    this.state.skillsMatrix = JSON.parse(JSON.stringify(DEFAULT_SKILLS_MATRIX));
                    
                    this.reinitializeManagers();
                    this.debouncedSave();
                    this.uiManager.render();
                    
                    NotificationManager.show('System reset to defaults', 'success');
                }
            });
        }

        getApplicationInfo() {
            return {
                name: 'Work Allocation Roster',
                version: '3.2.0',
                buildDate: new Date().toISOString(),
                features: [
                    'Coverage-Priority Assignment Algorithm',
                    'Emergency Coverage Protocols',
                    'Jenny\'s Wednesday Special Handling',
                    'Conflict Detection and Resolution',
                    'Workload Balance Analysis',
                    'Month Locking System',
                    'Skills Matrix Management',
                    'Leave Roster Integration',
                    'Data Import/Export',
                    'Theme Support',
                    'Work on Hand (WOH) Tracking',
                    '14-Day SLA Compliance Monitoring',
                    'Real-time SLA Status Updates',
                    'Comprehensive Reporting System'
                ],
                stats: this.getSystemStats()
            };
        }

        getWOHData(taskId) {
            const data = this.state.priorityTasks[taskId];
            if (!data || !data.oldestDate) {
                return { count: 0, oldestAge: 0, oldestDate: null };
            }
            
            const oldestDate = new Date(data.oldestDate);
            const today = new Date();
            const ageInDays = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
            
            return {
                count: parseInt(data.count) || 0,
                oldestAge: ageInDays,
                oldestDate: data.oldestDate
            };
        }

        updateTaskWOH(taskId, count, oldestDate) {
            if (!this.state.priorityTasks) {
                this.state.priorityTasks = {};
            }
            
            if (count > 0 || oldestDate) {
                this.state.priorityTasks[taskId] = {
                    count: count.toString(),
                    oldestDate: oldestDate
                };
            } else {
                delete this.state.priorityTasks[taskId];
            }
            
            this.debouncedSave();
            this.uiManager.render();
        }

        getWOHSummaryData() {
            const summary = {
                totalItems: 0,
                criticalTasks: 0,
                highPriorityTasks: 0,
                slaWarningTasks: 0,
                slaMonitoringTasks: 0,
                slaCompliantTasks: 0,
                slaBreachItems: 0,
                avgAge: 0,
                oldestItem: null,
                taskBreakdown: []
            };

            let totalAge = 0;
            let itemCount = 0;

            Object.entries(this.state.priorityTasks || {}).forEach(([taskId, data]) => {
                if (!data.count || parseInt(data.count) === 0) return;

                const wohData = this.getWOHData(taskId);
                const task = this.getTaskById(taskId);
                
                if (!task) return;

                const count = parseInt(wohData.count) || 0;
                summary.totalItems += count;
                totalAge += wohData.oldestAge * count;
                itemCount += count;

                let slaStatus = 'COMPLIANT';
                if (wohData.oldestAge >= 14) {
                    slaStatus = 'BREACHED';
                    summary.criticalTasks++;
                    summary.slaBreachItems += count;
                } else if (wohData.oldestAge >= 11) {
                    slaStatus = 'CRITICAL';
                    summary.highPriorityTasks++;
                } else if (wohData.oldestAge >= 8) {
                    slaStatus = 'WARNING';
                    summary.slaWarningTasks++;
                } else if (wohData.oldestAge >= 5) {
                    slaStatus = 'MONITORING';
                    summary.slaMonitoringTasks++;
                } else {
                    summary.slaCompliantTasks++;
                }

                summary.taskBreakdown.push({
                    taskId: taskId,
                    taskName: task.name,
                    count: count,
                    oldestAge: wohData.oldestAge,
                    slaStatus: slaStatus,
                    daysToSLA: Math.max(0, 14 - wohData.oldestAge)
                });

                if (!summary.oldestItem || wohData.oldestAge > summary.oldestItem.age) {
                    summary.oldestItem = {
                        taskId: taskId,
                        taskName: task.name,
                        age: wohData.oldestAge,
                        slaStatus: slaStatus
                    };
                }
            });

            summary.avgAge = itemCount > 0 ? Math.round(totalAge / itemCount * 10) / 10 : 0;
            summary.taskBreakdown.sort((a, b) => {
                const priorityOrder = { 'BREACHED': 0, 'CRITICAL': 1, 'WARNING': 2, 'MONITORING': 3, 'COMPLIANT': 4 };
                const aPriority = priorityOrder[a.slaStatus];
                const bPriority = priorityOrder[b.slaStatus];
                if (aPriority !== bPriority) return aPriority - bPriority;
                return b.oldestAge - a.oldestAge;
            });

            return summary;
        }

        // Additional utility methods for enhanced functionality
        
        getSLAStatusForTask(taskId) {
            const wohData = this.getWOHData(taskId);
            if (wohData.oldestAge === 0) return { status: 'none', class: 'sla-none', text: 'No data' };
            
            if (wohData.oldestAge >= 14) {
                return { 
                    status: 'breached', 
                    class: 'sla-breached', 
                    text: `🚨 BREACHED (${wohData.oldestAge - 14} days over)` 
                };
            }
            if (wohData.oldestAge >= 11) {
                return { 
                    status: 'critical', 
                    class: 'sla-critical', 
                    text: `⚠️ CRITICAL (${14 - wohData.oldestAge} days to breach)` 
                };
            }
            if (wohData.oldestAge >= 8) {
                return { 
                    status: 'warning', 
                    class: 'sla-warning', 
                    text: `📋 WARNING (${14 - wohData.oldestAge} days to breach)` 
                };
            }
            if (wohData.oldestAge >= 5) {
                return { 
                    status: 'monitoring', 
                    class: 'sla-monitoring', 
                    text: `📝 MONITORING (${14 - wohData.oldestAge} days to breach)` 
                };
            }
            return { 
                status: 'compliant', 
                class: 'sla-compliant', 
                text: `✅ COMPLIANT (${14 - wohData.oldestAge} days to breach)` 
            };
        }

        getAllSLABreachedTasks() {
            return Object.entries(this.state.priorityTasks || {})
                .filter(([taskId, data]) => {
                    const wohData = this.getWOHData(taskId);
                    return wohData.oldestAge >= 14;
                })
                .map(([taskId, data]) => ({
                    taskId,
                    task: this.getTaskById(taskId),
                    wohData: this.getWOHData(taskId)
                }))
                .sort((a, b) => b.wohData.oldestAge - a.wohData.oldestAge);
        }

        getAllSLACriticalTasks() {
            return Object.entries(this.state.priorityTasks || {})
                .filter(([taskId, data]) => {
                    const wohData = this.getWOHData(taskId);
                    return wohData.oldestAge >= 11 && wohData.oldestAge < 14;
                })
                .map(([taskId, data]) => ({
                    taskId,
                    task: this.getTaskById(taskId),
                    wohData: this.getWOHData(taskId)
                }))
                .sort((a, b) => b.wohData.oldestAge - a.wohData.oldestAge);
        }

        getTasksByPriority() {
            const allTasks = Object.entries(this.state.priorityTasks || {})
                .filter(([taskId, data]) => parseInt(data.count) > 0)
                .map(([taskId, data]) => ({
                    taskId,
                    task: this.getTaskById(taskId),
                    wohData: this.getWOHData(taskId),
                    slaInfo: this.getSLAStatusForTask(taskId)
                }));

            return {
                breached: allTasks.filter(t => t.wohData.oldestAge >= 14),
                critical: allTasks.filter(t => t.wohData.oldestAge >= 11 && t.wohData.oldestAge < 14),
                warning: allTasks.filter(t => t.wohData.oldestAge >= 8 && t.wohData.oldestAge < 11),
                monitoring: allTasks.filter(t => t.wohData.oldestAge >= 5 && t.wohData.oldestAge < 8),
                compliant: allTasks.filter(t => t.wohData.oldestAge < 5)
            };
        }

        bulkUpdateWOH(updates) {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required for bulk WOH updates');
                return;
            }

            try {
                let updatedCount = 0;
                updates.forEach(({ taskId, count, oldestDate }) => {
                    this.updateTaskWOH(taskId, count, oldestDate);
                    updatedCount++;
                });

                NotificationManager.show(`Bulk updated ${updatedCount} WOH entries`, 'success');
                return true;
            } catch (error) {
                this.errorHandler.logError(error, 'Bulk Update WOH');
                this.uiManager.showErrorMessage('Failed to perform bulk WOH update');
                return false;
            }
        }

        exportWOHData() {
            try {
                const wohData = Object.entries(this.state.priorityTasks || {}).map(([taskId, data]) => {
                    const task = this.getTaskById(taskId);
                    const wohInfo = this.getWOHData(taskId);
                    const slaInfo = this.getSLAStatusForTask(taskId);
                    
                    return {
                        taskId,
                        taskName: task?.name || 'Unknown',
                        category: task?.category || 'Unknown',
                        count: wohInfo.count,
                        oldestDate: wohInfo.oldestDate,
                        ageInDays: wohInfo.oldestAge,
                        slaStatus: slaInfo.status,
                        slaText: slaInfo.text,
                        daysToSLA: Math.max(0, 14 - wohInfo.oldestAge),
                        daysOverSLA: Math.max(0, wohInfo.oldestAge - 14)
                    };
                }).filter(item => item.count > 0);

                const csvContent = [
                    'Task ID,Task Name,Category,Count,Oldest Date,Age (Days),SLA Status,Days to SLA,Days Over SLA',
                    ...wohData.map(item => 
                        `"${item.taskId}","${item.taskName}","${item.category}",${item.count},"${item.oldestDate}",${item.ageInDays},"${item.slaStatus}",${item.daysToSLA},${item.daysOverSLA}`
                    )
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `woh-data-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                NotificationManager.show('WOH data exported successfully', 'success');
            } catch (error) {
                this.errorHandler.logError(error, 'Export WOH Data');
                this.uiManager.showErrorMessage('Failed to export WOH data');
            }
        }

        generateDailySLAReport(date) {
            try {
                const isoDate = DateUtils.toISODate(date);
                const allocations = this.state.allocations[isoDate] || {};
                
                let report = `Daily SLA Report - ${DateUtils.formatDate(date)}\n`;
                report += `Generated: ${new Date().toLocaleDateString('en-AU')}\n\n`;
                
                const slaTasksToday = Object.entries(allocations).filter(([taskId, allocation]) => {
                    const wohData = this.getWOHData(taskId);
                    return wohData.oldestAge >= 8; // SLA warning and above
                });
                
                if (slaTasksToday.length === 0) {
                    report += `✅ No SLA-critical tasks assigned for this date.\n`;
                } else {
                    report += `🚨 SLA-Critical Tasks Assigned Today:\n\n`;
                    
                    slaTasksToday.forEach(([taskId, allocation]) => {
                        const task = this.getTaskById(taskId);
                        const wohData = this.getWOHData(taskId);
                        const slaInfo = this.getSLAStatusForTask(taskId);
                        const staffNames = allocation.assignments
                            .map(id => this.getStaffById(id)?.name)
                            .filter(Boolean);
                        
                        report += `• ${task?.name}\n`;
                        report += `  Status: ${slaInfo.text}\n`;
                        report += `  Items: ${wohData.count}\n`;
                        report += `  Age: ${wohData.oldestAge} days\n`;
                        report += `  Assigned to: ${staffNames.join(', ')}\n`;
                        
                        if (wohData.oldestAge >= 14) {
                            report += `  ⚠️ URGENT: ${wohData.oldestAge - 14} days over SLA!\n`;
                        } else {
                            report += `  ⏰ ${14 - wohData.oldestAge} days until SLA breach\n`;
                        }
                        report += `\n`;
                    });
                }
                
                return report;
            } catch (error) {
                this.errorHandler.logError(error, 'Generate Daily SLA Report');
                return 'Error generating daily SLA report';
            }
        }

        isCategoryCollapsed(category) {
            return this.state.collapsedSections.has(category);
        }

        validateAndMigrateStaff(staff) {
            return staff.map(s => ({
                id: s.id || StringUtils.generateId('staff_'),
                name: s.name || 'Unknown Staff',
                workDays: s.workDays || CONFIG.WORK_DAYS
            })).filter(s => ValidationUtils.validateStaffMember(s));
        }

        validateAndMigrateTasks(tasks) {
            return tasks.filter(task => ValidationUtils.validateTask(task));
        }

        migrateSkillsMatrix(skillsMatrix) {
            const newMatrix = {};
            this.state.staff.forEach(staff => {
                const taskSkills = {};
                this.state.tasks.forEach(task => {
                    if (task.type === 'task') {
                        taskSkills[task.id] = skillsMatrix?.[staff.id]?.taskSkills?.[task.id] || 1;
                    }
                });
                newMatrix[staff.id] = { taskSkills };
            });
            return newMatrix;
        }

        initializeDefaults() {
            // Try to get defaults from ConfigManager (template), otherwise use hardcoded defaults
            let defaultStaff = DEFAULT_STAFF;
            let defaultTasks = DEFAULT_TASKS;
            
            if (this.configManager) {
                const configStaff = this.configManager.get('organization.staff');
                const configTasks = this.configManager.get('organization.tasks');
                
                if (configStaff && Array.isArray(configStaff) && configStaff.length > 0) {
                    defaultStaff = configStaff;
                }
                if (configTasks && Array.isArray(configTasks) && configTasks.length > 0) {
                    defaultTasks = configTasks;
                }
            }
            
            this.state.staff = JSON.parse(JSON.stringify(defaultStaff));
            this.state.tasks = JSON.parse(JSON.stringify(defaultTasks));
            this.state.skillsMatrix = JSON.parse(JSON.stringify(DEFAULT_SKILLS_MATRIX));
        }

        reinitializeManagers() {
            this.skillsManager = new SkillsManager(this.state.skillsMatrix, this.state.staff, this.state.tasks);
            this.rotationManager = new RotationManager(this.state.staff);
            if (this.state.shiftRotations && Object.keys(this.state.shiftRotations).length > 0) {
                this.rotationManager.setRotations(this.state.shiftRotations);
            }
            this.assignmentGenerator = new AssignmentGenerator(
                this.state.staff, this.state.tasks, this.skillsManager, 
                this.state.allocations, this.state.triageAssignments, 
                this.state.phoneRoster, this.state.leaveRoster
            );
        }

        addStaff(name) {
            const newStaff = { id: StringUtils.slugify(name), name, workDays: CONFIG.WORK_DAYS };
            if (!ValidationUtils.validateStaffMember(newStaff)) return;
            this.state.staff.push(newStaff);
            
            const taskSkills = {};
            this.state.tasks.forEach(task => {
                if (task.type === 'task') {
                    taskSkills[task.id] = 1;
                }
            });
            this.state.skillsMatrix[newStaff.id] = { taskSkills };
            
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Added staff member: ${name}`, 'success');
        }

        removeStaff(staffId) {
            const staff = this.getStaffById(staffId);
            if (!staff) return;
            
            this.state.staff = this.state.staff.filter(s => s.id !== staffId);
            delete this.state.skillsMatrix[staffId];
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Removed staff member: ${staff.name}`, 'success');
        }
        
        addTask(name) {
            const newTask = { 
                id: StringUtils.slugify(name), 
                name, 
                type: 'task', 
                category: 'general', 
                skillLevel: 1 
            };
            if (!ValidationUtils.validateTask(newTask)) return;
            this.state.tasks.push(newTask);
            
            Object.values(this.state.skillsMatrix).forEach(staffSkills => {
                if (staffSkills.taskSkills) {
                    staffSkills.taskSkills[newTask.id] = 1;
                }
            });
            
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Added task: ${name}`, 'success');
        }

        removeTask(taskId) {
            const task = this.state.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
            
            Object.values(this.state.skillsMatrix).forEach(staffSkills => {
                if (staffSkills.taskSkills) {
                    delete staffSkills.taskSkills[taskId];
                }
            });
            
            Object.values(this.state.allocations).forEach(dayAllocations => {
                delete dayAllocations[taskId];
            });
            
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Removed task: ${task.name}`, 'success');
        }

        addMonthLock(monthStr) {
            if (!this.state.lockedMonths.includes(monthStr)) {
                this.state.lockedMonths.push(monthStr);
                this.debouncedSave();
                NotificationManager.show(`Locked month: ${monthStr}`, 'success');
            }
        }

        removeMonthLock(monthStr) {
            this.state.lockedMonths = this.state.lockedMonths.filter(m => m !== monthStr);
            this.debouncedSave();
            NotificationManager.show(`Unlocked month: ${monthStr}`, 'success');
        }

        saveSkillsMatrix(modal) {
            const selects = modal.querySelectorAll('.skill-select');
            selects.forEach(select => {
                const staffId = select.dataset.staff;
                const taskId = select.dataset.task;
                const skillLevel = parseInt(select.value, 10);
                this.skillsManager.setStaffTaskSkill(staffId, taskId, skillLevel);
            });
            this.state.skillsMatrix = this.skillsManager.skillsMatrix;
            this.debouncedSave();
            NotificationManager.show('Skills matrix updated', 'success');
        }

        async importData(file) {
            if (!file) return;
            try {
                const success = await this.dataManager.import(file);
                if (success) {
                    NotificationManager.show('Data imported successfully. Reloading...', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    NotificationManager.show('Failed to import data - invalid format', 'error');
                }
            } catch (error) {
                this.errorHandler.logError(error, 'Import Data');
                NotificationManager.show('Failed to import data', 'error');
            }
        }

        confirmClearData() {
            this.uiManager.showConfirmModal({
                title: 'Confirm Clear Data',
                message: 'Are you sure you want to delete all application data? This action cannot be undone.',
                onConfirm: () => {
                    this.dataManager.clear().then(() => {
                        NotificationManager.show('All data cleared. Reloading...', 'success');
                        setTimeout(() => window.location.reload(), 1000);
                    });
                }
            });
        }

        copyPreviousWeek() {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required to copy assignments');
                return;
            }

            try {
                const currentWeek = DateUtils.getWeek(this.state.currentDate);
                this.assignmentGenerator.copyPreviousWeekAssignments(currentWeek);
                
                this.debouncedSave();
                this.uiManager.render();
                
                NotificationManager.show('Previous week assignments copied successfully', 'success');
                
                if (this.conflictManager) {
                    this.conflictManager.checkAndDisplayConflicts();
                }
                
            } catch (error) {
                this.errorHandler.logError(error, 'Copy Previous Week');
                this.uiManager.showErrorMessage('Failed to copy previous week assignments');
            }
        }

        generateMonthlyPhoneRoster() {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required for roster generation');
                return;
            }

            this.uiManager.showConfirmModal({
                title: 'Generate Monthly Phone Roster',
                message: 'This will regenerate phone assignments for the current month with coverage priority. Existing phone assignments will be overwritten. Continue?',
                onConfirm: () => {
                    try {
                        const currentDate = new Date(this.state.currentDate);
                        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                        
                        console.log(`🔄 Generating monthly phone roster for ${startOfMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}...`);
                        
                        let totalWeeks = 0;
                        let successfulWeeks = 0;
                        let weekWithIssues = 0;
                        
                        let weekStart = new Date(startOfMonth);
                        while (weekStart <= endOfMonth) {
                            const week = DateUtils.getWeek(weekStart);
                            
                            const weekInMonth = week.some(date => 
                                date.getMonth() === currentDate.getMonth() && 
                                date.getFullYear() === currentDate.getFullYear()
                            );
                            
                            if (weekInMonth) {
                                totalWeeks++;
                                console.log(`📅 Processing week starting ${DateUtils.formatDate(week[0])}...`);
                                
                                try {
                                    this.assignmentGenerator.generateWeeklyPhoneRosterWithEmergencyBackup(
                                        week, 
                                        this.rotationManager
                                    );
                                    
                                    const conflicts = this.assignmentGenerator.getConflicts();
                                    if (conflicts.size === 0) {
                                        successfulWeeks++;
                                        console.log(`✅ Week processed successfully`);
                                    } else {
                                        weekWithIssues++;
                                        console.log(`⚠️ Week processed with ${conflicts.size} issues`);
                                    }
                                    
                                } catch (weekError) {
                                    weekWithIssues++;
                                    console.error(`❌ Error processing week:`, weekError);
                                }
                            }
                            
                            weekStart.setDate(weekStart.getDate() + 7);
                        }
                        
                        this.debouncedSave();
                        this.uiManager.render();
                        
                        const monthName = currentDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
                        let message = `Monthly phone roster generated for ${monthName}!\n\n`;
                        message += `📊 Summary:\n`;
                        message += `• Total weeks processed: ${totalWeeks}\n`;
                        message += `• Successfully assigned: ${successfulWeeks}\n`;
                        message += `• Weeks with issues: ${weekWithIssues}\n`;
                        
                        if (weekWithIssues === 0) {
                            message += `\n🎉 All weeks assigned successfully with full coverage!`;
                            NotificationManager.show(`Monthly roster generated successfully`, 'success');
                        } else {
                            message += `\n⚠️ Some weeks may require manual adjustment. Check the console for details.`;
                            NotificationManager.show(`Monthly roster generated with some issues`, 'warning');
                        }
                        
                        this.uiManager.showInfoModal('Generation Complete', message);
                        
                        if (this.conflictManager) {
                            this.conflictManager.checkAndDisplayConflicts();
                            this.conflictManager.analyzeWorkloadBalance();
                        }
                        
                    } catch (error) {
                        this.errorHandler.logError(error, 'Generate Monthly Phone Roster');
                        this.uiManager.showErrorMessage('Failed to generate monthly phone roster. Check console for details.');
                    }
                }
            });
        }

        generateSmartAssignmentsForWeek() {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required for assignment generation');
                return;
            }

            try {
                const week = DateUtils.getWeek(this.state.currentDate);
                
                console.log(`🔄 Generating smart assignments for week starting ${DateUtils.formatDate(week[0])}...`);
                
                this.assignmentGenerator.generateWeeklyPhoneRosterWithEmergencyBackup(
                    week, 
                    this.rotationManager
                );
                
                week.forEach(date => {
                    if (DateUtils.isWorkingDay(date)) {
                        this.assignmentGenerator.generateRandomTaskAssignments(date);
                    }
                });
                
                this.debouncedSave();
                this.uiManager.render();
                
                const conflicts = this.assignmentGenerator.getConflicts();
                if (conflicts.size === 0) {
                    NotificationManager.show('Week assignments generated successfully with full coverage!', 'success');
                } else {
                    NotificationManager.show(`Week assignments generated with ${conflicts.size} issues requiring attention`, 'warning');
                }
                
                if (this.conflictManager) {
                    this.conflictManager.checkAndDisplayConflicts();
                    this.conflictManager.analyzeWorkloadBalance();
                }
                
            } catch (error) {
                this.errorHandler.logError(error, 'Generate Smart Assignments');
                this.uiManager.showErrorMessage('Failed to generate assignments. Check console for details.');
            }
        }

        showWOHSummary() {
            try {
                const wohSummary = this.assignmentGenerator.getWOHSummary();
                
                let message = `Work on Hand Summary - 14 Day SLA\n\n`;
                message += `📊 SLA Compliance Overview:\n`;
                message += `• Total items pending: ${wohSummary.totalItems}\n`;
                message += `• SLA BREACHED (14+ days): ${wohSummary.criticalTasks} tasks (${wohSummary.slaBreachItems} items)\n`;
                message += `• SLA CRITICAL (11-13 days): ${wohSummary.highPriorityTasks} tasks\n`;
                message += `• SLA WARNING (8-10 days): ${wohSummary.slaWarningTasks} tasks\n`;
                message += `• SLA MONITORING (5-7 days): ${wohSummary.slaMonitoringTasks} tasks\n`;
                message += `• SLA COMPLIANT (<5 days): ${wohSummary.slaCompliantTasks} tasks\n`;
                message += `• Average age: ${wohSummary.avgAge} days\n`;
                
                if (wohSummary.oldestItem) {
                    message += `\n🔥 Oldest Item:\n`;
                    message += `• Task: ${wohSummary.oldestItem.taskName}\n`;
                    message += `• Age: ${wohSummary.oldestItem.age} days old\n`;
                    message += `• SLA Status: ${wohSummary.oldestItem.slaStatus}\n`;
                    if (wohSummary.oldestItem.age > 14) {
                        const daysOver = wohSummary.oldestItem.age - 14;
                        message += `• Days over SLA: ${daysOver}\n`;
                    } else {
                        const daysToSLA = 14 - wohSummary.oldestItem.age;
                        message += `• Days to SLA breach: ${daysToSLA}\n`;
                    }
                }
                
                const topTasks = wohSummary.taskBreakdown.slice(0, 10);
                if (topTasks.length > 0) {
                    message += `\n🚨 Priority Tasks (SLA Focus):\n`;
                    topTasks.forEach((task, index) => {
                        const statusIcon = {
                            'BREACHED': '🚨',
                            'CRITICAL': '⚠️', 
                            'WARNING': '📋',
                            'MONITORING': '📝',
                            'COMPLIANT': '✅'
                        }[task.slaStatus];
                        
                        message += `${index + 1}. ${statusIcon} ${task.taskName}\n`;
                        message += `   ${task.count} items, ${task.oldestAge} days old`;
                        
                        if (task.oldestAge > 14) {
                            message += ` (${task.oldestAge - 14} days OVER SLA)`;
                        } else if (task.oldestAge > 0) {
                            message += ` (${task.daysToSLA} days to SLA)`;
                        }
                        message += `\n`;
                    });
                }
                
                message += `\n💡 SLA Management Recommendations:\n`;
                if (wohSummary.criticalTasks > 0) {
                    message += `• URGENT: ${wohSummary.criticalTasks} tasks have breached 14-day SLA\n`;
                    message += `• Assign maximum staff to SLA-breached items immediately\n`;
                }
                if (wohSummary.highPriorityTasks > 0) {
                    message += `• ${wohSummary.highPriorityTasks} tasks approaching SLA breach (11-13 days)\n`;
                    message += `• Prioritize these items to prevent SLA violations\n`;
                }
                if (wohSummary.slaWarningTasks > 0) {
                    message += `• ${wohSummary.slaWarningTasks} tasks in SLA warning zone (8-10 days)\n`;
                    message += `• Monitor and plan assignment to prevent escalation\n`;
                }
                if (wohSummary.avgAge > 8) {
                    message += `• Average age (${wohSummary.avgAge} days) approaching SLA - review workflow\n`;
                }
                if (wohSummary.totalItems > 350) {
                    message += `• High total volume (${wohSummary.totalItems}) may impact SLA compliance\n`;
                }
                
                this.uiManager.showInfoModal('Work on Hand Summary - 14 Day SLA', message);
                
            } catch (error) {
                this.errorHandler.logError(error, 'Show WOH Summary');
                this.uiManager.showErrorMessage('Failed to generate WOH summary');
            }
        }

        generateWOHReport() {
            try {
                const wohSummary = this.assignmentGenerator.getWOHSummary();
                const currentWeek = DateUtils.getWeek(this.state.currentDate);
                
                let report = `Work on Hand Report - 14 Day SLA Compliance\n`;
                report += `Generated: ${new Date().toLocaleDateString('en-AU')}\n\n`;
                
                report += `📊 SLA Compliance Summary:\n`;
                report += `• Total pending items: ${wohSummary.totalItems}\n`;
                report += `• SLA BREACHED (14+ days): ${wohSummary.criticalTasks} tasks (${wohSummary.slaBreachItems} items)\n`;
                report += `• SLA CRITICAL (11-13 days): ${wohSummary.highPriorityTasks} tasks\n`;
                report += `• SLA WARNING (8-10 days): ${wohSummary.slaWarningTasks} tasks\n`;
                report += `• SLA MONITORING (5-7 days): ${wohSummary.slaMonitoringTasks} tasks\n`;
                report += `• SLA COMPLIANT (<5 days): ${wohSummary.slaCompliantTasks} tasks\n`;
                report += `• Average age: ${wohSummary.avgAge} days\n`;
                
                const slaComplianceRate = wohSummary.totalItems > 0 ? 
                    ((wohSummary.totalItems - wohSummary.slaBreachItems) / wohSummary.totalItems * 100).toFixed(1) : 100;
                report += `• SLA Compliance Rate: ${slaComplianceRate}%\n`;
                
                if (wohSummary.oldestItem) {
                    report += `\n🔥 Oldest Item Alert:\n`;
                    report += `• Task: ${wohSummary.oldestItem.taskName}\n`;
                    report += `• Age: ${wohSummary.oldestItem.age} days\n`;
                    report += `• SLA Status: ${wohSummary.oldestItem.slaStatus}\n`;
                    if (wohSummary.oldestItem.age > 14) {
                        report += `• Days over SLA: ${wohSummary.oldestItem.age - 14}\n`;
                    }
                }
                
                report += `\n🚨 SLA Priority Tasks (Top 20):\n`;
                wohSummary.taskBreakdown.slice(0, 20).forEach((task, index) => {
                    report += `${index + 1}. [${task.slaStatus}] ${task.taskName}\n`;
                    report += `   Items: ${task.count}, Age: ${task.oldestAge} days`;
                    
                    if (task.oldestAge > 14) {
                        report += ` (${task.oldestAge - 14} days OVER SLA)`;
                    } else if (task.oldestAge > 0) {
                        report += ` (${task.daysToSLA} days to SLA breach)`;
                    }
                    report += `\n`;
                });
                
                report += `\n📅 Current Week SLA-Critical Coverage:\n`;
                currentWeek.forEach(date => {
                    if (!DateUtils.isWorkingDay(date)) return;
                    
                    const isoDate = DateUtils.toISODate(date);
                    const allocations = this.state.allocations[isoDate] || {};
                    
                    report += `${DateUtils.formatDate(date)}:\n`;
                    
                    const slaTasksToday = Object.entries(allocations).filter(([taskId, allocation]) => {
                        const wohData = this.getWOHData(taskId);
                        return wohData.oldestAge >= 8; // SLA warning and above
                    });
                    
                    if (slaTasksToday.length > 0) {
                        slaTasksToday.forEach(([taskId, allocation]) => {
                            const task = this.getTaskById(taskId);
                            const wohData = this.getWOHData(taskId);
                            const staffNames = allocation.assignments
                                .map(id => this.getStaffById(id)?.name)
                                .filter(Boolean);
                            
                            const slaStatus = wohData.oldestAge > 14 ? 'BREACHED' :
                                            wohData.oldestAge >= 11 ? 'CRITICAL' : 'WARNING';
                            
                            report += `  [${slaStatus}] ${task?.name}: ${wohData.count} items (${wohData.oldestAge}d)`;
                            
                            if (wohData.oldestAge > 14) {
                                report += ` - ${wohData.oldestAge - 14} days OVER SLA`;
                            } else {
                                report += ` - ${14 - wohData.oldestAge} days to SLA`;
                            }
                            
                            report += ` → ${staffNames.join(', ')}\n`;
                        });
                    } else {
                        report += `  No SLA-critical assignments\n`;
                    }
                });
                
                report += `\n💡 SLA Management Recommendations:\n`;
                if (wohSummary.criticalTasks > 0) {
                    report += `• IMMEDIATE ACTION: ${wohSummary.criticalTasks} tasks have breached 14-day SLA\n`;
                    report += `• Assign maximum available staff to breached items\n`;
                    report += `• Consider escalation procedures for items >28 days\n`;
                }
                if (wohSummary.highPriorityTasks > 0) {
                    report += `• URGENT: ${wohSummary.highPriorityTasks} tasks approaching SLA breach\n`;
                    report += `• Prioritize assignments to prevent SLA violations\n`;
                }
                if (slaComplianceRate < 92) {
                    report += `• SLA compliance rate (${slaComplianceRate}%) below target\n`;
                    report += `• Review resource allocation and workflow processes\n`;
                }
                if (wohSummary.avgAge > 7) {
                    report += `• Average age (${wohSummary.avgAge} days) indicates potential bottlenecks\n`;
                    report += `• Consider process improvements or additional resources\n`;
                }
                
                report += `\n📊 SLA Performance Metrics:\n`;
                report += `• Items within SLA: ${wohSummary.totalItems - wohSummary.slaBreachItems}\n`;
                report += `• Items breaching SLA: ${wohSummary.slaBreachItems}\n`;
                report += `• SLA compliance rate: ${slaComplianceRate}%\n`;
                report += `• Average processing time: ${wohSummary.avgAge} days\n`;
                
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `sla-woh-report-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                NotificationManager.show('SLA WOH report generated and downloaded', 'success');
                
            } catch (error) {
                this.errorHandler.logError(error, 'Generate WOH Report');
                this.uiManager.showErrorMessage('Failed to generate WOH report');
            }
        }

        generateSmartAssignmentsWithWOH() {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required for assignment generation');
                return;
            }

            try {
                const week = DateUtils.getWeek(this.state.currentDate);
                
                console.log(`🔄 Generating smart assignments with 14-day SLA priority for week starting ${DateUtils.formatDate(week[0])}...`);
                
                this.assignmentGenerator.generateCompleteWeeklyAssignmentsWithWOH(
                    week, 
                    this.rotationManager
                );
                
                this.debouncedSave();
                this.uiManager.render();
                
                const wohSummary = this.assignmentGenerator.getWOHSummary();
                const conflicts = this.assignmentGenerator.getConflicts();
                
                let message = 'Week assignments generated with 14-day SLA priority!\n\n';
                message += `📊 SLA Status:\n`;
                message += `• Total items: ${wohSummary.totalItems}\n`;
                message += `• SLA BREACHED: ${wohSummary.criticalTasks} tasks\n`;
                message += `• SLA CRITICAL: ${wohSummary.highPriorityTasks} tasks\n`;
                message += `• SLA WARNING: ${wohSummary.slaWarningTasks} tasks\n`;
                
                if (wohSummary.oldestItem) {
                    message += `• Oldest item: ${wohSummary.oldestItem.age} days`;
                    if (wohSummary.oldestItem.age > 14) {
                        message += ` (${wohSummary.oldestItem.age - 14} days OVER SLA)`;
                    }
                    message += `\n`;
                }
                
                const slaComplianceRate = wohSummary.totalItems > 0 ? 
                    ((wohSummary.totalItems - wohSummary.slaBreachItems) / wohSummary.totalItems * 100).toFixed(1) : 100;
                message += `• SLA Compliance: ${slaComplianceRate}%\n`;
                
                if (conflicts.size === 0) {
                    NotificationManager.show('Week assignments generated with SLA priority and full coverage!', 'success');
                } else {
                    message += `\n⚠️ ${conflicts.size} issues require attention`;
                    NotificationManager.show(`Assignments generated with SLA priority - ${conflicts.size} issues need review`, 'warning');
                }
                
                // Show detailed summary for SLA-critical situations
                if (wohSummary.criticalTasks > 0 || wohSummary.highPriorityTasks > 3 || slaComplianceRate < 88) {
                    this.uiManager.showInfoModal('SLA Assignment Summary', message);
                }
                
                if (this.conflictManager) {
                    this.conflictManager.checkAndDisplayConflicts();
                    this.conflictManager.analyzeWorkloadBalance();
                }
                
            } catch (error) {
                this.errorHandler.logError(error, 'Generate Smart Assignments With SLA Priority');
                this.uiManager.showErrorMessage('Failed to generate assignments. Check console for details.');
            }
        }

        analyzeStaffWorkload() {
            try {
                const currentWeek = DateUtils.getWeek(this.state.currentDate);
                const workloadReport = this.getWorkloadReport(currentWeek);
                const wohSummary = this.getWOHSummaryData();
                
                let analysis = `Staff Workload Analysis - 14 Day SLA Focus\n`;
                analysis += `Week of ${DateUtils.formatDate(currentWeek[0])}\n\n`;
                
                analysis += `📊 SLA Impact Assessment:\n`;
                analysis += `• SLA breached tasks: ${wohSummary.criticalTasks}\n`;
                analysis += `• SLA critical tasks: ${wohSummary.highPriorityTasks}\n`;
                analysis += `• Items over SLA: ${wohSummary.slaBreachItems}\n`;
                
                const slaComplianceRate = wohSummary.totalItems > 0 ? 
                    ((wohSummary.totalItems - wohSummary.slaBreachItems) / wohSummary.totalItems * 100).toFixed(1) : 100;
                analysis += `• SLA compliance rate: ${slaComplianceRate}%\n`;
                
                analysis += `\n👥 Staff Workload Distribution:\n`;
                
                const staffWorkloads = Object.entries(workloadReport).map(([staffId, workload]) => {
                    const staff = this.getStaffById(staffId);
                    const totalLoad = workload.phone + workload.tasks;
                    
                    // Calculate SLA-critical workload
                    let slaWorkload = 0;
                    currentWeek.forEach(date => {
                        if (!DateUtils.isWorkingDay(date)) return;
                        const isoDate = DateUtils.toISODate(date);
                        const allocations = this.state.allocations[isoDate] || {};
                        
                        Object.entries(allocations).forEach(([taskId, allocation]) => {
                            if (allocation.assignments.includes(staffId)) {
                                const wohData = this.getWOHData(taskId);
                                if (wohData.oldestAge >= 8) { // SLA warning and above
                                    slaWorkload++;
                                }
                            }
                        });
                    });
                    
                    return {
                        name: staff?.name || 'Unknown',
                        phone: workload.phone,
                        tasks: workload.tasks,
                        total: totalLoad,
                        slaWorkload: slaWorkload
                    };
                }).sort((a, b) => b.total - a.total);
                
                staffWorkloads.forEach((staff, index) => {
                    analysis += `${index + 1}. ${staff.name}: ${staff.total} total (${staff.phone} phone, ${staff.tasks} tasks`;
                    if (staff.slaWorkload > 0) {
                        analysis += `, ${staff.slaWorkload} SLA-critical`;
                    }
                    analysis += `)\n`;
                });
                
                const avgWorkload = staffWorkloads.reduce((sum, staff) => sum + staff.total, 0) / staffWorkloads.length;
                const overworkedStaff = staffWorkloads.filter(staff => staff.total > avgWorkload * 1.5);
                const underutilizedStaff = staffWorkloads.filter(staff => staff.total < avgWorkload * 0.5);
                
                analysis += `\n📈 Workload Analysis:\n`;
                analysis += `• Average workload: ${avgWorkload.toFixed(1)} assignments per person\n`;
                analysis += `• Overworked staff (>150% avg): ${overworkedStaff.length}\n`;
                analysis += `• Underutilized staff (<50% avg): ${underutilizedStaff.length}\n`;
                
                // SLA-specific analysis
                const staffWithSLAWork = staffWorkloads.filter(staff => staff.slaWorkload > 0);
                analysis += `• Staff handling SLA-critical work: ${staffWithSLAWork.length}\n`;
                
                if (overworkedStaff.length > 0) {
                    analysis += `\n⚠️ Overworked Staff (SLA Risk):\n`;
                    overworkedStaff.forEach(staff => {
                        analysis += `  • ${staff.name}: ${staff.total} assignments (${((staff.total / avgWorkload) * 100).toFixed(0)}% of average)`;
                        if (staff.slaWorkload > 0) {
                            analysis += ` - ${staff.slaWorkload} SLA-critical items`;
                        }
                        analysis += `\n`;
                    });
                }
                
                if (underutilizedStaff.length > 0) {
                    analysis += `\n📝 Underutilized Staff (SLA Opportunity):\n`;
                    underutilizedStaff.forEach(staff => {
                        analysis += `  • ${staff.name}: ${staff.total} assignments (${((staff.total / avgWorkload) * 100).toFixed(0)}% of average)`;
                        analysis += ` - Could help with SLA-critical work\n`;
                    });
                }
                
                analysis += `\n🚨 SLA Recommendations:\n`;
                if (wohSummary.criticalTasks > 0) {
                    analysis += `• URGENT: ${wohSummary.criticalTasks} tasks have breached 14-day SLA\n`;
                    analysis += `• Redistribute SLA-breached work to available staff\n`;
                }
                if (slaComplianceRate < 88) {
                    analysis += `• SLA compliance (${slaComplianceRate}%) below 88% target\n`;
                    analysis += `• Consider reassigning staff from low-priority to SLA-critical work\n`;
                }
                if (staffWithSLAWork.length < staffWorkloads.length / 2) {
                    analysis += `• Only ${staffWithSLAWork.length} staff handling SLA-critical work\n`;
                    analysis += `• Consider training more staff for urgent task handling\n`;
                }
                if (underutilizedStaff.length > 0 && wohSummary.criticalTasks > 0) {
                    analysis += `• ${underutilizedStaff.length} underutilized staff could help with SLA breaches\n`;
                }
                
                this.uiManager.showInfoModal('Staff Workload Analysis - SLA Focus', analysis);
                
            } catch (error) {
                this.errorHandler.logError(error, 'Analyze Staff Workload');
                this.uiManager.showErrorMessage('Failed to analyze staff workload');
            }
        }

        clearOldWOHData(daysOld = 60) {
            if (!this.state.buildMode) {
                this.uiManager.showErrorMessage('Build mode required to clear WOH data');
                return;
            }
            
            this.uiManager.showConfirmModal({
                title: 'Clear Old WOH Data',
                message: `Clear WOH data older than ${daysOld} days? This will reset count and oldest date for tasks with very old data. Recommended: Clear items >60 days as they likely need manual escalation beyond normal SLA processes.`,
                onConfirm: () => {
                    try {
                        let clearedCount = 0;
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
                        
                        Object.entries(this.state.priorityTasks || {}).forEach(([taskId, data]) => {
                            if (data.oldestDate) {
                                const oldestDate = new Date(data.oldestDate);
                                if (oldestDate < cutoffDate) {
                                    const task = this.getTaskById(taskId);
                                    console.log(`Clearing very old WOH data for ${task?.name}: was ${Math.floor((new Date() - oldestDate) / (1000 * 60 * 60 * 24))} days old`);
                                    this.updateTaskWOH(taskId, 0, '');
                                    clearedCount++;
                                }
                            }
                        });
                        
                        NotificationManager.show(`Cleared WOH data for ${clearedCount} tasks with very old data (>${daysOld} days)`, 'success');
                        
                    } catch (error) {
                        this.errorHandler.logError(error, 'Clear Old WOH Data');
                        this.uiManager.showErrorMessage('Failed to clear old WOH data');
                    }
                }
            });
        }

        updateStaffWorkDays(staffId, workDays) {
            const staff = this.getStaffById(staffId);
            if (!staff) return;
            
            staff.workDays = workDays;
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Updated work days for ${staff.name}`, 'success');
        }

        updateTaskDetails(taskId, updates) {
            const task = this.state.tasks.find(t => t.id === taskId);
            if (!task) return;
            
            Object.assign(task, updates);
            this.reinitializeManagers();
            this.debouncedSave();
            NotificationManager.show(`Updated task: ${task.name}`, 'success');
        }

        assignStaffToTask(taskId, staffIds, date) {
            if (!this.state.buildMode) return;
            
            this.assignmentGenerator.assignStaffToTask(taskId, staffIds, date);
            this.debouncedSave();
            this.uiManager.render();
            
            const task = this.state.tasks.find(t => t.id === taskId);
            const staffNames = staffIds.map(id => this.getStaffById(id)?.name).filter(Boolean);
            NotificationManager.show(`Assigned ${staffNames.join(', ')} to ${task?.name}`, 'success');
        }

        assignTriageStaff(headerId, staffIds, date) {
            if (!this.state.buildMode) return;
            
            this.assignmentGenerator.assignTriageStaff(headerId, staffIds, date);
            this.debouncedSave();
            this.uiManager.render();
            
            const header = this.state.tasks.find(t => t.id === headerId);
            const staffNames = staffIds.map(id => this.getStaffById(id)?.name).filter(Boolean);
            NotificationManager.show(`Assigned ${staffNames.join(', ')} to ${header?.name} triage`, 'success');
        }

        assignPhoneStaff(date, shift, staffIds) {
            if (!this.state.buildMode) return;
            
            const isoDate = DateUtils.toISODate(date);
            
            if (!this.state.phoneRoster[isoDate]) {
                this.state.phoneRoster[isoDate] = { early: [], late: [] };
            }
            
            this.state.phoneRoster[isoDate][shift] = [...staffIds];
            
            this.debouncedSave();
            this.uiManager.render();
            
            const staffNames = staffIds.map(id => this.getStaffById(id)?.name).filter(Boolean);
            NotificationManager.show(`Assigned ${staffNames.join(', ')} to ${shift} phone shift`, 'success');
        }
    }

    window.workRoster = new WorkAllocationRoster();
});