package com.vsa.tombmask.parental;

/**
 * Application-level operations used by the parent settings UI.
 * Call these only after the UI has verified the parent gate.
 */
public final class ParentSettingsController {
    private final BlockLockManager manager;
    private final BlockRuleRepository repository;
    private final ParentGate parentGate;

    public ParentSettingsController(BlockLockManager manager,
                                   BlockRuleRepository repository,
                                   ParentGate parentGate) {
        if (manager == null || repository == null || parentGate == null) {
            throw new IllegalArgumentException("manager, repository and parentGate are required");
        }
        this.manager = manager;
        this.repository = repository;
        this.parentGate = parentGate;
    }

    public boolean unlockParentArea(String enteredPin) {
        return parentGate.verify(enteredPin);
    }

    public BlockRule createActivity(String id, String title, int durationMinutes) {
        BlockRule rule = new BlockRule(id, title, durationMinutes, true);
        manager.addRule(rule);
        persist();
        return rule;
    }

    public void updateActivity(String id, String title, int durationMinutes, boolean enabled) {
        BlockRule rule = requireRule(id);
        rule.setTitle(title);
        rule.setDurationMinutes(durationMinutes);
        rule.setEnabled(enabled);
        persist();
    }

    public void deleteActivity(String id) {
        if (!manager.removeRule(id)) throw new IllegalArgumentException("Unknown rule id");
        persist();
    }

    public void startActivityLock(String id, long nowEpochMs) {
        manager.activate(id, nowEpochMs);
        persist();
    }

    public void cancelActivityLock() {
        manager.cancelActiveLock();
        persist();
    }

    public BlockLockManager getManager() {
        return manager;
    }

    private BlockRule requireRule(String id) {
        BlockRule rule = manager.findRule(id);
        if (rule == null) throw new IllegalArgumentException("Unknown rule id");
        return rule;
    }

    private void persist() {
        repository.save(manager, System.currentTimeMillis());
    }
}
