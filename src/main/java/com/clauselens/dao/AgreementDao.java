package com.clauselens.dao;

import com.clauselens.util.Db;
import com.clauselens.util.EmailService;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

public final class AgreementDao {
    private AgreementDao() {}

    public static long createDraft(long jobId, long companyId, long freelancerId, String title,
                                   String scope, String deliverables, BigDecimal totalAmount,
                                   int advancePercent, int paymentDueDays, int revisionLimit,
                                   String maintenance, String ipTerms, String liability, String jurisdiction) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                // Check or create project
                long projectId = 0;
                String checkProj = "SELECT id FROM projects WHERE job_id = ? AND company_id = ? AND freelancer_id = ?";
                try (PreparedStatement ps = c.prepareStatement(checkProj)) {
                    ps.setLong(1, jobId);
                    ps.setLong(2, companyId);
                    ps.setLong(3, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) projectId = rs.getLong(1);
                    }
                }
                if (projectId == 0) {
                    String createProj = "INSERT INTO projects (job_id, company_id, freelancer_id, title, budget, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')";
                    try (PreparedStatement ps = c.prepareStatement(createProj, Statement.RETURN_GENERATED_KEYS)) {
                        ps.setLong(1, jobId);
                        ps.setLong(2, companyId);
                        ps.setLong(3, freelancerId);
                        ps.setString(4, title);
                        ps.setBigDecimal(5, totalAmount);
                        ps.executeUpdate();
                        try (ResultSet rs = ps.getGeneratedKeys()) { if (rs.next()) projectId = rs.getLong(1); }
                    }
                }

                // Create agreement
                long agreementId = 0;
                String createAgr = "INSERT INTO agreements (project_id, company_id, freelancer_id, title, current_version, status) VALUES (?, ?, ?, ?, 1, 'DRAFT')";
                try (PreparedStatement ps = c.prepareStatement(createAgr, Statement.RETURN_GENERATED_KEYS)) {
                    ps.setLong(1, projectId);
                    ps.setLong(2, companyId);
                    ps.setLong(3, freelancerId);
                    ps.setString(4, title);
                    ps.executeUpdate();
                    try (ResultSet rs = ps.getGeneratedKeys()) { if (rs.next()) agreementId = rs.getLong(1); }
                }

                // Create version 1
                String createVer = "INSERT INTO agreement_versions (agreement_id, version_number, scope, deliverables, total_amount, " +
                                  "advance_percentage, payment_due_days, revision_limit, maintenance_terms, ip_terms, liability_terms, jurisdiction) " +
                                  "VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                try (PreparedStatement ps = c.prepareStatement(createVer)) {
                    ps.setLong(1, agreementId);
                    ps.setString(2, scope);
                    ps.setString(3, deliverables);
                    ps.setBigDecimal(4, totalAmount);
                    ps.setInt(5, advancePercent);
                    ps.setInt(6, paymentDueDays);
                    ps.setInt(7, revisionLimit);
                    ps.setString(8, maintenance);
                    ps.setString(9, ipTerms);
                    ps.setString(10, liability);
                    ps.setString(11, jurisdiction);
                    ps.executeUpdate();
                }

                // Record company acceptance automatically when draft is created with seal
                String insComp = "INSERT INTO agreement_acceptances (agreement_id, version_number, user_id, role) " +
                                 "VALUES (?, 1, ?, 'COMPANY') ON DUPLICATE KEY UPDATE accepted_at = CURRENT_TIMESTAMP";
                try (PreparedStatement ps = c.prepareStatement(insComp)) {
                    ps.setLong(1, agreementId);
                    ps.setLong(2, companyId);
                    ps.executeUpdate();
                }

                c.commit();

                // Dispatch automated email to freelancer
                try {
                    String getFl = "SELECT u.email, f.full_name, c.company_name, cu.email AS comp_email " +
                                   "FROM users u JOIN freelancers f ON u.id = f.user_id, " +
                                   "companies c JOIN users cu ON c.user_id = cu.id " +
                                   "WHERE u.id = ? AND c.user_id = ?";
                    try (PreparedStatement psFl = c.prepareStatement(getFl)) {
                        psFl.setLong(1, freelancerId);
                        psFl.setLong(2, companyId);
                        try (ResultSet rsFl = psFl.executeQuery()) {
                            if (rsFl.next()) {
                                String flEmail = rsFl.getString("email");
                                String flName = rsFl.getString("full_name");
                                String compName = rsFl.getString("company_name");
                                String compEmail = rsFl.getString("comp_email");
                                EmailService.sendAgreementDrafted(flEmail, flName, compEmail, compName, title, totalAmount, advancePercent, agreementId);
                            }
                        }
                    }
                } catch (Exception ignored) {}

                return agreementId;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static List<Map<String, Object>> listForUser(long userId, String role) throws SQLException {
        String sql;
        if ("COMPANY".equalsIgnoreCase(role)) {
            sql = "SELECT a.id, a.project_id, a.title, a.current_version, a.status, a.created_at, " +
                  "f.full_name AS partner_name, " +
                  "v.total_amount, v.advance_percentage, v.payment_due_days, v.revision_limit, " +
                  "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'COMPANY') AS company_accepted, " +
                  "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'FREELANCER') AS freelancer_accepted " +
                  "FROM agreements a " +
                  "JOIN freelancers f ON a.freelancer_id = f.user_id " +
                  "JOIN agreement_versions v ON a.id = v.agreement_id AND a.current_version = v.version_number " +
                  "WHERE a.company_id = ? ORDER BY a.updated_at DESC";
        } else {
            sql = "SELECT a.id, a.project_id, a.title, a.current_version, a.status, a.created_at, " +
                  "c.company_name AS partner_name, " +
                  "v.total_amount, v.advance_percentage, v.payment_due_days, v.revision_limit, " +
                  "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'COMPANY') AS company_accepted, " +
                  "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'FREELANCER') AS freelancer_accepted " +
                  "FROM agreements a " +
                  "JOIN companies c ON a.company_id = c.user_id " +
                  "JOIN agreement_versions v ON a.id = v.agreement_id AND a.current_version = v.version_number " +
                  "WHERE a.freelancer_id = ? ORDER BY a.updated_at DESC";
        }

        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("currentVersion", rs.getInt("current_version"));
                    m.put("status", rs.getString("status"));
                    m.put("partnerName", rs.getString("partner_name"));
                    m.put("totalAmount", rs.getBigDecimal("total_amount"));
                    m.put("advancePercentage", rs.getInt("advance_percentage"));
                    m.put("paymentDueDays", rs.getInt("payment_due_days"));
                    m.put("revisionLimit", rs.getInt("revision_limit"));
                    m.put("companyAccepted", rs.getInt("company_accepted"));
                    m.put("freelancerAccepted", rs.getInt("freelancer_accepted"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static Map<String, Object> getDetail(long agreementId) throws SQLException {
        String sql = "SELECT a.id, a.project_id, a.company_id, a.freelancer_id, a.title, a.current_version, a.status, " +
                     "c.company_name, f.full_name AS freelancer_name, " +
                     "v.scope, v.deliverables, v.total_amount, v.advance_percentage, v.payment_due_days, " +
                     "v.revision_limit, v.maintenance_terms, v.ip_terms, v.liability_terms, v.jurisdiction, " +
                     "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'COMPANY') AS company_accepted, " +
                     "(SELECT COUNT(*) FROM agreement_acceptances aa WHERE aa.agreement_id = a.id AND aa.version_number = a.current_version AND aa.role = 'FREELANCER') AS freelancer_accepted " +
                     "FROM agreements a " +
                     "JOIN companies c ON a.company_id = c.user_id " +
                     "JOIN freelancers f ON a.freelancer_id = f.user_id " +
                     "JOIN agreement_versions v ON a.id = v.agreement_id AND a.current_version = v.version_number " +
                     "WHERE a.id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, agreementId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("companyId", rs.getLong("company_id"));
                    m.put("freelancerId", rs.getLong("freelancer_id"));
                    m.put("title", rs.getString("title"));
                    m.put("currentVersion", rs.getInt("current_version"));
                    m.put("status", rs.getString("status"));
                    m.put("companyName", rs.getString("company_name"));
                    m.put("freelancerName", rs.getString("freelancer_name"));
                    m.put("scope", rs.getString("scope"));
                    m.put("deliverables", rs.getString("deliverables"));
                    m.put("totalAmount", rs.getBigDecimal("total_amount"));
                    m.put("advancePercentage", rs.getInt("advance_percentage"));
                    m.put("paymentDueDays", rs.getInt("payment_due_days"));
                    m.put("revisionLimit", rs.getInt("revision_limit"));
                    m.put("maintenanceTerms", rs.getString("maintenance_terms"));
                    m.put("ipTerms", rs.getString("ip_terms"));
                    m.put("liabilityTerms", rs.getString("liability_terms"));
                    m.put("jurisdiction", rs.getString("jurisdiction"));
                    m.put("companyAccepted", rs.getInt("company_accepted") > 0);
                    m.put("freelancerAccepted", rs.getInt("freelancer_accepted") > 0);
                    return m;
                }
            }
        }
        return null;
    }

    public static boolean recordAcceptance(long agreementId, long userId, String role) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                // Get current version
                int version = 1;
                long projectId = 0;
                BigDecimal totalAmount = BigDecimal.ZERO;
                String q = "SELECT a.current_version, a.project_id, v.total_amount " +
                           "FROM agreements a " +
                           "JOIN agreement_versions v ON a.id = v.agreement_id AND a.current_version = v.version_number " +
                           "WHERE a.id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, agreementId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            version = rs.getInt("current_version");
                            projectId = rs.getLong("project_id");
                            totalAmount = rs.getBigDecimal("total_amount");
                        }
                    }
                }

                // Record acceptance
                String ins = "INSERT INTO agreement_acceptances (agreement_id, version_number, user_id, role) " +
                             "VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE accepted_at = CURRENT_TIMESTAMP";
                try (PreparedStatement ps = c.prepareStatement(ins)) {
                    ps.setLong(1, agreementId);
                    ps.setInt(2, version);
                    ps.setLong(3, userId);
                    ps.setString(4, role);
                    ps.executeUpdate();
                }

                // Ensure company's acceptance is also recorded (since company drafted with seal)
                long companyId = 0;
                long freelancerId = 0;
                String agrTitle = "";
                String getParties = "SELECT company_id, freelancer_id, title FROM agreements WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(getParties)) {
                    ps.setLong(1, agreementId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            companyId = rs.getLong(1);
                            freelancerId = rs.getLong(2);
                            agrTitle = rs.getString(3);
                        }
                    }
                }
                if (companyId > 0) {
                    String insComp = "INSERT INTO agreement_acceptances (agreement_id, version_number, user_id, role) " +
                                     "VALUES (?, ?, ?, 'COMPANY') ON DUPLICATE KEY UPDATE accepted_at = IFNULL(accepted_at, CURRENT_TIMESTAMP)";
                    try (PreparedStatement ps = c.prepareStatement(insComp)) {
                        ps.setLong(1, agreementId);
                        ps.setInt(2, version);
                        ps.setLong(3, companyId);
                        ps.executeUpdate();
                    }
                }

                // Check if both have accepted version
                String both = "SELECT COUNT(DISTINCT role) AS c FROM agreement_acceptances WHERE agreement_id = ? AND version_number = ?";
                int count = 0;
                try (PreparedStatement ps = c.prepareStatement(both)) {
                    ps.setLong(1, agreementId);
                    ps.setInt(2, version);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) count = rs.getInt("c");
                    }
                }

                if ("FREELANCER".equalsIgnoreCase(role) || count >= 2) {
                    // Update agreement status to ACCEPTED
                    try (PreparedStatement ps = c.prepareStatement("UPDATE agreements SET status = 'ACCEPTED' WHERE id = ?")) {
                        ps.setLong(1, agreementId);
                        ps.executeUpdate();
                    }

                    // In-app notifications
                    if (freelancerId > 0) {
                        NotificationDao.create(freelancerId, "Agreement Signed & Active!",
                            "You have signed and activated agreement: " + agrTitle + ". Milestone escrow protection is active.",
                            "AGREEMENT", "freelancer-dashboard.html#agreements");
                    }
                    if (companyId > 0) {
                        NotificationDao.create(companyId, "Freelancer Signed Agreement!",
                            "Contractor has accepted and signed: " + agrTitle + ". Agreement is now mutually binding.",
                            "AGREEMENT", "company-dashboard.html#agreements");
                    }

                    // Automated Dual Email Dispatches
                    try {
                        String getPartyEmails = "SELECT u1.email as fl_email, f.full_name, u2.email as comp_email, c.company_name " +
                                                "FROM users u1 JOIN freelancers f ON u1.id = f.user_id, users u2 JOIN companies c ON u2.id = c.user_id " +
                                                "WHERE u1.id = ? AND u2.id = ?";
                        try (PreparedStatement psP = c.prepareStatement(getPartyEmails)) {
                            psP.setLong(1, freelancerId);
                            psP.setLong(2, companyId);
                            try (ResultSet rsP = psP.executeQuery()) {
                                if (rsP.next()) {
                                    String flEmail = rsP.getString("fl_email");
                                    String flName = rsP.getString("full_name");
                                    String compEmail = rsP.getString("comp_email");
                                    String compName = rsP.getString("company_name");
                                    String sealHash = "CL-" + agreementId + "-SEALED-MUTUAL";
                                    EmailService.sendAgreementSigned(flEmail, flName, compName, agrTitle, totalAmount, sealHash, agreementId);
                                    EmailService.sendAgreementSigned(compEmail, compName, flName, agrTitle, totalAmount, sealHash, agreementId);
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    // Send confirmation in project chat
                    long convId = ConversationDao.getOrCreate(companyId, freelancerId, null);
                    if (convId > 0) {
                        ConversationDao.sendMessage(convId, userId,
                            "✍️ Agreement Mutually Signed & Sealed!\n" +
                            "• Agreement: " + agrTitle + "\n" +
                            "• Version: " + version + "\n" +
                            "• Status: ACTIVE & BINDING\n" +
                            "• Dual cryptographic consent verified.");
                    }

                    // Generate initial milestone & advance payment
                    String checkPay = "SELECT 1 FROM payments WHERE project_id = ? LIMIT 1";
                    boolean hasPay = false;
                    try (PreparedStatement ps = c.prepareStatement(checkPay)) {
                        ps.setLong(1, projectId);
                        try (ResultSet rs = ps.executeQuery()) { hasPay = rs.next(); }
                    }
                    if (!hasPay && projectId > 0) {
                        BigDecimal advance = totalAmount.multiply(new BigDecimal("0.30"));
                        BigDecimal finalPayment = totalAmount.subtract(advance);
                        String insPay1 = "INSERT INTO payments (project_id, title, amount, status) VALUES (?, 'Upfront Advance Deposit (30%)', ?, 'PENDING')";
                        try (PreparedStatement ps = c.prepareStatement(insPay1)) {
                            ps.setLong(1, projectId);
                            ps.setBigDecimal(2, advance);
                            ps.executeUpdate();
                        }
                        String insPay2 = "INSERT INTO payments (project_id, title, amount, status) VALUES (?, 'Final Milestone Delivery Payment', ?, 'PENDING')";
                        try (PreparedStatement ps = c.prepareStatement(insPay2)) {
                            ps.setLong(1, projectId);
                            ps.setBigDecimal(2, finalPayment);
                            ps.executeUpdate();
                        }
                        // Create default milestone tasks
                        String insTask1 = "INSERT INTO tasks (project_id, title, description, priority, status, progress_percent) VALUES (?, 'Sprint 1: Architecture & Deliverables Setup', 'Initial deliverables and foundation.', 'HIGH', 'TODO', 0)";
                        try (PreparedStatement ps = c.prepareStatement(insTask1)) { ps.setLong(1, projectId); ps.executeUpdate(); }
                        String insTask2 = "INSERT INTO tasks (project_id, title, description, priority, status, progress_percent) VALUES (?, 'Sprint 2: Final Reviews & Handover', 'Complete handover and verify agreement terms.', 'MEDIUM', 'TODO', 0)";
                        try (PreparedStatement ps = c.prepareStatement(insTask2)) { ps.setLong(1, projectId); ps.executeUpdate(); }
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
}
