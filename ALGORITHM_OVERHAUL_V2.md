# Phone Shift Roster Algorithm Overhaul V2

## Issues Identified

Based on the console output from the November 2025 roster generation:

1. **Excessive shifts in Week 1**: Ben and Cheryl were assigned 4 shifts each in Week 1
2. **Uneven weekly distribution**: Some staff worked 4 shifts one week and 0-1 the next
3. **Week-off system ineffective**: Staff with week-offs still worked too many shifts in other weeks
4. **Scoring imbalance**: Weekly balance penalties (-5,000 to -15,000) were easily overridden by quota scores (+180,000+)

## Root Cause

The scoring algorithm prioritized filling individual quota gaps (TIER 1 at 10,000 points) over weekly distribution limits (TIER 4 at only 3,000 points for zero shifts, -5,000 for 2 shifts). This meant that someone with a large quota gap could easily get assigned a 3rd or 4th shift in the same week despite penalties.

**Example from logs:**
- Cheryl at 3 shifts/week still scored 118,558 points (quota bonus of ~126,658 minus weekly penalty of -5,000)
- Ben at 2 shifts/week scored 159,658 points to get assigned early shift (needed for balance)

## Solution Implemented

### 1. Tier Reordering and Weight Adjustment

**NEW HIERARCHY:**
```
TIER 1 (200,000 points): Weekly Balance - ABSOLUTE MAX 2 shifts/week
TIER 2 (10,000 points):  Quota-based fairness - proportional to availability
TIER 3 (3,000 points):   Early/late balance - ~50/50 split
TIER 4 (100 points):     Consecutive pattern avoidance
TIER 5 (10 points):      Day consistency
```

### 2. Massive Weekly Balance Scores

```javascript
if (weeklyTotal === 0) {
    weeklyScore = +200,000;  // Maximum priority (was +3,000)
} else if (weeklyTotal === 1) {
    weeklyScore = +100,000;  // Still very good (was +1,000)
} else if (weeklyTotal === 2) {
    weeklyScore = -500,000;  // ABSOLUTE LIMIT (was -5,000)
} else {
    weeklyScore = -999,999;  // Should never happen
}
```

### 3. Key Improvements

**Before:** Quota gap of 4.6 shifts = +186,408 points (could override -5,000 weekly penalty)
**After:** Weekly penalty of -500,000 cannot be overridden by any quota bonus

**Result:** 
- Person with 0 shifts this week gets +200,000 base score
- Person with 2 shifts this week gets -500,000 penalty (cannot be overcome)
- Forces algorithm to distribute across weeks evenly

## Expected Outcomes

### Weekly Distribution
- **Target**: Max 2 shifts per person per week (strictly enforced)
- **Acceptable**: Some variation (1-2 shifts) across weeks based on availability
- **Violation**: 3+ shifts in any week (should be impossible now)

### Fairness Indicators
```
✓✓ = Max 2 shifts/week consistently (ideal)
⚡  = Max 2 shifts/week with variation (acceptable)
⚠️  = 3+ shifts in any week (violation - should not happen)
```

### Example Target Distribution (4-week period, 10 staff)
Instead of:
```
Week 1: [4, 4, 3, 3, 2, 2, 1, 1, 0, 0]  ❌ Two people with 4 shifts
Week 2: [3, 3, 3, 2, 2, 2, 2, 1, 1, 1]
Week 3: [3, 3, 2, 2, 2, 2, 2, 2, 0, 0]
Week 4: [3, 3, 2, 2, 2, 2, 2, 1, 1, 1]
```

Should now produce:
```
Week 1: [2, 2, 2, 2, 2, 2, 2, 2, 1, 1]  ✅ Max 2 shifts per person
Week 2: [2, 2, 2, 2, 2, 2, 2, 2, 2, 0]
Week 3: [2, 2, 2, 2, 2, 2, 2, 2, 2, 0]
Week 4: [2, 2, 2, 2, 2, 2, 2, 2, 1, 1]
```

## Testing Instructions

1. Open `phone-shift-roster.html` in browser
2. Add same 10 staff members as before
3. Generate roster for November 2025 (4 weeks)
4. Check console output for:
   - Weekly summaries (should show max 2 shifts per person each week)
   - Phase 4 Fairness Analysis
   - Weekly Distribution Analysis (all staff should show ✓✓ or ⚡, no ⚠️)

## Technical Details

### Score Magnitude Comparison

| Scenario | Old Score Range | New Score Range | Difference |
|----------|----------------|-----------------|------------|
| 0 shifts this week | +3,000 | +200,000 | 67x increase |
| 1 shift this week | +1,000 | +100,000 | 100x increase |
| 2 shifts this week | -5,000 | -500,000 | 100x increase |
| Quota gap of 4.6 | +186,408 | +186,408 | Same |

**Impact:** Weekly balance now dominates decision-making, ensuring quota gaps can never override the 2-shift weekly limit.

### Algorithm Flow

1. **Hard Constraints Check** (eliminates candidates completely)
   - Cannot work both shifts same day
   - Cannot work opposite shifts on consecutive days
   - *(Note: 3+ shift limit enforced via penalty, not hard constraint)*

2. **Weekly Balance Scoring** (dominates selection)
   - Heavily rewards 0-1 shifts this week
   - Massively penalizes 2+ shifts this week

3. **Quota Fairness** (secondary concern)
   - Ensures everyone reaches their proportional target
   - Only applies when multiple candidates have similar weekly totals

4. **Balance & Variety** (fine-tuning)
   - Early/late split optimization
   - Pattern variety preferences

## Code Changes

### File: `phone-shift-roster.html`

**Lines ~2853-2869:** Updated comment block with new tier priorities

**Lines ~3015-3036:** Completely rewrote weekly balance scoring:
- Changed from +3,000/+1,000/-5,000/-15,000/-30,000
- To +200,000/+100,000/-500,000/-999,999
- Moved to dominant position in scoring

**Lines ~3313-3322:** Updated spread status criteria:
- ✓✓ = max 2 shifts AND avg ≤ 2.1/week (was just max 2)
- ⚡ = max 2 shifts with variation (new category)
- ⚠️ = 3+ shifts in any week (was 4+)

**Lines ~3330-3331:** Updated indicator descriptions

## Version History

- **V1 (Original)**: Quota-first approach, weekly balance as soft constraint
- **V2 (This Update)**: Weekly balance-first approach, strict 2-shift limit

---

**Date**: 2025-10-23  
**Status**: Ready for Testing  
**Next Steps**: Generate test roster and verify weekly distribution improvements
