package com.clauselens.util;

import java.util.Map;
import java.util.regex.Pattern;

public final class Validate {
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern PHONE = Pattern.compile("^[0-9+()\\- ]{6,20}$");
    private Validate() {}

    public static String str(Map<String, Object> m, String key, int min, int max, String label) {
        Object o = m.get(key);
        String s = (o instanceof String) ? ((String) o).trim() : "";
        if (s.length() < min || s.length() > max)
            throw new IllegalArgumentException(min == 0 ? label + " must be at most " + max + " characters."
                : label + " is required (" + min + "-" + max + " characters).");
        return s;
    }

    public static String optional(Map<String, Object> m, String key, int max, String label) {
        return str(m, key, 0, max, label);
    }

    public static String email(Map<String, Object> m) {
        String e = str(m, "email", 5, 190, "Email").toLowerCase();
        if (!EMAIL.matcher(e).matches()) throw new IllegalArgumentException("Enter a valid email address.");
        return e;
    }

    public static String password(Map<String, Object> m) {
        Object o = m.get("password");
        String p = (o instanceof String) ? (String) o : "";
        if (p.length() < 8 || p.length() > 72 || !p.matches(".*[A-Za-z].*") || !p.matches(".*[0-9].*"))
            throw new IllegalArgumentException("Password needs 8-72 characters with at least one letter and one number.");
        return p;
    }

    public static String phone(Map<String, Object> m) {
        String p = optional(m, "phone", 20, "Phone");
        if (!p.isEmpty() && !PHONE.matcher(p).matches()) throw new IllegalArgumentException("Enter a valid phone number.");
        return p;
    }

    public static String url(Map<String, Object> m, String key) {
        String u = optional(m, key, 300, "Portfolio URL");
        if (!u.isEmpty() && !u.matches("^https?://[^\\s]+$")) throw new IllegalArgumentException("Portfolio URL must start with http:// or https://");
        return u;
    }
}
