// ═══════════════════════════════════════════════════
// PARSE EMAIL
// ═══════════════════════════════════════════════════

let parsedData = null;

function parseEmail() {
  const text = document.getElementById('emailPaste').value.trim();
  if (!text) {
    showParseStatus('err', 'Please paste the email content first.');
    return;
  }

  try {
    const data = extractFromEmail(text);

    if (!data.institution) {
      showParseStatus('warn', 'Could not detect institution name. Check the email format and try again.');
      return;
    }

    parsedData = data;
    displayParsedData(data);
    showParseStatus('ok', `✓ Parsed successfully — ${data.institution}, AD: ${data.ad}%`);
    document.getElementById('btnGenerate').disabled = false;

  } catch(e) {
    showParseStatus('err', 'Parse error: ' + e.message + '. Try pasting the full email text.');
  }
}

function extractFromEmail(text) {
  const data = {};

  // Institution
  const instMatch = text.match(/INSTITUTION:\s*(.+)/i);
  data.institution = instMatch ? instMatch[1].trim() : '';

  // Size
  const sizeMatch = text.match(/SIZE:\s*(.+)/i);
  data.size = sizeMatch ? sizeMatch[1].trim() : 'Not specified';

  // Jurisdiction
  const jurMatch = text.match(/JURISDICTION:\s*(.+)/i);
  data.jurisdiction = jurMatch ? jurMatch[1].trim() : 'Not specified';

  // Context
  const ctxMatch = text.match(/CONTEXT:\s*(.+)/i);
  data.context = ctxMatch ? ctxMatch[1].trim() : '';

  // Scores
  data.ad    = extractScore(text, 'Autonomy Dividend \\(AD\\)');
  data.ciq   = extractScore(text, 'CIQ Score');
  data.dci   = extractScore(text, 'Data Convergence \\(DCI\\)');
  data.rrv   = extractScore(text, 'Regulatory Velocity \\(RRV\\)');
  data.darr  = extractScore(text, 'Asset Reuse \\(DARR\\)');
  data.dqirr = extractScore(text, 'Quality Resolution \\(DQIRR\\)');
  data.ceiling   = extractScore(text, 'Technical Autonomy Ceiling');
  data.clearance = extractScore(text, 'Operational Clearance Factor');

  const stageMatch = text.match(/Stage:\s*(\d)/i);
  data.stage = stageMatch ? parseInt(stageMatch[1]) : 2;

  const moveMatch = text.match(/Move:\s*(\d)/i);
  data.move = moveMatch ? parseInt(moveMatch[1]) : 2;

  // Extract Q&A responses
  data.responses = extractResponses(text);

  // Build formatted answers for prompt
  data.answerSummary = buildAnswerSummary(data.responses);

  return data;
}

function extractScore(text, label) {
  const re = new RegExp(label + '[^\\d]*(\\d+\\.?\\d*)%?', 'i');
  const match = text.match(re);
  return match ? parseFloat(match[1]) : 0;
}

function extractResponses(text) {
  const responses = [];
  // Match patterns like: [3/4] Question text\n→ Answer text
  const pattern = /\[(\w+)\/4\]\s*([^\n]+)\n→\s*([^\n]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    responses.push({
      score: match[1],
      question: match[2].trim(),
      answer: match[3].trim()
    });
  }
  return responses;
}

function buildAnswerSummary(responses) {
  if (!responses.length) return 'Responses not available in parsed format.';
  return responses.map(r => `[${r.score}/4] ${r.question}\n→ ${r.answer}`).join('\n\n');
}

function displayParsedData(data) {
  document.getElementById('parsedInst').textContent = data.institution;
  document.getElementById('parsedMeta').textContent =
    [data.size, data.jurisdiction].filter(Boolean).join(' · ');

  const scoreItems = [
    { label: 'AD', val: data.ad },
    { label: 'CIQ', val: data.ciq },
    { label: 'DCI', val: data.dci },
    { label: 'RRV', val: data.rrv },
    { label: 'DARR', val: data.darr },
    { label: 'DQIRR', val: data.dqirr }
  ];

  const grid = document.getElementById('scoresGrid');
  grid.innerHTML = scoreItems.map(s => {
    const cls = s.val < 40 ? 'low' : s.val < 68 ? 'mid' : 'high';
    return `<div class="score-item">
      <div class="score-label">${s.label}</div>
      <div class="score-val ${cls}">${s.val}%</div>
    </div>`;
  }).join('');

  document.getElementById('scoresDisplay').classList.add('visible');
}

function showParseStatus(type, msg) {
  const el = document.getElementById('parseStatus');
  el.className = 'parse-status ' + type;
  el.textContent = msg;
}

// ═══════════════════════════════════════════════════
// GENERATE SYNTHESIS
// ═══════════════════════════════════════════════════

async function generateSynthesis() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey || apiKey.length < 20) {
    alert('Please enter your Nerve Core API key.');
    return;
  }
  if (!parsedData) {
    alert('Please parse an email first.');
    return;
  }

  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  document.getElementById('btnGenerateIcon').innerHTML = '<div class="loading-ring" style="border-top-color:var(--navy)"></div>';
  document.getElementById('btnGenerateText').textContent = 'Synthesising...';
  document.getElementById('outputStatus').textContent = 'Generating';
  document.getElementById('outputStatus').className = 'output-status generating';

  // Show output area
  document.getElementById('outputEmpty').style.display = 'none';
  document.getElementById('synthesisContent').classList.add('visible');
  document.getElementById('synthInstitution').textContent =
    parsedData.institution.toUpperCase() + ' · AD ' + parsedData.ad + '% · ' + new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
  document.getElementById('synthBody').innerHTML = '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--gold);letter-spacing:1px;" class="streaming-cursor">Nerve Core synthesising</div>';

  const d = parsedData;
  const stageNames = ['','Pre-Foundation','Foundation in Progress','Bridge-Ready'];
  const moveNames  = ['','Assess Before You Activate','Choose the Right Wedge','Build the Sequence, Not the Plan','Measure Progress, Not Activity'];

  const prompt = `You are the Nerve Core of BluemeBank — an AI orchestrator that synthesises institutional readiness assessments and produces practitioner-grade advisory output for CDAOs and COOs.

INSTITUTION: ${d.institution}
SIZE: ${d.size}
JURISDICTION: ${d.jurisdiction}
CONTEXT: ${d.context || 'None provided'}

AUTONOMY DIVIDEND (AD): ${d.ad}%
CIQ — Continuous Intelligence Quotient: ${d.ciq}%
DCI — Data Convergence Index: ${d.dci}%
RRV — Regulatory Response Velocity: ${d.rrv}%
DARR — Data Asset Reuse Ratio: ${d.darr}%
DQIRR — DQ Issue Resolution Rate: ${d.dqirr}%
Technical Autonomy Ceiling = min(DCI, RRV) = ${d.ceiling}%
Operational Clearance Factor = ${d.clearance}%
Stage: ${d.stage} — ${stageNames[d.stage] || ''}
Move: ${d.move} — ${moveNames[d.move] || ''}

DETAILED RESPONSES (24 Questions):
${d.answerSummary}

Produce a structured Nerve Core synthesis using EXACTLY this format:

**STRUCTURAL CONDITION**
One sharp sentence naming where this institution actually stands. Name the dominant factory by its Paper 3 label — Reconciliation Factory (DCI), Interpretation Factory (RRV), Duplication Factory (DARR), or Escalation Factory (DQIRR). Reference the AD number and state precisely how that factory is capping it.

**THE BOTTLENECK**
• Name the dominant factory explicitly — state what it is, what it does, and exactly why it sets the Technical Autonomy Ceiling at the level it does. Use the formula: min(DCI, RRV) produces the ceiling; DARR × DQIRR applies the clearance factor.
• Why closing this factory matters more than improving the other three — be specific about the compounding logic
• What structurally needs to change to close it — name the governance condition, funding model, or architectural decision, not a generic recommendation

**NEXT 12 MONTHS**
• Which factory must be addressed first and what the dependency chain looks like — name each factory in sequence if more than one is open
• The single most important investment or governance decision in the next 90 days to begin closing the dominant factory
• One concrete action the CDAO can take this month without waiting for budget approval

**RISK OF INACTION**
• What happens to AD if the dominant factory continues to run — quantify: "without closing the [factory name], AD will remain capped at ${d.ceiling}% regardless of further investment in the other three dimensions"
• Where the specific regulatory exposure sits given the factory gaps identified in the 24 responses — name the regulator and the exposure type
• The cost the institution is already paying that it cannot see on any dashboard — frame it as factory cost: reconciliation headcount, regulatory scramble budget, duplicated build spend, or escalation overhead

**FOR THE BOARD**
One sentence only. The single most important thing the CDAO should bring to the next board conversation about data investment. Frame it in factory terms: not what needs to be built, but what factory is consuming the institution's autonomous potential and what it will cost to keep running it. Make it land. Make it impossible to ignore. Keep the entire synthesis to approximately 900 words.

Write as Sasidhar Bhavaraju — a senior practitioner with 20+ years inside global banking data and architecture. Use factory language throughout — name the factories, size them, sequence their reduction. Reference ${d.jurisdiction} regulatory context naturally where it adds precision. Be specific, direct, and honest. Do not soften uncomfortable truths. The person receiving this has asked for a genuine expert opinion, not a consultant's hedge.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || 'API error ' + res.status);
    }

    const json = await res.json();
    const text = json.content.map(b => b.text || '').join('\n');

    renderSynthesis(text);

    document.getElementById('outputStatus').textContent = 'Complete';
    document.getElementById('outputStatus').className = 'output-status done';
    document.getElementById('actionRow').style.display = 'flex';

  } catch(err) {
    document.getElementById('synthBody').innerHTML =
      `<div style="color:#E06050;font-size:12px;padding:12px;background:rgba(192,57,43,0.08);border-radius:6px;border:1px solid rgba(192,57,43,0.2);">Error: ${err.message}</div>`;
    document.getElementById('outputStatus').textContent = 'Error';
    document.getElementById('outputStatus').className = 'output-status waiting';
  }

  btn.disabled = false;
  document.getElementById('btnGenerateIcon').textContent = '◈';
  document.getElementById('btnGenerateText').textContent = 'Regenerate';
}

function renderSynthesis(text) {
  const lines = text.split('\n');
  let html = '';
  let currentSection = null;
  let boardSentence = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Section header
    if (/^\*\*(.+?)\*\*\s*$/.test(trimmed) && trimmed.startsWith('**')) {
      const label = trimmed.replace(/\*\*/g, '').trim();
      if (currentSection) html += '</div></div>';
      currentSection = label;

      if (label === 'FOR THE BOARD') {
        html += `<div class="synth-section" id="boardSection">
          <div class="synth-section-label">${label}</div>
          <div class="synth-board-sentence" id="boardSentenceEl">`;
      } else {
        html += `<div class="synth-section">
          <div class="synth-section-label">${label}</div>
          <div class="synth-section-content">`;
      }
      return;
    }

    // Bullet
    if (/^[•\-] (.+)/.test(trimmed)) {
      const content = trimmed.replace(/^[•\-] /, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<div class="synth-bullet"><span class="synth-bullet-dot">◦</span><span>${content}</span></div>`;
      return;
    }

    // Regular text
    if (currentSection) {
      const cleaned = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<div style="margin-bottom:8px;">${cleaned}</div>`;
    }
  });

  if (currentSection) html += '</div></div>';

  html += `<div class="synth-disclosure">This synthesis was generated by the BluemeBank Nerve Core. It reflects the institution's own assessment of its operational reality, interpreted through the BluemeBank framework — not an external audit. Validate against live data before board or regulatory use.</div>`;

  document.getElementById('synthBody').innerHTML = html;

  // Store plain text for copy
  window._synthesisText = text;
  window._synthesisInstitution = parsedData.institution;
}

// ═══════════════════════════════════════════════════
// COPY OUTPUT
// ═══════════════════════════════════════════════════

function copyOutput() {
  if (!window._synthesisText) return;

  const header = `BluemeBank Bridge Diagnostic — Nerve Core Synthesis\n${window._synthesisInstitution} · ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}\n${'═'.repeat(60)}\n\n`;
  const footer = `\n\n${'═'.repeat(60)}\nBluemeBank Bridge Diagnostic · bluemebank.com\nSasidhar Bhavaraju · sasidhar.bhavaraju@bluemebank.com\n\nThis synthesis was generated by the BluemeBank Nerve Core. It reflects the institution's own assessment of its operational reality, interpreted through the BluemeBank framework — not an external audit. Validate against live data before board or regulatory use.`;

  const fullText = header + window._synthesisText + footer;

  navigator.clipboard.writeText(fullText).then(() => {
    const btn = document.getElementById('btnCopy');
    btn.textContent = '✓ Copied';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '⊕ Copy Synthesis';
      btn.classList.remove('copied');
    }, 2500);
  });
}

// ═══════════════════════════════════════════════════
// CLEAR
// ═══════════════════════════════════════════════════

function clearAll() {
  parsedData = null;
  document.getElementById('emailPaste').value = '';
  document.getElementById('parseStatus').className = 'parse-status';
  document.getElementById('scoresDisplay').classList.remove('visible');
  document.getElementById('outputEmpty').style.display = 'flex';
  document.getElementById('synthesisContent').classList.remove('visible');
  document.getElementById('synthBody').innerHTML = '';
  document.getElementById('outputStatus').textContent = 'Waiting';
  document.getElementById('outputStatus').className = 'output-status waiting';
  document.getElementById('actionRow').style.display = 'none';
  document.getElementById('btnGenerate').disabled = true;
  document.getElementById('btnGenerateIcon').textContent = '◈';
  document.getElementById('btnGenerateText').textContent = 'Generate Nerve Core Synthesis';
  window._synthesisText = null;
}

// ═══════════════════════════════════════════════════
// PDF REPORT — Populate and Print
// ═══════════════════════════════════════════════════

function populatePdf() {
  if (!parsedData || !window._synthesisText) return;
  const d = parsedData;

  // Cover
  const dateStr = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});
  document.getElementById('pdfCoverDate').textContent = dateStr;
  document.getElementById('pdfCoverInstitution').textContent = d.institution;
  document.getElementById('pdfConfidential').textContent = 'Confidential · Prepared for ' + d.institution;
  document.getElementById('pdfFooterConfidential').textContent = 'Confidential · Prepared for ' + d.institution;

  // AD block
  const adCls = d.ad < 15 ? 'low' : d.ad < 35 ? 'mid' : 'high';
  const adLabels = {low:'Foundation Constrained',mid:'Operational Translation',high:'Bridge-Ready'};
  document.getElementById('pdfAdNum').textContent = d.ad;
  document.getElementById('pdfAdClass').textContent = adLabels[adCls];
  document.getElementById('pdfAdClass').className = 'pdf-ad-classification ' + adCls;
  document.getElementById('pdfAdCalc').innerHTML =
    'Technical Ceiling: ' + d.ceiling + '% = min(' + d.dci + ', ' + d.rrv + ')<br>' +
    'Clearance Factor: ' + d.clearance + '%<br>' +
    'CIQ Score: ' + d.ciq + '%';

  // Cardinal metrics
  const metrics = [
    {abbr:'DCI',name:'Data Convergence Index',val:d.dci},
    {abbr:'RRV',name:'Regulatory Response Velocity',val:d.rrv},
    {abbr:'DARR',name:'Data Asset Reuse Ratio',val:d.darr},
    {abbr:'DQIRR',name:'DQ Issue Resolution Rate',val:d.dqirr}
  ];
  const grid = document.getElementById('pdfMetricsGrid');
  grid.innerHTML = '';
  metrics.forEach(m => {
    const cls = m.val < 40 ? 'low' : m.val < 68 ? 'mid' : 'high';
    const tag = m.val < 40 ? 'Bottleneck' : m.val < 68 ? 'In Progress' : 'Ready';
    grid.innerHTML += `<div class="pdf-metric-card">
      <div class="pdf-metric-abbr">${m.abbr}</div>
      <div class="pdf-metric-name">${m.name}</div>
      <div class="pdf-metric-bar-wrap"><div class="pdf-metric-bar ${cls}" style="width:${m.val}%"></div></div>
      <div class="pdf-metric-pct ${cls}">${m.val}%</div>
      <div class="pdf-metric-tag">${tag}</div>
    </div>`;
  });

  // Stage scale
  document.getElementById('pdfCiqNum').textContent = d.ciq;
  ['pdfSeg1','pdfSeg2','pdfSeg3'].forEach(id => document.getElementById(id).classList.remove('active'));
  const activeId = d.ad < 15 ? 'pdfSeg1' : d.ad < 35 ? 'pdfSeg2' : 'pdfSeg3';
  document.getElementById(activeId).classList.add('active');

  // ── MOVE ROADMAP ──
  const moveNames = ['','Assess Before You Activate','Choose the Right Wedge','Build the Sequence, Not the Plan','Measure Progress, Not Activity'];
  const moveDescs = [
    '',
    'Before any plane is activated or use case selected, your institution needs an honest picture of where it actually stands across all four dimensions. The constraints will surface, and discovering them mid-delivery is significantly more expensive than now.',
    'Your foundational assessment is substantially complete. Wedge selection is disproportionately consequential — a wedge that fails sets the programme back by years. Selection must be equal parts commercial (does senior leadership care?) and operational (is the data for this domain the most complete?).',
    'The wedge is selected. The sequencing logic must be built around three dependency principles: data before planes, infrastructure before latency-sensitive planes, governance before autonomy. Let the sequence emerge from what the wedge reveals — not from a fixed timeline.',
    'The hardest discipline is measuring the right things. The problems that stop appearing — reconciliation breaks, regulatory findings — are the outcomes that matter. The metrics framework is the instrument that makes the case for continued investment when early outputs are infrastructure, not features.'
  ];
  document.getElementById('pdfMoveName').textContent = 'Move ' + d.move + ' — ' + (moveNames[d.move] || '');
  document.getElementById('pdfMoveDesc').textContent = moveDescs[d.move] || '';

  // Activate move roadmap
  for (let m = 1; m <= 4; m++) {
    const el = document.getElementById('pdfMroad' + m);
    if (el) el.classList.toggle('pdf-mroad-active', m === d.move);
  }

  // ── PRIORITY ACTIONS ──
  const priorities = buildPdfPriorities(d);
  const pList = document.getElementById('pdfPriorityList');
  pList.innerHTML = '';
  priorities.forEach((p, i) => {
    pList.innerHTML += '<div class="pdf-priority-item"><div class="pdf-priority-num">' + (i+1) + '</div><div class="pdf-priority-text">' + p + '</div></div>';
  });

  // Synthesis body — strip any markdown headers the model may add
  const cleanedSynthesis = window._synthesisText
    .replace(/^#+\s.*$/gm, '')           // remove # ## ### headers
    .replace(/^---+$/gm, '')              // remove horizontal rules
    .replace(/^\*[^*].*\*$/gm, '')       // remove *italic lines* (model attribution)
    .replace(/^[A-Z][A-Z\s|,0-9\-]+$/gm, '') // remove ALL-CAPS header lines model adds
    .trim();
  const lines = cleanedSynthesis.split('\n');
  let html = '';
  let inSection = false;
  let isBoard = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      if (inSection) html += '</div></div>';
      const label = trimmed.replace(/\*\*/g,'');
      isBoard = label === 'FOR THE BOARD';
      inSection = true;
      if (isBoard) {
        html += `<div class="pdf-synth-section"><div class="pdf-synth-label">${label}</div><div class="pdf-board-box"><div class="pdf-board-text">`;
      } else {
        html += `<div class="pdf-synth-section"><div class="pdf-synth-label">${label}</div><div class="pdf-synth-text">`;
      }
      return;
    }

    if (/^[•\-] (.+)/.test(trimmed)) {
      const content = trimmed.replace(/^[•\-] /,'');
      html += `<div class="pdf-synth-bullet"><span class="pdf-synth-dot">◦</span><span>${content}</span></div>`;
      return;
    }

    html += `<div style="margin-bottom:8px;">${trimmed}</div>`;
  });

  if (inSection) html += '</div></div>';
  document.getElementById('pdfSynthesisBody').innerHTML = html;
}

function buildPdfPriorities(d) {
  const priorities = [];
  const scores = [d.dci, d.rrv, d.darr, d.dqirr];
  const minScore = Math.min(...scores);
  const minIdx = scores.indexOf(minScore);
  const bottleneckNames = [
    'Data convergence and identity resolution',
    'Technology infrastructure and regulatory velocity',
    'Governance and funding model',
    'Operating model and skills readiness'
  ];
  const bottleneckName = bottleneckNames[minIdx];

  // ── PRIORITY 1: Always — bottleneck ──
  priorities.push('<strong>The binding constraint is ' + bottleneckName + ' at ' + minScore + '%.</strong> The Technical Autonomy Ceiling is set by the minimum of DCI and RRV — ' + Math.min(d.dci, d.rrv) + '%. Every investment in the other dimensions produces diminishing returns until this constraint is structurally resolved. This is the sequence: bottleneck first, everything else second.');

  // ── PRIORITY 2: Always — identity resolution ──
  if (d.dci < 85) {
    priorities.push('<strong>Advance entity identity resolution across all critical domains.</strong> With DCI at ' + d.dci + '%, the institution should target 80%+ of critical entities — customer, counterparty, product, transaction — sharing a common resolvable identity key across three or more core systems. This is the prerequisite for any multi-domain AI decision layer. The distinction between "partially resolved" and "systematically resolved" determines whether the institution can compound its AI investments or must rebuild the identity layer for every new use case.');
  } else {
    priorities.push('<strong>Protect the identity resolution foundation as the programme scales.</strong> DCI at ' + d.dci + '% is a genuine institutional strength. The risk at this stage is regression — as new use cases are onboarded, new systems are integrated, and legacy migration continues, identity consistency must be actively maintained. Assign a named owner for cross-system entity integrity at the group level with a mandate to review and certify key coverage annually.');
  }

  // ── PRIORITY 3: Always — governance mandate ──
  if (d.darr < 85) {
    priorities.push('<strong>Secure a long-horizon, foundation-based governance mandate.</strong> A feature-based or annually renegotiated board mandate will not survive the coordination demands of a multi-domain AI decision layer. The governance contract must be multi-year, foundation-based, and ring-fenced from use-case budget pressure — agreed at board level before the next capital cycle, not renegotiated under delivery pressure. The capability fund being contestable every year is the single most dangerous structural vulnerability in this programme.');
  } else {
    priorities.push('<strong>Prepare the governance framework for Stage Two activation.</strong> With DARR at ' + d.darr + '%, the reuse culture is strong. The next governance challenge is configuring the Data Design Authority mandate for multi-domain AI coordination — defining confidence thresholds, override authorities, and cross-plane accountability before the first Stage Two decision function goes live. The governance question at this stage is not whether to build — it is who owns the boundary between AI recommendation and human commitment.');
  }

  // ── PRIORITY 4: Always — forward-looking ──
  if (d.dqirr < 80) {
    priorities.push('<strong>Close the accountability gap in data quality resolution before scaling AI decision functions.</strong> DQIRR at ' + d.dqirr + '% means issues are being found but not always closed. As AI decision functions scale, unresolved data quality issues will compound into systematic recommendation failures. Business owners must be accountable for resolution as a measurable business KPI — not a technical obligation delegated back to the data team. The fix-accountability structure must be designed before the planes are activated, not discovered broken after the first production incident.');
  } else {
    priorities.push('<strong>Establish the Translation Layer governance framework now, before Stage Two.</strong> DQIRR at ' + d.dqirr + '% signals genuine operational readiness. The next priority is formalising the Translation Layer — the governance structure that determines when an AI recommendation is trusted to act, when it requires human review, and who owns the accountability when it is wrong. This framework must be documented, tested on the wedge use case, and ratified at governance level before the institution moves to multi-domain autonomous operation.');
  }

  return priorities;
}

function printReport() {
  populatePdf();

  const report = document.getElementById('pdfReport');
  const layout = document.querySelector('.layout');
  const header = document.querySelector('.header');

  // Show report, hide tool UI — all in normal document flow
  report.style.display = 'block';
  report.style.position = 'static';
  if (layout) layout.style.display = 'none';
  if (header) header.style.display = 'none';

  // Let browser render all pages, then print
  setTimeout(() => {
    window.print();
    // Restore after dialog
    setTimeout(() => {
      report.style.display = 'none';
      if (layout) layout.style.display = '';
      if (header) header.style.display = '';
    }, 500);
  }, 400);
}