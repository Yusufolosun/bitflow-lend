#!/usr/bin/env node
/**
 * BitFlow Lend - Testnet SDK Testing Script
 * Tests deployed contract using @stacks/network API
 * 
 * Usage: npm run test:testnet
 */

import fetch from 'node-fetch';

// Configuration
const CONTRACT_ADDRESS = 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0';
const CONTRACT_NAME = 'bitflow-vault-core';
const API_URL = 'https://api.testnet.hiro.so';

console.log('\n============================================================');
console.log('BitFlow Lend - Testnet SDK Testing');
console.log('============================================================\n');
console.log(`Contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);
console.log(`Network:  ${API_URL}\n`);

let testsPassed = 0;
let testsFailed = 0;
let testCount = 0;

/**
 * Make a read-only contract call
 */
async function callReadOnly(functionName, args = []) {
  const url = `${API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: CONTRACT_ADDRESS,
      arguments: args,
    }),
  });

  return await response.json();
}

/**
 * Log test result
 */
function logTest(name, passed, details = '') {
  testCount++;
  if (passed) {
    testsPassed++;
    console.log(`✓ Test ${testCount}: ${name}`);
    if (details) console.log(`  ${details}`);
  } else {
    testsFailed++;
    console.log(`✗ Test ${testCount}: ${name}`);
    if (details) console.log(`  ${details}`);
  }
}

/**
 * Test 1: Get Contract Version
 */
async function testContractVersion() {
  try {
    const result = await callReadOnly('get-contract-version');
    const passed = result.okay === true;
    logTest('Get contract version', passed, passed ? `Result: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get contract version', false, e.message);
  }
}

/**
 * Test 2: Get Total Deposits
 */
async function testTotalDeposits() {
  try {
    const result = await callReadOnly('get-total-deposits');
    const passed = result.okay === true;
    logTest('Get total deposits', passed, passed ? `Total: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get total deposits', false, e.message);
  }
}

/**
 * Test 3: Get Protocol Stats
 */
async function testProtocolStats() {
  try {
    const result = await callReadOnly('get-protocol-stats');
    const passed = result.okay === true;
    logTest('Get protocol stats', passed, passed ? 'Stats retrieved successfully' : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get protocol stats', false, e.message);
  }
}

/**
 * Test 4: Get Protocol Metrics
 */
async function testProtocolMetrics() {
  try {
    const result = await callReadOnly('get-protocol-metrics');
    const passed = result.okay === true;
    logTest('Get protocol metrics', passed, passed ? 'Metrics retrieved successfully' : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get protocol metrics', false, e.message);
  }
}

/**
 * Test 5: Get Total Repaid
 */
async function testTotalRepaid() {
  try {
    const result = await callReadOnly('get-total-repaid');
    const passed = result.okay === true;
    logTest('Get total repaid', passed, passed ? `Total: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get total repaid', false, e.message);
  }
}

/**
 * Test 6: Get Total Liquidations
 */
async function testTotalLiquidations() {
  try {
    const result = await callReadOnly('get-total-liquidations');
    const passed = result.okay === true;
    logTest('Get total liquidations', passed, passed ? `Total: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get total liquidations', false, e.message);
  }
}

/**
 * Test 7: Get Volume Metrics
 */
async function testVolumeMetrics() {
  try {
    const result = await callReadOnly('get-volume-metrics');
    const passed = result.okay === true;
    logTest('Get volume metrics', passed, passed ? 'Volume metrics retrieved' : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get volume metrics', false, e.message);
  }
}

/**
 * Test 8: Calculate Required Collateral (100 STX)
 */
async function testCalculateCollateral() {
  try {
    // 100 STX = 100000000 micro-STX = 0x0000000000000005f5e100 (uint)
    const result = await callReadOnly('calculate-required-collateral', ['0x0100000000000000000000000005f5e100']);
    const passed = result.okay === true;
    logTest('Calculate required collateral (100 STX)', passed, passed ? `Result: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Calculate required collateral', false, e.message);
  }
}

/**
 * Test 9: Get User Deposit
 */
async function testUserDeposit() {
  try {
    // Principal in hex format
    const principalCV = `0x051a164247d6f2b425ac5771423ae6c80c754f7172b0`;
    const result = await callReadOnly('get-user-deposit', [principalCV]);
    const passed = result.okay === true;
    logTest('Get user deposit', passed, passed ? `Deposit: ${result.result}` : `Error: ${result.cause}`);
  } catch (e) {
    logTest('Get user deposit', false, e.message);
  }
}

/**
 * Test contract info via API
 */
async function testContractInfo() {
  try {
    const url = `${API_URL}/v2/contracts/interface/${CONTRACT_ADDRESS}/${CONTRACT_NAME}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const passed = data.functions && data.functions.length > 0;
    logTest('Get contract interface', passed, passed ? `Functions: ${data.functions.length}` : 'Failed');
  } catch (e) {
    logTest('Get contract interface', false, e.message);
  }
}

/**
 * Test contract source
 */
async function testContractSource() {
  try {
    const url = `${API_URL}/v2/contracts/source/${CONTRACT_ADDRESS}/${CONTRACT_NAME}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const passed = data.source && data.source.includes('define-public');
    logTest('Get contract source', passed, passed ? `Source: ${data.source.length} chars` : 'Failed');
  } catch (e) {
    logTest('Get contract source', false, e.message);
  }
}

/**
 * Test contract status
 */
async function testContractStatus() {
  try {
    const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const passed = data.tx_id !== undefined;
    logTest('Get contract status', passed, passed ? `TxID: ${data.tx_id}` : 'Failed');
  } catch (e) {
    logTest('Get contract status', false, e.message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Running Read-Only Function Tests...\n');
  
  await testContractVersion();
  await testTotalDeposits();
  await testProtocolStats();
  await testProtocolMetrics();
  await testTotalRepaid();
  await testTotalLiquidations();
  await testVolumeMetrics();
  await testCalculateCollateral();
  await testUserDeposit();

  console.log('\nRunning Contract API Tests...\n');
  
  await testContractInfo();
  await testContractSource();
  await testContractStatus();

  // Print summary
  console.log('\n============================================================');
  console.log('Test Summary');
  console.log('============================================================\n');
  
  console.log(`Total Tests: ${testCount}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  
  const successRate = ((testsPassed / testCount) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%\n`);

  if (testsFailed === 0) {
    console.log('✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed. Review the output above.\n');
    process.exit(1);
  }
}

// Main execution
runAllTests().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
