'use strict';

import { infraLogger } from './domainLogger.js';

/**
 * DIVisualizer provides enhanced visualization for dependency injection container
 * to improve debugging and monitoring of component initialization
 */
class DIVisualizer {
  /**
   * Create a new DIVisualizer instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.logger = options.logger || infraLogger.child('di-visualizer');
    this.registrations = new Map();
    this.resolutions = new Map();
    this.moduleRegistrations = new Map();
    this.startTime = Date.now();
    
    // Track registration counts by type
    this.stats = {
      singletons: 0,
      transients: 0,
      instances: 0,
      modules: 0,
      totalRegistrations: 0,
      totalResolutions: 0
    };
  }
  
  /**
   * Track a component registration
   * @param {string} name - Component name
   * @param {string} type - Registration type (singleton, transient, instance)
   * @param {string} module - Module name
   */
  trackRegistration(name, type, module = 'root') {
    if (!name) return;
    
    const normalizedName = name.toLowerCase();
    const timestamp = Date.now();
    
    // Store registration info
    this.registrations.set(normalizedName, {
      name,
      type,
      module,
      timestamp,
      timeFromStart: timestamp - this.startTime
    });
    
    // Update module registrations
    if (!this.moduleRegistrations.has(module)) {
      this.moduleRegistrations.set(module, []);
      this.stats.modules++;
    }
    this.moduleRegistrations.get(module).push(normalizedName);
    
    // Update stats
    this.stats.totalRegistrations++;
    if (type === 'singleton') this.stats.singletons++;
    else if (type === 'transient') this.stats.transients++;
    else if (type === 'instance') this.stats.instances++;
    
    // Log registration
    this.logger.debug(`[DI] Registered ${type} '${name}' in module '${module}'`);
    
    // Print to console with formatting
    const typeEmoji = 
      type === 'singleton' ? '🔒' : 
      type === 'transient' ? '🔄' : 
      type === 'instance' ? '📦' : '❓';
    
    console.log(`  ${typeEmoji} [DI] ${module} registered ${name} as ${type}`);
  }
  
  /**
   * Track a component resolution
   * @param {string} name - Component name
   * @param {boolean} success - Whether resolution was successful
   * @param {number} duration - Resolution duration in milliseconds
   */
  trackResolution(name, success = true, duration = 0) {
    if (!name) return;
    
    const normalizedName = name.toLowerCase();
    const timestamp = Date.now();
    
    // Get registration info
    const registration = this.registrations.get(normalizedName);
    
    // Store resolution info
    this.resolutions.set(normalizedName, {
      name,
      success,
      duration,
      timestamp,
      timeFromStart: timestamp - this.startTime,
      timeFromRegistration: registration ? timestamp - registration.timestamp : null
    });
    
    // Update stats
    this.stats.totalResolutions++;
    
    // Log resolution
    if (success) {
      this.logger.debug(`[DI] Resolved '${name}' in ${duration}ms`);
    } else {
      this.logger.error(`[DI] Failed to resolve '${name}'`);
    }
  }
  
  /**
   * Track a module registration
   * @param {string} module - Module name
   * @param {number} componentCount - Number of components registered
   */
  trackModuleRegistration(module, componentCount = 0) {
    if (!module) return;
    
    // Print to console with formatting
    console.log(`📦 [DI] Loading module: ${module} (${componentCount} components)`);
  }
  
  /**
   * Get registration statistics
   * @returns {Object} Registration statistics
   */
  getStats() {
    return {
      ...this.stats,
      moduleBreakdown: Object.fromEntries(
        Array.from(this.moduleRegistrations.entries()).map(([module, components]) => [
          module, 
          components.length
        ])
      )
    };
  }
  
  /**
   * Generate a visualization of the DI container
   * @returns {string} HTML visualization
   */
  generateVisualization() {
    // Generate module-based tree
    const modules = {};
    
    // Group by module
    this.registrations.forEach((reg) => {
      if (!modules[reg.module]) {
        modules[reg.module] = {
          components: [],
          singletons: 0,
          transients: 0,
          instances: 0
        };
      }
      
      modules[reg.module].components.push({
        name: reg.name,
        type: reg.type,
        resolved: this.resolutions.has(reg.name.toLowerCase()),
        resolution: this.resolutions.get(reg.name.toLowerCase())
      });
      
      if (reg.type === 'singleton') modules[reg.module].singletons++;
      else if (reg.type === 'transient') modules[reg.module].transients++;
      else if (reg.type === 'instance') modules[reg.module].instances++;
    });
    
    // Generate HTML
    let html = `
      <div class="di-visualization">
        <h2>Dependency Injection Container</h2>
        <div class="di-stats">
          <div class="stat-item">
            <div class="stat-label">Total Components</div>
            <div class="stat-value">${this.stats.totalRegistrations}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Singletons</div>
            <div class="stat-value">${this.stats.singletons}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Transients</div>
            <div class="stat-value">${this.stats.transients}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Instances</div>
            <div class="stat-value">${this.stats.instances}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Modules</div>
            <div class="stat-value">${this.stats.modules}</div>
          </div>
        </div>
        
        <div class="di-modules">
    `;
    
    // Add modules
    Object.entries(modules).forEach(([moduleName, moduleData]) => {
      html += `
        <div class="di-module">
          <div class="module-header">
            <h3>${moduleName}</h3>
            <div class="module-stats">
              <span>${moduleData.components.length} components</span>
              <span>${moduleData.singletons} singletons</span>
              <span>${moduleData.transients} transients</span>
              <span>${moduleData.instances} instances</span>
            </div>
          </div>
          <div class="module-components">
      `;
      
      // Add components
      moduleData.components.forEach((component) => {
        const statusClass = component.resolved ? 'resolved' : 'unresolved';
        const typeClass = `type-${component.type}`;
        
        html += `
          <div class="component ${statusClass} ${typeClass}">
            <div class="component-name">${component.name}</div>
            <div class="component-type">${component.type}</div>
            <div class="component-status">${component.resolved ? 'Resolved' : 'Unresolved'}</div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Print a summary of the DI container to the console
   */
  printSummary() {
    console.log('\n┌─────────────────────────────────────────────────┐');
    console.log('│         DEPENDENCY INJECTION CONTAINER            │');
    console.log('└─────────────────────────────────────────────────┘');
    console.log(`  Total Components: ${this.stats.totalRegistrations}`);
    console.log(`  Singletons: ${this.stats.singletons}`);
    console.log(`  Transients: ${this.stats.transients}`);
    console.log(`  Instances: ${this.stats.instances}`);
    console.log(`  Modules: ${this.stats.modules}`);
    console.log('\n  Module Breakdown:');
    
    // Print module breakdown
    this.moduleRegistrations.forEach((components, module) => {
      console.log(`    - ${module}: ${components.length} components`);
    });
    
    console.log('');
  }
}

// Create a singleton instance
const diVisualizer = new DIVisualizer();

export { DIVisualizer, diVisualizer };
export default diVisualizer;
