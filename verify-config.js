// ===== CONFIGURATION SYSTEM VERIFICATION SCRIPT =====
// Run this in Chrome DevTools Console to verify the configuration system

console.log('🧪 Starting Configuration System Verification...\n');

// Test 1: Check if ConfigManager is initialized
console.log('Test 1: ConfigManager Initialization');
if (app.configManager && app.configManager.config) {
    console.log('✅ ConfigManager is initialized');
    console.log('   Config version:', app.configManager.config.version);
} else {
    console.error('❌ ConfigManager not initialized');
}

// Test 2: Check FeatureFlags
console.log('\nTest 2: FeatureFlags System');
if (app.featureFlags) {
    console.log('✅ FeatureFlags is initialized');
    const features = app.configManager.get('features');
    console.log('   Available features:', Object.keys(features).length);
    console.log('   Feature states:');
    Object.entries(features).forEach(([name, enabled]) => {
        console.log(`      ${enabled ? '✓' : '✗'} ${name}`);
    });
} else {
    console.error('❌ FeatureFlags not initialized');
}

// Test 3: Check TemplateLoader
console.log('\nTest 3: TemplateLoader System');
if (app.templateLoader) {
    console.log('✅ TemplateLoader is initialized');
    const templates = app.templateLoader.listTemplates();
    console.log('   Available templates:', templates.length);
    templates.forEach(t => console.log(`      - ${t}`));
} else {
    console.error('❌ TemplateLoader not initialized');
}

// Test 4: Test Configuration Access
console.log('\nTest 4: Configuration Access');
try {
    const orgName = app.configManager.get('organization.name');
    const startDay = app.configManager.get('workWeek.startDay');
    const phoneEnabled = app.configManager.get('phoneShifts.enabled');
    
    console.log('✅ Configuration access working');
    console.log(`   Organization: ${orgName}`);
    console.log(`   Week starts: ${startDay}`);
    console.log(`   Phone shifts: ${phoneEnabled ? 'enabled' : 'disabled'}`);
} catch (error) {
    console.error('❌ Configuration access failed:', error);
}

// Test 5: Test Feature Flag Checks
console.log('\nTest 5: Feature Flag Checks');
try {
    const hasSkills = app.featureFlags.isEnabled('skillsMatrix');
    const hasWOH = app.featureFlags.isEnabled('workOnHand');
    const hasTriage = app.featureFlags.isEnabled('triageAssignments');
    
    console.log('✅ Feature flag checks working');
    console.log(`   Skills Matrix: ${hasSkills ? 'enabled' : 'disabled'}`);
    console.log(`   Work on Hand: ${hasWOH ? 'enabled' : 'disabled'}`);
    console.log(`   Triage: ${hasTriage ? 'enabled' : 'disabled'}`);
} catch (error) {
    console.error('❌ Feature flag checks failed:', error);
}

// Test 6: Test Configuration Export
console.log('\nTest 6: Configuration Export');
try {
    const exported = app.configManager.exportConfig();
    console.log('✅ Configuration export working');
    console.log(`   Exported ${Object.keys(exported).length} top-level keys`);
    console.log('   Keys:', Object.keys(exported).join(', '));
} catch (error) {
    console.error('❌ Configuration export failed:', error);
}

// Test 7: Test Data Loading
console.log('\nTest 7: Data Loading');
if (app.state) {
    console.log('✅ Application state loaded');
    console.log(`   Staff members: ${app.state.staff?.length || 0}`);
    console.log(`   Tasks: ${app.state.tasks?.filter(t => t.type === 'task').length || 0}`);
    console.log(`   Build mode: ${app.state.buildMode ? 'active' : 'inactive'}`);
} else {
    console.error('❌ Application state not loaded');
}

// Test 8: Test UI Feature Enforcement
console.log('\nTest 8: UI Feature Enforcement');
try {
    const skillsBtn = document.getElementById('skills-matrix-btn');
    const wohHeader = document.querySelector('.woh-header');
    const phoneRow = document.querySelector('.phone-coverage-row');
    
    console.log('✅ UI elements check');
    console.log(`   Skills button: ${skillsBtn ? (skillsBtn.style.display === 'none' ? 'hidden' : 'visible') : 'not found'}`);
    console.log(`   WOH header: ${wohHeader ? 'found' : 'not found'}`);
    console.log(`   Phone row: ${phoneRow ? 'found' : 'not found'}`);
} catch (error) {
    console.error('❌ UI elements check failed:', error);
}

// Test 9: Test Storage
console.log('\nTest 9: Chrome Storage Check');
chrome.storage.local.get(['rosterConfig'], (result) => {
    if (result.rosterConfig) {
        console.log('✅ Configuration stored in Chrome storage');
        console.log(`   Version: ${result.rosterConfig.version}`);
        console.log(`   Size: ~${JSON.stringify(result.rosterConfig).length} bytes`);
    } else {
        console.warn('⚠️ No configuration in Chrome storage (may be first run)');
    }
});

// Test 10: Test Validation
console.log('\nTest 10: Configuration Validation');
try {
    const schema = ConfigSchema;
    console.log('✅ Schema accessible');
    console.log(`   Schema sections: ${Object.keys(schema).length}`);
    console.log('   Sections:', Object.keys(schema).join(', '));
} catch (error) {
    console.error('❌ Schema access failed:', error);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));
console.log('Run the tests above and verify all show ✅');
console.log('\nIf any tests show ❌, check:');
console.log('1. Console for error messages');
console.log('2. That extension loaded successfully');
console.log('3. That all files are present');
console.log('\nFor detailed testing, see TESTING_GUIDE.md');
console.log('='.repeat(50) + '\n');

// Quick Actions
console.log('📝 QUICK ACTIONS:\n');
console.log('// View current configuration');
console.log('app.configManager.config\n');
console.log('// Get specific value');
console.log('app.configManager.get("organization.name")\n');
console.log('// Check feature');
console.log('app.featureFlags.isEnabled("skillsMatrix")\n');
console.log('// List templates');
console.log('app.templateLoader.listTemplates()\n');
console.log('// Export configuration');
console.log('app.configManager.exportConfig()\n');
console.log('// Toggle feature (example)');
console.log('app.configManager.set("features.skillsMatrix", false)');
console.log('await app.configManager.save()');
console.log('app.uiManager.render()\n');
console.log('// Load template (example)');
console.log('await app.templateLoader.loadTemplate("government-team")');
console.log('await app.configManager.save()');
console.log('location.reload()\n');

console.log('✨ Verification script complete!');
