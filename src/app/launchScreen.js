export function showLaunchScreen() {
  const screen = document.createElement('div')
  screen.className = 'launch-screen'
  screen.setAttribute('role', 'status')
  screen.setAttribute('aria-label', '情侣飞行棋正在启动')
  screen.innerHTML = `
    <div class="launch-screen__spark launch-screen__spark--one" aria-hidden="true"></div>
    <div class="launch-screen__spark launch-screen__spark--two" aria-hidden="true"></div>
    <div class="launch-screen__content">
      <div class="launch-mark" aria-hidden="true">
        <span class="launch-mark__tile launch-mark__tile--one"></span>
        <span class="launch-mark__tile launch-mark__tile--two"></span>
        <span class="launch-mark__tile launch-mark__tile--three"></span>
        <span class="launch-mark__tile launch-mark__tile--four"></span>
        <span class="launch-mark__heart">${'&#9829;'}</span>
      </div>
      <p class="launch-screen__eyebrow">JUST FOR TWO</p>
      <h1>情侣飞行棋</h1>
      <p class="launch-screen__subtitle">掷出心动的下一步</p>
      <div class="launch-screen__loading" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>
  `
  document.body.append(screen)
  requestAnimationFrame(() => screen.classList.add('launch-screen--visible'))

  window.setTimeout(() => {
    screen.classList.add('launch-screen--leaving')
    window.setTimeout(() => screen.remove(), 260)
  }, 1100)
}
