// ===== WORK ALLOCATION ROSTER BACKGROUND SERVICE WORKER =====

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: 'index.html'
  });
});

// Handle installation and updates  
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Work Allocation Roster installed');
    
    // Set default settings
    chrome.storage.local.set({
      version: '3.1.0',
      installDate: new Date().toISOString(),
      settings: {
        theme: 'light',
        notifications: true,
        autoSave: true
      }
    });
    
    console.log('Extension ready - click the extension icon to open');
  } else if (details.reason === 'update') {
    console.log('Work Allocation Roster updated to version 3.1.0');
    migrateData(details.previousVersion);
  }
});

// Data migration function
async function migrateData(previousVersion) {
  try {
    const result = await chrome.storage.local.get(['workRosterData']);
    
    if (result.workRosterData) {
      let needsMigration = false;
      const data = result.workRosterData;
      
      if (previousVersion && previousVersion.startsWith('2.')) {
        console.log('Migrating data from version 2.x to 3.x');
        
        // Migrate skills matrix to task-based structure
        if (data.skillsMatrix) {
          for (const [staffId, skills] of Object.entries(data.skillsMatrix)) {
            if (!skills.taskSkills && skills.skills) {
              const taskSkills = {};
              if (data.tasks) {
                data.tasks.forEach(task => {
                  if (task.type === 'task') {
                    const hasCategory = skills.skills.includes(task.category);
                    taskSkills[task.id] = hasCategory ? (skills.skillLevel || 1) : 0;
                  }
                });
              }
              data.skillsMatrix[staffId] = { taskSkills };
              needsMigration = true;
            }
          }
        }
        
        // Ensure all staff have workDays
        if (data.staff) {
          data.staff = data.staff.map(s => ({
            ...s,
            workDays: s.workDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }));
          needsMigration = true;
        }
        
        // Initialize new data structures if missing
        if (!data.priorityTasks) {
          data.priorityTasks = {};
          needsMigration = true;
        }
        
        if (!data.shiftRotations) {
          data.shiftRotations = {};
          needsMigration = true;
        }
        
        if (!data.shiftSwaps) {
          data.shiftSwaps = {};
          needsMigration = true;
        }
        
        if (!data.leaveRoster) {
          data.leaveRoster = {};
          needsMigration = true;
        }
        
        if (needsMigration) {
          data.version = '3.1.0';
          data.migrationDate = new Date().toISOString();
          await chrome.storage.local.set({ workRosterData: data });
          console.log('Data migration completed successfully');
        }
      }
    }
  } catch (error) {
    console.error('Error during data migration:', error);
  }
}

// Handle storage quota warnings
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.workRosterData) {
    checkStorageQuota();
  }
});

async function checkStorageQuota() {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;
    const usagePercent = (usage / quota) * 100;
    
    if (usagePercent > 80) {
      console.warn(`Storage usage high: ${usagePercent.toFixed(1)}% (${usage}/${quota} bytes)`);
      
      if (usagePercent > 90) {
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        chrome.action.setTitle({ 
          title: 'Work Allocation Roster - Storage Almost Full' 
        });
      }
    } else {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'Work Allocation Roster' });
    }
  } catch (error) {
    console.error('Error checking storage quota:', error);
  }
}

// Enhanced cleanup function with all data structures
function cleanupOldData() {
  chrome.storage.local.get(['workRosterData'], (result) => {
    if (result.workRosterData) {
      const data = result.workRosterData;
      let cleaned = false;
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoffDate = sixMonthsAgo.toISOString().split('T')[0];
      
      // Clean allocations
      if (data.allocations) {
        const oldDates = Object.keys(data.allocations).filter(date => date < cutoffDate);
        if (oldDates.length > 0) {
          oldDates.forEach(date => delete data.allocations[date]);
          cleaned = true;
          console.log(`Cleaned up ${oldDates.length} old allocation entries`);
        }
      }
      
      // Clean phone roster
      if (data.phoneRoster) {
        const oldDates = Object.keys(data.phoneRoster).filter(date => date < cutoffDate);
        if (oldDates.length > 0) {
          oldDates.forEach(date => delete data.phoneRoster[date]);
          cleaned = true;
          console.log(`Cleaned up ${oldDates.length} old phone roster entries`);
        }
      }
      
      // Clean triage assignments
      if (data.triageAssignments) {
        const oldDates = Object.keys(data.triageAssignments).filter(date => date < cutoffDate);
        if (oldDates.length > 0) {
          oldDates.forEach(date => delete data.triageAssignments[date]);
          cleaned = true;
          console.log(`Cleaned up ${oldDates.length} old triage assignment entries`);
        }
      }
      
      // Clean leave roster
      if (data.leaveRoster) {
        const oldDates = Object.keys(data.leaveRoster).filter(date => date < cutoffDate);
        if (oldDates.length > 0) {
          oldDates.forEach(date => delete data.leaveRoster[date]);
          cleaned = true;
          console.log(`Cleaned up ${oldDates.length} old leave roster entries`);
        }
      }
      
      // Clean shift swaps
      if (data.shiftSwaps) {
        const oldDates = Object.keys(data.shiftSwaps).filter(date => date < cutoffDate);
        if (oldDates.length > 0) {
          oldDates.forEach(date => delete data.shiftSwaps[date]);
          cleaned = true;
          console.log(`Cleaned up ${oldDates.length} old shift swap entries`);
        }
      }
      
      if (cleaned) {
        data.lastCleanup = new Date().toISOString();
        chrome.storage.local.set({ workRosterData: data });
        console.log('Data cleanup completed');
      }
    }
  });
}

// Run cleanup check once per day
function setupPeriodicCleanup() {
  chrome.storage.local.get(['lastCleanupCheck'], (result) => {
    const now = Date.now();
    const lastCheck = result.lastCleanupCheck || 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    if (now - lastCheck > oneDayMs) {
      cleanupOldData();
      chrome.storage.local.set({ lastCleanupCheck: now });
    }
  });
}

// Run cleanup check on startup
setupPeriodicCleanup();

// Set up alarm for periodic cleanup
chrome.alarms.create('cleanup', { periodInMinutes: 1440 }); // Every 24 hours

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    setupPeriodicCleanup();
  }
});

// Handle messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStorageInfo':
      getStorageInfo().then(sendResponse);
      return true;
      
    case 'exportData':
      exportData().then(sendResponse);
      return true;
      
    case 'clearOldData':
      cleanupOldData();
      sendResponse({ success: true });
      break;
      
    case 'checkHealth':
      checkSystemHealth().then(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

async function getStorageInfo() {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES;
    
    return {
      usage,
      quota,
      usagePercent: (usage / quota) * 100,
      available: quota - usage
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function exportData() {
  try {
    const result = await chrome.storage.local.get(['workRosterData', 'userProfile', 'settings']);
    return {
      data: result,
      timestamp: new Date().toISOString(),
      version: '3.1.0'
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkSystemHealth() {
  try {
    const storage = await getStorageInfo();
    const data = await chrome.storage.local.get(['workRosterData']);
    const rosterData = data.workRosterData || {};
    
    const health = {
      storage: {
        healthy: storage.usagePercent < 80,
        usage: storage.usage,
        quota: storage.quota,
        percent: storage.usagePercent
      },
      data: {
        hasStaff: (rosterData.staff || []).length > 0,
        hasTasks: (rosterData.tasks || []).length > 0,
        staffCount: (rosterData.staff || []).length,
        taskCount: (rosterData.tasks || []).length,
        allocationDays: Object.keys(rosterData.allocations || {}).length,
        phoneRosterDays: Object.keys(rosterData.phoneRoster || {}).length
      },
      version: rosterData.version || 'unknown',
      lastModified: rosterData.lastModified || 'unknown'
    };
    
    health.overall = health.storage.healthy && health.data.hasStaff && health.data.hasTasks;
    
    return health;
  } catch (error) {
    return { error: error.message, overall: false };
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
});

console.log('Work Allocation Roster background service worker loaded');
console.log('Version: 3.1.0');
console.log('Features: Data management, storage monitoring, cleanup, health checks');