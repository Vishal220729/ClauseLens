package com.clauselens.security;

import java.util.concurrent.ConcurrentHashMap;

public final class LoginThrottle {
    private record Entry(int fails, long until) {}
    private static final ConcurrentHashMap<String, Entry> STATE = new ConcurrentHashMap<>();
    private LoginThrottle() {}

    public static boolean blocked(String key) {
        Entry e = STATE.get(key);
        if (e == null || e.until() == 0) return false;
        if (e.until() > System.currentTimeMillis()) return true;
        STATE.remove(key);
        return false;
    }

    public static void fail(String key) {
        STATE.merge(key, new Entry(1, 0), (old, ignored) -> {
            int f = old.fails() + 1;
            return new Entry(f, f >= 5 ? System.currentTimeMillis() + 10 * 60_000L : 0);
        });
    }

    public static void success(String key) { STATE.remove(key); }
}
