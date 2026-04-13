## 联机斗地主游戏
开发了一个可联机的斗地主游戏，支持多个玩家同时参与游戏。

## 游戏规则
1 、发牌
一副牌54 张，一人17 张，留3 张做底牌，在确定地主之前玩家不能看底牌。
2 、叫牌
叫牌按出牌的顺序轮流进行，每人只能叫一次。叫牌时可以叫“1 分” ，“2 分” ，“3 分” ，“ 不叫” 。后叫牌者只能叫比前面玩家高的分或者不叫。叫牌结束后所叫分值最大的玩家为地主；如果有玩家叫“3 分” 则立即结束叫牌，该玩家为地主；如果都不叫，则重新发牌，重新叫牌。
3 、第一个叫牌的玩家
第一个叫分玩家每局都由系统随机选取。
4 、出牌
将三张底牌交给地主，并亮出底牌让所有人都能看到。地主首先出牌，然后按逆时针顺序依次出牌，轮到用户跟牌时，用户可以选择“ 不出” 或出比上一个玩家大的牌。某一玩家出完牌时结束本局。
5 、牌型
火箭：即双王（大王和小王），最大的牌。
炸弹：四张同数值牌（如四个7 ）。
单牌：单个牌（如红桃5 ）。
对牌：数值相同的两张牌（如梅花4+ 方块4 ）。
三张牌：数值相同的三张牌（如三个J ）。
三带一：数值相同的三张牌+ 一张单牌或一对牌。例如：333+6 或444+99
单顺：五张或更多的连续单牌（如：45678 或78910JQK ）。包括2点不包括双王。
双顺：三对或更多的连续对牌（如：334455 、JJ ）。包括2点不包括双王。
三顺：二个或更多的连续三张牌（如：333444 、）。包括2点不包括双王。
飞机带翅膀：三顺+同数量的不相同的单牌（或同数量不相同的对牌）。
如：444555+79 或333444555+7799JJ
四带二：四张牌+两手牌。（注意：四带二不是炸弹）。
如：5555 +3 +8 或4444 +55 +77 。
6 、牌型的大小
火箭最大，可以打任意其他的牌。
炸弹比火箭小，比其他牌大。都是炸弹时按牌的分值比大小。
除火箭和炸弹外，其他牌必须要牌型相同且总张数相同才能比大小。
单牌按分值比大小，依次是大王＞ 小王＞2＞A＞K＞Q＞J＞10＞9＞8＞7＞6＞5＞4＞3 ，不分花色。
对牌、三张牌都按分值比大小。
顺牌按最大的一张牌的分值来比大小。
飞机带翅膀和四带二按其中的三顺和四张部分来比，带的牌不影响大小。
7 、胜负判定
任意一家出完牌后结束游戏，若是地主先出完牌则地主胜，否则另外两家胜。
8 、积分
底分：叫牌的分数为1 、2、3分
倍数：初始为1 ，每炸弹*2 、春天*2。（火箭和炸弹留在手上没出的不算）
一局结束后：
地主胜：地主得分为2* 底分* 倍数。其余玩家各得：- 底分* 倍数
地主败：地主得分为-2* 底分* 倍数。其余玩家各得：底分* 倍数
地主所有牌出完，其他两家一张都未出：分数* 2
其他两家中有一家先出完牌，地主只出过一手牌：分数* 2
逃跑扣分：底分* 倍数*3
还没人叫牌时逃跑：扣3 分
积分=底分×倍数×玩家身份系数（农民为1地主为2）

## 游戏流程
 1. 玩家连接服务器，进入游戏房间。
 2. 玩家开始游戏，等待其他玩家玩家。
 3. 玩家出牌，根据游戏规则进行判断。
 4. 游戏结束，显示游戏结果。

 ## 技术实现
 1. 游戏采用客户端-服务器架构，客户端负责游戏界面和交互，服务器负责游戏逻辑和数据存储。
 2. 游戏采用TCP协议进行通信，确保数据的实时性和可靠性。
 3. 游戏采用多线程技术，支持多个玩家同时参与游戏。
 4. 游戏采用数据库技术，存储玩家信息和游戏数据。
 5. 游戏采用游戏引擎技术，实现游戏逻辑和动画效果。
 6. 前端使用HTML5CSS3JavaScript实现游戏界面和交互。
 7. 后端使用NodeJs框架实现游戏逻辑和数据存储。

 ## 游戏界面
 1. 游戏界面采用图形化界面，包括游戏房间、玩家界面、牌组界面等。
 2. 玩家界面包括玩家信息、牌组、出牌按钮等。
 3. 游戏房间界面包括游戏房间列表、创建房间按钮、加入房间按钮等。

## 通讯协议

### 1. 协议概述

本通讯协议基于WebSocket（Socket.IO）实现，使用JSON格式进行数据传输。协议定义了客户端与服务器之间的所有交互事件和数据格式。

### 2. 事件分类

#### 2.1 客户端发送的事件

| 事件名 | 描述 | JSON格式 |
|-------|------|---------|
| `joinRoom` | 加入房间 | `{"roomId": "string", "playerName": "string"}` |
| `leaveRoom` | 离开房间 | `{"roomId": "string"}` |
| `startGame` | 开始游戏 | `{"roomId": "string"}` |
| `callLandlord` | 叫地主 | `{"roomId": "string", "score": number}` |
| `playCards` | 出牌 | `{"roomId": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}` |
| `pass` | 不出牌 | `{"roomId": "string"}` |

#### 2.2 服务器发送的事件

| 事件名 | 描述 | JSON格式 |
|-------|------|---------|
| `roomUpdated` | 房间更新 | `{"room": {"id": "string", "players": [{"id": "string", "name": "string"}], "status": "string"}}` |
| `gameStarted` | 游戏开始 | `{"room": {"id": "string", "players": [{"id": "string", "name": "string"}], "status": "string"}, "players": [{"id": "string", "name": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}], "landlordCards": [{"suit": "string", "rank": "string", "value": number}], "landlordPlayerId": "string", "currentPlayerIndex": number}` |
| `callingUpdated` | 叫地主状态更新 | `{"currentCallerIndex": number, "highestScore": number, "highestBidder": "string", "gameStatus": "string", "players": [{"id": "string", "name": "string"}]}` |
| `cardsPlayed` | 出牌 | `{"playerId": "string", "cards": [{"suit": "string", "rank": "string", "value": number}], "players": [{"id": "string", "name": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}], "currentPlayerIndex": number, "gameStatus": "string", "multiplier": number}` |
| `gameEnded` | 游戏结束 | `{"winnerId": "string", "scores": {"playerId": number}, "baseScore": number, "multiplier": number}` |
| `playCardsFailed` | 出牌失败 | `{"message": "string"}` |

### 3. 数据结构定义

#### 3.1 玩家对象 (Player)

```json
{
  "id": "string",       // 玩家唯一标识
  "name": "string",     // 玩家名称
  "roomId": "string",   // 房间ID（仅客户端使用）
  "cards": [             // 玩家手牌
    {
      "suit": "string",  // 花色（♠♥♦♣）
      "rank": "string",  // 牌面（A,2,3,...,K）
      "value": number     // 牌值（用于比较大小）
    }
  ]
}
```

#### 3.2 房间对象 (Room)

```json
{
  "id": "string",       // 房间ID
  "players": [           // 房间内玩家
    {
      "id": "string",   // 玩家唯一标识
      "name": "string"  // 玩家名称
    }
  ],
  "status": "string"     // 房间状态（waiting, calling, playing）
}
```

#### 3.3 卡牌对象 (Card)

```json
{
  "suit": "string",      // 花色（♠♥♦♣）
  "rank": "string",      // 牌面（A,2,3,...,K）
  "value": number         // 牌值（用于比较大小）
}
```
