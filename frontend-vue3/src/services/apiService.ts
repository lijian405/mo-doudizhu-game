/**
 * API 服务模块
 * 处理与后端API的所有HTTP请求
 */

const API_BASE_URL = '/api'

// 房间相关API
export const roomApi = {
  // 获取房间列表
  getRooms: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`)
      if (!response.ok) {
        throw new Error('获取房间列表失败')
      }
      return await response.json()
    } catch (error) {
      console.error('获取房间列表失败:', error)
      throw error
    }
  },

  // 创建房间
  createRoom: async (roomId: string, ownerName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomId, ownerName })
      })
      if (!response.ok) {
        throw new Error('创建房间失败')
      }
      return await response.json()
    } catch (error) {
      console.error('创建房间失败:', error)
      throw error
    }
  },

  // 获取房间详情
  getRoom: async (roomId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`)
      if (!response.ok) {
        throw new Error('获取房间详情失败')
      }
      return await response.json()
    } catch (error) {
      console.error('获取房间详情失败:', error)
      throw error
    }
  },

  // 更新房间状态
  updateRoomStatus: async (roomId: string, status: string, playerCount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, playerCount })
      })
      if (!response.ok) {
        throw new Error('更新房间状态失败')
      }
      return await response.json()
    } catch (error) {
      console.error('更新房间状态失败:', error)
      throw error
    }
  },

  // 删除房间
  deleteRoom: async (roomId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        throw new Error('删除房间失败')
      }
      return await response.json()
    } catch (error) {
      console.error('删除房间失败:', error)
      throw error
    }
  }
}

// 导出默认API服务
export default {
  room: roomApi
}
