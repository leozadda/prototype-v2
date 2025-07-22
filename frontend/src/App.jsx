import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, History, Star, Copy, ArrowLeft, Pin } from 'lucide-react';

const WorkoutTracker = () => {
  const [workouts, setWorkouts] = useState([]);
  const [templates, setTemplates] = useState({});
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [workoutResult, setWorkoutResult] = useState(null);
  const [logStartTime, setLogStartTime] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [completedWorkoutData, setCompletedWorkoutData] = useState(null);
  const [pinnedTemplates, setPinnedTemplates] = useState([]);

  // Default templates
  const defaultTemplates = {
    upper: {
      name: 'Upper Body',
      emoji: '💪',
      color: 'bg-blue-600',
      exercises: [
        { name: 'Bench Press', sets: 3, reps: 8, weight: 135, bodyPart: 'chest' },
        { name: 'Pull-ups', sets: 3, reps: 8, weight: 0, bodyPart: 'back' },
        { name: 'Shoulder Press', sets: 3, reps: 10, weight: 25, bodyPart: 'shoulders' },
        { name: 'Bicep Curls', sets: 3, reps: 12, weight: 25, bodyPart: 'biceps' },
        { name: 'Tricep Dips', sets: 3, reps: 12, weight: 0, bodyPart: 'triceps' }
      ]
    },
    lower: {
      name: 'Lower Body',
      emoji: '🦵',
      color: 'bg-red-600',
      exercises: [
        { name: 'Squats', sets: 4, reps: 8, weight: 185, bodyPart: 'quads' },
        { name: 'Deadlifts', sets: 3, reps: 6, weight: 225, bodyPart: 'hamstrings' },
        { name: 'Leg Press', sets: 3, reps: 12, weight: 200, bodyPart: 'quads' },
        { name: 'Calf Raises', sets: 3, reps: 15, weight: 45, bodyPart: 'calves' },
        { name: 'Hip Thrusts', sets: 3, reps: 12, weight: 135, bodyPart: 'glutes' }
      ]
    },
    fullbody: {
      name: 'Full Body',
      emoji: '🏋️',
      color: 'bg-green-600',
      exercises: [
        { name: 'Deadlifts', sets: 3, reps: 6, weight: 225, bodyPart: 'back' },
        { name: 'Push-ups', sets: 3, reps: 15, weight: 0, bodyPart: 'chest' },
        { name: 'Squats', sets: 3, reps: 10, weight: 135, bodyPart: 'quads' },
        { name: 'Pull-ups', sets: 3, reps: 8, weight: 0, bodyPart: 'back' }
      ]
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    setTemplates(defaultTemplates);
  }, []);

  const getStreakData = () => {
    const today = new Date().toDateString();
    const workoutDates = workouts.map(w => new Date(w.date).toDateString());
    
    let streak = 0;
    let currentDate = new Date();
    
    // Check if worked out today
    if (workoutDates.includes(today)) {
      streak = 1;
      currentDate.setDate(currentDate.getDate() - 1);
      
      // Count consecutive days going backwards
      while (true) {
        const dateString = currentDate.toDateString();
        if (workoutDates.includes(dateString)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // Check yesterday and count backwards
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      if (workoutDates.includes(yesterday)) {
        streak = 1;
        currentDate.setDate(currentDate.getDate() - 2);
        
        while (true) {
          const dateString = currentDate.toDateString();
          if (workoutDates.includes(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    return { streak, lastWorkout: workoutDates.includes(today) };
  };

  const getBodyPartAnalysis = () => {
    if (workouts.length === 0) return [];
    
    const recentWorkouts = workouts.slice(-10); // Last 10 workouts
    const bodyPartVolumes = {};
    
    // Exercise to muscle group mapping with activation ratios
    const exerciseMuscleMap = {
      'bench press': { chest: 0.7, triceps: 0.2, shoulders: 0.1 },
      'push ups': { chest: 0.6, triceps: 0.3, shoulders: 0.1 },
      'incline bench': { chest: 0.6, shoulders: 0.3, triceps: 0.1 },
      'bicep curls': { biceps: 1.0 },
      'tricep dips': { triceps: 0.8, chest: 0.2 },
      'tricep extensions': { triceps: 1.0 },
      'squats': { quads: 0.6, glutes: 0.3, hamstrings: 0.1 },
      'deadlifts': { hamstrings: 0.4, glutes: 0.3, back: 0.2, quads: 0.1 },
      'leg press': { quads: 0.7, glutes: 0.3 },
      'calf raises': { calves: 1.0 },
      'pull ups': { back: 0.7, biceps: 0.3 },
      'pullups': { back: 0.7, biceps: 0.3 },
      'rows': { back: 0.8, biceps: 0.2 },
      'lat pulldown': { back: 0.7, biceps: 0.3 },
      'shoulder press': { shoulders: 0.8, triceps: 0.2 },
      'lateral raises': { shoulders: 1.0 },
      'lunges': { quads: 0.5, glutes: 0.4, hamstrings: 0.1 },
      'hip thrusts': { glutes: 0.9, hamstrings: 0.1 },
      'leg curls': { hamstrings: 1.0 },
      'leg extensions': { quads: 1.0 },
      'planks': { abs: 1.0 },
      'crunches': { abs: 1.0 },
      'sit ups': { abs: 1.0 }
    };
    
    recentWorkouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        const exerciseName = exercise.name.toLowerCase();
        const volume = exercise.sets * exercise.reps * exercise.weight;
        
        // Find matching exercise pattern
        let muscleActivation = null;
        for (const [pattern, activation] of Object.entries(exerciseMuscleMap)) {
          if (exerciseName.includes(pattern)) {
            muscleActivation = activation;
            break;
          }
        }
        
        // Default to unknown if no match found
        if (!muscleActivation) {
          muscleActivation = { unknown: 1.0 };
        }
        
        // Distribute volume across muscle groups
        Object.entries(muscleActivation).forEach(([muscle, ratio]) => {
          bodyPartVolumes[muscle] = (bodyPartVolumes[muscle] || 0) + (volume * ratio);
        });
      });
    });
    
    return Object.entries(bodyPartVolumes)
      .sort(([,a], [,b]) => b - a)
      .map(([bodyPart, volume], index) => ({
        bodyPart,
        volume,
        rank: index + 1,
        status: index < 2 ? 'crushing' : index > Object.keys(bodyPartVolumes).length - 3 ? 'lacking' : 'decent'
      }));
  };

  const startWorkout = (templateKey) => {
    const template = templates[templateKey];
    const exercises = template.exercises.map(ex => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9)
    }));
    
    setCurrentWorkout({
      type: templateKey,
      templateName: template.name,
      exercises,
      date: new Date().toISOString().split('T')[0]
    });
    setStartTime(Date.now());
    setLogStartTime(Date.now());
    setShowResult(false);
  };

  const duplicateExercise = (id) => {
    const exercise = currentWorkout.exercises.find(ex => ex.id === id);
    if (exercise) {
      const duplicated = {
        ...exercise,
        id: Math.random().toString(36).substr(2, 9)
      };
      
      const exerciseIndex = currentWorkout.exercises.findIndex(ex => ex.id === id);
      const newExercises = [...currentWorkout.exercises];
      newExercises.splice(exerciseIndex + 1, 0, duplicated);
      
      setCurrentWorkout(prev => ({
        ...prev,
        exercises: newExercises
      }));
    }
  };

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Comprehensive exercise database with muscle groups
  const exerciseDatabase = [
    // Chest
    { name: 'Bench Press', muscle: 'chest', equipment: 'barbell' },
    { name: 'Incline Bench Press', muscle: 'chest', equipment: 'barbell' },
    { name: 'Decline Bench Press', muscle: 'chest', equipment: 'barbell' },
    { name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
    { name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
    { name: 'Push-ups', muscle: 'chest', equipment: 'bodyweight' },
    { name: 'Chest Dips', muscle: 'chest', equipment: 'bodyweight' },
    { name: 'Chest Flyes', muscle: 'chest', equipment: 'dumbbell' },
    { name: 'Cable Flyes', muscle: 'chest', equipment: 'cable' },
    { name: 'Pec Deck', muscle: 'chest', equipment: 'machine' },
    
    // Back
    { name: 'Pull-ups', muscle: 'back', equipment: 'bodyweight' },
    { name: 'Chin-ups', muscle: 'back', equipment: 'bodyweight' },
    { name: 'Barbell Rows', muscle: 'back', equipment: 'barbell' },
    { name: 'Dumbbell Rows', muscle: 'back', equipment: 'dumbbell' },
    { name: 'T-Bar Rows', muscle: 'back', equipment: 'barbell' },
    { name: 'Cable Rows', muscle: 'back', equipment: 'cable' },
    { name: 'Lat Pulldowns', muscle: 'back', equipment: 'cable' },
    { name: 'Deadlifts', muscle: 'back', equipment: 'barbell' },
    { name: 'Romanian Deadlifts', muscle: 'back', equipment: 'barbell' },
    { name: 'Sumo Deadlifts', muscle: 'back', equipment: 'barbell' },
    { name: 'Rack Pulls', muscle: 'back', equipment: 'barbell' },
    { name: 'Face Pulls', muscle: 'back', equipment: 'cable' },
    { name: 'Reverse Flyes', muscle: 'back', equipment: 'dumbbell' },
    
    // Shoulders
    { name: 'Shoulder Press', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Military Press', muscle: 'shoulders', equipment: 'barbell' },
    { name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Lateral Raises', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Front Raises', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Rear Delt Flyes', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Upright Rows', muscle: 'shoulders', equipment: 'barbell' },
    { name: 'Shrugs', muscle: 'shoulders', equipment: 'dumbbell' },
    { name: 'Pike Push-ups', muscle: 'shoulders', equipment: 'bodyweight' },
    
    // Arms - Biceps
    { name: 'Bicep Curls', muscle: 'biceps', equipment: 'dumbbell' },
    { name: 'Barbell Curls', muscle: 'biceps', equipment: 'barbell' },
    { name: 'Hammer Curls', muscle: 'biceps', equipment: 'dumbbell' },
    { name: 'Preacher Curls', muscle: 'biceps', equipment: 'barbell' },
    { name: 'Cable Curls', muscle: 'biceps', equipment: 'cable' },
    { name: 'Concentration Curls', muscle: 'biceps', equipment: 'dumbbell' },
    { name: '21s', muscle: 'biceps', equipment: 'barbell' },
    
    // Arms - Triceps
    { name: 'Tricep Dips', muscle: 'triceps', equipment: 'bodyweight' },
    { name: 'Tricep Extensions', muscle: 'triceps', equipment: 'dumbbell' },
    { name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
    { name: 'Skull Crushers', muscle: 'triceps', equipment: 'barbell' },
    { name: 'Close-Grip Bench Press', muscle: 'triceps', equipment: 'barbell' },
    { name: 'Tricep Pushdowns', muscle: 'triceps', equipment: 'cable' },
    { name: 'Diamond Push-ups', muscle: 'triceps', equipment: 'bodyweight' },
    
    // Legs - Quads
    { name: 'Squats', muscle: 'quads', equipment: 'barbell' },
    { name: 'Front Squats', muscle: 'quads', equipment: 'barbell' },
    { name: 'Goblet Squats', muscle: 'quads', equipment: 'dumbbell' },
    { name: 'Leg Press', muscle: 'quads', equipment: 'machine' },
    { name: 'Leg Extensions', muscle: 'quads', equipment: 'machine' },
    { name: 'Lunges', muscle: 'quads', equipment: 'bodyweight' },
    { name: 'Bulgarian Split Squats', muscle: 'quads', equipment: 'bodyweight' },
    { name: 'Wall Sits', muscle: 'quads', equipment: 'bodyweight' },
    
    // Legs - Hamstrings
    { name: 'Romanian Deadlifts', muscle: 'hamstrings', equipment: 'barbell' },
    { name: 'Leg Curls', muscle: 'hamstrings', equipment: 'machine' },
    { name: 'Stiff Leg Deadlifts', muscle: 'hamstrings', equipment: 'barbell' },
    { name: 'Good Mornings', muscle: 'hamstrings', equipment: 'barbell' },
    { name: 'Nordic Curls', muscle: 'hamstrings', equipment: 'bodyweight' },
    
    // Glutes
    { name: 'Hip Thrusts', muscle: 'glutes', equipment: 'barbell' },
    { name: 'Glute Bridges', muscle: 'glutes', equipment: 'bodyweight' },
    { name: 'Clamshells', muscle: 'glutes', equipment: 'bodyweight' },
    { name: 'Fire Hydrants', muscle: 'glutes', equipment: 'bodyweight' },
    { name: 'Donkey Kicks', muscle: 'glutes', equipment: 'bodyweight' },
    
    // Calves
    { name: 'Calf Raises', muscle: 'calves', equipment: 'bodyweight' },
    { name: 'Seated Calf Raises', muscle: 'calves', equipment: 'machine' },
    { name: 'Donkey Calf Raises', muscle: 'calves', equipment: 'bodyweight' },
    
    // Core/Abs
    { name: 'Planks', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Crunches', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Russian Twists', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Dead Bugs', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Mountain Climbers', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Bicycle Crunches', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Leg Raises', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Sit-ups', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Hanging Knee Raises', muscle: 'abs', equipment: 'bodyweight' },
    { name: 'Ab Wheel Rollouts', muscle: 'abs', equipment: 'equipment' },
    
    // Cardio
    { name: 'Burpees', muscle: 'cardio', equipment: 'bodyweight' },
    { name: 'Jump Squats', muscle: 'cardio', equipment: 'bodyweight' },
    { name: 'High Knees', muscle: 'cardio', equipment: 'bodyweight' },
    { name: 'Jumping Jacks', muscle: 'cardio', equipment: 'bodyweight' },
    { name: 'Box Jumps', muscle: 'cardio', equipment: 'equipment' },
  ];

  const getMuscleEmoji = (muscle) => {
    const emojiMap = {
      chest: '💪',
      back: '🏋️',
      shoulders: '🤸',
      biceps: '💪',
      triceps: '💪',
      quads: '🦵',
      hamstrings: '🦵',
      glutes: '🍑',
      calves: '🦵',
      abs: '🔥',
      cardio: '❤️'
    };
    return emojiMap[muscle] || '💪';
  };

  const getFilteredExercises = () => {
    if (!exerciseSearch) return exerciseDatabase;
    
    const searchLower = exerciseSearch.toLowerCase();
    return exerciseDatabase.filter(exercise => 
      exercise.name.toLowerCase().includes(searchLower) ||
      exercise.muscle.toLowerCase().includes(searchLower) ||
      exercise.equipment.toLowerCase().includes(searchLower)
    );
  };

  const addExercise = (exerciseName) => {
    const newExercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: exerciseName,
      sets: 3,
      reps: 8,
      weight: 0
    };
    
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise]
    }));
    
    setShowExercisePicker(false);
    setExerciseSearch('');
  };

  const addCustomExercise = () => {
    setShowExercisePicker(true);
  };

  const adjustValue = (id, field, delta) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === id ? { ...ex, [field]: Math.max(0, ex[field] + delta) } : ex
      )
    }));
  };

  const updateExercise = (id, field, value) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.id === id ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const removeExercise = (id) => {
    setCurrentWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.id !== id)
    }));
  };

  const calculateVolume = (exercises) => {
    return exercises.reduce((total, ex) => total + (ex.sets * ex.reps * ex.weight), 0);
  };

  const saveAsNewTemplate = () => {
    console.log('Save button clicked!', newTemplateName); // Debug
    if (!newTemplateName.trim()) {
      console.log('No template name entered');
      return;
    }
    
    // Use completedWorkoutData instead of currentWorkout
    const workoutData = completedWorkoutData || currentWorkout;
    if (!workoutData) {
      console.log('No workout data available');
      return;
    }
    
    const templateKey = newTemplateName.toLowerCase().replace(/\s+/g, '_');
    const newTemplate = {
      name: newTemplateName,
      emoji: '💪',
      color: 'bg-purple-500',
      exercises: workoutData.exercises.map(({ id, ...exercise }) => exercise)
    };
    
    console.log('Creating new template:', newTemplate); // Debug
    
    const updatedTemplates = {
      ...templates,
      [templateKey]: newTemplate
    };
    
    console.log('Updated templates:', updatedTemplates); // Debug
    
    setTemplates(updatedTemplates);
    
    setShowSaveTemplate(false);
    setNewTemplateName('');
    setShowResult(false);
    setCurrentWorkout(null);
    setCompletedWorkoutData(null);
  };

  const updateCurrentTemplate = () => {
    setTemplates(prev => ({
      ...prev,
      [currentWorkout.type]: {
        ...prev[currentWorkout.type],
        exercises: currentWorkout.exercises.map(({ id, ...exercise }) => exercise)
      }
    }));
  };

  const deleteTemplate = (templateKey) => {
    // Only allow deletion of custom templates, not default ones
    if (['upper', 'lower', 'fullbody'].includes(templateKey)) return;
    if (Object.keys(templates).length <= 1) return; // Keep at least one template
    
    const { [templateKey]: deleted, ...remaining } = templates;
    setTemplates(remaining);
    
    // Remove from pinned templates if it was pinned
    setPinnedTemplates(prev => prev.filter(key => key !== templateKey));
  };

  const togglePinTemplate = (templateKey) => {
    setPinnedTemplates(prev => {
      if (prev.includes(templateKey)) {
        return prev.filter(key => key !== templateKey);
      } else {
        return [...prev, templateKey];
      }
    });
  };

  const getSortedTemplates = () => {
    const templateEntries = Object.entries(templates);
    const pinned = templateEntries.filter(([key]) => pinnedTemplates.includes(key));
    const unpinned = templateEntries.filter(([key]) => !pinnedTemplates.includes(key));
    
    return [...pinned, ...unpinned];
  };

  const finishWorkout = () => {
    const endTime = Date.now();
    const logDuration = endTime - logStartTime;
    const currentVolume = calculateVolume(currentWorkout.exercises);
    
    const completedWorkout = {
      ...currentWorkout,
      volume: currentVolume,
      completedAt: new Date().toISOString()
    };
    
    // Store the workout data before clearing currentWorkout
    setCompletedWorkoutData(completedWorkout);
    
    setWorkouts(prev => [...prev, completedWorkout]);
    
    const streakData = getStreakData();
    const bodyPartAnalysis = getBodyPartAnalysis();
    
    setWorkoutResult({
      streak: streakData.streak + 1, // +1 because we just completed one
      bodyPartAnalysis,
      logDuration,
      volume: currentVolume
    });
    
    setShowResult(true);
    setCurrentWorkout(null);
    
    // Update the template with current exercises
    updateCurrentTemplate();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetApp = () => {
    setCurrentWorkout(null);
    setShowResult(false);
    setWorkoutResult(null);
    setShowHistory(false);
    setShowSaveTemplate(false);
    setCompletedWorkoutData(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showHistory) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Workout History</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="p-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {workouts.slice().reverse().map((workout, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{workout.templateName}</h3>
                  <p className="text-sm text-gray-600">{formatDate(workout.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{workout.volume.toLocaleString()} lbs</p>
                  <p className="text-xs text-gray-500">{workout.exercises.length} exercises</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {workout.exercises.map((exercise, exIndex) => (
                  <div key={exIndex} className="text-sm text-gray-600 flex justify-between">
                    <span>{exercise.name}</span>
                    <span>{exercise.sets} × {exercise.reps} @ {exercise.weight}lbs</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {workouts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No workouts logged yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResult) {
    const { streak, bodyPartAnalysis } = workoutResult;
    
    return (
      <div className="max-w-md mx-auto p-6 bg-white">
        <div className="text-center space-y-6">
          <div className="text-6xl">🔥</div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {streak === 1 ? "Great start!" : `${streak} days in a row!`}
            </h2>
            <p className="text-gray-600">
              {streak >= 7 ? "You're crushing it with consistency! 🏆" : 
               streak >= 3 ? "Building a solid habit! Keep going! 💪" : 
               "Every workout counts. Stay consistent!"}
            </p>
          </div>
          
          {bodyPartAnalysis.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Body Part Rankings</h3>
              <div className="space-y-2 text-sm">
                {bodyPartAnalysis.slice(0, 5).map((part, index) => (
                  <div key={part.bodyPart} className="flex justify-between items-center">
                    <span className="capitalize">
                      #{part.rank} {part.bodyPart}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      part.status === 'crushing' ? 'bg-green-100 text-green-800' :
                      part.status === 'lacking' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {part.status === 'crushing' ? 'Crushing it!' :
                       part.status === 'lacking' ? 'Needs work' :
                       'Decent'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => setShowSaveTemplate(true)}
              className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
            >
              Save as New Template
            </button>
            
            <button
              onClick={resetApp}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Log Another Workout
            </button>
          </div>
        </div>
        
        {showSaveTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold mb-4">Save New Template</h3>
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full p-3 border rounded-lg mb-4"
              />
              <div className="flex space-x-3">
                <button
                  onClick={saveAsNewTemplate}
                  disabled={!newTemplateName.trim()}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    newTemplateName.trim() 
                      ? 'bg-purple-500 text-white hover:bg-purple-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveTemplate(false)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentWorkout) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{currentWorkout.templateName}</h2>
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>{formatTime(Math.floor((Date.now() - startTime) / 1000))}</span>
          </div>
        </div>

        <div className="space-y-4">
          {currentWorkout.exercises.map((exercise) => (
            <div key={exercise.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  value={exercise.name}
                  onChange={(e) => updateExercise(exercise.id, 'name', e.target.value)}
                  className="font-semibold text-gray-800 bg-transparent border-none outline-none flex-1"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => duplicateExercise(exercise.id)}
                    className="text-blue-500 hover:text-blue-700 p-1"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeExercise(exercise.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sets</label>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => adjustValue(exercise.id, 'sets', -1)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={exercise.sets}
                      onChange={(e) => updateExercise(exercise.id, 'sets', parseInt(e.target.value) || 0)}
                      className="w-12 px-1 py-1 text-center border rounded"
                    />
                    <button
                      onClick={() => adjustValue(exercise.id, 'sets', 1)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Reps</label>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => adjustValue(exercise.id, 'reps', -1)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={exercise.reps}
                      onChange={(e) => updateExercise(exercise.id, 'reps', parseInt(e.target.value) || 0)}
                      className="w-12 px-1 py-1 text-center border rounded"
                    />
                    <button
                      onClick={() => adjustValue(exercise.id, 'reps', 1)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Weight</label>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => adjustValue(exercise.id, 'weight', -5)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={exercise.weight}
                      onChange={(e) => updateExercise(exercise.id, 'weight', parseInt(e.target.value) || 0)}
                      className="w-12 px-1 py-1 text-center border rounded"
                    />
                    <button
                      onClick={() => adjustValue(exercise.id, 'weight', 5)}
                      className="w-8 h-8 bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={addCustomExercise}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exercise
          </button>
          
          <button
            onClick={finishWorkout}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Finish Workout
          </button>
          
          <button
            onClick={resetApp}
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
        
        {showExercisePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Exercise</h3>
                <button
                  onClick={() => {
                    setShowExercisePicker(false);
                    setExerciseSearch('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full p-3 border rounded-lg mb-4"
                autoFocus
              />
              
              <div className="overflow-y-auto max-h-96">
                {Object.entries(
                  getFilteredExercises().reduce((acc, exercise) => {
                    if (!acc[exercise.muscle]) acc[exercise.muscle] = [];
                    acc[exercise.muscle].push(exercise);
                    return acc;
                  }, {})
                ).map(([muscle, exercises]) => (
                  <div key={muscle} className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2 capitalize flex items-center">
                      {getMuscleEmoji(muscle)} {muscle}
                    </h4>
                    <div className="space-y-1">
                      {exercises.map((exercise) => (
                        <button
                          key={exercise.name}
                          onClick={() => addExercise(exercise.name)}
                          className="w-full text-left p-2 rounded hover:bg-gray-100 flex items-center justify-between"
                        >
                          <span>{exercise.name}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {exercise.equipment}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {getFilteredExercises().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No exercises found. Try a different search term.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-800">Quick Workout</h1>
        <button
          onClick={() => setShowHistory(true)}
          className="p-2 text-gray-600 hover:text-gray-800"
        >
          <History className="w-6 h-6" />
        </button>
      </div>
      
      <p className="text-gray-600 mb-8">Choose your workout and let's get started!</p>
      
      <div className="space-y-4">
        {getSortedTemplates().map(([key, template]) => (
          <div key={key} className="relative">
            <button
              onClick={() => startWorkout(key)}
              className={`w-full ${template.color} text-white py-4 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg flex items-center justify-between`}
            >
              <span className="flex items-center">
                {pinnedTemplates.includes(key) && <Pin className="w-4 h-4 mr-2" />}
                {template.emoji} {template.name}
              </span>
              <span className="text-sm opacity-75">{template.exercises.length} exercises</span>
            </button>
            
            <div className="absolute top-2 right-2 flex space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinTemplate(key);
                }}
                className={`text-white hover:text-yellow-200 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors ${
                  pinnedTemplates.includes(key) ? 'bg-yellow-500 bg-opacity-75' : 'bg-gray-500 bg-opacity-50'
                }`}
                title={pinnedTemplates.includes(key) ? 'Unpin template' : 'Pin template'}
              >
                <Pin className="w-3 h-3" />
              </button>
              
              {Object.keys(templates).length > 3 && !['upper', 'lower', 'fullbody'].includes(key) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(key);
                  }}
                  className="text-white hover:text-red-200 bg-red-500 bg-opacity-50 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  title="Delete template"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutTracker;