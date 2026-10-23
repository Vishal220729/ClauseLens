package com.clauselens.analysis;

import java.util.List;
import java.util.Map;

/**
 * Backward-compatible wrapper delegating directly to DeepContractAiProvider.
 */
public class MockContractAiProvider implements ContractAiProvider {

    private final DeepContractAiProvider deepProvider = new DeepContractAiProvider();

    @Override
    public AnalysisResult analyze(String contractText, List<Map<String, Object>> policies, String companyName, String freelancerName) {
        return deepProvider.analyze(contractText, policies, companyName, freelancerName);
    }
}
