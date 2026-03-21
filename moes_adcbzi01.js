const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
    fingerprint: tuya.fingerprint('TS030F', ['_TZ3210_sxtfesc6']),
    model: 'ADP-ADCBZI01-W',
    vendor: 'Moes',
    description: 'Curtain Robot',
    fromZigbee: [fz.cover_position_tilt, tuya.fz.datapoints],
    toZigbee: [tz.cover_position_tilt, tz.cover_state, tuya.tz.datapoints],
    exposes: [
        e.cover_position(),
        e.battery(),
        e.illuminance(),
        e.enum('work_state', ea.STATE, ['standby', 'opening', 'closing']).withDescription('Current work state'),
        e.numeric('total_time', ea.STATE).withUnit('s').withDescription('Total operation time'),
        e.enum('situation_set', ea.STATE_SET, ['fully_open', 'fully_close']).withDescription('Situation control'),
        e.enum('fault', ea.STATE, ['none']).withDescription('Fault status'),
        e.enum('charging_status', ea.STATE, ['none', 'uncharged', 'charging', 'charged']).withDescription('Charging status'),
        e.numeric('open_threshold', ea.STATE_SET).withValueMin(0).withValueMax(100).withDescription('Light threshold for opening'),
        e.numeric('close_threshold', ea.STATE_SET).withValueMin(0).withValueMax(100).withDescription('Light threshold for closing'),
        e.numeric('curtain_status', ea.STATE_SET).withValueMin(0).withValueMax(255).withDescription('Curtain status'),
        e.numeric('total_distance', ea.STATE).withUnit('m').withDescription('Total distance traveled'),
        e.numeric('factory_test', ea.STATE).withValueMin(0).withValueMax(100).withDescription('Factory test feedback'),
        e.text('custom_week_prog_1', ea.STATE_SET).withDescription('Custom week program 1'),
        e.text('custom_week_prog_2', ea.STATE_SET).withDescription('Custom week program 2'),
        e.text('custom_week_prog_3', ea.STATE_SET).withDescription('Custom week program 3'),
        e.text('custom_week_prog_4', ea.STATE_SET).withDescription('Custom week program 4'),
    ],
    meta: {
        tuyaDatapoints: [
            [1, 'state', tuya.valueConverterBasic.lookup({'open': 0, 'stop': 1, 'close': 2})],
            [7, 'work_state', tuya.valueConverterBasic.lookup({'standby': 0, 'opening': 1, 'closing': 2})],
            [10, 'total_time', tuya.valueConverter.raw],
            [11, 'situation_set', tuya.valueConverterBasic.lookup({'fully_open': 0, 'fully_close': 1})],
            [12, 'fault', tuya.valueConverterBasic.lookup({'none': 0})],
            [13, 'battery', tuya.valueConverter.raw],
            [101, 'charging_status', tuya.valueConverterBasic.lookup({'none': 0, 'uncharged': 1, 'charging': 2, 'charged': 3})],
            [103, 'custom_week_prog_1', tuya.valueConverter.raw],
            [104, 'custom_week_prog_2', tuya.valueConverter.raw],
            [105, 'custom_week_prog_3', tuya.valueConverter.raw],
            [106, 'custom_week_prog_4', tuya.valueConverter.raw],
            [107, 'illuminance', tuya.valueConverter.raw],
            [108, 'open_threshold', tuya.valueConverter.raw],
            [109, 'close_threshold', tuya.valueConverter.raw],
            [110, 'curtain_status', tuya.valueConverter.raw],
            [111, 'factory_test', tuya.valueConverter.raw],
            [112, 'total_distance', tuya.valueConverter.raw],
        ],
    },
};

module.exports = definition;
