const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function updateCodebaseSummary() {
  try {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const prNumber = process.env.GITHUB_EVENT_NUMBER || 
                    JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).number;

    // Get PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // Load existing summary
    const summaryPath = path.join(__dirname, 'codebase-summary.txt');
    let existingSummary = '';
    if (fs.existsSync(summaryPath)) {
      existingSummary = fs.readFileSync(summaryPath, 'utf8');
    }

    // Create update entry
    const timestamp = new Date().toISOString();
    const updateEntry = `
=== UPDATE ${timestamp} ===
PR #${prNumber}: ${pr.title}
${pr.body || 'No description provided'}

Changes merged successfully after QAI testing.
`;

    // Append to summary
    const updatedSummary = existingSummary + updateEntry;

    // Keep summary manageable (last 50 updates or 10k chars)
    const lines = updatedSummary.split('\n');
    const updateCount = (updatedSummary.match(/=== UPDATE/g) || []).length;
    
    let finalSummary = updatedSummary;
    if (updateCount > 50 || updatedSummary.length > 10000) {
      // Keep only the latest updates
      const updateSections = updatedSummary.split('=== UPDATE ').slice(-25);
      finalSummary = updateSections.map((section, index) => 
        index === 0 ? section : '=== UPDATE ' + section
      ).join('');
    }

    // Save updated summary
    fs.writeFileSync(summaryPath, finalSummary);

    console.log('✅ Codebase summary updated successfully');

  } catch (error) {
    console.error('Error updating codebase summary:', error);
    // Don't fail the pipeline for summary update errors
  }
}

updateCodebaseSummary();