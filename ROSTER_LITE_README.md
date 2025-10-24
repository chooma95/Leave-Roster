# Phone Shift Roster - Lite Version

A simplified, standalone 6-week phone shift roster generator focused purely on early/late shift assignment.

## 🎯 Features

### Core Functionality
- **6-Week Rotation System** - Automatically generates a complete 6-week shift roster
- **Early & Late Shifts** - Assigns both shifts for Monday-Friday
- **Fair Distribution** - Balances workload across all staff members
- **Flexible Work Days** - Each person can work different days of the week
- **Week Off Option** - Staff can have one complete week with no shifts
- **Shift Limits** - Maximum 1 early shift + 1 late shift per person per week
- **Consistency Priority** - Tries to keep same shift days for each person across weeks

### Smart Assignment Algorithm

The roster generator uses an intelligent algorithm that:

1. **Respects Work Days** - Only assigns shifts on days people actually work
2. **Honors Week Off** - Skips assignments for selected off-week
3. **Enforces Limits** - Ensures max 1 early + 1 late per person per week
4. **Balances Workload** - Distributes shifts evenly across all staff
5. **Maintains Consistency** - Prefers same day of week for each person's shifts
6. **Prevents Conflicts** - Never assigns same person to both shifts on same day

## 📋 How to Use

### 1. Add Staff Members

For each staff member, configure:
- **Name** - Their display name
- **Work Days** - Which days they work (Mon-Fri)
- **Week Off** - Optional: Select one week (1-6) where they get no shifts

Click "Add Staff Member" to add them to the roster.

### 2. Generate Roster

Once you have at least 2 staff members:
1. Click "Generate Roster" button
2. Algorithm automatically assigns shifts based on constraints
3. View the complete 6-week schedule

### 3. Review & Export

- **View** - See all shifts displayed in week-by-week grid
- **Early Shifts** - Yellow background with sun icon
- **Late Shifts** - Blue background with moon icon
- **Export** - Click "Export" to download CSV file

## 🔧 Technical Details

### Shift Assignment Rules

1. **Per Week Limits**
   - Each person: Maximum 1 early shift
   - Each person: Maximum 1 late shift
   - Total: 2 shifts maximum per person per week

2. **Consistency**
   - Algorithm tries to assign same day of week across the 6 weeks
   - Example: If Gus gets Monday early in Week 1, he'll likely get Monday early in other weeks too

3. **Availability**
   - Only assigns shifts on configured work days
   - Respects week-off selections
   - Never double-books (same person on both shifts same day)

4. **Fairness**
   - Balances total shift count across all staff
   - Equalizes early vs late shift distribution

### Scoring System

The algorithm scores candidates for each shift based on:
- **-1000**: Already has this shift type this week (DISQUALIFIED)
- **-10 per shift**: Current total shifts (prefer less busy staff)
- **+50**: Preferred day match (consistency bonus)
- **+5**: Early/late balance bonus

## 📊 Example Configuration

### Scenario: 5 Staff Members

| Staff  | Work Days         | Week Off |
|--------|-------------------|----------|
| Gus    | Mon-Fri           | None     |
| Kellie | Mon, Tue, Thu, Fri| Week 3   |
| Blake  | Mon-Fri           | Week 2   |
| Ash    | Wed-Fri           | None     |
| Di     | Mon-Wed           | Week 5   |

### Generated Result

- **Week 1**: All staff available, shifts distributed evenly
- **Week 2**: Blake has week off, remaining 4 staff cover
- **Week 3**: Kellie has week off, remaining 4 staff cover
- **Week 5**: Di has week off, remaining 4 staff cover
- **Consistency**: Gus might get Monday early every week, Ash might get Thursday late, etc.

## 💾 Data Storage

- **localStorage** - All data saved in browser
- **Persistent** - Staff list and last generated roster preserved
- **Export** - Download CSV backup anytime

## 🚀 Usage Tips

### Best Practices

1. **Minimum Staff**: Use at least 3-4 staff for good coverage
2. **Balanced Work Days**: Mix of full-time and part-time works well
3. **Stagger Week Offs**: Don't give multiple people same week off
4. **Regenerate**: Can regenerate anytime for different distribution
5. **Export Often**: Save CSV backups of generated rosters

### Common Issues

**"No staff available"**
- Ensure enough staff work each day
- Check week-off settings don't overlap too much
- At least 2 people should be available per day

**"Need at least 2 staff"**
- Add more staff members before generating
- Minimum 2 required for early + late coverage

**Uneven distribution**
- With small teams, perfect balance isn't always possible
- Week-off settings can cause some imbalance
- Part-time staff (fewer work days) will naturally get fewer shifts

## 📁 Files

- `roster-lite.html` - Main HTML interface
- `roster-lite.js` - JavaScript logic and algorithm
- `ROSTER_LITE_README.md` - This documentation

## 🔗 Standalone

This lite version is **completely standalone**:
- No dependencies on main Leave Roster system
- Self-contained HTML + JavaScript
- Can be used independently
- Simply open `roster-lite.html` in any modern browser

## 🎨 Interface

- **Modern Design** - Clean, professional Material Design interface
- **Color Coded** - Easy to distinguish early (yellow) vs late (blue) shifts
- **Responsive** - Works on desktop and tablet
- **Real-time** - Instant updates as you add staff
- **Visual Stats** - Quick overview of staff count and configuration

## ⚡ Performance

- **Instant Generation** - Creates 6-week roster in milliseconds
- **No Server** - All processing happens in browser
- **Lightweight** - Single HTML file + JavaScript
- **Fast Export** - CSV generation is immediate

## 🔐 Privacy

- **No Server Communication** - Everything stays in your browser
- **Local Storage Only** - Data never leaves your device
- **No Account Required** - Use immediately, no sign-up

---

## Quick Start

1. Open `roster-lite.html` in web browser
2. Add staff members with their work days
3. Click "Generate Roster"
4. Done! 6-week shift roster ready

**Simple. Fast. Effective.**
