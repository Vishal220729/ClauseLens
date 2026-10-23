package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class EmailDao {
    private EmailDao() {}

    static {
        initTable();
    }

    public static void initTable() {
        String sql = "CREATE TABLE IF NOT EXISTS email_logs (" +
                     "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                     "recipient_email VARCHAR(190) NOT NULL, " +
                     "recipient_name VARCHAR(120), " +
                     "sender_email VARCHAR(190) NOT NULL DEFAULT 'notifications@clauselens.com', " +
                     "subject VARCHAR(255) NOT NULL, " +
                     "body_text TEXT NOT NULL, " +
                     "body_html LONGTEXT NOT NULL, " +
                     "email_type VARCHAR(50) NOT NULL, " +
                     "reference_id BIGINT NULL, " +
                     "status VARCHAR(50) NOT NULL DEFAULT 'SENT', " +
                     "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
                     "KEY idx_email_recipient (recipient_email), " +
                     "KEY idx_email_type (email_type), " +
                     "KEY idx_email_created (created_at)" +
                     ") ENGINE=InnoDB";

        String sqlCfg = "CREATE TABLE IF NOT EXISTS email_config (" +
                        "config_key VARCHAR(100) PRIMARY KEY, " +
                        "config_value TEXT, " +
                        "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" +
                        ") ENGINE=InnoDB";

        try (Connection c = Db.get(); Statement st = c.createStatement()) {
            st.execute(sql);
            st.execute(sqlCfg);
        } catch (SQLException e) {
            System.err.println("[ClauseLens] Failed to ensure email tables: " + e.getMessage());
        }
    }

    public static String getConfig(String key, String fallback) {
        String sql = "SELECT config_value FROM email_config WHERE config_key = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, key);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String v = rs.getString(1);
                    return (v != null && !v.isBlank()) ? v : fallback;
                }
            }
        } catch (Exception ignored) {}
        return fallback;
    }

    public static void setConfig(String key, String value) {
        String sql = "INSERT INTO email_config (config_key, config_value) VALUES (?, ?) " +
                     "ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, key);
            ps.setString(2, value);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[ClauseLens] Failed to update email config: " + e.getMessage());
        }
    }

    public static Map<String, String> getAllConfigs() {
        Map<String, String> map = new HashMap<>();
        String sql = "SELECT config_key, config_value FROM email_config";
        try (Connection c = Db.get(); Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) {
                map.put(rs.getString(1), rs.getString(2));
            }
        } catch (Exception ignored) {}
        return map;
    }

    public static long logEmail(String recipientEmail, String recipientName, String senderEmail,
                                String subject, String bodyText, String bodyHtml,
                                String emailType, Long referenceId, String status) {
        String sql = "INSERT INTO email_logs (recipient_email, recipient_name, sender_email, subject, body_text, " +
                     "body_html, email_type, reference_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, recipientEmail);
            ps.setString(2, recipientName);
            ps.setString(3, senderEmail != null ? senderEmail : "notifications@clauselens.com");
            ps.setString(4, subject);
            ps.setString(5, bodyText);
            ps.setString(6, bodyHtml);
            ps.setString(7, emailType);
            if (referenceId != null) ps.setLong(8, referenceId);
            else ps.setNull(8, Types.BIGINT);
            ps.setString(9, status != null ? status : "SENT");
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getLong(1);
            }
        } catch (SQLException e) {
            System.err.println("[ClauseLens] Failed to log email: " + e.getMessage());
        }
        return 0;
    }

    public static void updateStatus(long id, String status) {
        String sql = "UPDATE email_logs SET status = ? WHERE id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, status);
            ps.setLong(2, id);
            ps.executeUpdate();
        } catch (Exception ignored) {}
    }

    public static List<Map<String, Object>> listRecent(String emailFilter, int limit) throws SQLException {
        String sql = "SELECT id, recipient_email, recipient_name, sender_email, subject, email_type, reference_id, " +
                     "status, created_at, SUBSTRING(body_text, 1, 150) AS snippet " +
                     "FROM email_logs ";
        if (emailFilter != null && !emailFilter.isBlank()) {
            sql += "WHERE recipient_email = ? OR sender_email = ? ";
        }
        sql += "ORDER BY created_at DESC LIMIT ?";

        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            int p = 1;
            if (emailFilter != null && !emailFilter.isBlank()) {
                ps.setString(p++, emailFilter.toLowerCase());
                ps.setString(p++, emailFilter.toLowerCase());
            }
            ps.setInt(p, limit > 0 ? limit : 25);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("recipientEmail", rs.getString("recipient_email"));
                    m.put("recipientName", rs.getString("recipient_name"));
                    m.put("senderEmail", rs.getString("sender_email"));
                    m.put("subject", rs.getString("subject"));
                    m.put("emailType", rs.getString("email_type"));
                    m.put("referenceId", rs.getObject("reference_id"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("snippet", rs.getString("snippet"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static Map<String, Object> getById(long id) throws SQLException {
        String sql = "SELECT * FROM email_logs WHERE id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("recipientEmail", rs.getString("recipient_email"));
                    m.put("recipientName", rs.getString("recipient_name"));
                    m.put("senderEmail", rs.getString("sender_email"));
                    m.put("subject", rs.getString("subject"));
                    m.put("bodyText", rs.getString("body_text"));
                    m.put("bodyHtml", rs.getString("body_html"));
                    m.put("emailType", rs.getString("email_type"));
                    m.put("referenceId", rs.getObject("reference_id"));
                    m.put("status", rs.getString("status"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    return m;
                }
            }
        }
        return null;
    }
}
