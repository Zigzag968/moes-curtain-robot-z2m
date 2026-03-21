# Moes ADP-ADCBZI01-W Curtain Robot — Zigbee2MQTT External Converter

External converter for the **Moes ADP-ADCBZI01-W Curtain Robot** on Zigbee2MQTT.

Without this converter, the device is detected as a generic **TS030F / Tuya "Smart blind controller"** with limited functionality.

## Device Info

| Field | Value |
|---|---|
| Model | ADP-ADCBZI01-W |
| Vendor | Moes |
| Zigbee Model ID | `TS030F` |
| Manufacturer Name | `_TZ3210_sxtfesc6` |
| Type | EndDevice (battery powered) |

## Tested Setup

- **Raspberry Pi 4** running Homebridge
- **Zigbee2MQTT 1.40.2** in Docker (`koenkk/zigbee2mqtt`)
- **Mosquitto MQTT** in Docker (port 1883)
- **HomeKit** integration via Homebridge + Zigbee2MQTT

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

3. Restart Zigbee2MQTT:

```bash
docker compose restart zigbee2mqtt
```

The device should now appear as **Moes Curtain Robot (ADP-ADCBZI01-W)** instead of the generic TS030F.

## Exposed Features

| Feature | Access | Description |
|---|---|---|
| `cover_position` | Read/Write | Curtain position (0–100%) |
| `state` | Write | open / stop / close |
| `battery` | Read | Battery level (%) |
| `illuminance` | Read | Light level |
| `work_state` | Read | standby / opening / closing |
| `charging_status` | Read | none / uncharged / charging / charged |
| `situation_set` | Read/Write | fully_open / fully_close |
| `open_threshold` | Read/Write | Light threshold for auto-opening |
| `close_threshold` | Read/Write | Light threshold for auto-closing |
| `total_time` | Read | Total operation time (seconds) |
| `total_distance` | Read | Total distance traveled |
| `custom_week_prog_1–4` | Read/Write | Weekly schedule programs |

## HomeKit Position Issue (Important)

The original converter from the [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605) includes **two Tuya datapoints for position**:

```javascript
[2, 'position', tuya.valueConverter.coverPosition],
[3, 'position', tuya.valueConverter.coverPositionInverted],
```

This causes a **position state conflict when used with HomeKit** (via Homebridge):

1. You set a position from HomeKit (e.g. 70%)
2. The device reports position via the standard ZCL cluster `closuresWindowCovering` (`currentPositionLiftPercentage`) — handled correctly by `fz.cover_position_tilt`
3. The device *also* reports via Tuya DP 3 with a different value, which **overwrites** the position, sending an incorrect state back to HomeKit
4. HomeKit immediately reflects the wrong value (e.g. snaps to 0%)

**The fix:** This converter removes Tuya DP 2 and DP 3 entirely. The device already reports position via the standard ZCL `closuresWindowCovering` cluster, which `fz.cover_position_tilt` handles correctly. No Tuya datapoint override is needed for position.

## Gotchas

- **Use `.js` (CommonJS), not `.mjs`** — Zigbee2MQTT 1.40.x loads external converters via `require()`. An `.mjs` file will fail silently or with `Cannot find module`.
- **The path in `configuration.yaml` must include the subdirectory** — `external_converters/moes_adcbzi01.js`, not just `moes_adcbzi01.js`.
- **Set `log_level: debug` temporarily** if you need to troubleshoot — the default `error` level won't show converter loading messages.
- If the device was already paired as a generic TS030F, a restart of Zigbee2MQTT should be enough — no need to re-pair.

## Credits

Based on the converter from [Zigbee2MQTT issue #24605](https://github.com/Koenkk/zigbee2mqtt/issues/24605), with fixes for HomeKit compatibility.

## License

MIT
