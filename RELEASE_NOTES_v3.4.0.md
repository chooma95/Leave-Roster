# Release Notes - Version 3.4.0

## 🎉 Major Update: Setup Wizard & Full Configurability

Version 3.4.0 transforms the Leave Roster extension into a **fully configurable, template-based system** with a comprehensive first-run experience.

---

## ✨ New Features

### 1. Setup Wizard (First-Run Experience)
- **6-Step Interactive Wizard** guides new users through complete configuration
- **Step 1: Welcome** - Overview of features and capabilities
- **Step 2: Template Selection** - Choose from pre-built templates or start blank
  - NSW CAU Team template (your original team configuration)
  - Government Team template
  - Standard Business template
  - Blank/Custom template
- **Step 3: Organization Details** - Configure company/department information
- **Step 4: Work Week** - Set work week structure (start day, work days, SLA period)
- **Step 5: Features** - Enable/disable 9 feature flags:
  - Phone shift tracking
  - WOH (Work On Hand) column
  - Skills matrix
  - Triage columns
  - Phone coverage view
  - Swap functionality
  - Conflict detection
  - Public holiday tracking
  - SLA tracking
- **Step 6: Complete** - Summary and finalization

### 2. Template System Enhancements
- **New Template: nsw-cau-team.json**
  - Your original NSW CAU team data (14 staff, 52 tasks, 5 categories)
  - Preserved as a loadable template
- **Updated Template: standard-team-v2.json**
  - Generic business template (5 staff, 8 tasks, 3 categories)
  - Improved metadata structure
- **Template Metadata**
  - Name, description, icon
  - Staff and task counts
  - Organization details
- **Template Preview**
  - View staff count, task count, categories
  - See configuration overview before loading

### 3. Complete Decoupling from Hardcoded Data
- **Removed DEFAULT_STAFF hardcoded array** (14 NSW staff members)
- **Removed DEFAULT_TASKS hardcoded array** (52 NSW tasks)
- All team-specific data moved to `templates/nsw-cau-team.json`
- Extension now starts completely blank on first run
- Configuration driven entirely by templates and Setup Wizard

---

## 🔧 Technical Improvements

### New Files
1. **core/setup-wizard.js** (800+ lines)
   - Complete wizard implementation
   - Template selection and preview
   - Form validation and data capture
   - Configuration application

2. **css/wizard.css** (600+ lines)
   - Professional wizard styling
   - Responsive design
   - Dark theme support
   - Progress indicator

3. **templates/nsw-cau-team.json**
   - Original NSW CAU team configuration
   - 14 staff members with work days
   - 52 tasks across 5 categories
   - Complete metadata

4. **templates/standard-team-v2.json**
   - Updated generic template
   - 5 staff members
   - 8 tasks across 3 categories
   - Business-friendly defaults

### Modified Files
1. **app.js**
   - Added SetupWizard integration
   - First-run detection on initialization
   - Wizard interrupts normal app load for new users

2. **core/template-loader.js**
   - Added `listTemplates()` method
   - Added `getTemplate(templateId)` method
   - Metadata support for templates
   - Enhanced `applyTemplate()` to return staff/tasks/categories

3. **config.js**
   - Removed 300+ lines of hardcoded staff/task data
   - Empty DEFAULT_STAFF and DEFAULT_TASKS arrays
   - Updated SystemHealth to handle template-based configuration
   - Improved diagnostics output

4. **index.html**
   - Added wizard.css stylesheet

5. **manifest.json**
   - Version bump to 3.4.0
   - Updated description to highlight Setup Wizard

---

## 🎯 Use Cases

### For NSW CAU Team (Original Users)
1. Install extension
2. Run Setup Wizard
3. Select "NSW CAU Team" template
4. Customize if needed
5. All original functionality preserved

### For New Teams
1. Install extension
2. Run Setup Wizard
3. Choose appropriate template:
   - **Government Team** - Multi-department government structure
   - **Standard Business** - Generic business team
   - **Blank** - Start from scratch
4. Configure work week and features
5. Begin using immediately

### For Custom Configurations
1. Start with closest template
2. Modify in Configuration modal
3. Add/remove staff and tasks
4. Customize skills matrix
5. Enable/disable features as needed

---

## 📊 Statistics

- **Lines of Code Added**: ~1,500
- **Lines of Code Removed**: ~300 (hardcoded data)
- **New Templates**: 2
- **Updated Templates**: 1
- **Wizard Steps**: 6
- **Feature Flags**: 9
- **Template Options**: 4

---

## 🔄 Migration Guide

### From v3.3.0 to v3.4.0

**Existing Users (with saved data)**:
- No action required
- Your saved data remains intact
- Setup Wizard will NOT appear (data already exists)
- Access Configuration modal to see new features

**New Users**:
- Setup Wizard launches automatically on first run
- Follow 6-step wizard to configure
- Choose a template or start blank
- Configuration saved to Chrome storage

**Reset to Defaults**:
1. Open Configuration modal
2. Click "Re-run Setup Wizard" button
3. Wizard re-launches for fresh configuration
4. Previous data backed up automatically

---

## 🐛 Bug Fixes

- Fixed edge cases in template loading
- Improved error handling for missing configuration
- Enhanced validation for empty staff/task arrays
- Better diagnostics for template-based setups

---

## 🚀 Performance

- Faster initial load (no hardcoded arrays to parse)
- Wizard loads only on first run
- Template loading is async and non-blocking
- Improved memory efficiency

---

## 📝 Known Issues

None reported.

---

## 🔮 Future Enhancements

- Custom template creator in wizard
- Template import from file
- Template sharing/export
- Wizard progress save (resume later)
- Template marketplace
- Multi-language support

---

## 🙏 Acknowledgments

This release makes the Leave Roster extension truly universal and configurable, while preserving all the NSW CAU-specific functionality in a loadable template. Special thanks to the original team for the comprehensive requirements that made this architecture possible.

---

## 📦 Installation

1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extension folder
6. Extension icon appears in toolbar
7. Click icon to launch Setup Wizard

---

## 🆘 Support

For issues or questions, please refer to:
- `CONFIGURATION.md` - Configuration guide
- `TESTING_GUIDE.md` - Testing procedures
- `QUICK_REFERENCE.md` - Quick reference
- `docs/SETUP_WIZARD_GUIDE.md` - Wizard documentation

---

**Version**: 3.4.0  
**Release Date**: 2025  
**Compatibility**: Chrome 88+  
**License**: Internal Use  
