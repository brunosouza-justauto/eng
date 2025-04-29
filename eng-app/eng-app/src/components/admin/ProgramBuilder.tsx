import React, { useState } from 'react';

const [editingTemplate, setEditingTemplate] = useState<ProgramTemplateListItem | null>(null);
const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
const [isSaving, setIsSaving] = useState<boolean>(false);
const [editingWorkout, setEditingWorkout] = useState<WorkoutAdminData | null>(null);
const [showWorkoutModal, setShowWorkoutModal] = useState<boolean>(false); 