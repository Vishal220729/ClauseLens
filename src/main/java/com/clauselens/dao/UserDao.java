package com.clauselens.dao;

import com.clauselens.util.Db;
import java.sql.*;
import java.util.Optional;

public final class UserDao {
    public record UserRow(long id, String role, String email, String hash, String status) {}
    private UserDao() {}

    public static Optional<UserRow> findByEmail(String email) throws SQLException {
        String sql = "SELECT id, role, email, password_hash, status FROM users WHERE email = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Optional.empty();
                return Optional.of(new UserRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)));
            }
        }
    }

    public static Optional<UserRow> findById(long id) throws SQLException {
        String sql = "SELECT id, role, email, password_hash, status FROM users WHERE id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Optional.empty();
                return Optional.of(new UserRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)));
            }
        }
    }

    public static long insert(Connection c, String role, String email, String hash) throws SQLException {
        String sql = "INSERT INTO users (role, email, password_hash) VALUES (?, ?, ?)";
        try (PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, role);
            ps.setString(2, email);
            ps.setString(3, hash);
            ps.executeUpdate();
            try (ResultSet k = ps.getGeneratedKeys()) { k.next(); return k.getLong(1); }
        }
    }

    public static boolean adminExists() throws SQLException {
        try (Connection c = Db.get(); Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1")) {
            return rs.next();
        }
    }

    public static String displayName(long userId, String role) throws SQLException {
        String sql = switch (role) {
            case "COMPANY" -> "SELECT company_name FROM companies WHERE user_id = ?";
            case "FREELANCER" -> "SELECT full_name FROM freelancers WHERE user_id = ?";
            default -> null;
        };
        if (sql == null) return "Administrator";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() ? rs.getString(1) : ""; }
        }
    }

    public static int freelancerPoints(long userId) {
        String sql = "SELECT reward_points FROM freelancers WHERE user_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() ? rs.getInt(1) : 0; }
        } catch (SQLException e) {
            return 0;
        }
    }

    public static java.math.BigDecimal freelancerWalletBalance(long userId) {
        String sql = "SELECT wallet_balance FROM freelancers WHERE user_id = ?";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) { return rs.next() && rs.getBigDecimal(1) != null ? rs.getBigDecimal(1) : java.math.BigDecimal.ZERO; }
        } catch (SQLException e) {
            return java.math.BigDecimal.ZERO;
        }
    }

    public static void audit(Long actor, String action, String details, String ip) {
        String sql = "INSERT INTO audit_logs (actor_user_id, action, details, ip_address) VALUES (?, ?, ?, ?)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            if (actor == null) ps.setNull(1, Types.BIGINT); else ps.setLong(1, actor);
            ps.setString(2, action);
            ps.setString(3, details);
            ps.setString(4, ip);
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Audit log write failed: " + e.getMessage());
        }
    }
}
