package com.clauselens.controller;

import com.clauselens.dao.AdminDao;
import com.clauselens.dao.UserDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(urlPatterns = {
    "/api/admin/stats",
    "/api/admin/users",
    "/api/admin/user-status",
    "/api/admin/analyses",
    "/api/admin/audit-logs",
    "/api/admin/domains"
})
public class AdminServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"ADMIN".equals(s.getAttribute("role"))) {
            Json.error(resp, 403, "Administrator privilege required.");
            return;
        }

        String path = req.getServletPath();
        try {
            switch (path) {
                case "/api/admin/stats" -> Json.send(resp, 200, AdminDao.getDashboardStats());
                case "/api/admin/users" -> Json.send(resp, 200, AdminDao.listAllUsers());
                case "/api/admin/analyses" -> {
                    String search = req.getParameter("search");
                    Json.send(resp, 200, AdminDao.listAllAnalyses(search));
                }
                case "/api/admin/audit-logs" -> Json.send(resp, 200, AdminDao.listAuditLogs());
                case "/api/admin/domains" -> Json.send(resp, 200, AdminDao.listDomainTemplates());
                default -> Json.error(resp, 404, "Unknown endpoint.");
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Admin query failed: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"ADMIN".equals(s.getAttribute("role"))) {
            Json.error(resp, 403, "Administrator privilege required.");
            return;
        }
        long adminId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);
            if ("/api/admin/user-status".equals(path)) {
                long targetUserId = ((Number) body.get("userId")).longValue();
                String status = String.valueOf(body.get("status"));
                AdminDao.setUserStatus(targetUserId, status);
                UserDao.audit(adminId, "USER_STATUS_CHANGE", "User ID: " + targetUserId + " set to " + status, req.getRemoteAddr());
                Json.send(resp, 200, Map.of("ok", true));
            } else if ("/api/admin/domains".equals(path)) {
                String name = String.valueOf(body.get("name")).trim();
                if (!name.isEmpty()) {
                    AdminDao.addDomainTemplate(name);
                    UserDao.audit(adminId, "DOMAIN_TEMPLATE_ADD", "Added: " + name, req.getRemoteAddr());
                }
                Json.send(resp, 200, Map.of("ok", true));
            } else {
                Json.error(resp, 404, "Unknown admin action.");
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Admin operation failed: " + e.getMessage());
        }
    }
}
