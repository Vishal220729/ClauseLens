package com.clauselens.controller;

import com.clauselens.dao.AgreementDao;
import com.clauselens.dao.NotificationDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/agreements", "/api/agreements/detail", "/api/agreements/accept"})
public class AgreementServlet extends HttpServlet {

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
            if ("/api/agreements/detail".equals(path)) {
                String idStr = req.getParameter("id");
                if (idStr == null || idStr.isBlank()) {
                    Json.error(resp, 400, "Missing agreement id.");
                    return;
                }
                long agrId = Long.parseLong(idStr);
                Map<String, Object> detail = AgreementDao.getDetail(agrId);
                if (detail == null) {
                    Json.error(resp, 404, "Agreement not found.");
                    return;
                }
                Json.send(resp, 200, detail);
            } else {
                Json.send(resp, 200, AgreementDao.listForUser(userId, role));
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Agreement error: " + e.getMessage());
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
            if ("/api/agreements/accept".equals(path)) {
                long agreementId = ((Number) body.get("agreementId")).longValue();
                boolean ok = AgreementDao.recordAcceptance(agreementId, userId, role);
                Json.send(resp, 200, Map.of("ok", ok));
            } else {
                // Create draft agreement (Company)
                if (!"COMPANY".equals(role)) {
                    Json.error(resp, 403, "Only companies can draft agreements.");
                    return;
                }
                long jobId = ((Number) body.get("jobId")).longValue();
                long freelancerId = ((Number) body.get("freelancerId")).longValue();
                String title = String.valueOf(body.get("title"));
                String scope = String.valueOf(body.get("scope"));
                String deliverables = String.valueOf(body.get("deliverables"));
                BigDecimal amount = new BigDecimal(String.valueOf(body.get("totalAmount")));
                int advance = body.get("advancePercentage") != null ? ((Number) body.get("advancePercentage")).intValue() : 30;
                int dueDays = body.get("paymentDueDays") != null ? ((Number) body.get("paymentDueDays")).intValue() : 15;
                int revLimit = body.get("revisionLimit") != null ? ((Number) body.get("revisionLimit")).intValue() : 3;
                String maint = body.get("maintenanceTerms") != null ? String.valueOf(body.get("maintenanceTerms")) : "30 days warranty";
                String ip = body.get("ipTerms") != null ? String.valueOf(body.get("ipTerms")) : "Client owns deliverables upon full payment";
                String liab = body.get("liabilityTerms") != null ? String.valueOf(body.get("liabilityTerms")) : "Capped at total project amount";
                String juris = body.get("jurisdiction") != null ? String.valueOf(body.get("jurisdiction")) : "Mutual online arbitration";

                long agrId = AgreementDao.createDraft(jobId, userId, freelancerId, title, scope, deliverables, amount, advance, dueDays, revLimit, maint, ip, liab, juris);
                NotificationDao.create(freelancerId, "Agreement Draft Created",
                    "A new agreement draft \"" + title + "\" was prepared by the client with official corporate seal. Review clauses and sign.",
                    "AGREEMENT", "freelancer-dashboard.html#agreements");

                Json.send(resp, 201, Map.of("ok", true, "agreementId", agrId));
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Failed to process agreement: " + e.getMessage());
        }
    }
}
