package com.vsa.tombmask.parental;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** In-app parent gate. PINs are compared through SHA-256 hashes, not retained as plain text. */
public final class ParentGate {
    private final String pinHash;

    public ParentGate(String configuredPin) {
        validatePin(configuredPin);
        this.pinHash = hash(configuredPin);
    }

    private ParentGate(String hash, boolean alreadyHashed) {
        if (hash == null || !hash.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Invalid parent PIN hash");
        }
        this.pinHash = hash;
    }

    public static ParentGate fromHash(String hash) {
        return new ParentGate(hash, true);
    }

    public String getHash() { return pinHash; }

    public boolean verify(String candidate) {
        if (candidate == null) return false;
        try {
            validatePin(candidate);
            return MessageDigest.isEqual(
                pinHash.getBytes(StandardCharsets.US_ASCII),
                hash(candidate).getBytes(StandardCharsets.US_ASCII)
            );
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static void validatePin(String pin) {
        if (pin == null || pin.length() < 4 || pin.length() > 8) {
            throw new IllegalArgumentException("PIN must contain 4 to 8 digits");
        }
        for (int i = 0; i < pin.length(); i++) {
            if (!Character.isDigit(pin.charAt(i))) {
                throw new IllegalArgumentException("PIN must contain digits only");
            }
        }
    }

    private static String hash(String pin) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(pin.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder(64);
            for (byte b : bytes) out.append(String.format("%02x", b & 0xff));
            return out.toString();
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
