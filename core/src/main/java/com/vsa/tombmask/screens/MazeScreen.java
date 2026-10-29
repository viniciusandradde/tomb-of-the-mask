package com.vsa.tombmask.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.vsa.tombmask.TombMaskGame;

/** First playable portrait maze prototype with swipe and virtual directional buttons. */
public final class MazeScreen extends ScreenAdapter {
    private static final int TILE = 26;
    private static final String[] LEVEL = {
        "#########",
        "#..C....#",
        "#.###.#.#",
        "#...#.#.#",
        "###.#.#.#",
        "#C..#...#",
        "#.#####.#",
        "#...C...#",
        "#.#####.#",
        "#.......#",
        "#.#####G#",
        "#########"
    };
    private final TombMaskGame game;
    private final OrthographicCamera camera = new OrthographicCamera();
    private final FitViewport viewport = new FitViewport(360f, 640f, camera);
    private final boolean[][] collected = new boolean[LEVEL.length][LEVEL[0].length()];
    private final ShapeRenderer shapes = new ShapeRenderer();
    private final SpriteBatch batch = new SpriteBatch();
    private final BitmapFont font = new BitmapFont();
    private int playerX = 1;
    private int playerY = 1;
    private int coins;
    private boolean won;
    private float downX;
    private float downY;

    public MazeScreen(TombMaskGame game) {
        this.game = game;
        font.getData().setScale(1.1f);
    }

    @Override
    public void show() {
        Gdx.input.setInputProcessor(new InputAdapter() {
            @Override public boolean touchDown(int screenX, int screenY, int pointer, int button) {
                downX = screenX;
                downY = screenY;
                return true;
            }

            @Override public boolean touchUp(int screenX, int screenY, int pointer, int button) {
                float wx = screenX * 360f / Math.max(1, Gdx.graphics.getWidth());
                float wy = (Gdx.graphics.getHeight() - screenY) * 640f / Math.max(1, Gdx.graphics.getHeight());
                if (wy < 175f) {
                    if (wx < 125f) move(-1, 0);
                    else if (wx > 235f) move(1, 0);
                    else if (wy < 95f) move(0, 1);
                    else move(0, -1);
                } else {
                    float dx = screenX - downX;
                    float dy = downY - screenY;
                    if (Math.abs(dx) + Math.abs(dy) < 24f) return true;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        move(dx > 0 ? 1 : -1, 0);
                    } else {
                        // Screen swipe up moves toward the top of the map (row index decreases).
                        move(0, dy > 0 ? -1 : 1);
                    }
                }
                return true;
            }
        });
    }

    private void move(int dx, int dy) {
        if (won) return;
        int nx = playerX + dx;
        int ny = playerY + dy;
        if (ny < 0 || ny >= LEVEL.length() || nx < 0 || nx >= LEVEL[0].length()) return;
        if (LEVEL[ny].charAt(nx) == '#') return;
        playerX = nx;
        playerY = ny;
        if (LEVEL[ny].charAt(nx) == 'C' && !collected[ny][nx]) {
            collected[ny][nx] = true;
            coins++;
        }
        if (LEVEL[ny].charAt(nx) == 'G') won = true;
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
        float mapWidth = LEVEL[0].length() * TILE;
        float left = (360f - mapWidth) / 2f;
        float bottom = 270f;
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        for (int row = 0; row < LEVEL.length; row++) {
            for (int col = 0; col < LEVEL[row].length(); col++) {
                char tile = LEVEL[row].charAt(col);
                float x = left + col * TILE;
                float y = bottom + (LEVEL.length - 1 - row) * TILE;
                if (tile == '#') shapes.setColor(0.36f, 0.19f, 0.72f, 1f);
                else shapes.setColor(0.055f, 0.07f, 0.17f, 1f);
                shapes.rect(x + 1, y + 1, TILE - 2, TILE - 2);
                if (tile == 'C' && !collected[row][col]) {
                    shapes.setColor(0.1f, 0.95f, 0.96f, 1f);
                    shapes.circle(x + TILE / 2f, y + TILE / 2f, 5f, 16);
                } else if (tile == 'G') {
                    shapes.setColor(1f, 0.2f, 0.72f, 1f);
                    shapes.circle(x + TILE / 2f, y + TILE / 2f, 8f, 24);
                }
            }
        }
        float px = left + playerX * TILE + TILE / 2f;
        float py = bottom + (LEVEL.length - 1 - playerY) * TILE + TILE / 2f;
        shapes.setColor(1f, 0.85f, 0.25f, 1f);
        shapes.circle(px, py, 8f, 24);
        shapes.end();

        batch.setProjectionMatrix(camera.combined);
        batch.begin();
        font.draw(batch, "TOMB MASK KIDS", 18, 615);
        font.draw(batch, "Moedas: " + coins, 18, 585);
        font.draw(batch, "Deslize ou use as setas", 18, 245);
        font.draw(batch, "<", 55, 112);
        font.draw(batch, ">", 285, 112);
        font.draw(batch, "^", 168, 152);
        font.draw(batch, "v", 168, 72);
        if (won) {
            font.draw(batch, "PARABENS! LABIRINTO CONCLUIDO", 22, 215);
            font.draw(batch, "Toque para voltar", 92, 185);
        }
        batch.end();
        if (won && Gdx.input.justTouched()) game.setScreen(new StartScreen(game));
    }

    @Override
    public void dispose() {
        shapes.dispose();
        batch.dispose();
        font.dispose();
    }
}
