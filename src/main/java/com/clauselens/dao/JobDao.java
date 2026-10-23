package com.clauselens.dao;

import com.clauselens.util.Db;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

public final class JobDao {
    private JobDao() {}

    public static List<Map<String, Object>> listPublished(String domain, String search) throws SQLException {
        StringBuilder sql = new StringBuilder(
            "SELECT j.id, j.company_id, j.title, j.description, j.domain, j.skills, j.budget, j.currency, " +
            "j.advance_percentage, j.deadline, j.status, j.created_at, c.company_name, c.country " +
            "FROM jobs j " +
            "JOIN companies c ON j.company_id = c.user_id " +
            "WHERE j.status = 'PUBLISHED' "
        );
        List<Object> params = new ArrayList<>();
        if (domain != null && !domain.isBlank() && !"All".equalsIgnoreCase(domain)) {
            sql.append("AND j.domain = ? ");
            params.add(domain);
        }
        if (search != null && !search.isBlank()) {
            sql.append("AND (j.title LIKE ? OR j.skills LIKE ? OR j.description LIKE ?) ");
            String q = "%" + search + "%";
            params.add(q);
            params.add(q);
            params.add(q);
        }
        sql.append("ORDER BY j.created_at DESC");

        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql.toString())) {
            for (int i = 0; i < params.size(); i++) {
                ps.setObject(i + 1, params.get(i));
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("companyId", rs.getLong("company_id"));
                    m.put("title", rs.getString("title"));
                    m.put("description", rs.getString("description"));
                    m.put("domain", rs.getString("domain"));
                    m.put("skills", rs.getString("skills"));
                    m.put("budget", rs.getBigDecimal("budget"));
                    m.put("currency", rs.getString("currency"));
                    m.put("advancePercentage", rs.getInt("advance_percentage"));
                    m.put("deadline", rs.getDate("deadline") != null ? rs.getDate("deadline").toString() : null);
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("companyName", rs.getString("company_name"));
                    m.put("country", rs.getString("country"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listByCompany(long companyId) throws SQLException {
        String sql = "SELECT j.id, j.title, j.description, j.domain, j.skills, j.budget, j.currency, " +
                     "j.advance_percentage, j.deadline, j.status, j.created_at, " +
                     "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count, " +
                     "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'ACCEPTED') AS accepted_count, " +
                     "(SELECT a.freelancer_id FROM applications a WHERE a.job_id = j.id AND a.status = 'ACCEPTED' LIMIT 1) AS accepted_freelancer_id, " +
                     "(SELECT f.full_name FROM applications a JOIN freelancers f ON a.freelancer_id = f.user_id WHERE a.job_id = j.id AND a.status = 'ACCEPTED' LIMIT 1) AS hired_freelancer_name, " +
                     "(SELECT agr.id FROM agreements agr JOIN projects p ON agr.project_id = p.id WHERE p.job_id = j.id LIMIT 1) AS agreement_id, " +
                     "(SELECT agr.status FROM agreements agr JOIN projects p ON agr.project_id = p.id WHERE p.job_id = j.id LIMIT 1) AS agreement_status " +
                     "FROM jobs j WHERE j.company_id = ? ORDER BY j.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, companyId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("title", rs.getString("title"));
                    m.put("description", rs.getString("description"));
                    m.put("domain", rs.getString("domain"));
                    m.put("skills", rs.getString("skills"));
                    m.put("budget", rs.getBigDecimal("budget"));
                    m.put("currency", rs.getString("currency"));
                    m.put("advancePercentage", rs.getInt("advance_percentage"));
                    m.put("deadline", rs.getDate("deadline") != null ? rs.getDate("deadline").toString() : null);
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("applicantCount", rs.getInt("applicant_count"));
                    m.put("hasAcceptedApp", rs.getInt("accepted_count") > 0);
                    m.put("acceptedFreelancerId", rs.getObject("accepted_freelancer_id") != null ? rs.getLong("accepted_freelancer_id") : null);
                    m.put("hiredFreelancerName", rs.getString("hired_freelancer_name"));
                    m.put("agreementId", rs.getObject("agreement_id") != null ? rs.getLong("agreement_id") : null);
                    m.put("agreementStatus", rs.getString("agreement_status"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static long createJob(long companyId, String title, String description, String domain,
                                 String skills, BigDecimal budget, int advancePercent,
                                 String deadline, String revisions, String maintenance) throws SQLException {
        String sql = "INSERT INTO jobs (company_id, title, description, domain, skills, budget, advance_percentage, " +
                     "deadline, revision_requirements, maintenance_requirements, status) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, companyId);
            ps.setString(2, title);
            ps.setString(3, description);
            ps.setString(4, domain);
            ps.setString(5, skills);
            ps.setBigDecimal(6, budget);
            ps.setInt(7, advancePercent);
            if (deadline != null && !deadline.isBlank()) {
                ps.setDate(8, java.sql.Date.valueOf(deadline));
            } else {
                ps.setNull(8, Types.DATE);
            }
            ps.setString(9, revisions);
            ps.setString(10, maintenance);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getLong(1);
            }
        }
        return 0;
    }

    public static void updateStatus(long jobId, long companyId, String status) throws SQLException {
        String sql = "UPDATE jobs SET status = ? WHERE id = ? AND company_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setLong(2, jobId);
            ps.setLong(3, companyId);
            ps.executeUpdate();
        }
    }
}
