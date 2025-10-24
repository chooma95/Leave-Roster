// ===== CONFIGURATION SCHEMA =====
// Defines the structure and validation rules for system configuration

/**
 * Configuration Schema Definition
 * This defines what can be configured and the expected format
 */
export const ConfigSchema = {
    // Organization details
    organization: {
        name: {
            type: 'string',
            default: 'Work Allocation Team',
            required: true,
            description: 'Organization or team name'
        },
        timezone: {
            type: 'string',
            default: 'Australia/Sydney',
            required: false,
            description: 'IANA timezone identifier'
        },
        region: {
            type: 'string',
            default: 'NSW',
            required: true,
            options: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT', 'US', 'UK', 'Custom'],
            description: 'Region for public holiday calculations'
        }
    },

    // Work week configuration
    workWeek: {
        structure: {
            type: 'array',
            default: ['tuesday', 'wednesday', 'thursday', 'friday', 'monday'],
            required: true,
            description: 'Days of the work week in order (Tuesday-Monday for NSW govt)'
        },
        startDay: {
            type: 'string',
            default: 'tuesday',
            required: true,
            options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            description: 'First day of the work week'
        },
        workingDays: {
            type: 'array',
            default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            required: true,
            description: 'Days considered working days (not necessarily consecutive)'
        }
    },

    // Phone shift configuration
    phoneShifts: {
        enabled: {
            type: 'boolean',
            default: true,
            required: true,
            description: 'Enable phone shift coverage system'
        },
        shifts: {
            type: 'array',
            default: [
                { id: 'early', name: 'Early', startTime: '08:00', endTime: '12:00', color: '#3b82f6' },
                { id: 'late', name: 'Late', startTime: '12:00', endTime: '17:00', color: '#8b5cf6' }
            ],
            required: false,
            description: 'Defined shift types with times and display colors'
        },
        rotationWeeks: {
            type: 'number',
            default: 6,
            min: 1,
            max: 12,
            required: true,
            description: 'Number of weeks in the rotation cycle'
        },
        maxStaffPerShift: {
            type: 'number',
            default: 2,
            min: 1,
            max: 10,
            required: true,
            description: 'Maximum staff members per shift'
        },
        allowDoubleShifts: {
            type: 'boolean',
            default: true,
            required: false,
            description: 'Allow staff to work both early and late on same day (Jenny rule)'
        }
    },

    // SLA configuration
    sla: {
        enabled: {
            type: 'boolean',
            default: true,
            required: true,
            description: 'Enable SLA tracking and WOH (Work on Hand) system'
        },
        defaultDays: {
            type: 'number',
            default: 14,
            min: 1,
            max: 90,
            required: true,
            description: 'Default SLA period in days'
        },
        warningThreshold: {
            type: 'number',
            default: 8,
            min: 1,
            required: false,
            description: 'Days before SLA breach to show warning'
        },
        criticalThreshold: {
            type: 'number',
            default: 11,
            min: 1,
            required: false,
            description: 'Days before SLA breach to mark as critical'
        },
        taskOverrides: {
            type: 'object',
            default: {},
            required: false,
            description: 'Per-task SLA overrides (taskId: days)'
        }
    },

    // Feature flags
    features: {
        triageAssignments: {
            type: 'boolean',
            default: true,
            description: 'Enable category-level triage assignments'
        },
        skillsMatrix: {
            type: 'boolean',
            default: true,
            description: 'Enable skill-based task assignment system'
        },
        workOnHand: {
            type: 'boolean',
            default: true,
            description: 'Enable Work on Hand (WOH) tracking'
        },
        leaveTracking: {
            type: 'boolean',
            default: true,
            description: 'Enable leave roster and tracking'
        },
        conflictDetection: {
            type: 'boolean',
            default: true,
            description: 'Enable automatic conflict detection'
        },
        monthLocking: {
            type: 'boolean',
            default: true,
            description: 'Enable ability to lock completed months'
        },
        shiftSwaps: {
            type: 'boolean',
            default: true,
            description: 'Enable phone shift swap functionality'
        },
        reportGeneration: {
            type: 'boolean',
            default: true,
            description: 'Enable report generation features'
        },
        buildMode: {
            type: 'boolean',
            default: false,
            description: 'Enable build mode (requires password)'
        }
    },

    // Security settings
    security: {
        buildModePassword: {
            type: 'string',
            default: 'CAU',
            required: true,
            description: 'Password required to enter build mode'
        },
        requirePasswordForAdmin: {
            type: 'boolean',
            default: true,
            description: 'Require password to access admin settings'
        }
    },

    // Display preferences
    display: {
        theme: {
            type: 'string',
            default: 'light',
            options: ['light', 'dark', 'auto'],
            description: 'Color theme preference'
        },
        defaultView: {
            type: 'string',
            default: 'full',
            options: ['full', 'personal'],
            description: 'Default roster view'
        },
        compactMode: {
            type: 'boolean',
            default: false,
            description: 'Use compact display mode'
        }
    }
};

/**
 * Get default configuration from schema
 */
export function getDefaultConfig() {
    const config = {};
    
    for (const [section, fields] of Object.entries(ConfigSchema)) {
        config[section] = {};
        for (const [field, schema] of Object.entries(fields)) {
            if (schema.default !== undefined) {
                config[section][field] = JSON.parse(JSON.stringify(schema.default));
            }
        }
    }
    
    return config;
}

/**
 * Validate configuration against schema
 */
export function validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    for (const [section, fields] of Object.entries(ConfigSchema)) {
        if (!config[section]) {
            warnings.push(`Missing section: ${section}`);
            continue;
        }
        
        for (const [field, schema] of Object.entries(fields)) {
            const value = config[section][field];
            
            // Check required fields
            if (schema.required && (value === undefined || value === null)) {
                errors.push(`Required field missing: ${section}.${field}`);
                continue;
            }
            
            if (value === undefined) continue;
            
            // Type checking
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schema.type) {
                errors.push(`Type mismatch: ${section}.${field} - expected ${schema.type}, got ${actualType}`);
                continue;
            }
            
            // Validate options
            if (schema.options && !schema.options.includes(value)) {
                errors.push(`Invalid value for ${section}.${field}: ${value}. Must be one of: ${schema.options.join(', ')}`);
            }
            
            // Validate numeric ranges
            if (schema.type === 'number') {
                if (schema.min !== undefined && value < schema.min) {
                    errors.push(`Value too small for ${section}.${field}: ${value} (min: ${schema.min})`);
                }
                if (schema.max !== undefined && value > schema.max) {
                    errors.push(`Value too large for ${section}.${field}: ${value} (max: ${schema.max})`);
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(userConfig) {
    const defaultConfig = getDefaultConfig();
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    if (!userConfig) return merged;
    
    for (const [section, fields] of Object.entries(userConfig)) {
        if (merged[section]) {
            merged[section] = { ...merged[section], ...fields };
        } else {
            merged[section] = fields;
        }
    }
    
    return merged;
}

/**
 * Get configuration field description
 */
export function getFieldDescription(section, field) {
    return ConfigSchema[section]?.[field]?.description || 'No description available';
}

/**
 * Get configuration field options
 */
export function getFieldOptions(section, field) {
    return ConfigSchema[section]?.[field]?.options || null;
}

/**
 * Check if feature is enabled by default
 */
export function isFeatureEnabledByDefault(featureName) {
    return ConfigSchema.features?.[featureName]?.default === true;
}
