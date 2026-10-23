package com.clauselens.dao;

import com.clauselens.util.Db;
import com.clauselens.util.EmailService;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

public final class PaymentDao {
    private PaymentDao() {}

    public static List<Map<String, Object>> listByProject(long projectId) throws SQLException {
        String sql = "SELECT p.id, p.project_id, p.title, p.amount, p.currency, p.due_date, p.status, " +
                     "p.freelancer_confirmed_at, p.created_at, " +
                     "(SELECT message_draft FROM payment_reminders pr WHERE pr.payment_id = p.id ORDER BY pr.created_at DESC LIMIT 1) AS reminder_draft, " +
                     "(SELECT is_approved FROM payment_reminders pr WHERE pr.payment_id = p.id ORDER BY pr.created_at DESC LIMIT 1) AS reminder_approved " +
                     "FROM payments p WHERE p.project_id = ? ORDER BY p.created_at ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, projectId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("amount", rs.getBigDecimal("amount"));
                    m.put("currency", rs.getString("currency"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("status", rs.getString("status"));
                    m.put("confirmedAt", rs.getTimestamp("freelancer_confirmed_at") != null ? rs.getTimestamp("freelancer_confirmed_at").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("reminderDraft", rs.getString("reminder_draft"));
                    m.put("reminderApproved", rs.getBoolean("reminder_approved"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listForCompany(long companyId) throws SQLException {
        String sql = "SELECT p.id, p.project_id, p.title, p.amount, p.currency, p.status, p.paid_at, " +
                     "p.payment_method, p.transaction_ref, p.task_id, p.due_date, p.created_at, " +
                     "proj.title AS project_title, f.full_name AS freelancer_name, " +
                     "(SELECT t.title FROM tasks t WHERE t.id = p.task_id) AS task_title, " +
                     "(SELECT t.status FROM tasks t WHERE t.id = p.task_id) AS task_status " +
                     "FROM payments p " +
                     "JOIN projects proj ON p.project_id = proj.id " +
                     "JOIN freelancers f ON proj.freelancer_id = f.user_id " +
                     "WHERE proj.company_id = ? ORDER BY p.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, companyId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("amount", rs.getBigDecimal("amount"));
                    m.put("currency", rs.getString("currency"));
                    m.put("status", rs.getString("status"));
                    m.put("paidAt", rs.getTimestamp("paid_at") != null ? rs.getTimestamp("paid_at").toString() : null);
                    m.put("paymentMethod", rs.getString("payment_method"));
                    m.put("transactionRef", rs.getString("transaction_ref"));
                    m.put("taskId", rs.getLong("task_id"));
                    m.put("taskTitle", rs.getString("task_title"));
                    m.put("taskStatus", rs.getString("task_status"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("projectTitle", rs.getString("project_title"));
                    m.put("freelancerName", rs.getString("freelancer_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listForFreelancer(long freelancerId) throws SQLException {
        String sql = "SELECT p.id, p.project_id, p.title, p.amount, p.currency, p.status, p.paid_at, " +
                     "p.payment_method, p.transaction_ref, p.task_id, p.due_date, p.freelancer_confirmed_at, p.created_at, " +
                     "proj.title AS project_title, c.company_name, " +
                     "(SELECT t.title FROM tasks t WHERE t.id = p.task_id) AS task_title, " +
                     "(SELECT t.status FROM tasks t WHERE t.id = p.task_id) AS task_status " +
                     "FROM payments p " +
                     "JOIN projects proj ON p.project_id = proj.id " +
                     "JOIN companies c ON proj.company_id = c.user_id " +
                     "WHERE proj.freelancer_id = ? ORDER BY p.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("amount", rs.getBigDecimal("amount"));
                    m.put("currency", rs.getString("currency"));
                    m.put("status", rs.getString("status"));
                    m.put("paidAt", rs.getTimestamp("paid_at") != null ? rs.getTimestamp("paid_at").toString() : null);
                    m.put("paymentMethod", rs.getString("payment_method"));
                    m.put("transactionRef", rs.getString("transaction_ref"));
                    m.put("taskId", rs.getLong("task_id"));
                    m.put("taskTitle", rs.getString("task_title"));
                    m.put("taskStatus", rs.getString("task_status"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("confirmedAt", rs.getTimestamp("freelancer_confirmed_at") != null ? rs.getTimestamp("freelancer_confirmed_at").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("projectTitle", rs.getString("project_title"));
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static boolean confirmPaymentReceived(long paymentId, long freelancerId, boolean received) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long projectId = 0;
                long companyId = 0;
                String title = "";
                BigDecimal amount = BigDecimal.ZERO;

                String q = "SELECT p.project_id, p.title, p.amount, proj.company_id " +
                           "FROM payments p " +
                           "JOIN projects proj ON p.project_id = proj.id " +
                           "WHERE p.id = ? AND proj.freelancer_id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, paymentId);
                    ps.setLong(2, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectId = rs.getLong(1);
                            title = rs.getString(2);
                            amount = rs.getBigDecimal(3);
                            companyId = rs.getLong(4);
                        } else {
                            return false;
                        }
                    }
                }

                if (received) {
                    // Update status to RECEIVED
                    String upd = "UPDATE payments SET status = 'RECEIVED', freelancer_confirmed_at = CURRENT_TIMESTAMP WHERE id = ?";
                    try (PreparedStatement ps = c.prepareStatement(upd)) {
                        ps.setLong(1, paymentId);
                        ps.executeUpdate();
                    }

                    // Award reward points for confirmed settlement
                    int pts = 100;
                    String insRew = "INSERT INTO reward_transactions (freelancer_id, project_id, points, reason) VALUES (?, ?, ?, ?)";
                    try (PreparedStatement ps = c.prepareStatement(insRew)) {
                        ps.setLong(1, freelancerId);
                        ps.setLong(2, projectId);
                        ps.setInt(3, pts);
                        ps.setString(4, "Payment Confirmed Received: " + title + " ($" + amount + ")");
                        ps.executeUpdate();
                    }
                    String updPts = "UPDATE freelancers SET reward_points = reward_points + ? WHERE user_id = ?";
                    try (PreparedStatement ps = c.prepareStatement(updPts)) {
                        ps.setInt(1, pts);
                        ps.setLong(2, freelancerId);
                        ps.executeUpdate();
                    }

                    // Notify company
                    NotificationDao.create(companyId, "Payment Received Confirmed",
                        "Freelancer confirmed receipt of payment: " + title + " ($" + amount + ")", "PAYMENT", "/company-dashboard.html");

                } else {
                    // Freelancer answered NO: keep pending / overdue, generate reminder draft!
                    String upd = "UPDATE payments SET status = 'OVERDUE' WHERE id = ?";
                    try (PreparedStatement ps = c.prepareStatement(upd)) {
                        ps.setLong(1, paymentId);
                        ps.executeUpdate();
                    }

                    // Generate professional polite payment reminder draft
                    String draft = "Hi,\n\nI am writing to politely follow up regarding the payment for \"" + title +
                                   "\" in the amount of $" + amount + ". As our project milestone has been completed according to our agreement terms, could you please review and confirm the status of this transfer?\n\nThank you for your prompt attention!\n\nBest regards";

                    String insRem = "INSERT INTO payment_reminders (payment_id, project_id, sender_id, recipient_id, reminder_type, message_draft, is_approved) " +
                                   "VALUES (?, ?, ?, ?, 'PAYMENT_NOT_RECEIVED', ?, FALSE)";
                    try (PreparedStatement ps = c.prepareStatement(insRem)) {
                        ps.setLong(1, paymentId);
                        ps.setLong(2, projectId);
                        ps.setLong(3, freelancerId);
                        ps.setLong(4, companyId);
                        ps.setString(5, draft);
                        ps.executeUpdate();
                    }
                }

                c.commit();
                return true;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static boolean approveAndSendReminder(long paymentId, long freelancerId, String approvedMessage) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long companyId = 0;
                String companyEmail = "";
                String companyName = "Client";
                String freelancerName = "Freelancer";
                String q = "SELECT proj.company_id, u.email, comp.company_name, f.full_name " +
                           "FROM payments p " +
                           "JOIN projects proj ON p.project_id = proj.id " +
                           "JOIN companies comp ON proj.company_id = comp.user_id " +
                           "JOIN users u ON comp.user_id = u.id " +
                           "JOIN freelancers f ON proj.freelancer_id = f.user_id " +
                           "WHERE p.id = ? AND proj.freelancer_id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, paymentId);
                    ps.setLong(2, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            companyId = rs.getLong(1);
                            companyEmail = rs.getString(2);
                            companyName = rs.getString(3);
                            freelancerName = rs.getString(4);
                        } else return false;
                    }
                }

                String upd = "UPDATE payment_reminders SET is_approved = TRUE, message_draft = ?, sent_at = CURRENT_TIMESTAMP WHERE payment_id = ?";
                try (PreparedStatement ps = c.prepareStatement(upd)) {
                    ps.setString(1, approvedMessage);
                    ps.setLong(2, paymentId);
                    ps.executeUpdate();
                }

                // Send in-app notification & chat message to company
                NotificationDao.create(companyId, "Payment Reminder from Freelancer",
                    approvedMessage.length() > 150 ? approvedMessage.substring(0, 147) + "..." : approvedMessage,
                    "PAYMENT", "company-dashboard.html#payments");

                // Also post message in conversation
                long convId = ConversationDao.getOrCreate(companyId, freelancerId, null);
                if (convId > 0) {
                    ConversationDao.sendMessage(convId, freelancerId, "[Payment Reminder]:\n" + approvedMessage);
                }

                c.commit();

                // Send automated email reminder to hiring client
                if (companyEmail != null && !companyEmail.isBlank()) {
                    EmailService.sendCustomEmail("escrow@clauselens.com", companyEmail, companyName,
                        "Payment Milestone Reminder from " + freelancerName,
                        approvedMessage, "Review Milestone in ClauseLens →", "http://localhost:8080/clauselens/company-dashboard.html#payments");
                }

                return true;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static Map<String, Object> createRazorpayOrder(long paymentId, long companyId) throws SQLException {
        try (Connection c = Db.get()) {
            String q = "SELECT p.project_id, p.title, p.amount, p.currency, p.task_id, proj.freelancer_id, comp.company_name, u.email " +
                       "FROM payments p " +
                       "JOIN projects proj ON p.project_id = proj.id " +
                       "JOIN companies comp ON proj.company_id = comp.user_id " +
                       "JOIN users u ON comp.user_id = u.id " +
                       "WHERE p.id = ? AND proj.company_id = ?";
            try (PreparedStatement ps = c.prepareStatement(q)) {
                ps.setLong(1, paymentId);
                ps.setLong(2, companyId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        long projectId = rs.getLong(1);
                        String title = rs.getString(2);
                        BigDecimal amount = rs.getBigDecimal(3);
                        String currency = rs.getString(4);
                        long taskId = rs.getLong(5);
                        long freelancerId = rs.getLong(6);
                        String companyName = rs.getString(7);
                        String companyEmail = rs.getString(8);

                        BigDecimal inrRate = new BigDecimal("83.00");
                        BigDecimal inrAmount = "USD".equalsIgnoreCase(currency) ? amount.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP) : amount;
                        long amountPaise = inrAmount.multiply(new BigDecimal("100")).longValue();

                        String orderId = "order_rzp_" + System.currentTimeMillis() + "_" + (int)(Math.random() * 9000 + 1000);
                        String keyId = System.getenv("RAZORPAY_KEY_ID");
                        if (keyId == null || keyId.isBlank()) {
                            keyId = "rzp_test_ClauseLensEscrowDemo";
                        }

                        Map<String, Object> order = new LinkedHashMap<>();
                        order.put("orderId", orderId);
                        order.put("keyId", keyId);
                        order.put("paymentId", paymentId);
                        order.put("title", title);
                        order.put("amountUsd", amount);
                        order.put("amountInr", inrAmount);
                        order.put("amountPaise", amountPaise);
                        order.put("currency", "INR");
                        order.put("companyName", companyName);
                        order.put("companyEmail", companyEmail);
                        order.put("freelancerId", freelancerId);
                        order.put("projectId", projectId);
                        order.put("taskId", taskId);
                        return order;
                    } else {
                        throw new SQLException("Payment milestone not found or company not authorized.");
                    }
                }
            }
        }
    }

    public static Map<String, Object> processCompanyPayment(long paymentId, long companyId, String paymentMethod, String notes) throws SQLException {
        return processCompanyPayment(paymentId, companyId, paymentMethod, notes, null);
    }

    public static Map<String, Object> processCompanyPayment(long paymentId, long companyId, String paymentMethod, String notes, String customTxnRef) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long projectId = 0;
                long freelancerId = 0;
                long taskId = 0;
                String title = "";
                BigDecimal amount = BigDecimal.ZERO;
                String currency = "USD";
                String companyName = "Client";
                String projectTitle = "Project Deliverables";
                String freelancerName = "Freelancer";
                String freelancerEmail = "";
                String companyEmail = "";

                String q = "SELECT p.project_id, p.title, p.amount, p.currency, p.task_id, proj.freelancer_id, comp.company_name, " +
                           "proj.title AS project_title, f.full_name, u.email, cu.email AS comp_email " +
                           "FROM payments p " +
                           "JOIN projects proj ON p.project_id = proj.id " +
                           "JOIN companies comp ON proj.company_id = comp.user_id " +
                           "JOIN users cu ON comp.user_id = cu.id " +
                           "JOIN freelancers f ON proj.freelancer_id = f.user_id " +
                           "JOIN users u ON proj.freelancer_id = u.id " +
                           "WHERE p.id = ? AND proj.company_id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, paymentId);
                    ps.setLong(2, companyId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectId = rs.getLong(1);
                            title = rs.getString(2);
                            amount = rs.getBigDecimal(3);
                            currency = rs.getString(4);
                            taskId = rs.getLong(5);
                            freelancerId = rs.getLong(6);
                            companyName = rs.getString(7);
                            projectTitle = rs.getString(8);
                            freelancerName = rs.getString(9);
                            freelancerEmail = rs.getString(10);
                            companyEmail = rs.getString(11);
                        } else {
                            throw new SQLException("Payment record not found or company not authorized.");
                        }
                    }
                }

                String txnRef = (customTxnRef != null && !customTxnRef.isBlank())
                    ? customTxnRef.trim()
                    : "TXN-REL-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 9000 + 1000);
                String method = (paymentMethod != null && !paymentMethod.isBlank()) ? paymentMethod : "DIRECT_RELEASE";

                BigDecimal inrRate = new BigDecimal("83.00");
                BigDecimal inrAmount = "USD".equalsIgnoreCase(currency) ? amount.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP) : amount;

                // Update payment record to PAID
                String upd = "UPDATE payments SET status = 'PAID', paid_at = CURRENT_TIMESTAMP, payment_method = ?, " +
                             "transaction_ref = ?, freelancer_confirmed_at = CURRENT_TIMESTAMP WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(upd)) {
                    ps.setString(1, method);
                    ps.setString(2, txnRef);
                    ps.setLong(3, paymentId);
                    ps.executeUpdate();
                }

                // If linked to a task, ensure task is marked COMPLETED
                if (taskId > 0) {
                    try (PreparedStatement ps = c.prepareStatement("UPDATE tasks SET status = 'COMPLETED', progress_percent = 100, completed_at = IFNULL(completed_at, CURRENT_TIMESTAMP) WHERE id = ?")) {
                        ps.setLong(1, taskId);
                        ps.executeUpdate();
                    }
                }

                // Award settlement reward points to freelancer (+200 pts)
                int pts = 200;
                String insRew = "INSERT INTO reward_transactions (freelancer_id, project_id, points, reason) VALUES (?, ?, ?, ?)";
                try (PreparedStatement ps = c.prepareStatement(insRew)) {
                    ps.setLong(1, freelancerId);
                    ps.setLong(2, projectId);
                    ps.setInt(3, pts);
                    ps.setString(4, "Milestone Payment Disbursed: " + title + " ($" + amount + " / ₹" + inrAmount + ")");
                    ps.executeUpdate();
                }
                String updPts = "UPDATE freelancers SET reward_points = reward_points + ? WHERE user_id = ?";
                try (PreparedStatement ps = c.prepareStatement(updPts)) {
                    ps.setInt(1, pts);
                    ps.setLong(2, freelancerId);
                    ps.executeUpdate();
                }

                // Credit Freelancer Wallet Balance
                String updWallet = "UPDATE freelancers SET wallet_balance = wallet_balance + ? WHERE user_id = ?";
                try (PreparedStatement ps = c.prepareStatement(updWallet)) {
                    ps.setBigDecimal(1, amount);
                    ps.setLong(2, freelancerId);
                    ps.executeUpdate();
                }

                // In-app Notification for freelancer
                NotificationDao.create(freelancerId, "Milestone Payment Added to Wallet! ($" + amount + " / ₹" + inrAmount + ")",
                    "Client " + companyName + " has released milestone payment of $" + amount + " " + currency + " (₹" + inrAmount + " INR) for: " + title + ". Funds have been credited to your ClauseLens Wallet and are ready for withdrawal. Ref: " + txnRef,
                    "PAYMENT", "freelancer-dashboard.html#payments");

                // In-app Notification for company
                NotificationDao.create(companyId, "Milestone Payment Released ($" + amount + ")",
                    "Successfully released milestone payment of $" + amount + " " + currency + " (₹" + inrAmount + " INR) to freelancer. Ref: " + txnRef,
                    "PAYMENT", "company-dashboard.html#payments");

                // Post in conversation
                long convId = ConversationDao.getOrCreate(companyId, freelancerId, null);
                if (convId > 0) {
                    ConversationDao.sendMessage(convId, companyId,
                        "🎉 Milestone Payment Released!\n" +
                        "• Amount: $" + amount + " " + currency + " (₹" + inrAmount + " INR)\n" +
                        "• Milestone: " + title + "\n" +
                        "• Method: Escrow Release\n" +
                        "• Transaction Ref: " + txnRef + "\n" +
                        "• Status: PAID & Credited to Freelancer Wallet.");
                }

                c.commit();

                // Dispatch automated branded payment release receipt email to freelancer
                if (freelancerEmail != null && !freelancerEmail.isBlank()) {
                    EmailService.sendPaymentReleased(freelancerEmail, freelancerName, companyEmail, companyName,
                        projectTitle, title, amount, inrAmount, txnRef, paymentId);
                }

                Map<String, Object> out = new LinkedHashMap<>();
                out.put("ok", true);
                out.put("paymentId", paymentId);
                out.put("transactionRef", txnRef);
                out.put("amount", amount);
                out.put("currency", currency);
                out.put("amountInr", inrAmount);
                out.put("paymentMethod", method);
                out.put("status", "PAID");
                return out;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    // -------------------------------------------------------------
    // WALLET & WITHDRAWAL OPERATIONS
    // -------------------------------------------------------------

    public static Map<String, Object> getWalletInfo(long freelancerId) throws SQLException {
        BigDecimal balance = BigDecimal.ZERO;
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement("SELECT wallet_balance FROM freelancers WHERE user_id = ?")) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    balance = rs.getBigDecimal(1) != null ? rs.getBigDecimal(1) : BigDecimal.ZERO;
                }
            }
        }

        BigDecimal totalEarned = BigDecimal.ZERO;
        String sqlEarned = "SELECT IFNULL(SUM(p.amount), 0.00) FROM payments p " +
                           "JOIN projects pr ON p.project_id = pr.id " +
                           "WHERE pr.freelancer_id = ? AND p.status IN ('PAID', 'RECEIVED')";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sqlEarned)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    totalEarned = rs.getBigDecimal(1) != null ? rs.getBigDecimal(1) : BigDecimal.ZERO;
                }
            }
        }

        BigDecimal totalWithdrawn = BigDecimal.ZERO;
        String sqlWithdrawn = "SELECT IFNULL(SUM(amount), 0.00) FROM withdrawals WHERE freelancer_id = ? AND status = 'COMPLETED'";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sqlWithdrawn)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    totalWithdrawn = rs.getBigDecimal(1) != null ? rs.getBigDecimal(1) : BigDecimal.ZERO;
                }
            }
        }

        BigDecimal inrRate = new BigDecimal("83.00");
        BigDecimal balanceInr = balance.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal earnedInr = totalEarned.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal withdrawnInr = totalWithdrawn.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP);

        List<Map<String, Object>> withdrawals = new ArrayList<>();
        String sqlW = "SELECT id, amount, currency, amount_inr, payout_method, account_info, status, transaction_ref, created_at " +
                      "FROM withdrawals WHERE freelancer_id = ? ORDER BY created_at DESC";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sqlW)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> w = new LinkedHashMap<>();
                    w.put("id", rs.getLong("id"));
                    w.put("amount", rs.getBigDecimal("amount"));
                    w.put("currency", rs.getString("currency"));
                    w.put("amountInr", rs.getBigDecimal("amount_inr"));
                    w.put("payoutMethod", rs.getString("payout_method"));
                    w.put("accountInfo", rs.getString("account_info"));
                    w.put("status", rs.getString("status"));
                    w.put("transactionRef", rs.getString("transaction_ref"));
                    w.put("createdAt", rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toString() : null);
                    withdrawals.add(w);
                }
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("walletBalance", balance);
        out.put("walletBalanceInr", balanceInr);
        out.put("totalEarned", totalEarned);
        out.put("totalEarnedInr", earnedInr);
        out.put("totalWithdrawn", totalWithdrawn);
        out.put("totalWithdrawnInr", withdrawnInr);
        out.put("withdrawals", withdrawals);
        return out;
    }

    public static Map<String, Object> processWithdrawal(long freelancerId, BigDecimal amount, String payoutMethod, String accountInfo) throws SQLException {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than 0.");
        }
        if (payoutMethod == null || payoutMethod.isBlank()) {
            throw new IllegalArgumentException("Payout method is required.");
        }
        if (accountInfo == null || accountInfo.isBlank()) {
            throw new IllegalArgumentException("Account details or UPI ID are required.");
        }

        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                BigDecimal currentBalance = BigDecimal.ZERO;
                String checkSql = "SELECT wallet_balance FROM freelancers WHERE user_id = ? FOR UPDATE";
                try (PreparedStatement ps = c.prepareStatement(checkSql)) {
                    ps.setLong(1, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            currentBalance = rs.getBigDecimal(1) != null ? rs.getBigDecimal(1) : BigDecimal.ZERO;
                        } else {
                            throw new IllegalArgumentException("Freelancer account not found.");
                        }
                    }
                }

                if (amount.compareTo(currentBalance) > 0) {
                    throw new IllegalArgumentException("Insufficient wallet balance. Available: $" + currentBalance);
                }

                BigDecimal newBalance = currentBalance.subtract(amount);
                String updBal = "UPDATE freelancers SET wallet_balance = ? WHERE user_id = ?";
                try (PreparedStatement ps = c.prepareStatement(updBal)) {
                    ps.setBigDecimal(1, newBalance);
                    ps.setLong(2, freelancerId);
                    ps.executeUpdate();
                }

                BigDecimal inrRate = new BigDecimal("83.00");
                BigDecimal amountInr = amount.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP);
                String txnRef = "WDR-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();

                String insW = "INSERT INTO withdrawals (freelancer_id, amount, currency, amount_inr, payout_method, account_info, status, transaction_ref) " +
                             "VALUES (?, ?, 'USD', ?, ?, ?, 'COMPLETED', ?)";
                try (PreparedStatement ps = c.prepareStatement(insW)) {
                    ps.setLong(1, freelancerId);
                    ps.setBigDecimal(2, amount);
                    ps.setBigDecimal(3, amountInr);
                    ps.setString(4, payoutMethod);
                    ps.setString(5, accountInfo);
                    ps.setString(6, txnRef);
                    ps.executeUpdate();
                }

                NotificationDao.create(freelancerId, "Withdrawal Successful! ($" + amount + " / ₹" + amountInr + ")",
                    "Your payout of $" + amount + " USD (₹" + amountInr + " INR) via " + payoutMethod + " has been processed successfully. Ref: " + txnRef,
                    "PAYMENT", "freelancer-dashboard.html#payments");

                // Query freelancer contact details for email notification
                String flEmail = "";
                String flName = "Valued Freelancer";
                try (PreparedStatement psFl = c.prepareStatement("SELECT u.email, f.full_name FROM users u JOIN freelancers f ON u.id = f.user_id WHERE u.id = ?")) {
                    psFl.setLong(1, freelancerId);
                    try (ResultSet rsFl = psFl.executeQuery()) {
                        if (rsFl.next()) {
                            flEmail = rsFl.getString(1);
                            flName = rsFl.getString(2);
                        }
                    }
                } catch (Exception ignored) {}

                c.commit();

                // Dispatch automated payout receipt email
                if (flEmail != null && !flEmail.isBlank()) {
                    EmailService.sendWithdrawalProcessed(flEmail, flName, amount, amountInr, payoutMethod, txnRef);
                }

                Map<String, Object> out = new LinkedHashMap<>();
                out.put("ok", true);
                out.put("transactionRef", txnRef);
                out.put("amount", amount);
                out.put("currency", "USD");
                out.put("amountInr", amountInr);
                out.put("payoutMethod", payoutMethod);
                out.put("accountInfo", accountInfo);
                out.put("status", "COMPLETED");
                out.put("newBalance", newBalance);
                out.put("newBalanceInr", newBalance.multiply(inrRate).setScale(2, java.math.RoundingMode.HALF_UP));
                return out;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }
}
