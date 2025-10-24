# Testing Guide - Configuration System v3.2.0

This guide provides step-by-step instructions for testing the new configuration system.

---

## Prerequisites

1. Chrome browser (version 88+)
2. Extension loaded in Chrome (unpacked or via developer mode)
3. Chrome DevTools open for console monitoring

---

## Test Suite 1: Basic Functionality

### Test 1.1: Extension Loads Successfully
**Expected**: Extension loads without errors

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the extension folder
4. Open the extension by clicking the extension icon
5. **Verify**: 
   - No console errors
   - Extension UI appears
   - Current week displays correctly

**Pass Criteria**: ✅ Extension loads, UI renders, no console errors

---

### Test 1.2: Existing Data Preserved
**Expected**: Backward compatibility maintained

1. If you have existing data, open the extension
2. **Verify**:
   - All previous assignments still visible
   - Staff list unchanged
   - Task list unchanged
   - Leave roster intact
   - Phone coverage preserved

**Pass Criteria**: ✅ All existing data loads correctly

---

## Test Suite 2: Configuration Modal

### Test 2.1: Access Configuration Modal
**Expected**: Configuration modal opens from Manage button

1. Click the "Manage" button in the header
2. In the manage modal, click "Configuration" button
3. **Verify**:
   - Configuration modal opens
   - Four tabs visible: Organization, Work Week, Features, Display
   - Modal has proper styling

**Pass Criteria**: ✅ Configuration modal opens with all tabs

---

### Test 2.2: Organization Tab
**Expected**: Organization settings can be viewed and edited

1. Open Configuration modal
2. Click "Organization" tab
3. **Verify**:
   - Organization name field shows current value
   - Timezone dropdown populated
   - Region field editable
4. Change organization name to "Test Team"
5. Click "Save Configuration"
6. **Verify**: Success notification appears

**Pass Criteria**: ✅ Can view and save organization settings

---

### Test 2.3: Work Week Tab
**Expected**: Work week settings configurable

1. Open Configuration modal
2. Click "Work Week" tab
3. **Verify**:
   - Week structure displayed (Tue-Mon by default)
   - Start day dropdown shows "tuesday"
   - Working days checkboxes reflect current config
4. Try changing start day (view only in current implementation)
5. Note current settings

**Pass Criteria**: ✅ Work week settings displayed correctly

---

### Test 2.4: Features Tab
**Expected**: Feature toggles work correctly

1. Open Configuration modal
2. Click "Features" tab
3. **Verify**:
   - 9 feature toggle switches visible
   - Each has icon, label, and description
   - All toggles show current state
4. Note which features are enabled
5. Close modal without saving

**Pass Criteria**: ✅ All feature toggles visible and interactive

---

### Test 2.5: Display Tab
**Expected**: Display preferences configurable

1. Open Configuration modal
2. Click "Display" tab
3. **Verify**:
   - Theme selector (light/dark/auto)
   - Default view selector (full/personal)
   - Compact mode toggle
4. Change theme preference
5. Click "Save Configuration"
6. **Verify**: Settings saved successfully

**Pass Criteria**: ✅ Display preferences can be changed

---

## Test Suite 3: Feature Flag Enforcement

### Test 3.1: Work on Hand (WOH) Feature
**Expected**: WOH column appears/disappears based on feature flag

1. Open Configuration modal → Features tab
2. Note current state of "Work on Hand" toggle
3. If enabled, toggle it OFF
4. Click "Save Configuration"
5. Close modal
6. **Verify**: WOH column (with dates) is now hidden
7. Open Configuration modal again
8. Toggle "Work on Hand" back ON
9. Click "Save Configuration"
10. **Verify**: WOH column reappears

**Pass Criteria**: ✅ WOH column visibility controlled by feature flag

---

### Test 3.2: Skills Matrix Feature
**Expected**: Skill levels appear/disappear based on feature flag

1. Open Configuration modal → Features tab
2. Toggle "Skills Matrix" OFF
3. Click "Save Configuration"
4. **Verify**: 
   - "Skill Level: X" text disappears from task rows
   - "Skills Matrix" button in header hidden (if in build mode)
5. Toggle "Skills Matrix" back ON
6. Click "Save Configuration"
7. **Verify**: Skill levels reappear

**Pass Criteria**: ✅ Skills matrix visibility controlled by feature flag

---

### Test 3.3: Phone Shifts Feature
**Expected**: Phone coverage row appears/disappears

1. Open Configuration modal → Features tab
2. Note: Phone shifts controlled via Work Week tab → Phone Shifts enabled
3. Open Work Week tab
4. If "Phone Shifts Enabled" is checked, uncheck it
5. Click "Save Configuration"
6. **Verify**: Phone coverage row at bottom of table disappears
7. Re-enable Phone Shifts
8. Click "Save Configuration"
9. **Verify**: Phone coverage row reappears

**Pass Criteria**: ✅ Phone coverage visibility controlled by config

---

### Test 3.4: Triage Assignments Feature
**Expected**: Triage buttons appear/disappear

1. Enter build mode (Manage → Enter Build Mode)
2. **Verify**: Triage buttons visible on category headers
3. Exit build mode
4. Open Configuration modal → Features tab
5. Toggle "Triage Assignments" OFF
6. Click "Save Configuration"
7. Enter build mode again
8. **Verify**: Triage buttons no longer appear
9. Toggle feature back ON and save

**Pass Criteria**: ✅ Triage functionality controlled by feature flag

---

### Test 3.5: Generate Shifts Button
**Expected**: Generate button visibility controlled

1. Open Configuration modal → Features tab
2. Toggle "Triage Assignments" OFF
3. Click "Save Configuration"
4. Enter build mode
5. **Verify**: "Generate Shifts" button hidden
6. Toggle "Triage Assignments" back ON
7. Click "Save Configuration"
8. **Verify**: "Generate Shifts" button appears

**Pass Criteria**: ✅ Generate button respects feature flag

---

## Test Suite 4: Data Persistence

### Test 4.1: Configuration Persists on Reload
**Expected**: Settings survive page refresh

1. Open Configuration modal
2. Change organization name to "Persistence Test"
3. Toggle 2-3 features OFF
4. Click "Save Configuration"
5. Close extension tab
6. Reopen extension
7. Open Configuration modal
8. **Verify**:
   - Organization name is "Persistence Test"
   - Features remain toggled OFF
   - All settings preserved

**Pass Criteria**: ✅ Configuration persists across reloads

---

### Test 4.2: UI Reflects Persisted Config
**Expected**: UI updates based on saved config

1. With some features disabled (from previous test)
2. Reload extension
3. **Verify**:
   - Disabled features' UI elements remain hidden
   - WOH column hidden if feature disabled
   - Phone coverage hidden if disabled
   - Skills hidden if disabled

**Pass Criteria**: ✅ UI correctly reflects persisted configuration

---

## Test Suite 5: Export/Import

### Test 5.1: Export Configuration
**Expected**: Configuration downloads as JSON

1. Open Configuration modal
2. Click "Export Configuration" button
3. **Verify**:
   - JSON file downloads
   - File named like "roster-config-YYYY-MM-DD.json"
4. Open downloaded JSON file
5. **Verify**:
   - Contains "version" field
   - Contains "organization" section
   - Contains "workWeek" section
   - Contains "features" section
   - All current settings present

**Pass Criteria**: ✅ Configuration exports correctly

---

### Test 5.2: Import Configuration (Future)
**Expected**: Configuration can be imported

Note: Import functionality is in the template loader but needs UI hookup

**Status**: ⏸️ Import UI not yet connected (future enhancement)

---

## Test Suite 6: Template System

### Test 6.1: Template Data Structure
**Expected**: Templates are properly formatted

1. Open `/templates/government-team.json` in editor
2. **Verify**:
   - Contains "name" field
   - Contains "config" section
   - Contains "sampleData" section with staff and tasks
   - JSON is valid
3. Open `/templates/standard-team.json`
4. **Verify**: Same structure

**Pass Criteria**: ✅ Both templates are valid JSON with correct structure

---

### Test 6.2: Template Application (Manual)
**Expected**: Templates can be applied via console

1. Open Chrome DevTools console
2. Run: `await app.templateLoader.loadTemplate('government-team')`
3. Run: `await app.configManager.save()`
4. Reload page
5. **Verify**:
   - Configuration reflects government team settings
   - Features match template

**Pass Criteria**: ✅ Template can be loaded programmatically

---

## Test Suite 7: Backward Compatibility

### Test 7.1: Fresh Install (No Previous Data)
**Expected**: Extension initializes with defaults

1. Clear all extension storage:
   - Open DevTools → Application → Storage
   - Clear all Chrome storage for extension
2. Reload extension
3. **Verify**:
   - Extension loads successfully
   - Default staff members present
   - Default tasks present
   - All features enabled by default

**Pass Criteria**: ✅ Fresh install works with defaults

---

### Test 7.2: Existing Installation Upgrade
**Expected**: Existing data preserved on upgrade

1. If you have existing data from v3.1.0 or earlier
2. Load v3.2.0 extension
3. **Verify**:
   - All existing assignments preserved
   - All existing staff preserved
   - All existing tasks preserved
   - Configuration system added without data loss

**Pass Criteria**: ✅ Upgrade preserves all existing data

---

## Test Suite 8: Build Mode Integration

### Test 8.1: Build Mode Password
**Expected**: Build mode still requires password

1. Click "Manage" button
2. If not in build mode, click "Enter Build Mode"
3. Enter password: "CAU"
4. **Verify**: Build mode activates
5. **Verify**: Build mode buttons appear

**Pass Criteria**: ✅ Build mode authentication works

---

### Test 8.2: Build Mode Features Respect Flags
**Expected**: Disabled features hidden even in build mode

1. Disable "Skills Matrix" and "Triage Assignments"
2. Enter build mode
3. **Verify**:
   - "Skills Matrix" button hidden
   - Triage buttons hidden
   - "Generate Shifts" button hidden
4. Re-enable features
5. **Verify**: Buttons reappear

**Pass Criteria**: ✅ Feature flags work in build mode

---

## Test Suite 9: Error Handling

### Test 9.1: Invalid Configuration Rejected
**Expected**: Validation prevents invalid configs

1. Open Chrome DevTools console
2. Try: `await app.configManager.set('workWeek.startDay', 'invalid')`
3. **Verify**: Error message or validation failure
4. Try: `await app.configManager.set('phoneShifts.rotationWeeks', -5)`
5. **Verify**: Validation prevents negative values

**Pass Criteria**: ✅ Invalid values rejected by validation

---

### Test 9.2: Graceful Degradation
**Expected**: Extension works even if ConfigManager fails

1. This is tested automatically via fallback chain
2. **Verify** in code:
   - `processLoadedData()` has fallback to DEFAULT_STAFF/TASKS
   - All feature checks use `?? true` for safety
   - Optional chaining used throughout

**Pass Criteria**: ✅ Fallbacks present in code

---

## Test Suite 10: Console Checks

### Test 10.1: No Console Errors
**Expected**: Clean console on all operations

Throughout all tests above, monitor console for:
- ❌ No errors
- ❌ No warnings (except expected ones)
- ✅ Info logs showing initialization

**Pass Criteria**: ✅ No unexpected console errors

---

### Test 10.2: Configuration Logs
**Expected**: ConfigManager logs initialization

1. Reload extension with DevTools open
2. Look for console logs:
   - "ConfigManager initialized"
   - "Loaded configuration: ..."
   - Feature flag status logs

**Pass Criteria**: ✅ Initialization logs present

---

## Quick Smoke Test (5 minutes)

For rapid validation:

1. ✅ Load extension → No errors
2. ✅ Click Manage → Configuration → Modal opens
3. ✅ Toggle 2-3 features OFF → Save
4. ✅ Verify UI updates (columns disappear)
5. ✅ Reload page → Settings persist
6. ✅ Toggle features back ON → Save
7. ✅ Export configuration → JSON downloads
8. ✅ Check console → No errors

If all 8 steps pass: **System is working correctly** ✅

---

## Regression Testing

After any code changes, run:

1. ✅ Fresh install test
2. ✅ Feature toggle test
3. ✅ Persistence test
4. ✅ Export test
5. ✅ Build mode test

---

## Known Limitations

1. **Template Selection UI** - Not yet implemented (templates loadable via console)
2. **Setup Wizard** - Not yet implemented (planned for future)
3. **Import Configuration** - Backend exists, UI not connected
4. **Holiday Provider** - Still hardcoded to NSW (future enhancement)

---

## Reporting Issues

If you encounter problems:

1. **Check Console** - Note any error messages
2. **Export Config** - Save current configuration
3. **Note Steps** - Record steps to reproduce
4. **Check Storage** - Inspect Chrome storage contents
5. **Try Reset** - Open Configuration → Reset to defaults

---

## Test Results Template

```
Date: ___________
Tester: ___________
Version: 3.2.0

Test Suite 1: Basic Functionality       [ ] PASS  [ ] FAIL
Test Suite 2: Configuration Modal       [ ] PASS  [ ] FAIL
Test Suite 3: Feature Flag Enforcement  [ ] PASS  [ ] FAIL
Test Suite 4: Data Persistence          [ ] PASS  [ ] FAIL
Test Suite 5: Export/Import             [ ] PASS  [ ] FAIL
Test Suite 6: Template System           [ ] PASS  [ ] FAIL
Test Suite 7: Backward Compatibility    [ ] PASS  [ ] FAIL
Test Suite 8: Build Mode Integration    [ ] PASS  [ ] FAIL
Test Suite 9: Error Handling            [ ] PASS  [ ] FAIL
Test Suite 10: Console Checks           [ ] PASS  [ ] FAIL

Overall Result: [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
```

---

**Happy Testing! 🧪**
