import { BASE_WEIGHTS, PLATFORMS, FUNNEL_SPLIT_RATIOS, PlatformKey, ObjectiveKey } from './constants';

export interface BenchmarkInputs {
  cpm: Partial<Record<PlatformKey, number>>;
  cpc: Partial<Record<PlatformKey, number>>;
  cpa: Partial<Record<PlatformKey, number>>;
}

export interface AllocationResult {
  platform: string;
  allocationPercentage: number;
  budget: number;
}

// Fixed funnel split ratios for when Full Funnel is enabled
const FIXED_FUNNEL_SPLIT_RATIOS = [
  { name: 'Awareness', percentage: 40 },
  { name: 'Traffic', percentage: 35 },
  { name: 'Conversions', percentage: 25 },
];

export const calculateAllocation = (
  totalBudget: number,
  objective: ObjectiveKey,
  selectedPlatforms: PlatformKey[],
  isAdvancedMode: boolean,
  benchmarks: BenchmarkInputs,
  isFullFunnelEnabled: boolean // New parameter
): AllocationResult[] => {
  if (totalBudget <= 0 || selectedPlatforms.length === 0) {
    return [];
  }

  // Rule B: If Full Funnel is ON, apply fixed funnel split
  if (isFullFunnelEnabled) {
    const results: AllocationResult[] = [];
    let allocatedSum = 0;

    FIXED_FUNNEL_SPLIT_RATIOS.forEach((stage, index) => {
      const percentage = stage.percentage / 100;
      let allocatedBudget = percentage * totalBudget;

      // Round all but the last stage to ensure total budget is exact
      if (index < FIXED_FUNNEL_SPLIT_RATIOS.length - 1) {
        allocatedBudget = Math.round(allocatedBudget);
      }

      results.push({
        platform: stage.name,
        allocationPercentage: stage.percentage,
        budget: allocatedBudget,
      });
      allocatedSum += allocatedBudget;
    });

    // Adjust the last stage's budget to absorb rounding differences
    if (results.length > 0) {
      const lastStageIndex = results.length - 1;
      results[lastStageIndex].budget += (totalBudget - allocatedSum);
    }

    return results.sort((a, b) => b.budget - a.budget);
  }

  // Rule A: If Full Funnel is OFF, allocate 100% budget to selected objective/platforms
  // This means no funnel split table should be shown, only channel allocation.

  // Single-channel allocation (100% to the selected platform)
  if (selectedPlatforms.length === 1) {
    const platformKey = selectedPlatforms[0];
    return [{
      platform: PLATFORMS.find(p => p.internalKey === platformKey)?.name || platformKey,
      allocationPercentage: 100,
      budget: totalBudget,
    }];
  }

  // Multi-channel allocation logic (existing logic, no changes needed here for Rule A)
  let platformWeights: Record<PlatformKey, number> = {};

  // Step 1: Filter Weights and apply advanced mode adjustments
  selectedPlatforms.forEach(platformKey => {
    let baseWeight = BASE_WEIGHTS[objective][platformKey];
    let adjustedWeight = baseWeight;

    if (isAdvancedMode) {
      const platformBenchmarks = {
        cpm: benchmarks.cpm[platformKey],
        cpc: benchmarks.cpc[platformKey],
        cpa: benchmarks.cpa[platformKey],
      };

      // Calculate average benchmark for selected platforms for the current objective
      let averageBenchmark: number | undefined;
      const activeBenchmarks: number[] = [];

      if (objective === 'awareness' && platformBenchmarks.cpm !== undefined) {
        selectedPlatforms.forEach(pKey => {
          const val = benchmarks.cpm[pKey];
          if (val !== undefined && val > 0) activeBenchmarks.push(val);
        });
        averageBenchmark = activeBenchmarks.length > 0 ? activeBenchmarks.reduce((sum, val) => sum + val, 0) / activeBenchmarks.length : undefined;
        if (platformBenchmarks.cpm !== undefined && platformBenchmarks.cpm > 0 && averageBenchmark !== undefined) {
          adjustedWeight = baseWeight * (averageBenchmark / platformBenchmarks.cpm);
        }
      } else if (objective === 'engagement' && platformBenchmarks.cpc !== undefined) {
        selectedPlatforms.forEach(pKey => {
          const val = benchmarks.cpc[pKey];
          if (val !== undefined && val > 0) activeBenchmarks.push(val);
        });
        averageBenchmark = activeBenchmarks.length > 0 ? activeBenchmarks.reduce((sum, val) => sum + val, 0) / activeBenchmarks.length : undefined;
        if (platformBenchmarks.cpc !== undefined && platformBenchmarks.cpc > 0 && averageBenchmark !== undefined) {
          adjustedWeight = baseWeight * (averageBenchmark / platformBenchmarks.cpc);
        }
      } else if (objective === 'conversions' && platformBenchmarks.cpa !== undefined) {
        selectedPlatforms.forEach(pKey => {
          const val = benchmarks.cpa[pKey];
          if (val !== undefined && val > 0) activeBenchmarks.push(val);
        });
        averageBenchmark = activeBenchmarks.length > 0 ? activeBenchmarks.reduce((sum, val) => sum + val, 0) / activeBenchmarks.length : undefined;
        if (platformBenchmarks.cpa !== undefined && platformBenchmarks.cpa > 0 && averageBenchmark !== undefined) {
          adjustedWeight = baseWeight * (averageBenchmark / platformBenchmarks.cpa);
        }
      } else if (objective === 'leads' && platformBenchmarks.cpa !== undefined) {
        selectedPlatforms.forEach(pKey => {
          const val = benchmarks.cpa[pKey];
          if (val !== undefined && val > 0) activeBenchmarks.push(val);
        });
        averageBenchmark = activeBenchmarks.length > 0 ? activeBenchmarks.reduce((sum, val) => sum + val, 0) / activeBenchmarks.length : undefined;
        if (platformBenchmarks.cpa !== undefined && platformBenchmarks.cpa > 0 && averageBenchmark !== undefined) {
          adjustedWeight = baseWeight * (averageBenchmark / platformBenchmarks.cpa);
        }
      }
    }
    platformWeights[platformKey] = adjustedWeight;
  });

  const sumOfSelectedWeights = Object.values(platformWeights).reduce((sum, weight) => sum + weight, 0);

  if (sumOfSelectedWeights === 0) {
    return []; // All weights are zero, cannot allocate
  }

  let results: AllocationResult[] = [];
  let allocatedSum = 0;

  // Step 2 & 3: Normalize Weights and Allocate Budget
  selectedPlatforms.forEach((platformKey, index) => {
    const normalizedWeight = platformWeights[platformKey] / sumOfSelectedWeights;
    let allocatedBudget = normalizedWeight * totalBudget;

    // Step 4: Round (except for the last platform)
    if (index < selectedPlatforms.length - 1) {
      allocatedBudget = Math.round(allocatedBudget);
    }

    results.push({
      platform: PLATFORMS.find(p => p.internalKey === platformKey)?.name || platformKey,
      allocationPercentage: normalizedWeight * 100,
      budget: allocatedBudget,
    });
    allocatedSum += allocatedBudget;
  });

  // Adjust the last platform's budget to absorb rounding differences
  if (results.length > 0) {
    const lastPlatformIndex = results.length - 1;
    results[lastPlatformIndex].budget += (totalBudget - allocatedSum);
  }

  // Sort by highest budget first
  return results.sort((a, b) => b.budget - a.budget);
};