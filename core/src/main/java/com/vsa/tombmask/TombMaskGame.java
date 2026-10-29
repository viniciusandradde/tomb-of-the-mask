package com.vsa.tombmask;

import com.badlogic.gdx.Game;
import com.badlogic.gdx.Gdx;
import com.vsa.tombmask.parental.BlockLockManager;
import com.vsa.tombmask.parental.BlockRuleRepository;
import com.vsa.tombmask.screens.ChildLockScreen;
import com.vsa.tombmask.screens.StartScreen;

public final class TombMaskGame extends Game {
    private BlockLockManager lockManager;
    private BlockRuleRepository repository;

    @Override
    public void create() {
        repository = new BlockRuleRepository(Gdx.app.getPreferences("tombmask-parental-settings"));
        showAppropriateScreen();
    }

    /** Reload persisted rules on each screen transition so parent actions take effect immediately. */
    public void showAppropriateScreen() {
        lockManager = repository.load(System.currentTimeMillis());
        if (lockManager.getActiveRule(System.currentTimeMillis()) != null) {
            repository.save(lockManager, System.currentTimeMillis());
            setScreen(new ChildLockScreen(lockManager, this::showAppropriateScreen));
        } else {
            setScreen(new StartScreen(this));
        }
    }

    public BlockLockManager getLockManager() {
        return lockManager;
    }

    public void persistParentSettings() {
        repository.save(lockManager, System.currentTimeMillis());
    }

    @Override
    public void dispose() {
        super.dispose();
    }
}
