package com.mymindmirror.backend.repository;

import com.mymindmirror.backend.model.Roadmap;
import com.mymindmirror.backend.model.RoadmapTask;
import com.mymindmirror.backend.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class RoadmapTaskRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private RoadmapTaskRepository roadmapTaskRepository;

    private User testUser;
    private Roadmap testRoadmap;

    @BeforeEach
    void setUp() {
        // Create a test user
        testUser = new User();
        testUser.setUsername("taskTester");
        testUser.setEmail("task@test.com");
        testUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(testUser);

        // Create a test roadmap
        testRoadmap = new Roadmap(testUser, "Test Roadmap", "For repository testing", 4);
        entityManager.persistAndFlush(testRoadmap);
    }

    @Test
    void testSaveAndFindRoadmapTask() {
        // Create a task
        RoadmapTask task = new RoadmapTask();
        task.setRoadmap(testRoadmap);
        task.setDescription("Write unit tests");
        task.setDetails("Create repository tests for RoadmapTask");
        task.setSubtasks("[\"Write test\", \"Run test\", \"Verify\"]");
        task.setDayNumber(1);
        task.setWeekNumber(1);
        task.setCompleted(false);
        task.setTaskType("daily");
        task.setImportedToMilestone(false);

        // Save
        RoadmapTask savedTask = roadmapTaskRepository.save(task);
        assertThat(savedTask.getId()).isNotNull();

        // Retrieve
        Optional<RoadmapTask> found = roadmapTaskRepository.findById(savedTask.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getDescription()).isEqualTo("Write unit tests");
        assertThat(found.get().getDetails()).isEqualTo("Create repository tests for RoadmapTask");
        assertThat(found.get().getSubtasks()).isEqualTo("[\"Write test\", \"Run test\", \"Verify\"]");
        assertThat(found.get().getDayNumber()).isEqualTo(1);
        assertThat(found.get().getWeekNumber()).isEqualTo(1);
        assertThat(found.get().isCompleted()).isFalse();
        assertThat(found.get().getTaskType()).isEqualTo("daily");
        assertThat(found.get().getImportedToMilestone()).isFalse();
    }

    @Test
    void testUpdateTaskFields() {
        // Create and save a task
        RoadmapTask task = new RoadmapTask();
        task.setRoadmap(testRoadmap);
        task.setDescription("Initial description");
        task.setCompleted(false);
        task.setImportedToMilestone(false);
        RoadmapTask savedTask = roadmapTaskRepository.save(task);

        // Update fields
        savedTask.setDescription("Updated description");
        savedTask.setCompleted(true);
        savedTask.setImportedToMilestone(true);
        roadmapTaskRepository.save(savedTask);

        // Verify
        Optional<RoadmapTask> updated = roadmapTaskRepository.findById(savedTask.getId());
        assertThat(updated).isPresent();
        assertThat(updated.get().getDescription()).isEqualTo("Updated description");
        assertThat(updated.get().isCompleted()).isTrue();
        assertThat(updated.get().getImportedToMilestone()).isTrue();
    }

    @Test
    void testDeleteRoadmapTask() {
        // Create and save a task
        RoadmapTask task = new RoadmapTask();
        task.setRoadmap(testRoadmap);
        task.setDescription("To be deleted");
        RoadmapTask savedTask = roadmapTaskRepository.save(task);
        UUID taskId = savedTask.getId();

        // Delete
        roadmapTaskRepository.deleteById(taskId);

        // Verify deletion
        Optional<RoadmapTask> deleted = roadmapTaskRepository.findById(taskId);
        assertThat(deleted).isEmpty();
    }

    @Test
    void testImportedToMilestoneFlag() {
        // Create two tasks: one imported, one not
        RoadmapTask importedTask = new RoadmapTask();
        importedTask.setRoadmap(testRoadmap);
        importedTask.setDescription("Imported task");
        importedTask.setImportedToMilestone(true);

        RoadmapTask notImportedTask = new RoadmapTask();
        notImportedTask.setRoadmap(testRoadmap);
        notImportedTask.setDescription("Normal task");
        notImportedTask.setImportedToMilestone(false);

        roadmapTaskRepository.save(importedTask);
        roadmapTaskRepository.save(notImportedTask);

        // Retrieve all tasks (no custom query, but we can fetch via roadmap and filter manually)
        // Here we just verify the flag was saved correctly
        Optional<RoadmapTask> foundImported = roadmapTaskRepository.findById(importedTask.getId());
        assertThat(foundImported).isPresent();
        assertThat(foundImported.get().getImportedToMilestone()).isTrue();

        Optional<RoadmapTask> foundNotImported = roadmapTaskRepository.findById(notImportedTask.getId());
        assertThat(foundNotImported).isPresent();
        assertThat(foundNotImported.get().getImportedToMilestone()).isFalse();
    }
}