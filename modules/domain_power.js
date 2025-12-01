/**
 * ドメインパワー推定モジュール
 * ドメインの権威性をヒューリスティックに判定
 */

function estimateDomainPower(hostname) {
  const host = (hostname || '').toLowerCase();

  let score = 0;
  const reason = [];

  // 1) TLD / SLD ベースの判定
  if (host.endsWith('.go.jp') || host.includes('.gov.')) {
    score += 90;
    reason.push('政府系ドメイン（.go.jp / .gov）');
  } else if (host.endsWith('.lg.jp')) {
    score += 80;
    reason.push('自治体ドメイン（.lg.jp）');
  } else if (host.endsWith('.ac.jp') || host.endsWith('.edu')) {
    score += 70;
    reason.push('大学・教育機関ドメイン');
  } else if (host.endsWith('.or.jp') || host.endsWith('.co.jp')) {
    score += 60;
    reason.push('日本の法人向けドメイン（.or.jp / .co.jp）');
  } else if (host.endsWith('.jp') || host.endsWith('.com') || host.endsWith('.net')) {
    score += 50;
    reason.push('一般的なトップレベルドメイン');
  } else {
    score += 40;
    reason.push('その他のトップレベルドメイン');
  }

  // 2) 無料ホスティングっぽいものを減点
  if (host.endsWith('github.io') || host.endsWith('blogspot.com') || host.endsWith('hatena.ne.jp')) {
    score -= 15;
    reason.push('無料ホスティング系ドメインの可能性');
  }

  // 3) テスト環境っぽいサブドメイン
  if (host.startsWith('dev.') || host.startsWith('stg.') || host.startsWith('test.')) {
    score -= 10;
    reason.push('テスト・開発環境と思われるサブドメイン');
  }

  // 4) 政府系サブドメイン判定を強化
  if (host.includes('.mhlw.go.jp') || host.includes('.cao.go.jp') || host.includes('.mext.go.jp')) {
    // 既に .go.jp で90点になっているので、追加のボーナスは不要
    // ただし、理由を明確化
    if (!reason.includes('政府系ドメイン（.go.jp / .gov）')) {
      reason.push('日本政府の省庁ドメイン');
    }
  }

  // 0〜100 にクリップ
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // ラベル
  let label = '弱い';
  if (score >= 80) label = '非常に強い';
  else if (score >= 60) label = 'やや強い';
  else if (score >= 40) label = '普通';

  return { score, label, reason };
}

// グローバルスコープに公開（ブラウザ環境）
if (typeof window !== 'undefined') {
  window.estimateDomainPower = estimateDomainPower;
}

// CommonJS形式でもエクスポート（Node.js環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { estimateDomainPower };
}
