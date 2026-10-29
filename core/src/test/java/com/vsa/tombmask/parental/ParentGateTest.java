package com.vsa.tombmask.parental;

import org.junit.Test;
import static org.junit.Assert.*;

public class ParentGateTest {
    @Test
    public void pinIsStoredAsHashAndCanBeVerifiedAfterRestore() {
        ParentGate configured = new ParentGate("4826");
        assertNotEquals("4826", configured.getHash());
        ParentGate restored = ParentGate.fromHash(configured.getHash());
        assertTrue(restored.verify("4826"));
        assertFalse(restored.verify("1234"));
    }

    @Test(expected = IllegalArgumentException.class)
    public void pinMustBeFourToEightDigits() {
        new ParentGate("abc");
    }
}
