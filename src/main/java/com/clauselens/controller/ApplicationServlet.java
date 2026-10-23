package com.clauselens.controller;

import com.clauselens.dao.ApplicationDao;
import com.clauselens.dao.ConversationDao;
import com.clauselens.dao.NotificationDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/applications", "/api/applications/status"})
public class ApplicationServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");
        String role = (String) s.getAttribute("role");

        try {
            if ("COMPANY".equals(role)) {
                String jobIdStr = req.getParameter("jobId");
                if (jobIdStr == null || jobIdStr.isBlank()) {
                    Json.error(resp, 400, "Missing jobId parameter.");
                    return;
                }
                long jobId = Long.parseLong(jobIdStr);
                Json.send(resp, 200, ApplicationDao.listByJob(jobId, userId));
            } else {
                // Freelancer proposals
                Json.send(resp, 200, ApplicationDao.listByFreelancer(userId));
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Error loading applications: " + e.getMessage());
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
        String role = (String) s.getAttribute("role");
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);
            if ("/api/applications/status".equals(path)) {
                if (!"COMPANY".equals(role)) {
                    Json.error(resp, 403, "Company authorization required.");
                    return;
                }
                long appId = ((Number) body.get("applicationId")).longValue();
                String status = String.valueOf(body.get("status"));
                boolean ok = ApplicationDao.updateStatus(appId, userId, status);

                if (ok && "ACCEPTED".equalsIgnoreCase(status)) {
                    // Open conversation
                    if (body.get("freelancerId") != null && body.get("jobId") != null) {
                        long fId = ((Number) body.get("freelancerId")).longValue();
                        long jId = ((Number) body.get("jobId")).longValue();
                        long convId = ConversationDao.getOrCreate(userId, fId, jId);
                        ConversationDao.sendMessage(convId, userId, "Congratulations! Your proposal has been accepted. Let's discuss agreement details.");
                        NotificationDao.create(fId, "Proposal Accepted!", "Your proposal was accepted by the client. Check your project chat.", "APPLICATION", "freelancer-dashboard.html#chat");
                    }
                }
                Json.send(resp, 200, Map.of("ok", ok));
            } else {
                // Freelancer apply
                if (!"FREELANCER".equals(role)) {
                    Json.error(resp, 403, "Only freelancers can submit proposals.");
                    return;
                }
                long jobId = ((Number) body.get("jobId")).longValue();
                String cover = String.valueOf(body.get("coverLetter"));
                BigDecimal price = new BigDecimal(String.valueOf(body.get("estimatedPrice")));
                int days = body.get("estimatedDays") != null ? ((Number) body.get("estimatedDays")).intValue() : 14;

                boolean ok = ApplicationDao.apply(jobId, userId, cover, price, days);
                Json.send(resp, 201, Map.of("ok", ok));
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Application error: " + e.getMessage());
        }
    }
}
