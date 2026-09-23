export const demoStyles = `
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  * { box-sizing: border-box; }
  html, body, #app { width: 100%; height: 100%; margin: 0; }
  body { overflow: hidden; background: #f4f5f8; color: #252938; }
  button, input { font: inherit; letter-spacing: 0; }
  button { cursor: pointer; }

  .demo-shell { display: grid; grid-template-columns: 330px minmax(0, 1fr); width: 100vw; height: 100vh; }
  .controls { z-index: 2; overflow: auto; border-right: 1px solid #dfe2e8; background: #fff; }
  .package-header { display: grid; grid-template-columns: 38px 1fr 42px; align-items: center; gap: 11px; min-height: 72px; padding: 14px 18px; border-bottom: 1px solid #e7e9ee; }
  .package-header strong, .package-header small { display: block; }
  .package-header strong { font-size: 15px; }
  .package-header small { margin-top: 3px; color: #747b8b; font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .package-mark { display: grid; place-items: center; width: 38px; height: 38px; }
  .package-mark img { display: block; width: 38px; height: 38px; }

  .switch { width: 40px; height: 24px; padding: 0; border: 0; border-radius: 12px; background: #c9ced8; }
  .switch i { display: block; width: 18px; height: 18px; margin: 3px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px #1f243340; transition: transform .15s ease; }
  .switch.on { background: #2c9b72; }
  .switch.on i { transform: translateX(16px); }

  .control-section { padding: 18px; border-bottom: 1px solid #e7e9ee; }
  .control-section h2 { margin: 0 0 13px; font-size: 12px; font-weight: 750; color: #656d7d; }
  .section-title { display: flex; align-items: center; justify-content: space-between; min-height: 25px; margin-bottom: 12px; }
  .section-title h2 { margin: 0; }
  .section-title > button { border: 1px solid #d9dce4; border-radius: 5px; background: #fff; color: #4c5362; padding: 5px 9px; font-size: 12px; }
  .section-title > button:hover { border-color: #6557df; color: #5143c8; }

  .layers { display: grid; gap: 10px; }
  .layer-row { display: grid; grid-template-columns: 24px minmax(80px, 1fr) 52px 18px 26px; align-items: center; gap: 6px; min-height: 34px; }
  .layer-index { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #eef0f4; color: #565e6e; font-size: 11px; font-weight: 700; }
  .layer-row input[type=range] { width: 100%; accent-color: #6557df; }
  .layer-row input[type=number] { width: 52px; height: 30px; border: 1px solid #d9dce4; border-radius: 5px; color: #252938; text-align: right; padding: 0 6px; font-variant-numeric: tabular-nums; }
  .layer-row input[type=number]:focus { border-color: #6557df; outline: 2px solid #6557df20; }
  .unit { color: #8b91a0; font-size: 11px; }
  .remove-layer { width: 26px; height: 26px; border: 0; border-radius: 4px; background: transparent; color: #8b91a0; font-size: 18px; line-height: 1; }
  .remove-layer:hover:not(:disabled) { background: #fff0f1; color: #ce4656; }
  .remove-layer:disabled { cursor: default; opacity: .25; }

  .presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .presets button { height: 32px; border: 1px solid #d9dce4; border-radius: 5px; background: #fff; color: #555d6d; font-size: 12px; }
  .presets button:hover, .presets button.active { border-color: #6557df; background: #f2f0ff; color: #5143c8; }

  .code-section { border-bottom: 0; }
  #layer-count { color: #858c9b; font-size: 11px; }
  #filter-json { min-height: 94px; margin: 0; overflow: auto; border: 1px solid #e1e4ea; border-radius: 6px; background: #f7f8fa; padding: 12px; color: #3c4556; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }

  .stage { position: relative; min-width: 0; min-height: 0; overflow: hidden; background: #f4f5f8; }
  .stage::before { content: ''; position: absolute; inset: 47px 0 0; pointer-events: none; background-image: linear-gradient(#dfe2e8 1px, transparent 1px), linear-gradient(90deg, #dfe2e8 1px, transparent 1px); background-size: 24px 24px; opacity: .3; }
  .stage-header { position: absolute; inset: 0 0 auto; z-index: 2; display: flex; align-items: center; justify-content: space-between; height: 48px; border-bottom: 1px solid #dfe2e8; background: #f9fafb; padding: 0 18px; }
  .stage-header strong { font-size: 13px; }
  #status { color: #6d7585; font-size: 12px; font-variant-numeric: tabular-nums; }
  #app { position: absolute; inset: 48px 0 0; }

  @media (max-width: 760px) {
    body { overflow: auto; }
    .demo-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(520px, 1fr); min-height: 100vh; height: auto; }
    .controls { overflow: visible; border-right: 0; border-bottom: 1px solid #dfe2e8; }
    .control-section { padding: 14px 16px; }
    .code-section { display: none; }
    .stage { height: 580px; }
  }

  @media (max-width: 430px) {
    .package-header { grid-template-columns: 34px 1fr 40px; padding: 12px 14px; }
    .package-mark { width: 34px; height: 34px; }
    .presets { grid-template-columns: repeat(2, 1fr); }
    .layer-row { grid-template-columns: 24px minmax(70px, 1fr) 48px 16px 26px; }
    .layer-row input[type=number] { width: 48px; }
    .stage-header { padding: 0 12px; }
    #status { max-width: 58%; text-align: right; }
  }
`
