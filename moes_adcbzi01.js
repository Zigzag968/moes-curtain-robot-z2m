const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const reporting = require('zigbee-herdsman-converters/lib/reporting');

const tzLocal = {
    cover_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const invert = meta.options.invert_cover;
            const lookup = invert
                ? {open: 'downClose', close: 'upOpen', stop: 'stop'}
                : {open: 'upOpen', close: 'downClose', stop: 'stop'};
            await entity.command('closuresWindowCovering', lookup[value.toLowerCase()], {}, {disableDefaultResponse: false});
        },
    },
    cover_position: {
        key: ['position'],
        convertSet: async (entity, key, value, meta) => {
            const position = 100 - value;
            await entity.command('closuresWindowCovering', 'goToLiftPercentage',
                {percentageliftvalue: position}, {disableDefaultResponse: false});
        },
        convertGet: async (entity, key, meta) => {
            // Do NOT read from ZCL — the device returns stale/wrong values.
            // Position updates come from spontaneous attributeReports only.
        },
    },
    start_calibration: {
        key: ['start_calibration'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('closuresWindowCovering', {tuyaMotorReversal: 1});
        },
    },
};

const fzLocal = {
    cover_position: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.currentPositionLiftPercentage !== undefined) {
                result.position = 100 - msg.data.currentPositionLiftPercentage;
                result.state = result.position > 0 ? 'OPEN' : 'CLOSE';
            }
            return result;
        },
    },
};

const workStateConverter = {
    from: (v, meta, options) => {
        const invert = options?.invert_cover;
        const lookup = invert
            ? {0: 'standby', 1: 'closing', 2: 'opening'}
            : {0: 'standby', 1: 'opening', 2: 'closing'};
        return lookup[v];
    },
};

const definition = {
    fingerprint: tuya.fingerprint('TS030F', ['_TZ3210_sxtfesc6']),
    model: 'ADP-ADCBZI01-W',
    vendor: 'Moes',
    description: 'Curtain Robot',
    options: [exposes.options.invert_cover()],
    fromZigbee: [fzLocal.cover_position, tuya.fz.datapoints],
    toZigbee: [tzLocal.cover_position, tzLocal.cover_state, tzLocal.start_calibration, tuya.tz.datapoints],
    configure: async (device, coordinatorEndpoint) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
        await reporting.currentPositionLiftPercentage(endpoint);
    },
    exposes: [
        e.cover_position(),
        e.battery(),
        e.enum('work_state', ea.STATE, ['standby', 'opening', 'closing']).withDescription('Current work state'),
        e.enum('charging_status', ea.STATE, ['none', 'uncharged', 'charging', 'charged']).withDescription('Charging status'),
        e.illuminance(),
        e.numeric('total_time', ea.STATE_SET).withUnit('ms').withDescription('Calibrated travel time'),
        e.enum('start_calibration', ea.SET, ['start']).withDescription(
            'Start calibration: set curtain to fully open (100%), click start — the motor will run toward ' +
            'the closed position. Press STOP when fully closed. The travel time is saved automatically.'),
    ],
    meta: {
        tuyaDatapoints: [
            [1, 'state', tuya.valueConverterBasic.lookup({'open': tuya.enum(0), 'stop': tuya.enum(1), 'close': tuya.enum(2)})],
            [2, null, null],
            [3, null, null],
            [7, 'work_state', workStateConverter],
            [10, 'total_time', tuya.valueConverter.raw],
            [13, 'battery', tuya.valueConverter.raw],
            [101, 'charging_status', tuya.valueConverterBasic.lookup({'none': 0, 'uncharged': 1, 'charging': 2, 'charged': 3})],
            [107, 'illuminance', tuya.valueConverter.raw],
        ],
    },
};

module.exports = definition;
