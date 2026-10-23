package com.clauselens.dao;

import com.clauselens.util.Db;
import com.clauselens.util.EmailService;
import java.math.BigDecimal;
import java.sql.*;
import java.util.*;

public final class TaskDao {
    private TaskDao() {}

    public static List<Map<String, Object>> listFreelancerProjects(long freelancerId) throws SQLException {
        String sql = "SELECT p.id, p.title, p.budget, p.currency, p.start_date, p.deadline, p.status, c.company_name " +
                     "FROM projects p " +
                     "JOIN companies c ON p.company_id = c.user_id " +
                     "WHERE p.freelancer_id = ? ORDER BY p.id DESC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("title", rs.getString("title"));
                    m.put("budget", rs.getBigDecimal("budget"));
                    m.put("currency", rs.getString("currency"));
                    m.put("startDate", rs.getDate("start_date") != null ? rs.getDate("start_date").toString() : null);
                    m.put("deadline", rs.getDate("deadline") != null ? rs.getDate("deadline").toString() : null);
                    m.put("status", rs.getString("status"));
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static Map<String, Object> getProjectTimeline(long projectId, long userId) throws SQLException {
        String pSql = "SELECT p.id, p.title, p.budget, p.currency, p.start_date, p.deadline, p.status, " +
                      "p.company_id, p.freelancer_id, c.company_name, f.full_name AS freelancer_name " +
                      "FROM projects p " +
                      "JOIN companies c ON p.company_id = c.user_id " +
                      "JOIN freelancers f ON p.freelancer_id = f.user_id " +
                      "WHERE p.id = ? AND (p.freelancer_id = ? OR p.company_id = ?)";
        Map<String, Object> proj = new LinkedHashMap<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(pSql)) {
            ps.setLong(1, projectId);
            ps.setLong(2, userId);
            ps.setLong(3, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    proj.put("id", rs.getLong("id"));
                    proj.put("title", rs.getString("title"));
                    proj.put("budget", rs.getBigDecimal("budget"));
                    proj.put("currency", rs.getString("currency"));
                    proj.put("startDate", rs.getDate("start_date") != null ? rs.getDate("start_date").toString() : null);
                    proj.put("deadline", rs.getDate("deadline") != null ? rs.getDate("deadline").toString() : null);
                    proj.put("status", rs.getString("status"));
                    proj.put("companyId", rs.getLong("company_id"));
                    proj.put("freelancerId", rs.getLong("freelancer_id"));
                    proj.put("companyName", rs.getString("company_name"));
                    proj.put("freelancerName", rs.getString("freelancer_name"));
                }
            }
        }
        if (proj.isEmpty()) return null;

        List<Map<String, Object>> tasks = listByProject(projectId);
        int totalTasks = tasks.size();
        int completedTasks = 0;
        int sumProgress = 0;
        Map<String, Object> activeHalfwayTask = null;

        for (Map<String, Object> t : tasks) {
            String status = String.valueOf(t.get("status"));
            int prog = t.get("progressPercent") != null ? ((Number) t.get("progressPercent")).intValue() : 0;
            if ("COMPLETED".equals(status)) {
                completedTasks++;
            }
            sumProgress += prog;

            if (activeHalfwayTask == null && ("TODO".equals(status) || "HALF_DONE".equals(status) || "IN_PROGRESS".equals(status))) {
                activeHalfwayTask = t;
            }
        }

        int overallProgress = totalTasks > 0 ? (sumProgress / totalTasks) : 0;
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate startDate = proj.get("startDate") != null ? java.time.LocalDate.parse((String) proj.get("startDate")) : today;
        java.time.LocalDate deadline = proj.get("deadline") != null ? java.time.LocalDate.parse((String) proj.get("deadline")) : startDate.plusDays(14);
        long daysRemaining = java.time.temporal.ChronoUnit.DAYS.between(today, deadline);
        long totalDays = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(startDate, deadline));
        java.time.LocalDate halfwayDate = startDate.plusDays(totalDays / 2);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("project", proj);
        out.put("tasks", tasks);
        out.put("totalTasks", totalTasks);
        out.put("completedTasks", completedTasks);
        out.put("overallProgressPercent", overallProgress);
        out.put("startDate", startDate.toString());
        out.put("deadline", deadline.toString());
        out.put("halfwayDate", halfwayDate.toString());
        out.put("totalDays", totalDays);
        out.put("daysRemaining", daysRemaining);
        out.put("isOverdue", daysRemaining < 0 && overallProgress < 100);
        out.put("activeHalfwayTask", activeHalfwayTask);
        out.put("hasTimeline", proj.get("startDate") != null && proj.get("deadline") != null);

        return out;
    }

    public static List<Map<String, Object>> listForFreelancer(long freelancerId) throws SQLException {
        String sql = "SELECT t.id, t.project_id, t.title, t.description, t.due_date, t.priority, " +
                     "t.status, t.progress_percent, t.completed_at, t.created_at, " +
                     "p.title AS project_title, c.company_name " +
                     "FROM tasks t " +
                     "JOIN projects p ON t.project_id = p.id " +
                     "JOIN companies c ON p.company_id = c.user_id " +
                     "WHERE p.freelancer_id = ? ORDER BY t.created_at ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, freelancerId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("description", rs.getString("description"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("priority", rs.getString("priority"));
                    m.put("status", rs.getString("status"));
                    m.put("progressPercent", rs.getInt("progress_percent"));
                    m.put("completedAt", rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("projectTitle", rs.getString("project_title"));
                    m.put("companyName", rs.getString("company_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listForCompany(long companyId) throws SQLException {
        String sql = "SELECT t.id, t.project_id, t.title, t.description, t.due_date, t.priority, " +
                     "t.status, t.progress_percent, t.completed_at, t.created_at, " +
                     "p.title AS project_title, f.full_name AS freelancer_name " +
                     "FROM tasks t " +
                     "JOIN projects p ON t.project_id = p.id " +
                     "JOIN freelancers f ON p.freelancer_id = f.user_id " +
                     "WHERE p.company_id = ? ORDER BY t.created_at ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, companyId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("description", rs.getString("description"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("priority", rs.getString("priority"));
                    m.put("status", rs.getString("status"));
                    m.put("progressPercent", rs.getInt("progress_percent"));
                    m.put("completedAt", rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    m.put("projectTitle", rs.getString("project_title"));
                    m.put("freelancerName", rs.getString("freelancer_name"));
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static List<Map<String, Object>> listByProject(long projectId) throws SQLException {
        String sql = "SELECT t.id, t.project_id, t.title, t.description, t.due_date, t.priority, " +
                     "t.status, t.progress_percent, t.completed_at, t.created_at " +
                     "FROM tasks t WHERE t.project_id = ? ORDER BY t.created_at ASC";
        List<Map<String, Object>> list = new ArrayList<>();
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql)) {
            ps.setLong(1, projectId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getLong("id"));
                    m.put("projectId", rs.getLong("project_id"));
                    m.put("title", rs.getString("title"));
                    m.put("description", rs.getString("description"));
                    m.put("dueDate", rs.getDate("due_date") != null ? rs.getDate("due_date").toString() : null);
                    m.put("priority", rs.getString("priority"));
                    m.put("status", rs.getString("status"));
                    m.put("progressPercent", rs.getInt("progress_percent"));
                    m.put("completedAt", rs.getTimestamp("completed_at") != null ? rs.getTimestamp("completed_at").toString() : null);
                    m.put("createdAt", rs.getTimestamp("created_at").toString());
                    list.add(m);
                }
            }
        }
        return list;
    }

    public static long createTask(long projectId, String title, String description, String priority, String dueDate) throws SQLException {
        String sql = "INSERT INTO tasks (project_id, title, description, priority, due_date, status, progress_percent) " +
                     "VALUES (?, ?, ?, ?, ?, 'TODO', 0)";
        try (Connection c = Db.get(); PreparedStatement ps = c.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, projectId);
            ps.setString(2, title);
            ps.setString(3, description);
            ps.setString(4, priority != null ? priority : "MEDIUM");
            if (dueDate != null && !dueDate.isBlank()) {
                ps.setDate(5, java.sql.Date.valueOf(dueDate));
            } else {
                ps.setNull(5, Types.DATE);
            }
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) { if (rs.next()) return rs.getLong(1); }
        }
        return 0;
    }

    public static boolean recordHalfwayProgress(long taskId, long freelancerId, boolean completedHalf, String notes) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                // Get task & project
                long projectId = 0;
                long companyId = 0;
                String taskTitle = "";
                String q = "SELECT t.project_id, t.title, p.company_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, taskId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectId = rs.getLong(1);
                            taskTitle = rs.getString(2);
                            companyId = rs.getLong(3);
                        }
                    }
                }

                // Record progress update
                String insUp = "INSERT INTO progress_updates (task_id, project_id, freelancer_id, is_halfway_confirmed, notes) " +
                              "VALUES (?, ?, ?, ?, ?)";
                try (PreparedStatement ps = c.prepareStatement(insUp)) {
                    ps.setLong(1, taskId);
                    ps.setLong(2, projectId);
                    ps.setLong(3, freelancerId);
                    ps.setBoolean(4, completedHalf);
                    ps.setString(5, notes);
                    ps.executeUpdate();
                }

                if (completedHalf) {
                    // Update task status and progress percent
                    String upd = "UPDATE tasks SET status = 'HALF_DONE', progress_percent = GREATEST(progress_percent, 50) WHERE id = ?";
                    try (PreparedStatement ps = c.prepareStatement(upd)) {
                        ps.setLong(1, taskId);
                        ps.executeUpdate();
                    }

                    // Check if already awarded halfway reward for this task
                    String checkRew = "SELECT 1 FROM reward_transactions WHERE freelancer_id = ? AND task_id = ? AND reason LIKE '%Halfway%' LIMIT 1";
                    boolean awarded = false;
                    try (PreparedStatement ps = c.prepareStatement(checkRew)) {
                        ps.setLong(1, freelancerId);
                        ps.setLong(2, taskId);
                        try (ResultSet rs = ps.executeQuery()) { awarded = rs.next(); }
                    }
                    if (!awarded) {
                        // Award +100 reward points
                        int pts = 100;
                        String insRew = "INSERT INTO reward_transactions (freelancer_id, project_id, task_id, points, reason) " +
                                       "VALUES (?, ?, ?, ?, ?)";
                        try (PreparedStatement ps = c.prepareStatement(insRew)) {
                            ps.setLong(1, freelancerId);
                            ps.setLong(2, projectId);
                            ps.setLong(3, taskId);
                            ps.setInt(4, pts);
                            ps.setString(5, "Halfway Check-in Milestone Achieved: " + taskTitle);
                            ps.executeUpdate();
                        }
                        String updUser = "UPDATE freelancers SET reward_points = reward_points + ? WHERE user_id = ?";
                        try (PreparedStatement ps = c.prepareStatement(updUser)) {
                            ps.setInt(1, pts);
                            ps.setLong(2, freelancerId);
                            ps.executeUpdate();
                        }
                    }

                    // Notify company
                    if (companyId > 0) {
                        NotificationDao.create(companyId, "Halfway Milestone Completed",
                            "Freelancer confirmed 50% work completion for task: " + taskTitle, "TASK", "/company-dashboard.html");
                    }
                }

                c.commit();
                return true;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static boolean completeTask(long taskId, long freelancerId) throws SQLException {
        return completeTask(taskId, freelancerId, null);
    }

    public static boolean completeTask(long taskId, long freelancerId, String deliverableNotes) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long projectId = 0;
                long companyId = 0;
                String taskTitle = "";
                String projectTitle = "";
                String companyEmail = "";
                String companyName = "Hiring Client";
                String freelancerName = "Specialist";

                String q = "SELECT t.project_id, t.title, p.company_id, p.title, c.company_name, u.email, f.full_name " +
                           "FROM tasks t " +
                           "JOIN projects p ON t.project_id = p.id " +
                           "JOIN companies c ON p.company_id = c.user_id " +
                           "JOIN users u ON c.user_id = u.id " +
                           "JOIN freelancers f ON p.freelancer_id = f.user_id " +
                           "WHERE t.id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, taskId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectId = rs.getLong(1);
                            taskTitle = rs.getString(2);
                            companyId = rs.getLong(3);
                            projectTitle = rs.getString(4);
                            companyName = rs.getString(5);
                            companyEmail = rs.getString(6);
                            freelancerName = rs.getString(7);
                        }
                    }
                }

                String upd = "UPDATE tasks SET status = 'COMPLETED', progress_percent = 100, completed_at = CURRENT_TIMESTAMP WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(upd)) {
                    ps.setLong(1, taskId);
                    ps.executeUpdate();
                }

                // Record progress update with deliverable notes
                String insUp = "INSERT INTO progress_updates (task_id, project_id, freelancer_id, is_halfway_confirmed, notes) " +
                              "VALUES (?, ?, ?, true, ?)";
                try (PreparedStatement ps = c.prepareStatement(insUp)) {
                    ps.setLong(1, taskId);
                    ps.setLong(2, projectId);
                    ps.setLong(3, freelancerId);
                    ps.setString(4, (deliverableNotes != null && !deliverableNotes.isBlank()) ? deliverableNotes : "Phase Completed: " + taskTitle);
                    ps.executeUpdate();
                }

                // Award 150 completion points
                String checkRew = "SELECT 1 FROM reward_transactions WHERE freelancer_id = ? AND task_id = ? AND reason LIKE '%Completion%' LIMIT 1";
                boolean awarded = false;
                try (PreparedStatement ps = c.prepareStatement(checkRew)) {
                    ps.setLong(1, freelancerId);
                    ps.setLong(2, taskId);
                    try (ResultSet rs = ps.executeQuery()) { awarded = rs.next(); }
                }
                if (!awarded) {
                    int pts = 150;
                    String insRew = "INSERT INTO reward_transactions (freelancer_id, project_id, task_id, points, reason) " +
                                   "VALUES (?, ?, ?, ?, ?)";
                    try (PreparedStatement ps = c.prepareStatement(insRew)) {
                        ps.setLong(1, freelancerId);
                        ps.setLong(2, projectId);
                        ps.setLong(3, taskId);
                        ps.setInt(4, pts);
                        ps.setString(5, "Task Full Completion: " + taskTitle);
                        ps.executeUpdate();
                    }
                    String updUser = "UPDATE freelancers SET reward_points = reward_points + ? WHERE user_id = ?";
                    try (PreparedStatement ps = c.prepareStatement(updUser)) {
                        ps.setInt(1, pts);
                        ps.setLong(2, freelancerId);
                        ps.executeUpdate();
                    }
                }

                // Link or create milestone payment for this completed task
                long paymentId = 0;
                BigDecimal dueAmount = new BigDecimal("450.00");
                String checkPay = "SELECT id, amount FROM payments WHERE (task_id = ? OR (project_id = ? AND status IN ('PENDING', 'DUE_SOON'))) ORDER BY id ASC LIMIT 1";
                try (PreparedStatement psPay = c.prepareStatement(checkPay)) {
                    psPay.setLong(1, taskId);
                    psPay.setLong(2, projectId);
                    try (ResultSet rsPay = psPay.executeQuery()) {
                        if (rsPay.next()) {
                            paymentId = rsPay.getLong(1);
                            if (rsPay.getBigDecimal(2) != null) dueAmount = rsPay.getBigDecimal(2);
                            try (PreparedStatement psUpd = c.prepareStatement("UPDATE payments SET task_id = ?, status = 'DUE_SOON' WHERE id = ?")) {
                                psUpd.setLong(1, taskId);
                                psUpd.setLong(2, paymentId);
                                psUpd.executeUpdate();
                            }
                        }
                    }
                }
                if (paymentId == 0 && projectId > 0) {
                    try (PreparedStatement psBudget = c.prepareStatement("SELECT budget FROM projects WHERE id = ?")) {
                        psBudget.setLong(1, projectId);
                        try (ResultSet rsB = psBudget.executeQuery()) {
                            if (rsB.next()) {
                                BigDecimal b = rsB.getBigDecimal(1);
                                if (b != null && b.compareTo(BigDecimal.ZERO) > 0) {
                                    dueAmount = b.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP);
                                }
                            }
                        }
                    }
                    String insPay = "INSERT INTO payments (project_id, task_id, title, amount, status) VALUES (?, ?, ?, ?, 'DUE_SOON')";
                    try (PreparedStatement psIns = c.prepareStatement(insPay, Statement.RETURN_GENERATED_KEYS)) {
                        psIns.setLong(1, projectId);
                        psIns.setLong(2, taskId);
                        psIns.setString(3, "Task Delivery Milestone: " + taskTitle);
                        psIns.setBigDecimal(4, dueAmount);
                        psIns.executeUpdate();
                        try (ResultSet rsGen = psIns.getGeneratedKeys()) {
                            if (rsGen.next()) paymentId = rsGen.getLong(1);
                        }
                    }
                }

                // Check if ALL tasks in the project are now completed
                boolean allCompleted = false;
                String checkAll = "SELECT COUNT(*) FROM tasks WHERE project_id = ? AND status != 'COMPLETED'";
                try (PreparedStatement psAll = c.prepareStatement(checkAll)) {
                    psAll.setLong(1, projectId);
                    try (ResultSet rsAll = psAll.executeQuery()) {
                        if (rsAll.next() && rsAll.getInt(1) == 0) {
                            allCompleted = true;
                        }
                    }
                }

                if (allCompleted) {
                    String updProjStatus = "UPDATE projects SET status = 'COMPLETED' WHERE id = ?";
                    try (PreparedStatement psUpdProj = c.prepareStatement(updProjStatus)) {
                        psUpdProj.setLong(1, projectId);
                        psUpdProj.executeUpdate();
                    }
                    if (companyId > 0) {
                        NotificationDao.create(companyId, "All Project Milestones Completed",
                            "Freelancer finished all milestone phases for project '" + projectTitle + "'! Deliverables ready for final payment release.",
                            "PROJECT", "company-dashboard.html#payments");
                    }
                } else if (companyId > 0) {
                    NotificationDao.create(companyId, "Phase Completed - Payment Due",
                        "Freelancer finished phase '" + taskTitle + "'. Please review deliverables and release payment in your Payments tab.",
                        "PAYMENT", "company-dashboard.html#payments");
                }

                c.commit();

                // Automated email dispatch to hiring company for milestone review & release
                if (companyEmail != null && !companyEmail.isBlank()) {
                    EmailService.sendPhaseCompleted(companyEmail, companyName, freelancerName, projectTitle, taskTitle, dueAmount, taskId);
                }

                return true;
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
    }

    public static Map<String, Object> generateAiTimeline(long projectId, long freelancerId, Integer customDays, String customScope) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                String pSql = "SELECT p.title, p.budget, p.company_id, c.company_name " +
                              "FROM projects p " +
                              "JOIN companies c ON p.company_id = c.user_id " +
                              "WHERE p.id = ? AND p.freelancer_id = ?";
                String projectTitle = "";
                BigDecimal budget = BigDecimal.ZERO;
                long companyId = 0;
                String companyName = "";

                try (PreparedStatement ps = c.prepareStatement(pSql)) {
                    ps.setLong(1, projectId);
                    ps.setLong(2, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectTitle = rs.getString(1);
                            budget = rs.getBigDecimal(2);
                            companyId = rs.getLong(3);
                            companyName = rs.getString(4);
                        } else {
                            throw new IllegalArgumentException("Project not found or not owned by freelancer.");
                        }
                    }
                }

                int targetDays = 14;
                if (customDays != null && customDays > 0) {
                    targetDays = customDays;
                } else if (budget != null) {
                    if (budget.compareTo(new BigDecimal("2000")) >= 0) targetDays = 30;
                    else if (budget.compareTo(new BigDecimal("1000")) >= 0) targetDays = 21;
                    else if (budget.compareTo(new BigDecimal("500")) >= 0) targetDays = 14;
                    else targetDays = 10;
                }

                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalDate deadline = today.plusDays(targetDays);

                String updP = "UPDATE projects SET start_date = ?, deadline = ? WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(updP)) {
                    ps.setDate(1, java.sql.Date.valueOf(today));
                    ps.setDate(2, java.sql.Date.valueOf(deadline));
                    ps.setLong(3, projectId);
                    ps.executeUpdate();
                }

                // Clear existing unscheduled draft backlog milestones so AI can regenerate fresh roadmap
                String delTasks = "DELETE FROM tasks WHERE project_id = ? AND status = 'TODO' AND progress_percent = 0";
                try (PreparedStatement ps = c.prepareStatement(delTasks)) {
                    ps.setLong(1, projectId);
                    ps.executeUpdate();
                }

                int d1 = (int) Math.max(2, Math.round(targetDays * 0.22));
                int d2 = (int) Math.max(d1 + 2, Math.round(targetDays * 0.50));
                int d3 = (int) Math.max(d2 + 2, Math.round(targetDays * 0.78));
                int d4 = targetDays;

                record MilestonePlan(String title, String desc, int dayOffset, String priority) {}
                String titleLower = (projectTitle + " " + (customScope != null ? customScope : "")).toLowerCase();
                List<MilestonePlan> plan = new ArrayList<>();

                if (titleLower.contains("mobile") || titleLower.contains("app") || titleLower.contains("android") || titleLower.contains("ios")) {
                    plan.add(new MilestonePlan("Phase 1: App Architecture & UI Mockups", "Setup mobile development framework, API contracts, navigation flows, and initial screen mockups.", d1, "HIGH"));
                    plan.add(new MilestonePlan("Phase 2: Core Features & 50% Halfway Checkpoint", "Authentication, primary UI screens, offline storage, and main business logic. Triggers 50% milestone reward checkpoint.", d2, "HIGH"));
                    plan.add(new MilestonePlan("Phase 3: Integration, Push & Device Testing", "Third-party API integration, push notifications, performance profiling, and cross-device testing.", d3, "MEDIUM"));
                    plan.add(new MilestonePlan("Phase 4: Store Readiness, Polish & Final Handover", "Final client acceptance audit, bug fixes, deployment package, and production sign-off.", d4, "HIGH"));
                } else if (titleLower.contains("design") || titleLower.contains("ui") || titleLower.contains("ux") || titleLower.contains("figma")) {
                    plan.add(new MilestonePlan("Phase 1: Research, User Flow & Wireframes", "Brand audit, user journey mapping, information architecture, and low-fidelity structural wireframes.", d1, "HIGH"));
                    plan.add(new MilestonePlan("Phase 2: High-Fidelity UI & 50% Checkpoint", "Design system tokens, color palettes, responsive desktop/mobile components, and primary mockups.", d2, "HIGH"));
                    plan.add(new MilestonePlan("Phase 3: Interactive Prototype & Revisions", "Interactive Figma prototype, micro-animations, stakeholder feedback review, and adjustments.", d3, "MEDIUM"));
                    plan.add(new MilestonePlan("Phase 4: Design Token Handover & Assets Export", "Organized design library, developer asset exports (SVG, WebP), and design token documentation.", d4, "HIGH"));
                } else {
                    plan.add(new MilestonePlan("Phase 1: Project Setup, Architecture & Database Models", "Initialize repository, setup database schemas, authentication scaffolding, and system architectural foundation.", d1, "HIGH"));
                    plan.add(new MilestonePlan("Phase 2: Core Development & 50% Halfway Checkpoint", "Primary business logic, CRUD endpoints, dashboard interface, and initial client demo milestone.", d2, "HIGH"));
                    plan.add(new MilestonePlan("Phase 3: Integration, Security & QA Verification", "Payment/API integration, input validation, automated tests, responsiveness, and performance tuning.", d3, "MEDIUM"));
                    plan.add(new MilestonePlan("Phase 4: Final Client Acceptance, Polish & Handover", "Comprehensive client review items, production deployment, documentation handover, and final milestone sign-off.", d4, "HIGH"));
                }

                String insTask = "INSERT INTO tasks (project_id, title, description, due_date, priority, status, progress_percent) VALUES (?, ?, ?, ?, ?, 'TODO', 0)";
                try (PreparedStatement ps = c.prepareStatement(insTask)) {
                    for (MilestonePlan m : plan) {
                        ps.setLong(1, projectId);
                        ps.setString(2, m.title());
                        ps.setString(3, m.desc());
                        ps.setDate(4, java.sql.Date.valueOf(today.plusDays(m.dayOffset())));
                        ps.setString(5, m.priority());
                        ps.addBatch();
                    }
                    ps.executeBatch();
                }

                if (companyId > 0) {
                    NotificationDao.create(companyId, "AI Work Timeline Established",
                        "AI analyzed project '" + projectTitle + "' for " + (companyName != null && !companyName.isBlank() ? companyName : "partner") + " and established an optimized " + targetDays + "-day milestone schedule with halfway checkpoint.",
                        "TASK", "company-dashboard.html#tasks");
                }

                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
        return getProjectTimeline(projectId, freelancerId);
    }

    public static Map<String, Object> saveCustomTimeline(long projectId, long freelancerId, String startDateStr, String deadlineStr,
                                                         List<Map<String, Object>> milestones) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                String pSql = "SELECT p.title, p.company_id FROM projects p WHERE p.id = ? AND p.freelancer_id = ?";
                String projectTitle = "";
                long companyId = 0;
                try (PreparedStatement ps = c.prepareStatement(pSql)) {
                    ps.setLong(1, projectId);
                    ps.setLong(2, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectTitle = rs.getString(1);
                            companyId = rs.getLong(2);
                        } else {
                            throw new IllegalArgumentException("Project not found or not owned by freelancer.");
                        }
                    }
                }

                java.sql.Date sDate = (startDateStr != null && !startDateStr.isBlank()) ? java.sql.Date.valueOf(startDateStr) : java.sql.Date.valueOf(java.time.LocalDate.now());
                java.sql.Date eDate = (deadlineStr != null && !deadlineStr.isBlank()) ? java.sql.Date.valueOf(deadlineStr) : java.sql.Date.valueOf(java.time.LocalDate.now().plusDays(14));

                String updP = "UPDATE projects SET start_date = ?, deadline = ? WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(updP)) {
                    ps.setDate(1, sDate);
                    ps.setDate(2, eDate);
                    ps.setLong(3, projectId);
                    ps.executeUpdate();
                }

                if (milestones != null && !milestones.isEmpty()) {
                    for (Map<String, Object> m : milestones) {
                        Long taskId = m.get("id") != null ? ((Number) m.get("id")).longValue() : 0L;
                        String title = String.valueOf(m.get("title"));
                        String description = m.get("description") != null ? String.valueOf(m.get("description")) : "";
                        String priority = m.get("priority") != null ? String.valueOf(m.get("priority")) : "MEDIUM";
                        String dueDateStr = m.get("dueDate") != null ? String.valueOf(m.get("dueDate")) : null;
                        java.sql.Date dueDate = (dueDateStr != null && !dueDateStr.isBlank()) ? java.sql.Date.valueOf(dueDateStr) : null;

                        if (taskId > 0) {
                            String updTask = "UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ? WHERE id = ? AND project_id = ?";
                            try (PreparedStatement ps = c.prepareStatement(updTask)) {
                                ps.setString(1, title);
                                ps.setString(2, description);
                                ps.setString(3, priority);
                                ps.setDate(4, dueDate);
                                ps.setLong(5, taskId);
                                ps.setLong(6, projectId);
                                ps.executeUpdate();
                            }
                        } else {
                            String insTask = "INSERT INTO tasks (project_id, title, description, priority, due_date, status, progress_percent) VALUES (?, ?, ?, ?, ?, 'TODO', 0)";
                            try (PreparedStatement ps = c.prepareStatement(insTask)) {
                                ps.setLong(1, projectId);
                                ps.setString(2, title);
                                ps.setString(3, description);
                                ps.setString(4, priority);
                                ps.setDate(5, dueDate);
                                ps.executeUpdate();
                            }
                        }
                    }
                }

                if (companyId > 0) {
                    NotificationDao.create(companyId, "Custom Timeline Updated",
                        "Freelancer adjusted the milestone dates and work timeline for project '" + projectTitle + "'.",
                        "TASK", "company-dashboard.html#tasks");
                }

                c.commit();
            } catch (SQLException e) {
                c.rollback();
                throw e;
            }
        }
        return getProjectTimeline(projectId, freelancerId);
    }

    public static boolean requestExtension(long taskId, long freelancerId, int extensionDays, String reason) throws SQLException {
        try (Connection c = Db.get()) {
            c.setAutoCommit(false);
            try {
                long projectId = 0;
                long companyId = 0;
                String taskTitle = "";

                String q = "SELECT t.project_id, t.title, p.company_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND p.freelancer_id = ?";
                try (PreparedStatement ps = c.prepareStatement(q)) {
                    ps.setLong(1, taskId);
                    ps.setLong(2, freelancerId);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            projectId = rs.getLong(1);
                            taskTitle = rs.getString(2);
                            companyId = rs.getLong(3);
                        } else {
                            throw new IllegalArgumentException("Task not found or not owned by freelancer.");
                        }
                    }
                }

                int days = extensionDays > 0 ? extensionDays : 3;

                String updTask = "UPDATE tasks SET due_date = DATE_ADD(COALESCE(due_date, CURRENT_DATE), INTERVAL ? DAY) WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(updTask)) {
                    ps.setInt(1, days);
                    ps.setLong(2, taskId);
                    ps.executeUpdate();
                }

                String updProj = "UPDATE projects SET deadline = DATE_ADD(COALESCE(deadline, CURRENT_DATE), INTERVAL ? DAY) WHERE id = ?";
                try (PreparedStatement ps = c.prepareStatement(updProj)) {
                    ps.setInt(1, days);
                    ps.setLong(2, projectId);
                    ps.executeUpdate();
                }

                String insUp = "INSERT INTO progress_updates (task_id, project_id, freelancer_id, is_halfway_confirmed, notes) VALUES (?, ?, ?, false, ?)";
                try (PreparedStatement ps = c.prepareStatement(insUp)) {
                    ps.setLong(1, taskId);
                    ps.setLong(2, projectId);
                    ps.setLong(3, freelancerId);
                    ps.setString(4, "Extension requested (+" + days + " days). Reason: " + (reason != null ? reason : "Schedule refinement"));
                    ps.executeUpdate();
                }

                if (companyId > 0) {
                    NotificationDao.create(companyId, "Timeline Extension Requested",
                        "Freelancer requested a +" + days + "-day extension for task '" + taskTitle + "'. Reason: " + (reason != null && !reason.isBlank() ? reason : "Milestone refinement"),
                        "TASK", "company-dashboard.html#tasks");
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
