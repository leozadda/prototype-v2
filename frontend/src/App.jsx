import React, { useState, useEffect } from "react";
import { detectAdvancedStagnation } from "./algo/detectAdvancedStagnation";
import { getProgressInsights } from "./algo/detectAdvancedStagnation";
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
  Check,
  X,
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

  async deleteWorkout(id) {
    const transaction = this.db.transaction([STORES.WORKOUTS], "readwrite");
    const store = transaction.objectStore(STORES.WORKOUTS);
    return store.delete(id);
  }

  async saveLastUsedSettings(templateKey, exercises) {
    const transaction = this.db.transaction([STORES.SETTINGS], "readwrite");
    const store = transaction.objectStore(STORES.SETTINGS);
    const settingsKey = `lastUsed_${templateKey}`;
    return store.put({ key: settingsKey, value: exercises });
  }

  async getLastUsedSettings(templateKey) {
    const transaction = this.db.transaction([STORES.SETTINGS], "readonly");
    const store = transaction.objectStore(STORES.SETTINGS);
    const settingsKey = `lastUsed_${templateKey}`;
    return new Promise((resolve, reject) => {
      const request = store.get(settingsKey);
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
  const [displayTemplates, setDisplayTemplates] = useState({});
  const [refreshDisplayTemplates, setRefreshDisplayTemplates] = useState(0);
  const [progressInsights, setProgressInsights] = useState(null);
  const [streakNotification, setStreakNotification] = useState(null);
  const [useKg, setUseKg] = useState(false);

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
          savedUseKg, // Add this line
        ] = await Promise.all([
          database.getAllWorkouts(),
          database.getAllTemplates(),
          database.getSetting("pinnedTemplates"),
          database.getSetting("isFirstTime"),
          database.getSetting("useKg"), // Add this line
        ]);

        // Auto-remove beginner template if user is no longer first-time
        if (savedIsFirstTime === false) {
          // Remove from templates
          if (savedTemplates.beginner) {
            delete savedTemplates.beginner;
            await database.deleteTemplate("beginner");
          }

          // Remove from workout history
          // Remove Example workouts from database and current state
          const exampleWorkouts = workouts.filter(
            (w) => w.templateName === "Example"
          );
          if (exampleWorkouts.length > 0 && db) {
            exampleWorkouts.forEach(async (workout) => {
              try {
                await db.deleteWorkout(workout.id);
              } catch (error) {
                console.error("Failed to delete Example workout:", error);
              }
            });
          }

          // Remove from current state immediately
          setWorkouts((prev) =>
            prev.filter((w) => w.templateName !== "Example")
          );
        }

        setWorkouts(savedWorkouts || []);

        // Initialize templates - show all templates but lock non-beginner ones for first-time users
        const initialTemplates =
          Object.keys(savedTemplates).length > 0
            ? savedTemplates
            : savedIsFirstTime === false
            ? realTemplates
            : { beginner: beginnerTemplate, ...realTemplates };

        setTemplates(initialTemplates);

        setPinnedTemplates(savedPinnedTemplates || []);
        setIsFirstTime(savedIsFirstTime == null ? true : savedIsFirstTime);
        setUseKg(savedUseKg || false);
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
    if (!db || isLoading || Object.keys(templates).length === 0) return;

    const updateDisplayTemplates = async () => {
      const updated = { ...templates }; // Start with original templates

      for (const [key, template] of Object.entries(templates)) {
        try {
          const lastUsedSettings = await db.getLastUsedSettings(key);
          if (lastUsedSettings && lastUsedSettings.length > 0) {
            updated[key] = {
              ...template,
              exercises: lastUsedSettings,
            };
          }
        } catch (error) {
          console.error(`Failed to load settings for ${key}:`, error);
          // Keep original template on error
        }
      }
      setDisplayTemplates(updated);
    };

    updateDisplayTemplates();
  }, [templates, db, isLoading, refreshDisplayTemplates]);

  useEffect(() => {
    if (!db || isLoading) return;

    const saveUseKg = async () => {
      try {
        await db.saveSetting("useKg", useKg);
      } catch (error) {
        console.error("Failed to save useKg setting:", error);
      }
    };

    saveUseKg();
  }, [useKg, db, isLoading]);

  useEffect(() => {
    if (workouts.length > 0) {
      const insights = getProgressInsights(workouts, useKg, convertWeight);
      if (insights?.primaryIssue && workouts.length > 0) {
        // Find the most recent workout that contains this exercise to determine the template
        const exerciseName = insights.primaryIssue.exerciseName;
        const recentWorkoutsWithExercise = workouts
          .filter((w) => w.exercises?.some((ex) => ex.name === exerciseName))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (recentWorkoutsWithExercise.length > 0) {
          insights.primaryIssue.templateKey =
            recentWorkoutsWithExercise[0].type;
        }
      }
      setProgressInsights(insights);
    }
  }, [workouts]);

  const unlockRealTemplates = async () => {
    // Remove beginner template from current templates
    const { beginner, ...remainingTemplates } = templates;
    setTemplates({ ...remainingTemplates, ...realTemplates });
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

  const startWorkout = async (templateKey) => {
    const template = templates[templateKey];
    let exercises;

    // Try to load last used settings
    if (db) {
      try {
        const lastUsedSettings = await db.getLastUsedSettings(templateKey);
        if (lastUsedSettings) {
          // Merge last used settings with template exercises
          // Start with last used settings if available, otherwise use template
          const baseExercises =
            lastUsedSettings && lastUsedSettings.length > 0
              ? lastUsedSettings
              : template.exercises;

          exercises = baseExercises.map((ex) => ({
            ...ex,
            id: Math.random().toString(36).substr(2, 9),
          }));
        } else {
          exercises = template.exercises.map((ex) => ({
            ...ex,
            id: Math.random().toString(36).substr(2, 9),
          }));
        }
      } catch (error) {
        console.error("Failed to load last used settings:", error);
        exercises = template.exercises.map((ex) => ({
          ...ex,
          id: Math.random().toString(36).substr(2, 9),
        }));
      }
    } else {
      exercises = template.exercises.map((ex) => ({
        ...ex,
        id: Math.random().toString(36).substr(2, 9),
      }));
    }

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

    // Save last used settings for this template
    if (db) {
      try {
        const exerciseSettings = currentWorkout.exercises.map(
          ({ id, bodyPart, ...exercise }) => exercise
        );
        await db.saveLastUsedSettings(currentWorkout.type, exerciseSettings);
      } catch (error) {
        console.error("Failed to save last used settings:", error);
      }
    }

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

    // Check for streak notifications after completing workout
    if (streakData.streak + 1 > 1) {
      // They just extended their streak
      setStreakNotification({
        type: "active",
        streak: streakData.streak + 1,
        message: `Amazing! ${
          streakData.streak + 1
        } days in a row! Don't forget to work out tomorrow or you'll lose your streak.`,
      });
    }

    setWorkoutResult({
      streak: streakData.streak + 1,
      logDuration,
      volume: currentVolume,
    });

    setShowResult(true);
    setCurrentWorkout(null);

    // Trigger refresh of display templates
    setRefreshDisplayTemplates((prev) => prev + 1);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const convertWeight = (weight) => {
    return useKg ? Math.round(weight / 2.205) : weight;
  };

  const getWeightUnit = () => {
    return useKg ? "kg" : "lbs";
  };

  const resetApp = () => {
    setCurrentWorkout(null);
    setShowResult(false);
    setWorkoutResult(null);
    setShowHistory(false);
    setShowSaveTemplate(false);
    setCompletedWorkoutData(null);
    setStreakNotification(null); // Add this line
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleProgressSuggestion = async (action) => {
    if (action === "accept" && progressInsights?.primaryIssue) {
      const { exerciseName, suggestedWeight, suggestedReps } =
        progressInsights.primaryIssue;
      const templateKey = progressInsights.primaryIssue.templateKey;
      if (!templateKey) {
        console.error("No template key found in progress insights");
        return;
      }

      const updatedTemplate = {
        ...templates[templateKey],
        exercises: templates[templateKey].exercises.map((exercise) =>
          exercise.name === exerciseName
            ? {
                ...exercise,
                weight: suggestedWeight || exercise.weight,
                reps: suggestedReps || exercise.reps,
              }
            : exercise
        ),
      };

      // Update state
      setTemplates((prev) => ({
        ...prev,
        [templateKey]: updatedTemplate,
      }));

      // Save to IndexedDB
      if (db) {
        try {
          await db.saveTemplate(templateKey, updatedTemplate);
        } catch (error) {
          console.error("Failed to save updated template:", error);
        }
      }

      // Force refresh of display templates
      setRefreshDisplayTemplates((prev) => prev + 1);

      // Also update the last used settings so the display template reflects the change
      if (db) {
        try {
          const updatedExerciseSettings = updatedTemplate.exercises.map(
            ({ bodyPart, ...exercise }) => exercise
          );
          await db.saveLastUsedSettings(templateKey, updatedExerciseSettings);
        } catch (error) {
          console.error("Failed to save updated last used settings:", error);
        }
      }
    }

    // Clear the insight for both accept and reject
    setProgressInsights(null);
  };

  // History View
  if (showHistory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">History</h1>
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
                        {useKg
                          ? Math.round(
                              workout.exercises.reduce(
                                (total, ex) =>
                                  total +
                                  ex.sets * ex.reps * convertWeight(ex.weight),
                                0
                              )
                            ).toLocaleString()
                          : workout.volume.toLocaleString()}{" "}
                        {getWeightUnit()}
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
                          {exercise.sets} × {exercise.reps} @{" "}
                          {convertWeight(exercise.weight)}
                          {getWeightUnit()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {workouts.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-gray-500">No workouts</p>
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
            {/* Add this in the Results View after the existing streak congratulations */}

            {streakNotification && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center transition-all hover:bg-blue-100 hover:shadow-md cursor-pointer">
                <div className="text-5xl mb-2">🔥</div>
                <p className="text-blue-800 font-medium text-lg">
                  {streakNotification.streak} Day Streak!
                </p>
                <p className="text-blue-600 text-sm font-light">
                  Don't lose your momentum. Get after it tomorrow — quitters
                  never win.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 px-4 rounded-xl font-medium "
              >
                Add
              </button>

              <button
                onClick={resetApp}
                className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 px-4 rounded-xl font-medium"
              >
                Exit
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
        <div className="max-w-2xl mx-auto px-2 py-8">
          <div className="flex items-center justify-between mb-8 px-5">
            <h1 className="text-2xl font-semibold text-gray-900 ">
              {currentWorkout.templateName}
            </h1>
            <button
              onClick={() => setUseKg(!useKg)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${
                useKg ? "bg-blue-600" : "bg-green-600"
              }`}
            >
              <span className="absolute left-2 text-xs font-medium text-white">
                kg
              </span>
              <span className="absolute right-2 text-xs font-medium text-white">
                lbs
              </span>
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm ${
                  useKg ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>




          <div className="space-y-4 mb-8">
  {currentWorkout.exercises.map((exercise) => (
    <div
      key={exercise.id}
      className="bg-white rounded-xl p-4 border border-gray-200"
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
            className="text-blue-600 hover:text-blue-800 p-3 sm:p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Copy className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => removeExercise(exercise.id)}
            className="text-red-600 hover:text-red-800 p-3 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove exercise"
          >
            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1">
        <div className="flex-1 space-y-2 flex flex-col items-center">
          <label className="text-sm text-gray-600 block text-center">Sets</label>
          <div className="flex items-center justify-center space-x-1 w-full">
            <button
              onClick={() => adjustValue(exercise.id, "sets", -1)}
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
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
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2 flex flex-col items-center">
          <label className="text-sm text-gray-600 block text-center">Reps</label>
          <div className="flex items-center justify-center space-x-1 w-full">
            <button
              onClick={() => adjustValue(exercise.id, "reps", -1)}
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
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
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-2 flex flex-col items-center">
          <label className="text-sm text-gray-600 block text-center">
            Weight
          </label>
          <div className="flex items-center justify-center space-x-1 w-full">
            <button
              onClick={() => adjustValue(exercise.id, "weight", -5)}
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
            >
              -
            </button>
            <input
              type="number"
              value={convertWeight(exercise.weight)}
              onChange={(e) => {
                const inputValue = parseFloat(e.target.value) || 0;
                const actualWeight = useKg
                  ? inputValue * 2.205
                  : inputValue;
                updateExercise(exercise.id, "weight", actualWeight);
              }}
              className="w-16 text-center py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step={useKg ? "0.1" : "0.5"}
            />
            <button
              onClick={() => adjustValue(exercise.id, "weight", 5)}
              className="w-8 h-10 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors font-semibold"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  ))}
</div>




          <div className="space-y-4  px-6">
            <button
              onClick={() => setShowExercisePicker(true)}
              className="w-full bg-blue-50 text-blue-600 py-4 px-6 rounded-xl font-medium hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200 flex items-center justify-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Exercise
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentWorkout(null)}
                className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={finishWorkout}
                className="flex-1 bg-white border border-gray-200 text-gray-600 py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                Finish
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
                  Congrats! You tracked your first workout.
                </p>
                <p className="text-green-700 text-sm">You unlocked all the templates.</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Insights */}
        {progressInsights?.hasIssues && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-400 rounded-xl">
            <div className="flex items-start">
              <div className="text-2xl mr-3">💡</div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 mb-1">
                  {progressInsights.primaryIssue.exerciseName} -{" "}
                  {progressInsights.primaryIssue.pattern}
                </h3>
                <p className="text-blue-700 text-sm font-light mb-3">
                  💪{progressInsights.primaryIssue.message}{" "}
                  {progressInsights.primaryIssue.suggestion.replace(
                    /(\d+(?:\.\d+)?)\s*lbs?/g,
                    (match, weight) => {
                      const numWeight = parseFloat(weight);
                      return `${convertWeight(numWeight)}${getWeightUnit()}`;
                    }
                  )}
                  ?
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProgressSuggestion("accept")}
                    className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleProgressSuggestion("reject")}
                    className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {sortedTemplates.map(([templateKey, template]) => {
            // Use displayTemplate if available, otherwise fall back to original template
            const displayTemplate = displayTemplates[templateKey] || template;

            const isPinned = pinnedTemplates.includes(templateKey);
            const isLocked = isFirstTime && templateKey !== "beginner";
            const canDelete =
              !["beginner"].includes(templateKey) &&
              Object.keys(templates).length > 1;

            return (
              <div
                key={templateKey}
                className={`group relative rounded-xl p-6 border transition-all duration-200 ${
                  isLocked
                    ? "bg-gray-100 border-gray-200 opacity-30 cursor-not-allowed"
                    : "bg-white border-gray-200 hover:shadow-md hover:border-gray-300 cursor-pointer"
                }`}
                onClick={
                  !isLocked
                    ? async () => await startWorkout(templateKey)
                    : undefined
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="text-2xl mr-3">
                        {displayTemplate.emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {displayTemplate.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {displayTemplate.exercises.length} exercise
                          {displayTemplate.exercises.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {isLocked && (
                        <Lock className="w-4 h-4 text-gray-400 ml-2" />
                      )}
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      {displayTemplate.exercises
                        .slice(0, 3)
                        .map((exercise, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{exercise.name}</span>
                            <span className="font-mono text-xs text-gray-500">
                              {exercise.sets} × {exercise.reps} @{" "}
                              {convertWeight(exercise.weight)}
                              {getWeightUnit()}
                            </span>
                          </div>
                        ))}
                      {displayTemplate.exercises.length > 3 && (
                        <div className="text-xs text-gray-400 italic">
                          +{displayTemplate.exercises.length - 3} more exercise
                          {displayTemplate.exercises.length - 3 !== 1
                            ? "s"
                            : ""}
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
