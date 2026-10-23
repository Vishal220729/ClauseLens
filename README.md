# ClauseLens (Phase 1)
Java 21 + Servlets (Tomcat 10.1) + MySQL 8 + vanilla JS. Phase 1: three login portals, company and freelancer registration, sessions, role-protected dashboards, emerald landing page.

## Run it
1. Install JDK 21, Maven, MySQL 8, Apache Tomcat 10.1 (Jakarta namespace, not Tomcat 9).
2. Create the database: `mysql -u root -p < sql/schema.sql`
3. Set environment variables before starting Tomcat:
   - `CL_DB_URL` (optional), `CL_DB_USER`, `CL_DB_PASS`
   - `CL_ADMIN_EMAIL`, `CL_ADMIN_PASSWORD` (8+ chars). The first admin is created at startup if none exists.
4. Build: `mvn clean package` gives `target/clauselens.war`
5. Copy the war to `TOMCAT/webapps/`, start Tomcat, open `http://localhost:8080/clauselens/`

## Test
- Register a company and a freelancer, log in on their own portals, log out.
- Log into the company account on the freelancer portal: it must be rejected.
- Open `/clauselens/admin-dashboard.html` while logged out: it must redirect to the admin login.
- Five wrong passwords block that email and IP for 10 minutes.

## Layout
`src/main/java/com/clauselens/{controller,dao,security,util}` backend; `src/main/webapp` HTML, `css/`, `js/`; `sql/schema.sql`.
Later phases add the remaining packages and tables from the spec; nothing here is replaced.
