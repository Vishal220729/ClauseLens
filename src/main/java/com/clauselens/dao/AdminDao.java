package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class AdminDao {
    private AdminDao() {}

    public static Map<String, Object> getDashboardStats() throws SQLException {
        Map<String, Object> stats = new LinkedHashMap<>();
        try (Connection c = Db.get(); Statement st = c.createStatement()) {
            // User counts
            try (ResultSet rs = st.executeQuery("SELECT role, COUNT(*) FROM users GROUP BY role")) {
                int comps = 0, frees = 0;
                while (rs.next()) {
                    String r = rs.getString(1);
                    int cnt = rs.getInt(2);
                    if ("COMPANY".equalsIgnoreCase(r)) comps = cnt;
                    else if ("FREELANCER".equalsIgnoreCase(r)) frees = cnt;
                }
                stats.put("totalCompanies", comps);
                stats.put("totalFreelancers", frees);
            }

            // Job counts
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM jobs WHERE status = 'PUBLISHED'")) {
                stats.put("totalPublishedJobs", rs.next() ? rs.getInt(1) : 0);
            }

            // Application counts
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM applications")) {
                stats.put("totalApplications", rs.next() ? rs.getInt(1) : 0);
            }

            // Active projects
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM projects WHERE status = 'ACTIVE'")) {
                stats.put("activeProjects", rs.next() ? rs.getInt(1) : 0);
            }

            // Agreements
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM agreements")) {
                stats.put("totalAgreements", rs.next() ? rs.getInt(1) : 0);
            }

            // Analyses & Risk counts
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*), COALESCE(SUM(high_severity_count),0), COALESCE(SUM(medium_severity_count),0), COALESCE(SUM(low_severity_count),0) FROM contract_analyses")) {
                if (rs.next()) {
                    stats.put("totalAnalyses", rs.getInt(1));
                    stats.put("highSeverityCount", rs.getInt(2));
                    stats.put("mediumSeverityCount", rs.getInt(3));
                    stats.put("lowSeverityCount", rs.getInt(4));
                }
            }

            // Payments
            try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM payments WHERE status IN ('PENDING', 'OVERDUE')")) {
                stats.put("pendingPayments", rs.next() ? rs.getInt(1) : 0);
            }
        }
        return stats;
    }

    public static List<Map<String, Object>> listAllUsers() throws SQLException {
        String sql = "SELECT u.id, u.role, u.email, u.status, u.created_at, " +
                     "c.company_name, c.contact_person, c.industry, " +
                     "f.full_name, f.skills, f.experience_level, f.reward_points " +
                     "FROM users u " +
                     "LEFT JOIN companies c ON u.id = c.user_id " +
                     "LEFT JOIN freelancers f ON u.id = f.user_id " +
                     "WHERE u.role != 'ADMIN' ORDER BY u.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong("id"));
                m.put("role", rs.getString("role"));
                m.put("email", rs.getString("email"));
                m.put("status", rs.getString("status"));
                m.put("createdAt", rs.getTimestamp("created_at").toString());
                String r = rs.getString("role");
                if ("COMPANY".equalsIgnoreCase(r)) {
                    m.put("name", rs.getString("company_name"));
                    m.put("contactPerson", rs.getString("contact_person"));
                    m.put("details", rs.getString("industry"));
                } else {
                    m.put("name", rs.getString("full_name"));
                    m.put("details", rs.getString("skills"));
                    m.put("experienceLevel", rs.getString("experience_level"));
                    m.put("rewardPoints", rs.getInt("reward_points"));
                }
                list.add(m);
            }
        }
        return list;
    }

    public static void setUserStatus(long userId, String status) throws SQLException {
        String sql = "UPDATE users SET status = ? WHERE id = ? AND role != 'ADMIN'";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setLong(2, userId);
            ps.executeUpdate();
        }
    }

    public static List<Map<String, Object>> listAllAnalyses(String search) throws SQLException {
        StringBuilder sql = new StringBuilder(
            "SELECT ca.id, ca.agreement_id, ca.version_number, ca.original_filename, ca.policy_version, " +
            "ca.total_findings, ca.high_severity_count, ca.medium_severity_count, ca.low_severity_count, " +
            "ca.status, ca.created_at, f.full_name AS freelancer_name, comp.company_name " +
            "FROM contract_analyses ca " +
            "JOIN freelancers f ON ca.freelancer_id = f.user_id " +
            "LEFT JOIN companies comp ON ca.company_id = comp.user_id "
        );
        if (search != null && !search.isBlank()) {
            sql.append("WHERE ca.original_filename LIKE ? OR f.full_name LIKE ? OR comp.company_name LIKE ? ");
        }
        sql.append("ORDER BY ca.created_at DESC LIMIT 100");

        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql.toString())) {
            if (search != null && !search.isBlank()) {
                String q = "%" + search + "%";
                ps.setString(1, q);
                ps.setString(2, q);
                ps.setString(3, q);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("agreementId", rs.getLong("agreement_id"));
                    m.put("versionNumber", rs.getInt("version_number"));
                    m.put("originalFilename", rs.getString("original_filename"));
                    m.put("policyVersion", rs.getString("policy_version"));
                    m.put("totalFindings", rs.getInt("total_findings"));
                    m.put("highCount", rs.getInt("high_severity_count"));
                    m.put("mediumCount", rs.getInt("medium_severity_count"));
                    m.put("lowCount", rs.getInt("low_severity_count"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("freelancerName", rs.getString("freelancer_name"));
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listAuditLogs() throws SQLException {
        String sql = "SELECT al.id, al.actor_user_id, al.action, al.details, al.ip_address, al.created_at, " +
                     "u.email, u.role " +
                     "FROM audit_logs al " +
                     "LEFT JOIN users u ON al.actor_user_id = u.id " +
                     "ORDER BY al.created_at DESC LIMIT 100";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong("id"));
                m.put("actorId", rs.getLong("actor_user_id"));
                m.put("action", rs.getString("action"));
                m.put("details", rs.getString("details"));
                m.put("ipAddress", rs.getString("ip_address"));
                m.put("createdAt", rs.getTimestamp("created_at").toString());
                m.put("actorEmail", rs.getString("email"));
                m.put("actorRole", rs.getString("role"));
                list.add(m);
            }
        }
        return list;
    }

    public static List<String> listDomainTemplates() throws SQLException {
        List<String> list = new ArrayList<>();
        try (Connection c = Db.get(); Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT name FROM domain_templates ORDER BY name ASC")) {
            while (rs.next()) list.add(rs.getString("name"));
        }
        return list;
    }

    public static void addDomainTemplate(String name) throws SQLException {
        String sql = "INSERT IGNORE INTO domain_templates (name) VALUES (?)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, name);
            ps.executeUpdate();
        }
    }
}
