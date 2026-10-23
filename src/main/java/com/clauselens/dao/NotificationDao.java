package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.*;

public final class NotificationDao {
    private NotificationDao() {}

    public static void create(long userId, String title, String message, String category, String refUrl) {
        String sql = "INSERT INTO notifications (user_id, title, message, category, reference_url, is_read) " +
                     "VALUES (?, ?, ?, ?, ?, FALSE)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.setString(2, title);
            ps.setString(3, message);
            ps.setString(4, category);
            ps.setString(5, refUrl);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Notification insert failed: " + e.getMessage());
        }
    }

    public static List<Map<String, Object>> listForUser(long userId) throws SQLException {
        String sql = "SELECT id, user_id, title, message, category, reference_url, is_read, created_at " +
                     "FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("title", rs.getString("title"));
                    m.put("message", rs.getString("message"));
                    m.put("category", rs.getString("category"));
                    m.put("referenceUrl", rs.getString("reference_url"));
                    m.put("isRead", rs.getBoolean("is_read"));
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static int getUnreadCount(long userId) throws SQLException {
        String sql = "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getInt(1) : 0;
            }
        }
    }

    public static void markAllRead(long userId) throws SQLException {
        String sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.executeUpdate();
        }
    }

    public static void markRead(long notifId, long userId) throws SQLException {
        String sql = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, notifId);
            ps.setLong(2, userId);
            ps.executeUpdate();
        }
    }
}
