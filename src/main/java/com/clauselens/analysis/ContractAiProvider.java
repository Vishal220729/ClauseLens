package com.clauselens.analysis;

import java.util.List;
import java.util.Map;

public interface ContractAiProvider {
    record AnalysisResult(
        String status,
        int totalFindings,
        int highCount,
        int mediumCount,
        int lowCount,
        List<Finding> findings,
        String emailDraft,
        int safetyScore,
        String riskClassification
    ) {
        public AnalysisResult(String status, int totalFindings, int highCount, int mediumCount, int lowCount, List<Finding> findings, String emailDraft) {
            this(status, totalFindings, highCount, mediumCount, lowCount, findings, emailDraft,
                 Math.max(10, Math.min(98, 100 - (highCount * 18 + mediumCount * 8 + lowCount * 3))),
                 (highCount >= 3 ? "CRITICAL RISK" : (highCount > 0 ? "HIGH RISK" : (mediumCount > 0 ? "MEDIUM RISK" : "LOW RISK"))));
        }
    }

    record Finding(
        String title,
        String severity,
        String category,
        String exactQuote,
        String clauseReference,
        String policyRule,
        String simpleExplanation,
        String potentialImpact,
        String suggestedNegotiation,
        boolean isVerified
    ) {}

    AnalysisResult analyze(String contractText, List<Map<String, Object>> policies, String companyName, String freelancerName);
}
