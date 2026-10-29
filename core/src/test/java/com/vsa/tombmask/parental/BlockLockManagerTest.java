package com.vsa.tombmask.parental;

import org.junit.Test;
import static org.junit.Assert.*;

public class BlockLockManagerTest {
    @Test
    public void activityLockExpiresAtConfiguredTime() {
        long now = 1_800_000_000_000L;
        BlockLockManager manager = new BlockLockManager();
        manager.addRule(new BlockRule("potty", "Fazer cocô", 60, true));
        manager.activate("potty", now);

        assertEquals("Fazer cocô", manager.getActiveRule(now).getTitle());
        assertEquals(60L * 60_000L, manager.getActiveRule(now).getRemainingMillis(now));
        assertNull(manager.getActiveRule(now + 60L * 60_000L));
    }

    @Test
    public void multipleRulesCanBeSavedInManagerAndActivatedIndividually() {
        BlockLockManager manager = new BlockLockManager();
        manager.addRule(new BlockRule("potty", "Fazer cocô", 60, true));
        manager.addRule(new BlockRule("cars", "Brincar de carrinho", 15, true));

        manager.activate("cars", 1_800_000_000_000L);

        assertEquals(2, manager.getRules().size());
        assertEquals("cars", manager.getActiveRuleId());
        assertEquals("Brincar de carrinho", manager.getActiveRule(1_800_000_000_000L).getTitle());
    }

    @Test
    public void durationMustBePositiveAndWithinLimit() {
        try {
            new BlockRule("bad", "Atividade", 0, true);
            fail("Expected invalid duration");
        } catch (IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("Duration"));
        }
    }

    @Test
    public void remainingTimeNeverBecomesNegative() {
        BlockRule rule = new BlockRule("cars", "Brincar de carrinho", 15, true);
        rule.activate(1_800_000_000_000L);
        assertEquals(0L, rule.getRemainingMillis(1_800_000_000_000L + 16L * 60_000L));
    }
}
