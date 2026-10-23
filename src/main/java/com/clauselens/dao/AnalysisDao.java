package com.clauselens.dao;

import com.clauselens.analysis.ContractAiProvider;
import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class AnalysisDao {
    private AnalysisDao() {}

    public static long saveAnalysis(long freelancerId, Long agreementId, Long companyId, String originalFilename,
                                    ContractAiProvider.AnalysisResult result) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                // Determine version number
                int ver = 1;
                if (agreementId != null && agreementId > 0) {
                    String verSql = "SELECT COUNT(*) FROM contract_analyses WHERE agreement_id = ?";
                    try (PreparedStatement ps = c.prepareStatement(verSql)) {
                        ps.setLong(1, agreementId);
                        try (ResultSet rs = ps.executeQuery()) {
                            if (rs.next()) ver = rs.getInt(1) + 1;
                        }
                    }
                }

                String insAnalysis = "INSERT INTO contract_analyses (agreement_id, version_number, company_id, freelancer_id, " +
                                     "original_filename, policy_version, total_findings, high_severity_count, " +
                                     "medium_severity_count, low_severity_count, status) " +
                                     "VALUES (?, ?, ?, ?, ?, 'v1.0', ?, ?, ?, ?, 'COMPLETED')";
                long analysisId = 0;
                try (PreparedStatement ps = c.prepareStatement(insAnalysis, Statement.RETURN_GENERATED_KEYS)) {
                    if (agreementId != null) ps.setLong(1, agreementId); else ps.setNull(1, Types.BIGINT);
                    ps.setInt(2, ver);
                    if (companyId != null) ps.setLong(3, companyId); else ps.setNull(3, Types.BIGINT);
                    ps.setLong(4, freelancerId);
                    ps.setString(5, originalFilename);
                    ps.setInt(6, result.totalFindings());
                    ps.setInt(7, result.highCount());
                    ps.setInt(8, result.mediumCount());
                    ps.setInt(9, result.lowCount());
                    ps.executeUpdate();
                    try (ResultSet rs = ps.getGeneratedKeys()) {
                        if (rs.next()) analysisId = rs.getLong(1);
                    }
                }

                // Insert risk findings
                String insFinding = "INSERT INTO risk_findings (analysis_id, title, severity, category, exact_quote, " +
                                    "clause_reference, policy_rule, simple_explanation, potential_impact, " +
                                    "suggested_negotiation, is_verified, resolution_status) " +
                                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')";
                try (PreparedStatement ps = c.prepareStatement(insFinding)) {
                    for (ContractAiProvider.Finding f : result.findings()) {
                        ps.setLong(1, analysisId);
                        ps.setString(2, f.title());
                        ps.setString(3, f.severity());
                        ps.setString(4, f.category());
                        ps.setString(5, f.exactQuote());
                        ps.setString(6, f.clauseReference());
                        ps.setString(7, f.policyRule());
                        ps.setString(8, f.simpleExplanation());
                        ps.setString(9, f.potentialImpact());
                        ps.setString(10, f.suggestedNegotiation());
                        ps.setBoolean(11, f.isVerified());
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }

                c.commit();
                return analysisId;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static List<Map<String, Object>> listForFreelancer(long freelancerId) throws SQLException {
        String sql = "SELECT ca.id, ca.agreement_id, ca.version_number, ca.original_filename, ca.total_findings, " +
                     "ca.high_severity_count, ca.medium_severity_count, ca.low_severity_count, ca.status, ca.created_at, " +
                     "comp.company_name " +
                     "FROM contract_analyses ca " +
                     "LEFT JOIN companies comp ON ca.company_id = comp.user_id " +
                     "WHERE ca.freelancer_id = ? ORDER BY ca.created_at DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("agreementId", rs.getLong("agreement_id"));
                    m.put("versionNumber", rs.getInt("version_number"));
                    m.put("originalFilename", rs.getString("original_filename"));
                    m.put("totalFindings", rs.getInt("total_findings"));
                    m.put("highCount", rs.getInt("high_severity_count"));
                    m.put("mediumCount", rs.getInt("medium_severity_count"));
                    m.put("lowCount", rs.getInt("low_severity_count"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static Map<String, Object> getDetail(long analysisId) throws SQLException {
        String sql = "SELECT ca.id, ca.agreement_id, ca.version_number, ca.company_id, ca.freelancer_id, " +
                     "ca.original_filename, ca.policy_version, ca.total_findings, ca.high_severity_count, " +
                     "ca.medium_severity_count, ca.low_severity_count, ca.status, ca.created_at, " +
                     "f.full_name AS freelancer_name, comp.company_name " +
                     "FROM contract_analyses ca " +
                     "JOIN freelancers f ON ca.freelancer_id = f.user_id " +
                     "LEFT JOIN companies comp ON ca.company_id = comp.user_id " +
                     "WHERE ca.id = ?";
        Map<String, Object> out = new LinkedHashMap<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, analysisId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    out.put("id", rs.getLong("id"));
                    out.put("agreementId", rs.getLong("agreement_id"));
                    out.put("versionNumber", rs.getInt("version_number"));
                    out.put("originalFilename", rs.getString("original_filename"));
                    out.put("totalFindings", rs.getInt("total_findings"));
                    out.put("highCount", rs.getInt("high_severity_count"));
                    out.put("mediumCount", rs.getInt("medium_severity_count"));
                    out.put("lowCount", rs.getInt("low_severity_count"));
                    out.put("status", rs.getString("status"));
                    out.put("createdAt", rs.getTimestamp("created_at").toString());
                    out.put("freelancerName", rs.getString("freelancer_name"));
                    out.put("companyName", rs.getString("company_name"));
                }
            }
        }
        if (out.isEmpty()) return null;

        // Fetch findings
        String findSql = "SELECT id, title, severity, category, exact_quote, clause_reference, policy_rule, " +
                         "simple_explanation, potential_impact, suggested_negotiation, is_verified, resolution_status " +
                         "FROM risk_findings WHERE analysis_id = ? ORDER BY FIELD(severity, 'HIGH', 'MEDIUM', 'LOW'), id ASC";
        List<Map<String, Object>> findings = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(findSql)) {
            ps.setLong(1, analysisId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> f = new LinkedHashMap<>();
                    f.put("id", rs.getLong("id"));
                    f.put("title", rs.getString("title"));
                    f.put("severity", rs.getString("severity"));
                    f.put("category", rs.getString("category"));
                    f.put("exactQuote", rs.getString("exact_quote"));
                    f.put("clauseReference", rs.getString("clause_reference"));
                    f.put("policyRule", rs.getString("policy_rule"));
                    f.put("simpleExplanation", rs.getString("simple_explanation"));
                    f.put("potentialImpact", rs.getString("potential_impact"));
                    f.put("suggestedNegotiation", rs.getString("suggested_negotiation"));
                    f.put("isVerified", rs.getBoolean("is_verified"));
                    f.put("resolutionStatus", rs.getString("resolution_status"));
                    findings.add(f);
                }
            }
        }
        out.put("findings", findings);
        return out;
    }

    public static Map<String, Object> compareAnalyses(long id1, long id2) throws SQLException {
        Map<String, Object> d1 = getDetail(id1);
        Map<String, Object> d2 = getDetail(id2);
        if (d1 == null || d2 == null) return null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> f1 = (List<Map<String, Object>>) d1.get("findings");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> f2 = (List<Map<String, Object>>) d2.get("findings");

        Set<String> titlesIn2 = new HashSet<>();
        for (Map<String, Object> item : f2) titlesIn2.add(String.valueOf(item.get("title")).toLowerCase());

        Set<String> titlesIn1 = new HashSet<>();
        for (Map<String, Object> item : f1) titlesIn1.add(String.valueOf(item.get("title")).toLowerCase());

        List<Map<String, Object>> resolved = new ArrayList<>();
        List<Map<String, Object>> stillOpen = new ArrayList<>();
        List<Map<String, Object>> newFindings = new ArrayList<>();

        for (Map<String, Object> item : f1) {
            String title = String.valueOf(item.get("title")).toLowerCase();
            if (titlesIn2.contains(title)) {
                item.put("comparisonStatus", "STILL_OPEN");
                stillOpen.add(item);
            } else {
                item.put("comparisonStatus", "RESOLVED");
                resolved.add(item);
            }
        }

        for (Map<String, Object> item : f2) {
            String title = String.valueOf(item.get("title")).toLowerCase();
            if (!titlesIn1.contains(title)) {
                item.put("comparisonStatus", "NEW");
                newFindings.add(item);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("v1", d1);
        result.put("v2", d2);
        result.put("resolvedCount", resolved.size());
        result.put("stillOpenCount", stillOpen.size());
        result.put("newCount", newFindings.size());
        result.put("resolved", resolved);
        result.put("stillOpen", stillOpen);
        result.put("newFindings", newFindings);
        return result;
    }
}
