package com.clauselens.controller;

import com.clauselens.dao.NotificationDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/notifications", "/api/notifications/read"})
public class NotificationServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");

        try {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("unreadCount", NotificationDao.getUnreadCount(userId));
            out.put("items", NotificationDao.listForUser(userId));
            Json.send(resp, 200, out);
        } catch (Exception e) {
            Json.error(resp, 500, "Notification error: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");

        try {
            Map<String, Object> body = null;
            try { body = Json.read(req); } catch (Exception ignored) {}
            if (body != null && body.get("id") != null) {
                long notifId = ((Number) body.get("id")).longValue();
                NotificationDao.markRead(notifId, userId);
            } else {
                NotificationDao.markAllRead(userId);
            }
            Json.send(resp, 200, Map.of("ok", true));
        } catch (Exception e) {
            Json.error(resp, 500, "Error updating notifications: " + e.getMessage());
        }
    }
}
