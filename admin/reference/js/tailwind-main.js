// tailwind-main.js - Main controller for the Tailwind-based admin UI

// Import utility functions
import { formatDate } from './utils/date-utils.ts';

// State management
const state = {
  flows: [],
  currentFlow: null,
  isRunning: false,
  logs: []
};

// DOM Elements
const elements = {
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),
  resetBtn: document.getElementById('reset-btn'),
  flowList: document.getElementById('flow-list'),
  flowSteps: document.getElementById('flow-steps'),
  addStepBtn: document.getElementById('add-step-btn'),
  saveFlowBtn: document.getElementById('save-flow-btn'),
  results: document.getElementById('results'),
  logs: document.getElementById('logs'),
  statusModal: document.getElementById('status-modal'),
  statusTitle: document.getElementById('status-title'),
  statusMessage: document.getElementById('status-message'),
  closeStatusBtn: document.getElementById('close-status-btn'),
  addFlowBtn: document.getElementById('add-flow-btn')
};

// Initialize the app
function init() {
  // Setup event listeners
  elements.startBtn.addEventListener('click', startFlow);
  elements.stopBtn.addEventListener('click', stopFlow);
  elements.resetBtn.addEventListener('click', resetAll);
  elements.addStepBtn.addEventListener('click', addStep);
  elements.saveFlowBtn.addEventListener('click', saveFlow);
  elements.closeStatusBtn.addEventListener('click', closeStatusModal);
  elements.addFlowBtn.addEventListener('click', addFlow);

  // Load initial data
  loadFlows();

  // Add a welcome log
  addLog('Welcome to the AI Backend Game Testing Tool');
  addLog('System initialized at ' + formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'));
}

// Flow Management
function loadFlows() {
  // Mock flow data for demonstration
  state.flows = [
    { id: 'flow1', name: 'User Registration Flow', steps: [] },
    { id: 'flow2', name: 'Game Setup Flow', steps: [] },
    { id: 'flow3', name: 'Test Battle Sequence', steps: [] }
  ];
  
  renderFlows();
}

function renderFlows() {
  elements.flowList.innerHTML = '';
  
  state.flows.forEach(flow => {
    const flowEl = document.createElement('div');
    flowEl.className = 'p-2 rounded border border-main hover:bg-secondary cursor-pointer';
    flowEl.textContent = flow.name;
    flowEl.dataset.id = flow.id;
    
    flowEl.addEventListener('click', () => {
      selectFlow(flow.id);
    });
    
    elements.flowList.appendChild(flowEl);
  });
}

function selectFlow(flowId) {
  state.currentFlow = state.flows.find(flow => flow.id === flowId);
  
  // Highlight selected flow
  document.querySelectorAll('#flow-list > div').forEach(el => {
    if (el.dataset.id === flowId) {
      el.classList.add('bg-secondary');
    } else {
      el.classList.remove('bg-secondary');
    }
  });
  
  // Render flow steps
  renderFlowSteps();
  
  addLog(`Selected flow: ${state.currentFlow.name}`);
}

function renderFlowSteps() {
  elements.flowSteps.innerHTML = '';
  
  if (!state.currentFlow) {
    elements.flowSteps.innerHTML = '<p>Please select a flow from the sidebar</p>';
    return;
  }
  
  if (state.currentFlow.steps.length === 0) {
    elements.flowSteps.innerHTML = '<p>This flow has no steps yet. Click "Add Step" to begin.</p>';
    return;
  }
  
  state.currentFlow.steps.forEach((step, index) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'p-2 mb-2 rounded border border-main';
    stepEl.innerHTML = `
      <div class="flex justify-between items-center">
        <span>${index + 1}. ${step.name}</span>
        <button class="btn btn-outline remove-step" data-index="${index}">Remove</button>
      </div>
      <p class="text-secondary">${step.description || 'No description'}</p>
    `;
    
    stepEl.querySelector('.remove-step').addEventListener('click', (e) => {
      e.stopPropagation();
      removeStep(index);
    });
    
    elements.flowSteps.appendChild(stepEl);
  });
}

function addStep() {
  if (!state.currentFlow) {
    showStatusModal('Error', 'Please select a flow first');
    return;
  }
  
  // For demo, we'll add a simple placeholder step
  state.currentFlow.steps.push({
    name: `Step ${state.currentFlow.steps.length + 1}`,
    description: 'New step description',
    action: 'log',
    params: {}
  });
  
  renderFlowSteps();
  addLog('Added new step to flow');
}

function removeStep(index) {
  state.currentFlow.steps.splice(index, 1);
  renderFlowSteps();
  addLog('Removed step from flow');
}

function saveFlow() {
  if (!state.currentFlow) {
    showStatusModal('Error', 'No flow selected');
    return;
  }
  
  addLog(`Saved flow: ${state.currentFlow.name}`);
  showStatusModal('Success', 'Flow saved successfully');
}

function addFlow() {
  const newId = `flow${state.flows.length + 1}`;
  const newFlow = {
    id: newId,
    name: `New Flow ${state.flows.length + 1}`,
    steps: []
  };
  
  state.flows.push(newFlow);
  renderFlows();
  selectFlow(newId);
  
  addLog('Created new flow');
}

// Flow Execution
function startFlow() {
  if (!state.currentFlow) {
    showStatusModal('Error', 'Please select a flow first');
    return;
  }
  
  if (state.currentFlow.steps.length === 0) {
    showStatusModal('Error', 'This flow has no steps to run');
    return;
  }
  
  state.isRunning = true;
  elements.startBtn.disabled = true;
  elements.stopBtn.disabled = false;
  
  addLog(`Started flow: ${state.currentFlow.name}`);
  
  // For demo purposes, we'll just show a result
  elements.results.innerHTML = `
    <div class="p-2 border border-main rounded">
      <h3>Flow Execution: ${state.currentFlow.name}</h3>
      <p>Status: <span class="text-[color:var(--success)]">Running</span></p>
      <pre class="mt-2 p-2 bg-main rounded">{
  "startTime": "${formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}",
  "flowId": "${state.currentFlow.id}",
  "status": "running",
  "stepsCompleted": 0,
  "totalSteps": ${state.currentFlow.steps.length}
}</pre>
    </div>
  `;
}

function stopFlow() {
  state.isRunning = false;
  elements.startBtn.disabled = false;
  elements.stopBtn.disabled = true;
  
  addLog(`Stopped flow: ${state.currentFlow.name}`);
  
  elements.results.innerHTML = `
    <div class="p-2 border border-main rounded">
      <h3>Flow Execution: ${state.currentFlow.name}</h3>
      <p>Status: <span class="text-[color:var(--danger)]">Stopped</span></p>
      <pre class="mt-2 p-2 bg-main rounded">{
  "startTime": "${formatDate(new Date(-60000), 'yyyy-MM-dd HH:mm:ss')}",
  "endTime": "${formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}",
  "flowId": "${state.currentFlow.id}",
  "status": "stopped",
  "stepsCompleted": 2,
  "totalSteps": ${state.currentFlow.steps.length},
  "error": "Flow execution was manually stopped"
}</pre>
    </div>
  `;
}

function resetAll() {
  state.isRunning = false;
  elements.startBtn.disabled = false;
  elements.stopBtn.disabled = false;
  elements.results.innerHTML = '';
  addLog('Reset all systems');
}

// Utility Functions
function addLog(message) {
  const timestamp = formatDate(new Date(), 'HH:mm:ss');
  const logEntry = `[${timestamp}] ${message}`;
  state.logs.push(logEntry);
  
  const logElement = document.createElement('div');
  logElement.textContent = logEntry;
  elements.logs.appendChild(logElement);
  
  // Auto-scroll to bottom
  elements.logs.scrollTop = elements.logs.scrollHeight;
}

function showStatusModal(title, message) {
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
  elements.statusModal.classList.remove('hidden');
}

function closeStatusModal() {
  elements.statusModal.classList.add('hidden');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init); 