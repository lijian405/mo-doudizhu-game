# 斗地主游戏通讯协议规划

## 1. 协议概述

本通讯协议基于WebSocket（Socket.IO）实现，使用JSON格式进行数据传输。协议定义了客户端与服务器之间的所有交互事件和数据格式。

## 2. 事件分类

### 2.1 客户端发送的事件

| 事件名            | 描述   | JSON格式                                                                                   |
| -------------- | ---- | ---------------------------------------------------------------------------------------- |
| `joinRoom`     | 加入房间 | `{"roomId": "string", "playerName": "string"}`                                           |
| `leaveRoom`    | 离开房间 | `{"roomId": "string"}`                                                                   |
| `startGame`    | 开始游戏 | `{"roomId": "string"}`                                                                   |
| `callLandlord` | 叫地主  | `{"roomId": "string", "score": number}`                                                  |
| `playCards`    | 出牌   | `{"roomId": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}` |
| `pass`         | 不出牌  | `{"roomId": "string"}`                                                                   |

### 2.2 服务器发送的事件

| 事件名               | 描述      | JSON格式                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roomUpdated`     | 房间更新    | `{"room": {"id": "string", "players": [{"id": "string", "name": "string"}], "status": "string"}}`                                                                                                                                                                                                                                                          |
| `gameStarted`     | 游戏开始    | `{"room": {"id": "string", "players": [{"id": "string", "name": "string"}], "status": "string"}, "players": [{"id": "string", "name": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}], "landlordCards": [{"suit": "string", "rank": "string", "value": number}], "landlordPlayerId": "string", "currentPlayerIndex": number}` |
| `callingUpdated`  | 叫地主状态更新 | `{"currentCallerIndex": number, "highestScore": number, "highestBidder": "string", "gameStatus": "string", "players": [{"id": "string", "name": "string"}]}`                                                                                                                                                                                               |
| `cardsPlayed`     | 出牌      | `{"playerId": "string", "cards": [{"suit": "string", "rank": "string", "value": number}], "players": [{"id": "string", "name": "string", "cards": [{"suit": "string", "rank": "string", "value": number}]}], "currentPlayerIndex": number, "gameStatus": "string", "multiplier": number}`                                                                  |
| `gameEnded`       | 游戏结束    | `{"winnerId": "string", "scores": {"playerId": number}, "baseScore": number, "multiplier": number}`                                                                                                                                                                                                                                                        |
| `playCardsFailed` | 出牌失败    | `{"message": "string"}`                                                                                                                                                                                                                                                                                                                                    |

## 3. 数据结构定义

### 3.1 玩家对象 (Player)

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

### 3.2 房间对象 (Room)

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

### 3.3 卡牌对象 (Card)

```json
{
  "suit": "string",      // 花色（♠♥♦♣）
  "rank": "string",      // 牌面（A,2,3,...,K）
  "value": number         // 牌值（用于比较大小）
}
```

## 4. 协议实现步骤

### 4.1 服务器端修改

1. 修改 `backend/server/index.js` 文件：

   * 更新事件处理函数，使用新的JSON格式

   * 确保所有发送的事件都使用新的JSON格式

2. 修改 `backend/game/gameLogic.js` 文件：

   * 确保游戏逻辑中的数据结构与新协议一致

### 4.2 客户端修改

1. 修改 `frontend/js/main.js` 文件：

   * 更新事件发送函数，使用新的JSON格式

   * 更新事件处理函数，处理新的JSON格式

### 4.3 测试

1. 启动服务器
2. 打开多个客户端连接
3. 测试所有功能：加入房间、离开房间、开始游戏、叫地主、出牌、不出牌、游戏结束
4. 确保所有功能正常工作，数据格式正确

## 5. 注意事项

1. 确保所有事件的JSON格式一致
2. 确保服务器和客户端使用相同的事件名称和数据结构
3. 处理可能的错误情况，确保协议的健壮性
4. 考虑添加版本控制，以便未来协议升级

## 6. 优势

1. 统一的JSON格式，便于理解和维护
2. 清晰的数据结构定义，减少歧义
3. 更好的扩展性，便于添加新功能
   4

