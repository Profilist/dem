const { Octokit } = require('@octokit/rest');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePR() {
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

    // Get PR diff
    const { data: diff } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' }
    });

    // Load existing codebase summary
    let codebaseSummary = '';
    const summaryPath = path.join(__dirname, 'codebase-summary.txt');
    if (fs.existsSync(summaryPath)) {
      codebaseSummary = fs.readFileSync(summaryPath, 'utf8');
    }

    // Create system prompt for LLM
    const systemPrompt = `You are an AI that analyzes code changes to generate comprehensive test scenarios for autonomous web testing agents.

CODEBASE SUMMARY:
${codebaseSummary}

PR TITLE: ${pr.title}
PR DESCRIPTION: ${pr.body || 'No description'}

CODE CHANGES:
${diff}

Based on the codebase context and these changes, generate test scenarios that autonomous agents should perform. Consider:
- New features that need testing
- Modified functionality that might break
- Edge cases and user flows
- UI/UX changes that need validation
- API endpoints that need testing
- Integration points

Generate test scenarios with clear descriptions, appropriate priority levels, test types, user personas, and step-by-step instructions.`;

    // Define the structured output schema
    const testScenarioSchema = {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: {
                type: "string",
                description: "Clear description of what to test"
              },
              priority: {
                type: "string",
                enum: ["high", "medium", "low"],
                description: "Priority level for this test"
              },
              type: {
                type: "string", 
                enum: ["ui", "api", "integration", "e2e"],
                description: "Type of test to perform"
              },
              persona: {
                type: "string",
                description: "User type performing the test (e.g., new_user, admin, power_user)"
              },
              steps: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Array of high-level steps the agent should follow"
              }
            },
            required: ["description", "priority", "type", "persona", "steps"],
            additionalProperties: false
          }
        }
      },
      required: ["scenarios"],
      additionalProperties: false
    };

    // Call OpenAI with structured output
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_scenarios",
          schema: testScenarioSchema
        }
      },
      temperature: 0.3,
    });

    const testScenarios = completion.choices[0].message.parsed.scenarios;
    
    // Save test scenarios
    fs.writeFileSync(
      path.join(__dirname, 'test-scenarios.json'),
      JSON.stringify(testScenarios, null, 2)
    );

    console.log(`Generated ${testScenarios.length} test scenarios`);
    console.log('Test scenarios saved to test-scenarios.json');

  } catch (error) {
    console.error('Error analyzing PR:', error);
    process.exit(1);
  }
}

analyzePR();