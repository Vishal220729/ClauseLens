package com.clauselens.controller;

import com.clauselens.dao.EmailDao;
import com.clauselens.dao.UserDao;
import com.clauselens.util.EmailService;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;

@WebServlet(urlPatterns = {
    "/api/emails",
    "/api/emails/recent",
    "/api/emails/detail",
    "/api/emails/send",
    "/api/emails/instant-send",
    "/api/emails/auto-draft",
    "/api/emails/config",
    "/api/emails/test-gmail"
})
public class EmailServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            if ("/api/emails/config".equals(path)) {
                String u = EmailDao.getConfig("gmail_smtp_user", "");
                String p = EmailDao.getConfig("gmail_smtp_password", "");
                boolean hasEnv = (System.getenv("GMAIL_SMTP_USER") != null && !System.getenv("GMAIL_SMTP_USER").isBlank());
                Json.send(resp, 200, Map.of(
                    "gmailUser", !u.isBlank() ? u : (hasEnv ? System.getenv("GMAIL_SMTP_USER") : ""),
                    "isConfigured", (!p.isBlank() || hasEnv),
                    "authMethod", "Google App Password (smtp.gmail.com:465)"
                ));
                return;
            }

            if ("/api/emails/detail".equals(path)) {
                String idStr = req.getParameter("id");
                if (idStr == null || idStr.isBlank()) {
                    Json.error(resp, 400, "Email ID required.");
                    return;
                }
                long emailId = Long.parseLong(idStr);
                Map<String, Object> email = EmailDao.getById(emailId);
                if (email == null) {
                    Json.error(resp, 404, "Email record not found.");
                    return;
                }
                Json.send(resp, 200, email);
            } else {
                // List recent emails for user (admins see all)
                String role = (String) s.getAttribute("role");
                Optional<UserDao.UserRow> user = UserDao.findById(userId);
                String userEmail = user.map(UserDao.UserRow::email).orElse("");
                List<Map<String, Object>> list = "ADMIN".equals(role) ? EmailDao.listRecent(null, 50) : EmailDao.listRecent(userEmail, 30);
                Json.send(resp, 200, list);
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Failed to load email activity: " + e.getMessage());
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
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);

            if ("/api/emails/config".equals(path)) {
                String gmailUser = String.valueOf(body.get("gmailUser")).trim();
                String appPass = String.valueOf(body.get("gmailAppPassword")).trim();
                if (!gmailUser.isBlank()) {
                    EmailDao.setConfig("gmail_smtp_user", gmailUser);
                }
                if (!appPass.isBlank()) {
                    EmailDao.setConfig("gmail_smtp_password", appPass);
                }
                Json.send(resp, 200, Map.of("ok", true, "message", "Gmail SMTP configuration saved successfully!"));
                return;
            }

            if ("/api/emails/test-gmail".equals(path)) {
                String testTo = String.valueOf(body.get("targetEmail")).trim();
                if (testTo.isBlank()) {
                    Optional<UserDao.UserRow> user = UserDao.findById(userId);
                    testTo = user.map(UserDao.UserRow::email).orElse("");
                }
                if (testTo.isBlank()) {
                    Json.error(resp, 400, "Recipient email is required for SMTP test.");
                    return;
                }

                com.clauselens.util.GmailSmtpClient.SendResult res = EmailService.testGmailConnection(testTo);
                if (res.success()) {
                    Json.send(resp, 200, Map.of("ok", true, "message", res.message(), "serverResponse", res.serverResponse()));
                } else {
                    Json.error(resp, 400, res.message());
                }
                return;
            }

            if ("/api/emails/auto-draft".equals(path)) {
                String type = String.valueOf(body.get("type"));
                String partnerName = String.valueOf(body.get("partnerName"));
                String projectTitle = String.valueOf(body.get("projectTitle"));

                Map<String, String> draft = generateAutoDraft(type, partnerName, projectTitle);
                Json.send(resp, 200, draft);
                return;
            }

            if ("/api/emails/send".equals(path)) {
                String recipientEmail = String.valueOf(body.get("recipientEmail")).trim();
                String recipientName = String.valueOf(body.get("recipientName")).trim();
                String subject = String.valueOf(body.get("subject")).trim();
                String message = String.valueOf(body.get("message")).trim();
                String actionTitle = body.get("actionTitle") != null ? String.valueOf(body.get("actionTitle")) : null;
                String actionUrl = body.get("actionUrl") != null ? String.valueOf(body.get("actionUrl")) : null;

                if (recipientEmail.isBlank() || subject.isBlank() || message.isBlank()) {
                    Json.error(resp, 400, "Recipient email, subject, and message are required.");
                    return;
                }

                Optional<UserDao.UserRow> sender = UserDao.findById(userId);
                String senderEmail = sender.map(UserDao.UserRow::email).orElse("notifications@clauselens.com");

                EmailService.sendCustomEmail(senderEmail, recipientEmail, recipientName, subject, message, actionTitle, actionUrl);
                Json.send(resp, 200, Map.of("ok", true, "message", "Email successfully dispatched to " + recipientEmail));
                return;
            }

            if ("/api/emails/instant-send".equals(path)) {
                String type = body.get("type") != null ? String.valueOf(body.get("type")).trim() : "GENERAL_UPDATE";
                String recipientEmail = body.get("recipientEmail") != null ? String.valueOf(body.get("recipientEmail")).trim() : "";
                String recipientName = body.get("recipientName") != null ? String.valueOf(body.get("recipientName")).trim() : "Partner";
                String projectTitle = body.get("projectTitle") != null ? String.valueOf(body.get("projectTitle")).trim() : "Contract Project";

                if (recipientEmail.isBlank()) {
                    recipientEmail = recipientName.toLowerCase().replaceAll("[^a-z0-9]", "") + "@gmail.com";
                }

                Map<String, String> draft = generateAutoDraft(type, recipientName, projectTitle);
                String subject = draft.getOrDefault("subject", "ClauseLens Update: " + projectTitle);
                String message = draft.getOrDefault("message", "Automated project communication.");

                Optional<UserDao.UserRow> sender = UserDao.findById(userId);
                String senderEmail = sender.map(UserDao.UserRow::email).orElse("notifications@clauselens.com");

                EmailService.sendCustomEmail(senderEmail, recipientEmail, recipientName, subject, message, "Open ClauseLens Dashboard →", EmailService.APP_URL);
                Json.send(resp, 200, Map.of(
                    "ok", true,
                    "recipientEmail", recipientEmail,
                    "recipientName", recipientName,
                    "subject", subject,
                    "message", "Email automatically sent to " + recipientEmail
                ));
                return;
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Email operation failed: " + e.getMessage());
        }
    }

    private Map<String, String> generateAutoDraft(String type, String partnerName, String projectTitle) {
        String pName = (partnerName != null && !partnerName.isBlank() && !"null".equals(partnerName)) ? partnerName : "Colleague";
        String pTitle = (projectTitle != null && !projectTitle.isBlank() && !"null".equals(projectTitle)) ? projectTitle : "our project";

        Map<String, String> out = new HashMap<>();

        if ("CONTRACT_REMINDER".equalsIgnoreCase(type)) {
            out.put("subject", "Action Required: Review & Sign Agreement for '" + pTitle + "'");
            out.put("message", "Dear " + pName + ",\n\n" +
                "I hope this message finds you well. The service agreement for '" + pTitle + "' has been drafted and corporate sealed on ClauseLens.\n\n" +
                "Please take a few moments to review the terms and complete your digital signature so we can activate escrow and begin project deliverables.\n\n" +
                "Looking forward to collaborating with you!\n\nBest regards,\nClauseLens Project Lead");
        } else if ("PAYMENT_INQUIRY".equalsIgnoreCase(type)) {
            out.put("subject", "Milestone Deliverables Delivered - Payment Review for '" + pTitle + "'");
            out.put("message", "Dear " + pName + ",\n\n" +
                "The agreed milestone deliverables for '" + pTitle + "' have been completed and submitted for your inspection.\n\n" +
                "Please review the submitted files in your ClauseLens dashboard and proceed with the milestone escrow release at your earliest convenience.\n\n" +
                "Thank you for your ongoing partnership!\n\nBest regards,\nVerified Contractor");
        } else if ("HALFWAY_CHECKIN".equalsIgnoreCase(type)) {
            out.put("subject", "50% Halfway Progress Checkpoint Update: '" + pTitle + "'");
            out.put("message", "Dear " + pName + ",\n\n" +
                "We have achieved 50% milestone progress on '" + pTitle + "'. The core modules and initial architectures are functioning as expected.\n\n" +
                "Everything remains on schedule for the target delivery date. Please let us know if you have any feedback.\n\nBest regards,\nProject Team");
        } else {
            out.put("subject", "Project Update Regarding '" + pTitle + "'");
            out.put("message", "Dear " + pName + ",\n\n" +
                "I am writing to share a brief update on '" + pTitle + "'. Everything is progressing smoothly according to our agreed terms.\n\n" +
                "Feel free to reply directly or ping via the ClauseLens project chatbox.\n\nBest regards,\nClauseLens Partner");
        }
        return out;
    }
}
