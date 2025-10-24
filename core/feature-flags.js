// ===== FEATURE FLAGS SYSTEM =====
// Provides runtime feature toggling based on configuration

/**
 * FeatureFlags - Manages feature availability throughout the application
 */
export class FeatureFlags {
    constructor(configManager) {
        this.configManager = configManager;
    }

    /**
     * Check if a feature is enabled
     */
    isEnabled(featureName) {
        if (!this.configManager || !this.configManager.initialized) {
            console.warn(`FeatureFlags: ConfigManager not initialized, defaulting ${featureName} to true`);
            return true;
        }
        
        return this.configManager.isFeatureEnabled(featureName);
    }

    /**
     * Get all feature flags as object
     */
    getAll() {
        if (!this.configManager || !this.configManager.initialized) {
            return {};
        }
        
        return this.configManager.getSection('features') || {};
    }

    /**
     * Check multiple features at once
     */
    areEnabled(...featureNames) {
        return featureNames.every(name => this.isEnabled(name));
    }

    /**
     * Check if any of the features are enabled
     */
    anyEnabled(...featureNames) {
        return featureNames.some(name => this.isEnabled(name));
    }

    /**
     * Get list of enabled features
     */
    getEnabledFeatures() {
        const features = this.getAll();
        return Object.keys(features).filter(key => features[key] === true);
    }

    /**
     * Get list of disabled features
     */
    getDisabledFeatures() {
        const features = this.getAll();
        return Object.keys(features).filter(key => features[key] === false);
    }

    /**
     * Feature-specific helper methods
     */

    canUseTriage() {
        return this.isEnabled('triageAssignments');
    }

    canUseSkillsMatrix() {
        return this.isEnabled('skillsMatrix');
    }

    canTrackWOH() {
        return this.isEnabled('workOnHand');
    }

    canTrackLeave() {
        return this.isEnabled('leaveTracking');
    }

    canDetectConflicts() {
        return this.isEnabled('conflictDetection');
    }

    canLockMonths() {
        return this.isEnabled('monthLocking');
    }

    canSwapShifts() {
        return this.isEnabled('shiftSwaps');
    }

    canGenerateReports() {
        return this.isEnabled('reportGeneration');
    }

    canAccessBuildMode() {
        return this.isEnabled('buildMode');
    }

    /**
     * Get feature status summary for display
     */
    getFeatureSummary() {
        const features = this.getAll();
        const enabled = this.getEnabledFeatures();
        const disabled = this.getDisabledFeatures();
        
        return {
            total: Object.keys(features).length,
            enabled: enabled.length,
            disabled: disabled.length,
            enabledList: enabled,
            disabledList: disabled,
            features: features
        };
    }

    /**
     * Feature descriptions for UI display
     */
    static getFeatureDescription(featureName) {
        const descriptions = {
            triageAssignments: 'Category-level triage assignments for quick task distribution',
            skillsMatrix: 'Skill-based assignment system with proficiency levels',
            workOnHand: 'Work on Hand (WOH) tracking with SLA monitoring',
            leaveTracking: 'Staff leave planning and roster integration',
            conflictDetection: 'Automatic detection of scheduling conflicts',
            monthLocking: 'Ability to lock completed months to prevent changes',
            shiftSwaps: 'Phone shift swap and coverage management',
            reportGeneration: 'Advanced reporting and analytics features',
            buildMode: 'Administrative build mode for roster editing'
        };
        
        return descriptions[featureName] || 'No description available';
    }

    /**
     * Get feature icon for UI display
     */
    static getFeatureIcon(featureName) {
        const icons = {
            triageAssignments: 'category',
            skillsMatrix: 'engineering',
            workOnHand: 'pending_actions',
            leaveTracking: 'event_available',
            conflictDetection: 'warning',
            monthLocking: 'lock',
            shiftSwaps: 'swap_horiz',
            reportGeneration: 'assessment',
            buildMode: 'build'
        };
        
        return icons[featureName] || 'flag';
    }

    /**
     * Check if feature requires other features
     */
    static getFeatureDependencies(featureName) {
        const dependencies = {
            triageAssignments: [],
            skillsMatrix: [],
            workOnHand: [],
            leaveTracking: [],
            conflictDetection: [],
            monthLocking: [],
            shiftSwaps: ['phoneShifts.enabled'], // Requires phone shifts to be enabled
            reportGeneration: [],
            buildMode: []
        };
        
        return dependencies[featureName] || [];
    }

    /**
     * Validate feature dependencies
     */
    validateDependencies(featureName) {
        const dependencies = FeatureFlags.getFeatureDependencies(featureName);
        const missingDependencies = [];
        
        dependencies.forEach(dep => {
            if (dep.includes('.')) {
                // Check nested config (e.g., phoneShifts.enabled)
                const [section, field] = dep.split('.');
                if (!this.configManager.get(section, field)) {
                    missingDependencies.push(dep);
                }
            } else {
                // Check feature flag
                if (!this.isEnabled(dep)) {
                    missingDependencies.push(dep);
                }
            }
        });
        
        return {
            valid: missingDependencies.length === 0,
            missing: missingDependencies
        };
    }
}

/**
 * Feature flag utility functions
 */
export const FeatureUtils = {
    /**
     * Conditionally render UI based on feature
     */
    renderIfEnabled(featureFlags, featureName, renderFn) {
        if (featureFlags.isEnabled(featureName)) {
            return renderFn();
        }
        return '';
    },

    /**
     * Add class based on feature status
     */
    getFeatureClass(featureFlags, featureName, baseClass = '') {
        const enabled = featureFlags.isEnabled(featureName);
        return `${baseClass} ${enabled ? 'feature-enabled' : 'feature-disabled'}`;
    },

    /**
     * Get CSS visibility style based on feature
     */
    getFeatureStyle(featureFlags, featureName) {
        return featureFlags.isEnabled(featureName) ? '' : 'display: none;';
    },

    /**
     * Filter array based on feature requirement
     */
    filterByFeature(featureFlags, items, featureGetter) {
        return items.filter(item => {
            const requiredFeature = featureGetter(item);
            return !requiredFeature || featureFlags.isEnabled(requiredFeature);
        });
    }
};
