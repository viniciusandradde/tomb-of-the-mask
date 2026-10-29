package com.vsa.tombmask.parental;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * In-memory domain logic for activity locks. A repository should persist rules
 * through LibGDX Preferences; the active unlock timestamp makes the lock
 * survive app process death and device restart.
 */
public final class BlockLockManager {
    private final List<BlockRule> rules = new ArrayList<BlockRule>();
    private String activeRuleId;

    public void addRule(BlockRule rule) {
        if (rule == null) throw new IllegalArgumentException("rule must not be null");
        if (findRule(rule.getId()) != null) {
            throw new IllegalArgumentException("A rule with this id already exists");
        }
        rules.add(rule);
    }

    public boolean removeRule(String id) {
        BlockRule rule = findRule(id);
        if (rule == null) return false;
        if (rule.getId().equals(activeRuleId)) {
            rule.clearActiveLock();
            activeRuleId = null;
        }
        return rules.remove(rule);
    }

    public List<BlockRule> getRules() {
        return Collections.unmodifiableList(rules);
    }

    public BlockRule findRule(String id) {
        if (id == null) return null;
        for (BlockRule rule : rules) {
            if (rule.getId().equals(id)) return rule;
        }
        return null;
    }

    public BlockRule getActiveRule(long nowEpochMs) {
        if (activeRuleId == null) return null;
        BlockRule active = findRule(activeRuleId);
        if (active == null || active.isExpired(nowEpochMs)) {
            if (active != null) active.clearActiveLock();
            activeRuleId = null;
            return null;
        }
        return active;
    }

    /** Activating a new rule replaces any current lock. Confirm in the parent UI first. */
    public void activate(String id, long nowEpochMs) {
        BlockRule next = findRule(id);
        if (next == null) throw new IllegalArgumentException("Unknown rule id");
        if (!next.isEnabled()) throw new IllegalStateException("Rule is disabled");
        if (activeRuleId != null) {
            BlockRule current = findRule(activeRuleId);
            if (current != null) current.clearActiveLock();
        }
        next.activate(nowEpochMs);
        activeRuleId = next.getId();
    }

    public void cancelActiveLock() {
        if (activeRuleId == null) return;
        BlockRule active = findRule(activeRuleId);
        if (active != null) active.clearActiveLock();
        activeRuleId = null;
    }

    public String getActiveRuleId() { return activeRuleId; }

    /** Rebuilds the active reference after loading persisted rule records. */
    public void restoreActiveRule(String id, long nowEpochMs) {
        activeRuleId = null;
        if (id == null) return;
        BlockRule rule = findRule(id);
        if (rule != null && rule.isActive() && !rule.isExpired(nowEpochMs)) {
            activeRuleId = id;
        } else if (rule != null) {
            rule.clearActiveLock();
        }
    }

    public static String formatRemaining(long remainingMillis) {
        long totalSeconds = Math.max(0L, remainingMillis / 1000L);
        long hours = totalSeconds / 3600L;
        long minutes = (totalSeconds % 3600L) / 60L;
        long seconds = totalSeconds % 60L;
        if (hours > 0L) {
            return String.format("%d h %02d min", hours, minutes);
        }
        if (minutes > 0L) {
            return String.format("%d min %02d s", minutes, seconds);
        }
        return String.format("%d s", seconds);
    }
}
