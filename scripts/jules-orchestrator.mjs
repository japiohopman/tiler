#!/usr/bin/env node
/**
 * Jules Queue Orchestrator (v3)
 *
 * ROADMAP.md is the canonical queue. This script never edits ROADMAP.md itself.
 * Jules checks its own task checkbox in place after it has verified the work.
 * The only persistent runtime state is .github/jules-queue-state.json.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const JULES_API_KEY = process.env.JULES_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const JULES_SOURCE = process.env.JULES_SOURCE;

const STATE_PATH = '.github/jules-queue-state.json';
const ROADMAP_PATH = 'ROADMAP.md';

for (const [name, val] of Object.entries({ JULES_API_KEY, GITHUB_TOKEN, REPO, JULES_SOURCE })) {
  if (!val) throw new Error(`${name} is not set`);
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { activeSession: null };
  return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

async function julesFetch(path, options = {}) {
  const response = await fetch(`https://jules.googleapis.com/v1alpha/${path}`, {
    ...options,
    headers: {
      'X-Goog-Api-Key': JULES_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Jules API ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function githubFetch(path) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function extractPrNumber(prUrl) {
  const match = prUrl?.match(/\/pull\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function findTasksUnderHeading(text, headingName) {
  const lines = text.split('\n');
  let inNow = false;
  let inHeading = false;
  const tasks = [];

  for (const line of lines) {
    if (/^##\s+Now\b/i.test(line)) {
      inNow = true;
      continue;
    }

    if (inNow && /^##\s+[^#]/.test(line)) break;
    if (!inNow) continue;

    const h3 = line.match(/^###\s+(.+?)\s*$/);
    if (h3) {
      inHeading = h3[1].toLowerCase() === headingName.toLowerCase();
      continue;
    }

    if (!inHeading) continue;

    const task = line.match(/^- \[( |x)\]\s*(.+)$/i);
    if (task) {
      tasks.push({
        checked: task[1].toLowerCase() === 'x',
        text: task[2].trim(),
      });
    }
  }

  return tasks;
}

function isTaskConfirmedDone(roadmapText, taskText) {
  const tasks = findTasksUnderHeading(roadmapText, 'Ready');
  const match = tasks.find(task => task.text === taskText);
  return match ? match.checked : false;
}

async function main() {
  const state = loadState();
  const roadmapText = readFileSync(ROADMAP_PATH, 'utf8');
  const readyTasks = findTasksUnderHeading(roadmapText, 'Ready');
  let next = readyTasks.find(task => !task.checked);
  let stateChanged = false;

  if (!state.activeSession && !next) {
    console.log('Nothing left unchecked under ### Ready (queue empty).');
    return;
  }

  if (state.activeSession) {
    const activeTask = readyTasks.find(task => task.text === state.activeSession.task);
    const activeIsCanonicalNext = Boolean(
      activeTask && !activeTask.checked && (!next || activeTask.text === next.text),
    );

    if (!activeIsCanonicalNext) {
      console.warn(
        `Stale Jules queue state detected: active task "${state.activeSession.task}" ` +
          `does not match the first unchecked task under ### Ready ("${next?.text ?? 'none'}"). ` +
          'Clearing stale session state so the canonical queue can advance.',
      );
      state.activeSession = null;
      stateChanged = true;
    }
  }

  if (state.activeSession) {
    console.log(`Checking active session ${state.activeSession.name} ...`);
    const session = await julesFetch(state.activeSession.name);
    const prOutput = (session.outputs || []).find(output => output.pullRequest)?.pullRequest;

    if (!prOutput) {
      console.log('No PR yet. Nothing to do this run.');
      return;
    }

    const prNumber = extractPrNumber(prOutput.url);
    if (!prNumber) {
      console.log(`Could not parse PR number from ${prOutput.url}.`);
      return;
    }

    const pr = await githubFetch(`pulls/${prNumber}`);
    if (!pr.merged) {
      console.log(`PR #${prNumber} is open but not merged yet — waiting for human review.`);
      return;
    }

    if (!isTaskConfirmedDone(roadmapText, state.activeSession.task)) {
      console.log(
        `PR #${prNumber} is merged, but "${state.activeSession.task}" is still unchecked in ROADMAP.md. ` +
          'Jules should only check the box after verification. Manual inspection required.',
      );
      return;
    }

    console.log(`"${state.activeSession.task}" is merged AND confirmed done. Advancing the queue.`);
    state.activeSession = null;
    stateChanged = true;
    next = readyTasks.find(task => !task.checked);
  }

  if (!state.activeSession) {
    if (!next) {
      if (stateChanged) {
        saveState(state);
        commitAndPush();
      }
      return;
    }

    console.log(`Dispatching next task: ${next.text}`);

    const prompt = [
      'Read AGENT.MD, AGENT_RULES.md, and ROADMAP.md before starting.',
      'Your task from ROADMAP.md under "## Now" / "### Ready":',
      next.text,
      'Follow AGENT_RULES.md strictly. Do not claim something works without verifying it, and stay inside the relevant module.',
      'Start from the main branch.',
      'When done AND personally verified, edit ROADMAP.md and change only this task checkbox from',
      `"- [ ] ${next.text}" to "- [x] ${next.text}" — in place. Keep all Problem/Goal/Acceptance bullets attached to it.`,
      'Include that ROADMAP checkbox update in the same PR.',
      'If you could not fully verify it, leave the checkbox unchecked and explain why in the PR description.',
      'Do not merge your own PR. Do not claim the phase is complete.',
    ].join('\n\n');

    const session = await julesFetch('sessions', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        sourceContext: {
          source: JULES_SOURCE,
          githubRepoContext: { startingBranch: 'main' },
        },
        requirePlanApproval: false,
        automationMode: 'AUTO_CREATE_PR',
        title: next.text.slice(0, 80),
      }),
    });

    const sessionName = session.name || session.id;
    if (!sessionName) throw new Error('Jules returned no session name or id');

    state.activeSession = {
      name: sessionName,
      task: next.text,
      startedAt: new Date().toISOString(),
    };
    stateChanged = true;
  }

  if (stateChanged) {
    saveState(state);
    commitAndPush();
  }
}

function commitAndPush() {
  execSync('git config user.name "jules-orchestrator[bot]"');
  execSync('git config user.email "jules-orchestrator@users.noreply.github.com"');
  execSync(`git add ${STATE_PATH}`);

  try {
    execSync('git diff --cached --quiet');
    console.log('Queue state is already committed.');
  } catch {
    execSync('git commit -m "chore: advance Jules queue"');
    execSync('git push origin HEAD:main');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
