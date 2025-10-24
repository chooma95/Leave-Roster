# Early/Late Imbalance Fix - October 2025

## Issue Identified

From the October 2025 roster generation, two staff members showed significant early/late imbalances:
- **Angela**: 3e/6l (33% early / 67% late) = -3 difference
- **Cheryl**: 3e/6l (33% early / 67% late) = -3 difference

## Root Cause

The algorithm's **Priority 1: Critical Imbalance Correction** had a threshold of:
- Part-time staff: ±2 shifts
- Full-time staff: ±3 shifts

This meant Angela and Cheryl's -3 imbalance was **exactly at the boundary** and not triggering priority correction consistently.

## Fix Applied

**Changed threshold from 3.0 to 2.5 for full-time staff**

```javascript
// BEFORE
const aThreshold = mA.isPartTime ? 2 : 3;

// AFTER  
const aThreshold = mA.isPartTime ? 2 : 2.5;
```

### Why 2.5?

A threshold of **2.5** means:
- Staff with **-3 or worse** (e.g., 2e/5l, 3e/6l) will trigger priority correction
- Staff with **-2** (e.g., 3e/5l) won't trigger critical priority but will get moderate priority
- Catches imbalances **earlier** before they become severe

## Expected Impact

### Immediate
- When Angela or Cheryl have -3 imbalance, they'll get **highest priority** for early shifts
- Should prevent them from accumulating more late shifts when already imbalanced

### Over 4-Week Period
With the fix, expected balance distribution should improve to:
- **Perfect balance (50/50)**: 2-3 staff (vs 1 currently)
- **Excellent balance (±1)**: 6-7 staff (vs 6 currently)  
- **Good balance (±2)**: 1-2 staff (vs 1 currently)
- **Needs review (±3+)**: 0-1 staff (vs 2 currently) ✅ **IMPROVED**

## Testing Recommendation

After implementing this fix:

1. **Regenerate October 2025 roster** and compare results
2. **Look for**:
   - Angela and Cheryl's early/late ratio closer to 50/50
   - Console logs showing "CRITICAL IMBALANCE" messages when they hit -3
3. **Monitor**:
   - Total 3-shift weeks (should remain similar)
   - Overall fairness (should improve slightly)

## Trade-offs

### Pros ✅
- Catches imbalances earlier
- Better work-life balance (less skew toward one shift type)
- Still allows some natural variation (±2 is acceptable)

### Cons ⚠️
- Slightly reduces algorithm flexibility in tight scenarios
- May increase emergency mode frequency by 1-2% (negligible)
- In extreme capacity constraints, might prioritize balance over weekly cap

### Net Assessment
**Positive change** - Better aligns with fairness goals with minimal downside.

## Related Configuration

If you want to fine-tune further, key thresholds are:

```javascript
// Priority 1: Critical imbalance (HIGHEST priority)
const criticalThreshold = mA.isPartTime ? 2 : 2.5;  // ← Just changed this

// Priority 6: Moderate imbalance (MEDIUM priority)  
const moderateThreshold = mA.isPartTime ? 1 : 2;    // Unchanged
```

You could also adjust **Priority 6** (moderate threshold) from 2 → 1.5 for even tighter balance, but this might be too aggressive.

## Version History

- **v3.4.0** (Oct 2025): Initial issue identified from October roster
- **v3.4.1** (Oct 2025): Applied threshold change from 3.0 → 2.5
- **Next**: Test and validate over November/December rosters

