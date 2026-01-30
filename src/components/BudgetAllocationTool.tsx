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
import {
  Facebook, Search, MonitorPlay, Linkedin, X, Camera, // Platform Icons (MonitorPlay for TikTok, Camera for Snapchat)
  Megaphone, MousePointerClick, DollarSign, UserPlus // Objective Icons
} from 'lucide-react';

// Map platform keys to Lucide icons
const platformIcons: Record<PlatformKey, React.ElementType> = {
  meta: Facebook,
  google_search: Search,
  google_display: MonitorPlay,
  tiktok: MonitorPlay, // Using MonitorPlay as a fallback for TikTok
  linkedin: Linkedin,
  twitter: X,
  snapchat: Camera, // Using Camera as a fallback for Snapchat
};

// Map objective keys to Lucide icons
const objectiveIcons: Record<ObjectiveKey, React.ElementType> = {
  awareness: Megaphone,
  engagement: MousePointerClick,
  conversions: DollarSign,
  leads: UserPlus,
};

const BudgetAllocationTool = () => {
  const [totalBudget, setTotalBudget] = useState<number | ''>('');
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveKey>('awareness');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>([]);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isFullFunnelEnabled, setIsFullFunnelEnabled] = useState(false); // New state for Full Funnel Toggle
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

    // Advanced mode validation only applies if Full Funnel is OFF and multiple channels are selected
    if (!isFullFunnelEnabled && isAdvancedMode && selectedPlatforms.length > 1) {
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

    // Check if all effective weights are zero for multi-channel when Full Funnel is OFF
    if (!isFullFunnelEnabled && selectedPlatforms.length > 1) {
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
      isAdvancedMode && selectedPlatforms.length > 1, // Advanced mode only for multi-channel when Full Funnel is OFF
      benchmarks,
      isFullFunnelEnabled // Pass new toggle state
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
    setIsFullFunnelEnabled(false); // Reset Full Funnel toggle
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
  // The funnel split table is now shown ONLY if isFullFunnelEnabled is true
  const shouldShowFunnelSplitTable = isFullFunnelEnabled;

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
          {/* Instructions Card */}
          <Card className="p-4 rounded-lg border border-border bg-secondary/50 shadow-sm">
            <CardTitle className="text-xl font-bold text-foreground mb-2">How to Use:</CardTitle>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Enter your total ad budget.</li>
              <li>Select your campaign objective.</li>
              <li>Choose the platforms you want to use.</li>
              <li>Toggle "Full Funnel" for a fixed funnel split, or "Advanced Mode" for benchmark-based allocation.</li>
              <li>Click "Calculate Allocation" to see your optimized budget distribution.</li>
            </ul>
          </Card>

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
              className={`flex flex-wrap gap-4 justify-center ${isFullFunnelEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isFullFunnelEnabled} // Disable when Full Funnel is enabled
            >
              {OBJECTIVES.map(objective => {
                const IconComponent = objectiveIcons[objective.internalKey];
                const isSelected = selectedObjective === objective.internalKey;
                return (
                  <div
                    key={objective.internalKey}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors
                                ${isSelected && !isFullFunnelEnabled
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                  : 'bg-card text-foreground border-border hover:bg-secondary'}
                                ${isFullFunnelEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => !isFullFunnelEnabled && setSelectedObjective(objective.internalKey)}
                  >
                    <RadioGroupItem
                      value={objective.internalKey}
                      id={objective.internalKey}
                      className="sr-only" // Hide the default radio button visually
                      disabled={isFullFunnelEnabled}
                    />
                    <Label htmlFor={objective.internalKey} className={`flex items-center space-x-2 text-md font-medium ${isFullFunnelEnabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      {IconComponent && (
                        <IconComponent
                          className="w-6 h-6" // Fixed size for icons
                          size={24} // Explicit size for Lucide
                        />
                      )}
                      <span>{objective.name}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Full Funnel Toggle */}
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <Label htmlFor="full-funnel-toggle" className="text-lg font-semibold text-foreground">
              Full Funnel
            </Label>
            <Switch
              id="full-funnel-toggle"
              checked={isFullFunnelEnabled}
              onCheckedChange={setIsFullFunnelEnabled}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-border"
            />
          </div>

          {/* Platform Selection */}
          <div className="grid gap-2">
            <Label className="text-lg font-semibold text-foreground">
              Select Platforms
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.internalKey);
                return (
                  <div
                    key={platform.internalKey}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors cursor-pointer
                                ${isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                  : 'bg-card text-foreground border-border hover:bg-secondary'}`}
                  >
                    <Checkbox
                      id={platform.internalKey}
                      checked={isSelected}
                      onCheckedChange={(checked) => handlePlatformChange(platform.internalKey, checked as boolean)}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus:ring-ring"
                    />
                    <Label htmlFor={platform.internalKey} className="text-md font-medium cursor-pointer">
                      <span>{platform.name}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Mode Toggle (only for multi-channel AND Full Funnel is OFF) */}
          {!isFullFunnelEnabled && selectedPlatforms.length > 1 && (
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

          {/* Advanced Mode Inputs (only for multi-channel AND Full Funnel is OFF) */}
          {!isFullFunnelEnabled && isAdvancedMode && selectedPlatforms.length > 1 && (
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
                {shouldShowFunnelSplitTable ? 'Full Funnel Allocation' : 'Budget Allocation Results'}
              </h2>
              <Table className="w-full">
                <TableHeader className="bg-secondary rounded-t-lg">
                  <TableRow className="border-b-border">
                    <TableHead className="text-left text-foreground font-semibold rounded-tl-lg">
                      {shouldShowFunnelSplitTable ? 'Funnel Stage' : 'Platform'}
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