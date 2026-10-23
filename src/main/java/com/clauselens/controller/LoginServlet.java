package com.clauselens.controller;

import com.clauselens.dao.UserDao;
import com.clauselens.dao.UserDao.UserRow;
import com.clauselens.security.LoginThrottle;
import com.clauselens.security.PasswordUtil;
import com.clauselens.util.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;
import java.util.Optional;

@WebServlet("/api/login/*")
public class LoginServlet extends HttpServlet {
    private static final Map<String, String> ROLES = Map.of("admin", "ADMIN", "company", "COMPANY", "freelancer", "FREELANCER");
    private static final Map<String, String> HOME = Map.of("ADMIN", "admin-dashboard.html",
        "COMPANY", "company-dashboard.html", "FREELANCER", "freelancer-dashboard.html");
    private static final String BAD = "Email or password is incorrect for this portal.";

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getPathInfo() == null ? "" : req.getPathInfo().replace("/", "");
        String role = ROLES.get(path);
        if (role == null) { Json.error(resp, 404, "Unknown portal."); return; }
        try {
            Map<String, Object> b = Json.read(req);
            String email = Validate.str(b, "email", 3, 190, "Email").toLowerCase();
            Object p = b.get("password");
            String password = (p instanceof String s) ? s : "";
            String key = req.getRemoteAddr() + "|" + email;

            if (LoginThrottle.blocked(key)) { Json.error(resp, 429, "Too many attempts. Wait 10 minutes and try again."); return; }

            Optional<UserRow> found = UserDao.findByEmail(email);
            boolean roleMatches = found.isPresent() && (found.get().role().equals(role) || "ADMIN".equals(found.get().role()));
            boolean ok = roleMatches && PasswordUtil.verify(password, found.get().hash());
            if (found.isEmpty()) PasswordUtil.burn(password);
            if (!ok) {
                LoginThrottle.fail(key);
                UserDao.audit(null, "LOGIN_FAILED", role + " " + email, req.getRemoteAddr());
                Json.error(resp, 401, BAD);
                return;
            }
            UserRow u = found.get();
            if (!"ACTIVE".equals(u.status())) { Json.error(resp, 403, "This account is suspended. Contact support."); return; }

            LoginThrottle.success(key);
            HttpSession old = req.getSession(false);
            if (old != null) old.invalidate();                 // new session id on every login
            HttpSession s = req.getSession(true);
            s.setAttribute("userId", u.id());
            s.setAttribute("role", u.role());
            s.setMaxInactiveInterval(30 * 60);
            UserDao.audit(u.id(), "LOGIN", role, req.getRemoteAddr());
            Json.send(resp, 200, Map.of("role", u.role(), "redirect", HOME.get(u.role())));
        } catch (IllegalArgumentException e) {
            Json.error(resp, 400, e.getMessage());
        } catch (SQLException e) {
            getServletContext().log("Login failed", e);
            Json.error(resp, 500, "Sign-in is unavailable right now. Try again later.");
        }
    }
}
