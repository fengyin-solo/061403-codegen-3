<template>
  <div class="survivor-panel">
    <h3 class="panel-title">
      <span>👥 幸存者团队</span>
      <span class="survivor-count">{{ survivorCount }} 人</span>
    </h3>

    <div v-if="survivorCount > 0" class="role-stats">
      <div class="stat-item">
        <span class="stat-icon">🧺</span>
        <span class="stat-label">采集</span>
        <span class="stat-value">{{ gathererCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🛡️</span>
        <span class="stat-label">守夜</span>
        <span class="stat-value">{{ guardCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">💊</span>
        <span class="stat-label">照料</span>
        <span class="stat-value">{{ caretakerCount }}</span>
      </div>
    </div>

    <div v-if="survivorCount === 0" class="empty-survivors">
      <div class="empty-icon">🏕️</div>
      <p>暂无幸存者</p>
      <p class="empty-hint">尝试救援来壮大你的团队！</p>
    </div>

    <div v-else class="survivor-list">
      <div 
        v-for="survivor in survivors" 
        :key="survivor.id" 
        class="survivor-card"
      >
        <div class="survivor-header">
          <span class="survivor-name">{{ survivor.name }}</span>
          <span 
            class="survivor-role-badge"
            :class="getRoleBadgeClass(survivor.role)"
          >
            {{ getRoleDisplay(survivor.role).icon }} {{ getRoleDisplay(survivor.role).name }}
          </span>
        </div>

        <div class="survivor-health">
          <span class="health-label">❤️ 健康度</span>
          <div class="health-bar-container">
            <div 
              class="health-bar" 
              :style="{ width: survivor.health + '%', background: getHealthColor(survivor.health) }"
            ></div>
          </div>
          <span class="health-value">{{ survivor.health }}%</span>
        </div>

        <div class="survivor-meta">
          <span>加入于第 {{ survivor.rescuedAt }} 天</span>
        </div>

        <div class="role-selector">
          <span class="selector-label">分配职责：</span>
          <div class="role-buttons">
            <button 
              class="role-btn"
              :class="{ active: survivor.role === 'idle' }"
              @click="$emit('assignRole', survivor.id, 'idle')"
            >
              😴 空闲
            </button>
            <button 
              class="role-btn gatherer-btn"
              :class="{ active: survivor.role === 'gatherer' }"
              @click="$emit('assignRole', survivor.id, 'gatherer')"
              :title="roles.gatherer.description"
            >
              🧺 采集
            </button>
            <button 
              class="role-btn guard-btn"
              :class="{ active: survivor.role === 'guard' }"
              @click="$emit('assignRole', survivor.id, 'guard')"
              :title="roles.guard.description"
            >
              🛡️ 守夜
            </button>
            <button 
              class="role-btn caretaker-btn"
              :class="{ active: survivor.role === 'caretaker' }"
              @click="$emit('assignRole', survivor.id, 'caretaker')"
              :title="roles.caretaker.description"
            >
              💊 照料
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="survivorCount > 0" class="survivor-tips">
      <div class="tip">
        <span class="tip-icon">💡</span>
        <span>采集者每天自动获取资源，守夜者减少夜间消耗，照料者恢复体温并节省食物</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  survivors: {
    type: Array,
    default: () => []
  },
  survivorCount: {
    type: Number,
    default: 0
  },
  gathererCount: {
    type: Number,
    default: 0
  },
  guardCount: {
    type: Number,
    default: 0
  },
  caretakerCount: {
    type: Number,
    default: 0
  },
  roles: {
    type: Object,
    default: () => ({})
  }
})

defineEmits(['assignRole'])

function getRoleDisplay(role) {
  const roleMap = {
    idle: { name: '空闲', icon: '😴' },
    gatherer: { name: '采集', icon: '🧺' },
    guard: { name: '守夜', icon: '🛡️' },
    caretaker: { name: '照料', icon: '💊' }
  }
  return roleMap[role] || roleMap.idle
}

function getRoleBadgeClass(role) {
  return {
    'role-idle': role === 'idle',
    'role-gatherer': role === 'gatherer',
    'role-guard': role === 'guard',
    'role-caretaker': role === 'caretaker'
  }
}

function getHealthColor(health) {
  if (health >= 70) return 'linear-gradient(to right, #2ecc71, #27ae60)'
  if (health >= 40) return 'linear-gradient(to right, #f39c12, #e67e22)'
  return 'linear-gradient(to right, #e74c3c, #c0392b)'
}
</script>

<style scoped>
.survivor-panel {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
}

.survivor-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 14px;
}

.role-stats {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: white;
  font-size: 13px;
}

.stat-icon {
  font-size: 16px;
}

.stat-value {
  font-weight: bold;
  color: #ffd700;
}

.empty-survivors {
  text-align: center;
  padding: 30px 15px;
  color: rgba(255, 255, 255, 0.7);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.empty-survivors p {
  margin: 5px 0;
}

.empty-hint {
  font-size: 12px;
  opacity: 0.7;
}

.survivor-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.survivor-list::-webkit-scrollbar {
  width: 6px;
}

.survivor-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.survivor-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.survivor-card {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s;
}

.survivor-card:hover {
  transform: translateX(3px);
  background: rgba(0, 0, 0, 0.35);
}

.survivor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.survivor-name {
  color: white;
  font-weight: bold;
  font-size: 15px;
}

.survivor-role-badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.survivor-role-badge.role-idle {
  background: rgba(150, 150, 150, 0.4);
  color: #ccc;
}

.survivor-role-badge.role-gatherer {
  background: rgba(46, 204, 113, 0.3);
  color: #abebc6;
}

.survivor-role-badge.role-guard {
  background: rgba(52, 152, 219, 0.3);
  color: #aed6f1;
}

.survivor-role-badge.role-caretaker {
  background: rgba(155, 89, 182, 0.3);
  color: #d2b4de;
}

.survivor-health {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.health-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  white-space: nowrap;
}

.health-bar-container {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
}

.health-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.health-value {
  color: white;
  font-size: 11px;
  font-weight: bold;
  min-width: 35px;
  text-align: right;
}

.survivor-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin-bottom: 10px;
}

.role-selector {
  margin-top: 10px;
}

.selector-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
  display: block;
  margin-bottom: 6px;
}

.role-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.role-btn {
  padding: 6px 4px;
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.role-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.role-btn.active {
  color: white;
  font-weight: bold;
  border-color: rgba(255, 255, 255, 0.5);
}

.role-btn.gatherer-btn.active {
  background: rgba(46, 204, 113, 0.4);
  border-color: #2ecc71;
}

.role-btn.guard-btn.active {
  background: rgba(52, 152, 219, 0.4);
  border-color: #3498db;
}

.role-btn.caretaker-btn.active {
  background: rgba(155, 89, 182, 0.4);
  border-color: #9b59b6;
}

.survivor-tips {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  line-height: 1.5;
}

.tip-icon {
  font-size: 14px;
}
</style>
