package com.vsa.tombmask.android;

import android.content.Context;
import android.media.AudioManager;
import android.os.Bundle;
import android.view.KeyEvent;

import com.badlogic.gdx.backends.android.AndroidApplication;
import com.badlogic.gdx.backends.android.AndroidApplicationConfiguration;
import com.vsa.tombmask.TombMaskGame;

/**
 * Android entry point with a child-friendly media-volume ceiling.
 *
 * The app sets music/media volume to at most half of the device's media range
 * when it launches or returns to the foreground. Volume-up hardware presses
 * are consumed while this Activity is active; volume-down remains available.
 */
public final class AndroidLauncher extends AndroidApplication {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyChildVolumeLimit();

        AndroidApplicationConfiguration configuration = new AndroidApplicationConfiguration();
        configuration.useImmersiveMode = true;
        initialize(new TombMaskGame(), configuration);
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyChildVolumeLimit();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    private void applyChildVolumeLimit() {
        AudioManager audioManager =
                (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) {
            return;
        }

        int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        if (maxVolume <= 0) {
            return;
        }

        int safeVolume = Math.max(1, maxVolume / 2);
        int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
        if (currentVolume > safeVolume) {
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, safeVolume, 0);
        }
    }
}
