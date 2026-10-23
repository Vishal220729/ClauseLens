@echo off
set "CATALINA_HOME=D:\tomcat10\apache-tomcat-10.1.61"
set "CATALINA_BASE=D:\tomcat10\apache-tomcat-10.1.61"
set "JAVA_HOME=C:\Program Files\Java\jdk-27"
set "CL_DB_URL=jdbc:mysql://localhost:3306/clauselens?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
set "CL_DB_USER=root"
set "CL_DB_PASS="
set "CL_ADMIN_EMAIL=admin@clauselens.com"
set "CL_ADMIN_PASSWORD=AdminPass123!"

echo Starting Apache Tomcat 10 for ClauseLens...
call "%CATALINA_HOME%\bin\catalina.bat" run
