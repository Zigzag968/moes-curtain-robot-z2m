# Moes ADP-ADCBZI01-W Curtain Robot — Zigbee2MQTT External Converter

External converter for the **Moes ADP-ADCBZI01-W Curtain Robot** on Zigbee2MQTT.

Without this converter, the device is detected as a generic **TS030F / Tuya "Smart blind controller"** with broken position reporting, no calibration, and no HomeKit compatibility.

## Device Info

| Field | Value |
|---|---|
| Model | ADP-ADCBZI01-W |
| Vendor | Moes |
| Zigbee Model ID | `TS030F` |
| Manufacturer Name | `_TZ3210_sxtfesc6` |
| Type | EndDevice (battery powered, 3x AA) |
| Protocol | Hybrid: ZCL `closuresWindowCovering` + Tuya `manuSpecificTuya` |

## Tested Setup

- Raspberry Pi 4 running Homebridge
- Zigbee2MQTT 1.40.2 in Docker (`koenkk/zigbee2mqtt`)
- Mosquitto MQTT in Docker
- HomeKit integration via Homebridge + zigbee2mqtt plugin

---

## Installation

### 1. Copy the converter

```bash
cp moes_adcbzi01.js /path/to/zigbee2mqtt-data/external_converters/
```

### 2. Reference it in `configuration.yaml`

```yaml
external_converters:
  - external_converters/moes_adcbzi01.js
```

> **Important:** The path is relative to the z2m data directory. Using just `moes_adcbzi01.js` will fail with `ENOENT` — you must include the `external_converters/` prefix.

### 3. Use `.js` format (CommonJS)

Zigbee2MQTT 1.40.x loads external converters via `require()`. A `.mjs` (ESM) file will fail silently or with `Cannot find module`. Always use `.js` with `module.exports`.

### 4. Restart Zigbee2MQTT

```bash
docker compose restart zigbee2mqtt
```

The device should now appear as **Moes Curtain Robot (ADP-ADCBZI01-W)** instead of the generic TS030F. No need to re-pair if it was already joined.

---

## User Guide

### First-time setup

After installing the converter, you need to:

1. **Determine motor direction** — send `state: OPEN` from z2m. If the curtain physically closes, set `invert_cover: true` (see [Motor Direction](#motor-direction--invert_cover)).
2. **Calibrate the travel distance** — without calibration, the motor will only cover a fraction of your curtain rail (see [Calibration](#calibration)).
3. **Test from HomeKit** — verify that open/close and position control work correctly from the Home app.

### Motor Direction / `invert_cover`

Depending on how the robot is physically mounted on your rail (motor facing indoor vs outdoor, open side left vs right), the OPEN and CLOSE commands may be reversed.

**How to check:**

1. Make sure `invert_cover` is not set (defaults to `false`)
2. Send `state: OPEN` from the z2m frontend
3. Observe the curtain:
   - If it **opens** → leave `invert_cover: false`
   - If it **closes** → set `invert_cover: true`

**To set `invert_cover`**, add it to your device config in `configuration.yaml`:

```yaml
devices:
  '0xYOUR_DEVICE_IEEE':
    friendly_name: 'Curtain Robot'
    invert_cover: true
```

When `invert_cover: true`:
- OPEN/CLOSE ZCL commands are swapped
- `work_state` labels (opening/closing) are swapped to match
- Position mapping stays the same: **0% = closed, 100% = open** (HomeKit convention)

> **Note:** This device does not support software-based motor direction control via Tuya datapoints (DPs 5, 8, 16 were tested and are not implemented). The `invert_cover` z2m option is the only way to handle reversed motor direction.

### Calibration

The device needs to learn the full travel distance of your curtain rail. **Without calibration, the motor will stop after a few seconds, covering only a fraction of the rail.**

#### Calibration procedure

1. **Position the curtain** at the fully **open** end of the rail (100% open)
2. In the z2m frontend, go to the device's Exposes tab
3. Click **Start calibration** → select `start`
4. The motor starts running toward the closed position
5. **Watch the curtain** — when it reaches the fully **closed** position, click **STOP**
6. The device saves the travel time automatically — you can see it in `total_time`

#### Important warnings

- **Do not send OPEN/CLOSE/STOP commands while the curtain is still moving to its target position.** Sending STOP mid-travel will recalibrate `total_time` with the shorter distance, and subsequent movements will only cover a partial range.
- If you accidentally recalibrate with the wrong distance, just re-run the calibration procedure.
- You can also manually edit `total_time` (in milliseconds) to fine-tune.

### Exposed Features

| Feature | Access | Description |
|---|---|---|
| `position` | Read/Write | Curtain position (0% = closed, 100% = open) |
| `state` | Write | OPEN / STOP / CLOSE |
| `battery` | Read | Battery level (%) |
| `work_state` | Read | standby / opening / closing |
| `charging_status` | Read | none / uncharged / charging / charged |
| `illuminance` | Read | Ambient light level (snapshot, not real-time) |
| `total_time` | Read/Write | Calibrated travel time in milliseconds |
| `start_calibration` | Write | Trigger a calibration run |

### Battery-powered device behavior

This device is a **Zigbee EndDevice** on battery. This means:

- **It sleeps most of the time** — it only wakes up during movement or periodic check-ins.
- **`battery`, `charging_status`, and `illuminance` update infrequently** — reported during full data dumps (startup, after calibration), not during every movement.
- **`illuminance` is a snapshot**, not a real-time sensor.
- **`position` and `work_state` update during movement** in real-time.
- **After a z2m restart**, values may show as `N/A` until the device wakes up. Send a command to wake it.

### HomeKit specifics

- **Position**: 0% = closed, 100% = open — follows HomeKit convention.
- **Battery**: Appears in HomeKit as battery level. May require a Homebridge restart to show after first setup.
- **`charging_status`, `illuminance`, `work_state`**: Visible only in the z2m frontend (no HomeKit equivalent).

---

## Technical Details

### Why not use the original converter from issue #24605?

The converter from [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605) has several critical issues:

#### 1. Position state conflict (HomeKit desync)

The original maps both Tuya DP 2 and DP 3 to `position`, but the device also reports position via the ZCL `closuresWindowCovering` cluster. DP 3 overwrites the correct ZCL position, causing HomeKit to show wrong values.

**Fix:** DP 2 and DP 3 are explicitly ignored (`null`). Position is handled exclusively via ZCL `attributeReport`.

#### 2. Device returns wrong position on ZCL read

The device has a firmware bug: reading `currentPositionLiftPercentage` via ZCL always returns 0, regardless of actual position. Only spontaneous `attributeReport` messages during movement contain correct values. A `convertGet` that reads this attribute causes HomeKit to overwrite the correct position with 0 (displayed as 100% open).

**Fix:** `convertGet` for position is a no-op — it does not issue a ZCL read. Position is only updated from spontaneous device reports.

#### 3. No motor direction control

The original converter has no way to handle reversed OPEN/CLOSE commands.

**Fix:** Custom `toZigbee` state converter that respects the `invert_cover` z2m option.

#### 4. No calibration

The original converter has no way to calibrate the travel distance.

**Fix:** `start_calibration` expose and writable `total_time`.

### Unsupported features

The following features from the generic TS030F definition do **not work** on this device (all return `UNSUPPORTED_ATTRIBUTE`):

- `border` (cluster `0xe001`)
- `calibration_time` (ZCL `moesCalibrationTime`)
- `motor_reversal` as a simple toggle (triggers a calibration run instead)

Tuya datapoints 5, 8, and 16 (motor direction and borders on other Tuya curtain devices) were probed and are **not implemented** on this device.

### Tuya Datapoints Map

| DP | Name | Description |
|---|---|---|
| 1 | state | open(0) / stop(1) / close(2) — not used for control, ZCL is used |
| 2 | — | Ignored (position conflicts with ZCL) |
| 3 | — | Ignored (inverted position conflicts with ZCL) |
| 7 | work_state | standby(0) / opening(1) / closing(2) |
| 10 | total_time | Calibrated travel time in ms |
| 13 | battery | Battery level 0–100% |
| 101 | charging_status | none(0) / uncharged(1) / charging(2) / charged(3) |
| 107 | illuminance | Ambient light level (raw) |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Device shows as generic "TS030F" | Check `external_converters` path in config, restart z2m |
| Converter not loading | Use `.js` (CommonJS), not `.mjs` |
| `ENOENT` error | Use `external_converters/moes_adcbzi01.js` as path, not just the filename |
| Motor goes the wrong way | Set `invert_cover: true` in device config |
| Motor only covers part of the rail | Run the calibration procedure |
| Position jumps to 100% after movement | Update to the latest converter (fixes ZCL read bug) |
| Values show N/A after restart | Send a command to wake the device |
| Battery not in HomeKit | Restart Homebridge |
| Illuminance doesn't update | Normal — battery device reports infrequently |
| `No converter for 'get'` errors | Update to the latest converter |

## Credits

Based on the converter from [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605), with extensive fixes for HomeKit compatibility, position reporting, calibration, and motor direction.

## License

MIT
