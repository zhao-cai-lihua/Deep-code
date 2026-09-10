function runSnapshotFrom(value) {
  return value?.taskRunSnapshot || value?.agent?.taskRunSnapshot || null
}

function terminalFrom(value, expectedTurnId) {
  const snapshot = runSnapshotFrom(value)
  if (!snapshot?.terminal || !expectedTurnId) return null
  return String(snapshot.turn?.id || '') === String(expectedTurnId) ? snapshot.terminal : null
}

async function stopAndDeleteTask({ expectedTurnId, cancel, readSnapshot, remove, timeoutMs = 10000, pollMs = 250, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  await cancel()
  const deadline = now() + timeoutMs
  do {
    const snapshot = await readSnapshot()
    if (terminalFrom(snapshot, expectedTurnId)) {
      await remove()
      return { deleted: true, terminal: terminalFrom(snapshot, expectedTurnId) }
    }
    if (now() >= deadline) break
    await wait(Math.min(pollMs, Math.max(0, deadline - now())))
  } while (now() <= deadline)
  return { deleted: false, reason: 'stop-unconfirmed' }
}

module.exports = { stopAndDeleteTask, terminalFrom }
