package com.vsa.tombmask.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.vsa.tombmask.TombMaskGame;

/** Portrait landing screen linking the prototype maze and parent settings. */
public final class StartScreen extends ScreenAdapter {
    private final TombMaskGame game;
    private final OrthographicCamera camera = new OrthographicCamera();
    private final FitViewport viewport = new FitViewport(360f, 640f, camera);
    private SpriteBatch batch;
    private ShapeRenderer shapes;
    private BitmapFont font;
    private GlyphLayout layout;

    public StartScreen(TombMaskGame game) {
        this.game = game;
    }

    @Override
    public void show() {
        batch = new SpriteBatch();
        shapes = new ShapeRenderer();
        font = new BitmapFont();
        font.getData().setScale(1.35f);
        layout = new GlyphLayout();
        Gdx.input.setInputProcessor(new InputAdapter() {
            @Override public boolean touchDown(int screenX, int screenY, int pointer, int button) {
                float x = screenX * 360f / Math.max(1, Gdx.graphics.getWidth());
                float y = (Gdx.graphics.getHeight() - screenY) * 640f / Math.max(1, Gdx.graphics.getHeight());
                if (inside(x, y, 30, 300, 300, 76)) {
                    game.setScreen(new MazeScreen(game));
                    return true;
                }
                if (inside(x, y, 30, 195, 300, 76)) {
                    game.setScreen(new ParentSettingsScreen(game));
                    return true;
                }
                return true;
            }
        });
    }

    private boolean inside(float x, float y, float bx, float by, float width, float height) {
        return x >= bx && x <= bx + width && y >= by && y <= by + height;
    }

    @Override
    public void resize(int width, int height) {
        viewport.update(width, height, true);
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.025f, 0.025f, 0.09f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
        viewport.apply();
        shapes.setProjectionMatrix(camera.combined);
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0.3f, 0.16f, 0.7f, 1f);
        shapes.rect(30, 300, 300, 76);
        shapes.setColor(0.04f, 0.5f, 0.62f, 1f);
        shapes.rect(30, 195, 300, 76);
        shapes.end();
        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        font.draw(batch, "TOMB MASK KIDS", 70, 520);
        font.draw(batch, "Um pequeno labirinto neon", 50, 480);
        drawCentered("JOGAR", 338);
        drawCentered("AREA DOS RESPONSAVEIS", 233);
        font.getData().setScale(0.9f);
        font.draw(batch, "Versao inicial em desenvolvimento", 40, 100);
        batch.end();
    }

    private void drawCentered(String text, float centerY) {
        layout.setText(font, text);
        font.draw(batch, text, (360f - layout.width) / 2f, centerY);
    }

    @Override
    public void dispose() {
        if (font != null) font.dispose();
        if (batch != null) batch.dispose();
        if (shapes != null) shapes.dispose();
    }
}
