package com.clauselens.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public final class Db {
    private Db() {}

    static {
        try { Class.forName("com.mysql.cj.jdbc.Driver"); }
        catch (ClassNotFoundException e) { throw new ExceptionInInitializerError(e); }
    }

    public static Connection get() throws SQLException {
        String url = env("CL_DB_URL",
            "jdbc:mysql://localhost:3306/clauselens?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
        return DriverManager.getConnection(url, env("CL_DB_USER", "root"), env("CL_DB_PASS", ""));
    }

    public static String env(String key, String fallback) {
        String v = System.getenv(key);
        return (v == null || v.isBlank()) ? fallback : v;
    }
}
