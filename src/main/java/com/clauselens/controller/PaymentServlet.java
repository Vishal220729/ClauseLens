package com.clauselens.controller;

import com.clauselens.dao.PaymentDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

@WebServlet(urlPatterns = {
    "/api/payments",
    "/api/payments/company",
    "/api/payments/confirm",
    "/api/payments/reminder",
    "/api/payments/pay",
    "/api/payments/razorpay/create-order",
    "/api/wallet",
    "/api/wallet/withdraw"
})
public class PaymentServlet extends HttpServlet {

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
            if ("/api/wallet".equals(path)) {
                if (!"FREELANCER".equalsIgnoreCase(role)) {
                    Json.error(resp, 403, "Wallet is only accessible to freelancers.");
                    return;
                }
                Json.send(resp, 200, PaymentDao.getWalletInfo(userId));
            } else if ("/api/payments/company".equals(path)) {
                Json.send(resp, 200, PaymentDao.listForCompany(userId));
            } else {
                String projIdStr = req.getParameter("projectId");
                if (projIdStr != null && !projIdStr.isBlank()) {
                    long projId = Long.parseLong(projIdStr);
                    Json.send(resp, 200, PaymentDao.listByProject(projId));
                } else if ("FREELANCER".equalsIgnoreCase(role)) {
                    Json.send(resp, 200, PaymentDao.listForFreelancer(userId));
                } else {
                    Json.send(resp, 200, PaymentDao.listForCompany(userId));
                }
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Payment query error: " + e.getMessage());
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
            if ("/api/wallet/withdraw".equals(path)) {
                if (!"FREELANCER".equalsIgnoreCase(role)) {
                    Json.error(resp, 403, "Only freelancers can request withdrawals.");
                    return;
                }
                Object amtObj = body.get("amount");
                if (amtObj == null) {
                    Json.error(resp, 400, "Withdrawal amount is required.");
                    return;
                }
                java.math.BigDecimal amount = new java.math.BigDecimal(String.valueOf(amtObj));
                String payoutMethod = body.get("payoutMethod") != null ? String.valueOf(body.get("payoutMethod")) : "BANK_TRANSFER";
                String accountInfo = body.get("accountInfo") != null ? String.valueOf(body.get("accountInfo")) : "";
                
                Map<String, Object> res = PaymentDao.processWithdrawal(userId, amount, payoutMethod, accountInfo);
                Json.send(resp, 200, res);
            } else if ("/api/payments/pay".equals(path)) {
                long paymentId = ((Number) body.get("paymentId")).longValue();
                String method = body.get("paymentMethod") != null ? String.valueOf(body.get("paymentMethod")) : "DIRECT_RELEASE";
                String notes = body.get("notes") != null ? String.valueOf(body.get("notes")) : "Direct Escrow Release";
                String txnRef = body.get("transactionRef") != null ? String.valueOf(body.get("transactionRef")) : null;
                Map<String, Object> res = PaymentDao.processCompanyPayment(paymentId, userId, method, notes, txnRef);
                Json.send(resp, 200, res);
            } else if ("/api/payments/razorpay/create-order".equals(path)) {
                long paymentId = ((Number) body.get("paymentId")).longValue();
                Map<String, Object> order = PaymentDao.createRazorpayOrder(paymentId, userId);
                Json.send(resp, 200, order);
            } else if ("/api/payments/confirm".equals(path)) {
                long paymentId = ((Number) body.get("paymentId")).longValue();
                boolean received = Boolean.TRUE.equals(body.get("received"));
                boolean ok = PaymentDao.confirmPaymentReceived(paymentId, userId, received);
                Json.send(resp, 200, Map.of("ok", ok));
            } else if ("/api/payments/reminder".equals(path)) {
                long paymentId = ((Number) body.get("paymentId")).longValue();
                String message = String.valueOf(body.get("messageDraft"));
                boolean ok = PaymentDao.approveAndSendReminder(paymentId, userId, message);
                Json.send(resp, 200, Map.of("ok", ok));
            } else {
                Json.error(resp, 404, "Endpoint not found.");
            }
        } catch (IllegalArgumentException e) {
            Json.error(resp, 400, e.getMessage());
        } catch (Exception e) {
            Json.error(resp, 400, "Payment operation error: " + e.getMessage());
        }
    }
}
