# 斗地主前端重构计划 - Vue 3 + TypeScript

## 项目概述
将现有的原生 JavaScript 前端重构为使用 Vue 3 + TypeScript 的现代化前端架构，提升代码可维护性、类型安全性和开发效率。

## 技术栈
- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **CSS 预处理器**: SCSS
- **通信**: Socket.io-client

## 目录结构

```
frontend-vue3/
├── public/                      # 静态资源
├── src/
│   ├── assets/                  # 资源文件
│   │   ├── base.css
│   │   ├── logo.svg
│   │   └── main.css
│   ├── components/              # 公共组件
│   │   ├── Card.vue             # 扑克牌组件 ✅
│   │   ├── CardBack.vue         # 扑克牌背面组件 ✅
│   │   ├── Countdown.vue        # 倒计时组件 ✅
│   │   ├── GameMessage.vue      # 游戏消息提示组件 ✅
│   │   ├── LandlordCards.vue    # 地主牌组件 ✅
│   │   ├── PlayArea.vue         # 出牌区域组件 ✅
│   │   ├── PlayerArea.vue       # 玩家区域组件 ✅
│   │   └── icons/               # 图标组件
│   ├── composables/             # 组合式函数
│   │   ├── useCountdown.ts      # 倒计时逻辑 ✅
│   │   └── useSocket.ts         # Socket 连接管理 ✅
│   ├── router/                  # 路由配置
│   │   └── index.ts             # 路由配置 ✅
│   ├── stores/                  # Pinia 状态管理
│   │   ├── counter.ts           # 示例 store
│   │   ├── gameStore.ts         # 游戏状态 ✅
│   │   ├── playerStore.ts       # 玩家状态 ✅
│   │   └── roomStore.ts         # 房间状态 ✅
│   ├── types/                   # TypeScript 类型定义
│   │   ├── card.ts              # 卡牌类型 ✅
│   │   ├── game.ts              # 游戏类型 ✅
│   │   ├── index.ts             # 类型导出 ✅
│   │   ├── player.ts            # 玩家类型 ✅
│   │   └── socket.ts            # Socket 事件类型 ✅
│   ├── utils/                   # 工具函数
│   │   ├── cardHelper.ts        # 卡牌辅助函数 ✅
│   │   └── gameHelper.ts        # 游戏辅助函数 ✅
│   ├── views/                   # 页面视图
│   │   ├── CallingView.vue      # 叫分页面 ✅
│   │   ├── GameView.vue         # 游戏页面 ✅
│   │   ├── LoginView.vue        # 登录页面 ✅
│   │   └── RoomView.vue         # 房间页面 ✅
│   ├── App.vue                  # 根组件 ✅
│   └── main.ts                  # 入口文件 ✅
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts               # Vite 配置 ✅
└── ...                          # 其他配置文件
```

## 实施进度

### ✅ 第一阶段：项目初始化 - 已完成
- [x] 使用 Vite 创建项目模板
- [x] 配置 TypeScript 严格模式
- [x] 安装必要依赖 (Vue 3, Pinia, Vue Router, Socket.io-client)
- [x] 配置路径别名
- [x] 配置开发服务器代理

### ✅ 第二阶段：类型定义 - 已完成
- [x] 定义 Card 类型（卡牌信息）
- [x] 定义 Player 类型（玩家信息）
- [x] 定义 Room 类型（房间信息）
- [x] 定义 GameState 类型（游戏状态）
- [x] 定义 Socket 事件类型（客户端/服务器事件）

### ✅ 第三阶段：核心功能实现 - 已完成
- [x] 创建 useSocket composable
- [x] 实现连接、断开、重连逻辑
- [x] 事件监听和发送封装
- [x] playerStore: 管理当前玩家信息
- [x] roomStore: 管理房间信息和玩家列表
- [x] gameStore: 管理游戏状态、手牌、出牌等
- [x] 卡牌辅助函数 (cardHelper.ts)
- [x] 游戏辅助函数 (gameHelper.ts)

### ✅ 第四阶段：组件开发 - 已完成
- [x] Card.vue: 扑克牌显示组件
- [x] CardBack.vue: 扑克牌背面组件
- [x] Countdown.vue: 倒计时显示组件
- [x] GameMessage.vue: 游戏消息提示组件
- [x] PlayerArea.vue: 玩家区域组件
- [x] PlayArea.vue: 出牌区域组件
- [x] LandlordCards.vue: 地主牌显示组件

### ✅ 第五阶段：页面开发 - 已完成
- [x] LoginView.vue: 登录页面
- [x] RoomView.vue: 房间页面
- [x] CallingView.vue: 叫分页面
- [x] GameView.vue: 游戏页面

### 🔄 第六阶段：样式迁移和优化 - 进行中
- [x] 全局样式变量
- [x] 登录/房间/叫分页面统一风格
- [x] 游戏页面样式
- [ ] 响应式布局优化
- [ ] 动画效果完善

### ⏳ 第七阶段：测试和优化 - 待开始
- [ ] 登录/加入房间测试
- [ ] 叫分流程测试
- [ ] 出牌流程测试
- [ ] 游戏结束测试
- [ ] 性能优化
- [ ] 代码规范检查

### ⏳ 第八阶段：部署准备 - 待开始
- [ ] 生产环境构建配置
- [ ] 与后端集成测试
- [ ] 打包体积优化

## 关键技术实现

### 1. Composition API 使用
- 使用 `<script setup>` 语法糖
- 合理使用 ref 和 reactive
- 使用 computed 和 watch

### 2. TypeScript 严格类型
- 为所有数据定义接口
- Socket 事件类型化
- 避免使用 any 类型

### 3. Socket.io 集成
- useSocket composable 封装连接逻辑
- 类型化 Socket 事件
- 自动连接和断开管理

### 4. 状态管理
- 按功能拆分 store (player/room/game)
- 使用 getters 和 actions
- 状态持久化和清理

### 5. 路由配置
```typescript
// 主要路由
/          -> LoginView    (登录页面)
/room      -> RoomView     (房间页面)
/calling   -> CallingView  (叫分页面)
/game      -> GameView     (游戏页面)
```

## 下一步行动

### 立即执行：
1. **运行开发服务器** - 测试重构后的前端是否正常工作
2. **功能测试** - 验证所有游戏流程
3. **样式优化** - 完善响应式布局和动画

### 测试清单：
- [ ] 登录/创建房间
- [ ] 玩家加入房间
- [ ] 开始游戏
- [ ] 叫分流程
- [ ] 出牌流程
- [ ] 倒计时功能
- [ ] 游戏结束
- [ ] 返回房间

### 已知待修复问题：
1. 需要验证与后端 API 的兼容性
2. 需要测试所有 Socket 事件
3. 需要完善错误处理

## 运行命令

```bash
# 进入项目目录
cd d:\projects\doudizhu\frontend-vue3

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check
```

## 注意事项

1. **后端兼容性** - 确保与现有后端 API 完全兼容
2. **Socket 事件** - 事件名称和数据格式保持一致
3. **测试覆盖** - 需要完整测试所有游戏流程
