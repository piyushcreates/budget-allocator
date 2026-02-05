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
  Facebook, Search, Youtube, Linkedin, X, Music2, Ghost, // Updated Platform Icons
  Megaphone, MousePointerClick, DollarSign, UserPlus // Objective Icons
} from 'lucide-react';

// Map platform keys to Lucide icons
const platformIcons: Record<PlatformKey, React.ElementType> = {
  meta: Facebook,
  google_search: Search,
  google_display: Youtube,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: X,
  snapchat: Ghost,
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-12 animate-in-fade">
      <div className="w-full max-w-5xl glass rounded-3xl p-1 shadow-2xl animate-in-slide-up">
        <Card className="border-none bg-transparent shadow-none">
          <CardHeader className="pb-8 pt-10">
            <CardTitle className="text-4xl sm:text-5xl font-extrabold text-foreground text-center tracking-tight">
              Performance Marketing <span className="text-primary">Budget Allocator</span>
            </CardTitle>
            <CardDescription className="text-center text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Strategic spend optimization across platforms with deterministic logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-12 px-6 sm:px-10 pb-12">
            {/* Instructions Card */}
            <div className="p-6 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm transition-all hover:bg-secondary/50">
              <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" />
                How to Use
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span> Enter total ad budget.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span> Select campaign objective.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span> Choose your target platforms.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span> Toggle mode & calculate.
                </li>
              </ul>
            </div>

            {/* Total Budget Input */}
            <div className="grid gap-4 max-w-md mx-auto w-full">
              <Label htmlFor="total-budget" className="text-xl font-bold text-center">
                Total Ad Budget ($)
              </Label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl font-medium">$</span>
                <Input
                  id="total-budget"
                  type="number"
                  placeholder="e.g., 100,000"
                  min="1000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(parseFloat(e.target.value) || '')}
                  className="rounded-2xl border-2 border-border/50 focus:border-primary focus:ring-0 text-2xl p-8 pl-10 text-center transition-all group-hover:border-border/80"
                />
              </div>
            </div>

            {/* Campaign Objective */}
            <div className="grid gap-6">
              <Label className="text-xl font-bold text-center">
                Step 1: Choose Your Objective
              </Label>
              <div
                className={`flex flex-wrap gap-4 justify-center ${isFullFunnelEnabled ? 'opacity-40' : ''}`}
              >
                {OBJECTIVES.map(objective => {
                  const IconComponent = objectiveIcons[objective.internalKey];
                  const isSelected = selectedObjective === objective.internalKey;
                  return (
                    <button
                      key={objective.internalKey}
                      disabled={isFullFunnelEnabled}
                      onClick={() => !isFullFunnelEnabled && setSelectedObjective(objective.internalKey)}
                      className={`flex flex-col items-center justify-center gap-4 w-44 h-36 rounded-3xl border-2 transition-all duration-500 group relative overflow-hidden
                                  ${isSelected && !isFullFunnelEnabled
                          ? 'bg-primary border-primary shadow-[0_0_30px_rgba(240,62,62,0.3)] -translate-y-2'
                          : 'bg-card/40 border-border/50 hover:border-primary/40 hover:bg-primary/5'}
                                  ${isFullFunnelEnabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                      {isSelected && (
                        <div className="absolute top-0 right-0 p-2">
                          <div className="bg-white text-primary rounded-full p-1 shadow-lg">
                            <div className="w-3 h-3 bg-current rounded-full" />
                          </div>
                        </div>
                      )}
                      <div className={`p-4 rounded-2xl transition-all duration-500 ${isSelected ? 'bg-white/20' : 'bg-secondary/50 group-hover:bg-primary/10'}`}>
                        {IconComponent && (
                          <IconComponent
                            className={`w-10 h-10 transition-transform duration-500 group-hover:scale-110 ${isSelected ? 'text-white' : 'text-primary'}`}
                          />
                        )}
                      </div>
                      <div className="text-center px-2">
                        <span className={`text-sm font-extrabold tracking-widest uppercase block ${isSelected ? 'text-white' : 'text-foreground'}`}>
                          {objective.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-white/80 font-medium tracking-tighter animate-in-fade">Selected</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Funnel Toggle */}
            <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border-2 border-primary/20 shadow-inner group transition-all hover:bg-primary/10">
              <div className="space-y-1">
                <Label htmlFor="full-funnel-toggle" className="text-xl font-bold cursor-pointer">
                  Full Funnel
                </Label>
                <p className="text-sm text-muted-foreground">Automated multi-stage funnel split</p>
              </div>
              <Switch
                id="full-funnel-toggle"
                checked={isFullFunnelEnabled}
                onCheckedChange={setIsFullFunnelEnabled}
                className="scale-125 data-[state=checked]:bg-primary"
              />
            </div>

            {/* Platform Selection */}
            <div className="grid gap-6">
              <Label className="text-xl font-bold text-center">
                Step 2: Select Platforms
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {PLATFORMS.map(platform => {
                  const isSelected = selectedPlatforms.includes(platform.internalKey);
                  const Icon = platformIcons[platform.internalKey] || Facebook;
                  return (
                    <button
                      key={platform.internalKey}
                      onClick={() => handlePlatformChange(platform.internalKey, !isSelected)}
                      className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 relative group
                                  ${isSelected
                          ? 'bg-primary border-primary shadow-[0_10px_30px_rgba(240,62,62,0.2)] -translate-y-1'
                          : 'bg-card/40 border-border/50 hover:border-primary/40 hover:bg-primary/5'}`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-white text-primary rounded-full p-1 shadow-md">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className={`p-4 rounded-2xl transition-all duration-300 ${isSelected ? 'bg-white/20' : 'bg-secondary/20 group-hover:bg-primary/10'}`}>
                        <Icon className={`w-8 h-8 transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'text-white' : 'text-primary'}`} />
                      </div>
                      <span className={`text-sm font-bold tracking-tight text-center ${isSelected ? 'text-white' : 'text-foreground'}`}>
                        {platform.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Mode Toggle */}
            {!isFullFunnelEnabled && selectedPlatforms.length > 1 && (
              <div className="flex items-center justify-between p-6 bg-card/50 rounded-2xl border-2 border-dashed border-border transition-all hover:border-primary/50">
                <div className="space-y-1">
                  <Label htmlFor="advanced-mode" className="text-xl font-bold cursor-pointer">
                    Advanced Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">Configure custom benchmarks per platform</p>
                </div>
                <Switch
                  id="advanced-mode"
                  checked={isAdvancedMode}
                  onCheckedChange={setIsAdvancedMode}
                  className="scale-110 data-[state=checked]:bg-primary"
                />
              </div>
            )}

            {/* Advanced Mode Inputs */}
            {!isFullFunnelEnabled && isAdvancedMode && selectedPlatforms.length > 1 && (
              <div className="grid gap-6 p-8 bg-secondary/30 rounded-2xl border border-border/50 animate-in-fade">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-bold">
                    Target {benchmarkLabel} per Platform
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Leave empty to use deterministic base weights
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedPlatforms.map(platformKey => (
                    <div key={platformKey} className="space-y-2">
                      <Label htmlFor={`${platformKey}-${benchmarkLabel}`} className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        {PLATFORMS.find(p => p.internalKey === platformKey)?.name}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                        <Input
                          id={`${platformKey}-${benchmarkLabel}`}
                          type="number"
                          placeholder="0.00"
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
                          className="rounded-xl border-border/50 focus:border-primary pl-7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
              <Button
                onClick={handleCalculate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold py-8 px-12 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-xl min-w-[240px]"
              >
                Calculate Allocation
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="border-2 border-border/50 hover:bg-secondary text-foreground font-bold py-8 px-12 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-xl"
              >
                Reset
              </Button>
            </div>

            {/* Results Table */}
            {allocationResults.length > 0 && (
              <div className="mt-12 bg-card/80 rounded-3xl overflow-hidden shadow-2xl border border-border animate-in-slide-up">
                <div className="bg-primary/5 p-8 border-b border-border">
                  <h2 className="text-3xl font-extrabold text-center tracking-tight">
                    {shouldShowFunnelSplitTable ? 'Full Funnel' : 'Budget'} <span className="text-primary">Allocation</span>
                  </h2>
                </div>
                <div className="p-4 sm:p-8">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2 border-border/50">
                        <TableHead className="text-lg font-bold text-foreground py-4">
                          {shouldShowFunnelSplitTable ? 'Funnel Stage' : 'Platform'}
                        </TableHead>
                        <TableHead className="text-right text-lg font-bold text-foreground py-4">Weight (%)</TableHead>
                        <TableHead className="text-right text-lg font-bold text-primary py-4">Budget ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocationResults.map((result, index) => (
                        <TableRow key={index} className="hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0 group">
                          <TableCell className="py-6 text-lg font-semibold flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            {result.platform}
                          </TableCell>
                          <TableCell className="text-right text-lg font-medium text-muted-foreground">
                            {result.allocationPercentage.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-xl font-bold">
                            ${result.budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-12 opacity-80 hover:opacity-100 transition-opacity">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default BudgetAllocationTool;