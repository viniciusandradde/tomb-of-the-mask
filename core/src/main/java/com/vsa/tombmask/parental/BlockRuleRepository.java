package com.vsa.tombmask.parental;

import com.badlogic.gdx.Preferences;

/**
 * Local persistence adapter using LibGDX Preferences. No child profile or
 * personal data is stored; only activity labels and lock timestamps.
 */
public final class BlockRuleRepository {
    private static final String COUNT = "rules.count";
    private static final String ACTIVE_ID = "rules.activeId";
    private static final String PREFIX = "rules.item.";

    private final Preferences preferences;

    public BlockRuleRepository(Preferences preferences) {
        if (preferences == null) throw new IllegalArgumentException("preferences must not be null");
        this.preferences = preferences;
    }

    public void save(BlockLockManager manager, long nowEpochMs) {
        if (manager == null) throw new IllegalArgumentException("manager must not be null");
        int count = manager.getRules().size();
        preferences.putInteger(COUNT, count);
        for (int i = 0; i < count; i++) {
            BlockRule rule = manager.getRules().get(i);
            String key = PREFIX + i + ".";
            preferences.putString(key + "id", rule.getId());
            preferences.putString(key + "title", rule.getTitle());
            preferences.putInteger(key + "durationMinutes", rule.getDurationMinutes());
            preferences.putBoolean(key + "enabled", rule.isEnabled());
            preferences.putLong(key + "startedAt", rule.getStartedAtEpochMs());
            preferences.putLong(key + "unlockAt", rule.getUnlockAtEpochMs());
        }
        BlockRule active = manager.getActiveRule(nowEpochMs);
        if (active == null) {
            preferences.remove(ACTIVE_ID);
        } else {
            preferences.putString(ACTIVE_ID, active.getId());
        }
        preferences.flush();
    }

    public BlockLockManager load(long nowEpochMs) {
        BlockLockManager manager = new BlockLockManager();
        int count = Math.max(0, Math.min(500, preferences.getInteger(COUNT, 0)));
        for (int i = 0; i < count; i++) {
            String key = PREFIX + i + ".";
            String id = preferences.getString(key + "id", "");
            String title = preferences.getString(key + "title", "");
            int duration = preferences.getInteger(key + "durationMinutes", 15);
            boolean enabled = preferences.getBoolean(key + "enabled", true);
            try {
                BlockRule rule = new BlockRule(id, title, duration, enabled);
                rule.restoreActiveWindow(
                    preferences.getLong(key + "startedAt", 0L),
                    preferences.getLong(key + "unlockAt", 0L)
                );
                manager.addRule(rule);
            } catch (IllegalArgumentException ignored) {
                // Skip malformed local records instead of crashing the app.
            }
        }
        manager.restoreActiveRule(preferences.getString(ACTIVE_ID, null), nowEpochMs);
        return manager;
    }
}
