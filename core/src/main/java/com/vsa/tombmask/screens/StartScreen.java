package com.vsa.tombmask.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.utils.viewport.FitViewport;

/** Temporary launch screen while the maze and parent settings UI are being built. */
public final class StartScreen extends ScreenAdapter {
    private final OrthographicCamera camera = new OrthographicCamera();
    private final FitViewport viewport = new FitViewport(360f, 640f, camera);
    private SpriteBatch batch;
    private BitmapFont font;

    @Override
    public void show() {
        batch = new SpriteBatch();
        font = new BitmapFont();
        font.getData().setScale(1.4f);
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height, true);
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.035f, 0.035f, 0.12f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        viewport.apply();
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        font.draw(batch, "TOMB MASK KIDS", 42f, 390f);
        font.draw(batch, "Android / LibGDX", 42f, 345f);
        font.draw(batch, "A migracao do labirinto", 42f, 275f);
        font.draw(batch, "esta em andamento.", 42f, 235f);
        batch.end();
    }

    @Override
    public void dispose() {
        if (font != null) font.dispose();
        if (batch != null) batch.dispose();
    }
}
