//package com.mymindmirror.backend.service;
//
//import com.mymindmirror.backend.enums.Status;
//import com.mymindmirror.backend.model.Milestone;
//import com.mymindmirror.backend.model.RoadmapTask;
//import com.mymindmirror.backend.model.Task;
//import com.mymindmirror.backend.model.User;
//import com.mymindmirror.backend.repository.RoadmapTaskRepository;
//import com.mymindmirror.backend.repository.TaskRepository;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//
//import java.time.LocalDate;
//import java.util.List;
//import java.util.Optional;
//import java.util.UUID;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.ArgumentMatchers.any;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//class TaskServiceTest {
//
//    @Mock
//    private TaskRepository taskRepository;
//
//    @Mock
//    private MilestoneService milestoneService;
//
//    @Mock
//    private RoadmapTaskRepository roadmapTaskRepository;
//
//    @InjectMocks
//    private TaskService taskService;
//
//    private User testUser;
//    private Milestone testMilestone;
//    private Task testTask;
//    private UUID milestoneId;
//    private UUID taskId;
//    private UUID roadmapTaskId;
//
//    @BeforeEach
//    void setUp() {
//        testUser = new User();
//        testUser.setId(UUID.randomUUID());
//        testUser.setUsername("testuser");
//
//        milestoneId = UUID.randomUUID();
//        testMilestone = new Milestone();
//        testMilestone.setId(milestoneId);
//        testMilestone.setUser(testUser);
//
//        taskId = UUID.randomUUID();
//        testTask = new Task();
//        testTask.setId(taskId);
//        testTask.setMilestone(testMilestone);
//        testTask.setDescription("Original description");
//        testTask.setStatus(Status.PENDING);
//        testTask.setRoadmapTaskId(null);
//
//        roadmapTaskId = UUID.randomUUID();
//    }
//
//    // ==================== createTask ====================
//
//    @Test
//    void createTask_ShouldSaveAndReturnTask() {
//        String description = "New task";
//        LocalDate dueDate = LocalDate.now().plusDays(7);
//
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
//            Task saved = invocation.getArgument(0);
//            saved.setId(UUID.randomUUID());
//            return saved;
//        });
//
//        Task result = taskService.createTask(milestoneId, testUser, description, dueDate);
//
//        assertThat(result).isNotNull();
//        assertThat(result.getDescription()).isEqualTo(description);
//        assertThat(result.getDueDate()).isEqualTo(dueDate);
//        assertThat(result.getStatus()).isEqualTo(Status.PENDING);
//        verify(milestoneService).updateMilestoneStatusBasedOnTasks(milestoneId);
//        verify(taskRepository).save(any(Task.class));
//    }
//
//    @Test
//    void createTask_WhenMilestoneNotFound_ShouldThrowException() {
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.empty());
//
//        assertThatThrownBy(() -> taskService.createTask(milestoneId, testUser, "desc", null))
//                .isInstanceOf(IllegalArgumentException.class)
//                .hasMessageContaining("Milestone not found");
//        verify(taskRepository, never()).save(any());
//    }
//
//    // ==================== getAllTasksForMilestone ====================
//
//    @Test
//    void getAllTasksForMilestone_ShouldReturnList() {
//        List<Task> tasks = List.of(testTask);
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByMilestoneOrderByCreationTimestampAsc(testMilestone))
//                .thenReturn(tasks);
//
//        List<Task> result = taskService.getAllTasksForMilestone(milestoneId, testUser);
//
//        assertThat(result).hasSize(1);
//        assertThat(result.get(0).getId()).isEqualTo(taskId);
//    }
//
//    @Test
//    void getAllTasksForMilestone_WhenMilestoneNotFound_ShouldThrowException() {
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.empty());
//
//        assertThatThrownBy(() -> taskService.getAllTasksForMilestone(milestoneId, testUser))
//                .isInstanceOf(IllegalArgumentException.class);
//        verify(taskRepository, never()).findByMilestoneOrderByCreationTimestampAsc(any());
//    }
//
//    // ==================== getTaskByIdForMilestoneAndUser ====================
//
//    @Test
//    void getTaskByIdForMilestoneAndUser_WhenFound_ShouldReturnOptional() {
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of(testTask));
//
//        Optional<Task> result = taskService.getTaskByIdForMilestoneAndUser(taskId, milestoneId, testUser);
//
//        assertThat(result).isPresent();
//        assertThat(result.get().getId()).isEqualTo(taskId);
//    }
//
//    @Test
//    void getTaskByIdForMilestoneAndUser_WhenNotFound_ShouldReturnEmpty() {
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of());
//
//        Optional<Task> result = taskService.getTaskByIdForMilestoneAndUser(taskId, milestoneId, testUser);
//
//        assertThat(result).isEmpty();
//    }
//
//    // ==================== updateTask ====================
//
//    @Test
//    void updateTask_ShouldUpdateDescriptionAndDueDate() {
//        String newDescription = "Updated description";
//        LocalDate newDueDate = LocalDate.now().plusDays(14);
//
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of(testTask));
//        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
//
//        Task result = taskService.updateTask(taskId, milestoneId, testUser,
//                newDescription, newDueDate, null);
//
//        assertThat(result.getDescription()).isEqualTo(newDescription);
//        assertThat(result.getDueDate()).isEqualTo(newDueDate);
//        assertThat(result.getStatus()).isEqualTo(Status.PENDING);
//        verify(taskRepository).save(testTask);
//        verify(milestoneService, never()).updateMilestoneStatusBasedOnTasks(any());
//    }
//
//    @Test
//    void updateTask_WhenStatusChangedToCompleted_ShouldSyncRoadmapTask() {
//        testTask.setRoadmapTaskId(roadmapTaskId);
//        RoadmapTask roadmapTask = new RoadmapTask();
//        roadmapTask.setId(roadmapTaskId);
//        roadmapTask.setCompleted(false);
//
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of(testTask));
//        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
//        when(roadmapTaskRepository.findById(roadmapTaskId)).thenReturn(Optional.of(roadmapTask));
//
//        Task result = taskService.updateTask(taskId, milestoneId, testUser,
//                null, null, Status.COMPLETED);
//
//        assertThat(result.getStatus()).isEqualTo(Status.COMPLETED);
//        verify(roadmapTaskRepository).save(any(RoadmapTask.class));
//        verify(milestoneService).updateMilestoneStatusBasedOnTasks(milestoneId);
//    }
//
//    @Test
//    void updateTask_WhenStatusChangedFromCompleted_ShouldSyncRoadmapTaskBack() {
//        testTask.setStatus(Status.COMPLETED);
//        testTask.setRoadmapTaskId(roadmapTaskId);
//        RoadmapTask roadmapTask = new RoadmapTask();
//        roadmapTask.setId(roadmapTaskId);
//        roadmapTask.setCompleted(true);
//
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of(testTask));
//        when(taskRepository.save(any(Task.class))).thenReturn(testTask);
//        when(roadmapTaskRepository.findById(roadmapTaskId)).thenReturn(Optional.of(roadmapTask));
//
//        Task result = taskService.updateTask(taskId, milestoneId, testUser,
//                null, null, Status.PENDING);
//
//        assertThat(result.getStatus()).isEqualTo(Status.PENDING);
//        verify(roadmapTaskRepository).save(any(RoadmapTask.class));
//    }
//
//    // ==================== deleteTask ====================
//
//    @Test
//    void deleteTask_ShouldRemoveFromMilestoneAndDelete() {
//        testMilestone.getTasks().add(testTask);
//
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.findByIdAndMilestone(taskId, testMilestone))
//                .thenReturn(List.of(testTask));
//
//        taskService.deleteTask(taskId, milestoneId, testUser);
//
//        assertThat(testMilestone.getTasks()).doesNotContain(testTask);
//        verify(taskRepository).delete(testTask);
//        verify(milestoneService).updateMilestoneStatusBasedOnTasks(milestoneId);
//    }
//
//    // ==================== createTaskWithRoadmapLink ====================
//
//    @Test
//    void createTaskWithRoadmapLink_ShouldCreateTaskWithLink() {
//        String description = "Linked task";
//        when(milestoneService.getMilestoneByIdForUser(milestoneId, testUser))
//                .thenReturn(Optional.of(testMilestone));
//        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
//            Task saved = invocation.getArgument(0);
//            saved.setId(UUID.randomUUID());
//            return saved;
//        });
//
//        Task result = taskService.createTaskWithRoadmapLink(milestoneId, testUser,
//                description, null, roadmapTaskId);
//
//        assertThat(result.getRoadmapTaskId()).isEqualTo(roadmapTaskId);
//        verify(milestoneService).updateMilestoneStatusBasedOnTasks(milestoneId);
//    }
//}