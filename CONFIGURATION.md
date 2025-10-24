# Work Allocation Roster - Configuration System

## 🎯 Overview

This Chrome extension has been refactored to support **multiple teams** with different configurations. The system now separates hardcoded team-specific logic from the core functionality, making it adaptable for any organization.

---

## ✅ Completed Improvements

### 1. **Fixed Critical Week Structure Bug**
- Removed duplicate `getWeek()` implementations
- Standardized on Tuesday-Monday work week structure from `config.js`
- All date utilities now consistent across the application

### 2. **Configuration Schema System** (`config/schema.js`)
- Comprehensive schema defining all configurable options
- Validation system for configuration data
- Default value management
- Field descriptions for UI generation

### 3. **ConfigManager Class** (`core/config-manager.js`)
- Centralized configuration management
- Chrome storage persistence
- Configuration validation
- Migration system for version updates
- Import/export functionality
- First-run detection

### 4. **Feature Flags System** (`core/feature-flags.js`)
- Runtime feature toggling
- Dependency validation
- Feature descriptions and icons
- Helper methods for common checks

### 5. **Team Templates** (`templates/`)
- **Government Team Template**: NSW-specific with phone shifts, SLA tracking
- **Standard Business Template**: Simple Monday-Friday without complex features
- Pre-configured sample data included

---

## 📋 What's Configurable Now

### Organization Settings
- Organization name
- Timezone
- Region (for holiday calculations)

### Work Week Structure
- Week start day (Monday, Tuesday, etc.)
- Working days (can be non-consecutive)
- Week display structure

### Phone Shifts
- Enable/disable phone shift system
- Define shift types (early, late, custom)
- Rotation cycle length
- Max staff per shift
- Allow double shifts (Jenny rule)

### SLA Configuration
- Enable/disable SLA tracking
- Default SLA period (14 days)
- Warning thresholds
- Critical thresholds
- Per-task SLA overrides

### Feature Flags
✅ Triage Assignments
✅ Skills Matrix
✅ Work on Hand (WOH) Tracking
✅ Leave Tracking
✅ Conflict Detection
✅ Month Locking
✅ Shift Swaps
✅ Report Generation
✅ Build Mode

### Security
- Build mode password
- Admin access control

### Display
- Theme (light/dark/auto)
- Default view (full/personal)
- Compact mode

---

## 🏗️ New File Structure

```
Leave-Roster/
├── config/                       # Configuration system
│   └── schema.js                 # Configuration schema & validation
│
├── core/                         # Core system modules
│   ├── config-manager.js         # Configuration management
│   └── feature-flags.js          # Feature flag system
│
├── templates/                    # Team templates
│   ├── government-team.json      # NSW Govt template
│   └── standard-team.json        # Simple business template
│
├── [existing files...]           # Original application files
```

---

## 🚀 Next Steps (To Be Implemented)

### Phase 1: Integration
1. Update `app.js` to initialize ConfigManager on startup
2. Replace hardcoded DEFAULT_STAFF with config-based staff
3. Replace hardcoded DEFAULT_TASKS with config-based tasks
4. Update UI to check feature flags before rendering

### Phase 2: User Interface
1. Create admin settings panel in `modals.js`
2. Build setup wizard for first-run experience
3. Add template selector UI
4. Implement configuration export/import UI

### Phase 3: Testing
1. Test configuration persistence
2. Verify feature flag toggling
3. Test template loading
4. Validate migration system

### Phase 4: Documentation
1. User guide for setup
2. Admin configuration guide
3. Template creation guide
4. Developer extension guide

---

## 🔧 How to Use (Coming Soon)

### For New Teams

1. **Install Extension**
   - Load extension in Chrome
   - Setup wizard launches automatically

2. **Choose Template**
   - Government Team (NSW-style)
   - Standard Business (Simple)
   - Custom (Manual configuration)

3. **Configure Team**
   - Add staff members
   - Define tasks and categories
   - Set work week preferences
   - Enable/disable features

4. **Start Using**
   - Build mode for initial setup
   - Generate assignments
   - Track leave and coverage

### For Existing Users

Your data will be automatically migrated to the new system with all your existing settings preserved.

---

## 🛠️ For Developers

### Adding New Configuration Options

1. Add field to `ConfigSchema` in `config/schema.js`
2. Update `ConfigManager` methods if needed
3. Use `configManager.get(section, field)` to access
4. Update templates with default values

### Creating New Templates

1. Copy `templates/standard-team.json`
2. Modify configuration values
3. Update sample staff and tasks
4. Add template description
5. Place in `templates/` folder

### Accessing Configuration in Code

```javascript
import { configManager } from './core/config-manager.js';

// Check if feature is enabled
if (configManager.isFeatureEnabled('phoneShifts')) {
    // Render phone shift UI
}

// Get configuration value
const orgName = configManager.get('organization', 'name');
const rotationWeeks = configManager.get('phoneShifts', 'rotationWeeks');

// Get entire section
const workWeek = configManager.getWorkWeek();
```

### Using Feature Flags

```javascript
import { FeatureFlags } from './core/feature-flags.js';

const features = new FeatureFlags(configManager);

// Check single feature
if (features.isEnabled('triageAssignments')) {
    // Show triage UI
}

// Conditional rendering
const html = features.renderIfEnabled('workOnHand', () => {
    return `<div class="woh-column">...</div>`;
});
```

---

## 📊 Configuration Schema Reference

See `config/schema.js` for complete schema definition with:
- Field types
- Default values
- Validation rules
- Options/constraints
- Descriptions

---

## 🐛 Bug Fixes Included

1. ✅ **Week Structure Inconsistency**: Fixed duplicate getWeek() causing incorrect week calculations
2. ✅ **Skills Matrix Format**: Prepared migration from category-based to task-based skills
3. ✅ **Hardcoded Dependencies**: Abstracted NSW-specific logic for reusability

---

## 📝 Migration Notes

### From Version 3.1.0 to 3.2.0

- Configuration automatically migrated
- New sections added with defaults
- Existing data preserved
- Feature flags initialized based on existing functionality

### Breaking Changes

None - backwards compatible with existing data.

---

## 🤝 Contributing

To extend the configuration system:

1. Update `ConfigSchema` with new fields
2. Add validation rules
3. Update templates
4. Add UI controls in settings
5. Update documentation

---

## 📄 License

Same as the main application.

---

## ✨ Benefits of New System

✅ **Multi-team Support** - Use same extension for different teams  
✅ **No Code Changes** - Configure via UI instead of editing code  
✅ **Template Library** - Quick setup with pre-built templates  
✅ **Feature Toggling** - Enable only what you need  
✅ **Import/Export** - Share configurations between installations  
✅ **Version Migration** - Automatic updates preserve data  
✅ **Validation** - Prevents invalid configurations  
✅ **Documentation** - Self-documenting schema with descriptions  

---

**Last Updated**: October 20, 2025  
**Version**: 3.2.0  
**Status**: Foundation Complete - Integration In Progress
