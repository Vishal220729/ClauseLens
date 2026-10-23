package com.clauselens.util;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import com.google.gson.reflect.TypeToken;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.util.Map;

public final class Json {
    private static final Gson GSON = new Gson();
    private Json() {}

    public static Map<String, Object> read(HttpServletRequest req) throws IOException {
        if (req.getContentLengthLong() > 2_000_000) throw new IllegalArgumentException("Request is too large.");
        try (BufferedReader r = req.getReader()) {
            Map<String, Object> m = GSON.fromJson(r, new TypeToken<Map<String, Object>>() {}.getType());
            if (m == null) throw new IllegalArgumentException("Request body is empty.");
            return m;
        } catch (JsonParseException e) {
            throw new IllegalArgumentException("Request body is not valid JSON.");
        }
    }

    public static void send(HttpServletResponse resp, int status, Object body) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.setHeader("Cache-Control", "no-store");
        resp.getWriter().write(GSON.toJson(body));
    }

    public static void error(HttpServletResponse resp, int status, String message) throws IOException {
        send(resp, status, Map.of("error", message));
    }
}
