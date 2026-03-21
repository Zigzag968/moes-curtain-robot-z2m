# Moes ADP-ADCBZI01-W Curtain Robot — Zigbee2MQTT External Converter

External converter for the **Moes ADP-ADCBZI01-W Curtain Robot** on Zigbee2MQTT.

Without this converter, the device is detected as a generic **TS030F / Tuya "Smart blind controller"** with broken position reporting and no calibration support.

## Device Info

| Field | Value |
|---|---|
| Model | ADP-ADCBZI01-W |
| Vendor | Moes |
| Zigbee Model ID | `TS030F` |
| Manufacturer Name | `_TZ3210_sxtfesc6` |
| Type | EndDevice (battery powered) |

## Tested Setup

- Raspberry Pi 4 running Homebridge
- Zigbee2MQTT 1.40.2 in Docker (`koenkk/zigbee2mqtt`)
- Mosquitto MQTT in Docker
- HomeKit integration via Homebridge + Zigbee2MQTT

## Installation

1. Copy `moes_adcbzi01.js` to your Zigbee2MQTT data directory under `external_converters/`:

```bash
cp moes_adcbzi01.js /path/to/zigbee2mqtt-data/external_converters/
```

2. Add the converter to your `configuration.yaml`:

```yaml
external_converters:
  - external_converters/moes_adcbzi01.js
```

> **Note:** The path is relative to the data directory. Do **not** use just the filename — Zigbee2MQTT will look in the data root and fail with `ENOENT`.

3. Restart Zigbee2MQTT.

The device should now appear as **Moes Curtain Robot (ADP-ADCBZI01-W)**.

## Calibration

The device must be calibrated to know the full travel distance of your curtain rail. **Without calibration, the motor will only travel a short distance.**

### Calibration procedure (via Zigbee2MQTT)

1. Physically position the curtain at the **fully open** end of the rail
2. In Zigbee2MQTT Exposes, click **Start calibration** → `start`
3. The motor starts running toward the closed position
4. When the curtain reaches the **fully closed** position, click **STOP**
5. The device saves the travel time automatically (visible in `total_time`)

> **Warning:** Do not send OPEN/CLOSE/STOP commands during normal operation unless the curtain has reached its target position. Sending STOP mid-travel will recalibrate the total travel time with the shorter distance, causing the device to only cover a partial range.

### Adjusting travel time manually

You can also read and write the `total_time` value directly (in milliseconds). This lets you fine-tune the calibration without re-running the full procedure.

## Motor Direction / `invert_cover`

Depending on how the robot is mounted (motor facing indoor/outdoor, open side left/right), the OPEN and CLOSE commands may be physically reversed.

Use the `invert_cover` device option to fix this:

```yaml
devices:
  '0xYOUR_DEVICE_IEEE':
    friendly_name: 'Curtain Robot'
    invert_cover: true
```

When `invert_cover` is `true`:
- The OPEN/CLOSE ZCL commands are swapped
- The `work_state` labels (opening/closing) are swapped to match

**Position mapping** (`0% = closed`, `100% = open`) is always consistent regardless of `invert_cover` and follows the HomeKit convention.

### How to determine if you need `invert_cover`

1. Set `invert_cover: false` (default)
2. Send `state: OPEN` from Zigbee2MQTT
3. If the curtain physically **closes** instead of opening → set `invert_cover: true`

## Exposed Features

| Feature | Access | Description |
|---|---|---|
| `position` | Read/Write | Curtain position (0% closed – 100% open) |
| `state` | Write | OPEN / STOP / CLOSE |
| `battery` | Read | Battery level (%) |
| `work_state` | Read | standby / opening / closing |
| `charging_status` | Read | none / uncharged / charging / charged |
| `illuminance` | Read | Ambient light level |
| `total_time` | Read/Write | Calibrated travel time (ms) |
| `start_calibration` | Write | Trigger calibration run |

## Key Differences from the Original Converter

The converter from [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605) has several issues that this version fixes:

### 1. Position state conflict (HomeKit desync)

The original converter maps **both** Tuya DP 2 and DP 3 to `position`:

```javascript
[2, 'position', tuya.valueConverter.coverPosition],
[3, 'position', tuya.valueConverter.coverPositionInverted],
```

The device reports position via the standard ZCL `closuresWindowCovering` cluster **and** via Tuya DP 3 with a different value. DP 3 overwrites the correct position, causing HomeKit to show wrong values (e.g., snapping to 0%).

**Fix:** This converter removes DP 2 and DP 3. Position is handled exclusively by the ZCL cluster via a custom `fromZigbee` converter.

### 2. OPEN/CLOSE direction

The device's ZCL `upOpen` and `downClose` commands may be physically reversed depending on installation. The original converter has no way to fix this.

**Fix:** Custom `toZigbee` converter for `state` that respects `invert_cover`.

### 3. Position commands from HomeKit

HomeKit sends position commands (`goToLiftPercentage`), not state commands. The original converter doesn't handle position inversion for these.

**Fix:** Custom `toZigbee` converter for `position` with proper `100 - value` mapping and `convertGet` support for HomeKit polling.

### 4. Missing calibration

The original converter has no way to calibrate the travel distance.

**Fix:** `start_calibration` expose that triggers the device's calibration mode via `tuyaMotorReversal`.

## Format

Use `.js` (CommonJS) — Zigbee2MQTT 1.40.x loads external converters via `require()`. A `.mjs` file will fail with `Cannot find module`.

## Troubleshooting

- **Set `log_level: debug`** temporarily if you need to troubleshoot — the default `error` level won't show converter loading or device messages.
- **If the device was already paired** as a generic TS030F, a restart of Zigbee2MQTT should be enough — no need to re-pair.
- **If `total_time` seems wrong** (motor stops too early or too late), re-run the calibration procedure.
- **If position shows N/A** after restart, wake the device by pressing its physical button or sending a command.

## Credits

Based on the converter from [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605), with fixes for HomeKit compatibility, calibration, and motor direction.

## License

MIT
