const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runTests() {
  try {
    // Load test scenarios
    const scenariosPath = path.join(__dirname, 'test-scenarios.json');
    if (!fs.existsSync(scenariosPath)) {
      console.error('No test scenarios found. Run analyze-pr.js first.');
      process.exit(1);
    }

    const testScenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
    
    // Get deployment URL (you might want to get this from GitHub deployment or environment)
    const deploymentUrl = process.env.DEPLOYMENT_URL || 'https://your-staging-url.com';
    const agentTimeout = parseInt(process.env.AGENT_TIMEOUT || '300000');
    
    console.log(`Running ${testScenarios.length} test scenarios against ${deploymentUrl}`);

    // POST test scenarios to your agent endpoint
    const response = await axios.post(process.env.QAI_ENDPOINT, {
      url: deploymentUrl,
      scenarios: testScenarios,
      timeout: agentTimeout,
    }, {
      timeout: agentTimeout + 60000, // Agent timeout + 1 minute buffer
    });

    const results = response.data;
    
    // Save results
    fs.writeFileSync(
      path.join(__dirname, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

    // Check if all tests passed
    const allPassed = results.every(result => result.success === true);
    
    if (allPassed) {
      console.log('✅ All tests passed!');
      console.log(`::set-output name=success::true`);
    } else {
      console.log('❌ Some tests failed');
      const failedTests = results.filter(r => !r.success);
      console.log(`Failed tests: ${failedTests.length}/${results.length}`);
      
      failedTests.forEach(test => {
        console.log(`- ${test.scenario.description}: ${test.error || 'Unknown error'}`);
      });
      
      console.log(`::set-output name=success::false`);
    }

    // Generate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(__dirname, 'test-summary.json'),
      JSON.stringify(summary, null, 2)
    );

  } catch (error) {
    console.error('Error running tests:', error);
    console.log(`::set-output name=success::false`);
    process.exit(1);
  }
}

runTests();