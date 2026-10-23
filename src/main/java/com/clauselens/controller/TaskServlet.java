package com.clauselens.controller;

import com.clauselens.dao.TaskDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@WebServlet(urlPatterns = {
    "/api/tasks",
    "/api/tasks/halfway",
    "/api/tasks/complete",
    "/api/tasks/timeline",
    "/api/tasks/projects",
    "/api/tasks/ai-timeline",
    "/api/tasks/custom-timeline",
    "/api/tasks/extend"
})
public class TaskServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }

        long userId = (Long) s.getAttribute("userId");
        String role = (String) s.getAttribute("role");
        String path = req.getServletPath();

        try {
            if ("/api/tasks/projects".equals(path)) {
                Json.send(resp, 200, TaskDao.listFreelancerProjects(userId));
                return;
            }

            if ("/api/tasks/timeline".equals(path)) {
                String pStr = req.getParameter("projectId");
                if (pStr == null || pStr.isBlank()) {
                    List<Map<String, Object>> projs = TaskDao.listFreelancerProjects(userId);
                    if (projs.isEmpty()) {
                        Json.send(resp, 200, Map.of("hasProjects", false));
                        return;
                    }
                    long firstProjId = ((Number) projs.get(0).get("id")).longValue();
                    Json.send(resp, 200, TaskDao.getProjectTimeline(firstProjId, userId));
                    return;
                }
                long projId = Long.parseLong(pStr);
                Map<String, Object> timeline = TaskDao.getProjectTimeline(projId, userId);
                if (timeline == null) {
                    Json.error(resp, 404, "Project timeline not found.");
                    return;
                }
                Json.send(resp, 200, timeline);
                return;
            }

            String projIdStr = req.getParameter("projectId");
            if (projIdStr != null && !projIdStr.isBlank()) {
                long projId = Long.parseLong(projIdStr);
                Json.send(resp, 200, TaskDao.listByProject(projId));
                return;
            }

            if ("FREELANCER".equalsIgnoreCase(role)) {
                Json.send(resp, 200, TaskDao.listForFreelancer(userId));
            } else if ("COMPANY".equalsIgnoreCase(role)) {
                Json.send(resp, 200, TaskDao.listForCompany(userId));
            } else {
                Json.send(resp, 200, List.of());
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Task fetch error: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);

            if ("/api/tasks/ai-timeline".equals(path)) {
                long projectId = ((Number) body.get("projectId")).longValue();
                Integer customDays = body.get("customDays") != null ? ((Number) body.get("customDays")).intValue() : null;
                String scope = body.get("scope") != null ? String.valueOf(body.get("scope")) : "";
                Map<String, Object> res = TaskDao.generateAiTimeline(projectId, userId, customDays, scope);
                Json.send(resp, 200, res);
            } else if ("/api/tasks/custom-timeline".equals(path)) {
                long projectId = ((Number) body.get("projectId")).longValue();
                String startDate = body.get("startDate") != null ? String.valueOf(body.get("startDate")) : null;
                String deadline = body.get("deadline") != null ? String.valueOf(body.get("deadline")) : null;
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> milestones = (List<Map<String, Object>>) body.get("milestones");
                Map<String, Object> res = TaskDao.saveCustomTimeline(projectId, userId, startDate, deadline, milestones);
                Json.send(resp, 200, res);
            } else if ("/api/tasks/extend".equals(path)) {
                long taskId = ((Number) body.get("taskId")).longValue();
                int extensionDays = body.get("extensionDays") != null ? ((Number) body.get("extensionDays")).intValue() : 3;
                String reason = body.get("reason") != null ? String.valueOf(body.get("reason")) : "";
                boolean ok = TaskDao.requestExtension(taskId, userId, extensionDays, reason);
                Json.send(resp, 200, Map.of("ok", ok));
            } else if ("/api/tasks/halfway".equals(path)) {
                long taskId = ((Number) body.get("taskId")).longValue();
                boolean completedHalf = Boolean.TRUE.equals(body.get("completedHalf"));
                String notes = body.get("notes") != null ? String.valueOf(body.get("notes")) : "";
                boolean ok = TaskDao.recordHalfwayProgress(taskId, userId, completedHalf, notes);
                Json.send(resp, 200, Map.of("ok", ok));
            } else if ("/api/tasks/complete".equals(path)) {
                long taskId = ((Number) body.get("taskId")).longValue();
                String notes = body.get("notes") != null ? String.valueOf(body.get("notes")) : "";
                boolean ok = TaskDao.completeTask(taskId, userId, notes);
                Json.send(resp, 200, Map.of("ok", ok));
            } else {
                // Create task
                long projectId = ((Number) body.get("projectId")).longValue();
                String title = String.valueOf(body.get("title"));
                String description = body.get("description") != null ? String.valueOf(body.get("description")) : "";
                String priority = body.get("priority") != null ? String.valueOf(body.get("priority")) : "MEDIUM";
                String dueDate = body.get("dueDate") != null ? String.valueOf(body.get("dueDate")) : null;

                long taskId = TaskDao.createTask(projectId, title, description, priority, dueDate);
                Json.send(resp, 201, Map.of("ok", true, "taskId", taskId));
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Task operation failed: " + e.getMessage());
        }
    }
}
