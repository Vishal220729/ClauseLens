package com.clauselens.dao;

import com.clauselens.util.Db;
import com.clauselens.util.EmailService;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

public final class ApplicationDao {
    private ApplicationDao() {}

    public static List<Map<String, Object>> listByJob(long jobId, long companyId) throws SQLException {
        String sql = "SELECT a.id, a.job_id, a.freelancer_id, a.cover_letter, a.estimated_price, a.estimated_days, " +
                     "a.status, a.created_at, f.full_name, f.experience_level, f.skills, f.country, f.portfolio_url, " +
                     "f.description, u.email, " +
                     "(SELECT agr.id FROM agreements agr JOIN projects p ON agr.project_id = p.id WHERE p.job_id = a.job_id LIMIT 1) AS agreement_id, " +
                     "(SELECT agr.status FROM agreements agr JOIN projects p ON agr.project_id = p.id WHERE p.job_id = a.job_id LIMIT 1) AS agreement_status " +
                     "FROM applications a " +
                     "JOIN jobs j ON a.job_id = j.id " +
                     "JOIN freelancers f ON a.freelancer_id = f.user_id " +
                     "JOIN users u ON f.user_id = u.id " +
                     "WHERE a.job_id = ? AND j.company_id = ? " +
                     "ORDER BY a.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, jobId);
            ps.setLong(2, companyId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("jobId", rs.getLong("job_id"));
                    m.put("freelancerId", rs.getLong("freelancer_id"));
                    m.put("coverLetter", rs.getString("cover_letter"));
                    m.put("estimatedPrice", rs.getBigDecimal("estimated_price"));
                    m.put("estimatedDays", rs.getInt("estimated_days"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("fullName", rs.getString("full_name"));
                    m.put("experienceLevel", rs.getString("experience_level"));
                    m.put("skills", rs.getString("skills"));
                    m.put("country", rs.getString("country"));
                    m.put("portfolioUrl", rs.getString("portfolio_url"));
                    m.put("description", rs.getString("description"));
                    m.put("email", rs.getString("email"));
                    m.put("agreementId", rs.getObject("agreement_id") != null ? rs.getLong("agreement_id") : null);
                    m.put("agreementStatus", rs.getString("agreement_status"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listByFreelancer(long freelancerId) throws SQLException {
        String sql = "SELECT a.id, a.job_id, a.estimated_price, a.estimated_days, a.status, a.created_at, " +
                     "j.title, j.domain, j.budget, j.currency, c.company_name " +
                     "FROM applications a " +
                     "JOIN jobs j ON a.job_id = j.id " +
                     "JOIN companies c ON j.company_id = c.user_id " +
                     "WHERE a.freelancer_id = ? " +
                     "ORDER BY a.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("jobId", rs.getLong("job_id"));
                    m.put("estimatedPrice", rs.getBigDecimal("estimated_price"));
                    m.put("estimatedDays", rs.getInt("estimated_days"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("jobTitle", rs.getString("title"));
                    m.put("domain", rs.getString("domain"));
                    m.put("budget", rs.getBigDecimal("budget"));
                    m.put("currency", rs.getString("currency"));
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static boolean apply(long jobId, long freelancerId, String coverLetter, BigDecimal price, int days) throws SQLException {
        String sql = "INSERT INTO applications (job_id, freelancer_id, cover_letter, estimated_price, estimated_days, status) " +
                     "VALUES (?, ?, ?, ?, ?, 'SUBMITTED') " +
                     "ON DUPLICATE KEY UPDATE cover_letter = VALUES(cover_letter), estimated_price = VALUES(estimated_price), estimated_days = VALUES(estimated_days)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, jobId);
            ps.setLong(2, freelancerId);
            ps.setString(3, coverLetter);
            ps.setBigDecimal(4, price);
            ps.setInt(5, days);
            boolean ok = ps.executeUpdate() > 0;
            if (ok) {
                // Notify the hiring company with in-app notification & automated email
                String getComp = "SELECT j.company_id, j.title, f.full_name, u.email, c.company_name " +
                                 "FROM jobs j " +
                                 "JOIN users u ON j.company_id = u.id " +
                                 "JOIN companies c ON j.company_id = c.user_id " +
                                 "JOIN freelancers f ON f.user_id = ? " +
                                 "WHERE j.id = ?";
                try (PreparedStatement ps2 = c.prepareStatement(getComp)) {
                    ps2.setLong(1, freelancerId);
                    ps2.setLong(2, jobId);
                    try (ResultSet rs2 = ps2.executeQuery()) {
                        if (rs2.next()) {
                            long compId = rs2.getLong(1);
                            String jTitle = rs2.getString(2);
                            String flName = rs2.getString(3);
                            String compEmail = rs2.getString(4);
                            String compName = rs2.getString(5);

                            NotificationDao.create(compId, "New Proposal Received!",
                                flName + " submitted a bid of $" + price + " for '" + jTitle + "'.",
                                "APPLICATION", "company-dashboard.html#manage-jobs");

                            // Automated email dispatch to hiring client
                            EmailService.sendNewProposalReceived(compEmail, compName, flName, jTitle, price, days, coverLetter, jobId);
                        }
                    }
                } catch (Exception ignored) {}
            }
            return ok;
        }
    }

    public static boolean updateStatus(long applicationId, long companyId, String newStatus) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long jobId = 0;
                long freelancerId = 0;
                BigDecimal bidPrice = BigDecimal.ZERO;
                int bidDays = 0;
                String jobTitle = "";
                String companyName = "Company";
                String freelancerEmail = "";
                String freelancerName = "";

                String getJob = "SELECT a.job_id, a.freelancer_id, a.estimated_price, a.estimated_days, " +
                                "j.title, c.company_name, u.email, f.full_name " +
                                "FROM applications a " +
                                "JOIN jobs j ON a.job_id = j.id " +
                                "JOIN companies c ON j.company_id = c.user_id " +
                                "JOIN users u ON a.freelancer_id = u.id " +
                                "JOIN freelancers f ON a.freelancer_id = f.user_id " +
                                "WHERE a.id = ? AND j.company_id = ?";
                try (PreparedStatement ps = c.prepareStatement(getJob)) {
                    ps.setLong(1, applicationId);
                    ps.setLong(2, companyId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            jobId = rs.getLong(1);
                            freelancerId = rs.getLong(2);
                            bidPrice = rs.getBigDecimal(3);
                            bidDays = rs.getInt(4);
                            jobTitle = rs.getString(5);
                            companyName = rs.getString(6);
                            freelancerEmail = rs.getString(7);
                            freelancerName = rs.getString(8);
                        } else {
                            return false;
                        }
                    }
                }

                // Update application status
                String sql = "UPDATE applications SET status = ? WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(sql)) {
                    ps.setString(1, newStatus);
                    ps.setLong(2, applicationId);
                    ps.executeUpdate();
                }

                if ("ACCEPTED".equalsIgnoreCase(newStatus) && jobId > 0) {
                    // Update job status to HIRED
                    String updJob = "UPDATE jobs SET status = 'HIRED' WHERE id = ?";
                    try (PreparedStatement ps = c.prepareStatement(updJob)) {
                        ps.setLong(1, jobId);
                        ps.executeUpdate();
                    }
                    // Mark any other submitted applications for this job as REJECTED
                    String rejOthers = "UPDATE applications SET status = 'REJECTED' WHERE job_id = ? AND id != ? AND status = 'SUBMITTED'";
                    try (PreparedStatement ps = c.prepareStatement(rejOthers)) {
                        ps.setLong(1, jobId);
                        ps.setLong(2, applicationId);
                        ps.executeUpdate();
                    }

                    // In-app notification for candidate
                    NotificationDao.create(freelancerId, "Proposal Accepted! 🎉",
                        "Your proposal for '" + jobTitle + "' was accepted by " + companyName + "!",
                        "APPLICATION", "freelancer-dashboard.html#chat");

                    // Automated email dispatch to candidate
                    EmailService.sendProposalAccepted(freelancerEmail, freelancerName, companyName, jobTitle, bidPrice, bidDays, jobId);
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
