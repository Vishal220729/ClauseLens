package com.clauselens.util;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Pure Java Direct SSL Client for Google Mail SMTP (smtp.gmail.com:465).
 * Dispatches authentic RFC 5321 MIME multipart emails through Google servers.
 */
public final class GmailSmtpClient {
    private static final String SMTP_HOST = "smtp.gmail.com";
    private static final int SMTP_PORT = 465;

    private GmailSmtpClient() {}

    public record SendResult(boolean success, String message, String serverResponse) {}

    public static SendResult send(String gmailUser, String gmailAppPassword, String fromName,
                                  String toEmail, String toName, String subject,
                                  String bodyText, String bodyHtml) {
        if (gmailUser == null || gmailUser.isBlank() || gmailAppPassword == null || gmailAppPassword.isBlank()) {
            return new SendResult(false, "Gmail user or App Password is not configured.", null);
        }

        String cleanUser = gmailUser.trim();
        String cleanPass = gmailAppPassword.replace(" ", "").trim();

        try (SSLSocket socket = (SSLSocket) SSLSocketFactory.getDefault().createSocket(SMTP_HOST, SMTP_PORT)) {
            socket.setSoTimeout(14000); // 14s timeout

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));

            // 1. Greeting: 220 smtp.gmail.com ...
            String resp = readReply(reader);
            if (!resp.startsWith("220")) throw new IOException("SMTP connection greeting failed: " + resp);

            // 2. EHLO
            sendCmd(writer, "EHLO clauselens.com");
            readMultilineReply(reader);

            // 3. AUTH LOGIN
            sendCmd(writer, "AUTH LOGIN");
            resp = readReply(reader);
            if (!resp.startsWith("334")) throw new IOException("AUTH LOGIN rejected: " + resp);

            // 4. Send Base64 Username
            sendCmd(writer, Base64.getEncoder().encodeToString(cleanUser.getBytes(StandardCharsets.UTF_8)));
            resp = readReply(reader);
            if (!resp.startsWith("334")) throw new IOException("Username rejected: " + resp);

            // 5. Send Base64 App Password
            sendCmd(writer, Base64.getEncoder().encodeToString(cleanPass.getBytes(StandardCharsets.UTF_8)));
            resp = readReply(reader);
            if (!resp.startsWith("235")) {
                throw new IOException("Gmail Authentication failed (Invalid Gmail address or 16-character App Password): " + resp);
            }

            // 6. MAIL FROM
            sendCmd(writer, "MAIL FROM:<" + cleanUser + ">");
            resp = readReply(reader);
            if (!resp.startsWith("250")) throw new IOException("MAIL FROM rejected: " + resp);

            // 7. RCPT TO
            sendCmd(writer, "RCPT TO:<" + toEmail.trim() + ">");
            resp = readReply(reader);
            if (!resp.startsWith("250")) throw new IOException("RCPT TO rejected for " + toEmail + ": " + resp);

            // 8. DATA
            sendCmd(writer, "DATA");
            resp = readReply(reader);
            if (!resp.startsWith("354")) throw new IOException("DATA rejected: " + resp);

            // 9. Send headers & MIME multipart body
            String boundary = "----=_Part_" + System.currentTimeMillis();
            String senderDisplay = (fromName != null && !fromName.isBlank()) ? fromName : "ClauseLens Official";

            StringBuilder msg = new StringBuilder();
            msg.append("From: \"").append(senderDisplay).append("\" <").append(cleanUser).append(">\r\n");
            msg.append("To: \"").append(toName != null && !toName.isBlank() ? toName : toEmail).append("\" <").append(toEmail.trim()).append(">\r\n");
            msg.append("Subject: =?UTF-8?B?").append(Base64.getEncoder().encodeToString(subject.getBytes(StandardCharsets.UTF_8))).append("?=\r\n");
            msg.append("MIME-Version: 1.0\r\n");
            msg.append("Content-Type: multipart/alternative; boundary=\"").append(boundary).append("\"\r\n");
            msg.append("\r\n");

            // Plain text part
            msg.append("--").append(boundary).append("\r\n");
            msg.append("Content-Type: text/plain; charset=UTF-8\r\n");
            msg.append("Content-Transfer-Encoding: base64\r\n");
            msg.append("\r\n");
            msg.append(Base64.getMimeEncoder().encodeToString((bodyText != null ? bodyText : "").getBytes(StandardCharsets.UTF_8))).append("\r\n");

            // HTML part
            if (bodyHtml != null && !bodyHtml.isBlank()) {
                msg.append("--").append(boundary).append("\r\n");
                msg.append("Content-Type: text/html; charset=UTF-8\r\n");
                msg.append("Content-Transfer-Encoding: base64\r\n");
                msg.append("\r\n");
                msg.append(Base64.getMimeEncoder().encodeToString(bodyHtml.getBytes(StandardCharsets.UTF_8))).append("\r\n");
            }

            msg.append("--").append(boundary).append("--\r\n");
            msg.append("\r\n.\r\n");

            writer.write(msg.toString());
            writer.flush();

            resp = readReply(reader);
            if (!resp.startsWith("250")) throw new IOException("Message delivery rejected by Gmail: " + resp);

            // 10. QUIT
            sendCmd(writer, "QUIT");

            return new SendResult(true, "Email delivered via Gmail SMTP (" + cleanUser + ").", resp);
        } catch (Exception e) {
            return new SendResult(false, e.getMessage(), null);
        }
    }

    private static void sendCmd(BufferedWriter writer, String cmd) throws IOException {
        writer.write(cmd + "\r\n");
        writer.flush();
    }

    private static String readReply(BufferedReader reader) throws IOException {
        String line = reader.readLine();
        if (line == null) throw new IOException("Premature connection close from smtp.gmail.com");
        return line;
    }

    private static String readMultilineReply(BufferedReader reader) throws IOException {
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\n");
            if (line.length() >= 4 && line.charAt(3) == ' ') break;
        }
        return sb.toString();
    }
}
