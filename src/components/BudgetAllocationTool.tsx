"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PLATFORMS, OBJECTIVES, PlatformKey, ObjectiveKey, BASE_WEIGHTS } from '@/lib/constants';
import { calculateAllocation, AllocationResult, BenchmarkInputs } from '@/lib/allocationLogic';
import { showSuccess, showError } from '@/utils/toast';
import { MadeWithDyad } from './made-with-dyad';

const BudgetAllocationTool = () => {
  const [totalBudget, setTotalBudget] = useState<number | ''>('');
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveKey>('awareness');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkInputs>({ cpm: {}, cpc: {}, cpa: {} });
  const [allocationResults, setAllocationResults] = useState<AllocationResult[]>([]);

  const handlePlatformChange = (platformKey: PlatformKey, checked: boolean) => {
    setSelectedPlatforms(prev =>
      checked ? [...prev, platformKey] : prev.filter(key => key !== platformKey)
    );
  };

  const handleBenchmarkChange = (
    platformKey: PlatformKey,
    type: 'cpm' | 'cpc' | 'cpa',
    value: string
  ) => {
    const numValue = parseFloat(value);
    setBenchmarks(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [platformKey]: isNaN(numValue) ? undefined : numValue,
      },
    }));
  };

  const validateInputs = () => {
    if (typeof totalBudget !== 'number' || totalBudget < 1000) {
      showError('Total Budget must be a number and at least 1000.');
      return false;
    }
    if (selectedPlatforms.length === 0) {
      showError('Please select at least one platform.');
      return false;
    }

    if (isAdvancedMode && selectedPlatforms.length > 1) { // Advanced mode only applies to multi-channel
      let hasNegativeBenchmark = false;
      selectedPlatforms.forEach(platformKey => {
        const cpm = benchmarks.cpm[platformKey];
        const cpc = benchmarks.cpc[platformKey];
        const cpa = benchmarks.cpa[platformKey];

        if (
          (selectedObjective === 'awareness' && cpm !== undefined && cpm < 0) ||
          (selectedObjective === 'engagement' && cpc !== undefined && cpc < 0) ||
          ((selectedObjective === 'conversions' || selectedObjective === 'leads') && cpa !== undefined && cpa < 0)
        ) {
          hasNegativeBenchmark = true;
        }
      });
      if (hasNegativeBenchmark) {
        showError('Benchmark values cannot be negative.');
        return false;
      }
    }

    // Check if all effective weights are zero for multi-channel
    if (selectedPlatforms.length > 1) {
      let effectiveWeightsSum = 0;
      selectedPlatforms.forEach(platformKey => {
        let baseWeight = BASE_WEIGHTS[selectedObjective][platformKey];
        effectiveWeightsSum += baseWeight;
      });

      if (effectiveWeightsSum === 0) {
        showError('Cannot allocate budget: all selected platforms have zero weight for the chosen objective.');
        return false;
      }
    }

    return true;
  };

  const handleCalculate = () => {
    if (!validateInputs()) {
      setAllocationResults([]);
      return;
    }

    const results = calculateAllocation(
      totalBudget as number,
      selectedObjective,
      selectedPlatforms,
      isAdvancedMode && selectedPlatforms.length > 1, // Advanced mode only for multi-channel
      benchmarks
    );

    if (results.length === 0) {
      showError('Could not calculate allocation. Please check your inputs.');
    } else {
      setAllocationResults(results);
      showSuccess('Budget allocated successfully!');
    }
  };

  const handleReset = () => {
    setTotalBudget('');
    setSelectedObjective('awareness');
    setSelectedPlatforms([]);
    setIsAdvancedMode(false);
    setBenchmarks({ cpm: {}, cpc: {}, cpa: {} });
    setAllocationResults([]);
    showSuccess('Form reset!');
  };

  const getBenchmarkType = (objective: ObjectiveKey) => {
    if (objective === 'awareness') return 'cpm';
    if (objective === 'engagement') return 'cpc';
    if (objective === 'conversions' || objective === 'leads') return 'cpa';
    return '';
  };

  const benchmarkLabel = getBenchmarkType(selectedObjective).toUpperCase();
  const isSingleChannelSelected = selectedPlatforms.length === 1;
  const isMultiChannelSelected = selectedPlatforms.length > 1;
  const isObjectiveForFunnelSplit = ['awareness', 'leads', 'conversions'].includes(selectedObjective);
  const shouldShowFunnelSplit = isSingleChannelSelected && isObjectiveForFunnelSplit;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-4xl rounded-xl shadow-2xl border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-extrabold text-foreground text-center">
            Performance Marketing Budget Allocator
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground mt-2">
            Optimize your ad spend across platforms with deterministic logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Total Budget Input */}
          <div className="grid gap-2">
            <Label htmlFor="total-budget" className="text-lg font-semibold text-foreground">
              Total Ad Budget ($)
            </Label>
            <Input
              id="total-budget"
              type="number"
              placeholder="e.g., 100000"
              min="1000"
              value={totalBudget}
              onChange={(e) => setTotalBudget(parseFloat(e.target.value) || '')}
              className="rounded-lg border focus:border-primary focus:ring-ring text-lg p-3"
            />
          </div>

          {/* Campaign Objective */}
          <div className="grid gap-2">
            <Label className="text-lg font-semibold text-foreground">
              Campaign Objective
            </Label>
            <RadioGroup
              value={selectedObjective}
              onValueChange={(value: ObjectiveKey) => setSelectedObjective(value)}
              className="flex flex-wrap gap-4 justify-center"
            >
              {OBJECTIVES.map(objective => (
                <div key={objective.internalKey} className="flex items-center space-x-2 p-3 bg-card rounded-lg border border-border hover:bg-secondary transition-colors">
                  <RadioGroupItem
                    value={objective.internalKey}
                    id={objective.internalKey}
                    className="text-primary focus:ring-ring"
                  />
                  <Label htmlFor={objective.internalKey} className="text-md font-medium text-foreground cursor-pointer">
                    {objective.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Platform Selection */}
          <div className="grid gap-2">
            <Label className="text-lg font-semibold text-foreground">
              Select Platforms
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PLATFORMS.map(platform => (
                <div key={platform.internalKey} className="flex items-center space-x-2 p-3 bg-card rounded-lg border border-border hover:bg-secondary transition-colors">
                  <Checkbox
                    id={platform.internalKey}
                    checked={selectedPlatforms.includes(platform.internalKey)}
                    onCheckedChange={(checked) =>
                      handlePlatformChange(platform.internalKey, checked as boolean)
                    }
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-ring"
                  />
                  <Label htmlFor={platform.internalKey} className="text-md font-medium text-foreground cursor-pointer">
                    {platform.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Mode Toggle (only for multi-channel) */}
          {isMultiChannelSelected && (
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <Label htmlFor="advanced-mode" className="text-lg font-semibold text-foreground">
                Advanced Mode (Use Benchmarks)
              </Label>
              <Switch
                id="advanced-mode"
                checked={isAdvancedMode}
                onCheckedChange={setIsAdvancedMode}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-border"
              />
            </div>
          )}

          {/* Advanced Mode Inputs (only for multi-channel) */}
          {isAdvancedMode && isMultiChannelSelected && (
            <div className="grid gap-4 p-4 bg-card rounded-lg border border-border">
              <h3 className="text-xl font-bold text-foreground text-center">
                Expected {benchmarkLabel} per Platform
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                (Leave empty to use base weight for that platform)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedPlatforms.map(platformKey => (
                  <div key={platformKey} className="grid gap-2 p-3 bg-background rounded-lg border border-border shadow-sm">
                    <Label htmlFor={`${platformKey}-${benchmarkLabel}`} className="text-md font-medium text-foreground">
                      {PLATFORMS.find(p => p.internalKey === platformKey)?.name} ({benchmarkLabel})
                    </Label>
                    <Input
                      id={`${platformKey}-${benchmarkLabel}`}
                      type="number"
                      placeholder="e.g., 5.00"
                      value={
                        benchmarks[getBenchmarkType(selectedObjective) as 'cpm' | 'cpc' | 'cpa']?.[platformKey] ?? ''
                      }
                      onChange={(e) =>
                        handleBenchmarkChange(
                          platformKey,
                          getBenchmarkType(selectedObjective) as 'cpm' | 'cpc' | 'cpa',
                          e.target.value
                        )
                      }
                      className="rounded-md border focus:border-primary focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleCalculate}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 text-lg"
            >
              Calculate Allocation
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 hover:text-primary font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 text-lg"
            >
              Reset
            </Button>
          </div>

          {/* Results Table */}
          {allocationResults.length > 0 && (
            <div className="mt-8 p-4 bg-card rounded-xl shadow-lg border border-border">
              <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
                {shouldShowFunnelSplit ? `Funnel Split for ${PLATFORMS.find(p => p.internalKey === selectedPlatforms[0])?.name}` : 'Budget Allocation Results'}
              </h2>
              <Table className="w-full">
                <TableHeader className="bg-secondary rounded-t-lg">
                  <TableRow className="border-b-border">
                    <TableHead className="text-left text-foreground font-semibold rounded-tl-lg">
                      {shouldShowFunnelSplit ? 'Funnel Stage' : 'Platform'}
                    </TableHead>
                    <TableHead className="text-right text-foreground font-semibold">Allocation %</TableHead>
                    <TableHead className="text-right text-foreground font-semibold rounded-tr-lg">Budget ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocationResults.map((result, index) => (
                    <TableRow key={index} className="hover:bg-secondary transition-colors border-b-border last:border-b-0">
                      <TableCell className="font-medium text-foreground">{result.platform}</TableCell>
                      <TableCell className="text-right text-foreground">{result.allocationPercentage.toFixed(1)}%</TableCell>
                      <TableCell className="text-right text-foreground font-bold">${result.budget.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default BudgetAllocationTool;