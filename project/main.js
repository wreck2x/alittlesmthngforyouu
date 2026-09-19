import './style.css'

const pages = [
  { image: '/images/1.png', label: 'Cover' },
  { image: '/images/2.png', label: 'For you' },
  { image: '/images/3.png', label: 'The little things' },
  { image: '/images/4.png', label: 'Memories' },
  { image: '/images/5.png', label: 'Someday?' },
  { image: '/images/6.png', label: 'Letter introduction' },
]

const totalSteps = 8
const TURN_OUT_MS = 320
const TURN_IN_MS = 390
const LETTER_OPEN_MS = 980
const LETTER_CLOSE_MS = 820

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="scrapbook" aria-label="Interactive birthday card">
    <div class="ambient-paper" aria-hidden="true"></div>
    <section class="experience" aria-live="polite">
      <button class="home-control" type="button" aria-label="Return to cover" title="Return to cover">
        <span aria-hidden="true">↶</span>
      </button>
      <button class="page-button" type="button" aria-label="Open birthday card">
        <span class="page-frame">
          <img class="page-art" src="/images/1.png" alt="Birthday card cover" draggable="false" />
        </span>
      </button>
      <section class="envelope-scene" aria-label="Envelope scene">
        <div class="stationery-stack">
          <button class="letter-peek" type="button" aria-label="Open the letter">
            <img src="/images/letter.png" alt="" draggable="false" />
          </button>
          <img class="envelope-art" src="/images/red_envelope.png" alt="Red envelope" draggable="false" />
        </div>
      </section>
      <section class="letter-reader" aria-label="Open letter" aria-hidden="true">
        <button class="letter-close" type="button" aria-label="Close letter" title="Close letter">↶</button>
        <div class="letter-viewport">
          <div class="letter-zoom-layer">
            <img class="letter-art" src="/images/letter.png" alt="Birthday letter" draggable="false" />
          </div>
        </div>
      </section>
      <button class="touch-zone touch-zone--previous" type="button" aria-label="Previous page"></button>
      <button class="touch-zone touch-zone--next" type="button" aria-label="Next page"></button>
      <div class="page-indicator" aria-hidden="true">
        <span class="indicator-number">1</span><span class="indicator-divider"> / </span>${totalSteps}
      </div>
      <p class="keyboard-hint">Use the arrow keys to turn the pages</p>
    </section>
  </main>
`

const experience = document.querySelector('.experience')
const pageButton = document.querySelector('.page-button')
const pageFrame = document.querySelector('.page-frame')
const pageArt = document.querySelector('.page-art')
const homeControl = document.querySelector('.home-control')
const previousZone = document.querySelector('.touch-zone--previous')
const nextZone = document.querySelector('.touch-zone--next')
const indicator = document.querySelector('.page-indicator')
const indicatorNumber = document.querySelector('.indicator-number')
const keyboardHint = document.querySelector('.keyboard-hint')
const envelopeScene = document.querySelector('.envelope-scene')
const letterPeek = document.querySelector('.letter-peek')
const letterReader = document.querySelector('.letter-reader')
const letterClose = document.querySelector('.letter-close')
const letterViewport = document.querySelector('.letter-viewport')
const letterZoomLayer = document.querySelector('.letter-zoom-layer')

let currentPage = 0
let isTurning = false
let isEnvelopeVisible = false
let isLetterOpen = false
let isLetterAnimating = false
let touchStartX = null
let zoom = 1
let panX = 0
let panY = 0
let dragPointer = null
let pinchStart = null
const pointers = new Map()

function updateIndicator(step) {
  indicatorNumber.textContent = String(step)
}

function updatePage(nextPage) {
  currentPage = nextPage
  pageArt.src = pages[currentPage].image
  pageArt.alt = `Birthday card page: ${pages[currentPage].label}`
  updateIndicator(currentPage + 1)
  pageButton.setAttribute('aria-label', currentPage === 0 ? 'Open birthday card' : `Turn to ${pages[currentPage].label}`)
  experience.classList.toggle('has-started', currentPage > 0 || isEnvelopeVisible)
}

function finishTurn() {
  isTurning = false
  pageFrame.className = 'page-frame'
  indicator.classList.remove('is-hidden')
}

function turnTo(nextPage, direction) {
  if (isTurning || isEnvelopeVisible || isLetterOpen || nextPage < 0 || nextPage >= pages.length || nextPage === currentPage) return

  isTurning = true
  indicator.classList.add('is-hidden')
  pageFrame.classList.add(direction === 'forward' ? 'turn-out-forward' : 'turn-out-back')

  window.setTimeout(() => {
    updatePage(nextPage)
    pageFrame.className = `page-frame turn-in-${direction}`
    window.setTimeout(finishTurn, TURN_IN_MS)
  }, TURN_OUT_MS)
}

function showEnvelopeScene() {
  if (isTurning || isEnvelopeVisible || isLetterOpen || currentPage !== pages.length - 1) return

  isTurning = true
  indicator.classList.add('is-hidden')
  pageFrame.classList.add('turn-out-forward')
  window.setTimeout(() => {
    isEnvelopeVisible = true
    pageButton.classList.add('is-hidden')
    envelopeScene.classList.add('is-visible')
    experience.classList.add('has-started')
    updateIndicator(7)
    pageFrame.className = 'page-frame'
    indicator.classList.remove('is-hidden')
    isTurning = false
  }, TURN_OUT_MS)
}

function startExperience() {
  if (isTurning || isEnvelopeVisible || isLetterOpen) return
  if (currentPage === pages.length - 1) {
    showEnvelopeScene()
    return
  }
  turnTo(currentPage + 1, 'forward')
}

function applyLetterTransform() {
  const layerWidth = letterZoomLayer.offsetWidth
  const layerHeight = letterZoomLayer.offsetHeight
  const contentWidth = layerWidth * zoom
  const contentHeight = layerHeight * zoom
  const maxX = Math.max(0, (contentWidth - letterViewport.clientWidth) / 2 + 16)
  const maxY = Math.max(0, (contentHeight - letterViewport.clientHeight) / 2 + 16)
  panX = Math.max(-maxX, Math.min(maxX, panX))
  panY = Math.max(-maxY, Math.min(maxY, panY))
  letterZoomLayer.style.transform = `translate(-50%, -50%) translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`
}

function resetLetterState() {
  zoom = 1
  panX = 0
  panY = 0
  pointers.clear()
  dragPointer = null
  pinchStart = null
}

function showLetter() {
  if (!isEnvelopeVisible || isLetterOpen || isTurning || isLetterAnimating) return

  isLetterOpen = true
  isLetterAnimating = true
  resetLetterState()
  letterReader.setAttribute('aria-hidden', 'false')
  letterReader.classList.add('is-visible')
  envelopeScene.classList.add('is-hidden')
  letterZoomLayer.classList.remove('is-closing')
  letterZoomLayer.style.transform = ''
  window.requestAnimationFrame(() => {
    letterZoomLayer.classList.add('is-open')
  })
  indicator.classList.add('is-hidden')
  homeControl.classList.add('is-hidden')
  previousZone.classList.add('is-disabled')
  nextZone.classList.add('is-disabled')

  window.setTimeout(() => {
    isLetterAnimating = false
    applyLetterTransform()
  }, LETTER_OPEN_MS)
}

function closeLetter() {
  if (!isLetterOpen || isLetterAnimating) return

  isLetterAnimating = true
  resetLetterState()
  letterZoomLayer.style.transform = ''
  letterZoomLayer.classList.remove('is-open')
  letterZoomLayer.classList.add('is-closing')

  window.setTimeout(() => {
    isLetterOpen = false
    isLetterAnimating = false
    letterReader.classList.remove('is-visible')
    letterReader.setAttribute('aria-hidden', 'true')
    envelopeScene.classList.remove('is-hidden')
    homeControl.classList.remove('is-hidden')
    previousZone.classList.remove('is-disabled')
    nextZone.classList.remove('is-disabled')
    indicator.classList.remove('is-hidden')
    letterZoomLayer.classList.remove('is-closing')
  }, LETTER_CLOSE_MS)
}

function hideEnvelopeScene() {
  isEnvelopeVisible = false
  envelopeScene.classList.remove('is-visible', 'is-hidden')
  pageButton.classList.remove('is-hidden')
  updatePage(currentPage)
}

function returnToCover() {
  if (isLetterOpen) {
    closeLetter()
    return
  }
  if (isEnvelopeVisible) {
    hideEnvelopeScene()
    turnTo(0, 'back')
    return
  }
  if (currentPage > 0) turnTo(0, 'back')
}

function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function midpointBetween(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

function beginPinch() {
  const [first, second] = [...pointers.values()]
  pinchStart = {
    distance: distanceBetween(first, second),
    zoom,
    panX,
    panY,
    midpoint: midpointBetween(first, second),
  }
  dragPointer = null
}

function handleLetterPointerDown(event) {
  if (!isLetterOpen || isLetterAnimating) return
  if (event.target.closest('.letter-close')) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  letterViewport.setPointerCapture(event.pointerId)
  if (pointers.size === 2) {
    beginPinch()
  } else if (pointers.size === 1) {
    dragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
  }
}

function handleLetterPointerMove(event) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size >= 2 && pinchStart) {
    const [first, second] = [...pointers.values()]
    const scaleFactor = distanceBetween(first, second) / pinchStart.distance
    zoom = Math.max(1, Math.min(3.5, pinchStart.zoom * scaleFactor))
    const midpoint = midpointBetween(first, second)
    panX = pinchStart.panX + midpoint.x - pinchStart.midpoint.x
    panY = pinchStart.panY + midpoint.y - pinchStart.midpoint.y
    applyLetterTransform()
    return
  }

  if (dragPointer?.id === event.pointerId) {
    const deltaX = event.clientX - dragPointer.x
    const deltaY = event.clientY - dragPointer.y
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) dragPointer.moved = true
    panX += deltaX
    panY += deltaY
    dragPointer.x = event.clientX
    dragPointer.y = event.clientY
    applyLetterTransform()
  }
}

function handleLetterPointerUp(event) {
  pointers.delete(event.pointerId)
  if (letterViewport.hasPointerCapture(event.pointerId)) letterViewport.releasePointerCapture(event.pointerId)
  if (pointers.size < 2) pinchStart = null
  if (pointers.size === 1) {
    const [remaining] = [...pointers.entries()]
    dragPointer = { id: remaining[0], ...remaining[1], moved: true }
  } else if (pointers.size === 0) {
    dragPointer = null
  }
}

function handleWheel(event) {
  if (!isLetterOpen || isLetterAnimating) return
  event.preventDefault()
  const delta = -event.deltaY * 0.0016
  zoom = Math.max(1, Math.min(3.5, zoom + delta * Math.max(1, zoom)))
  applyLetterTransform()
}

pageButton.addEventListener('click', startExperience)
nextZone.addEventListener('click', () => turnTo(currentPage + 1, 'forward'))
previousZone.addEventListener('click', () => turnTo(currentPage - 1, 'back'))
homeControl.addEventListener('click', returnToCover)
letterPeek.addEventListener('click', showLetter)
letterClose.addEventListener('click', closeLetter)

pageButton.addEventListener('pointerdown', () => pageButton.classList.add('is-pressed'))
pageButton.addEventListener('pointerup', () => pageButton.classList.remove('is-pressed'))
pageButton.addEventListener('pointercancel', () => pageButton.classList.remove('is-pressed'))
letterViewport.addEventListener('pointerdown', handleLetterPointerDown)
letterViewport.addEventListener('pointermove', handleLetterPointerMove)
letterViewport.addEventListener('pointerup', handleLetterPointerUp)
letterViewport.addEventListener('pointercancel', handleLetterPointerUp)
letterViewport.addEventListener('wheel', handleWheel, { passive: false })
window.addEventListener('resize', () => { if (isLetterOpen) applyLetterTransform() })

experience.addEventListener('touchstart', (event) => {
  if (isEnvelopeVisible || isLetterOpen) return
  touchStartX = event.changedTouches[0].clientX
}, { passive: true })

experience.addEventListener('touchend', (event) => {
  if (isEnvelopeVisible || isLetterOpen || touchStartX === null || currentPage === 0) {
    touchStartX = null
    return
  }

  const distance = event.changedTouches[0].clientX - touchStartX
  touchStartX = null
  if (Math.abs(distance) < 42) return
  turnTo(currentPage + (distance < 0 ? 1 : -1), distance < 0 ? 'forward' : 'back')
}, { passive: true })

document.addEventListener('keydown', (event) => {
  if (isLetterOpen) {
    if (event.key === 'Escape') closeLetter()
    return
  }
  if (event.key === 'ArrowRight') isEnvelopeVisible ? showLetter() : turnTo(currentPage + 1, 'forward')
  if (event.key === 'ArrowLeft') isEnvelopeVisible ? returnToCover() : turnTo(currentPage - 1, 'back')
  if (event.key === 'Escape') returnToCover()
})

window.addEventListener('load', () => {
  keyboardHint.classList.add('is-ready')
})
