package com.clauselens.security;

import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;

/** Keeps each dashboard page behind its own role. Data endpoints must also check the role. */
@WebFilter(urlPatterns = {
    "/admin-dashboard.html",
    "/reports.html",
    "/company-dashboard.html",
    "/freelancer-dashboard.html",
    "/policy-builder.html",
    "/contract-analyzer.html",
    "/contract_analyzer.html"
})
public class RoleFilter implements Filter {
    private static final Map<String, String> ROLE_BY_PAGE = Map.of(
        "/admin-dashboard.html", "ADMIN",
        "/reports.html", "ADMIN",
        "/company-dashboard.html", "COMPANY",
        "/freelancer-dashboard.html", "FREELANCER",
        "/policy-builder.html", "FREELANCER",
        "/contract-analyzer.html", "FREELANCER",
        "/contract_analyzer.html", "FREELANCER");
    private static final Map<String, String> LOGIN_BY_ROLE = Map.of(
        "ADMIN", "/admin-login.html",
        "COMPANY", "/company-login.html",
        "FREELANCER", "/freelancer-login.html");

    @Override
    public void doFilter(ServletRequest rq, ServletResponse rs, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) rq;
        HttpServletResponse resp = (HttpServletResponse) rs;
        String need = ROLE_BY_PAGE.get(req.getServletPath());
        HttpSession s = req.getSession(false);
        String role = (s == null) ? null : (String) s.getAttribute("role");
        if (need == null || !need.equals(role)) {
            resp.sendRedirect(req.getContextPath() + LOGIN_BY_ROLE.getOrDefault(need, "/index.html"));
            return;
        }
        resp.setHeader("Cache-Control", "no-store");
        chain.doFilter(rq, rs);
    }
}
