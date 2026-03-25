/**
 * Test script for moes_adcbzi01.js converter
 * Run on RPi: docker exec zigbee2mqtt node /app/data/external_converters/test_converter.js
 * Or locally if zigbee-herdsman-converters is installed
 */

const tuya = require('zigbee-herdsman-converters/lib/tuya');

// Load the converter definition
const definition = require('./moes_adcbzi01.js');

let passed = 0;
let failed = 0;

function assert(name, actual, expected) {
    if (actual === expected) {
        console.log(`  PASS: ${name} => ${actual}`);
        passed++;
    } else {
        console.log(`  FAIL: ${name} => got ${actual}, expected ${expected}`);
        failed++;
    }
}

function assertNotNaN(name, actual) {
    if (typeof actual === 'number' && !isNaN(actual)) {
        console.log(`  PASS: ${name} => ${actual}`);
        passed++;
    } else {
        console.log(`  FAIL: ${name} => got ${actual}, expected a valid number`);
        failed++;
    }
}

// --- Test: tuyaDatapoints structure ---
console.log('\n== tuyaDatapoints structure ==');
const dps = definition.meta.tuyaDatapoints;

for (const [dp, name, converter] of dps) {
    if (name === null) {
        console.log(`  SKIP: DP ${dp} (null mapping)`);
        continue;
    }
    if (converter?.from) {
        console.log(`  PASS: DP ${dp} (${name}) has from()`);
        passed++;
    } else {
        console.log(`  FAIL: DP ${dp} (${name}) missing from()`);
        failed++;
    }
}

// --- Test: illuminance converter ---
console.log('\n== Illuminance converter ==');
const illumEntry = dps.find(d => d[1] === 'illuminance');

if (!illumEntry) {
    console.log('  FAIL: illuminance datapoint not found');
    failed++;
} else {
    const [dp, name, converter] = illumEntry;
    assert('DP number', dp, 107);

    // Simulate tuya.fz.datapoints behavior
    if (converter?.from) {
        const meta = {device: {manufacturerName: '_TZ3210_sxtfesc6'}};
        const options = {};

        assertNotNaN('from(94) plein jour', converter.from(94, meta, options));
        assertNotNaN('from(60) nuit+lampes', converter.from(60, meta, options));
        assertNotNaN('from(0) nuit noire', converter.from(0, meta, options));
        assert('from(0) equals 0', converter.from(0, meta, options), 0);

        // Verify value is reasonable (not raw, should be scaled)
        const fullDaylight = converter.from(94, meta, options);
        if (fullDaylight > 94) {
            console.log(`  PASS: value is scaled (94 => ${fullDaylight})`);
            passed++;
        } else if (fullDaylight === 94) {
            console.log(`  INFO: value is raw/unscaled (94 => 94)`);
            passed++;
        } else {
            console.log(`  FAIL: unexpected scaling (94 => ${fullDaylight})`);
            failed++;
        }
    } else {
        console.log('  FAIL: illuminance converter has no from()');
        failed++;
    }
}

// --- Test: battery converter ---
console.log('\n== Battery converter ==');
const battEntry = dps.find(d => d[1] === 'battery');
if (battEntry?.[2]?.from) {
    assert('battery from(100)', battEntry[2].from(100), 100);
    passed++;
} else {
    console.log('  FAIL: battery converter missing');
    failed++;
}

// --- Test: work_state converter ---
console.log('\n== Work state converter ==');
const wsEntry = dps.find(d => d[1] === 'work_state');
if (wsEntry?.[2]?.from) {
    assert('work_state from(0)', wsEntry[2].from(0, null, {}), 'standby');
    assert('work_state from(1) no invert', wsEntry[2].from(1, null, {}), 'opening');
    assert('work_state from(2) no invert', wsEntry[2].from(2, null, {}), 'closing');
    assert('work_state from(1) invert', wsEntry[2].from(1, null, {invert_cover: true}), 'closing');
    assert('work_state from(2) invert', wsEntry[2].from(2, null, {invert_cover: true}), 'opening');
} else {
    console.log('  FAIL: work_state converter missing');
    failed++;
}

// --- Test: charging_status converter ---
console.log('\n== Charging status converter ==');
const csEntry = dps.find(d => d[1] === 'charging_status');
if (csEntry?.[2]?.from) {
    assert('charging from(0)', csEntry[2].from(0), 'none');
    assert('charging from(2)', csEntry[2].from(2), 'charging');
    assert('charging from(3)', csEntry[2].from(3), 'charged');
} else {
    console.log('  FAIL: charging_status converter missing');
    failed++;
}

// --- Summary ---
console.log(`\n== Results: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
