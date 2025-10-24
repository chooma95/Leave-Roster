// ===== TEMPLATE LOADER =====
// Loads and applies team templates

/**
 * TemplateLoader - Manages loading and applying team templates
 */
export class TemplateLoader {
    constructor() {
        this.availableTemplates = [
            {
                id: 'nsw-cau-team',
                name: 'NSW CAU Team (Your Team)',
                description: 'NSW Customer Administration Unit - Complete team setup with 14 staff and 50+ tasks',
                file: 'templates/nsw-cau-team.json',
                icon: 'business',
                recommended: false  // User's specific team
            },
            {
                id: 'government-team',
                name: 'NSW Government Team',
                description: 'NSW Government administrative team with phone coverage and SLA tracking',
                file: 'templates/government-team.json',
                icon: 'account_balance',
                recommended: true
            },
            {
                id: 'standard-team',
                name: 'Standard Business Team',
                description: 'Generic Monday-Friday office team - good starting point',
                file: 'templates/standard-team-v2.json',
                icon: 'work',
                recommended: true
            }
        ];
    }

    /**
     * Get list of available templates with metadata
     */
    async listTemplates() {
        const templates = [];
        
        for (const templateInfo of this.availableTemplates) {
            try {
                const template = await this.getTemplate(templateInfo.id);
                templates.push({
                    id: templateInfo.id,
                    metadata: template.metadata || {
                        name: templateInfo.name,
                        description: templateInfo.description,
                        icon: templateInfo.icon
                    }
                });
            } catch (error) {
                console.warn(`Could not load template ${templateInfo.id}:`, error);
            }
        }
        
        return templates;
    }

    /**
     * Get template data by ID
     */
    async getTemplate(templateId) {
        const templateInfo = this.availableTemplates.find(t => t.id === templateId);
        
        if (!templateInfo) {
            throw new Error(`Template not found: ${templateId}`);
        }

        try {
            const response = await fetch(chrome.runtime.getURL(templateInfo.file));
            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.statusText}`);
            }
            
            const templateData = await response.json();
            return templateData;
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }

    /**
     * Apply template to configuration and data
     * Returns staff and tasks to be loaded into the application
     */
    async applyTemplate(templateId, configManager) {
        try {
            console.log(`📋 Loading template: ${templateId}`);
            
            const template = await this.getTemplate(templateId);
            
            // Import configuration
            const configResult = await configManager.importConfig(template.config);
            
            if (!configResult.success) {
                throw new Error(`Configuration validation failed: ${configResult.errors.join(', ')}`);
            }

            // Return staff, tasks, and categories from template
            return {
                success: true,
                config: template.config,
                staff: template.staff || [],
                tasks: template.tasks || [],
                categories: template.categories || [],
                metadata: template.metadata,
                warnings: configResult.warnings
            };
        } catch (error) {
            console.error('Error applying template:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load template - applies config and returns data
     * Alias for applyTemplate for backwards compatibility
     */
    async loadTemplate(templateId, configManager) {
        return await this.applyTemplate(templateId, configManager);
    }

    /**
     * Create custom template from current configuration
     */
    async createCustomTemplate(configManager, appData, name, description) {
        const template = {
            name: name || 'Custom Team Template',
            description: description || 'Custom team configuration',
            version: '3.2.0',
            config: configManager.getEditableConfig(),
            sampleData: {
                staff: appData.staff || [],
                tasks: appData.tasks || [],
                categories: this.extractCategories(appData.tasks)
            }
        };

        return template;
    }

    /**
     * Export template as downloadable JSON
     */
    exportTemplate(template, filename) {
        const dataStr = JSON.stringify(template, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Import template from file
     */
    async importTemplateFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const template = JSON.parse(e.target.result);
                    
                    // Validate template structure
                    if (!template.config || !template.name) {
                        reject(new Error('Invalid template structure'));
                        return;
                    }
                    
                    resolve(template);
                } catch (error) {
                    reject(new Error('Failed to parse template file'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    /**
     * Extract unique categories from tasks
     */
    extractCategories(tasks) {
        const categories = new Map();
        
        tasks.forEach(task => {
            if (task.category && !categories.has(task.category)) {
                categories.set(task.category, {
                    id: task.category,
                    name: this.capitalizeCategory(task.category),
                    color: this.getDefaultCategoryColor(task.category)
                });
            }
        });
        
        return Array.from(categories.values());
    }

    /**
     * Capitalize category name
     */
    capitalizeCategory(category) {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Get default color for category
     */
    getDefaultCategoryColor(category) {
        const colors = {
            'admin': '#6d28d9',
            'cau': '#6d28d9',
            'ctp': '#16a34a',
            'info': '#ea580c',
            'roi': '#0284c7',
            'printing': '#4b5563',
            'projects': '#3b82f6',
            'default': '#6b7280'
        };
        
        return colors[category.toLowerCase()] || colors.default;
    }

    /**
     * Get template preview data
     */
    async getTemplatePreview(templateId) {
        try {
            const template = await this.loadTemplate(templateId);
            
            return {
                name: template.name,
                description: template.description,
                features: this.summarizeFeatures(template.config.features),
                workWeek: template.config.workWeek.structure.join(', '),
                phoneShifts: template.config.phoneShifts.enabled,
                sla: template.config.sla.enabled,
                sampleStaffCount: template.sampleData?.staff?.length || 0,
                sampleTaskCount: template.sampleData?.tasks?.length || 0
            };
        } catch (error) {
            console.error('Error getting template preview:', error);
            return null;
        }
    }

    /**
     * Summarize enabled features
     */
    summarizeFeatures(features) {
        return Object.entries(features)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);
    }
}
