package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class ConversationDao {
    private ConversationDao() {}

    public static long getOrCreate(long companyId, long freelancerId, Long jobId) throws SQLException {
        String findSql = "SELECT id FROM conversations WHERE company_id = ? AND freelancer_id = ? " +
                         (jobId != null ? "AND job_id = ?" : "LIMIT 1");
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(findSql)) {
            ps.setLong(1, companyId);
            ps.setLong(2, freelancerId);
            if (jobId != null) ps.setLong(3, jobId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getLong(1);
            }
        }

        String insertSql = "INSERT INTO conversations (company_id, freelancer_id, job_id) VALUES (?, ?, ?)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, companyId);
            ps.setLong(2, freelancerId);
            if (jobId != null) ps.setLong(3, jobId); else ps.setNull(3, Types.BIGINT);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getLong(1);
            }
        }
        return 0;
    }

    public static List<Map<String, Object>> listForUser(long userId, String role) throws SQLException {
        String sql;
        if ("COMPANY".equalsIgnoreCase(role)) {
            sql = "SELECT c.id, c.freelancer_id AS partner_id, f.full_name AS partner_name, " +
                  "j.title AS job_title, " +
                  "(SELECT message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message, " +
                  "(SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time, " +
                  "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) AS unread_count " +
                  "FROM conversations c " +
                  "JOIN freelancers f ON c.freelancer_id = f.user_id " +
                  "LEFT JOIN jobs j ON c.job_id = j.id " +
                  "WHERE c.company_id = ? ORDER BY last_message_time DESC, c.updated_at DESC";
        } else {
            sql = "SELECT c.id, c.company_id AS partner_id, comp.company_name AS partner_name, " +
                  "j.title AS job_title, " +
                  "(SELECT message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message, " +
                  "(SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time, " +
                  "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) AS unread_count " +
                  "FROM conversations c " +
                  "JOIN companies comp ON c.company_id = comp.user_id " +
                  "LEFT JOIN jobs j ON c.job_id = j.id " +
                  "WHERE c.freelancer_id = ? ORDER BY last_message_time DESC, c.updated_at DESC";
        }

        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.setLong(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("partnerId", rs.getLong("partner_id"));
                    m.put("partnerName", rs.getString("partner_name"));
                    m.put("jobTitle", rs.getString("job_title"));
                    m.put("lastMessage", rs.getString("last_message"));
                    Timestamp t = rs.getTimestamp("last_message_time");
                    m.put("lastMessageTime", t != null ? t.toString() : null);
                    m.put("unreadCount", rs.getInt("unread_count"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> getMessages(long conversationId, long userId) throws SQLException {
        // Mark other's messages as read
        String markSql = "UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(markSql)) {
            ps.setLong(1, conversationId);
            ps.setLong(2, userId);
            ps.executeUpdate();
        }

        String sql = "SELECT m.id, m.conversation_id, m.sender_id, m.message_text, m.is_read, m.created_at, u.role " +
                     "FROM messages m " +
                     "JOIN users u ON m.sender_id = u.id " +
                     "WHERE m.conversation_id = ? ORDER BY m.created_at ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, conversationId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("conversationId", rs.getLong("conversation_id"));
                    m.put("senderId", rs.getLong("sender_id"));
                    m.put("messageText", rs.getString("message_text"));
                    m.put("isRead", rs.getBoolean("is_read"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("senderRole", rs.getString("role"));
                    m.put("isMine", rs.getLong("sender_id") == userId);
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static long sendMessage(long conversationId, long senderId, String text) throws SQLException {
        String sql = "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, conversationId);
            ps.setLong(2, senderId);
            ps.setString(3, text);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) return rs.getLong(1);
            }
        }
        return 0;
    }
}
