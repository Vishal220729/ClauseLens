package com.clauselens.security;

import org.mindrot.jbcrypt.BCrypt;

public final class PasswordUtil {
    private static final String DUMMY = BCrypt.hashpw("not-a-real-password", BCrypt.gensalt(12));
    private PasswordUtil() {}

    public static String hash(String plain) { return BCrypt.hashpw(plain, BCrypt.gensalt(12)); }

    public static boolean verify(String plain, String hash) { return BCrypt.checkpw(plain, hash); }

    /** Burns the same time as a real check so unknown emails are not distinguishable by timing. */
    public static void burn(String plain) { BCrypt.checkpw(plain, DUMMY); }
}
