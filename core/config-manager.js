// ===== CONFIGURATION MANAGER =====
// Manages loading, saving, and validating system configuration

import { 
    ConfigSchema, 
    getDefaultConfig, 
    validateConfig, 
    mergeWithDefaults 
} from '../config/schema.js';

/**
 * ConfigManager - Central configuration management system
 * Handles persistence, validation, and migration of configuration
 */
export class ConfigManager {
    constructor() {
        this.config = null;
        this.initialized = false;
        this.storageKey = 'workRosterConfig';
        this.migrationVersion = '3.2.0';
    }

    /**
     * Initialize configuration system
     * Loads from storage or creates default config
     */
    async initialize() {
        try {
            console.log('📋 Initializing ConfigManager...');
            
            const storedConfig = await this.loadFromStorage();
            
            if (storedConfig) {
                console.log('✓ Found stored configuration');
                this.config = this.migrateIfNeeded(storedConfig);
            } else {
                console.log('✓ Creating default configuration');
                this.config = getDefaultConfig();
                this.config._version = this.migrationVersion;
                this.config._created = new Date().toISOString();
            }
            
            // Validate configuration
            const validation = validateConfig(this.config);
            if (!validation.valid) {
                console.error('❌ Configuration validation failed:', validation.errors);
                // Merge with defaults to fix
                this.config = mergeWithDefaults(this.config);
            }
            
            if (validation.warnings.length > 0) {
                console.warn('⚠️ Configuration warnings:', validation.warnings);
            }
            
            this.initialized = true;
            console.log('✅ ConfigManager initialized successfully');
            
            return this.config;
        } catch (error) {
            console.error('Failed to initialize ConfigManager:', error);
            // Fallback to defaults
            this.config = getDefaultConfig();
            this.initialized = true;
            return this.config;
        }
    }

    /**
     * Load configuration from Chrome storage
     */
    async loadFromStorage() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                return new Promise((resolve) => {
                    chrome.storage.local.get([this.storageKey], (result) => {
                        resolve(result[this.storageKey] || null);
                    });
                });
            } else {
                // Fallback to localStorage for testing
                const stored = localStorage.getItem(this.storageKey);
                return stored ? JSON.parse(stored) : null;
            }
        } catch (error) {
            console.error('Error loading config from storage:', error);
            return null;
        }
    }

    /**
     * Save configuration to Chrome storage
     */
    async save() {
        if (!this.config) {
            console.error('Cannot save: config not initialized');
            return false;
        }

        try {
            this.config._lastModified = new Date().toISOString();
            this.config._version = this.migrationVersion;

            if (typeof chrome !== 'undefined' && chrome.storage) {
                return new Promise((resolve) => {
                    chrome.storage.local.set({ [this.storageKey]: this.config }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error saving config:', chrome.runtime.lastError);
                            resolve(false);
                        } else {
                            console.log('✓ Configuration saved');
                            resolve(true);
                        }
                    });
                });
            } else {
                // Fallback to localStorage
                localStorage.setItem(this.storageKey, JSON.stringify(this.config));
                console.log('✓ Configuration saved (localStorage)');
                return true;
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            return false;
        }
    }

    /**
     * Get entire configuration
     */
    getConfig() {
        return this.config ? JSON.parse(JSON.stringify(this.config)) : null;
    }

    /**
     * Get specific section of configuration
     */
    getSection(section) {
        return this.config?.[section] ? JSON.parse(JSON.stringify(this.config[section])) : null;
    }

    /**
     * Get specific field value
     */
    get(section, field) {
        return this.config?.[section]?.[field];
    }

    /**
     * Set specific field value
     */
    async set(section, field, value) {
        if (!this.config[section]) {
            this.config[section] = {};
        }
        
        this.config[section][field] = value;
        return await this.save();
    }

    /**
     * Update entire section
     */
    async updateSection(section, values) {
        if (!this.config) {
            console.error('Config not initialized');
            return false;
        }

        this.config[section] = { ...this.config[section], ...values };
        
        // Validate after update
        const validation = validateConfig(this.config);
        if (!validation.valid) {
            console.error('Validation failed after update:', validation.errors);
            return false;
        }
        
        return await this.save();
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureName) {
        return this.config?.features?.[featureName] === true;
    }

    /**
     * Enable/disable feature
     */
    async setFeature(featureName, enabled) {
        return await this.set('features', featureName, enabled);
    }

    /**
     * Get organization name
     */
    getOrganizationName() {
        return this.config?.organization?.name || 'Work Allocation Team';
    }

    /**
     * Get work week configuration
     */
    getWorkWeek() {
        return this.config?.workWeek || {
            structure: ['tuesday', 'wednesday', 'thursday', 'friday', 'monday'],
            startDay: 'tuesday',
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };
    }

    /**
     * Get phone shifts configuration
     */
    getPhoneShifts() {
        return this.config?.phoneShifts || {
            enabled: true,
            shifts: [
                { id: 'early', name: 'Early', startTime: '08:00', endTime: '12:00' },
                { id: 'late', name: 'Late', startTime: '12:00', endTime: '17:00' }
            ],
            rotationWeeks: 6,
            maxStaffPerShift: 2
        };
    }

    /**
     * Get SLA configuration
     */
    getSLA() {
        return this.config?.sla || {
            enabled: true,
            defaultDays: 14,
            warningThreshold: 8,
            criticalThreshold: 11
        };
    }

    /**
     * Reset to default configuration
     */
    async resetToDefaults() {
        console.log('⚠️ Resetting configuration to defaults');
        this.config = getDefaultConfig();
        this.config._version = this.migrationVersion;
        this.config._created = new Date().toISOString();
        return await this.save();
    }

    /**
     * Export configuration as JSON
     */
    exportConfig() {
        return {
            config: this.config,
            exportedAt: new Date().toISOString(),
            version: this.migrationVersion
        };
    }

    /**
     * Import configuration from JSON
     */
    async importConfig(importedData) {
        try {
            const config = importedData.config || importedData;
            
            // Validate imported config
            const validation = validateConfig(config);
            if (!validation.valid) {
                console.error('Invalid configuration:', validation.errors);
                return {
                    success: false,
                    errors: validation.errors
                };
            }
            
            // Merge with defaults to ensure all fields exist
            this.config = mergeWithDefaults(config);
            this.config._imported = new Date().toISOString();
            this.config._version = this.migrationVersion;
            
            const saved = await this.save();
            
            return {
                success: saved,
                warnings: validation.warnings
            };
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                errors: [error.message]
            };
        }
    }

    /**
     * Migrate configuration to current version
     */
    migrateIfNeeded(config) {
        const currentVersion = config._version || '3.0.0';
        
        if (currentVersion === this.migrationVersion) {
            return config;
        }
        
        console.log(`📦 Migrating configuration from ${currentVersion} to ${this.migrationVersion}`);
        
        let migrated = { ...config };
        
        // Migration logic based on version
        if (currentVersion < '3.2.0') {
            // Add new sections if missing
            if (!migrated.organization) {
                migrated.organization = {
                    name: 'Work Allocation Team',
                    timezone: 'Australia/Sydney',
                    region: 'NSW'
                };
            }
            
            if (!migrated.workWeek) {
                migrated.workWeek = {
                    structure: ['tuesday', 'wednesday', 'thursday', 'friday', 'monday'],
                    startDay: 'tuesday',
                    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                };
            }
            
            if (!migrated.features) {
                migrated.features = {};
            }
            
            // Set default features
            const defaultFeatures = getDefaultConfig().features;
            migrated.features = { ...defaultFeatures, ...migrated.features };
        }
        
        migrated._version = this.migrationVersion;
        migrated._migrated = new Date().toISOString();
        
        console.log('✅ Configuration migrated successfully');
        return migrated;
    }

    /**
     * Get configuration for display/editing
     */
    getEditableConfig() {
        const config = this.getConfig();
        
        // Remove internal fields
        delete config._version;
        delete config._created;
        delete config._lastModified;
        delete config._imported;
        delete config._migrated;
        
        return config;
    }

    /**
     * Check if this is first run (no config saved)
     */
    async isFirstRun() {
        const stored = await this.loadFromStorage();
        return stored === null;
    }

    /**
     * Mark setup as completed
     */
    async completeSetup() {
        this.config._setupCompleted = true;
        this.config._setupCompletedAt = new Date().toISOString();
        return await this.save();
    }

    /**
     * Check if setup was completed
     */
    isSetupCompleted() {
        return this.config?._setupCompleted === true;
    }
}

// Export singleton instance
export const configManager = new ConfigManager();
