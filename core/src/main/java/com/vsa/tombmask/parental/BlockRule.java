package com.vsa.tombmask.parental;

/**
 * A reusable parent-configured activity lock. Pure Java so its rules can be
 * unit-tested without an Android device.
 */
public final class BlockRule {
    public static final int MIN_DURATION_MINUTES = 1;
    public static final int MAX_DURATION_MINUTES = 1440;

    private final String id;
    private String title;
    private int durationMinutes;
    private boolean enabled;
    private long startedAtEpochMs;
    private long unlockAtEpochMs;

    public BlockRule(String id, String title, int durationMinutes, boolean enabled) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("id must not be blank");
        }
        this.id = id;
        setTitle(title);
        setDurationMinutes(durationMinutes);
        this.enabled = enabled;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public int getDurationMinutes() { return durationMinutes; }
    public boolean isEnabled() { return enabled; }
    public long getStartedAtEpochMs() { return startedAtEpochMs; }
    public long getUnlockAtEpochMs() { return unlockAtEpochMs; }
    public boolean isActive() { return unlockAtEpochMs > 0L; }

    public void setTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Activity title must not be blank");
        }
        String cleaned = title.trim();
        if (cleaned.length() > 80) {
            throw new IllegalArgumentException("Activity title must be 80 characters or fewer");
        }
        this.title = cleaned;
    }

    public void setDurationMinutes(int durationMinutes) {
        if (durationMinutes < MIN_DURATION_MINUTES || durationMinutes > MAX_DURATION_MINUTES) {
            throw new IllegalArgumentException("Duration must be between 1 and 1440 minutes");
        }
        this.durationMinutes = durationMinutes;
    }

    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public void activate(long nowEpochMs) {
        if (!enabled) {
            throw new IllegalStateException("Disabled rules cannot be activated");
        }
        if (nowEpochMs <= 0L) {
            throw new IllegalArgumentException("nowEpochMs must be positive");
        }
        this.startedAtEpochMs = nowEpochMs;
        this.unlockAtEpochMs = nowEpochMs + durationMinutes * 60_000L;
    }

    public void clearActiveLock() {
        this.startedAtEpochMs = 0L;
        this.unlockAtEpochMs = 0L;
    }

    public boolean isExpired(long nowEpochMs) {
        return isActive() && nowEpochMs >= unlockAtEpochMs;
    }

    public long getRemainingMillis(long nowEpochMs) {
        if (!isActive()) return 0L;
        return Math.max(0L, unlockAtEpochMs - nowEpochMs);
    }

    public void restoreActiveWindow(long startedAtEpochMs, long unlockAtEpochMs) {
        if (startedAtEpochMs <= 0L || unlockAtEpochMs <= startedAtEpochMs) {
            clearActiveLock();
            return;
        }
        this.startedAtEpochMs = startedAtEpochMs;
        this.unlockAtEpochMs = unlockAtEpochMs;
    }
}
