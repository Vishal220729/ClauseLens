package com.clauselens.controller;

import com.clauselens.dao.UserDao;
import com.clauselens.security.PasswordUtil;
import com.clauselens.util.Db;
import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;
import jakarta.servlet.annotation.WebListener;
import java.sql.Connection;

/** Creates the first admin from environment variables. There is no public admin registration. */
@WebListener
public class AppInit implements ServletContextListener {
    @Override
    public void contextInitialized(ServletContextEvent e) {
        String email = Db.env("CL_ADMIN_EMAIL", "");
        String pass = Db.env("CL_ADMIN_PASSWORD", "");
        try {
            if (UserDao.adminExists()) return;
            if (email.isEmpty() || pass.length() < 8) {
                System.err.println("[ClauseLens] No admin exists. Set CL_ADMIN_EMAIL and CL_ADMIN_PASSWORD (8+ chars) and restart Tomcat.");
                return;
            }
            try (Connection c = Db.get()) {
                UserDao.insert(c, "ADMIN", email.toLowerCase(), PasswordUtil.hash(pass));
            }
            UserDao.audit(null, "ADMIN_SEEDED", "Initial admin created from environment", "startup");
            System.out.println("[ClauseLens] Initial admin created: " + email);
        } catch (Exception ex) {
            System.err.println("[ClauseLens] Startup check failed: " + ex.getMessage());
        }
    }
}
