package com.vsa.tombmask.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.badlogic.gdx.utils.viewport.Viewport;
import com.vsa.tombmask.parental.BlockLockManager;
import com.vsa.tombmask.parental.BlockRule;

/**
 * Minimal child-facing lock screen. It deliberately has no dismiss button;
 * only expiration or the protected parent area can release the lock.
 */
public final class ChildLockScreen extends ScreenAdapter {
    private static final float WORLD_WIDTH = 360f;
    private static final float WORLD_HEIGHT = 640f;

    private final BlockLockManager lockManager;
    private final Runnable onUnlocked;
    private final Runnable onParentSettings;
    private final OrthographicCamera camera = new OrthographicCamera();
    private final Viewport viewport = new FitViewport(WORLD_WIDTH, WORLD_HEIGHT, camera);
    private final GlyphLayout layout = new GlyphLayout();
    private SpriteBatch batch;
    private BitmapFont font;
    private boolean unlockCallbackSent;

    public ChildLockScreen(BlockLockManager lockManager, Runnable onUnlocked, Runnable onParentSettings) {
        if (lockManager == null || onUnlocked == null || onParentSettings == null) {
            throw new IllegalArgumentException("lockManager and callbacks are required");
        }
        this.lockManager = lockManager;
        this.onUnlocked = onUnlocked;
        this.onParentSettings = onParentSettings;
    }

    @Override
    public void show() {
        batch = new SpriteBatch();
        font = new BitmapFont();
        font.getData().setScale(1.5f);
        unlockCallbackSent = false;
        Gdx.input.setInputProcessor(new InputAdapter() {
            @Override public boolean touchUp(int screenX, int screenY, int pointer, int button) {
                float x = screenX * WORLD_WIDTH / Math.max(1, Gdx.graphics.getWidth());
                float y = (Gdx.graphics.getHeight() - screenY) * WORLD_HEIGHT / Math.max(1, Gdx.graphics.getHeight());
                if (x >= 250f && y <= 52f) onParentSettings.run();
                return true;
            }
        });
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height, true);
    }

    @Override
    public void render(float delta) {
        long now = System.currentTimeMillis();
        BlockRule active = lockManager.getActiveRule(now);
        if (active == null) {
            if (!unlockCallbackSent) {
                unlockCallbackSent = true;
                onUnlocked.run();
            }
            return;
        }

        Gdx.gl.glClearColor(0.035f, 0.035f, 0.12f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        viewport.apply();
        batch.setProjectionMatrix(camera.combined);
        batch.begin();

        font.draw(batch, "Pausa para esta atividade", 34f, 440f);
        font.draw(batch, "Agora e hora de:", 34f, 380f);
        drawWrapped(active.getTitle(), 34f, 335f, 290f);
        font.draw(batch, "O jogo fica disponivel em", 34f, 230f);
        font.draw(batch, BlockLockManager.formatRemaining(active.getRemainingMillis(now)), 34f, 185f);
        font.draw(batch, "Quando o tempo terminar,", 34f, 100f);
        font.draw(batch, "voce podera jogar de novo!", 34f, 70f);
        font.draw(batch, "Responsaveis", 250f, 24f);

        batch.end();
    }

    private void drawWrapped(String text, float x, float y, float targetWidth) {
        String line = "";
        String[] words = text.split("\\s+");
        float lineY = y;
        for (String word : words) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            layout.setText(font, candidate);
            if (layout.width > targetWidth && !line.isEmpty()) {
                font.draw(batch, line, x, lineY);
                line = word;
                lineY -= 42f;
            } else {
                line = candidate;
            }
        }
        if (!line.isEmpty()) font.draw(batch, line, x, lineY);
    }

    @Override
    public void dispose() {
        if (font != null) font.dispose();
        if (batch != null) batch.dispose();
    }
}
