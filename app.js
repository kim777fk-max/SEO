/**
 * SEO診断アプリ - メインアプリケーション
 */

class SEODiagnosticApp {
  constructor() {
    this.seoGuides = null;
    this.htmlFetcher = new HTMLFetcher();
    this.currentResults = null;
    this.apiEndpoint = '/api/ai-suggestions'; // Vercel Serverless Function

    this.init();
  }

  /**
   * アプリケーションの初期化
   */
  async init() {
    try {
      // Google SEOガイドラインをロード
      await this.loadSEOGuides();

      // イベントリスナーを設定
      this.setupEventListeners();

      console.log('SEO診断アプリが初期化されました');
    } catch (error) {
      console.error('初期化エラー:', error);
      this.showError('アプリケーションの初期化に失敗しました: ' + error.message);
    }
  }

  /**
   * Google SEOガイドラインをロード
   */
  async loadSEOGuides() {
    try {
      const response = await fetch('./data/google_seo_guides.json');
      if (!response.ok) {
        throw new Error('SEOガイドラインの読み込みに失敗しました');
      }
      this.seoGuides = await response.json();
    } catch (error) {
      console.error('SEOガイドラインのロードエラー:', error);
      throw error;
    }
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    // 診断ボタン
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.handleAnalyze());
    }

    // タブ切り替え
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // URLモードとHTMLモードの切り替え
    const modeRadios = document.querySelectorAll('input[name="input-mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.switchInputMode(e.target.value));
    });

    // Enterキーで診断実行
    const urlInput = document.getElementById('url-input');
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleAnalyze();
        }
      });
    }
  }

  /**
   * 入力モードを切り替え
   */
  switchInputMode(mode) {
    const urlSection = document.getElementById('url-input-section');
    const htmlSection = document.getElementById('html-input-section');

    if (mode === 'url') {
      urlSection.style.display = 'block';
      htmlSection.style.display = 'none';
    } else {
      urlSection.style.display = 'none';
      htmlSection.style.display = 'block';
    }
  }

  /**
   * 診断実行
   */
  async handleAnalyze() {
    try {
      this.showLoading(true);
      this.clearResults();

      const inputMode = document.querySelector('input[name="input-mode"]:checked').value;
      let htmlData;

      if (inputMode === 'url') {
        // URLモード
        const url = document.getElementById('url-input').value.trim();
        if (!url) {
          throw new Error('URLを入力してください');
        }

        // SPAモードチェック
        const spaMode = document.getElementById('spa-mode')?.checked || false;

        if (spaMode) {
          // SPAモード: サーバーレス関数でJavaScriptレンダリング
          this.updateStatus('JavaScriptをレンダリング中...（SPAモード、処理に時間がかかります）');
          htmlData = await this.fetchSPAHtml(url);
          // URLを追加（fetchSPAHtmlはurlを返さないため）
          if (!htmlData.url) {
            htmlData.url = url;
          }
        } else {
          // 通常モード
          this.updateStatus('URLからHTMLを取得中...');
          htmlData = await this.htmlFetcher.fetchWithFallback(url);
        }

        if (!htmlData.success) {
          throw new Error(htmlData.error || 'HTMLの取得に失敗しました');
        }
      } else {
        // HTMLモード
        const html = document.getElementById('html-input').value.trim();
        const url = document.getElementById('html-url-input').value.trim() || 'Direct Input';

        if (!html) {
          throw new Error('HTMLコンテンツを入力してください');
        }

        htmlData = this.htmlFetcher.parseDirectHTML(html, url);

        if (!htmlData.success) {
          throw new Error(htmlData.error || 'HTMLの解析に失敗しました');
        }
      }

      // HTMLを解析
      this.updateStatus('HTMLを解析中...');
      const parser = new HTMLParser(htmlData.html, htmlData.url);
      const parsedData = parser.parse();

      // スコアリング
      this.updateStatus('SEOスコアを計算中...');
      const scorer = new SEOScorer(parsedData, this.seoGuides);
      const scoreResults = scorer.score();

      // SEOの基礎チェック（詳細チェック）
      this.updateStatus('SEOの基礎チェックを実行中...');
      const detailedChecker = new DetailedSEOChecker(parsedData, htmlData.html || '');
      const detailedResults = detailedChecker.checkAll();

      // キーワード抽出
      this.updateStatus('キーワードを抽出中...');
      const keywordExtractor = new KeywordExtractor(parsedData, htmlData.html || '');
      const extractedKeywords = keywordExtractor.extract();

      // SEO優先確認チェック
      this.updateStatus('SEO優先確認チェックを実行中...');
      const priorityChecker = new SEOPriorityChecker(parsedData, htmlData.html || '');
      const priorityResults = priorityChecker.checkAll();

      // AI分析（サーバーレス関数を呼び出し、詳細チェック結果も含める）
      this.updateStatus('AI改善提案を生成中...');
      const aiResults = await this.generateAISuggestions(scoreResults, parsedData, detailedResults);

      // 結果を保存
      this.currentResults = {
        parsed: parsedData,
        score: scoreResults,
        ai: aiResults,
        detailed: detailedResults,
        keywords: extractedKeywords,
        priority: priorityResults,
        rawHtml: htmlData.html || '',
        analyzedAt: new Date().toISOString()
      };

      // 結果を表示
      this.displayResults();

      this.updateStatus('分析完了');
      this.showLoading(false);

    } catch (error) {
      console.error('分析エラー:', error);
      this.showError(error.message);
      this.showLoading(false);
    }
  }

  /**
   * 結果を表示
   */
  displayResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block';

    // スコア表示
    this.displayScore();

    // ドメインパワー表示
    this.displayDomainPower();

    // カテゴリ別結果
    this.displayCategoryResults();

    // 問題点一覧
    this.displayIssues();

    // SEOの基礎チェック結果
    this.displaySEOBasics();

    // SEO優先確認チェック結果
    this.displaySEOPriority();

    // キーワード分析結果（抽出のみ、DataForSEOとAI分析はタブクリック時）
    this.displayKeywords();

    // AI提案
    this.displayAISuggestions();

    // 詳細データ
    this.displayDetailedData();

    // HTMLソース
    this.displayHTMLSource();

    // 結果セクションまでスクロール
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * スコアカードを表示
   */
  displayScore() {
    const { score } = this.currentResults;
    const scoreValue = document.getElementById('score-value');
    const scoreLabel = document.getElementById('score-label');
    const scoreCircle = document.getElementById('score-circle');

    // スコア値を表示
    scoreValue.textContent = score.totalScore;
    scoreLabel.textContent = score.grade.label;
    scoreLabel.style.color = score.grade.color;

    // 円グラフアニメーション
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (score.totalScore / 100) * circumference;

    scoreCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    scoreCircle.style.strokeDashoffset = circumference;
    scoreCircle.style.stroke = score.grade.color;

    // アニメーション
    setTimeout(() => {
      scoreCircle.style.transition = 'stroke-dashoffset 1s ease-in-out';
      scoreCircle.style.strokeDashoffset = offset;
    }, 100);

    // サマリー情報
    document.getElementById('analyzed-url').textContent = this.currentResults.parsed.url;
    document.getElementById('total-issues').textContent = score.issues.length;
    document.getElementById('critical-issues').textContent =
      score.issues.filter(i => i.severity === 'critical').length;
  }

  /**
   * ドメインパワーを表示
   */
  displayDomainPower() {
    try {
      const url = this.currentResults.parsed.url;
      const hostname = new URL(url).hostname;
      const domainPower = estimateDomainPower(hostname);

      document.getElementById('domain-score').textContent = `${domainPower.score}/100`;
      document.getElementById('domain-label').textContent = domainPower.label;

      const reasonsList = document.getElementById('domain-reasons');
      reasonsList.innerHTML = '';
      domainPower.reason.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsList.appendChild(li);
      });
    } catch (error) {
      console.error('ドメインパワー計算エラー:', error);
      document.getElementById('domain-score').textContent = '-';
      document.getElementById('domain-label').textContent = '計算失敗';
    }
  }

  /**
   * カテゴリ別結果を表示
   */
  displayCategoryResults() {
    const container = document.getElementById('category-results');
    container.innerHTML = '';

    const { score } = this.currentResults;

    for (const [key, category] of Object.entries(score.categories)) {
      const card = document.createElement('div');
      card.className = 'category-card';

      const percentage = category.percentage;
      const barColor = percentage >= 80 ? '#4CAF50' :
                       percentage >= 60 ? '#FFC107' : '#F44336';

      card.innerHTML = `
        <div class="category-header">
          <h3>${category.name}</h3>
          <span class="category-score">${category.score}/${category.maxScore}</span>
        </div>
        <div class="category-bar">
          <div class="category-bar-fill" style="width: ${percentage}%; background-color: ${barColor};"></div>
        </div>
        <div class="category-percentage">${percentage}%</div>
      `;

      container.appendChild(card);
    }
  }

  /**
   * 問題点一覧を表示
   */
  displayIssues() {
    const container = document.getElementById('issues-list');
    container.innerHTML = '';

    const { score } = this.currentResults;

    if (score.issues.length === 0) {
      container.innerHTML = '<p class="no-issues">問題は検出されませんでした！</p>';
      return;
    }

    // 重大度でグループ化
    const grouped = {
      critical: score.issues.filter(i => i.severity === 'critical'),
      high: score.issues.filter(i => i.severity === 'high'),
      medium: score.issues.filter(i => i.severity === 'medium'),
      low: score.issues.filter(i => i.severity === 'low')
    };

    const severityLabels = {
      critical: { label: '重大', color: '#F44336', icon: '🔴' },
      high: { label: '高', color: '#FF9800', icon: '🟠' },
      medium: { label: '中', color: '#FFC107', icon: '🟡' },
      low: { label: '低', color: '#2196F3', icon: '🔵' }
    };

    for (const [severity, issues] of Object.entries(grouped)) {
      if (issues.length === 0) continue;

      const severityInfo = severityLabels[severity];

      const section = document.createElement('div');
      section.className = 'issue-severity-section';

      const header = document.createElement('h4');
      header.innerHTML = `${severityInfo.icon} ${severityInfo.label}度 (${issues.length}件)`;
      header.style.color = severityInfo.color;
      section.appendChild(header);

      issues.forEach(issue => {
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        issueCard.innerHTML = `
          <div class="issue-header">
            <span class="issue-category">${issue.category}</span>
            <span class="issue-points">-${issue.points}点</span>
          </div>
          <h5>${issue.rule}</h5>
          <p>${issue.description}</p>
          ${issue.finding ? `<div class="issue-finding">${issue.finding}</div>` : ''}
        `;
        section.appendChild(issueCard);
      });

      container.appendChild(section);
    }
  }

  /**
   * AI提案を表示
   */
  displayAISuggestions() {
    const container = document.getElementById('ai-suggestions');
    container.innerHTML = '';

    const { ai } = this.currentResults;

    if (!ai.success || !ai.suggestions) {
      container.innerHTML = '<p>AI提案を生成できませんでした</p>';
      return;
    }

    const suggestions = ai.suggestions;

    // 全体的なアドバイス
    if (suggestions.generalAdvice) {
      const adviceCard = document.createElement('div');
      adviceCard.className = 'ai-advice-card';
      adviceCard.innerHTML = `
        <h4>📊 総合アドバイス</h4>
        <p>${suggestions.generalAdvice}</p>
        <small class="ai-source">提供: ${ai.source === 'openai' ? 'OpenAI GPT-4' : ai.source === 'claude' ? 'Claude AI' : 'ルールベース分析'}</small>
      `;
      container.appendChild(adviceCard);
    }

    // 優先度別の提案
    if (suggestions.priorityIssues && suggestions.priorityIssues.length > 0) {
      const prioritySection = document.createElement('div');
      prioritySection.innerHTML = '<h4>🎯 優先改善項目</h4>';

      suggestions.priorityIssues.forEach(item => {
        const suggestionCard = document.createElement('div');
        suggestionCard.className = 'suggestion-card';

        const priorityBadge = item.priority === 1 ? '🥇' : item.priority === 2 ? '🥈' : '🥉';

        suggestionCard.innerHTML = `
          <div class="suggestion-header">
            <span class="suggestion-priority">${priorityBadge} 優先度 ${item.priority}</span>
            <span class="suggestion-severity severity-${item.severity}">${item.severity}</span>
          </div>
          <h5>${item.issue}</h5>
          <div class="suggestion-content">
            <div class="suggestion-section">
              <strong>💡 改善提案:</strong>
              <p>${item.suggestion}</p>
            </div>
            <div class="suggestion-section">
              <strong>🔧 実装方法:</strong>
              <p>${item.implementation}</p>
            </div>
            <div class="suggestion-section">
              <strong>📈 期待効果:</strong>
              <p>${item.expectedImpact}</p>
            </div>
          </div>
        `;

        prioritySection.appendChild(suggestionCard);
      });

      container.appendChild(prioritySection);
    }
  }

  /**
   * 詳細データを表示
   */
  displayDetailedData() {
    const container = document.getElementById('detailed-data');
    const { parsed } = this.currentResults;

    const data = {
      'タイトル': parsed.title.text || 'なし',
      'タイトル長': `${parsed.title.length}文字`,
      'メタディスクリプション': parsed.metaDescription.text || 'なし',
      'メタディスクリプション長': `${parsed.metaDescription.length}文字`,
      'H1タグ数': parsed.headings.h1.length,
      'H2タグ数': parsed.headings.h2.length,
      'H3タグ数': parsed.headings.h3.length,
      '総画像数': parsed.images.total,
      'Alt属性あり': `${parsed.images.withAlt} (${parsed.images.percentage}%)`,
      '内部リンク': parsed.links.totalInternal,
      '外部リンク': parsed.links.totalExternal,
      'コンテンツ量': `${parsed.content.wordCount}文字/単語`,
      '段落数': parsed.content.paragraphs,
      '構造化データ': parsed.structuredData.hasJsonLd ? `あり (${parsed.structuredData.count}個)` : 'なし',
      'HTTPS': parsed.technical.isHTTPS ? 'はい' : 'いいえ',
      'Viewport': parsed.technical.hasViewport ? 'あり' : 'なし',
      'Lang属性': parsed.technical.lang || 'なし'
    };

    let html = '<div class="data-grid">';
    for (const [key, value] of Object.entries(data)) {
      html += `
        <div class="data-item">
          <span class="data-label">${key}:</span>
          <span class="data-value">${value}</span>
        </div>
      `;
    }
    html += '</div>';

    container.innerHTML = html;
  }

  /**
   * HTMLソースを表示
   */
  displayHTMLSource() {
    // 元のHTMLを取得（結果から）
    const rawHtml = this.currentResults.rawHtml || '';
    const url = this.currentResults.parsed.url;

    // HTMLソースを表示
    const codeElement = document.querySelector('#html-source-content code');
    if (codeElement) {
      codeElement.textContent = rawHtml;

      // Highlight.jsでシンタックスハイライト
      if (typeof hljs !== 'undefined') {
        hljs.highlightElement(codeElement);
      }
    }

    // HTML長さ情報を表示
    const lengthInfo = document.getElementById('html-length-info');
    if (lengthInfo) {
      const lines = rawHtml.split('\n').length;
      lengthInfo.textContent = `${(rawHtml.length / 1024).toFixed(2)} KB / ${lines.toLocaleString()} 行`;
    }

    // コピーボタンのイベントリスナー
    const copyBtn = document.getElementById('copy-html-btn');
    if (copyBtn) {
      copyBtn.onclick = () => this.copyHTMLToClipboard();
    }

    // ダウンロードボタンのイベントリスナー
    const downloadBtn = document.getElementById('download-html-btn');
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadHTML();
    }
  }

  /**
   * HTMLをクリップボードにコピー
   */
  async copyHTMLToClipboard() {
    const rawHtml = this.currentResults.rawHtml || '';

    try {
      await navigator.clipboard.writeText(rawHtml);

      const btn = document.getElementById('copy-html-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅ コピーしました！';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      alert('コピーに失敗しました');
    }
  }

  /**
   * HTMLをダウンロード
   */
  downloadHTML() {
    const rawHtml = this.currentResults.rawHtml || '';
    const url = this.currentResults.parsed.url;

    // ファイル名を生成（URLから）
    let filename = 'seo-diagnostic';
    try {
      const urlObj = new URL(url);
      filename = urlObj.hostname.replace(/\./g, '_') + '_' + Date.now();
    } catch (e) {
      filename = 'seo-diagnostic_' + Date.now();
    }

    // Blobを作成
    const blob = new Blob([rawHtml], { type: 'text/html' });
    const url2 = URL.createObjectURL(blob);

    // ダウンロードリンクを作成してクリック
    const a = document.createElement('a');
    a.href = url2;
    a.download = filename + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url2);
  }

  /**
   * タブを切り替え
   */
  switchTab(tabName) {
    // すべてのタブボタンとコンテンツを非アクティブ化
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // 選択されたタブをアクティブ化
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  /**
   * AI改善提案を生成（サーバーレス関数を呼び出し）
   */
  async generateAISuggestions(scoreResults, parsedData, detailedResults) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scoreResults,
          parsedData,
          detailedResults, // 詳細チェック結果を含める
          apiType: 'openai' // サーバー側で環境変数から判断
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('AI分析エラー:', error);

      // エラー時はローカルのルールベース分析にフォールバック
      return this.generateLocalRuleBasedSuggestions(scoreResults, parsedData);
    }
  }

  /**
   * ローカルのルールベース分析（フォールバック用）
   */
  generateLocalRuleBasedSuggestions(scoreResults, parsedData) {
    const priorityIssues = [];
    const sortedIssues = [...scoreResults.issues].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const topIssues = sortedIssues.slice(0, 3);

    topIssues.forEach((issue, index) => {
      priorityIssues.push({
        priority: index + 1,
        issue: issue.rule,
        severity: issue.severity,
        category: issue.category,
        suggestion: issue.description,
        implementation: 'Google Search Centralのガイドラインを参照してください。',
        expectedImpact: 'SEOスコアが向上します。'
      });
    });

    const score = scoreResults.totalScore;
    let generalAdvice = '';

    if (score >= 90) {
      generalAdvice = '優秀なSEOスコアです！';
    } else if (score >= 75) {
      generalAdvice = '良好なSEO状態です。';
    } else if (score >= 60) {
      generalAdvice = '平均的なSEO状態です。';
    } else {
      generalAdvice = '改善の余地が多くあります。';
    }

    return {
      success: true,
      suggestions: {
        priorityIssues,
        generalAdvice
      },
      source: 'local-fallback'
    };
  }

  /**
   * SPA対応のHTML取得（Puppeteer使用）
   */
  async fetchSPAHtml(url) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(`/api/fetch-spa?url=${encodedUrl}&spa=1`);

      if (!response.ok) {
        // 404エラーの場合は、サーバーレス関数が利用できないことを通知
        if (response.status === 404) {
          throw new Error('SPAモードはサーバーレス関数が必要です。GitHub Pagesでは利用できません。Vercelにデプロイするか、通常モードをご利用ください。');
        }

        const error = await response.json().catch(() => ({ error: 'SPA HTMLの取得に失敗しました' }));
        throw new Error(error.error || error.message || 'SPA HTMLの取得に失敗しました');
      }

      const result = await response.json();

      // warningがある場合は表示
      if (result.warning) {
        console.warn('SPA Mode Warning:', result.warning);
        this.showWarning(result.warning);
      }

      if (!result.success) {
        throw new Error(result.error || 'SPA HTMLの取得に失敗しました');
      }

      return { success: true, html: result.html };

    } catch (error) {
      console.error('SPA fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 警告メッセージを表示
   */
  showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 16px;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    warningDiv.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <span style="font-size: 24px;">⚠️</span>
        <div>
          <strong style="display: block; margin-bottom: 8px;">注意</strong>
          <p style="margin: 0; color: #856404;">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          margin-left: auto;
        ">×</button>
      </div>
    `;

    document.body.appendChild(warningDiv);

    // 10秒後に自動的に閉じる
    setTimeout(() => {
      if (warningDiv.parentElement) {
        warningDiv.remove();
      }
    }, 10000);
  }

  /**
   * ローディング表示
   */
  showLoading(show) {
    const loadingEl = document.getElementById('loading');
    const analyzeBtn = document.getElementById('analyze-btn');

    if (loadingEl) {
      loadingEl.style.display = show ? 'flex' : 'none';
    }

    if (analyzeBtn) {
      analyzeBtn.disabled = show;
    }
  }

  /**
   * ステータス更新
   */
  updateStatus(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  /**
   * エラー表示
   */
  showError(message) {
    alert('エラー: ' + message);
    this.updateStatus('エラーが発生しました');
  }

  /**
   * 成功メッセージ表示
   */
  showSuccess(message) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.color = '#4CAF50';
      setTimeout(() => {
        statusEl.style.color = '';
      }, 3000);
    }
  }

  /**
   * SEOの基礎チェック結果を表示
   */
  displaySEOBasics() {
    const { detailed } = this.currentResults;
    if (!detailed) return;

    // サマリーの表示
    this.displaySEOBasicsSummary(detailed.summary);

    // 優先度別の結果を表示
    this.displayPriorityChecks('s', detailed.priorityS);
    this.displayPriorityChecks('a', detailed.priorityA);
    this.displayPriorityChecks('b', detailed.priorityB);
    this.displayPriorityChecks('c', detailed.priorityC);
    this.displayPriorityChecks('d', detailed.priorityD);
  }

  /**
   * サマリーの表示
   */
  displaySEOBasicsSummary(summary) {
    const container = document.getElementById('seo-basics-summary');
    if (!container) return;

    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 8px;">
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #1976d2;">${summary.total}</div>
          <div style="color: #666; font-size: 0.9rem;">総チェック項目</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #4CAF50;">${summary.passed}</div>
          <div style="color: #666; font-size: 0.9rem;">合格</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #d32f2f;">${summary.failed}</div>
          <div style="color: #666; font-size: 0.9rem;">不合格</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: #f57c00;">${summary.warnings}</div>
          <div style="color: #666; font-size: 0.9rem;">警告</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: ${passRate >= 80 ? '#4CAF50' : passRate >= 60 ? '#f57c00' : '#d32f2f'}">${passRate}%</div>
          <div style="color: #666; font-size: 0.9rem;">合格率</div>
        </div>
      </div>
    `;
  }

  /**
   * 優先度別のチェック結果を表示
   */
  displayPriorityChecks(priority, checks) {
    const container = document.getElementById(`seo-basics-priority-${priority}`);
    if (!container || !checks || checks.length === 0) return;

    const statusIcons = {
      'pass': '✅',
      'fail': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };

    const statusColors = {
      'pass': '#4CAF50',
      'fail': '#d32f2f',
      'warning': '#f57c00',
      'info': '#1976d2'
    };

    const statusLabels = {
      'pass': '合格',
      'fail': '不合格',
      'warning': '警告',
      'info': '情報'
    };

    let html = '';

    checks.forEach((check, index) => {
      const icon = statusIcons[check.status] || '•';
      const color = statusColors[check.status] || '#666';
      const label = statusLabels[check.status] || check.status;

      html += `
        <div style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: white;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <h5 style="margin: 0; font-size: 1rem; color: #333;">
              ${icon} ${check.title}
            </h5>
            <span style="padding: 0.25rem 0.75rem; background: ${color}; color: white; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
              ${label}
            </span>
          </div>
          <p style="margin: 0.5rem 0; color: #666; font-size: 0.95rem;">
            ${check.message}
          </p>
          <details style="margin-top: 0.75rem;">
            <summary style="cursor: pointer; color: #1976d2; font-size: 0.9rem; font-weight: 500;">
              詳細を表示
            </summary>
            <div style="margin-top: 0.5rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px; font-size: 0.9rem; color: #555;">
              <p style="margin: 0 0 0.5rem 0;"><strong>推奨事項:</strong> ${check.details}</p>
              <p style="margin: 0; font-size: 0.85rem; color: #888;"><strong>参照:</strong> ${check.source}</p>
            </div>
          </details>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * SEO優先確認チェック結果を表示
   */
  displaySEOPriority() {
    if (!this.currentResults || !this.currentResults.priority) {
      return;
    }

    const { priority } = this.currentResults;

    // サマリーを表示
    this.displayPrioritySummary(priority.summary);

    // カテゴリ別チェック結果を表示
    this.displayPriorityCategories(priority.categories);

    // タブクリック時にAI分析を実行
    const priorityTab = document.querySelector('.tab-btn[data-tab="priority"]');
    if (priorityTab && !priorityTab.dataset.initialized) {
      priorityTab.dataset.initialized = 'true';
      priorityTab.addEventListener('click', () => this.loadPriorityAIAnalysis());
    }
  }

  /**
   * SEO優先確認サマリーを表示
   */
  displayPrioritySummary(summary) {
    const container = document.getElementById('priority-summary');
    if (!container) return;

    const passRate = summary.percentage || 0;
    const scoreColor = passRate >= 80 ? '#4CAF50' : passRate >= 60 ? '#f57c00' : '#d32f2f';

    container.innerHTML = `
      <div class="priority-summary">
        <div class="priority-summary-main">
          <div class="priority-summary-score" style="color: ${scoreColor};">
            ${summary.passedItems}/${summary.totalItems}
          </div>
          <div class="priority-summary-label">全49項目中の合格数</div>
          <div class="priority-summary-percentage" style="color: ${scoreColor};">
            ${passRate}%
          </div>
          <div class="priority-summary-sublabel" style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.9;">
            ※合格率はチェック可能項目（${summary.checkableItems}項目）で計算
          </div>
        </div>
        <div class="priority-summary-details">
          <div class="priority-summary-stat">
            <div class="stat-value" style="color: #4CAF50;">${summary.passedItems}</div>
            <div class="stat-label">✅ 合格</div>
          </div>
          <div class="priority-summary-stat">
            <div class="stat-value" style="color: #d32f2f;">${summary.failedItems}</div>
            <div class="stat-label">❌ 不合格</div>
          </div>
          <div class="priority-summary-stat">
            <div class="stat-value" style="color: #f57c00;">${summary.warningItems || 0}</div>
            <div class="stat-label">⚠️ 警告</div>
          </div>
          <div class="priority-summary-stat">
            <div class="stat-value" style="color: #1976d2;">${summary.infoItems || 0}</div>
            <div class="stat-label">ℹ️ 情報</div>
          </div>
          <div class="priority-summary-stat">
            <div class="stat-value" style="color: #666;">${summary.totalItems}</div>
            <div class="stat-label">📋 総項目</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * SEO優先確認カテゴリ別チェック結果を表示
   */
  displayPriorityCategories(categories) {
    const container = document.getElementById('priority-categories');
    if (!container || !categories) return;

    const statusIcons = {
      'pass': '✅',
      'fail': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };

    const statusLabels = {
      'pass': '合格',
      'fail': '不合格',
      'warning': '警告',
      'info': '情報'
    };

    const html = categories.map(category => {
      // info項目を除外した合格率を計算
      const checkableCount = category.checks.filter(c => c.status !== 'info').length;
      const passRate = checkableCount > 0 ? Math.round((category.passed / checkableCount) * 100) : 0;
      const categoryColor = passRate >= 80 ? '#4CAF50' : passRate >= 60 ? '#f57c00' : '#d32f2f';

      const checksHtml = category.checks.map(check => {
        const icon = statusIcons[check.status] || '•';

        return `
          <div class="priority-check-item ${check.status}">
            <div class="priority-check-icon">${icon}</div>
            <div class="priority-check-content">
              <div class="priority-check-header">
                <span class="priority-check-label">${check.label}</span>
                <span class="priority-check-status-badge ${check.status}">${statusLabels[check.status]}</span>
              </div>
              <div class="priority-check-detail">${check.detail}</div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="priority-category">
          <div class="priority-category-header">
            <div class="priority-category-title">
              <h4>${category.category}</h4>
              <p class="priority-category-description">${category.description}</p>
              <a href="${category.link}" target="_blank" rel="noopener noreferrer" class="priority-category-link">
                📖 Google公式ガイドを見る
              </a>
            </div>
            <div class="priority-category-score">
              <div class="category-score-value" style="color: ${categoryColor};">
                ${category.passed}/${category.total}
              </div>
              <div class="category-score-percentage" style="color: ${categoryColor};">
                ${passRate}%
              </div>
              ${checkableCount !== category.total ? `<div style="font-size: 0.75rem; color: #888; margin-top: 0.25rem;">(${checkableCount}項目で評価)</div>` : ''}
            </div>
          </div>
          <div class="priority-category-checks">
            ${checksHtml}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  /**
   * SEO優先確認AI分析を読み込み（タブクリック時）
   */
  async loadPriorityAIAnalysis() {
    if (!this.currentResults || !this.currentResults.priority) {
      return;
    }

    // 既にロード済みの場合はスキップ
    if (this.currentResults.priority.aiAnalysis) {
      return;
    }

    try {
      const loadingDiv = document.getElementById('priority-ai-loading');
      const aiSection = document.getElementById('priority-ai-section');
      const errorDiv = document.getElementById('priority-error');

      if (loadingDiv) {
        loadingDiv.style.display = 'block';
      }

      if (errorDiv) {
        errorDiv.style.display = 'none';
      }

      console.log('Calling SEO Priority AI Analysis...');

      // AI分析APIを呼び出し
      const response = await fetch('/api/seo-priority-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priorityResults: this.currentResults.priority,
          parsedData: this.currentResults.parsed,
          apiType: 'openai'
        })
      });

      if (!response.ok) {
        throw new Error(`AI分析API error: ${response.status}`);
      }

      const aiData = await response.json();
      console.log('SEO Priority AI analysis response:', aiData);

      // AI分析結果を表示
      if (aiData.analysis) {
        this.displayPriorityAIAnalysis(aiData.analysis);

        // 結果を保存
        this.currentResults.priority.aiAnalysis = aiData.analysis;
      }

      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

      if (aiSection) {
        aiSection.style.display = 'block';
      }

    } catch (error) {
      console.error('SEO Priority AI analysis error:', error);

      const loadingDiv = document.getElementById('priority-ai-loading');
      const errorDiv = document.getElementById('priority-error');

      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

      if (errorDiv) {
        errorDiv.textContent = `エラー: ${error.message}`;
        errorDiv.style.display = 'block';
      }
    }
  }

  /**
   * SEO優先確認AI分析結果を表示
   */
  displayPriorityAIAnalysis(analysis) {
    const container = document.getElementById('priority-ai-content');
    if (!container) return;

    // マークダウン風のテキストをHTMLに変換（簡易版）
    let html = analysis
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/###\s+(.+?)<br>/g, '<h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1976d2;">$1</h4>')
      .replace(/##\s+(.+?)<br>/g, '<h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1976d2;">$1</h3>')
      .replace(/#\s+(.+?)<br>/g, '<h2 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1976d2;">$1</h2>')
      .replace(/- (.+?)<br>/g, '<li>$1</li>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;"><code>$1</code></pre>');

    // リストタグを整形
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">$&</ul>');

    container.innerHTML = html;
  }

  /**
   * キーワード分析結果を表示
   */
  displayKeywords() {
    if (!this.currentResults || !this.currentResults.keywords) {
      return;
    }

    const { keywords } = this.currentResults;
    const resultsDiv = document.getElementById('keywords-results');

    if (!resultsDiv) return;

    // 主要キーワードを表示
    this.displayMainKeywords(keywords.mainKeywords);

    // ロングテールキーワードを表示
    this.displayLongtailKeywords(keywords.phrases);

    // キーワード密度を表示
    this.displayKeywordDensity(keywords.density);

    // 基本的な推奨事項を表示
    this.displayKeywordRecommendations(keywords.recommendations);

    // 結果を表示
    resultsDiv.style.display = 'block';

    // タブクリック時にDataForSEOとAI分析を実行
    const keywordsTab = document.querySelector('.tab-btn[data-tab="keywords"]');
    if (keywordsTab && !keywordsTab.dataset.initialized) {
      keywordsTab.dataset.initialized = 'true';
      keywordsTab.addEventListener('click', () => this.loadKeywordAnalysis());
    }
  }

  /**
   * 主要キーワードを表示
   */
  displayMainKeywords(mainKeywords) {
    const container = document.getElementById('main-keywords-list');
    if (!container) return;

    if (!mainKeywords || mainKeywords.length === 0) {
      container.innerHTML = '<p style="color: #999;">キーワードが見つかりませんでした</p>';
      return;
    }

    const html = mainKeywords.map((kw, index) => `
      <div class="keyword-item">
        <span class="keyword-word">${index + 1}. ${kw.word}</span>
        <div class="keyword-stats">
          <div class="keyword-stat">
            <span class="keyword-stat-label">出現回数</span>
            <span class="keyword-stat-value">${kw.count}回</span>
          </div>
          <div class="keyword-stat">
            <span class="keyword-stat-label">密度</span>
            <span class="keyword-stat-value">${kw.density}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * ロングテールキーワードを表示
   */
  displayLongtailKeywords(phrases) {
    const container = document.getElementById('longtail-keywords-list');
    if (!container) return;

    if (!phrases || phrases.length === 0) {
      container.innerHTML = '<p style="color: #999;">ロングテールキーワード候補が見つかりませんでした</p>';
      return;
    }

    const html = phrases.map(p => `
      <span class="phrase-item">
        ${p.phrase}
        <span class="phrase-count">${p.count}回</span>
      </span>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * キーワード密度を表示
   */
  displayKeywordDensity(density) {
    const container = document.getElementById('keyword-density-list');
    if (!container) return;

    if (!density || density.length === 0) {
      container.innerHTML = '<p style="color: #999;">データがありません</p>';
      return;
    }

    const html = density.map(kw => {
      const densityValue = parseFloat(kw.density);
      const barWidth = Math.min(densityValue * 20, 100); // 5%で100%になるようにスケール

      return `
        <div class="keyword-density-item">
          <span class="keyword-word" style="min-width: 150px;">${kw.keyword}</span>
          <div class="keyword-density-bar">
            <div class="keyword-density-fill" style="width: ${barWidth}%"></div>
          </div>
          <span class="keyword-density-value">${kw.density}</span>
          ${!kw.optimal ? '<span style="color: #f57c00; font-size: 0.85rem; margin-left: 0.5rem;">⚠️</span>' : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  /**
   * 基本的な推奨事項を表示
   */
  displayKeywordRecommendations(recommendations) {
    const container = document.getElementById('keyword-recommendations-list');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML = '<p style="color: #4caf50;">✅ 特に改善が必要な問題は見つかりませんでした</p>';
      return;
    }

    const html = recommendations.map(rec => `
      <div class="keyword-recommendation ${rec.priority}">
        <strong>[${rec.type.toUpperCase()}] ${rec.priority === 'high' ? '🔴 重要' : rec.priority === 'medium' ? '🟡 推奨' : 'ℹ️ 情報'}</strong><br>
        ${rec.message}
      </div>
    `).join('');

    container.innerHTML = html;
  }

  /**
   * DataForSEOとAIキーワード分析を読み込み（タブクリック時）
   */
  async loadKeywordAnalysis() {
    if (!this.currentResults || !this.currentResults.keywords) {
      return;
    }

    // 既にロード済みの場合はスキップ
    if (this.currentResults.keywords.dataforSeo || this.currentResults.keywords.aiAnalysis) {
      return;
    }

    try {
      const loadingDiv = document.getElementById('keywords-loading');
      if (loadingDiv) {
        loadingDiv.style.display = 'block';
      }

      // 主要キーワード（上位5個）を取得
      const topKeywords = this.currentResults.keywords.mainKeywords
        .slice(0, 5)
        .map(kw => kw.word);

      if (topKeywords.length === 0) {
        throw new Error('キーワードが見つかりませんでした');
      }

      // DataForSEO APIを呼び出し
      console.log('Calling DataForSEO API with keywords:', topKeywords);
      const dataforSeoResponse = await fetch('/api/dataforseo-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keywords: topKeywords,
          location: 'Japan',
          language: 'ja'
        })
      });

      if (!dataforSeoResponse.ok) {
        throw new Error(`DataForSEO API error: ${dataforSeoResponse.status}`);
      }

      const dataforSeoData = await dataforSeoResponse.json();
      console.log('DataForSEO response:', dataforSeoData);

      // DataForSEOデータを表示
      if (dataforSeoData.keywords && dataforSeoData.keywords.length > 0) {
        this.displaySearchData(dataforSeoData.keywords);
      }

      if (dataforSeoData.relatedKeywords && dataforSeoData.relatedKeywords.length > 0) {
        this.displayRelatedKeywords(dataforSeoData.relatedKeywords);
      }

      // AIキーワード分析を呼び出し
      console.log('Calling AI keyword analysis...');
      const aiResponse = await fetch('/api/keyword-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extractedKeywords: this.currentResults.keywords,
          dataforSeoData: dataforSeoData,
          parsedData: this.currentResults.parsed,
          apiType: 'openai'
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI analysis error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('AI analysis response:', aiData);

      // AI提案を表示
      this.displayAIKeywordSuggestions(aiData.suggestions);

      // 結果を保存
      this.currentResults.keywords.dataforSeo = dataforSeoData;
      this.currentResults.keywords.aiAnalysis = aiData.suggestions;

      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

    } catch (error) {
      console.error('Keyword analysis error:', error);
      const errorDiv = document.getElementById('keywords-error');
      const loadingDiv = document.getElementById('keywords-loading');

      if (loadingDiv) {
        loadingDiv.style.display = 'none';
      }

      if (errorDiv) {
        errorDiv.textContent = `エラー: ${error.message}`;
        errorDiv.style.display = 'block';
      }
    }
  }

  /**
   * 検索データを表示
   */
  displaySearchData(keywords) {
    const section = document.getElementById('search-data-section');
    const container = document.getElementById('search-data-table');
    if (!container || !section) return;

    const html = `
      <table class="keyword-data-table">
        <thead>
          <tr>
            <th>キーワード</th>
            <th>検索ボリューム/月</th>
            <th>競合度</th>
            <th>CPC</th>
          </tr>
        </thead>
        <tbody>
          ${keywords.map(kw => `
            <tr>
              <td><strong>${kw.keyword}</strong></td>
              <td>${kw.search_volume !== null ? kw.search_volume.toLocaleString() : 'N/A'}</td>
              <td>
                ${kw.competition_level ? `<span class="keyword-competition ${kw.competition_level}">${kw.competition_level}</span>` : 'N/A'}
              </td>
              <td>${kw.cpc !== null ? '¥' + kw.cpc.toFixed(2) : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
    section.style.display = 'block';
  }

  /**
   * 関連キーワードを表示
   */
  displayRelatedKeywords(relatedKeywords) {
    const section = document.getElementById('related-keywords-section');
    const container = document.getElementById('related-keywords-list');
    if (!container || !section) return;

    const html = relatedKeywords.map((kw, index) => `
      <div class="keyword-item">
        <span class="keyword-word">${index + 1}. ${kw.keyword}</span>
        <div class="keyword-stats">
          <div class="keyword-stat">
            <span class="keyword-stat-label">検索ボリューム/月</span>
            <span class="keyword-stat-value">${kw.search_volume ? kw.search_volume.toLocaleString() : 'N/A'}</span>
          </div>
          <div class="keyword-stat">
            <span class="keyword-stat-label">競合度</span>
            <span class="keyword-competition ${kw.competition_level}">${kw.competition_level || 'N/A'}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    section.style.display = 'block';
  }

  /**
   * AIキーワード提案を表示
   */
  displayAIKeywordSuggestions(suggestions) {
    const section = document.getElementById('ai-keyword-suggestions-section');
    const container = document.getElementById('ai-keyword-suggestions');
    if (!container || !section) return;

    // マークダウン風のテキストをHTMLに変換（簡易版）
    let html = suggestions
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/###\s+(.+?)<br>/g, '<h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1976d2;">$1</h4>')
      .replace(/##\s+(.+?)<br>/g, '<h3 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: #1976d2;">$1</h3>')
      .replace(/- (.+?)<br>/g, '<li>$1</li>');

    // リストタグを整形
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul style="margin: 0.5rem 0; padding-left: 1.5rem;">$&</ul>');

    container.innerHTML = html;
    section.style.display = 'block';
  }

  /**
   * 結果をクリア
   */
  clearResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  window.seoApp = new SEODiagnosticApp();
});
