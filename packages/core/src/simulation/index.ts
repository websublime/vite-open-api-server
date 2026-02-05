/**
 * Simulation Module
 *
 * What: Error and delay simulation for endpoints
 * How: Intercepts requests and returns simulated responses
 * Why: Enables testing of error handling and loading states
 *
 * @module simulation
 */

export { createSimulationManager, type Simulation, type SimulationManager } from './simulator.js';
