const ALPHA = 0.995

// Inline the worklet as a blob to avoid file:// URL issues in Electron
const workletCode = `
class BrownNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._zi_left = 0
    this._zi_right = 0
    this._amplitude = 0.3
    this._stereo = false
    this._alpha = ${ALPHA}
    this._expectedStd = 1.0 / Math.sqrt(1.0 - ${ALPHA} * ${ALPHA})

    this.port.onmessage = (e) => {
      if (e.data.amplitude !== undefined) this._amplitude = e.data.amplitude
      if (e.data.stereo !== undefined) this._stereo = e.data.stereo
    }
  }

  gaussian() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  process(inputs, outputs) {
    const left = outputs[0][0]
    const right = outputs[0][1]
    const amp = this._amplitude

    for (let i = 0; i < left.length; i++) {
      this._zi_left = this.gaussian() + this._alpha * this._zi_left
      left[i] = this._zi_left / this._expectedStd * amp
    }

    if (right) {
      if (this._stereo) {
        for (let i = 0; i < right.length; i++) {
          this._zi_right = this.gaussian() + this._alpha * this._zi_right
          right[i] = this._zi_right / this._expectedStd * amp
        }
      } else {
        right.set(left)
      }
    }

    return true
  }
}
registerProcessor('brown-noise-processor', BrownNoiseProcessor)
`

let audioCtx = null
let node = null
let playing = false

const playBtn = document.getElementById('play-btn')
const modeBtn = document.getElementById('mode-btn')
const volumeInput = document.getElementById('volume')
const volumeValue = document.getElementById('volume-value')

let stereoEnabled = false

function clampVolume(v) {
  return Math.max(1, Math.min(99, v))
}

function getVolumeValue() {
  const parsed = Number.parseInt(volumeInput.value, 10)
  return clampVolume(Number.isFinite(parsed) ? parsed : 30)
}

function setVolumeValue(v) {
  volumeInput.value = String(clampVolume(v))
  volumeValue.textContent = volumeInput.value
}

function changeVolume(delta) {
  setVolumeValue(getVolumeValue() + delta)
  sendSettings()
}

function renderModeButton() {
  modeBtn.textContent = stereoEnabled ? 'stereo' : 'mono'
  modeBtn.classList.toggle('active', stereoEnabled)
  modeBtn.setAttribute('aria-pressed', String(stereoEnabled))
}

function renderPlayButton() {
  playBtn.textContent = playing ? 'on' : 'off'
  playBtn.classList.toggle('active', playing)
  playBtn.setAttribute('aria-pressed', String(playing))
}

async function start() {
  audioCtx = new AudioContext({ sampleRate: 44100 })

  const blob = new Blob([workletCode], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  await audioCtx.audioWorklet.addModule(url)
  URL.revokeObjectURL(url)

  node = new AudioWorkletNode(audioCtx, 'brown-noise-processor', {
    outputChannelCount: [2]
  })
  node.connect(audioCtx.destination)
  sendSettings()
}

function stop() {
  if (node) { node.disconnect(); node = null }
  if (audioCtx) { audioCtx.close(); audioCtx = null }
}

function sendSettings() {
  if (!node) return
  node.port.postMessage({
    amplitude: getVolumeValue() / 100,
    stereo: stereoEnabled
  })
}

playBtn.addEventListener('click', async () => {
  if (playing) {
    stop()
    playing = false
    renderPlayButton()
    return
  }

  await start()
  playing = true
  renderPlayButton()
})

volumeInput.addEventListener('input', () => {
  setVolumeValue(getVolumeValue())
  sendSettings()
})

volumeInput.addEventListener('blur', () => {
  setVolumeValue(getVolumeValue())
  sendSettings()
})

volumeInput.addEventListener('wheel', (event) => {
  event.preventDefault()
  changeVolume(event.deltaY < 0 ? 1 : -1)
}, { passive: false })

modeBtn.addEventListener('click', () => {
  stereoEnabled = !stereoEnabled
  renderModeButton()
  sendSettings()
})

setVolumeValue(getVolumeValue())
renderModeButton()
renderPlayButton()
