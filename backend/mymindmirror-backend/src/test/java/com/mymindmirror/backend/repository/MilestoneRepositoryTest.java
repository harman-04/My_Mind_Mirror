package com.mymindmirror.backend.repository;

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
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class MilestoneRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private MilestoneRepository milestoneRepository;

    private User testUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        // Create two users
        testUser = new User();
        testUser.setUsername("milestoneuser");
        testUser.setEmail("milestone@example.com");
        testUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(testUser);

        otherUser = new User();
        otherUser.setUsername("otheruser");
        otherUser.setEmail("other@example.com");
        otherUser.setPasswordHash("hashed");
        entityManager.persistAndFlush(otherUser);
    }

    @Test
    void findByUserOrderByCreationDateDesc_ShouldReturnMilestonesInDescOrder() {
        // Create milestones for testUser
        Milestone m1 = new Milestone(testUser, "Old Milestone", "Desc", LocalDate.now().minusDays(5));
        m1.setCreationDate(LocalDate.now().minusDays(5));
        Milestone m2 = new Milestone(testUser, "New Milestone", "Desc", LocalDate.now());
        m2.setCreationDate(LocalDate.now());
        Milestone m3 = new Milestone(testUser, "Middle Milestone", "Desc", LocalDate.now().minusDays(2));
        m3.setCreationDate(LocalDate.now().minusDays(2));

        entityManager.persist(m1);
        entityManager.persist(m2);
        entityManager.persist(m3);
        entityManager.flush();

        List<Milestone> milestones = milestoneRepository.findByUserOrderByCreationDateDesc(testUser);

        assertThat(milestones).hasSize(3);
        assertThat(milestones.get(0).getTitle()).isEqualTo("New Milestone");
        assertThat(milestones.get(1).getTitle()).isEqualTo("Middle Milestone");
        assertThat(milestones.get(2).getTitle()).isEqualTo("Old Milestone");
    }

    @Test
    void findByUserOrderByCreationDateDesc_ShouldReturnEmptyList_WhenNoMilestones() {
        List<Milestone> milestones = milestoneRepository.findByUserOrderByCreationDateDesc(testUser);
        assertThat(milestones).isEmpty();
    }

    @Test
    void findByIdAndUser_ShouldReturnMilestoneOwnedByUser() {
        Milestone milestone = new Milestone(testUser, "My Milestone", "Desc", LocalDate.now());
        entityManager.persist(milestone);
        entityManager.flush();

        List<Milestone> found = milestoneRepository.findByIdAndUser(milestone.getId(), testUser);
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getId()).isEqualTo(milestone.getId());
        assertThat(found.get(0).getUser().getId()).isEqualTo(testUser.getId());
    }

    @Test
    void findByIdAndUser_ShouldReturnEmptyList_WhenMilestoneBelongsToAnotherUser() {
        Milestone milestone = new Milestone(otherUser, "Other's Milestone", "Desc", LocalDate.now());
        entityManager.persist(milestone);
        entityManager.flush();

        List<Milestone> found = milestoneRepository.findByIdAndUser(milestone.getId(), testUser);
        assertThat(found).isEmpty();
    }

    @Test
    void findByIdAndUser_ShouldReturnEmptyList_WhenIdDoesNotExist() {
        List<Milestone> found = milestoneRepository.findByIdAndUser(UUID.randomUUID(), testUser);
        assertThat(found).isEmpty();
    }

    @Test
    void cascadeDelete_ShouldDeleteTasksWhenMilestoneDeleted() {
        Milestone milestone = new Milestone(testUser, "Cascade Milestone", "Desc", LocalDate.now());
        Task task1 = new Task(milestone, "Task 1", LocalDate.now());
        Task task2 = new Task(milestone, "Task 2", LocalDate.now());
        milestone.addTask(task1);
        milestone.addTask(task2);
        entityManager.persist(milestone);
        entityManager.flush();

        UUID milestoneId = milestone.getId();
        // Ensure tasks are persisted
        assertThat(entityManager.find(Milestone.class, milestoneId).getTasks()).hasSize(2);

        // Delete milestone
        milestoneRepository.deleteById(milestoneId);
        entityManager.flush();

        // Verify tasks are also deleted (cascade)
        assertThat(entityManager.find(Milestone.class, milestoneId)).isNull();
    }
}