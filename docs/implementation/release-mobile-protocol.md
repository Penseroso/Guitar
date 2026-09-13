# External physical-mobile release protocol

Status in this environment: **EXTERNALLY BLOCKED / NOT MEASURED**. No connected phone/tablet, Android platform tools, or iOS device bridge was available. Bluetooth Galaxy Buds are not a mobile browser device. Desktop viewport tests are not substituted for this gate.

Use the frozen production source tree `d0186978862058d07de6debb676fa1ccbab8fb02`, implementation `4187903b3a97c788c870e93bd274bbb3a68f0565`, and release build `FMjDGjRhqWxf4MVLwfgcT`. Do not rebuild while collecting one matrix. A rebuilt artifact must receive a new recorded build identity. No deployment is required: the device accesses the local production server over USB port forwarding.

## Device and state record

An operator must select a representative actual phone/tablet and record its exact manufacturer/model (including SoC/RAM variant), OS/build, browser/version, available memory, battery/power mode, charging state, thermal state and ambient conditions. Record background apps, accessibility settings, screen orientation/refresh rate, browser zoom, connection, operator and UTC start/end. Close unrelated heavy work on the host/device; disable power saving and keep the browser foreground. Do not select an emulator or apply CPU/device-metrics emulation.

Create `.tmp-release-memory/device.json` with real values, for example this **unfilled template**:

```json
{
  "physicalDevice": true,
  "manufacturer": "REPLACE",
  "model": "REPLACE exact model / SoC / RAM",
  "os": "REPLACE version and build",
  "browser": "REPLACE exact Chrome version",
  "thermalState": "REPLACE",
  "battery": "REPLACE percent / charging / power mode",
  "operator": "REPLACE",
  "connection": "USB adb reverse; local release server",
  "build": "FMjDGjRhqWxf4MVLwfgcT"
}
```

The collector requires this attestation but cannot itself prove physical hardware identity. Photograph or export device settings and attach the operator record to the result. Do not leave template values in accepted evidence.

## Android Chrome collection

On a host with Android platform tools, connect the phone by USB and authorize debugging on the physical device. In PowerShell at `C:\Projects\Guitar`:

```powershell
git rev-parse HEAD
git rev-parse HEAD:src
git diff -- src
Get-Content .next/BUILD_ID
adb devices -l
adb shell getprop ro.product.manufacturer
adb shell getprop ro.product.model
adb shell getprop ro.build.fingerprint
adb shell dumpsys package com.android.chrome | Select-String versionName
adb forward tcp:9334 localabstract:chrome_devtools_remote
adb reverse tcp:3004 tcp:3004
adb reverse tcp:3005 tcp:3005
node node_modules/next/dist/bin/next start --port 3004
```

Keep that local server running. Open `http://localhost:3004` **on the phone**. In a second PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:9334/json/version
Invoke-RestMethod http://127.0.0.1:9334/json/list | Select-Object id,title,url,type
$env:MOBILE_TARGET_ID='REPLACE with that exact physical tab id'
$env:MOBILE_DEVICE_RECORD='.tmp-release-memory/device.json'
$env:MOBILE_CDP='http://127.0.0.1:9334'
$env:CHORD_URL='http://localhost:3004'
node scripts/engine-integration/release-mobile-performance.mjs
```

The collector attaches to the named tab, installs the same Worker-byte/card/long-task instrumentation and DOM actions as the Chrome release matrix, and reloads the page. It does not resize/emulate the device or change product settings/policy. Keep it foreground throughout. It records 480 standard requests ×30 first-page samples and the widest request of each quality/context ×30 next-page, filter and card-selection samples. Every request checks the frozen structural and Physical census, message/card/buffer bounds. HTTP/module caches are warmed by setup; each root uses a fresh worker. Thus these are **warm HTTP, fresh-worker measurements**, not cold-boot measurements. Initialization/cold browser startup and actual audio onset are excluded and must not be inferred from these numbers.

Expected output: `docs/implementation/release-performance-physical-mobile.json`. Require `complete:true`, 14,400 first-page and 1,200 samples of each ancillary action, no errors/timeouts, and no budget violations. Preserve every raw sample. Report aggregate and worst per-request p50/p95/max; do not discard slow runs. A failed run stays evidence and requires an explained corrective rerun.

For actual direct lookup and separate worker/main-target memory, use the existing frozen bounded diagnostic through the following prepared adapter. It uses a separate local fixture server at port 3005, the same engine sources, and a separate output file; it performs no model work and does not overwrite historical evidence:

```powershell
node scripts/engine-integration/prepare-mobile-worker-cost.mjs
$env:CHORD_CDP='http://127.0.0.1:9334'
node .tmp-release-memory/physical-mobile-worker-cost.mjs
```

It navigates the selected physical tab to the diagnostic, runs 30 distinct direct LOOKUPs each for C major standalone and C dominant-11 accompaniment, checks identity/14-term ledger/Physical evidence, and records arrival, production validation, total lookup latency and bytes. It compares main-target and dedicated-worker post-GC heaps before/after 100 query/context/view changes, then measures the declared fret-36 replay pause/cancel behavior. Report these separately from UI measurements; this is not a 480-request lookup matrix. Preserve generated bundle/source hashes and `release-physical-mobile-worker-cost.json`. This adapter is prepared and syntax-checked here; actual device execution remains unverified until the external run.

## Acceptance and manual checks

Use the existing thresholds unchanged: each standard request's first-page p95 ≤5,000 ms; next-page/filter p95 ≤500 ms; direct lookup p95 ≤250 ms; ≤1 MiB/message; ≤48 rendered cards; compact retained row budget ≤32 MiB and total accounted buffers ≤64 MiB. Report main-thread long tasks >50 ms and investigate engine attribution; do not call an unavailable observer API zero tasks. Card selection is distinct from direct lookup.

On the real device, also exercise rapid root changes and cancellation during the widest request and replay: the UI must mark superseded work immediately, acknowledge cancellation within 100 ms or terminate the worker, and accept no stale page/selection/audio. Record screen/trace evidence and actual elapsed timings. Check portrait landscape/reflow, touch controls, visible focus when using a keyboard, warning/details access, and Recommended versus PASS/UNCERTAIN copy. Do not reinterpret these as human preference or playability validation.

For memory, label CDP `usedSize` as main-target JS used heap, `backingStorageSize` as backing storage, and `embedderHeapUsedSize` as that target's embedder reading. Dedicated-worker heaps are separate. Android process PSS/RSS from `adb shell dumpsys meminfo com.android.chrome` is browser-process evidence with all tabs/processes; it is not equivalent to engine heap. Save before/after outputs and the process inventory. Unsupported memory measurements are NOT MEASURED, not zero. Compare the same request after warmup and after ≥100 changes; use retained-object profiles if growth appears.

If iOS Safari is the chosen representative device, use an actual iPhone/iPad with its macOS Safari Web Inspector. The Android CDP collectors do not apply. Use the same 480 fixtures, 30 repeats and painted endpoints/thresholds with an equivalent Web Inspector collector; record the unavailable APIs and exact method. A desktop Playwright WebKit run does not substitute for it.

Attach device records, raw outputs and hashes to the release closure report. Reclassify the external-device gate only after review of those actual measurements. Remove only the USB forwards created for this run; close the owned local diagnostic/server processes. No deployment or Stage 10 work is part of this protocol.
