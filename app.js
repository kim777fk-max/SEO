/**
 * SEO診断アプリ - メインアプリケーション
 */

class SEODiagnosticApp {
  constructor() {
    this.seoGuides = null;
    this.htmlFetcher = new HTMLFetcher();
    this.currentResults = null;
    this.aiAnalyzer = null;

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

      // ローカルストレージからAPI設定を読み込み
      this.loadAPISettings();

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

    // API設定保存ボタン
    const saveApiBtn = document.getElementById('save-api-btn');
    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', () => this.saveAPISettings());
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

        this.updateStatus('URLからHTMLを取得中...');
        htmlData = await this.htmlFetcher.fetchWithFallback(url);

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

      // AI分析（設定されている場合）
      this.updateStatus('AI改善提案を生成中...');
      const aiResults = await this.aiAnalyzer.generateSuggestions(scoreResults, parsedData);

      // 結果を保存
      this.currentResults = {
        parsed: parsedData,
        score: scoreResults,
        ai: aiResults,
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

    // カテゴリ別結果
    this.displayCategoryResults();

    // 問題点一覧
    this.displayIssues();

    // AI提案
    this.displayAISuggestions();

    // 詳細データ
    this.displayDetailedData();

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
   * API設定を保存
   */
  saveAPISettings() {
    const apiType = document.getElementById('api-type').value;
    const apiKey = document.getElementById('api-key').value.trim();

    if (apiKey) {
      localStorage.setItem('seo_api_type', apiType);
      localStorage.setItem('seo_api_key', apiKey);

      this.aiAnalyzer = new AIAnalyzer(apiKey, apiType);

      this.showSuccess('API設定を保存しました');
    } else {
      localStorage.removeItem('seo_api_type');
      localStorage.removeItem('seo_api_key');

      this.aiAnalyzer = new AIAnalyzer();

      this.showSuccess('API設定をクリアしました（ルールベース分析を使用）');
    }
  }

  /**
   * API設定をロード
   */
  loadAPISettings() {
    const apiType = localStorage.getItem('seo_api_type') || 'openai';
    const apiKey = localStorage.getItem('seo_api_key') || '';

    const apiTypeSelect = document.getElementById('api-type');
    const apiKeyInput = document.getElementById('api-key');

    if (apiTypeSelect) apiTypeSelect.value = apiType;
    if (apiKeyInput) apiKeyInput.value = apiKey;

    this.aiAnalyzer = new AIAnalyzer(apiKey || null, apiType);
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
