/**
 * Advanced Workout Stagnation Detection Algorithm
 * Analyzes complex progression patterns and provides personalized coaching insights
 */

const detectAdvancedStagnation = (exerciseName, workouts, useKg = false, convertWeight = (w) => w) => {
  // Extract and sort exercise data from workouts
  const exerciseData = workouts
    .flatMap(workout => 
      workout.exercises
        .filter(ex => ex.name.toLowerCase() === exerciseName.toLowerCase())
        .map(ex => ({
          ...ex,
          date: workout.date,
          volume: ex.sets * ex.reps * ex.weight,
          maxWeight: ex.weight,
          totalReps: ex.sets * ex.reps
        }))
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-8); // Last 8 workouts for analysis

  if (exerciseData.length < 3) {
    return null; // Need at least 3 data points
  }

  const getWeightUnit = () => useKg ? 'kg' : 'lbs';
  const stagnationResults = [];

  // 1. WEIGHT STAGNATION DETECTION
  const detectWeightStagnation = () => {
    const weights = exerciseData.map(d => d.weight);
    const lastSix = weights.slice(-6);
    
    // Check for oscillation pattern
    const uniqueWeights = [...new Set(lastSix)];
    if (uniqueWeights.length === 2) {
      const [weight1, weight2] = uniqueWeights;
      const oscillations = lastSix.reduce((count, w, i) => {
        if (i > 0 && w !== lastSix[i-1]) count++;
        return count;
      }, 0);
      
      if (oscillations >= 3) {
        const avgWeight = Math.round((weight1 + weight2) / 2);
        const nextWeight = Math.max(weight1, weight2) + 5;
        
        return {
          type: 'weight_stagnation',
          exerciseName,
          pattern: `Oscillating between ${convertWeight(weight1)}${getWeightUnit()} and ${convertWeight(weight2)}${getWeightUnit()}`,
          message: `You've mastered the ${convertWeight(avgWeight)}${getWeightUnit()} range! Your form and consistency are solid.`,
          confidence: `Oscillating weights shows you're right at your progression threshold - perfect timing to push forward.`,
          suggestion: `Try ${convertWeight(nextWeight)}${getWeightUnit()} for 3-4 reps, then work back up to your target rep range`,
          reasoning: `Small weight jumps with lower reps help break through plateaus while maintaining good form`,
          suggestedWeight: nextWeight,
          suggestedReps: Math.max(4, Math.min(...exerciseData.slice(-3).map(d => d.reps)) - 2),
          severity: 'high'
        };
      }
    }

    // Check for extended same weight
    const lastWeight = weights[weights.length - 1];
    const sameWeightCount = weights.slice(-5).filter(w => w === lastWeight).length;
    
    if (sameWeightCount >= 4) {
      const avgReps = exerciseData.slice(-4).reduce((sum, d) => sum + d.reps, 0) / 4;
      const nextWeight = lastWeight + (lastWeight < 100 ? 5 : 10);
      
      return {
        type: 'weight_stagnation',
        exerciseName,
        pattern: `${convertWeight(lastWeight)}${getWeightUnit()} for ${sameWeightCount} consecutive workouts`,
        message: `You've built incredible strength endurance at ${convertWeight(lastWeight)}${getWeightUnit()}! Time to challenge yourself.`,
        confidence: `Consistent performance at this weight proves you're ready for the next level.`,
        suggestion: `Ready for ${convertWeight(nextWeight)}${getWeightUnit()} with ${Math.max(5, Math.floor(avgReps * 0.8))} reps`,
        reasoning: `Your body has adapted to this load. A controlled weight increase will stimulate new growth.`,
        suggestedWeight: nextWeight,
        suggestedReps: Math.max(5, Math.floor(avgReps * 0.8)),
        severity: 'high'
      };
    }

    return null;
  };

  // 2. PERFORMANCE DECLINE DETECTION
  const detectPerformanceDecline = () => {
    const recentData = exerciseData.slice(-5);
    if (recentData.length < 4) return null;

    // Check for declining reps at same weight
    const sameWeightSessions = recentData.filter(d => d.weight === recentData[recentData.length - 1].weight);
    
    if (sameWeightSessions.length >= 3) {
      const repTrend = sameWeightSessions.map(d => d.reps);
      const isDecline = repTrend.every((reps, i) => i === 0 || reps <= repTrend[i-1]);
      const totalDecline = repTrend[0] - repTrend[repTrend.length - 1];
      
      if (isDecline && totalDecline >= 2) {
        const currentWeight = recentData[recentData.length - 1].weight;
        const deloadWeight = Math.max(currentWeight * 0.85, currentWeight - 15);
        
        return {
          type: 'performance_decline',
          exerciseName,
          pattern: `Reps declining: ${repTrend.join('→')} at ${convertWeight(currentWeight)}${getWeightUnit()}`,
          message: `Your body is telling you something important - you've been pushing hard and need strategic recovery.`,
          confidence: `This isn't weakness, it's smart training. Even elite athletes use deload periods to come back stronger.`,
          suggestion: `Deload to ${convertWeight(Math.round(deloadWeight))}${getWeightUnit()} for 8-10 reps, focus on perfect form`,
          reasoning: `A strategic deload will refresh your nervous system and let you return to heavy weights with renewed strength.`,
          suggestedWeight: Math.round(deloadWeight),
          suggestedReps: Math.min(10, Math.max(...repTrend) + 2),
          severity: 'medium'
        };
      }
    }

    return null;
  };

  // 3. FAILED PROGRESSION DETECTION
  const detectFailedProgression = () => {
    const recentData = exerciseData.slice(-6);
    if (recentData.length < 4) return null;

    // Look for pattern of attempting higher weight but not hitting target reps
    const attempts = recentData.reduce((acc, curr, i) => {
      if (i > 0) {
        const prev = recentData[i-1];
        if (curr.weight > prev.weight && curr.reps < prev.reps) {
          acc.push({
            weight: curr.weight,
            reps: curr.reps,
            prevWeight: prev.weight,
            prevReps: prev.reps
          });
        }
      }
      return acc;
    }, []);

    if (attempts.length >= 2) {
      const lastAttempt = attempts[attempts.length - 1];
      const intermediateWeight = Math.round((lastAttempt.prevWeight + lastAttempt.weight) / 2);
      
      return {
        type: 'failed_progression',
        exerciseName,
        pattern: `Multiple attempts at ${convertWeight(lastAttempt.weight)}${getWeightUnit()} with reduced reps`,
        message: `You're pushing your limits - that's exactly how champions are made! Your ambition is admirable.`,
        confidence: `Each attempt at heavier weight is building neural pathways. You're closer to success than you think.`,
        suggestion: `Try ${convertWeight(intermediateWeight)}${getWeightUnit()} as a stepping stone for ${lastAttempt.prevReps} reps`,
        reasoning: `Smaller jumps reduce the neurological stress of big weight increases while building confidence.`,
        suggestedWeight: intermediateWeight,
        suggestedReps: lastAttempt.prevReps,
        severity: 'medium'
      };
    }

    return null;
  };

  // 4. VOLUME PLATEAU DETECTION
  const detectVolumePlateau = () => {
    if (exerciseData.length < 5) return null;

    const volumes = exerciseData.map(d => d.volume);
    const recentVolumes = volumes.slice(-5);
    
    // Calculate trend using simple linear regression
    const n = recentVolumes.length;
    const sumX = n * (n + 1) / 2;
    const sumY = recentVolumes.reduce((a, b) => a + b, 0);
    const sumXY = recentVolumes.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgVolume = sumY / n;
    
    // Check if trend is flat or declining
    if (Math.abs(slope) < avgVolume * 0.01) { // Less than 1% change per workout
      const lastData = exerciseData[exerciseData.length - 1];
      const volumeIncrease = Math.round(avgVolume * 0.15); // 15% increase
      
      // Convert volume for display (approximation since volume is weight*reps*sets)
      const displayVolume = useKg ? Math.round(avgVolume / 2.205) : avgVolume;
      const volumeUnit = useKg ? 'kg' : 'lbs';
      
      // Smart suggestion based on current configuration
      let suggestion, suggestedWeight, suggestedReps;
      if (lastData.reps >= 12) {
        // High reps - increase weight
        suggestedWeight = lastData.weight + 5;
        suggestedReps = Math.max(8, lastData.reps - 2);
        suggestion = `Increase weight to ${convertWeight(suggestedWeight)}${getWeightUnit()} and reduce reps to ${suggestedReps}`;
      } else if (lastData.reps <= 6) {
        // Low reps - add volume
        suggestedWeight = lastData.weight;
        suggestedReps = lastData.reps + 2;
        suggestion = `Keep ${convertWeight(suggestedWeight)}${getWeightUnit()} but increase reps to ${suggestedReps}`;
      } else {
        // Medium reps - add a set or increase weight
        suggestedWeight = lastData.weight + 5;
        suggestedReps = lastData.reps;
        suggestion = `Progress to ${convertWeight(suggestedWeight)}${getWeightUnit()} for ${suggestedReps} reps, or add an extra set`;
      }
      
      return {
        type: 'volume_plateau',
        exerciseName,
        pattern: `Volume plateaued around ${Math.round(displayVolume).toLocaleString()} total ${volumeUnit}`,
        message: `You've reached a comfortable training zone. Your consistency is building a strong foundation!`,
        confidence: `Stable volume shows excellent work capacity. Now it's time to challenge that capacity.`,
        suggestion,
        reasoning: `Progressive overload through volume increases will break this plateau and stimulate new growth.`,
        suggestedWeight,
        suggestedReps,
        severity: 'low'
      };
    }

    return null;
  };

  // 5. PERFECT STAGNATION DETECTION
  const detectPerfectStagnation = () => {
    const recentData = exerciseData.slice(-4);
    if (recentData.length < 3) return null;

    // Check for identical sessions
    const lastSession = recentData[recentData.length - 1];
    const identicalCount = recentData.filter(d => 
      d.weight === lastSession.weight && 
      d.reps === lastSession.reps && 
      d.sets === lastSession.sets
    ).length;

    if (identicalCount >= 3) {
      const nextWeight = lastSession.weight + (lastSession.weight < 50 ? 2.5 : 5);
      
      return {
        type: 'perfect_stagnation',
        exerciseName,
        pattern: `Identical ${lastSession.sets}×${lastSession.reps} @ ${convertWeight(lastSession.weight)}${getWeightUnit()} for ${identicalCount} sessions`,
        message: `You've mastered this exact combination! Your consistency and form are dialed in perfectly.`,
        confidence: `Perfect repetition means your body has fully adapted and is ready for the next challenge.`,
        suggestion: `Time to progress: ${convertWeight(nextWeight)}${getWeightUnit()} for ${Math.max(lastSession.reps - 1, 5)} reps`,
        reasoning: `Your body craves progressive overload. This small increase will reignite muscle growth.`,
        suggestedWeight: nextWeight,
        suggestedReps: Math.max(lastSession.reps - 1, 5),
        severity: 'high'
      };
    }

    return null;
  };

  // Run all detection algorithms
  const weightStagnation = detectWeightStagnation();
  const performanceDecline = detectPerformanceDecline();
  const failedProgression = detectFailedProgression();
  const volumePlateau = detectVolumePlateau();
  const perfectStagnation = detectPerfectStagnation();

  // Return the most severe issue first, or null if no stagnation detected
  const results = [weightStagnation, performanceDecline, failedProgression, perfectStagnation, volumePlateau]
    .filter(Boolean);

  if (results.length === 0) return null;

  // Sort by severity and return the most important issue
  const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return results.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])[0];
};

// Helper function to analyze all exercises in recent workouts
const analyzeAllExercises = (workouts, useKg = false, convertWeight = (w) => w) => {
  if (!workouts || workouts.length === 0) return [];

  // Get all unique exercise names from recent workouts
  const exerciseNames = [...new Set(
    workouts.slice(-10)
      .flatMap(w => w.exercises.map(e => e.name))
  )];

  const stagnationIssues = [];

  exerciseNames.forEach(exerciseName => {
    const issue = detectAdvancedStagnation(exerciseName, workouts, useKg, convertWeight);
    if (issue) {
      stagnationIssues.push(issue);
    }
  });

  // Sort by severity and return top issues
  const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return stagnationIssues
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
    .slice(0, 5); // Return top 5 issues
};

// Integration function for the workout tracker
const getProgressInsights = (workouts, useKg = false, convertWeight = (w) => w) => {
  const stagnationIssues = analyzeAllExercises(workouts, useKg, convertWeight);
  
  if (stagnationIssues.length === 0) {
    return {
      hasIssues: false,
      message: "You're making great progress! Keep up the excellent momentum. 🚀",
      suggestion: "Continue your current routine and consider tracking your lifts to identify future optimization opportunities."
    };
  }

  const primaryIssue = stagnationIssues[0];
  
  return {
    hasIssues: true,
    primaryIssue,
    allIssues: stagnationIssues,
    summary: `${stagnationIssues.length} optimization ${stagnationIssues.length === 1 ? 'opportunity' : 'opportunities'} detected`,
    totalExercisesAnalyzed: [...new Set(workouts.slice(-10).flatMap(w => w.exercises.map(e => e.name)))].length
  };
};

// Export functions
export { detectAdvancedStagnation, analyzeAllExercises, getProgressInsights };