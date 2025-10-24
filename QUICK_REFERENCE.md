# Configuration System - Quick Reference

Quick reference for developers working with the configuration system.

---

## 🚀 Quick Start

### Access Configuration Manager
```javascript
// In app.js or any file with access to app instance
const configValue = this.app.configManager.get('path.to.value');
const isEnabled = this.app.featureFlags.isEnabled('featureName');
```

---

## 📦 Core Components

### 1. ConfigManager (`core/config-manager.js`)

**Initialize:**
```javascript
this.configManager = new ConfigManager();
await this.configManager.initialize();
```

**Get Values:**
```javascript
// Using dot notation
const orgName = configManager.get('organization.name');
const startDay = configManager.get('workWeek.startDay');
const phoneEnabled = configManager.get('phoneShifts.enabled');

// Get entire section
const workWeek = configManager.get('workWeek');
```

**Set Values:**
```javascript
// Single value
configManager.set('organization.name', 'New Team');
await configManager.save();

// Update section
configManager.updateSection('organization', {
    name: 'New Team',
    timezone: 'America/New_York'
});
await configManager.save();
```

**Export/Import:**
```javascript
// Export
const configJson = configManager.exportConfig();
// Download or save configJson

// Import
await configManager.importConfig(configJson);
```

---

### 2. Feature Flags (`core/feature-flags.js`)

**Initialize:**
```javascript
this.featureFlags = new FeatureFlags(this.configManager);
```

**Check Features:**
```javascript
// Single feature
if (featureFlags.isEnabled('skillsMatrix')) {
    // Show skills matrix
}

// Multiple features (AND logic)
if (featureFlags.areEnabled('workOnHand', 'triageAssignments')) {
    // Both enabled
}

// Helper methods
if (featureFlags.canUseTriage()) {
    // Triage enabled AND in build mode
}
```

**Available Features:**
- `triageAssignments` - Dynamic staff assignment
- `skillsMatrix` - Skill-based assignments
- `workOnHand` - WOH tracking with SLA
- `leaveTracking` - Leave roster integration
- `conflictDetection` - Conflict detection
- `monthLocking` - Lock historical months
- `shiftSwaps` - Shift swapping
- `reportGeneration` - Reports and analytics
- `buildMode` - Edit mode (note: this is state, not just config)

---

### 3. Template Loader (`core/template-loader.js`)

**Initialize:**
```javascript
this.templateLoader = new TemplateLoader(this.configManager);
```

**Load Template:**
```javascript
// Load built-in template
await templateLoader.loadTemplate('government-team');
await configManager.save();

// List available templates
const templates = templateLoader.listTemplates();
```

**Create Custom Template:**
```javascript
// Save current config as template
const template = templateLoader.createCustomTemplate('My Team Template');
// Save template to file or database
```

---

## 🎨 UI Integration Examples

### Conditional Rendering

**Hide element based on feature:**
```javascript
// In render method
const showWOH = this.app.featureFlags?.isEnabled('workOnHand') ?? true;

if (showWOH) {
    // Render WOH column
    html += `<td class="woh-column">${this.renderWOH()}</td>`;
}
```

**Hide element with inline style:**
```javascript
<td class="woh-column" ${!showWOH ? 'style="display: none;"' : ''}>
    ${showWOH ? this.renderWOH() : '-'}
</td>
```

**Conditional button visibility:**
```javascript
updateModeDisplay() {
    const skillsBtn = document.getElementById('skills-matrix-btn');
    if (skillsBtn && !this.app.featureFlags.isEnabled('skillsMatrix')) {
        skillsBtn.style.display = 'none';
    }
}
```

---

## 📝 Configuration Schema Paths

### Organization
- `organization.name` - Team name (string)
- `organization.timezone` - Timezone (string)
- `organization.region` - Region code (string)
- `organization.staff` - Staff array
- `organization.tasks` - Tasks array

### Work Week
- `workWeek.structure` - Day order array
- `workWeek.startDay` - First day of week (string)
- `workWeek.workingDays` - Working days array

### Phone Shifts
- `phoneShifts.enabled` - Enable phone coverage (boolean)
- `phoneShifts.shifts` - Shift definitions array
- `phoneShifts.rotationWeeks` - Rotation cycle (number)
- `phoneShifts.maxStaffPerShift` - Max staff per shift (number)

### SLA
- `sla.enabled` - Enable SLA tracking (boolean)
- `sla.defaultDays` - Default SLA days (number)
- `sla.warningThreshold` - Warning days (number)
- `sla.criticalThreshold` - Critical days (number)

### Features
- `features.triageAssignments` - (boolean)
- `features.skillsMatrix` - (boolean)
- `features.workOnHand` - (boolean)
- `features.leaveTracking` - (boolean)
- `features.conflictDetection` - (boolean)
- `features.monthLocking` - (boolean)
- `features.shiftSwaps` - (boolean)
- `features.reportGeneration` - (boolean)
- `features.buildMode` - (boolean)

### Security
- `security.buildModePassword` - Build mode password (string)
- `security.requirePasswordForAdmin` - Require password (boolean)

### Display
- `display.theme` - Theme: 'light' | 'dark' | 'auto'
- `display.defaultView` - View: 'full' | 'personal'
- `display.compactMode` - Compact mode (boolean)

---

## 🔧 Common Patterns

### Pattern 1: Check Feature Before Action
```javascript
handleAction() {
    if (!this.app.featureFlags.isEnabled('requiredFeature')) {
        this.uiManager.showErrorMessage('Feature not enabled');
        return;
    }
    
    // Proceed with action
}
```

### Pattern 2: Graceful Degradation
```javascript
// Use optional chaining and nullish coalescing
const showFeature = this.app.featureFlags?.isEnabled('feature') ?? true;

// This ensures legacy code works even if featureFlags not initialized
```

### Pattern 3: Config-Driven Defaults
```javascript
async processLoadedData(data) {
    // Priority: Saved data → Config → Hardcoded
    let defaultStaff = DEFAULT_STAFF;
    
    if (this.configManager) {
        const configStaff = this.configManager.get('organization.staff');
        if (configStaff?.length > 0) {
            defaultStaff = configStaff;
        }
    }
    
    this.state.staff = data.staff || defaultStaff;
}
```

### Pattern 4: Batch Updates
```javascript
// Update multiple values at once
configManager.updateSection('organization', {
    name: 'New Team',
    timezone: 'America/New_York',
    region: 'NY'
});
await configManager.save();
```

### Pattern 5: Template Application
```javascript
// Apply template on first run
async initializeDefaults() {
    if (!this.configManager.get('organization.staff')?.length) {
        // No staff configured, load template
        await this.templateLoader.loadTemplate('government-team');
        await this.configManager.save();
    }
}
```

---

## 🐛 Debugging

### Check Current Config
```javascript
// In console
console.log(app.configManager.config);
console.log(app.configManager.get('features'));
```

### Verify Feature State
```javascript
// In console
Object.keys(app.configManager.get('features')).forEach(f => {
    console.log(f, app.featureFlags.isEnabled(f));
});
```

### Export Config for Inspection
```javascript
// In console
const config = app.configManager.exportConfig();
console.log(JSON.stringify(config, null, 2));
```

### Reset to Defaults
```javascript
// In console
await app.configManager.reset();
await app.configManager.save();
location.reload();
```

---

## ⚠️ Important Notes

### Do's ✅
- ✅ Always use optional chaining: `app.featureFlags?.isEnabled()`
- ✅ Provide fallback values: `?? true`
- ✅ Await save() after config changes
- ✅ Validate user input before setting
- ✅ Check feature flags before showing UI elements

### Don'ts ❌
- ❌ Don't mutate config directly
- ❌ Don't bypass validation with direct storage access
- ❌ Don't assume ConfigManager is initialized
- ❌ Don't forget to save after changes
- ❌ Don't use hardcoded values (use config instead)

---

## 🔄 Migration Checklist

When adding a new configurable feature:

1. ✅ Add to `config/schema.js`
2. ✅ Add to templates (if applicable)
3. ✅ Update UI to check config
4. ✅ Add to configuration modal
5. ✅ Update documentation
6. ✅ Test with feature on/off

---

## 📚 Related Documentation

- `CONFIGURATION.md` - Comprehensive configuration guide
- `TESTING_GUIDE.md` - Complete testing procedures
- `IMPLEMENTATION_SUMMARY.md` - High-level overview
- `PROGRESS.md` - Detailed progress report

---

## 🆘 Troubleshooting

**Config not loading?**
```javascript
// Check initialization
console.log('ConfigManager initialized:', !!app.configManager.config);
```

**Feature flag not working?**
```javascript
// Verify feature exists and is spelled correctly
console.log(app.featureFlags.isEnabled('featureName'));
console.log('Available features:', Object.keys(app.configManager.get('features')));
```

**Changes not persisting?**
```javascript
// Ensure you're calling save()
await app.configManager.save();

// Check Chrome storage
chrome.storage.local.get(['rosterConfig'], (result) => {
    console.log('Stored config:', result);
});
```

---

**Last Updated**: October 2024  
**Version**: 3.2.0
