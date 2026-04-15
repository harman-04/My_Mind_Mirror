package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.enums.Status;
import com.mymindmirror.backend.model.Milestone;
import com.mymindmirror.backend.model.Task;
import com.mymindmirror.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class TaskRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    private User testUser;
    private Milestone milestone1;
    private Milestone milestone2;
    private Task task1, task2, task3;

    @BeforeEach
    void setUp() {
        // Create and persist a test user
        testUser = new User();
        testUser.setUsername("taskuser");
        testUser.setEmail("task@example.com");
        testUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(testUser);

        // Create milestones
        milestone1 = new Milestone(testUser, "Milestone 1", "Description 1", LocalDate.now().plusDays(7));
        milestone2 = new Milestone(testUser, "Milestone 2", "Description 2", LocalDate.now().plusDays(14));
        entityManager.persist(milestone1);
        entityManager.persist(milestone2);
        entityManager.flush();

        // Create tasks with different creation timestamps
        task1 = new Task(milestone1, "Task 1", LocalDate.now());
        task1.setCreationTimestamp(LocalDateTime.now().minusDays(2));
        task1.setStatus(Status.PENDING);
        task2 = new Task(milestone1, "Task 2", LocalDate.now().plusDays(1));
        task2.setCreationTimestamp(LocalDateTime.now().minusDays(1));
        task2.setStatus(Status.COMPLETED);
        task3 = new Task(milestone2, "Task 3", LocalDate.now().plusDays(2));
        task3.setCreationTimestamp(LocalDateTime.now());
        task3.setStatus(Status.OVERDUE);

        entityManager.persist(task1);
        entityManager.persist(task2);
        entityManager.persist(task3);
        entityManager.flush();
    }

    @Test
    void findByMilestoneOrderByCreationTimestampAsc_ShouldReturnTasksInAscendingOrder() {
        List<Task> tasks = taskRepository.findByMilestoneOrderByCreationTimestampAsc(milestone1);

        assertThat(tasks).hasSize(2);
        assertThat(tasks.get(0).getCreationTimestamp()).isBefore(tasks.get(1).getCreationTimestamp());
        assertThat(tasks.get(0).getDescription()).isEqualTo("Task 1");
        assertThat(tasks.get(1).getDescription()).isEqualTo("Task 2");
    }

    @Test
    void findByIdAndMilestone_WithValidIds_ShouldReturnTask() {
        List<Task> found = taskRepository.findByIdAndMilestone(task1.getId(), milestone1);
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getId()).isEqualTo(task1.getId());
        assertThat(found.get(0).getMilestone().getId()).isEqualTo(milestone1.getId());
    }

    @Test
    void findByIdAndMilestone_WithWrongMilestone_ShouldReturnEmpty() {
        // Try to find task1 (belongs to milestone1) with milestone2
        List<Task> found = taskRepository.findByIdAndMilestone(task1.getId(), milestone2);
        assertThat(found).isEmpty();
    }

    @Test
    void findByIdAndMilestone_WithNonExistentId_ShouldReturnEmpty() {
        List<Task> found = taskRepository.findByIdAndMilestone(UUID.randomUUID(), milestone1);
        assertThat(found).isEmpty();
    }

    @Test
    void saveTask_ShouldPersistCorrectly() {
        Task newTask = new Task(milestone1, "New Task", LocalDate.now().plusDays(3));
        newTask.setRoadmapTaskId(UUID.randomUUID());
        Task saved = taskRepository.save(newTask);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getDescription()).isEqualTo("New Task");
        assertThat(saved.getRoadmapTaskId()).isNotNull();
        assertThat(saved.getCreationTimestamp()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(Status.PENDING);
    }

    @Test
    void deleteTask_ShouldRemoveFromDatabase() {
        UUID taskId = task1.getId();
        taskRepository.deleteById(taskId);
        entityManager.flush();

        Task deleted = entityManager.find(Task.class, taskId);
        assertThat(deleted).isNull();
    }
}