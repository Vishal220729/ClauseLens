package com.clauselens.controller;

import com.clauselens.dao.UserDao;
import com.clauselens.security.PasswordUtil;
import com.clauselens.util.*;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.sql.*;
import java.util.*;

@WebServlet("/api/register/*")
public class RegisterServlet extends HttpServlet {
    private static final Set<String> DOMAINS = Set.of("Web Development", "Mobile App Development", "Graphic Design",
        "UI/UX Design", "Content Writing", "Video Editing", "Digital Marketing", "Software Testing",
        "Data Analysis", "Consulting", "Other");
    private static final Set<String> LEVELS = Set.of("Beginner", "Intermediate", "Expert");

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String kind = req.getPathInfo() == null ? "" : req.getPathInfo();
        try {
            Map<String, Object> b = Json.read(req);
            long id;
            switch (kind) {
                case "/company" -> id = registerCompany(b);
                case "/freelancer" -> id = registerFreelancer(b);
                default -> { Json.error(resp, 404, "Unknown registration type."); return; }
            }
            UserDao.audit(id, "REGISTER", kind.substring(1), req.getRemoteAddr());
            Json.send(resp, 201, Map.of("ok", true));
        } catch (IllegalArgumentException e) {
            Json.error(resp, 400, e.getMessage());
        } catch (SQLIntegrityConstraintViolationException e) {
            Json.error(resp, 409, "An account with this email already exists.");
        } catch (SQLException e) {
            getServletContext().log("Registration failed", e);
            Json.error(resp, 500, "Could not create the account. Try again later.");
        }
    }

    private long registerCompany(Map<String, Object> b) throws SQLException {
        String name = Validate.str(b, "companyName", 2, 150, "Company name");
        String contact = Validate.str(b, "contactPerson", 2, 120, "Contact person");
        String email = Validate.email(b);
        String hash = PasswordUtil.hash(Validate.password(b));
        String phone = Validate.phone(b);
        String industry = Validate.str(b, "industry", 2, 100, "Industry");
        String country = Validate.str(b, "country", 2, 80, "Country");
        String desc = Validate.optional(b, "description", 2000, "Description");
        if (b.get("additionalDomains") instanceof List<?> list && !list.isEmpty()) {
            List<String> validExtras = new ArrayList<>();
            for (Object o : list) {
                if (o instanceof String s && !s.isBlank()) validExtras.add(s.trim());
            }
            if (!validExtras.isEmpty()) {
                String extrasText = "Additional Domains: " + String.join(", ", validExtras);
                desc = desc.isEmpty() ? extrasText : desc + " | " + extrasText;
            }
        }

        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long id = UserDao.insert(c, "COMPANY", email, hash);
                String sql = "INSERT INTO companies (user_id, company_name, contact_person, phone, industry, country, description) VALUES (?,?,?,?,?,?,?)";
                try (PreparedStatement ps = c.prepareStatement(sql)) {
                    ps.setLong(1, id); ps.setString(2, name); ps.setString(3, contact); ps.setString(4, phone);
                    ps.setString(5, industry); ps.setString(6, country); ps.setString(7, desc);
                    ps.executeUpdate();
                }
                c.commit();
                return id;
            } catch (SQLException | RuntimeException e) { c.rollback(); throw e; }
        }
    }

    private long registerFreelancer(Map<String, Object> b) throws SQLException {
        String name = Validate.str(b, "fullName", 2, 120, "Name");
        String email = Validate.email(b);
        String hash = PasswordUtil.hash(Validate.password(b));
        String country = Validate.str(b, "country", 2, 80, "Country");
        String level = Validate.str(b, "experienceLevel", 3, 20, "Experience level");
        if (!LEVELS.contains(level)) throw new IllegalArgumentException("Choose a valid experience level.");
        String skills = Validate.str(b, "skills", 2, 500, "Skills");
        String desc = Validate.optional(b, "description", 2000, "Professional description");
        String portfolio = Validate.url(b, "portfolioUrl");
        String primary = Validate.str(b, "primaryDomain", 2, 80, "Primary domain");
        if (!DOMAINS.contains(primary)) throw new IllegalArgumentException("Choose a valid primary domain.");

        Set<String> extra = new LinkedHashSet<>();
        if (b.get("additionalDomains") instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof String d) || !DOMAINS.contains(d)) throw new IllegalArgumentException("One of the additional domains is not valid.");
                if (!d.equals(primary)) extra.add(d);   // duplicates and the primary are dropped
            }
        }

        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long id = UserDao.insert(c, "FREELANCER", email, hash);
                String sql = "INSERT INTO freelancers (user_id, full_name, country, experience_level, skills, description, portfolio_url) VALUES (?,?,?,?,?,?,?)";
                try (PreparedStatement ps = c.prepareStatement(sql)) {
                    ps.setLong(1, id); ps.setString(2, name); ps.setString(3, country); ps.setString(4, level);
                    ps.setString(5, skills); ps.setString(6, desc); ps.setString(7, portfolio.isEmpty() ? null : portfolio);
                    ps.executeUpdate();
                }
                try (PreparedStatement ps = c.prepareStatement("INSERT INTO freelancer_domains (freelancer_id, domain, is_primary) VALUES (?,?,?)")) {
                    ps.setLong(1, id); ps.setString(2, primary); ps.setBoolean(3, true); ps.addBatch();
                    for (String d : extra) { ps.setLong(1, id); ps.setString(2, d); ps.setBoolean(3, false); ps.addBatch(); }
                    ps.executeBatch();
                }
                c.commit();
                return id;
            } catch (SQLException | RuntimeException e) { c.rollback(); throw e; }
        }
    }
}
