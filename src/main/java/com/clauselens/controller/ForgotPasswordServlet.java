package com.clauselens.controller;

import com.clauselens.dao.UserDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@WebServlet("/api/forgot-password")
public class ForgotPasswordServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            Map<String, Object> body = Json.read(req);
            String email = String.valueOf(body.get("email")).trim().toLowerCase();
            Optional<UserDao.UserRow> user = UserDao.findByEmail(email);

            if (user.isPresent()) {
                String token = UUID.randomUUID().toString().replace("-", "");
                // In dev mode, log the reset email securely
                System.out.println("[ClauseLens EMAIL-DEV-MODE] Password reset requested for: " + email);
                System.out.println("[ClauseLens EMAIL-DEV-MODE] Reset Link: http://localhost:8080/clauselens/reset-password.html?token=" + token);
                UserDao.audit(user.get().id(), "FORGOT_PASSWORD_REQUEST", "Reset token generated", req.getRemoteAddr());
            }

            // Always respond with success to prevent email enumeration
            Json.send(resp, 200, Map.of(
                "ok", true,
                "message", "If an account exists with this email address, password reset instructions have been dispatched."
            ));
        } catch (Exception e) {
            Json.error(resp, 400, "Invalid request: " + e.getMessage());
        }
    }
}
