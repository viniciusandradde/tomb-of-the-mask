package com.vsa.tombmask.parental;

/**
 * Small in-app parent gate. This is a deterrent for accidental child access,
 * not device-level parental control or strong authentication.
 */
public final class ParentGate {
    private final String configuredPin;

    public ParentGate(String configuredPin) {
        if (configuredPin == null || configuredPin.length() < 4 || configuredPin.length() > 8) {
            throw new IllegalArgumentException("PIN must contain 4 to 8 digits");
        }
        for (int i = 0; i < configuredPin.length(); i++) {
            if (!Character.isDigit(configuredPin.charAt(i))) {
                throw new IllegalArgumentException("PIN must contain digits only");
            }
        }
        this.configuredPin = configuredPin;
    }

    public boolean verify(String candidate) {
        return candidate != null && configuredPin.equals(candidate);
    }
}
