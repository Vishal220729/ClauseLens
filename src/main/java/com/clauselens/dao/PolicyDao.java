package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class PolicyDao {
    private PolicyDao() {}

    public static List<Map<String, Object>> getRules(long freelancerId) throws SQLException {
        // Ensure policy exists
        ensurePolicyExists(freelancerId);

        String sql = "SELECT pr.id, pr.category, pr.rule_name, pr.expected_value, pr.operator, pr.unit, " +
                     "pr.severity, pr.is_enabled " +
                     "FROM policy_rules pr WHERE pr.freelancer_id = ? ORDER BY pr.id ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("category", rs.getString("category"));
                    m.put("ruleName", rs.getString("rule_name"));
                    m.put("expectedValue", rs.getString("expected_value"));
                    m.put("operator", rs.getString("operator"));
                    m.put("unit", rs.getString("unit"));
                    m.put("severity", rs.getString("severity"));
                    m.put("isEnabled", rs.getBoolean("is_enabled"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static void ensurePolicyExists(long freelancerId) throws SQLException {
        String check = "SELECT id FROM freelancer_policies WHERE freelancer_id = ? LIMIT 1";
        long policyId = 0;
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(check)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) policyId = rs.getLong(1);
            }
        }
        if (policyId == 0) {
            String insPol = "INSERT INTO freelancer_policies (freelancer_id, policy_name, version_number, is_active) VALUES (?, 'Standard Protection Policy', 1, TRUE)";
            try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(insPol, Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, freelancerId);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) { if (rs.next()) policyId = rs.getLong(1); }
            }
            // Seed standard rules
            String insRules = "INSERT INTO policy_rules (policy_id, freelancer_id, category, rule_name, expected_value, operator, unit, severity, is_enabled) VALUES " +
                              "(?, ?, 'Payment delay', 'Maximum payment due period', '15', '<=', 'days', 'HIGH', TRUE), " +
                              "(?, ?, 'Advance payment', 'Minimum upfront advance deposit', '30', '>=', '%', 'HIGH', TRUE), " +
                              "(?, ?, 'Revisions', 'Maximum revisions included', '3', '<=', 'revisions', 'MEDIUM', TRUE), " +
                              "(?, ?, 'Bug fixing', 'Warranty period for bug fixes', '30', '<=', 'days', 'LOW', TRUE), " +
                              "(?, ?, 'IP & Source Code', 'IP transfer condition', 'Upon 100% full payment', 'CONTAINS', 'text', 'HIGH', TRUE), " +
                              "(?, ?, 'Liability', 'Maximum liability cap', 'Total project fee', 'CONTAINS', 'text', 'HIGH', TRUE)";
            try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(insRules)) {
                for (int i = 1; i <= 12; i += 2) {
                    ps.setLong(i, policyId);
                    ps.setLong(i + 1, freelancerId);
                }
                ps.executeUpdate();
            }
        }
    }

    public static long addOrUpdateRule(long freelancerId, Long ruleId, String category, String ruleName,
                                       String expectedValue, String operator, String unit, String severity) throws SQLException {
        ensurePolicyExists(freelancerId);
        long policyId = 0;
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement("SELECT id FROM freelancer_policies WHERE freelancer_id = ? LIMIT 1")) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) { if (rs.next()) policyId = rs.getLong(1); }
        }

        if (ruleId != null && ruleId > 0) {
            String sql = "UPDATE policy_rules SET category = ?, rule_name = ?, expected_value = ?, operator = ?, unit = ?, severity = ? " +
                         "WHERE id = ? AND freelancer_id = ?";
            try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, category);
                ps.setString(2, ruleName);
                ps.setString(3, expectedValue);
                ps.setString(4, operator);
                ps.setString(5, unit);
                ps.setString(6, severity);
                ps.setLong(7, ruleId);
                ps.setLong(8, freelancerId);
                ps.executeUpdate();
                return ruleId;
            }
        } else {
            String sql = "INSERT INTO policy_rules (policy_id, freelancer_id, category, rule_name, expected_value, operator, unit, severity, is_enabled) " +
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)";
            try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, policyId);
                ps.setLong(2, freelancerId);
                ps.setString(3, category);
                ps.setString(4, ruleName);
                ps.setString(5, expectedValue);
                ps.setString(6, operator);
                ps.setString(7, unit);
                ps.setString(8, severity);
                ps.executeUpdate();
                try (ResultSet rs = ps.getGeneratedKeys()) { if (rs.next()) return rs.getLong(1); }
            }
        }
        return 0;
    }

    public static void toggleRule(long ruleId, long freelancerId, boolean isEnabled) throws SQLException {
        String sql = "UPDATE policy_rules SET is_enabled = ? WHERE id = ? AND freelancer_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setBoolean(1, isEnabled);
            ps.setLong(2, ruleId);
            ps.setLong(3, freelancerId);
            ps.executeUpdate();
        }
    }

    public static void deleteRule(long ruleId, long freelancerId) throws SQLException {
        String sql = "DELETE FROM policy_rules WHERE id = ? AND freelancer_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, ruleId);
            ps.setLong(2, freelancerId);
            ps.executeUpdate();
        }
    }
}
