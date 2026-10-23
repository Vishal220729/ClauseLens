package com.clauselens.controller;

import com.clauselens.dao.UserDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

/** GET /api/me returns the signed-in user. POST /api/logout ends the session. */
@WebServlet(urlPatterns = {"/api/me", "/api/logout"})
public class SessionServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) { Json.error(resp, 401, "Not signed in."); return; }
        long id = (Long) s.getAttribute("userId");
        String role = (String) s.getAttribute("role");
        try {
            java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
            out.put("id", id);
            out.put("role", role);
            out.put("name", UserDao.displayName(id, role));
            if ("FREELANCER".equals(role)) {
                out.put("rewardPoints", UserDao.freelancerPoints(id));
                out.put("walletBalance", UserDao.freelancerWalletBalance(id));
            }
            Json.send(resp, 200, out);
        } catch (SQLException e) {
            Json.error(resp, 500, "Could not load your profile.");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        if (!"/api/logout".equals(req.getServletPath())) { Json.error(resp, 405, "Method not allowed."); return; }
        HttpSession s = req.getSession(false);
        if (s != null) {
            Object id = s.getAttribute("userId");
            if (id != null) UserDao.audit((Long) id, "LOGOUT", "", req.getRemoteAddr());
            s.invalidate();
        }
        Json.send(resp, 200, Map.of("ok", true));
    }
}
