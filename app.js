import { parseHtml } from './modules/parser.js';
import { scoreAudit } from './modules/scorer.js';
import { estimateDomainPower } from './modules/domain_power.js';

const urlInput = document.getElementById('url-input');
const spaToggle = document.getElementById('spa-toggle');
const aiToggle = document.getElementById('ai-toggle');
const analyzeBtn = document.getElementById('analyze-btn');
const scoreEl = document.getElementById('score');
const breakdownEl = document.getElementById('score-breakdown');
const domainScoreEl = document.getElementById('domain-score');
const domainLabelEl = document.getElementById('domain-label');
const domainReasonsEl = document.getElementById('domain-reasons');
const parsedOutputEl = document.getElementById('parsed-output');
const htmlSourceEl = document.getElementById('html-source');
const aiSection = document.getElementById('ai-section');
const aiOutput = document.getElementById('ai-output');
const copyBtn = document.getElementById('copy-html');
const downloadBtn = document.getElementById('download-html');

analyzeBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert('URLを入力してください');
    return;
  }

  setLoading(true);
  resetOutputs();

  try {
    const html = await fetchHtmlFromServer(url, spaToggle.checked);
    renderHtml(html);

    const parsed = parseHtml(html);
    const score = scoreAudit({ ...parsed, url });
    renderDomainPower(url);

    renderParsed(parsed);
    renderScore(score);

    if (aiToggle.checked) {
      aiSection.hidden = false;
      aiOutput.textContent = '生成中...';
      const suggestion = await requestAiSuggestions({ url, html, parsed, score });
      aiOutput.textContent = suggestion;
    }
  } catch (error) {
    console.error(error);
    alert(error.message || '解析に失敗しました');
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener('click', async () => {
  const text = htmlSourceEl.textContent || '';
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = 'コピーしました';
  setTimeout(() => (copyBtn.textContent = 'コピー'), 1200);
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([htmlSourceEl.textContent || ''], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'page.html';
  a.click();
  URL.revokeObjectURL(a.href);
});

async function fetchHtmlFromServer(url, spa) {
  const endpoint = new URL('/api/fetch-spa', window.location.origin);
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('spa', spa ? '1' : '0');

  const res = await fetch(endpoint.toString());
  if (!res.ok) {
    throw new Error('HTMLの取得に失敗しました');
  }
  const data = await res.json();
  return data.html;
}

function renderHtml(html) {
  htmlSourceEl.textContent = html;
  hljs.highlightElement(htmlSourceEl);
}

function renderParsed(parsed) {
  parsedOutputEl.textContent = JSON.stringify(parsed, null, 2);
}

function renderScore(score) {
  scoreEl.textContent = `${score.total}/100`;
  breakdownEl.innerHTML = '';
  score.breakdown.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${item.passed ? '✅' : '⚠️'} ${item.description} (+${item.weight})`;
    breakdownEl.appendChild(li);
  });
}

function renderDomainPower(url) {
  try {
    const { hostname } = new URL(url);
    const result = estimateDomainPower(hostname);
    domainScoreEl.textContent = `${result.score}/100`;
    domainLabelEl.textContent = result.label;

    domainReasonsEl.innerHTML = '';
    result.reason.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      domainReasonsEl.appendChild(li);
    });
  } catch (error) {
    domainScoreEl.textContent = '-';
    domainLabelEl.textContent = 'ドメイン解析に失敗しました';
    domainReasonsEl.innerHTML = '';
  }
}

async function requestAiSuggestions(payload) {
  const res = await fetch('/api/ai-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error('AI提案の生成に失敗しました');
  }

  const data = await res.json();
  return data.message;
}

function resetOutputs() {
  scoreEl.textContent = '-';
  breakdownEl.innerHTML = '';
  domainScoreEl.textContent = '-';
  domainLabelEl.textContent = '-';
  domainReasonsEl.innerHTML = '';
  parsedOutputEl.textContent = '';
  htmlSourceEl.textContent = '';
  aiSection.hidden = true;
}

function setLoading(loading) {
  analyzeBtn.disabled = loading;
  analyzeBtn.textContent = loading ? '解析中...' : '解析を開始';
}
