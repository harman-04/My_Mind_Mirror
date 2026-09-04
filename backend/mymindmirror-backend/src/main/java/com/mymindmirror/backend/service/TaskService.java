// src/main/java/com/mymindmirror/backend/service/TaskService.java
package com.mymindmirror.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.RoadmapTask;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import com.mymindmirror.backend.payload.response.TaskResponse;
import com.mymindmirror.backend.repository.RoadmapTaskRepository;
import com.mymindmirror.backend.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final MilestoneService milestoneService;
    private final RoadmapTaskRepository roadmapTaskRepository;
    private final ObjectMapper objectMapper;
    private final GamificationService gamificationService;

    // ---------- Public DTO methods (to be used by controllers) ----------

    @Transactional
    public TaskResponse createTask(UUID milestoneId, User user, String description, LocalDate dueDate,
                                   String details, List<String> subtasks) {
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        Task task = new Task(milestone, description, dueDate);
        task.setStatus(Status.PENDING);
        task.setDetails(details);
        if (subtasks != null && !subtasks.isEmpty()) {
            try {
                task.setSubtasksJson(objectMapper.writeValueAsString(subtasks));
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize subtasks", e);
                task.setSubtasksJson("[]");
            }
        }
        Task saved = taskRepository.save(task);
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
        // 💡 THE FINAL TRIGGER: Reward the user for breaking their milestone down into tasks!
        gamificationService.recordActivity(user, "TASK_CREATE");
        return toDto(saved);
    }

    // Overloaded for backward compatibility with roadmap import
    @Transactional
    public TaskResponse createTask(UUID milestoneId, User user, String description, LocalDate dueDate) {
        return createTask(milestoneId, user, description, dueDate, null, null);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasksForMilestone(UUID milestoneId, User user) {
        log.info("Fetching all tasks for milestone {} for user {}", milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));
        return taskRepository.findByMilestoneOrderByCreationTimestampAsc(milestone).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<TaskResponse> getTaskByIdForMilestoneAndUser(UUID taskId, UUID milestoneId, User user) {
        log.info("Fetching task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));

        List<Task> tasks = taskRepository.findByIdAndMilestone(taskId, milestone);
        if (tasks.isEmpty()) {
            log.warn("Task {} not found or not part of milestone {} for user {}", taskId, milestoneId, user.getUsername());
            return Optional.empty();
        }
        return Optional.of(toDto(tasks.get(0)));
    }

    @Transactional
    public TaskResponse updateTask(UUID taskId, UUID milestoneId, User user,
                                   String newDescription, LocalDate newDueDate, Status newStatus,
                                   String newDetails, List<String> newSubtasks) {
        Task existingTask = getTaskEntityByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        if (newDescription != null && !newDescription.trim().isEmpty()) {
            existingTask.setDescription(newDescription);
        }
        if (newDueDate != null) {
            existingTask.setDueDate(newDueDate);
        }
        if (newStatus != null) {
            Status oldStatus = existingTask.getStatus();
            existingTask.setStatus(newStatus);
            if (oldStatus != Status.COMPLETED && newStatus == Status.COMPLETED) {
                // 💡 NEW: Reward Milestone Task completion!
                gamificationService.recordActivity(user, "TASK");

                if (existingTask.getRoadmapTaskId() != null) {
                    syncRoadmapTaskCompletion(existingTask.getRoadmapTaskId(), true);
                }
            }
            if (oldStatus == Status.COMPLETED && newStatus != Status.COMPLETED) {
                if (existingTask.getRoadmapTaskId() != null) {
                    syncRoadmapTaskCompletion(existingTask.getRoadmapTaskId(), false);
                }
            }
            milestoneService.updateMilestoneStatusBasedOnTasks(milestoneId);
        }
        if (newDetails != null) {
            existingTask.setDetails(newDetails);
        }
        if (newSubtasks != null) {
            try {
                existingTask.setSubtasksJson(objectMapper.writeValueAsString(newSubtasks));
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize subtasks", e);
                existingTask.setSubtasksJson("[]");
            }
        }
        Task updated = taskRepository.save(existingTask);
        return toDto(updated);
    }

    @Transactional
    public void deleteTask(UUID taskId, UUID milestoneId, User user) {
        log.info("Deleting task {} for milestone {} for user {}", taskId, milestoneId, user.getUsername());
        Task existingTask = getTaskEntityByIdForMilestoneAndUser(taskId, milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Task not found or not owned by user/milestone."));

        Milestone milestone = existingTask.getMilestone();
        milestone.getTasks().remove(existingTask);
        taskRepository.delete(existingTask);
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
    }

    // ---------- Internal entity methods (for other services) ----------

    // For RoadmapService import – returns entity (internal use)
    @Transactional
    public Task createTaskWithRoadmapLink(UUID milestoneId, User user, String description,
                                          LocalDate dueDate, UUID roadmapTaskId,
                                          String details, String subtasksJson) {
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));
        Task task = new Task(milestone, description, dueDate);
        task.setStatus(Status.PENDING);
        task.setRoadmapTaskId(roadmapTaskId);
        task.setDetails(details);
        task.setSubtasksJson(subtasksJson);
        Task savedTask = taskRepository.save(task);
        milestoneService.updateMilestoneStatusBasedOnTasks(milestone.getId());
        return savedTask;
    }

    // Overloaded for backward compatibility (no details/subtasks)
    @Transactional
    public Task createTaskWithRoadmapLink(UUID milestoneId, User user, String description,
                                          LocalDate dueDate, UUID roadmapTaskId) {
        return createTaskWithRoadmapLink(milestoneId, user, description, dueDate, roadmapTaskId, null, null);
    }

    // Helper to get entity for internal use (e.g., updateTask uses it)
    private Optional<Task> getTaskEntityByIdForMilestoneAndUser(UUID taskId, UUID milestoneId, User user) {
        Milestone milestone = milestoneService.getMilestoneByIdForUser(milestoneId, user)
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found or not owned by user."));
        List<Task> tasks = taskRepository.findByIdAndMilestone(taskId, milestone);
        return tasks.isEmpty() ? Optional.empty() : Optional.of(tasks.get(0));
    }

    // DTO conversion
    private TaskResponse toDto(Task task) {
        TaskResponse dto = new TaskResponse();
        dto.setId(task.getId());
        dto.setDescription(task.getDescription());
        dto.setCreationTimestamp(task.getCreationTimestamp());
        dto.setDueDate(task.getDueDate());
        dto.setStatus(task.getStatus());
        dto.setDetails(task.getDetails());
        dto.setRoadmapTaskId(task.getRoadmapTaskId());
        if (task.getSubtasksJson() != null && !task.getSubtasksJson().isEmpty()) {
            try {
                List<String> subtasks = objectMapper.readValue(task.getSubtasksJson(), new TypeReference<List<String>>() {});
                dto.setSubtasks(subtasks);
            } catch (JsonProcessingException e) {
                log.error("Failed to deserialize subtasksJson for task {}", task.getId(), e);
                dto.setSubtasks(List.of());
            }
        } else {
            dto.setSubtasks(List.of());
        }
        return dto;
    }

    private void syncRoadmapTaskCompletion(UUID roadmapTaskId, boolean completed) {
        RoadmapTask roadmapTask = roadmapTaskRepository.findById(roadmapTaskId).orElse(null);
        if (roadmapTask != null && roadmapTask.isCompleted() != completed) {
            roadmapTask.setCompleted(completed);
            roadmapTaskRepository.save(roadmapTask);
            log.info("Synced roadmap task {} completion to {}", roadmapTaskId, completed);
        }
    }
}