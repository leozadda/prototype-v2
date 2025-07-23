import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Clock,
  History,
  Star,
  Copy,
  ArrowLeft,
  Pin,
  Lock,
  CheckCircle,
} from "lucide-react";

// IndexedDB utility functions
const DB_NAME = "WorkoutTrackerDB";
const DB_VERSION = 1;
const STORES = {
  WORKOUTS: "workouts",
  TEMPLATES: "templates",
  SETTINGS: "settings",
};

class WorkoutDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create workouts store
        if (!db.objectStoreNames.contains(STORES.WORKOUTS)) {
          const workoutStore = db.createObjectStore(STORES.WORKOUTS, {
            keyPath: "id",
            autoIncrement: true,
          });
          workoutStore.createIndex("date", "date", { unique: false });
          workoutStore.createIndex("templateName", "templateName", {
            unique: false,
          });
        }

        // Create templates store
        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          db.createObjectStore(STORES.TEMPLATES, { keyPath: "key" });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: "key" });
        }
      };
    });
  }

  async saveWorkout(workout) {
    const transaction = this.db.transaction([STORES.WORKOUTS], "readwrite");
    const store = transaction.objectStore(STORES.WORKOUTS);
    return store.add({
      ...workout,
      id: Date.now() + Math.random(), // Ensure unique ID
    });
  }

  async getAllWorkouts() {
    const transaction = this.db.transaction([STORES.WORKOUTS], "readonly");
    const store = transaction.objectStore(STORES.WORKOUTS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTemplate(key, template) {
    const transaction = this.db.transaction([STORES.TEMPLATES], "readwrite");
    const store = transaction.objectStore(STORES.TEMPLATES);
    return store.put({ key, ...template });
  }

  async getAllTemplates() {
    const transaction = this.db.transaction([STORES.TEMPLATES], "readonly");
    const store = transaction.objectStore(STORES.TEMPLATES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const templates = {};
        request.result.forEach((item) => {
          const { key, ...template } = item;
          templates[key] = template;
        });
        resolve(templates);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTemplate(key) {
    const transaction = this.db.transaction([STORES.TEMPLATES], "readwrite");
    const store = transaction.objectStore(STORES.TEMPLATES);
    return store.delete(key);
  }

  async saveSetting(key, value) {
    const transaction = this.db.transaction([STORES.SETTINGS], "readwrite");
    const store = transaction.objectStore(STORES.SETTINGS);
    return store.put({ key, value });
  }

  async getSetting(key) {
    const transaction = this.db.transaction([STORES.SETTINGS], "readonly");
    const store = transaction.objectStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }
}

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
  const [newTemplateName, setNewTemplateName] = useState("");
  const [completedWorkoutData, setCompletedWorkoutData] = useState(null);
  const [pinnedTemplates, setPinnedTemplates] = useState([]);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [showUnlockMessage, setShowUnlockMessage] = useState(false);
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get today's date formatted nicely
  const getTodaysDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  // First-time user template
  const beginnerTemplate = {
    name: "Example",
    emoji: "🤔",
    color: "bg-gradient-to-r from-blue-500 to-purple-600",
    exercises: [
      {
        name: "Grocery Carries",
        sets: 0,
        reps: 0,
        weight: 0,
        bodyPart: "full body",
      },
      {
        name: "Overhead Phone Press",
        sets: 0,
        reps: 0,
        weight: 0,
        bodyPart: "shoulders",
      },
      { name: "Jar Opens", sets: 0, reps: 0, weight: 0, bodyPart: "forearms" },
      {
        name: "Couch Squats",
        sets: 0,
        reps: 0,
        weight: 0,
        bodyPart: "quads",
      },
    ],
  };

  // Real workout templates
  const realTemplates = {
    push: {
      name: "Push Day",
      emoji: "🫸",
      color: "bg-gradient-to-r from-red-500 to-orange-500",
      exercises: [
        {
          name: "Bench Press",
          sets: 1,
          reps: 8,
          weight: 135,
          bodyPart: "chest",
        },
        {
          name: "Shoulder Press",
          sets: 1,
          reps: 10,
          weight: 65,
          bodyPart: "shoulders",
        },
        {
          name: "Incline Dumbbell Press",
          sets: 1,
          reps: 10,
          weight: 70,
          bodyPart: "chest",
        },
        {
          name: "Lateral Raises",
          sets: 1,
          reps: 12,
          weight: 20,
          bodyPart: "shoulders",
        },
        {
          name: "Tricep Dips",
          sets: 1,
          reps: 10,
          weight: 180,
          bodyPart: "triceps",
        },
        {
          name: "Overhead Tricep Extension",
          sets: 1,
          reps: 12,
          weight: 35,
          bodyPart: "triceps",
        },
      ],
    },
    pull: {
      name: "Pull Day",
      emoji: "🫷",
      color: "bg-gradient-to-r from-green-500 to-teal-500",
      exercises: [
        { name: "Pull-ups", sets: 1, reps: 8, weight: 180, bodyPart: "back" },
        {
          name: "Barbell Rows",
          sets: 1,
          reps: 8,
          weight: 115,
          bodyPart: "back",
        },
        {
          name: "Lat Pulldowns",
          sets: 1,
          reps: 10,
          weight: 120,
          bodyPart: "back",
        },
        {
          name: "Barbell Curls",
          sets: 1,
          reps: 10,
          weight: 65,
          bodyPart: "biceps",
        },
        {
          name: "Hammer Curls",
          sets: 1,
          reps: 12,
          weight: 30,
          bodyPart: "biceps",
        },
        { name: "Face Pulls", sets: 1, reps: 15, weight: 40, bodyPart: "back" },
      ],
    },
    legs: {
      name: "Leg Day",
      emoji: "🦵",
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
      exercises: [
        { name: "Squats", sets: 1, reps: 8, weight: 185, bodyPart: "quads" },
        {
          name: "Romanian Deadlifts",
          sets: 1,
          reps: 10,
          weight: 155,
          bodyPart: "hamstrings",
        },
        {
          name: "Leg Press",
          sets: 1,
          reps: 12,
          weight: 200,
          bodyPart: "quads",
        },
        {
          name: "Walking Lunges",
          sets: 1,
          reps: 20,
          weight: 40,
          bodyPart: "quads",
        },
        {
          name: "Calf Raises",
          sets: 1,
          reps: 15,
          weight: 225,
          bodyPart: "calves",
        },
        {
          name: "Hip Thrusts",
          sets: 1,
          reps: 12,
          weight: 135,
          bodyPart: "glutes",
        },
      ],
    },
    bodyweight: {
      name: "Full Body Bodyweight",
      emoji: "🤸",
      color: "bg-gradient-to-r from-yellow-500 to-orange-500",
      exercises: [
        { name: "Push-ups", sets: 1, reps: 15, weight: 180, bodyPart: "chest" },
        { name: "Pull-ups", sets: 1, reps: 8, weight: 180, bodyPart: "back" },
        { name: "Squats", sets: 1, reps: 20, weight: 180, bodyPart: "quads" },
        {
          name: "Pike Push-ups",
          sets: 1,
          reps: 10,
          weight: 180,
          bodyPart: "shoulders",
        },
        { name: "Lunges", sets: 1, reps: 16, weight: 180, bodyPart: "quads" },
        { name: "Planks", sets: 1, reps: 60, weight: 180, bodyPart: "abs" },
      ],
    },
    upper: {
      name: "Upper Body Free Weights",
      emoji: "💪",
      color: "bg-gradient-to-r from-indigo-500 to-blue-500",
      exercises: [
        {
          name: "Dumbbell Bench Press",
          sets: 1,
          reps: 10,
          weight: 70,
          bodyPart: "chest",
        },
        {
          name: "Dumbbell Rows",
          sets: 1,
          reps: 10,
          weight: 60,
          bodyPart: "back",
        },
        {
          name: "Shoulder Press",
          sets: 1,
          reps: 10,
          weight: 50,
          bodyPart: "shoulders",
        },
        {
          name: "Bicep Curls",
          sets: 1,
          reps: 12,
          weight: 30,
          bodyPart: "biceps",
        },
        {
          name: "Tricep Extensions",
          sets: 1,
          reps: 12,
          weight: 25,
          bodyPart: "triceps",
        },
        {
          name: "Lateral Raises",
          sets: 1,
          reps: 15,
          weight: 15,
          bodyPart: "shoulders",
        },
      ],
    },
    arms: {
      name: "Arm Day",
      emoji: "💪",
      color: "bg-gradient-to-r from-pink-500 to-rose-500",
      exercises: [
        {
          name: "Barbell Curls",
          sets: 1,
          reps: 10,
          weight: 65,
          bodyPart: "biceps",
        },
        {
          name: "Hammer Curls",
          sets: 1,
          reps: 12,
          weight: 30,
          bodyPart: "biceps",
        },
        {
          name: "Concentration Curls",
          sets: 1,
          reps: 12,
          weight: 25,
          bodyPart: "biceps",
        },
        {
          name: "Close-Grip Bench Press",
          sets: 1,
          reps: 10,
          weight: 115,
          bodyPart: "triceps",
        },
        {
          name: "Tricep Pushdowns",
          sets: 1,
          reps: 12,
          weight: 60,
          bodyPart: "triceps",
        },
        {
          name: "Overhead Tricep Extension",
          sets: 1,
          reps: 12,
          weight: 35,
          bodyPart: "triceps",
        },
      ],
    },
  };

  // Initialize database and load data
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = new WorkoutDB();
        await database.init();
        setDb(database);

        // Load data from IndexedDB
        const [
          savedWorkouts,
          savedTemplates,
          savedPinnedTemplates,
          savedIsFirstTime,
        ] = await Promise.all([
          database.getAllWorkouts(),
          database.getAllTemplates(),
          database.getSetting("pinnedTemplates"),
          database.getSetting("isFirstTime"),
        ]);

        setWorkouts(savedWorkouts || []);

        // Initialize templates
        const initialTemplates =
          Object.keys(savedTemplates).length > 0
            ? savedTemplates
            : { beginner: beginnerTemplate };
        setTemplates(initialTemplates);

        setPinnedTemplates(savedPinnedTemplates || []);
        setIsFirstTime(savedIsFirstTime !== false); // Default to true if not set
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
        // Fallback to in-memory state
        setTemplates({ beginner: beginnerTemplate });
      } finally {
        setIsLoading(false);
      }
    };

    initDB();
  }, []);

  // Save data to IndexedDB when state changes
  useEffect(() => {
    if (!db || isLoading) return;

    const saveTemplates = async () => {
      try {
        for (const [key, template] of Object.entries(templates)) {
          await db.saveTemplate(key, template);
        }
      } catch (error) {
        console.error("Failed to save templates:", error);
      }
    };

    saveTemplates();
  }, [templates, db, isLoading]);

  useEffect(() => {
    if (!db || isLoading) return;

    const savePinnedTemplates = async () => {
      try {
        await db.saveSetting("pinnedTemplates", pinnedTemplates);
      } catch (error) {
        console.error("Failed to save pinned templates:", error);
      }
    };

    savePinnedTemplates();
  }, [pinnedTemplates, db, isLoading]);

  useEffect(() => {
    if (!db || isLoading) return;

    const saveFirstTimeFlag = async () => {
      try {
        await db.saveSetting("isFirstTime", isFirstTime);
      } catch (error) {
        console.error("Failed to save first time flag:", error);
      }
    };

    saveFirstTimeFlag();
  }, [isFirstTime, db, isLoading]);

  const unlockRealTemplates = async () => {
    const allTemplates = { ...templates, ...realTemplates };
    setTemplates(allTemplates);
    setIsFirstTime(false);
    setShowUnlockMessage(true);

    setTimeout(() => {
      setShowUnlockMessage(false);
    }, 4000);
  };

  const getStreakData = () => {
    const today = new Date().toDateString();
    const workoutDates = workouts.map((w) => new Date(w.date).toDateString());

    let streak = 0;
    let currentDate = new Date();

    if (workoutDates.includes(today)) {
      streak = 1;
      currentDate.setDate(currentDate.getDate() - 1);

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
      const yesterday = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toDateString();
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

  const startWorkout = (templateKey) => {
    const template = templates[templateKey];
    const exercises = template.exercises.map((ex) => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));

    setCurrentWorkout({
      type: templateKey,
      templateName: template.name,
      exercises,
      date: new Date().toISOString().split("T")[0],
    });
    setStartTime(Date.now());
    setLogStartTime(Date.now());
    setShowResult(false);
  };

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  const exerciseDatabase = [
    // Chest
    {
      name: "Bench Press",
      muscle: "chest",
      equipment: "barbell",
      defaultWeight: 135,
    },
    {
      name: "Incline Bench Press",
      muscle: "chest",
      equipment: "barbell",
      defaultWeight: 115,
    },
    {
      name: "Dumbbell Bench Press",
      muscle: "chest",
      equipment: "dumbbell",
      defaultWeight: 70,
    },
    {
      name: "Push-ups",
      muscle: "chest",
      equipment: "bodyweight",
      defaultWeight: 180,
    },
    {
      name: "Chest Flyes",
      muscle: "chest",
      equipment: "dumbbell",
      defaultWeight: 35,
    },

    // Back
    {
      name: "Pull-ups",
      muscle: "back",
      equipment: "bodyweight",
      defaultWeight: 180,
    },
    {
      name: "Barbell Rows",
      muscle: "back",
      equipment: "barbell",
      defaultWeight: 115,
    },
    {
      name: "Dumbbell Rows",
      muscle: "back",
      equipment: "dumbbell",
      defaultWeight: 60,
    },
    {
      name: "Lat Pulldowns",
      muscle: "back",
      equipment: "cable",
      defaultWeight: 120,
    },
    {
      name: "Deadlifts",
      muscle: "back",
      equipment: "barbell",
      defaultWeight: 225,
    },

    // Shoulders
    {
      name: "Shoulder Press",
      muscle: "shoulders",
      equipment: "dumbbell",
      defaultWeight: 50,
    },
    {
      name: "Military Press",
      muscle: "shoulders",
      equipment: "barbell",
      defaultWeight: 85,
    },
    {
      name: "Lateral Raises",
      muscle: "shoulders",
      equipment: "dumbbell",
      defaultWeight: 20,
    },
    {
      name: "Front Raises",
      muscle: "shoulders",
      equipment: "dumbbell",
      defaultWeight: 25,
    },

    // Arms
    {
      name: "Bicep Curls",
      muscle: "biceps",
      equipment: "dumbbell",
      defaultWeight: 30,
    },
    {
      name: "Barbell Curls",
      muscle: "biceps",
      equipment: "barbell",
      defaultWeight: 65,
    },
    {
      name: "Hammer Curls",
      muscle: "biceps",
      equipment: "dumbbell",
      defaultWeight: 30,
    },
    {
      name: "Tricep Dips",
      muscle: "triceps",
      equipment: "bodyweight",
      defaultWeight: 180,
    },
    {
      name: "Tricep Extensions",
      muscle: "triceps",
      equipment: "dumbbell",
      defaultWeight: 35,
    },

    // Legs
    {
      name: "Squats",
      muscle: "quads",
      equipment: "barbell",
      defaultWeight: 185,
    },
    {
      name: "Leg Press",
      muscle: "quads",
      equipment: "machine",
      defaultWeight: 200,
    },
    {
      name: "Romanian Deadlifts",
      muscle: "hamstrings",
      equipment: "barbell",
      defaultWeight: 155,
    },
    {
      name: "Lunges",
      muscle: "quads",
      equipment: "bodyweight",
      defaultWeight: 180,
    },
    {
      name: "Calf Raises",
      muscle: "calves",
      equipment: "bodyweight",
      defaultWeight: 225,
    },
  ];

  const getMuscleEmoji = (muscle) => {
    const emojiMap = {
      chest: "💪",
      back: "🏋️",
      shoulders: "🤸",
      biceps: "💪",
      triceps: "💪",
      quads: "🦵",
      hamstrings: "🦵",
      glutes: "🍑",
      calves: "🦵",
      abs: "🔥",
      cardio: "❤️",
    };
    return emojiMap[muscle] || "💪";
  };

  const getFilteredExercises = () => {
    if (!exerciseSearch) return exerciseDatabase;

    const searchLower = exerciseSearch.toLowerCase();
    return exerciseDatabase.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(searchLower) ||
        exercise.muscle.toLowerCase().includes(searchLower) ||
        exercise.equipment.toLowerCase().includes(searchLower)
    );
  };

  const addExercise = (exerciseName) => {
    const exerciseData = exerciseDatabase.find(
      (ex) => ex.name === exerciseName
    );
    const newExercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: exerciseName,
      sets: 1,
      reps: 8,
      weight: exerciseData ? exerciseData.defaultWeight : 50,
    };

    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }));

    setShowExercisePicker(false);
    setExerciseSearch("");
  };

  const duplicateExercise = (id) => {
    const exercise = currentWorkout.exercises.find((ex) => ex.id === id);
    if (exercise) {
      const duplicated = {
        ...exercise,
        id: Math.random().toString(36).substr(2, 9),
      };

      const exerciseIndex = currentWorkout.exercises.findIndex(
        (ex) => ex.id === id
      );
      const newExercises = [...currentWorkout.exercises];
      newExercises.splice(exerciseIndex + 1, 0, duplicated);

      setCurrentWorkout((prev) => ({
        ...prev,
        exercises: newExercises,
      }));
    }
  };

  const adjustValue = (id, field, delta) => {
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id
          ? {
              ...ex,
              [field]: Math.max(field === "weight" ? 0 : 1, ex[field] + delta),
            }
          : ex
      ),
    }));
  };

  const updateExercise = (id, field, value) => {
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const removeExercise = (id) => {
    setCurrentWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  };

  const calculateVolume = (exercises) => {
    return exercises.reduce(
      (total, ex) => total + ex.sets * ex.reps * ex.weight,
      0
    );
  };

  const saveAsNewTemplate = () => {
    if (!newTemplateName.trim()) return;

    const workoutData = completedWorkoutData || currentWorkout;
    if (!workoutData) return;

    const templateKey = newTemplateName.toLowerCase().replace(/\s+/g, "_");
    const newTemplate = {
      name: newTemplateName,
      emoji: "💪",
      color: "bg-gradient-to-r from-purple-500 to-indigo-500",
      exercises: workoutData.exercises.map(({ id, ...exercise }) => exercise),
    };

    const updatedTemplates = {
      ...templates,
      [templateKey]: newTemplate,
    };

    setTemplates(updatedTemplates);
    setShowSaveTemplate(false);
    setNewTemplateName("");
    setShowResult(false);
    setCurrentWorkout(null);
    setCompletedWorkoutData(null);
  };

  const deleteTemplate = async (templateKey) => {
    if (["beginner"].includes(templateKey)) return;
    if (Object.keys(templates).length <= 1) return;

    const { [templateKey]: deleted, ...remaining } = templates;
    setTemplates(remaining);
    setPinnedTemplates((prev) => prev.filter((key) => key !== templateKey));

    // Delete from IndexedDB
    if (db) {
      try {
        await db.deleteTemplate(templateKey);
      } catch (error) {
        console.error("Failed to delete template from IndexedDB:", error);
      }
    }
  };

  const togglePinTemplate = (templateKey) => {
    setPinnedTemplates((prev) => {
      if (prev.includes(templateKey)) {
        return prev.filter((key) => key !== templateKey);
      } else {
        return [...prev, templateKey];
      }
    });
  };

  const getSortedTemplates = () => {
    const templateEntries = Object.entries(templates);
    const pinned = templateEntries.filter(([key]) =>
      pinnedTemplates.includes(key)
    );
    const unpinned = templateEntries.filter(
      ([key]) => !pinnedTemplates.includes(key)
    );

    return [...pinned, ...unpinned];
  };

  const finishWorkout = async () => {
    const endTime = Date.now();
    const logDuration = endTime - logStartTime;
    const currentVolume = calculateVolume(currentWorkout.exercises);

    const completedWorkout = {
      ...currentWorkout,
      volume: currentVolume,
      completedAt: new Date().toISOString(),
    };

    setCompletedWorkoutData(completedWorkout);
    setWorkouts((prev) => [...prev, completedWorkout]);

    // Save to IndexedDB
    if (db) {
      try {
        await db.saveWorkout(completedWorkout);
      } catch (error) {
        console.error("Failed to save workout to IndexedDB:", error);
      }
    }

    // If this was the first workout (beginner template), unlock real templates
    if (isFirstTime && currentWorkout.type === "beginner") {
      unlockRealTemplates();
    }

    const streakData = getStreakData();

    setWorkoutResult({
      streak: streakData.streak + 1,
      logDuration,
      volume: currentVolume,
    });

    setShowResult(true);
    setCurrentWorkout(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // History View
  if (showHistory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Workout History
            </h1>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {workouts
              .slice()
              .reverse()
              .map((workout, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {workout.templateName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(workout.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {workout.volume.toLocaleString()} lbs
                      </p>
                      <p className="text-xs text-gray-500">
                        {workout.exercises.length} exercises
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {workout.exercises.map((exercise, exIndex) => (
                      <div
                        key={exIndex}
                        className="text-sm text-gray-600 flex justify-between py-1"
                      >
                        <span>{exercise.name}</span>
                        <span className="font-mono">
                          {exercise.sets} × {exercise.reps} @ {exercise.weight}
                          lbs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {workouts.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500">No workouts logged yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (showResult) {
    const { streak } = workoutResult;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-2xl p-8 text-center space-y-6 border border-gray-200">
            <div className="text-6xl">🔥</div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {streak === 1 ? "Great start!" : `${streak} days in a row!`}
              </h2>
              <p className="text-gray-600">
                {streak >= 7
                  ? "You're crushing it with consistency! 🏆"
                  : streak >= 3
                  ? "Building a solid habit! Keep going! 💪"
                  : "Every workout counts. Stay consistent!"}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-purple-700 transition-colors"
              >
                Save as Template
              </button>

              <button
                onClick={resetApp}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Log Another Workout
              </button>
            </div>
          </div>

          {showSaveTemplate && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold mb-4">
                  Save New Template
                </h3>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full p-3 border border-gray-300 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-3">
                  <button
                    onClick={saveAsNewTemplate}
                    disabled={!newTemplateName.trim()}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors ${
                      newTemplateName.trim()
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveTemplate(false)}
                    className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Workout Logging View
  if (currentWorkout) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentWorkout.templateName}
            </h1>
            <div className="flex items-center text-gray-600 bg-white px-3 py-2 rounded-lg border">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono">
                {formatTime(Math.floor((Date.now() - startTime) / 1000))}
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {currentWorkout.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="bg-white rounded-xl p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) =>
                      updateExercise(exercise.id, "name", e.target.value)
                    }
                    className="font-medium text-gray-900 bg-transparent border-none outline-none flex-1 text-lg"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => duplicateExercise(exercise.id)}
                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeExercise(exercise.id)}
                      className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600 block">Sets</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => adjustValue(exercise.id, "sets", -1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        -
                      </button>

                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(
                            exercise.id,
                            "sets",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-12 text-center py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => adjustValue(exercise.id, "sets", 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-600 block">Reps</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => adjustValue(exercise.id, "reps", -1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(
                            exercise.id,
                            "reps",
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-12 text-center py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => adjustValue(exercise.id, "reps", 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-600 block">
                      Weight
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => adjustValue(exercise.id, "weight", -5)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={exercise.weight}
                        onChange={(e) =>
                          updateExercise(
                            exercise.id,
                            "weight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 text-center py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.5"
                      />
                      <button
                        onClick={() => adjustValue(exercise.id, "weight", 5)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-full bg-blue-50 text-blue-600 py-4 px-6 rounded-xl font-medium hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Exercise
            </button>

            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentWorkout(null)}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={finishWorkout}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Finish Workout
              </button>
            </div>
          </div>

          {/* Exercise Picker Modal */}
          {showExercisePicker && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
              <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Add Exercise</h3>
                    <button
                      onClick={() => {
                        setShowExercisePicker(false);
                        setExerciseSearch("");
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(80vh - 140px)" }}
                >
                  {getFilteredExercises().map((exercise, index) => (
                    <button
                      key={index}
                      onClick={() => addExercise(exercise.name)}
                      className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {exercise.name}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {exercise.muscle} • {exercise.equipment}
                          </div>
                        </div>
                        <div className="text-xl">
                          {getMuscleEmoji(exercise.muscle)}
                        </div>
                      </div>
                    </button>
                  ))}

                  {getFilteredExercises().length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No exercises found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Template Selection View
  const streakData = getStreakData();
  const sortedTemplates = getSortedTemplates();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {getTodaysDate()}
            </h1>
            <div className="flex items-center mt-2 space-x-4">
              {streakData.streak > 0 && (
                <div className="flex items-center text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                  <span className="text-lg mr-1">🔥</span>
                  <span className="font-medium">
                    {streakData.streak} day{streakData.streak !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {workouts.length > 0 && (
                <div className="text-sm text-gray-500">
                  {workouts.length} total workout
                  {workouts.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowHistory(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        {/* Unlock Success Message */}
        {showUnlockMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-green-800 font-medium">
                  Congrats! You just proved you can track workouts.
                </p>
                <p className="text-green-700 text-sm">Here's the full app.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {sortedTemplates.map(([templateKey, template]) => {
            const isPinned = pinnedTemplates.includes(templateKey);
            const isLocked = isFirstTime && templateKey !== "beginner";
            const canDelete =
              !["beginner"].includes(templateKey) &&
              Object.keys(templates).length > 1;

            return (
              <div
                key={templateKey}
                className={`group relative bg-white rounded-xl p-6 border border-gray-200 transition-all duration-200 ${
                  isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-md hover:border-gray-300 cursor-pointer"
                }`}
                onClick={
                  !isLocked ? () => startWorkout(templateKey) : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="text-2xl mr-3">{template.emoji}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {template.exercises.length} exercise
                          {template.exercises.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isLocked && (
                        <Lock className="w-4 h-4 text-gray-400 ml-2" />
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      {template.exercises.slice(0, 3).map((exercise, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{exercise.name}</span>
                          <span className="font-mono text-xs text-gray-500">
                            {exercise.sets} × {exercise.reps} @{" "}
                            {exercise.weight}lbs
                          </span>
                        </div>
                      ))}
                      {template.exercises.length > 3 && (
                        <div className="text-xs text-gray-400 italic">
                          +{template.exercises.length - 3} more exercise
                          {template.exercises.length - 3 !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-start space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinTemplate(templateKey);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          isPinned
                            ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title={isPinned ? "Unpin template" : "Pin template"}
                      >
                        <Pin className="w-4 h-4" />
                      </button>

                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(templateKey);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {Object.keys(templates).length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">💪</div>
            <p className="text-gray-500">No workout templates</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutTracker;
