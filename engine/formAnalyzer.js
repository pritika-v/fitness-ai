// Loads and runs only the form checks specified in the exercise config.
// Form checks are pure functions — this file just orchestrates them.

import { backStraight  } from '../formChecks/backStraight.js';
import { elbowFlare    } from '../formChecks/elbowFlare.js';
import { kneeValgus    } from '../formChecks/kneeValgus.js';
import { hipSag        } from '../formChecks/hipSag.js';
import { depthCheck    } from '../formChecks/depth.js';
import { headNeck      } from '../formChecks/headNeck.js';

// Registry: name used in JSON → check function
const CHECK_REGISTRY = {
  backStraight,
  elbowFlare,
  kneeValgus,
  hipSag,
  depth:    depthCheck,
  headNeck,
};

export class FormAnalyzer {
  constructor(exerciseConfig) {
    this.config = exerciseConfig;
    // Resolve only the checks this exercise needs
    this.checks = (exerciseConfig.formChecks ?? [])
      .map(name => CHECK_REGISTRY[name])
      .filter(Boolean);
  }

  // measurements = output of movementAnalyzer.analyze()
  analyze(measurements) {
    const issues = [];
    for (const check of this.checks) {
      const issue = check(measurements, this.config.thresholds);
      if (issue) issues.push(issue);
    }
    const isGoodForm = issues.filter(i => i.severity === 'high').length === 0;
    return { issues, isGoodForm };
  }
}