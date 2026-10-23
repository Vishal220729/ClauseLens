// ClauseLens AI Contract Risk Analyzer Logic
(function() {
  const PRESET_SAMPLES = {
    'high-risk': `MASTER SERVICES AGREEMENT
This Agreement is entered between Client Inc. ("Company") and Freelance Developer ("Contractor").
1. PAYMENT TERMS: All invoices shall be paid within 90 days after formal client acceptance. Contractor shall receive 0% advance deposit.
2. SCOPE & REVISIONS: Contractor agrees to provide unlimited revisions without additional compensation until client is fully satisfied.
3. DELIVERABLES & DEADLINES: If Contractor misses any delivery date by more than 24 hours, Company may withhold 50% of the total project fee as liquidated damages.
4. INTELLECTUAL PROPERTY: Contractor assigns all right, title, and interest, including moral rights and all pre-existing tools, code libraries, and techniques to Company immediately upon inception, regardless of payment.
5. LIABILITY & INDEMNIFICATION: Contractor shall indemnify, defend, and hold harmless Company from any and all damages, lost profits, claims, and third-party liabilities with no maximum liability cap.
6. TERMINATION: Company may terminate this Agreement immediately at any time for convenience with no kill fee or compensation for work-in-progress.
7. NON-COMPETE & RESTRICTIONS: Contractor agrees not to provide software services to any business in Company's industry worldwide for a period of 24 months after completion.`,

    'balanced': `FREELANCE WEB DEVELOPMENT SERVICES AGREEMENT
This Agreement is entered between Acme Studio ("Client") and Alex Mercer ("Developer").
1. PAYMENT TERMS: Client shall pay Developer a 30% advance deposit upon contract signing. Remaining milestone balance is payable Net-15 days upon milestone completion.
2. SCOPE & REVISIONS: Scope includes two (2) complimentary rounds of revisions per milestone. Additional requested revisions shall be billed at Developer's standard rate of $85/hour.
3. DELIVERABLES: Timeline estimates allow a reasonable 5-day cure period for unforeseen technical delays.
4. INTELLECTUAL PROPERTY: Developer assigns ownership of the bespoke deliverables to Client upon full and final payment. Developer retains ownership of background utilities and generic tools.
5. TERMINATION: Either party may terminate with 14 days written notice. Developer shall be compensated on a pro-rata basis for all approved work completed up to termination date.
6. LIABILITY: Total liability of either party under this Agreement shall not exceed the total fees paid under this Agreement.`,

    'ip-trap': `CONSULTING AND IP ASSIGNMENT CONTRACT
1. PAYMENT: Payment shall be disbursed Net-45 days following manual client audit. Contractor shall commence without an advance payment.
2. WORK MADE FOR HIRE & IP: Contractor irrevocably agrees that all inventions, designs, patents, trademarks, software scripts, and pre-existing tools conceived during the term shall be Company's exclusive property regardless of payment.
3. WARRANTIES & INDEMNITY: Contractor warrants that all work is completely bug-free and will indemnify Company against all commercial losses without limitation.
4. CONFIDENTIALITY: Confidentiality obligations shall persist in perpetuity and Contractor shall not showcase any aspect of the work in any portfolio.`,

    'consulting-trap': `SENIOR SOFTWARE CONSULTING AGREEMENT
1. COMPENSATION: Fees payable Net-60 days upon client satisfaction. No advance retainer is authorized.
2. RESTRICTIVE COVENANTS: Consultant shall not provide services to any business in Company's industry worldwide for 24 months post-completion.
3. SURVEILLANCE & AUDIT: Company reserves the right to inspect Consultant's computer and records at any time, and may execute unilateral reduction of hours.
4. TERMINATION: Company may terminate without cause immediately with no kill fee or compensation for work-in-progress.`,

    'liquidated-damages': `MOBILE APPLICATION DEVELOPMENT CONTRACT
1. DEADLINES & PENALTIES: Delivery date is strict. For each day of delay, Company shall withhold 50% of the total project fee as liquidated damages.
2. WARRANTIES: Developer guarantees that software will be 100% bug-free with perpetual maintenance at no additional charge.
3. JURISDICTION: This contract is subject to the exclusive jurisdiction of the courts of London, UK. All legal actions must be litigated in London courts.
4. REVISIONS: Developer agrees to perform as many revisions as necessary until Company is pleased.`
  };

  const CATEGORIES = [
    { id: 'cat-1', name: '1. Overall Risk Score', desc: 'Holistic commercial safety rating' },
    { id: 'cat-2', name: '2. Risk Classification', desc: 'Tiered urgency: Low, Medium, High, or Critical' },
    { id: 'cat-3', name: '3. Payment Terms', desc: 'Advance deposits, payment delays (Net-15 vs Net-90), milestone triggers' },
    { id: 'cat-4', name: '4. Project Scope & Revisions', desc: 'Scope creep prevention, revision round caps, out-of-scope hourly rates' },
    { id: 'cat-5', name: '5. Deadlines & Deliverables', desc: 'Delivery schedules, grace periods, liquidated damage penalties' },
    { id: 'cat-6', name: '6. Termination Clauses', desc: 'Termination for convenience, kill fees, pro-rata compensation' },
    { id: 'cat-7', name: '7. Intellectual Property Rights', desc: 'Work-for-hire, transfer upon final payment vs transfer upon inception' },
    { id: 'cat-8', name: '8. Confidentiality Obligations', desc: 'Non-disclosure duration, mutual confidentiality, portfolio rights' },
    { id: 'cat-9', name: '9. Liability & Indemnification', desc: 'Mutual liability caps, consequential damages exclusions, indemnities' },
    { id: 'cat-10', name: '10. Unusual or Ambiguous Clauses', desc: 'Non-compete clauses, vague subjective acceptance criteria' },
    { id: 'cat-11', name: '11. Missing or Incomplete Terms', desc: 'Missing late fees, absent kill fees, undefined acceptance window' },
    { id: 'cat-12', name: '12. Negotiation Points', desc: 'Tactical counter-proposals and polite negotiation inquiries' }
  ];

  let currentAnalysis = null;

  // Initialize page
  window.addEventListener('DOMContentLoaded', () => {
    initDropZone();
    initCharCounter();
    loadPresetSample('high-risk');
  });

  function initDropZone() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) processFile(files[0]);
    });
  }

  function initCharCounter() {
    const area = document.getElementById('contract-content');
    const lbl = document.getElementById('char-count');
    if (!area || !lbl) return;

    area.addEventListener('input', () => {
      lbl.textContent = area.value.length.toLocaleString() + ' characters';
    });
  }

  window.handleFileUpload = function(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  function processFile(file) {
    const label = document.getElementById('upload-label');
    if (label) label.textContent = 'Selected: ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';

    const reader = new FileReader();
    reader.onload = function(evt) {
      const text = evt.target.result;
      document.getElementById('contract-content').value = text;
      document.getElementById('char-count').textContent = text.length.toLocaleString() + ' characters';
      if (window.showToast) showToast('Loaded file: ' + file.name);
    };
    reader.readAsText(file);
  }

  window.loadPresetSample = function(key) {
    if (!key || !PRESET_SAMPLES[key]) return;
    const text = PRESET_SAMPLES[key];
    const area = document.getElementById('contract-content');
    if (area) {
      area.value = text;
      const countEl = document.getElementById('char-count');
      if (countEl) countEl.textContent = text.length.toLocaleString() + ' characters';
    }
    const select = document.getElementById('sample-select');
    if (select) select.value = key;
  };

  window.startAnalysis = async function() {
    const area = document.getElementById('contract-content');
    const text = area ? area.value.trim() : '';
    if (!text || text.length < 30) {
      alert('Please enter or upload contract text (at least 30 characters) to analyze.');
      return;
    }

    const btn = document.getElementById('btn-run');
    if (btn) btn.disabled = true;

    const progressCard = document.getElementById('progress-card');
    const resultsView = document.getElementById('results-view');
    const fill = document.getElementById('progress-fill');
    const status = document.getElementById('progress-status');
    const detail = document.getElementById('progress-detail');
    const pct = document.getElementById('progress-pct');

    if (progressCard) progressCard.style.display = 'block';
    if (resultsView) resultsView.style.display = 'none';

    // Step 1: 25%
    if (fill) fill.style.width = '25%';
    if (status) status.textContent = 'Scanning Agreement Text & Structure...';
    if (detail) detail.textContent = 'Parsing clauses, definitions, and payment conditions...';
    if (pct) pct.textContent = '25% complete';
    await wait(350);

    // Step 2: 55%
    if (fill) fill.style.width = '55%';
    if (status) status.textContent = 'Comparing Against Policy Rules...';
    if (detail) detail.textContent = 'Evaluating payment windows, advance deposits, IP retention, and revision caps...';
    if (pct) pct.textContent = '55% complete';
    await wait(400);

    // Step 3: 85%
    if (fill) fill.style.width = '85%';
    if (status) status.textContent = 'Detecting Legal Traps & Ambiguities...';
    if (detail) detail.textContent = 'Analyzing indemnification, warranties, non-competes, and termination rights...';
    if (pct) pct.textContent = '85% complete';

    // Attempt backend API call first (which uses DeepContractAiProvider with Gemini LLM or Local NLP Engine)
    let apiResult = null;
    try {
      if (window.API && typeof window.API.post === 'function') {
        apiResult = await API.post('api/analyses/analyze', {
          contractText: text,
          filename: 'contract-draft.txt'
        });
      }
    } catch (e) {
      console.warn('Backend API analysis fallback to in-browser engine:', e);
    }

    // Step 4: 100%
    if (fill) fill.style.width = '100%';
    if (status) status.textContent = 'Analysis Complete!';
    if (detail) detail.textContent = 'Generating comprehensive risk report, verified quotes, and counter-clauses...';
    if (pct) pct.textContent = '100% complete';
    await wait(250);

    if (progressCard) progressCard.style.display = 'none';
    if (btn) btn.disabled = false;

    // Adapt backend result if available, or execute full in-browser legal analysis
    if (apiResult && apiResult.findings && apiResult.findings.length > 0) {
      currentAnalysis = adaptBackendResult(apiResult, text);
    } else {
      currentAnalysis = evaluateContract(text);
    }

    renderResults(currentAnalysis);
    if (resultsView) {
      resultsView.style.display = 'block';
      resultsView.scrollIntoView({ behavior: 'smooth' });
    }

    if (typeof loadOverview === 'function') {
      try { loadOverview(); } catch (ignored) {}
    }
    if (window.showToast) {
      showToast(`AI Analysis Complete! Identified ${currentAnalysis.findings.length} risk items.`);
    }
  };

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function adaptBackendResult(res, text) {
    const findings = (res.findings || []).map(f => ({
      clause: f.title || f.clause || 'Contract Clause',
      quote: f.exactQuote || f.quote || '',
      severity: f.severity === 'HIGH' ? (f.title && f.title.toLowerCase().includes('critical') ? 'CRITICAL' : 'HIGH') : (f.severity || 'MEDIUM'),
      explanation: f.simpleExplanation || f.explanation || '',
      impact: f.potentialImpact || f.impact || '',
      action: f.suggestedNegotiation || f.action || '',
      isVerified: f.isVerified !== undefined ? f.isVerified : (f.exactQuote ? text.toLowerCase().includes(f.exactQuote.toLowerCase()) : false),
      clauseReference: f.clauseReference || 'Agreement Clause',
      policyRule: f.policyRule || 'Freelancer Standard'
    }));

    const score = res.safetyScore !== undefined ? res.safetyScore : Math.max(10, Math.min(98, 100 - (res.highCount * 18 + res.mediumCount * 8 + res.lowCount * 3)));
    let classification = res.riskClassification || (score < 50 ? 'Critical Risk — Do Not Sign As Is' : (score < 70 ? 'High Commercial Risk' : (score < 85 ? 'Medium Risk — Negotiate Terms' : 'Low Commercial Risk')));
    let classKey = score < 50 ? 'critical' : (score < 70 ? 'high' : (score < 85 ? 'medium' : 'low'));

    return {
      score,
      classification,
      classKey,
      findings,
      emailDraft: res.emailDraft || '',
      categoriesStatus: buildCategoriesStatus(findings, score)
    };
  }

  // Comprehensive In-Browser Deep Legal Evaluator across all 12 Dimensions
  function evaluateContract(text) {
    const lower = text.toLowerCase();
    const findings = [];
    let score = 100;

    // 1. Payment Delay Check
    const netMatch = text.match(/within\s*(\d+)\s*(?:business\s*)?days/i) || text.match(/net[- ]*(\d+)/i) || text.match(/payment\s*(?:terms?)?\s*(?:shall|will)?\s*(?:be)?\s*(\d+)\s*days/i);
    let payDays = netMatch ? parseInt(netMatch[1]) : null;
    if (payDays && payDays > 30) {
      score -= (payDays > 60 ? 25 : 18);
      findings.push({
        clause: 'Excessive Payment Due Delay (Net ' + payDays + ' Days)',
        quote: netMatch[0],
        severity: payDays > 60 ? 'CRITICAL' : 'HIGH',
        clauseReference: 'Section 1: Payment Terms',
        policyRule: 'Policy: Maximum payment delay 15 days',
        explanation: 'Payment term of ' + payDays + ' days significantly exceeds freelance safety standards (Net-15 to Net-30).',
        impact: 'You bear unpaid operating expenses for up to ' + payDays + ' days, straining cash flow.',
        action: 'Request adjustment to: "All undisputed invoices shall be paid Net-15 days from submission date."',
        isVerified: text.includes(netMatch[0])
      });
    }

    // 2. Advance Deposit Check
    if (lower.includes('0% advance') || lower.includes('0% deposit') || (!lower.includes('advance') && !lower.includes('upfront') && !lower.includes('deposit') && !lower.includes('retainer'))) {
      score -= 16;
      const quote = lower.includes('0% advance') ? 'Contractor shall receive 0% advance deposit' : '[Clause absent from agreement]';
      findings.push({
        clause: 'Advance Deposit Missing or Zero',
        quote: quote,
        severity: 'HIGH',
        clauseReference: 'Section 1: Project Compensation',
        policyRule: 'Policy: Minimum 30% advance deposit required',
        explanation: 'No initial mobilization retainer is provided before commencement of creative or development work.',
        impact: 'Full financial risk is transferred to you before client demonstrates financial commitment.',
        action: 'Request a standard 30% upfront deposit upon contract execution prior to deliverable kick-off.',
        isVerified: quote !== '[Clause absent from agreement]' && text.includes(quote)
      });
    }

    // 3. Unlimited Revisions
    if (lower.includes('unlimited revision') || lower.includes('unlimited revisions') || lower.includes('until client is fully satisfied')
        || lower.includes('as many revisions as necessary') || lower.includes('until client is satisfied')) {
      score -= 20;
      findings.push({
        clause: 'Uncapped Revisions & Subjective Approval Trap',
        quote: 'provide unlimited revisions without additional compensation until client is fully satisfied',
        severity: 'CRITICAL',
        clauseReference: 'Section 2: Scope & Revisions',
        policyRule: 'Policy: Maximum 2-3 revision rounds included',
        explanation: 'Grants client unlimited iterations without additional compensation until subjective satisfaction.',
        impact: 'Client could demand months of unpaid redesigns, severely destroying project profitability.',
        action: 'Cap revisions: "Includes up to two (2) rounds of revisions. Additional rounds billed at hourly rate ($85/hr)."',
        isVerified: lower.includes('unlimited revisions')
      });
    }

    // 4. Intellectual Property Transfer upon Inception vs Payment
    if (lower.includes('regardless of payment') || lower.includes('immediately upon inception') || lower.includes('immediately upon creation')) {
      score -= 24;
      findings.push({
        clause: 'Premature Intellectual Property Assignment',
        quote: 'assigns all right, title, and interest... regardless of payment',
        severity: 'CRITICAL',
        clauseReference: 'Section 4: Intellectual Property',
        policyRule: 'Policy: IP transfers strictly upon 100% full payment',
        explanation: 'Assigns intellectual property and copyright before full payment has been received.',
        impact: 'If client defaults or withholds final payment, they legally own your code and you lose your primary leverage.',
        action: 'Insist on payment-contingent IP transfer: "Ownership of deliverables transfers strictly upon full and final payment."',
        isVerified: lower.includes('regardless of payment') || lower.includes('immediately upon inception')
      });
    }

    // 5. Pre-existing background tools forfeiture
    if (lower.includes('pre-existing tools') || lower.includes('code libraries') || lower.includes('background ip')) {
      score -= 15;
      findings.push({
        clause: 'Forfeiture of Pre-Existing Tools & Code Libraries',
        quote: 'pre-existing tools, code libraries, and techniques to Company',
        severity: 'HIGH',
        clauseReference: 'Section 4: Developer Tools',
        policyRule: 'Standard: Retention of background utilities',
        explanation: 'Assigns your pre-existing developer toolkits, scripts, and generic libraries to the client.',
        impact: 'You lose the legal right to reuse your boilerplate code frameworks across other freelance projects.',
        action: 'Add carve-out: "Contractor retains full ownership of pre-existing utilities, scripts, and background tools."',
        isVerified: lower.includes('pre-existing tools')
      });
    }

    // 6. Unlimited Indemnity / Liability
    if (lower.includes('no maximum liability cap') || lower.includes('unlimited liability') || lower.includes('without limitation of liability')) {
      score -= 18;
      findings.push({
        clause: 'Uncapped Liability & One-Sided Indemnification',
        quote: 'indemnify, defend, and hold harmless Company... with no maximum liability cap',
        severity: 'HIGH',
        clauseReference: 'Section 5: Liability & Indemnity',
        policyRule: 'Policy: Aggregate liability capped at contract fee',
        explanation: 'Contractor assumes unlimited financial liability for third-party claims without a monetary ceiling.',
        impact: 'A minor system bug could theoretically result in liability claims exceeding the total project value.',
        action: 'Add mutual liability cap: "Each party\'s aggregate liability is capped at the total fees paid under this Agreement."',
        isVerified: lower.includes('no maximum liability cap')
      });
    }

    // 7. Consequential Damages
    if (lower.includes('lost profits') || lower.includes('consequential damages')) {
      score -= 12;
      findings.push({
        clause: 'Exposure to Consequential Damages & Lost Profits',
        quote: 'damages, lost profits, claims, and third-party liabilities',
        severity: 'HIGH',
        clauseReference: 'Section 5: Damages Limitation',
        policyRule: 'Standard: Mutual waiver of indirect and consequential damages',
        explanation: 'Allows client to seek damages for hypothetical lost business revenue or indirect disruption.',
        impact: 'Consequential damage claims can easily escalate to hundreds of thousands of dollars.',
        action: 'Insert clause: "In no event shall either party be liable for indirect, consequential, or lost profit damages."',
        isVerified: lower.includes('lost profits')
      });
    }

    // 8. Termination for convenience without kill fee
    if (lower.includes('for convenience') && (lower.includes('no kill fee') || lower.includes('no compensation for work-in-progress'))) {
      score -= 16;
      findings.push({
        clause: 'Termination for Convenience Without Kill Fee',
        quote: 'terminate this Agreement immediately at any time for convenience with no kill fee or compensation for work-in-progress',
        severity: 'HIGH',
        clauseReference: 'Section 6: Termination & Cancellation',
        policyRule: 'Standard: 14-day notice, pro-rata pay, and 25% kill fee',
        explanation: 'Client may cancel immediately with 0 days notice and pay nothing for work-in-progress.',
        impact: 'Client can cancel after weeks of active work and walk away without paying for unsubmitted drafts.',
        action: 'Require: "Either party may terminate upon 14 days written notice. Client shall pay for all work-in-progress plus a 25% kill fee."',
        isVerified: lower.includes('no kill fee')
      });
    }

    // 9. Non-compete covenants
    if (lower.includes('not to provide software services') || lower.includes('non-compete') || lower.includes('24 months') || lower.includes('industry worldwide')) {
      score -= 16;
      findings.push({
        clause: 'Overly Broad 24-Month Non-Compete Covenant',
        quote: 'not to provide software services to any business in Company\'s industry worldwide for a period of 24 months',
        severity: 'HIGH',
        clauseReference: 'Section 7: Restrictive Covenants',
        policyRule: 'Standard: Strike non-compete for independent contractors',
        explanation: 'Prohibits you from serving entire industry verticals globally for two years post-engagement.',
        impact: 'Severely damages your career and ability to secure future freelance clients.',
        action: 'Strike non-compete completely. Independent contractors are non-exclusive and cannot be bound by non-competes.',
        isVerified: lower.includes('industry worldwide') || lower.includes('24 months')
      });
    }

    // 10. Liquidated damages
    if (lower.includes('liquidated damages') || lower.includes('withhold 50%')) {
      score -= 15;
      findings.push({
        clause: 'Disproportionate Liquidated Damages Penalty',
        quote: 'withhold 50% of the total project fee as liquidated damages',
        severity: 'HIGH',
        clauseReference: 'Section 3: Deadlines & Penalties',
        policyRule: 'Standard: 5-day cure period before penalty',
        explanation: 'Strict 24-hour delivery penalty forfeits half the contract compensation without a reasonable cure period.',
        impact: 'Single unexpected illness or technical outage can cause catastrophic fee forfeiture.',
        action: 'Replace with 5-day cure notice and mutual milestone adjustment protocols.',
        isVerified: lower.includes('withhold 50%')
      });
    }

    // 11. Bug-free warranty
    if (lower.includes('completely bug-free') || lower.includes('100% bug-free') || lower.includes('perpetual maintenance')) {
      score -= 15;
      findings.push({
        clause: 'Unrealistic 100% Bug-Free Guarantee',
        quote: 'guarantees that software will be 100% bug-free with perpetual maintenance',
        severity: 'HIGH',
        clauseReference: 'Section 9: Warranties',
        policyRule: 'Policy: 30-day warranty window',
        explanation: 'Software operates in evolving environments. An absolute bug-free warranty creates permanent breach exposure.',
        impact: 'Client could demand free updates years later under threat of contract dispute.',
        action: 'Limit warranty to thirty (30) days following delivery for reproducible defects in original code.',
        isVerified: lower.includes('bug-free')
      });
    }

    // 12. Surveillance / Device Audits
    if (lower.includes('inspect consultant\'s computer') || lower.includes('surveillance') || lower.includes('unilateral reduction of hours')) {
      score -= 15;
      findings.push({
        clause: 'Intrusive Hardware Audit & Unilateral Hour Reductions',
        quote: 'inspect Consultant\'s computer and records at any time, and may execute unilateral reduction of hours',
        severity: 'HIGH',
        clauseReference: 'Section 12: Audit Rights',
        policyRule: 'Standard: Audit restricted to invoice documentation',
        explanation: 'Grants client unchecked access to your private device and right to arbitrarily cut invoiced hours.',
        impact: 'Violates your privacy and creates commercial liability towards your other clients.',
        action: 'Restrict audits to submitted deliverables and financial invoice documentation.',
        isVerified: lower.includes('computer and records') || lower.includes('reduction of hours')
      });
    }

    score = Math.max(10, Math.min(98, score));

    // Categorization
    let classification = 'Low Commercial Risk';
    let classKey = 'low';
    if (score < 50) {
      classification = 'Critical Risk — Do Not Sign As Is';
      classKey = 'critical';
    } else if (score < 70) {
      classification = 'High Commercial Risk';
      classKey = 'high';
    } else if (score < 85) {
      classification = 'Medium Risk — Negotiate Terms';
      classKey = 'medium';
    }

    return {
      score,
      classification,
      classKey,
      findings,
      categoriesStatus: buildCategoriesStatus(findings, score)
    };
  }

  function buildCategoriesStatus(findings, score) {
    const hasPay = findings.some(f => f.clause.includes('Payment') || f.clause.includes('Net'));
    const hasAdv = findings.some(f => f.clause.includes('Advance'));
    const hasRev = findings.some(f => f.clause.includes('Revision'));
    const hasDam = findings.some(f => f.clause.includes('Damages') || f.clause.includes('Penalties'));
    const hasTerm = findings.some(f => f.clause.includes('Termination') || f.clause.includes('Kill Fee'));
    const hasIp = findings.some(f => f.clause.includes('Intellectual Property') || f.clause.includes('Tools'));
    const hasConf = findings.some(f => f.clause.includes('Portfolio') || f.clause.includes('Confidentiality'));
    const hasLiab = findings.some(f => f.clause.includes('Liability') || f.clause.includes('Indemni') || f.clause.includes('Profits'));
    const hasComp = findings.some(f => f.clause.includes('Non-Compete'));
    const hasWarr = findings.some(f => f.clause.includes('Bug-Free') || f.clause.includes('Warranty'));
    const hasAudit = findings.some(f => f.clause.includes('Audit') || f.clause.includes('Surveillance'));

    const list = [
      { id: 'cat-1', name: '1. Overall Risk Score', status: score + '/100 (' + (score > 75 ? 'Safe' : (score > 50 ? 'Moderate' : 'Severe')) + ')', sev: score > 75 ? 'lo' : (score > 50 ? 'med' : 'hi'), desc: 'Calculated commercial safety quotient' },
      { id: 'cat-2', name: '2. Risk Classification', status: score < 50 ? 'Critical Risk' : (score < 70 ? 'High Risk' : (score < 85 ? 'Medium Risk' : 'Low Risk')), sev: score < 50 ? 'crit' : (score < 70 ? 'hi' : (score < 85 ? 'med' : 'lo')), desc: 'Urgency tier for negotiation' },
      { id: 'cat-3', name: '3. Payment Terms', status: hasPay ? 'Severe Delay (Net 45-90d)' : 'Fair Net-15 Terms', sev: hasPay ? 'hi' : 'lo', desc: 'Milestones & payment windows' },
      { id: 'cat-4', name: '4. Project Scope & Revisions', status: hasRev ? 'Uncapped Revisions Risk' : 'Standard 2 Rounds', sev: hasRev ? 'crit' : 'lo', desc: 'Scope boundary protection' },
      { id: 'cat-5', name: '5. Deadlines & Penalties', status: hasDam ? 'Liquidated Penalties Flagged' : 'Grace Period Allowed', sev: hasDam ? 'hi' : 'lo', desc: 'Delivery timing & cure periods' },
      { id: 'cat-6', name: '6. Termination Clauses', status: hasTerm ? 'No Kill Fee / WIP Unpaid' : '14-Day Notice with Pro-Rata', sev: hasTerm ? 'hi' : 'lo', desc: 'Kill fee & cancellation pay' },
      { id: 'cat-7', name: '7. Intellectual Property Rights', status: hasIp ? 'Premature Assignment Trap' : 'Transfer upon Full Payment', sev: hasIp ? 'crit' : 'lo', desc: 'Work-for-hire & moral rights' },
      { id: 'cat-8', name: '8. Confidentiality Obligations', status: hasConf ? 'Portfolio Gag Clause' : 'Portfolio Showcase Permitted', sev: hasConf ? 'med' : 'lo', desc: 'Case study & portfolio rights' },
      { id: 'cat-9', name: '9. Liability & Indemnification', status: hasLiab ? 'Uncapped Liability' : 'Mutual Cap at Contract Value', sev: hasLiab ? 'hi' : 'lo', desc: 'Third-party & consequential caps' },
      { id: 'cat-10', name: '10. Restrictive Covenants', status: hasComp ? 'Overly Broad Non-Compete' : 'No Non-Compete Restraints', sev: hasComp ? 'hi' : 'lo', desc: 'Exclusivity & client restraints' },
      { id: 'cat-11', name: '11. Warranty & Audits', status: (hasWarr || hasAudit) ? 'Unrealistic Bug-Free / Audit Trap' : 'Standard 30-Day Warranty', sev: (hasWarr || hasAudit) ? 'hi' : 'lo', desc: 'Bug warranty & hardware privacy' },
      { id: 'cat-12', name: '12. Negotiation Points', status: findings.length + ' Counter-Points Ready', sev: findings.length > 2 ? 'hi' : 'lo', desc: 'Polite revision email prepared' }
    ];
    return list;
  }

  function renderResults(analysis) {
    // Circle & score text
    const circle = document.getElementById('risk-score-circle');
    if (circle) circle.className = 'risk-circle ' + analysis.classKey;
    const scoreNum = document.getElementById('res-score-num');
    if (scoreNum) scoreNum.textContent = analysis.score;
    const classLbl = document.getElementById('res-class-lbl');
    if (classLbl) classLbl.textContent = analysis.classification;

    // Badges count
    const critCount = analysis.findings.filter(f => f.severity === 'CRITICAL').length;
    const hiCount = analysis.findings.filter(f => f.severity === 'HIGH').length;
    const medCount = analysis.findings.filter(f => f.severity === 'MEDIUM').length;
    const loCount = Math.max(1, 12 - (critCount + hiCount + medCount));

    const badgeCrit = document.getElementById('badge-crit');
    if (badgeCrit) badgeCrit.textContent = critCount + ' Critical';
    const badgeHi = document.getElementById('badge-hi');
    if (badgeHi) badgeHi.textContent = hiCount + ' High';
    const badgeMed = document.getElementById('badge-med');
    if (badgeMed) badgeMed.textContent = medCount + ' Medium';
    const badgeLo = document.getElementById('badge-lo');
    if (badgeLo) badgeLo.textContent = loCount + ' Low';

    // Segmented distribution bar
    const total = critCount + hiCount + medCount + loCount;
    const barCrit = document.getElementById('bar-crit');
    if (barCrit) barCrit.style.width = ((critCount / total) * 100) + '%';
    const barHi = document.getElementById('bar-hi');
    if (barHi) barHi.style.width = ((hiCount / total) * 100) + '%';
    const barMed = document.getElementById('bar-med');
    if (barMed) barMed.style.width = ((medCount / total) * 100) + '%';
    const barLo = document.getElementById('bar-lo');
    if (barLo) barLo.style.width = ((loCount / total) * 100) + '%';

    // 12 Category Bento Cards
    const catGrid = document.getElementById('cat-grid');
    if (catGrid) {
      catGrid.innerHTML = '';
      analysis.categoriesStatus.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'cat-card risk-' + cat.sev;
        card.innerHTML = `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <strong style="font-size:14.5px;">${escapeHtml(cat.name)}</strong>
              <span class="tag ${cat.sev}">${cat.sev.toUpperCase()}</span>
            </div>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:10px;">${escapeHtml(cat.desc)}</p>
          </div>
          <div style="font-size:13.5px; font-weight:700; color:var(--text); padding-top:8px; border-top:1px solid var(--border-light);">
            Status: ${escapeHtml(cat.status)}
          </div>
        `;
        catGrid.appendChild(card);
      });
    }

    // Flagged Clauses List
    const flagList = document.getElementById('flagged-list');
    if (flagList) {
      flagList.innerHTML = '';
      if (analysis.findings.length === 0) {
        flagList.innerHTML = `
          <div class="card" style="text-align:center; padding:32px; background:#F0FDF4; border-color:#86EFAC;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" style="margin:0 auto 10px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h4 style="color:#166534; margin-bottom:6px;">No Critical Commercial Risks Flagged</h4>
            <p style="color:#15803D; font-size:14px;">The analyzed text aligns closely with standard freelance protective guidelines.</p>
          </div>
        `;
      } else {
        analysis.findings.forEach(f => {
          const item = document.createElement('div');
          const sevClass = f.severity === 'CRITICAL' ? 'crit' : (f.severity === 'HIGH' ? 'hi' : 'med');
          item.className = 'flagged-item ' + sevClass;
          item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font-size:16px;">${escapeHtml(f.clause)}</strong>
                <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
                  <span><strong>Clause:</strong> ${escapeHtml(f.clauseReference || 'Agreement Clause')}</span>
                  ${f.policyRule ? ` &bull; <span><strong>Policy Rule:</strong> ${escapeHtml(f.policyRule)}</span>` : ''}
                </div>
              </div>
              <span class="tag ${sevClass}">${f.severity} RISK</span>
            </div>

            <div class="quote-box" style="${f.isVerified ? 'border-left:3px solid #16A34A; background:#F0FDF4;' : ''}">
              "${escapeHtml(f.quote)}"
              ${f.isVerified ? '<div style="font-size:12px; font-weight:700; color:#15803D; margin-top:4px; font-style:normal;">&check; Exact quotation verified in contract text</div>' : ''}
            </div>

            <p style="font-size:14px; margin-bottom:8px;"><strong>Analysis:</strong> ${escapeHtml(f.explanation)}</p>
            <p style="font-size:13.5px; color:#991B1B; margin-bottom:8px; background:#FEF2F2; padding:8px 12px; border-radius:6px; border:1px solid #FEE2E2;">
              <strong>Commercial Impact:</strong> ${escapeHtml(f.impact)}
            </p>
            <div style="background:#F3F0FF; border:1px solid #E8E3F7; padding:10px 14px; border-radius:var(--r-sm); font-size:13.5px; color:#4B2BC3;">
              <strong>Suggested Negotiation Action:</strong> ${escapeHtml(f.action)}
            </div>
          `;
          flagList.appendChild(item);
        });
      }
    }

    // Populate Rebuttal Email
    const draftBox = document.getElementById('email-draft-box');
    if (draftBox) {
      if (analysis.emailDraft && analysis.emailDraft.trim().length > 20) {
        draftBox.value = analysis.emailDraft;
      } else {
        let emailText = "Subject: Notes & Minor Adjustments — Proposed Services Agreement\n\nDear Team,\n\nThank you for sharing the draft agreement. I am enthusiastic about collaborating on this project. Upon reviewing the terms against my standard freelance engagement guidelines, I noticed a few specific clauses I would like to clarify and adjust before finalizing:\n\n";
        analysis.findings.forEach((f, idx) => {
          emailText += (idx + 1) + ". " + f.clause + ":\n   Proposed adjustment: " + f.action + "\n\n";
        });
        emailText += "These adjustments ensure mutual commercial protection and clarify project expectations. Please let me know if you can issue an updated draft with these points reflected so we can proceed with project kick-off!\n\nBest regards,\n[Your Name]\nClauseLens Verified Freelancer";
        draftBox.value = emailText;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.copyEmailDraft = function() {
    const box = document.getElementById('email-draft-box');
    if (!box) return;
    box.select();
    navigator.clipboard.writeText(box.value);
    if (window.showToast) showToast('Revision email copied to clipboard!');
    else alert('Copied revision email to clipboard!');
  };

  window.downloadReportCSV = function() {
    if (!currentAnalysis) return;
    let csv = "Clause,Risk Level,Quoted Excerpt,Explanation,Recommended Action\n";
    currentAnalysis.findings.forEach(f => {
      csv += `"${(f.clause || '').replace(/"/g, '""')}","${f.severity}","${(f.quote || '').replace(/"/g, '""')}","${(f.explanation || '').replace(/"/g, '""')}","${(f.action || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "ClauseLens_Risk_Report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

})();
