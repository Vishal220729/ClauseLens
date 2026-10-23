package com.clauselens.controller;

import com.clauselens.analysis.ContractAiProvider;
import com.clauselens.dao.AnalysisDao;
import com.clauselens.dao.PolicyDao;
import com.clauselens.dao.UserDao;
import com.clauselens.util.Json;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;

@WebServlet(urlPatterns = {"/api/analyses", "/api/analyses/analyze", "/api/analyses/detail", "/api/analyses/compare"})
public class AnalysisServlet extends HttpServlet {

    private final ContractAiProvider aiProvider = new com.clauselens.analysis.DeepContractAiProvider();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || s.getAttribute("userId") == null) {
            Json.error(resp, 401, "Login required.");
            return;
        }
        long userId = (Long) s.getAttribute("userId");
        String path = req.getServletPath();

        try {
            if ("/api/analyses/detail".equals(path)) {
                long id = Long.parseLong(req.getParameter("id"));
                Map<String, Object> detail = AnalysisDao.getDetail(id);
                if (detail == null) {
                    Json.error(resp, 404, "Report not found.");
                    return;
                }
                Json.send(resp, 200, detail);
            } else if ("/api/analyses/compare".equals(path)) {
                long id1 = Long.parseLong(req.getParameter("id1"));
                long id2 = Long.parseLong(req.getParameter("id2"));
                Map<String, Object> comparison = AnalysisDao.compareAnalyses(id1, id2);
                if (comparison == null) {
                    Json.error(resp, 404, "One or both reports not found.");
                    return;
                }
                Json.send(resp, 200, comparison);
            } else {
                // List for freelancer
                Json.send(resp, 200, AnalysisDao.listForFreelancer(userId));
            }
        } catch (Exception e) {
            Json.error(resp, 500, "Analysis query error: " + e.getMessage());
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession s = req.getSession(false);
        if (s == null || !"FREELANCER".equals(s.getAttribute("role"))) {
            Json.error(resp, 401, "Only freelancers can run agreement risk analysis.");
            return;
        }
        long freelancerId = (Long) s.getAttribute("userId");

        try {
            Map<String, Object> body = Json.read(req);
            String contractText = String.valueOf(body.get("contractText")).trim();
            if (contractText.isEmpty()) {
                Json.error(resp, 400, "Contract text cannot be empty.");
                return;
            }

            String filename = body.get("filename") != null ? String.valueOf(body.get("filename")) : "agreement-draft.txt";
            Long agreementId = body.get("agreementId") != null ? ((Number) body.get("agreementId")).longValue() : null;
            Long companyId = body.get("companyId") != null ? ((Number) body.get("companyId")).longValue() : null;

            // Load active policy rules
            List<Map<String, Object>> policies = PolicyDao.getRules(freelancerId);
            String freelancerName = UserDao.displayName(freelancerId, "FREELANCER");
            String companyName = companyId != null ? UserDao.displayName(companyId, "COMPANY") : "Client";

            // Run AI Analysis
            ContractAiProvider.AnalysisResult result = aiProvider.analyze(contractText, policies, companyName, freelancerName);

            // Save in database
            long analysisId = AnalysisDao.saveAnalysis(freelancerId, agreementId, companyId, filename, result);

            Map<String, Object> resMap = new LinkedHashMap<>();
            resMap.put("analysisId", analysisId);
            resMap.put("totalFindings", result.totalFindings());
            resMap.put("highCount", result.highCount());
            resMap.put("mediumCount", result.mediumCount());
            resMap.put("lowCount", result.lowCount());
            resMap.put("safetyScore", result.safetyScore());
            resMap.put("riskClassification", result.riskClassification());
            resMap.put("findings", result.findings());
            resMap.put("emailDraft", result.emailDraft());

            UserDao.audit(freelancerId, "AGREEMENT_ANALYSIS", "Analysis ID: " + analysisId + " on " + filename, req.getRemoteAddr());

            Json.send(resp, 201, resMap);
        } catch (Exception e) {
            Json.error(resp, 400, "Analysis execution failed: " + e.getMessage());
        }
    }
}
