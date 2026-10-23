package com.clauselens.controller;

import com.clauselens.dao.ConversationDao;
import com.clauselens.dao.NotificationDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/conversations", "/api/messages"})
public class ChatServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");
        String role = (String) s.getAttribute("role");
        String path = req.getServletPath();

        try {
            if ("/api/conversations".equals(path)) {
                Json.send(resp, 200, ConversationDao.listForUser(userId, role));
            } else {
                String convIdStr = req.getParameter("conversationId");
                if (convIdStr == null || convIdStr.isBlank()) {
                    Json.error(resp, 400, "Missing conversationId parameter.");
                    return;
                }
                long convId = Long.parseLong(convIdStr);
                Json.send(resp, 200, ConversationDao.getMessages(convId, userId));
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Chat error: " + e.getMessage());
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
            Map<String, Object> body = Json.read(req);
            long convId = ((Number) body.get("conversationId")).longValue();
            String text = String.valueOf(body.get("text")).trim();
            if (text.isEmpty()) {
                Json.error(resp, 400, "Message cannot be empty.");
                return;
            }

            long msgId = ConversationDao.sendMessage(convId, userId, text);
            // Notify partner if recipientId is supplied
            if (body.get("recipientId") != null) {
                long recId = ((Number) body.get("recipientId")).longValue();
                NotificationDao.create(recId, "New Message",
                    text.length() > 60 ? text.substring(0, 57) + "..." : text,
                    "MESSAGE", "/chat");
            }
            Json.send(resp, 201, Map.of("ok", true, "messageId", msgId));
        } catch (Exception e) {
            Json.error(resp, 400, "Failed to send message: " + e.getMessage());
        }
    }
}
