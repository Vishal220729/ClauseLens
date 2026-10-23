CREATE DATABASE IF NOT EXISTS clauselens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clauselens;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('ADMIN','COMPANY','FREELANCER') NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  status ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

-- 2. Companies
CREATE TABLE IF NOT EXISTS companies (
  user_id BIGINT PRIMARY KEY,
  company_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  industry VARCHAR(100) NOT NULL,
  country VARCHAR(80) NOT NULL,
  description TEXT,
  website VARCHAR(200),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_companies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Freelancers
CREATE TABLE IF NOT EXISTS freelancers (
  user_id BIGINT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  country VARCHAR(80) NOT NULL,
  experience_level ENUM('Beginner','Intermediate','Expert') NOT NULL DEFAULT 'Intermediate',
  skills VARCHAR(500) NOT NULL,
  description TEXT,
  portfolio_url VARCHAR(300),
  reward_points INT NOT NULL DEFAULT 0,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_freelancers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Domain Templates
CREATE TABLE IF NOT EXISTS domain_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 5. Freelancer Domains
CREATE TABLE IF NOT EXISTS freelancer_domains (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  freelancer_id BIGINT NOT NULL,
  domain VARCHAR(80) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_freelancer_domain (freelancer_id, domain),
  CONSTRAINT fk_fd_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Jobs
CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  domain VARCHAR(80) NOT NULL,
  skills VARCHAR(300) NOT NULL,
  budget DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  advance_percentage INT NOT NULL DEFAULT 30,
  start_date DATE,
  deadline DATE,
  revision_requirements VARCHAR(255) DEFAULT 'Up to 3 revisions included',
  maintenance_requirements VARCHAR(255) DEFAULT '30 days bug fixing',
  application_deadline DATE,
  status ENUM('DRAFT','PUBLISHED','HIRED','CLOSED','CANCELLED') NOT NULL DEFAULT 'PUBLISHED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_company FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE CASCADE,
  KEY idx_jobs_domain (domain),
  KEY idx_jobs_status (status)
) ENGINE=InnoDB;

-- 7. Job Requirements / Deliverables Checklist
CREATE TABLE IF NOT EXISTS job_requirements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT NOT NULL,
  item_text VARCHAR(255) NOT NULL,
  is_deliverable BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_job_req_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Applications / Proposals
CREATE TABLE IF NOT EXISTS applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  cover_letter TEXT NOT NULL,
  estimated_price DECIMAL(12,2) NOT NULL,
  estimated_days INT NOT NULL DEFAULT 14,
  status ENUM('SUBMITTED','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_freelancer (job_id, freelancer_id),
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  budget DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  advance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  start_date DATE,
  deadline DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proj_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_proj_company FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_proj_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NULL,
  job_id BIGINT NULL,
  company_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conv_parties (company_id, freelancer_id, job_id),
  CONSTRAINT fk_conv_company FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. Messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. Agreements
CREATE TABLE IF NOT EXISTS agreements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  company_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  status ENUM('DRAFT','PENDING_ANALYSIS','REVISION_REQUESTED','ACCEPTED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_agr_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_agr_company FOREIGN KEY (company_id) REFERENCES companies(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_agr_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. Agreement Versions
CREATE TABLE IF NOT EXISTS agreement_versions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agreement_id BIGINT NOT NULL,
  version_number INT NOT NULL,
  scope TEXT NOT NULL,
  deliverables TEXT NOT NULL,
  responsibilities TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  advance_percentage INT NOT NULL DEFAULT 30,
  milestone_terms TEXT,
  payment_due_days INT NOT NULL DEFAULT 15,
  revision_limit INT NOT NULL DEFAULT 3,
  maintenance_terms VARCHAR(255) DEFAULT '30-day bug fixing warranty included',
  ip_terms VARCHAR(255) DEFAULT 'Client owns final deliverables upon 100% full payment',
  confidentiality_terms TEXT,
  termination_terms TEXT,
  liability_terms VARCHAR(255) DEFAULT 'Capped at total agreement value',
  jurisdiction VARCHAR(120) DEFAULT 'Mutual jurisdiction of freelancer location',
  additional_terms TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agr_version (agreement_id, version_number),
  CONSTRAINT fk_agrv_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. Agreement Acceptances
CREATE TABLE IF NOT EXISTS agreement_acceptances (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agreement_id BIGINT NOT NULL,
  version_number INT NOT NULL,
  user_id BIGINT NOT NULL,
  role ENUM('COMPANY','FREELANCER') NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_agr_acceptance (agreement_id, version_number, role),
  CONSTRAINT fk_agra_agreement FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE,
  CONSTRAINT fk_agra_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. Contract Uploads (PDF / DOCX / TXT)
CREATE TABLE IF NOT EXISTS contract_uploads (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agreement_id BIGINT NULL,
  uploader_id BIGINT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size BIGINT NOT NULL,
  extracted_text MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cu_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. Freelancer Policy Builder & Rules
CREATE TABLE IF NOT EXISTS freelancer_policies (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  freelancer_id BIGINT NOT NULL,
  policy_name VARCHAR(120) NOT NULL DEFAULT 'Standard Protection Policy',
  version_number INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fp_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS policy_rules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  policy_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  category VARCHAR(60) NOT NULL,
  rule_name VARCHAR(150) NOT NULL,
  expected_value VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL DEFAULT '<=',
  unit VARCHAR(50) DEFAULT 'days',
  severity ENUM('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_policy FOREIGN KEY (policy_id) REFERENCES freelancer_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 17. Contract Analyses
CREATE TABLE IF NOT EXISTS contract_analyses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agreement_id BIGINT NULL,
  version_number INT NOT NULL DEFAULT 1,
  company_id BIGINT NULL,
  freelancer_id BIGINT NOT NULL,
  upload_id BIGINT NULL,
  original_filename VARCHAR(255) NOT NULL,
  policy_version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
  total_findings INT NOT NULL DEFAULT 0,
  high_severity_count INT NOT NULL DEFAULT 0,
  medium_severity_count INT NOT NULL DEFAULT 0,
  low_severity_count INT NOT NULL DEFAULT 0,
  status ENUM('COMPLETED','PENDING','FAILED') NOT NULL DEFAULT 'COMPLETED',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ca_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. Risk Findings
CREATE TABLE IF NOT EXISTS risk_findings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  analysis_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  severity ENUM('HIGH','MEDIUM','LOW') NOT NULL,
  category ENUM('POLICY_CONFLICT','POTENTIAL_RISK','MISSING_PROTECTION','AMBIGUOUS_CLAUSE','MANUAL_REVIEW') NOT NULL,
  exact_quote TEXT,
  clause_reference VARCHAR(100),
  policy_rule VARCHAR(150),
  simple_explanation TEXT NOT NULL,
  potential_impact TEXT NOT NULL,
  suggested_negotiation TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  resolution_status ENUM('OPEN','RESOLVED','NEW') NOT NULL DEFAULT 'OPEN',
  CONSTRAINT fk_rf_analysis FOREIGN KEY (analysis_id) REFERENCES contract_analyses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 19. Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  due_date DATE,
  status ENUM('PENDING','IN_PROGRESS','COMPLETED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 20. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  milestone_id BIGINT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE,
  priority ENUM('HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('TODO','IN_PROGRESS','HALF_DONE','COMPLETED') NOT NULL DEFAULT 'TODO',
  progress_percent INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tsk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 21. Progress Updates
CREATE TABLE IF NOT EXISTS progress_updates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  freelancer_id BIGINT NOT NULL,
  is_halfway_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pu_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_pu_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_pu_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 22. Payments
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  milestone_id BIGINT NULL,
  title VARCHAR(150) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  due_date DATE,
  status ENUM('PENDING','DUE_SOON','OVERDUE','RECEIVED','DISPUTED') NOT NULL DEFAULT 'PENDING',
  freelancer_confirmed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pay_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 23. Payment Reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  recipient_id BIGINT NOT NULL,
  reminder_type ENUM('ADVANCE_DUE','MILESTONE_DUE','OVERDUE','PAYMENT_NOT_RECEIVED') NOT NULL,
  message_draft TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pr_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_pr_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 24. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  category ENUM('APPLICATION','MESSAGE','AGREEMENT','ANALYSIS','TASK','PAYMENT','REWARD') NOT NULL,
  reference_url VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- 25. Reward Transactions
CREATE TABLE IF NOT EXISTS reward_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  freelancer_id BIGINT NOT NULL,
  project_id BIGINT NULL,
  task_id BIGINT NULL,
  points INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 26. Withdrawals / Payouts
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  freelancer_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  amount_inr DECIMAL(12,2) NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  account_info VARCHAR(255) NOT NULL,
  status ENUM('PENDING','PROCESSING','COMPLETED') NOT NULL DEFAULT 'COMPLETED',
  transaction_ref VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wdr_freelancer FOREIGN KEY (freelancer_id) REFERENCES freelancers(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 27. Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('OPEN','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 27. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT NULL,
  action VARCHAR(80) NOT NULL,
  details VARCHAR(500),
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor (actor_user_id),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB;

-- 28. Automated Email Dispatches & Activity Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipient_email VARCHAR(190) NOT NULL,
  recipient_name VARCHAR(120),
  sender_email VARCHAR(190) NOT NULL DEFAULT 'notifications@clauselens.com',
  subject VARCHAR(255) NOT NULL,
  body_text TEXT NOT NULL,
  body_html LONGTEXT NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  reference_id BIGINT NULL,
  status ENUM('SENT', 'QUEUED', 'FAILED') NOT NULL DEFAULT 'SENT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_recipient (recipient_email),
  KEY idx_email_type (email_type),
  KEY idx_email_created (created_at)
) ENGINE=InnoDB;

-- Initial Seed Data
INSERT IGNORE INTO domain_templates (name) VALUES
('Web Development'),('Mobile App Development'),('Graphic Design'),('UI/UX Design'),
('Content Writing'),('Video Editing'),('Digital Marketing'),('Software Testing'),
('Data Analysis'),('Consulting'),('Other');

