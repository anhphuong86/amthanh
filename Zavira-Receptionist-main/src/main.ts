import agent from './agent.js';
import { JobRunner } from '@livekit/agents';

const runner = new JobRunner();
runner.run(agent);