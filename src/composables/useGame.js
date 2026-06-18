import { ref, computed, onMounted, onUnmounted } from 'vue'

const SURVIVOR_NAMES = ['阿雪', '老林', '小红', '大刚', '小梅', '阿强', '小雪', '大山', '小燕', '老王']
const SURVIVOR_ROLES = {
  gatherer: { name: '采集', icon: '🧺', description: '每天自动收集木头和食物' },
  guard: { name: '守夜', icon: '🛡️', description: '夜间降低热量消耗，抵御危险' },
  caretaker: { name: '照料', icon: '💊', description: '提升全员体温恢复，节省食物' }
}

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])
  const survivors = ref([])
  const rescueCooldown = ref(0)

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15
  const FOOD_CONSUMPTION_PER_SURVIVOR = 1
  const RESCUE_COST_TEMP = 12
  const RESCUE_COST_FOOD = 2
  const RESCUE_COOLDOWN_DAYS = 2

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15)
  
  const survivorCount = computed(() => survivors.value.length)
  const gathererCount = computed(() => survivors.value.filter(s => s.role === 'gatherer').length)
  const guardCount = computed(() => survivors.value.filter(s => s.role === 'guard').length)
  const caretakerCount = computed(() => survivors.value.filter(s => s.role === 'caretaker').length)
  
  const canRescue = computed(() => {
    return !gameOver.value && isDay.value && rescueCooldown.value <= 0 && food.value >= RESCUE_COST_FOOD
  })
  
  const dailyFoodConsumption = computed(() => {
    const base = survivorCount.value
    const caretakerBonus = caretakerCount.value * 0.3
    return Math.max(0, Math.ceil(base * (1 - caretakerBonus)))
  })
  
  const heatConsumptionMultiplier = computed(() => {
    const base = 1 + survivorCount.value * 0.15
    const guardBonus = guardCount.value * 0.1
    return Math.max(0.3, base - guardBonus)
  })
  
  const temperatureRecoveryBonus = computed(() => {
    return caretakerCount.value * 0.5
  })

  function generateRandomSurvivor() {
    const usedNames = survivors.value.map(s => s.name)
    const availableNames = SURVIVOR_NAMES.filter(n => !usedNames.includes(n))
    const name = availableNames.length > 0 
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : `幸存者${survivors.value.length + 1}`
    
    const health = Math.floor(Math.random() * 30) + 50
    
    return {
      id: Date.now() + Math.random(),
      name,
      health,
      role: 'idle',
      rescuedAt: dayCount.value
    }
  }

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 30) {
      actionLog.value.pop()
    }
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
    if (food.value < 0) {
      food.value = 0
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const blizzardMultiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * blizzardMultiplier * heatConsumptionMultiplier.value
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        const recovery = 1 + temperatureRecoveryBonus.value
        temperature.value = Math.min(80, temperature.value + recovery)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function applySurvivorGathering() {
    if (gathererCount.value <= 0) return
    
    const woodGathered = gathererCount.value * (Math.floor(Math.random() * 2) + 1)
    const foodGathered = gathererCount.value * (Math.floor(Math.random() * 2) + 1)
    
    wood.value += woodGathered
    food.value += foodGathered
    
    addLog(`🧺 采集者带回了 ${woodGathered} 木头和 ${foodGathered} 食物`, 'success')
  }

  function applySurvivorGuardNight() {
    if (guardCount.value <= 0) return
    
    if (Math.random() < 0.3 + guardCount.value * 0.1) {
      const events = [
        { msg: '🛡️ 守夜者发现了一只受伤的狐狸，获得 1 兽皮', effect: () => { hide.value += 1 } },
        { msg: '🛡️ 守夜者巡逻时捡到了一些散落的木材', effect: () => { wood.value += 2 } },
        { msg: '🛡️ 守夜者成功驱赶了野狼，营地安然无恙', effect: () => {} }
      ]
      const event = events[Math.floor(Math.random() * events.length)]
      event.effect()
      addLog(event.msg, 'success')
    }
    
    if (isBlizzard.value && Math.random() < guardCount.value * 0.25) {
      addLog('🛡️ 守夜者加固了营地，暴风雪的影响有所减轻', 'success')
    }
  }

  function applySurvivorCaretaking() {
    if (caretakerCount.value <= 0) return
    
    const tempBoost = caretakerCount.value * 3
    temperature.value = Math.min(100, temperature.value + tempBoost)
    addLog(`💊 照料者让大家恢复了 ${tempBoost} 点体温`, 'success')
    
    const sickSurvivors = survivors.value.filter(s => s.health < 70 && s.role === 'caretaker' === false)
    sickSurvivors.forEach(s => {
      s.health = Math.min(100, s.health + 5)
    })
  }

  function consumeDailyFood() {
    if (dailyFoodConsumption.value <= 0) return
    
    if (food.value >= dailyFoodConsumption.value) {
      food.value -= dailyFoodConsumption.value
      if (dailyFoodConsumption.value > 0) {
        addLog(`🍖 今天消耗了 ${dailyFoodConsumption.value} 份食物`, 'info')
      }
    } else {
      const deficit = dailyFoodConsumption.value - food.value
      food.value = 0
      temperature.value = Math.max(0, temperature.value - deficit * 5)
      addLog(`⚠️ 食物不足！缺少 ${deficit} 份食物，全员体温下降`, 'warning')
    }
  }

  function triggerSurvivorDailyEvent() {
    if (survivorCount.value === 0) return
    
    const eventChance = 0.2
    
    if (Math.random() > eventChance) return
    
    const events = [
      {
        msg: (name) => `${name} 在营地周围发现了一些浆果，获得 2 食物`,
        effect: () => { food.value += 2 },
        type: 'success'
      },
      {
        msg: (name) => `${name} 讲述了一个有趣的故事，大家士气高涨`,
        effect: () => { temperature.value = Math.min(100, temperature.value + 3) },
        type: 'success'
      },
      {
        msg: (name) => `${name} 在雪地里发现了被遗弃的工具！获得 1 工具`,
        effect: () => { tools.value += 1 },
        type: 'success'
      },
      {
        msg: (name) => `${name} 不小心扭伤了脚，需要休息`,
        effect: () => {
          const survivor = survivors.value[Math.floor(Math.random() * survivors.value.length)]
          if (survivor) survivor.health = Math.max(30, survivor.health - 15)
        },
        type: 'warning'
      }
    ]
    
    const event = events[Math.floor(Math.random() * events.length)]
    const randomSurvivor = survivors.value[Math.floor(Math.random() * survivors.value.length)]
    
    if (randomSurvivor) {
      event.effect()
      addLog(event.msg(randomSurvivor.name), event.type)
    }
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)
    
    applySurvivorGuardNight()
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    
    if (rescueCooldown.value > 0) {
      rescueCooldown.value--
    }
    
    consumeDailyFood()
    applySurvivorGathering()
    applySurvivorCaretaking()
    triggerSurvivorDailyEvent()
    
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function rescueSurvivor() {
    if (gameOver.value || isNight.value) return
    if (rescueCooldown.value > 0) {
      addLog(`救援冷却中，还需等待 ${rescueCooldown.value} 天`, 'warning')
      return
    }
    if (food.value < RESCUE_COST_FOOD) {
      addLog(`食物不足！救援需要 ${RESCUE_COST_FOOD} 份食物`, 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = RESCUE_COST_TEMP * multiplier
    
    if (temperature.value <= tempCost + 10) {
      addLog('体温太低，无法外出救援！', 'warning')
      return
    }
    
    food.value -= RESCUE_COST_FOOD
    temperature.value = Math.max(0, temperature.value - tempCost)
    rescueCooldown.value = RESCUE_COOLDOWN_DAYS
    
    const successRate = 0.5 + tools.value * 0.1
    
    if (Math.random() < successRate) {
      const newSurvivor = generateRandomSurvivor()
      survivors.value.push(newSurvivor)
      addLog(`🎉 救援成功！${newSurvivor.name} 加入了你的团队（健康度: ${newSurvivor.health}）`, 'success')
    } else {
      addLog('😢 救援失败，没有找到其他幸存者', 'warning')
    }
    
    checkGameOver()
  }

  function assignRole(survivorId, role) {
    const survivor = survivors.value.find(s => s.id === survivorId)
    if (!survivor) return
    
    if (role !== 'idle' && !SURVIVOR_ROLES[role]) return
    
    const oldRole = survivor.role
    survivor.role = role
    
    if (role === 'idle') {
      addLog(`${survivor.name} 现在处于空闲状态`, 'info')
    } else {
      addLog(`${survivor.name} 被分配为${SURVIVOR_ROLES[role].name}职责`, 'info')
    }
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained
    
    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }
    
    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)
    
    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1
    const tempGained = Math.floor(Math.random() * 10) + 5
    temperature.value = Math.min(100, temperature.value + tempGained)
    
    addLog(`进食：体温恢复 ${tempGained}`, 'success')
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      survivors: survivors.value,
      rescueCooldown: rescueCooldown.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      survivors.value = gameState.survivors || []
      rescueCooldown.value = gameState.rescueCooldown || 0
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    survivors.value = []
    rescueCooldown.value = 0
    
    stopTimers()
    startTimers()
    
    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
    addLog('提示：尝试救援幸存者，他们能帮你采集、守夜和照料！', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    survivors,
    survivorCount,
    gathererCount,
    guardCount,
    caretakerCount,
    canRescue,
    rescueCooldown,
    dailyFoodConsumption,
    SURVIVOR_ROLES,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    rescueSurvivor,
    assignRole,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame
  }
}
