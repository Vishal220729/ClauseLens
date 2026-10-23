package com.clauselens.controller;

import com.clauselens.dao.JobDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.Map;

@WebServlet(urlPatterns = {"/api/jobs", "/api/jobs/my", "/api/jobs/status"})
public class JobServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String path = req.getServletPath();
        HttpSession s = req.getSession(false);

        if ("/api/jobs/my".equals(path)) {
            if (s == null || !"COMPANY".equals(s.getAttribute("role"))) {
                Json.error(resp, 401, "Company login required.");
                return;
            }
            long companyId = (Long) s.getAttribute("userId");
            try {
                Json.send(resp, 200, JobDao.listByCompany(companyId));
            } catch (SQLException e) {
                Json.error(resp, 500, "Failed to load company jobs: " + e.getMessage());
            }
        } else {
            // Public / Freelancer job browsing
            String domain = req.getParameter("domain");
            String search = req.getParameter("search");
            try {
                Json.send(resp, 200, JobDao.listPublished(domain, search));
            } catch (SQLException e) {
                Json.error(resp, 500, "Failed to load jobs: " + e.getMessage());
            }
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"COMPANY".equals(s.getAttribute("role"))) {
            Json.error(resp, 401, "Company login required.");
            return;
        }
        long companyId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            Map<String, Object> body = Json.read(req);
            if ("/api/jobs/status".equals(path)) {
                long jobId = ((Number) body.get("jobId")).longValue();
                String status = String.valueOf(body.get("status"));
                JobDao.updateStatus(jobId, companyId, status);
                Json.send(resp, 200, Map.of("ok", true));
            } else {
                // Create job
                String title = String.valueOf(body.get("title"));
                String description = String.valueOf(body.get("description"));
                String domain = String.valueOf(body.get("domain"));
                String skills = String.valueOf(body.get("skills"));
                BigDecimal budget = new BigDecimal(String.valueOf(body.get("budget")));
                int advance = body.get("advancePercentage") != null ? ((Number) body.get("advancePercentage")).intValue() : 30;
                String deadline = body.get("deadline") != null ? String.valueOf(body.get("deadline")) : null;
                String revisions = body.get("revisionRequirements") != null ? String.valueOf(body.get("revisionRequirements")) : "Up to 3 revisions";
                String maintenance = body.get("maintenanceRequirements") != null ? String.valueOf(body.get("maintenanceRequirements")) : "30 days warranty";

                long id = JobDao.createJob(companyId, title, description, domain, skills, budget, advance, deadline, revisions, maintenance);
                Json.send(resp, 201, Map.of("ok", true, "jobId", id));
            }
        } catch (Exception e) {
            Json.error(resp, 400, "Invalid job data: " + e.getMessage());
        }
    }
}
