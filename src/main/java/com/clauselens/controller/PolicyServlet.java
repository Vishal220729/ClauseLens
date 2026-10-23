package com.clauselens.controller;

import com.clauselens.dao.PolicyDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/policies", "/api/policies/rule", "/api/policies/toggle", "/api/policies/delete"})
public class PolicyServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"FREELANCER".equals(s.getAttribute("role"))) {
            Json.error(resp, 401, "Freelancer login required.");
            return;
        }
        long freelancerId = (Long) s.getAttribute("userId");
        try {
            Json.send(resp, 200, PolicyDao.getRules(freelancerId));
        } catch (Exception e) {
            Json.error(resp, 500, "Error loading policy rules: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"FREELANCER".equals(s.getAttribute("role"))) {
            Json.error(resp, 401, "Freelancer login required.");
            return;
        }
        long freelancerId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);
            if ("/api/policies/toggle".equals(path)) {
                long ruleId = ((Number) body.get("ruleId")).longValue();
                boolean enabled = Boolean.TRUE.equals(body.get("isEnabled"));
                PolicyDao.toggleRule(ruleId, freelancerId, enabled);
                Json.send(resp, 200, Map.of("ok", true));
            } else if ("/api/policies/delete".equals(path)) {
                long ruleId = ((Number) body.get("ruleId")).longValue();
                PolicyDao.deleteRule(ruleId, freelancerId);
                Json.send(resp, 200, Map.of("ok", true));
            } else {
                // Add or update rule
                Long ruleId = body.get("ruleId") != null ? ((Number) body.get("ruleId")).longValue() : null;
                String category = String.valueOf(body.get("category"));
                String ruleName = String.valueOf(body.get("ruleName"));
                String expectedValue = String.valueOf(body.get("expectedValue"));
                String operator = body.get("operator") != null ? String.valueOf(body.get("operator")) : "<=";
                String unit = body.get("unit") != null ? String.valueOf(body.get("unit")) : "days";
                String severity = body.get("severity") != null ? String.valueOf(body.get("severity")) : "MEDIUM";

                long id = PolicyDao.addOrUpdateRule(freelancerId, ruleId, category, ruleName, expectedValue, operator, unit, severity);
                Json.send(resp, 200, Map.of("ok", true, "ruleId", id));
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Policy update error: " + e.getMessage());
        }
    }
}
