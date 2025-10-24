# Leave-Roster v3.2.0 - Chrome Extension

## 📦 Installation Instructions

### **Option 1: Load Unpacked (Development)**

1. **Extract the ZIP file**
   - Unzip `leave-roster-v3.2.0.zip` to a folder on your computer

2. **Open Chrome Extensions**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder where you extracted the files
   - The extension should now appear in your extensions list

4. **Launch the Extension**
   - Click the extension icon in Chrome toolbar
   - Or navigate to a new tab and click the extension

### **Option 2: Package as CRX (Production)**

1. **Create a CRX package**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Pack extension"
   - Select the extension folder
   - Create a private key (save it securely)
   - Chrome will generate a `.crx` file

2. **Install the CRX**
   - Drag and drop the `.crx` file onto `chrome://extensions/`
   - Click "Add extension" when prompted

---

## 📋 What's Included

This package contains:

### **Core Extension Files**
- `manifest.json` - Extension configuration
- `index.html` - Main application UI
- `app.js` - Main application logic
- `ui.js` - UI rendering
- `modals.js` - Modal dialogs
- `managers.js` - Business logic managers
- `utils.js` - Utility functions
- `config.js` - Base configuration
- `conflicts.js` - Conflict detection
- `assignments.js` - Assignment logic
- `background.js` - Service worker
- `tailwindcss.js` - Tailwind CSS library

### **Configuration System** (NEW in v3.2.0)
- `config/schema.js` - Configuration schema
- `core/config-manager.js` - Configuration management
- `core/feature-flags.js` - Feature flag system
- `core/template-loader.js` - Template loader
- `templates/government-team.json` - NSW Government preset
- `templates/standard-team.json` - Standard business preset

### **Styling**
- `css/base.css` - Base styles
- `css/components.css` - UI components
- `css/layout.css` - Layout styles
- `css/table.css` - Table styles
- `css/themes.css` - Theme system
- `css/utilities.css` - Utility classes
- `css/phone-shifts.css` - Phone shift styles

### **Documentation**
- `README_CONFIG.md` - Configuration overview
- `CONFIGURATION.md` - Complete configuration guide
- `TESTING_GUIDE.md` - Testing procedures
- `QUICK_REFERENCE.md` - Developer reference
- `IMPLEMENTATION_SUMMARY.md` - Technical details
- `RELEASE_NOTES.md` - What's new in v3.2.0
- `FINAL_STATUS.md` - Project completion status

### **Tools**
- `verify-config.js` - Configuration verification script

---

## ✨ What's New in v3.2.0

### **Configuration System**
- ✅ Full configuration management
- ✅ 9 toggleable feature flags
- ✅ Team templates (Government & Standard)
- ✅ Export/import configurations
- ✅ User-friendly settings UI

### **Feature Flags**
Toggle any of these features on/off:
- Triage Assignments
- Skills Matrix
- Work on Hand (WOH)
- Leave Tracking
- Conflict Detection
- Month Locking
- Shift Swaps
- Report Generation
- Build Mode

### **Bug Fixes**
- Fixed week structure calculation bug
- Resolved duplicate imports

---

## 🚀 Quick Start

1. **Install the extension** (see instructions above)

2. **Access Configuration**
   - Click "Manage" button in the header
   - Click "Configuration" to open settings

3. **Customize Your Setup**
   - **Organization Tab**: Set team name, timezone
   - **Work Week Tab**: Configure work days
   - **Features Tab**: Toggle 9 features on/off
   - **Display Tab**: Set theme and view preferences

4. **Save Your Configuration**
   - Click "Save Configuration"
   - Export configuration as backup

---

## 📚 Documentation

All documentation is included in the package:

1. **Start Here**: `README_CONFIG.md`
2. **Configuration Guide**: `CONFIGURATION.md`
3. **Testing Guide**: `TESTING_GUIDE.md`
4. **Developer Reference**: `QUICK_REFERENCE.md`
5. **Release Notes**: `RELEASE_NOTES.md`

---

## 🧪 Verification

To verify the installation:

1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Copy/paste contents of `verify-config.js`
4. Run the verification script
5. Check for ✅ marks indicating success

---

## ⚙️ System Requirements

- **Browser**: Chrome 88 or later
- **Permissions**: Storage, Unlimited Storage, Alarms
- **Platform**: Windows, macOS, Linux, Chrome OS

---

## 🔧 Configuration

The extension comes pre-configured with sensible defaults:
- Tuesday-Monday work week (NSW Government standard)
- Phone shift coverage (6-week rotation)
- SLA tracking (14-day default)
- All features enabled

You can customize everything via the Configuration modal.

---

## 📞 Support

### **Getting Help**
1. Check the documentation files included in the package
2. Review `TESTING_GUIDE.md` for troubleshooting
3. Run `verify-config.js` for diagnostics

### **Known Issues**
None! This release is stable and production-ready.

---

## 🔄 Upgrading from v3.1.0

**No action required!**

The upgrade is automatic and seamless:
- All your existing data is preserved
- No manual migration needed
- Configuration system adds new features
- Everything works exactly as before

---

## 📊 File Structure

```
leave-roster-v3.2.0/
├── manifest.json               # Extension manifest
├── index.html                  # Main UI
├── app.js                      # Main application
├── ui.js                       # UI rendering
├── modals.js                   # Modal dialogs
├── config.js                   # Base configuration
├── utils.js                    # Utilities
├── managers.js                 # Business logic
├── conflicts.js                # Conflict detection
├── assignments.js              # Assignment logic
├── background.js               # Service worker
├── tailwindcss.js             # Tailwind CSS
│
├── config/
│   └── schema.js              # Configuration schema
│
├── core/
│   ├── config-manager.js      # Configuration manager
│   ├── feature-flags.js       # Feature flags
│   └── template-loader.js     # Template loader
│
├── templates/
│   ├── government-team.json   # NSW Government preset
│   └── standard-team.json     # Standard business preset
│
├── css/
│   ├── base.css               # Base styles
│   ├── components.css         # Components
│   ├── layout.css             # Layout
│   ├── table.css              # Tables
│   ├── themes.css             # Themes
│   ├── utilities.css          # Utilities
│   └── phone-shifts.css       # Phone shifts
│
└── Documentation files (.md)
```

---

## 🎯 Key Features

- ✅ Weekly work allocation management
- ✅ Phone shift rotation (6-week cycle)
- ✅ Leave roster integration
- ✅ Skills matrix and task assignments
- ✅ Conflict detection
- ✅ NSW public holiday support
- ✅ Work on Hand (WOH) tracking
- ✅ SLA monitoring
- ✅ Build mode with password protection
- ✅ Full configuration system
- ✅ Feature flags for customization
- ✅ Export/import functionality
- ✅ Light/dark themes

---

## 🔒 Security

- Build mode requires password authentication
- All data stored locally in Chrome storage
- No external network calls
- Sandboxed execution environment

---

## 📝 Version Information

- **Version**: 3.2.0
- **Release Date**: October 20, 2024
- **Manifest Version**: 3
- **Minimum Chrome Version**: 88

---

## 🎉 Enjoy Your Configurable Roster System!

The extension is ready to use immediately after installation. Explore the configuration options to customize it for your team's needs.

For detailed information, see the documentation files included in this package.

---

**Built with care to make work allocation simple, flexible, and efficient.**
