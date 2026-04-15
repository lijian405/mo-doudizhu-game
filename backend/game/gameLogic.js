// 游戏核心逻辑

// 生成牌组
function generateDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck = [];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: getCardValue(rank) });
    }
  }
  
  // 添加大小王
  deck.push({ suit: '👑', rank: '小王', value: 16 });
  deck.push({ suit: '👑', rank: '大王', value: 17 });
  
  return deck;
}

// 获取牌的数值
function getCardValue(rank) {
  const values = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
    '2': 15,
    '小王': 16,
    '大王': 17
  };
  return values[rank] || 0;
}

// 洗牌
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// 发牌（cheatTargetName 与某位玩家 name 完全一致时，该玩家获得大王、小王与任意两张 2，其余牌随机）
function dealCards(players, cheatTargetName) {
  for (const player of players) {
    player.cards = [];
  }

  const trimmed = cheatTargetName && String(cheatTargetName).trim();
  const targetIdx = trimmed ? players.findIndex((p) => p.name === trimmed) : -1;

  if (targetIdx < 0) {
    const deck = shuffleDeck(generateDeck());
    const 地主Cards = deck.splice(0, 3);
    for (let i = 0; i < deck.length; i++) {
      players[i % 3].cards.push(deck[i]);
    }
    for (const player of players) {
      player.cards.sort((a, b) => b.value - a.value);
      player.cardCount = player.cards.length;
    }
    return { players, 地主Cards };
  }

  const deck = generateDeck();
  const rigged = [];
  const takeOne = (pred) => {
    const i = deck.findIndex(pred);
    if (i === -1) return false;
    rigged.push(deck.splice(i, 1)[0]);
    return true;
  };
  takeOne((c) => c.suit === 'JOKER' && c.rank === '大王');
  takeOne((c) => c.suit === 'JOKER' && c.rank === '小王');
  let foundTwos = 0;
  for (let t = 0; t < deck.length && foundTwos < 2; ) {
    const c = deck[t];
    if (c.rank === '2') {
      rigged.push(deck.splice(t, 1)[0]);
      foundTwos++;
    } else {
      t++;
    }
  }

  if (rigged.length < 4) {
    return dealCards(players, null);
  }

  shuffleDeck(deck);
  const 地主Cards = deck.splice(0, 3);
  const rest = deck;
  const need = [17, 17, 17];
  need[targetIdx] = 13;
  let i = 0;
  for (let p = 0; p < 3; p++) {
    while (players[p].cards.length < need[p] && i < rest.length) {
      players[p].cards.push(rest[i++]);
    }
  }
  players[targetIdx].cards.push(...rigged);
  for (const player of players) {
    player.cards.sort((a, b) => b.value - a.value);
    player.cardCount = player.cards.length;
  }
  return { players, 地主Cards };
}

// 统计牌值出现的次数
function countCardValues(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.value] = (counts[card.value] || 0) + 1;
  }
  return counts;
}

// 判断牌型
function getCardType(cards) {
  if (cards.length === 0) return 'invalid';
  if (cards.length === 1) return 'single';

  if (cards.length === 2) {
    if (cards[0].value === cards[1].value) return 'pair';
    if ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王')) {
      return 'bomb';
    }
    return 'invalid';
  }

  if (cards.length === 3) {
    if (cards[0].value === cards[1].value && cards[1].value === cards[2].value) {
      return 'triple';
    }
    return 'invalid';
  }

  const counts = countCardValues(cards);
  const countVals = Object.values(counts);

  // 炸弹（4 张相同）
  if (cards.length === 4 && countVals.length === 1) return 'bomb';

  // 三带一
  if (cards.length === 4 && countVals.includes(3) && countVals.includes(1)) {
    return 'triple_with_single';
  }

  if (cards.length === 4) return 'invalid';

  // 三带二
  if (cards.length === 5 && countVals.includes(3) && countVals.includes(2)) {
    return 'triple_with_pair';
  }

  // 四带二（4+1+1 或 4+2）
  if (cards.length === 6 && countVals.includes(4)) {
    return 'four_with_two';
  }

  // --- 以下为顺序牌型，不匹配时 fall-through 到下一个检查 ---
  const sorted = [...cards].sort((a, b) => a.value - b.value);
  const noHighCards = sorted.every(c => c.value < 15);

  // 顺子：>= 5 张，点数唯一且连续，不含 2 和王
  if (cards.length >= 5 && noHighCards && countVals.every(c => c === 1)) {
    let ok = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) { ok = false; break; }
    }
    if (ok) return 'straight';
  }

  // 连对（双顺）：>= 6 张，偶数，全部为对子且连续
  if (cards.length >= 6 && cards.length % 2 === 0 && noHighCards && countVals.every(c => c === 2)) {
    const pairVals = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let ok = true;
    for (let i = 1; i < pairVals.length; i++) {
      if (pairVals[i] !== pairVals[i - 1] + 1) { ok = false; break; }
    }
    if (ok) return 'double_straight';
  }

  // 三顺（飞机不带）：>= 6 张，能被 3 整除，全部为三张且连续
  if (cards.length >= 6 && cards.length % 3 === 0 && noHighCards && countVals.every(c => c === 3)) {
    const triVals = Object.keys(counts).map(Number).sort((a, b) => a - b);
    let ok = true;
    for (let i = 1; i < triVals.length; i++) {
      if (triVals[i] !== triVals[i - 1] + 1) { ok = false; break; }
    }
    if (ok) return 'triple_straight';
  }

  // 飞机带翅膀（连续三张 × N + N 张单牌 或 N 对对子）
  {
    const entries = Object.entries(counts).map(([v, c]) => [Number(v), c]);
    const tripleVals = entries.filter(([, c]) => c >= 3).map(([v]) => v).sort((a, b) => a - b);

    if (tripleVals.length >= 2) {
      const validTriples = tripleVals.filter(v => v < 15);
      const seqs = [];
      for (let i = 0; i < validTriples.length; i++) {
        const seq = [validTriples[i]];
        while (i + 1 < validTriples.length && validTriples[i + 1] === validTriples[i] + 1) {
          i++;
          seq.push(validTriples[i]);
        }
        if (seq.length >= 2) seqs.push(seq);
      }

      for (const seq of seqs) {
        const planeCount = seq.length;
        const tripleTotal = planeCount * 3;
        const wingTotal = cards.length - tripleTotal;

        if (wingTotal === planeCount) {
          return 'plane_with_singles';
        }
        if (wingTotal === planeCount * 2) {
          const remaining = { ...counts };
          for (const v of seq) {
            remaining[v] = (remaining[v] || 0) - 3;
            if (remaining[v] === 0) delete remaining[v];
          }
          if (Object.values(remaining).every(c => c === 2)) return 'plane_with_pairs';
        }
      }
    }
  }

  return 'invalid';
}

// 获取牌组的大小（不同牌型取不同关键牌点）
function getCardsValue(cards) {
  if (cards.length === 0) return 0;
  const type = getCardType(cards);
  const counts = countCardValues(cards);

  // 三带一/三带二：只看三张的点数
  if (type === 'triple_with_single' || type === 'triple_with_pair') {
    for (const [v, c] of Object.entries(counts)) {
      if (c === 3) return Number(v);
    }
  }

  // 四带二：只看四张的点数
  if (type === 'four_with_two') {
    for (const [v, c] of Object.entries(counts)) {
      if (c === 4) return Number(v);
    }
  }

  // 飞机带翅膀：取连续三张中最小的点数
  if (type === 'plane_with_singles' || type === 'plane_with_pairs') {
    const tripleVals = Object.entries(counts)
      .filter(([, c]) => c >= 3)
      .map(([v]) => Number(v))
      .filter((v) => v < 15)
      .sort((a, b) => a - b);
    if (tripleVals.length >= 2) return tripleVals[0];
  }

  // 其它：取最大点数（顺子/对子/三张/炸弹等）
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  return sorted[0].value;
}

// 判断牌是否可以出
function canPlay(cards, lastCards) {
  if (!lastCards || lastCards.length === 0) return true;
  
  const currentType = getCardType(cards);
  const lastType = getCardType(lastCards);
  
  if (currentType === 'invalid') return false;
  
  // 火箭可以打任何牌
  if (currentType === 'bomb' && cards.length === 2 && 
      ((cards[0].rank === '大王' && cards[1].rank === '小王') || (cards[0].rank === '小王' && cards[1].rank === '大王'))) {
    return true;
  }
  
  // 炸弹可以打除火箭外的任何牌
  if (currentType === 'bomb' && lastType !== 'bomb') {
    return true;
  }
  
  // 炸弹之间比较大小
  if (currentType === 'bomb' && lastType === 'bomb') {
    return getCardsValue(cards) > getCardsValue(lastCards);
  }
  
  // 类型不同不能打
  if (currentType !== lastType) return false;
  
  // 长度不同不能打
  if (cards.length !== lastCards.length) return false;

  // 比较大小
  return getCardsValue(cards) > getCardsValue(lastCards);
}

// 判断玩家是否有能大过指定牌的牌
function canPlayerBeatCards(playerCards, lastCards) {
  if (!lastCards || lastCards.length === 0) return true;

  const lastType = getCardType(lastCards);
  if (lastType === 'invalid') return true;

  const lastValue = getCardsValue(lastCards);
  const counts = countCardValues(playerCards);

  // 火箭（王炸）可以打任何牌
  const hasRocket = playerCards.some(c => c.rank === '大王') &&
                    playerCards.some(c => c.rank === '小王');
  if (hasRocket) return true;

  // 炸弹判断
  if (lastType === 'bomb') {
    for (const [v, c] of Object.entries(counts)) {
      if (c >= 4 && Number(v) > lastValue) return true;
    }
  } else {
    for (const c of Object.values(counts)) {
      if (c >= 4) return true;
    }
  }

  // 辅助：在 valSet 中查找长度为 len、最小值 > minStart 的连续序列
  function hasConsecutiveRun(valSet, len, minStart) {
    for (let s = minStart; s <= 15 - len; s++) {
      let ok = true;
      for (let i = 0; i < len; i++) {
        if (!valSet.has(s + i)) { ok = false; break; }
      }
      if (ok) return s;
    }
    return -1;
  }

  switch (lastType) {
    case 'single': {
      for (const card of playerCards) {
        if (card.value > lastValue) return true;
      }
      break;
    }

    case 'pair': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 2 && Number(v) > lastValue) return true;
      }
      break;
    }

    case 'triple': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) return true;
      }
      break;
    }

    case 'triple_with_single': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) {
          let others = 0;
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v) others += c2;
          }
          if (others >= 1) return true;
        }
      }
      break;
    }

    case 'triple_with_pair': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 3 && Number(v) > lastValue) {
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v && c2 >= 2) return true;
          }
        }
      }
      break;
    }

    case 'four_with_two': {
      for (const [v, c] of Object.entries(counts)) {
        if (c >= 4 && Number(v) > lastValue) {
          let others = 0;
          for (const [v2, c2] of Object.entries(counts)) {
            if (v2 !== v) others += c2;
          }
          if (others >= 2) return true;
        }
      }
      break;
    }

    case 'straight': {
      const len = lastCards.length;
      const available = new Set(
        Object.keys(counts).map(Number).filter(v => v < 15)
      );
      // lastValue 是顺子最大值，新顺子最大值须 > lastValue，即起始 s > lastValue - len + 1
      if (hasConsecutiveRun(available, len, lastValue - len + 2) >= 0) return true;
      break;
    }

    case 'double_straight': {
      const pairLen = lastCards.length / 2;
      const pairSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 2 && Number(v) < 15)
          .map(([v]) => Number(v))
      );
      if (hasConsecutiveRun(pairSet, pairLen, lastValue - pairLen + 2) >= 0) return true;
      break;
    }

    case 'triple_straight': {
      const triLen = lastCards.length / 3;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < 15)
          .map(([v]) => Number(v))
      );
      if (hasConsecutiveRun(triSet, triLen, lastValue - triLen + 2) >= 0) return true;
      break;
    }

    case 'plane_with_singles': {
      const planeN = lastCards.length / 4;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < 15)
          .map(([v]) => Number(v))
      );
      // lastValue 是飞机最小三张值，新飞机最小值须 > lastValue
      for (let s = lastValue + 1; s <= 15 - planeN; s++) {
        let ok = true;
        for (let i = 0; i < planeN; i++) {
          if (!triSet.has(s + i)) { ok = false; break; }
        }
        if (ok) {
          let wings = 0;
          for (const [v, c] of Object.entries(counts)) {
            const nv = Number(v);
            wings += (nv >= s && nv < s + planeN) ? c - 3 : c;
          }
          if (wings >= planeN) return true;
        }
      }
      break;
    }

    case 'plane_with_pairs': {
      const planeN = lastCards.length / 5;
      const triSet = new Set(
        Object.entries(counts)
          .filter(([v, c]) => c >= 3 && Number(v) < 15)
          .map(([v]) => Number(v))
      );
      for (let s = lastValue + 1; s <= 15 - planeN; s++) {
        let ok = true;
        for (let i = 0; i < planeN; i++) {
          if (!triSet.has(s + i)) { ok = false; break; }
        }
        if (ok) {
          let pairWings = 0;
          for (const [v, c] of Object.entries(counts)) {
            const nv = Number(v);
            const avail = (nv >= s && nv < s + planeN) ? c - 3 : c;
            pairWings += Math.floor(avail / 2);
          }
          if (pairWings >= planeN) return true;
        }
      }
      break;
    }
  }

  return false;
}

// 出牌提示：返回一手“最小压制”可出的牌（客户端仅用于自动选中，不自动出牌）
function getHintCards(playerCards, lastCards, isFreeTurn) {
  const cards = Array.isArray(playerCards) ? playerCards : [];
  if (cards.length === 0) return [];

  const sortCardAsc = (a, b) => {
    if (a.value !== b.value) return a.value - b.value;
    const ar = String(a.rank);
    const br = String(b.rank);
    if (ar !== br) return ar.localeCompare(br);
    return String(a.suit).localeCompare(String(b.suit));
  };

  const byValue = new Map();
  for (const c of cards) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value).push(c);
  }
  for (const arr of byValue.values()) arr.sort(sortCardAsc);

  const pickNOfValue = (v, n) => {
    const arr = byValue.get(v) || [];
    if (arr.length < n) return null;
    return arr.slice(0, n);
  };

  const allSorted = [...cards].sort(sortCardAsc);

  // 轮回到自己/出牌区为空：选手里“最小的合法出牌”
  // 规则1：仅按牌型点数从小到大判定（无视张数）
  // 规则2：同点数下，优先选完整牌型（炸弹>三张>对子>单张），绝不拆牌
  if (isFreeTurn || !lastCards || lastCards.length === 0) {
    /** @type {any[][]} */
    const freeCandidates = [];
    // 最小单牌（一定存在）
    if (allSorted.length) freeCandidates.push([allSorted[0]]);

    // 最小对子/三张/炸弹（若存在）
    const valsAsc = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 2) { freeCandidates.push(arr.slice(0, 2)); break; }
    }
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 3) { freeCandidates.push(arr.slice(0, 3)); break; }
    }
    for (const v of valsAsc) {
      const arr = byValue.get(v) || [];
      if (arr.length >= 4) { freeCandidates.push(arr.slice(0, 4)); break; }
    }

    // 最小顺子（长度 5）/最小连对（长度 3 对）/最小三顺（长度 2 组）
    const uniqueVals = valsAsc.filter(v => v < 15);
    const findSeqStart = (needLen) => {
      const set = new Set(uniqueVals);
      for (let s = 3; s <= 15 - needLen; s++) {
        let ok = true;
        for (let i = 0; i < needLen; i++) {
          if (!set.has(s + i)) { ok = false; break; }
        }
        if (ok) return s;
      }
      return -1;
    };

    const straightStart = findSeqStart(5);
    if (straightStart >= 0) {
      const res = [];
      for (let i = 0; i < 5; i++) res.push(pickNOfValue(straightStart + i, 1)[0]);
      freeCandidates.push(res);
    }

    const pairVals = valsAsc.filter(v => v < 15 && (byValue.get(v)?.length ?? 0) >= 2);
    const pairSet = new Set(pairVals);
    for (let s = 3; s <= 15 - 3; s++) {
      if (pairSet.has(s) && pairSet.has(s + 1) && pairSet.has(s + 2)) {
        const res = [];
        for (let i = 0; i < 3; i++) res.push(...pickNOfValue(s + i, 2));
        freeCandidates.push(res);
        break;
      }
    }

    const triVals = valsAsc.filter(v => v < 15 && (byValue.get(v)?.length ?? 0) >= 3);
    const triSet = new Set(triVals);
    for (let s = 3; s <= 15 - 2; s++) {
      if (triSet.has(s) && triSet.has(s + 1)) {
        const res = [];
        for (let i = 0; i < 2; i++) res.push(...pickNOfValue(s + i, 3));
        freeCandidates.push(res);
        break;
      }
    }

    // ✅ 核心最终修改：排序规则完全符合斗地主习惯
    const valid = freeCandidates
      .map(cs => [...cs].sort(sortCardAsc))
      .filter(cs => cs.length > 0 && getCardType(cs) !== 'invalid');
    if (!valid.length) return [];
    valid.sort((a, b) => {
      const av = getCardsValue(a);
      const bv = getCardsValue(b);
      // 第一优先级：点数从小到大
      if (av !== bv) return av - bv;
      // 第二优先级：同点数下，张数从多到少（炸弹>三张>对子>单张）
      // 这一行彻底解决了“手里有33却选单张3”的问题
      if (a.length !== b.length) return b.length - a.length;
      // 第三优先级：点数和张数都相同，按牌面字典序稳定排序
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const ak = `${a[i].value}|${a[i].rank}|${a[i].suit}`;
        const bk = `${b[i].value}|${b[i].rank}|${b[i].suit}`;
        if (ak !== bk) return ak.localeCompare(bk);
      }
      return 0;
    });
    return valid[0];
  }

  const lastType = getCardType(lastCards);
  if (lastType === 'invalid') {
    return allSorted.length ? [allSorted[0]] : [];
  }
  const lastValue = getCardsValue(lastCards);

  const hasRocket = cards.some(c => c.rank === '大王') && cards.some(c => c.rank === '小王');
  const rocketCards = () => {
    const small = cards.find(c => c.rank === '小王');
    const big = cards.find(c => c.rank === '大王');
    if (small && big) return [small, big].sort(sortCardAsc);
    return null;
  };

  const findMinBomb = (minValueExclusive) => {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v <= minValueExclusive) continue;
      const picked = pickNOfValue(v, 4);
      if (picked) return picked;
    }
    return null;
  };

  const pickSmallestOthers = (excludeValuesSet, needCount) => {
    const res = [];
    for (const c of allSorted) {
      if (excludeValuesSet.has(c.value)) continue;
      res.push(c);
      if (res.length >= needCount) return res;
    }
    return null;
  };

  const pickSmallestPairs = (excludeValuesSet, needPairs) => {
    const res = [];
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (excludeValuesSet.has(v)) continue;
      const arr = byValue.get(v) || [];
      if (arr.length >= 2) {
        res.push(arr[0], arr[1]);
        if (res.length >= needPairs * 2) return res;
      }
    }
    return null;
  };

  const hasConsecutiveRun = (valList, len, startMin) => {
    const set = new Set(valList);
    for (let s = startMin; s <= 15 - len; s++) {
      let ok = true;
      for (let i = 0; i < len; i++) {
        if (!set.has(s + i)) { ok = false; break; }
      }
      if (ok) return s;
    }
    return -1;
  };

  let candidate = null;

  // --- 同类型最小可压（min_power） ---
  if (lastType === 'single') {
    for (const c of allSorted) {
      if (c.value > lastValue) { candidate = [c]; break; }
    }
  } else if (lastType === 'pair') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const picked = pickNOfValue(v, 2);
        if (picked) { candidate = picked; break; }
      }
    }
  } else if (lastType === 'triple') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const picked = pickNOfValue(v, 3);
        if (picked) { candidate = picked; break; }
      }
    }
  } else if (lastType === 'triple_with_single') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const triple = pickNOfValue(v, 3);
        if (!triple) continue;
        const other = pickSmallestOthers(new Set([v]), 1);
        if (other) { candidate = [...triple, ...other]; break; }
      }
    }
  } else if (lastType === 'triple_with_pair') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const triple = pickNOfValue(v, 3);
        if (!triple) continue;
        const pair = pickSmallestPairs(new Set([v]), 1);
        if (pair) { candidate = [...triple, ...pair]; break; }
      }
    }
  } else if (lastType === 'four_with_two') {
    const vals = [...byValue.keys()].sort((a, b) => a - b);
    for (const v of vals) {
      if (v > lastValue) {
        const four = pickNOfValue(v, 4);
        if (!four) continue;
        const other2 = pickSmallestOthers(new Set([v]), 2);
        if (other2) { candidate = [...four, ...other2]; break; }
      }
    }
  } else if (lastType === 'straight') {
    const len = lastCards.length;
    const uniqueVals = [...byValue.keys()].filter(v => v < 15).sort((a, b) => a - b);
    const start = hasConsecutiveRun(uniqueVals, len, lastValue - len + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < len; i++) res.push(pickNOfValue(start + i, 1)[0]);
      candidate = res;
    }
  } else if (lastType === 'double_straight') {
    const pairLen = lastCards.length / 2;
    const pairVals = [...byValue.entries()]
      .filter(([v, arr]) => v < 15 && arr.length >= 2)
      .map(([v]) => v)
      .sort((a, b) => a - b);
    const start = hasConsecutiveRun(pairVals, pairLen, lastValue - pairLen + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < pairLen; i++) res.push(...pickNOfValue(start + i, 2));
      candidate = res;
    }
  } else if (lastType === 'triple_straight') {
    const triLen = lastCards.length / 3;
    const triVals = [...byValue.entries()]
      .filter(([v, arr]) => v < 15 && arr.length >= 3)
      .map(([v]) => v)
      .sort((a, b) => a - b);
    const start = hasConsecutiveRun(triVals, triLen, lastValue - triLen + 2);
    if (start >= 0) {
      const res = [];
      for (let i = 0; i < triLen; i++) res.push(...pickNOfValue(start + i, 3));
      candidate = res;
    }
  } else if (lastType === 'plane_with_singles') {
    const n = lastCards.length / 4;
    const triVals = [...byValue.entries()]
      .filter(([v, arr]) => v < 15 && arr.length >= 3)
      .map(([v]) => v)
      .sort((a, b) => a - b);
    for (let s = lastValue + 1; s <= 15 - n; s++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (!byValue.has(s + i) || byValue.get(s + i).length < 3) { ok = false; break; }
      }
      if (!ok) continue;
      const triples = [];
      for (let i = 0; i < n; i++) triples.push(...pickNOfValue(s + i, 3));
      const exclude = new Set(Array.from({ length: n }, (_, i) => s + i));
      const wings = pickSmallestOthers(exclude, n);
      if (wings) { candidate = [...triples, ...wings]; break; }
    }
  } else if (lastType === 'plane_with_pairs') {
    const n = lastCards.length / 5;
    for (let s = lastValue + 1; s <= 15 - n; s++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (!byValue.has(s + i) || byValue.get(s + i).length < 3) { ok = false; break; }
      }
      if (!ok) continue;
      const triples = [];
      for (let i = 0; i < n; i++) triples.push(...pickNOfValue(s + i, 3));
      const exclude = new Set(Array.from({ length: n }, (_, i) => s + i));
      const wingsPairs = pickSmallestPairs(exclude, n);
      if (wingsPairs) { candidate = [...triples, ...wingsPairs]; break; }
    }
  } else if (lastType === 'bomb') {
    candidate = findMinBomb(lastValue);
  }

  // 校验候选必须能压过（避免构造错误）
  if (candidate && candidate.length && canPlay(candidate, lastCards)) {
    return [...candidate].sort(sortCardAsc);
  }

  // --- 兜底：炸弹/火箭 ---
  if (lastType !== 'bomb') {
    const bomb = findMinBomb(0);
    if (bomb && canPlay(bomb, lastCards)) return [...bomb].sort(sortCardAsc);
  }

  if (hasRocket) {
    const r = rocketCards();
    if (r && canPlay(r, lastCards)) return r;
  }

  return [];
}

// 游戏状态管理
class Game {
  constructor(roomId, players) {
    this.roomId = roomId;
    this.players = players;
    this.status = 'waiting';
    this.currentPlayerIndex = Math.floor(Math.random() * 3); // 随机选择第一个叫牌的玩家
    this.lastCards = [];
    this.lastPlayerId = null;
    this.地主Cards = [];
    this.地主PlayerId = null;
    this.叫牌状态 = {
      currentCallerIndex: this.currentPlayerIndex,
      highestScore: 0,
      highestBidder: null
    };
    this.底分 = 1;
    this.倍数 = 1;
    this.炸弹数量 = 0;
    this.春天 = false;
    this.countdown = 30; // 默认倒计时30秒
    this.countdownTimer = null;
    /** @type {string | null} 重开发牌时沿用 */
    this._cheatTargetName = null;
  }

  start(cheatTargetName) {
    if (cheatTargetName !== undefined) {
      this._cheatTargetName = cheatTargetName && String(cheatTargetName).trim() ? cheatTargetName : null;
    }
    const result = dealCards(this.players, this._cheatTargetName);
    this.players = result.players;
    this.地主Cards = result.地主Cards;
    this.status = 'calling';
  }
  
  call地主(playerId, score) {
    // 检查是否是当前叫牌玩家
    if (playerId !== this.players[this.叫牌状态.currentCallerIndex].id) return false;
    
    // 检查叫牌是否有效
    if (score > 0 && score <= 3 && score > this.叫牌状态.highestScore) {
      this.叫牌状态.highestScore = score;
      this.叫牌状态.highestBidder = playerId;
    }
    
    // 下一个玩家
    this.叫牌状态.currentCallerIndex = (this.叫牌状态.currentCallerIndex + 1) % 3;
    
    // 检查叫牌是否结束
    if (this.叫牌状态.currentCallerIndex === this.currentPlayerIndex || this.叫牌状态.highestScore === 3) {
      if (this.叫牌状态.highestBidder) {
        // 确定地主
        this.地主PlayerId = this.叫牌状态.highestBidder;
        this.底分 = this.叫牌状态.highestScore;
        // 给地主发底牌
        const 地主Player = this.players.find(p => p.id === this.地主PlayerId);
        if (地主Player) {
          地主Player.cards = [...地主Player.cards, ...this.地主Cards];
          地主Player.cards.sort((a, b) => b.value - a.value);
          地主Player.cardCount = 地主Player.cards.length;
        }
        
        // 开始游戏，地主先出牌
        this.currentPlayerIndex = this.players.findIndex(p => p.id === this.地主PlayerId);
        this.status = 'playing';
      } else {
        this.start(undefined);
      }
    }
    
    return true;
  }
  
  playCards(playerId, cards) {
    if (playerId !== this.players[this.currentPlayerIndex].id) return false;
    
    const cardType = getCardType(cards);
    if (cardType === 'invalid') return false;
    // 轮回到自己：不需要压过上一手，但必须是合法牌型
    if (this.lastPlayerId !== playerId && !canPlay(cards, this.lastCards)) return false;
    
    // 从玩家手中移除牌
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      if (cardType === 'bomb') {
        this.炸弹数量++;
        this.倍数 *= 2;
      }
      
      // 移除牌
      for (const card of cards) {
        const index = player.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (index !== -1) {
          player.cards.splice(index, 1);
        }
      }

      
      // 更新牌数
      player.cardCount = player.cards.length;
      
      this.lastCards = cards;
      this.lastPlayerId = playerId;

      // 检查是否获胜
      if (player.cards.length === 0) {
        this.status = 'ended';
      
        // 检查是否春天
        const otherPlayers = this.players.filter(p => p.id !== playerId);
        if (otherPlayers.every(p => p.cards.length === 17)) {
          this.春天 = true;
          this.倍数 *= 2;
        }
        
        return true;
      }
      
      // 下一个玩家
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 3;
      return true;
    }
    
    return false;
  }
  
  // 计算积分
  calculateScores() {
    const scores = {};
    const winnerId = this.players.find(p => p.cards.length === 0).id;
    const is地主Win = winnerId === this.地主PlayerId;
    
    for (const player of this.players) {
      if (player.id === this.地主PlayerId) {
        scores[player.id] = is地主Win ? 2 * this.底分 * this.倍数 : -2 * this.底分 * this.倍数;
      } else {
        scores[player.id] = is地主Win ? -this.底分 * this.倍数 : this.底分 * this.倍数;
      }
    }
    
    return scores;
  }
}

module.exports = {
  generateDeck,
  shuffleDeck,
  dealCards,
  getCardType,
  canPlay,
  canPlayerBeatCards,
  getHintCards,
  getCardsValue,
  Game
};
