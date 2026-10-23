@echo off
set "CATALINA_HOME=D:\tomcat10\apache-tomcat-10.1.61"
set "CATALINA_BASE=D:\tomcat10\apache-tomcat-10.1.61"
set "JAVA_HOME=C:\Program Files\Java\jdk-27"

echo Stopping Apache Tomcat 10 for ClauseLens...
call "D:\tomcat10\apache-tomcat-10.1.61\bin\catalina.bat" stop
