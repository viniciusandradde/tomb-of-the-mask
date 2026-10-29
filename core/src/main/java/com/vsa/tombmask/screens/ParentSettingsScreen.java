package com.vsa.tombmask.screens;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Input;
import com.badlogic.gdx.ScreenAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.GlyphLayout;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.Preferences;
import com.badlogic.gdx.utils.viewport.FitViewport;
import com.vsa.tombmask.TombMaskGame;
import com.vsa.tombmask.parental.BlockLockManager;
import com.vsa.tombmask.parental.BlockRule;
import com.vsa.tombmask.parental.BlockRuleRepository;
import com.vsa.tombmask.parental.ParentGate;
import com.vsa.tombmask.parental.ParentSettingsController;

/** Basic parent-only activity editor; visual polish and PIN recovery are future work. */
public final class ParentSettingsScreen extends ScreenAdapter {
    private static final String PIN_HASH_KEY = "parent.pinHash";
    private final TombMaskGame game;
    private final OrthographicCamera camera = new OrthographicCamera();
    private final FitViewport viewport = new FitViewport(360f, 640f, camera);
    private SpriteBatch batch;
    private ShapeRenderer shapes;
    private BitmapFont font;
    private GlyphLayout layout;
    private Preferences preferences;
    private ParentSettingsController controller;
    private String status = "Configuracao protegida";
    private boolean authenticated;
    private boolean promptOpen;

    public ParentSettingsScreen(TombMaskGame game) {
        this.game = game;
    }

    @Override
    public void show() {
        batch = new SpriteBatch();
        shapes = new ShapeRenderer();
        font = new BitmapFont();
        font.getData().setScale(1.15f);
        layout = new GlyphLayout();
        preferences = Gdx.app.getPreferences("tombmask-parental-settings");
        if (preferences.getString(PIN_HASH_KEY, "").isEmpty()) {
            status = "Primeiro acesso: crie um PIN de responsavel";
            requestPin(true);
        } else {
            status = "Digite o PIN de responsavel para continuar";
            requestPin(false);
        }
    }

    private void requestPin(final boolean setup) {
        if (promptOpen) return;
        promptOpen = true;
        Gdx.input.getTextInput(new Input.TextInputListener() {
            @Override public void input(String text) {
                promptOpen = false;
                if (setup) {
                    try {
                        ParentGate gate = new ParentGate(text);
                        preferences.putString(PIN_HASH_KEY, gate.getHash());
                        preferences.flush();
                        authenticate(gate);
                    } catch (IllegalArgumentException ex) {
                        status = "PIN invalido. Use de 4 a 8 numeros.";
                        requestPin(true);
                    }
                } else {
                    ParentGate gate = ParentGate.fromHash(preferences.getString(PIN_HASH_KEY, ""));
                    if (gate.verify(text)) authenticate(gate);
                    else {
                        status = "PIN incorreto. Toque na tela para tentar novamente.";
                        authenticated = false;
                    }
                }
            }
            @Override public void canceled() {
                promptOpen = false;
                status = "Acesso de responsavel nao autenticado";
            }
        }, setup ? "Criar PIN do responsavel" : "PIN do responsavel", "", "4 a 8 digitos");
    }

    private void authenticate(ParentGate gate) {
        BlockRuleRepository repository = new BlockRuleRepository(preferences);
        BlockLockManager manager = repository.load(System.currentTimeMillis());
        controller = new ParentSettingsController(manager, repository, gate);
        authenticated = true;
        status = "Atividades configuradas: " + manager.getRules().size();
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
        shapes.setProjectionMatrix(camera.combined);
        drawButton(18, 26, 100, 48, "VOLTAR");
        if (!authenticated) {
            batch.begin();
            font.draw(batch, "AREA DOS RESPONSAVEIS", 20, 600);
            drawWrapped(status, 20, 540, 320);
            font.draw(batch, "Toque na tela para tentar novamente.", 20, 470);
            batch.end();
            if (Gdx.input.justTouched() && !promptOpen) {
                if (preferences.getString(PIN_HASH_KEY, "").isEmpty()) requestPin(true);
                else requestPin(false);
            }
            if (hit(18, 26, 100, 48)) game.setScreen(new StartScreen(game));
            return;
        }

        batch.begin();
        font.draw(batch, "ATIVIDADES / BLOQUEIOS", 18, 610);
        font.draw(batch, status, 18, 575);
        int index = 0;
        for (BlockRule rule : controller.getManager().getRules()) {
            float y = 525 - index * 64;
            if (y < 165) break;
            font.draw(batch, rule.getTitle(), 20, y);
            font.draw(batch, rule.getDurationMinutes() + " min  |  " + (rule.isEnabled() ? "Ativa" : "Desativada"), 20, y - 24);
            font.draw(batch, "INICIAR", 260, y - 5);
            index++;
        }
        font.draw(batch, "NOVO: toque no botao abaixo", 20, 140);
        font.draw(batch, "Toque numa atividade para iniciar o bloqueio.", 20, 112);
        batch.end();
        drawButton(210, 26, 132, 48, "NOVA ATIVIDADE");
        if (Gdx.input.justTouched()) handleTouch();
    }

    private void handleTouch() {
        float x = Gdx.input.getX() * 360f / Math.max(1, Gdx.graphics.getWidth());
        float y = (Gdx.graphics.getHeight() - Gdx.input.getY()) * 640f / Math.max(1, Gdx.graphics.getHeight());
        if (x >= 18 && x <= 118 && y >= 26 && y <= 74) {
            game.setScreen(new StartScreen(game));
            return;
        }
        if (x >= 205 && x <= 350 && y >= 20 && y <= 82) {
            addActivity();
            return;
        }
        int index = (int) ((525 - y) / 64f);
        if (index >= 0 && index < controller.getManager().getRules().size()) {
            BlockRule rule = controller.getManager().getRules().get(index);
            if (rule.isEnabled()) {
                try {
                    controller.startActivityLock(rule.getId(), System.currentTimeMillis());
                    game.showAppropriateScreen();
                } catch (RuntimeException ex) {
                    status = "Nao foi possivel iniciar o bloqueio.";
                }
            }
        }
    }

    private void addActivity() {
        Gdx.input.getTextInput(new Input.TextInputListener() {
            @Override public void input(final String title) {
                if (title == null || title.trim().isEmpty()) {
                    status = "Informe o nome da atividade.";
                    return;
                }
                Gdx.input.getTextInput(new Input.TextInputListener() {
                    @Override public void input(String minutesText) {
                        try {
                            int minutes = Integer.parseInt(minutesText.trim());
                            String id = "activity-" + System.currentTimeMillis();
                            controller.createActivity(id, title.trim(), minutes);
                            status = "Atividade adicionada: " + title.trim();
                        } catch (RuntimeException ex) {
                            status = "Duracao invalida. Informe de 1 a 1440 minutos.";
                        }
                    }
                    @Override public void canceled() { status = "Cadastro cancelado."; }
                }, "Duracao do bloqueio (minutos)", "15", "Ex.: 15 ou 60");
            }
            @Override public void canceled() { status = "Cadastro cancelado."; }
        }, "Nome da atividade", "", "Ex.: Brincar de carrinho");
    }

    private void drawButton(float x, float y, float width, float height, String label) {
        shapes.begin(ShapeRenderer.ShapeType.Filled);
        shapes.setColor(0.24f, 0.18f, 0.52f, 1f);
        shapes.rect(x, y, width, height);
        shapes.end();
        batch.begin();
        layout.setText(font, label);
        font.draw(batch, label, x + (width - layout.width) / 2f, y + height / 2f + layout.height / 2f);
        batch.end();
    }

    private boolean hit(float x, float y, float width, float height) {
        if (!Gdx.input.justTouched()) return false;
        float tx = Gdx.input.getX() * 360f / Math.max(1, Gdx.graphics.getWidth());
        float ty = (Gdx.graphics.getHeight() - Gdx.input.getY()) * 640f / Math.max(1, Gdx.graphics.getHeight());
        return tx >= x && tx <= x + width && ty >= y && ty <= y + height;
    }

    private void drawWrapped(String text, float x, float y, float maxWidth) {
        String line = "";
        for (String word : text.split("\\s+")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            layout.setText(font, candidate);
            if (layout.width > maxWidth && !line.isEmpty()) {
                font.draw(batch, line, x, y);
                y -= 34;
                line = word;
            } else line = candidate;
        }
        if (!line.isEmpty()) font.draw(batch, line, x, y);
    }

    @Override
    public void dispose() {
        if (font != null) font.dispose();
        if (batch != null) batch.dispose();
        if (shapes != null) shapes.dispose();
    }
}
